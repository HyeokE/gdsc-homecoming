// Deploy this as a PRIVATE standalone Apps Script project, never sheet-bound.
// Script Properties: ROSTER_SPREADSHEET_ID, ROSTER_SHEET_NAME (optional),
// FIREBASE_PROJECT_ID=gdsc-homecomming. No credentials or sheet IDs in source.
const ROSTER_PROJECT = 'gdsc-homecomming';
const ROSTER_DEFAULT_SHEET = '설문지 응답 시트1';
const ROSTER_ERRORS = [
  'CONFIG',
  'HEADER',
  'EMAIL',
  'SHEET',
  'RESPONSE',
  'VERIFY',
  'CONFLICT',
  'LOCK',
  'REQUEST',
  'UNAVAILABLE',
];

function rosterFail_(code) {
  const error = new Error('Roster sync failed: ' + code);
  error.rosterCode = code;
  throw error;
}

function rosterSafeError_(error) {
  const code = error && error.rosterCode;
  return ROSTER_ERRORS.indexOf(code) >= 0 || /^HTTP_[1-5][0-9]{2}$/.test(code || '') ? code : 'UNAVAILABLE';
}

function rosterConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('ROSTER_SPREADSHEET_ID');
  if (
    properties.getProperty('FIREBASE_PROJECT_ID') !== ROSTER_PROJECT ||
    !spreadsheetId ||
    !/^[A-Za-z0-9_-]+$/.test(spreadsheetId)
  )
    rosterFail_('CONFIG');
  return {
    spreadsheetId: spreadsheetId,
    sheetName: properties.getProperty('ROSTER_SHEET_NAME') || ROSTER_DEFAULT_SHEET,
    database: 'projects/' + ROSTER_PROJECT + '/databases/(default)',
  };
}

function rosterEmailKey_(value) {
  if (typeof value !== 'string') rosterFail_('EMAIL');
  const email = value.trim().toLowerCase();
  // Keep normalization and validation identical to scripts/import-roster.mjs.
  if (
    email.length > 254 ||
    Array.from(email).some(function (character) {
      return character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127;
    }) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)
  )
    rosterFail_('EMAIL');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email, Utilities.Charset.UTF_8)
    .map(function (byte) {
      return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
    })
    .join('');
}

function rosterKeys_(config) {
  const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
  if (!sheet) rosterFail_('SHEET');
  // Read B only. Do not read names, phone numbers, or any other response columns.
  const rows = sheet.getRange(1, 2, Math.max(1, sheet.getLastRow()), 1).getValues();
  if (!rows.length || rows[0][0] !== '이메일 주소') rosterFail_('HEADER');
  const keys = new Set();
  rows.slice(1).forEach(function (row) {
    const value = row[0];
    if (typeof value === 'string' && value.trim() === '') return;
    keys.add(rosterEmailKey_(value));
  });
  return Array.from(keys);
}

function rosterRequest_(config, method, body) {
  const url = 'https://firestore.googleapis.com/v1/' + config.database + '/documents:' + method;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    let response;
    try {
      response = UrlFetchApp.fetch(url, options);
    } catch (_) {
      if (attempt === 3) rosterFail_('REQUEST');
      Utilities.sleep(250 * Math.pow(2, attempt));
      continue;
    }
    const status = response.getResponseCode();
    if ((status === 429 || status >= 500) && attempt < 3) {
      Utilities.sleep(250 * Math.pow(2, attempt));
      continue;
    }
    if (method === 'commit' && (status === 409 || status === 412)) return null;
    if (status < 200 || status >= 300) rosterFail_('HTTP_' + status);
    try {
      return JSON.parse(response.getContentText());
    } catch (_) {
      rosterFail_('RESPONSE');
    }
  }
  rosterFail_('REQUEST');
}

function rosterDocument_(config, key) {
  if (!/^[a-f0-9]{64}$/.test(key)) rosterFail_('CONFIG');
  return config.database + '/documents/events/homecoming/roster/' + key;
}

function rosterRead_(config, keys) {
  const states = new Map();
  for (let offset = 0; offset < keys.length; offset += 100) {
    const group = keys.slice(offset, offset + 100);
    const names = group.map(function (key) {
      return rosterDocument_(config, key);
    });
    const response = rosterRequest_(config, 'batchGet', { documents: names });
    if (!Array.isArray(response) || response.length !== names.length) rosterFail_('RESPONSE');
    const remaining = new Set(names);
    response.forEach(function (item) {
      const name = item && (item.found ? item.found.name : item.missing);
      if (!remaining.delete(name)) rosterFail_('RESPONSE');
      const key = group[names.indexOf(name)];
      if (item.found) {
        const eligible = item.found.fields && item.found.fields.eligible && item.found.fields.eligible.booleanValue;
        if (typeof eligible !== 'boolean') rosterFail_('RESPONSE');
        states.set(key, eligible);
      } else states.set(key, null);
    });
    if (remaining.size) rosterFail_('RESPONSE');
  }
  return states;
}

function rosterEnsure_(config, keys) {
  // Complete validation and all initial reads before any write.
  const states = rosterRead_(config, keys);
  const summary = {
    requested: keys.length,
    created: 0,
    existing: 0,
    disabled: 0,
  };
  let missing = keys.filter(function (key) {
    return states.get(key) === null;
  });
  for (let attempt = 0; missing.length && attempt < 3; attempt++) {
    for (let offset = 0; offset < missing.length; offset += 400) {
      const group = missing.slice(offset, offset + 400);
      const committed = rosterRequest_(config, 'commit', {
        writes: group.map(function (key) {
          return {
            update: {
              name: rosterDocument_(config, key),
              fields: { eligible: { booleanValue: true } },
            },
            currentDocument: { exists: false },
          };
        }),
      });
      // A lost response or concurrent create can produce a precondition failure.
      // Re-read and preserve existing false; never retry as an overwrite.
      const readback = rosterRead_(config, group);
      group.forEach(function (key) {
        const state = readback.get(key);
        if (committed !== null && state !== true) rosterFail_('VERIFY');
        states.set(key, state);
      });
      if (committed !== null) summary.created += group.length;
    }
    missing = keys.filter(function (key) {
      return states.get(key) === null;
    });
  }
  if (missing.length) rosterFail_('CONFLICT');
  keys.forEach(function (key) {
    if (states.get(key) === false) summary.disabled++;
    else summary.existing++;
  });
  summary.existing -= summary.created;
  return summary;
}

function rosterRun_(work) {
  const lock = LockService.getScriptLock();
  let held = false;
  try {
    held = lock.tryLock(5000);
    if (!held) rosterFail_('LOCK');
    const result = work(rosterConfig_());
    PropertiesService.getScriptProperties().setProperties({
      ROSTER_LAST_SUCCESS_AT: new Date().toISOString(),
      ROSTER_LAST_COUNTS: JSON.stringify(result),
      ROSTER_LAST_ERROR: '',
    });
    console.log(JSON.stringify(result));
    return result;
  } catch (error) {
    const code = rosterSafeError_(error);
    // Never propagate Apps Script/HTTP error messages (they can contain data).
    try {
      PropertiesService.getScriptProperties().setProperty('ROSTER_LAST_ERROR', code);
    } catch (_) {
      /* Preserve the sanitized original failure. */
    }
    console.error('Roster sync failed: ' + code);
    throw new Error('Roster sync failed: ' + code);
  } finally {
    if (held) lock.releaseLock();
  }
}

function syncRoster() {
  return rosterRun_(function (config) {
    return rosterEnsure_(config, rosterKeys_(config));
  });
}

function syncRosterScheduled() {
  return syncRoster();
}

function syncRosterOnFormSubmit(event) {
  return rosterRun_(function (config) {
    if (
      !event ||
      !event.source ||
      !event.range ||
      event.source.getId() !== config.spreadsheetId ||
      event.range.getSheet().getParent().getId() !== config.spreadsheetId ||
      event.range.getSheet().getName() !== config.sheetName
    )
      return { ignored: 1 };
    return rosterEnsure_(config, rosterKeys_(config));
  });
}

function installRosterSync() {
  return rosterRun_(function (config) {
    const summary = rosterEnsure_(config, rosterKeys_(config));
    const owned = ['syncRosterOnFormSubmit', 'syncRosterScheduled'];
    const existing = ScriptApp.getProjectTriggers();
    const keep = [];
    owned.forEach(function (handler) {
      const matches = existing.filter(function (trigger) {
        return (
          trigger.getHandlerFunction() === handler &&
          (handler === 'syncRosterScheduled'
            ? trigger.getEventType() === ScriptApp.EventType.CLOCK
            : trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT &&
              trigger.getTriggerSourceId() === config.spreadsheetId)
        );
      });
      let trigger = matches[0];
      if (!trigger) {
        const builder = ScriptApp.newTrigger(handler);
        trigger =
          handler === 'syncRosterScheduled'
            ? builder.timeBased().everyMinutes(5).create()
            : builder.forSpreadsheet(config.spreadsheetId).onFormSubmit().create();
      }
      keep.push(trigger.getUniqueId());
    });
    existing.forEach(function (trigger) {
      if (owned.indexOf(trigger.getHandlerFunction()) >= 0 && keep.indexOf(trigger.getUniqueId()) < 0)
        ScriptApp.deleteTrigger(trigger);
    });
    summary.triggers = keep.length;
    return summary;
  });
}

// Deploy web app: execute as the private script owner; access Anyone.
// Request contains only the same SHA-256 key used by the app and Firestore.
// Absence always returns false, even if an old additive roster entry remains.
function doGet(event) {
  let response;
  try {
    const key = event && event.parameter && event.parameter.emailKey;
    if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) {
      response = { eligible: false };
    } else {
      const result = rosterRun_(function (config) {
        const keys = rosterKeys_(config);
        if (keys.indexOf(key) < 0) return { requested: 1, matched: 0, eligible: false };
        const summary = rosterEnsure_(config, [key]);
        return Object.assign(summary, {
          matched: 1,
          eligible: summary.disabled === 0,
        });
      });
      response = { eligible: result.eligible };
    }
  } catch (_) {
    response = { error: 'unavailable' };
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
