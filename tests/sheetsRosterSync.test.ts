import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { emailKey } from '../scripts/import-roster.mjs';

const source = readFileSync(new URL('../scripts/sheets-roster-sync/Code.gs', import.meta.url), 'utf8');
const spreadsheetId = 'private-fixture-sheet';
const documentRoot = 'projects/gdsc-homecomming/databases/(default)/documents/events/homecoming/roster/';
type Trigger = {
  getHandlerFunction: () => string;
  getEventType: () => string;
  getTriggerSourceId: () => string;
  getUniqueId: () => string;
};
type Request = {
  url: string;
  method: string;
  payload: string;
  headers: { Authorization: string };
};

function fixture(values: unknown[] = ['person@example.com']) {
  const rows = [['이메일 주소'], ...values.map((value) => [value])];
  const properties = new Map<string, string>([
    ['FIREBASE_PROJECT_ID', 'gdsc-homecomming'],
    ['ROSTER_SPREADSHEET_ID', spreadsheetId],
  ]);
  const documents = new Map<string, boolean>();
  const calls: Request[] = [];
  const writes: Array<{ name: string; eligible: boolean; exists: boolean }> = [];
  const logs: string[] = [];
  const sleeps: number[] = [];
  const reads: number[][] = [];
  const triggers: Trigger[] = [];
  const state = {
    locked: false,
    released: 0,
    lockAvailable: true,
    nextHttp: [] as number[],
    race: null as boolean | null,
    malformed: false,
  };
  const sheet = {
    getName: () => '설문지 응답 시트1',
    getParent: () => ({ getId: () => spreadsheetId }),
    getLastRow: () => rows.length,
    getRange: (...range: number[]) => {
      reads.push(range);
      return { getValues: () => rows };
    },
  };
  let triggerNumber = 0;
  function addTrigger(handler: string, type: string, id = spreadsheetId) {
    const uniqueId = String(++triggerNumber);
    const trigger = {
      getHandlerFunction: () => handler,
      getEventType: () => type,
      getTriggerSourceId: () => id,
      getUniqueId: () => uniqueId,
    };
    triggers.push(trigger);
    return trigger;
  }
  const context = createContext({
    console: {
      log: (value: string) => logs.push(value),
      error: (value: string) => logs.push(value),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => properties.get(key) ?? null,
        setProperty: (key: string, value: string) => properties.set(key, value),
        setProperties: (input: Record<string, string>) =>
          Object.entries(input).forEach(([key, value]) => properties.set(key, value)),
      }),
    },
    SpreadsheetApp: {
      openById: (id: string) => {
        expect(id).toBe(spreadsheetId);
        return { getSheetByName: () => sheet };
      },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_algorithm: string, value: string) =>
        [...createHash('sha256').update(value).digest()].map((byte) => (byte > 127 ? byte - 256 : byte)),
      sleep: (delay: number) => sleeps.push(delay),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          if (!state.lockAvailable) {
            return false;
          }
          state.locked = true;
          return true;
        },
        releaseLock: () => {
          state.locked = false;
          state.released++;
        },
      }),
    },
    ScriptApp: {
      getOAuthToken: () => 'SECRET_FIXTURE_TOKEN',
      getProjectTriggers: () => [...triggers],
      deleteTrigger: (trigger: Trigger) => triggers.splice(triggers.indexOf(trigger), 1),
      EventType: { CLOCK: 'CLOCK', ON_FORM_SUBMIT: 'ON_FORM_SUBMIT' },
      newTrigger: (handler: string) => {
        let type = '';
        let id = '';
        const builder = {
          timeBased: () => {
            type = 'CLOCK';
            return builder;
          },
          everyMinutes: (minutes: number) => {
            expect(minutes).toBe(5);
            return builder;
          },
          forSpreadsheet: (spreadsheet: string) => {
            id = spreadsheet;
            return builder;
          },
          onFormSubmit: () => {
            type = 'ON_FORM_SUBMIT';
            return builder;
          },
          create: () => addTrigger(handler, type, id),
        };
        return builder;
      },
    },
    UrlFetchApp: {
      fetch: (url: string, options: Omit<Request, 'url'>) => {
        expect(state.locked).toBe(true);
        calls.push({ url, ...options });
        let code = state.nextHttp.shift() ?? 200;
        let body: unknown = { error: 'person@example.com SECRET_FIXTURE_TOKEN' };
        if (code === 200) {
          const payload = JSON.parse(options.payload);
          if (url.endsWith(':batchGet')) {
            body = payload.documents.map((name: string) =>
              documents.has(name)
                ? {
                    found: {
                      name,
                      fields: {
                        eligible: { booleanValue: documents.get(name) },
                      },
                    },
                  }
                : { missing: name },
            );
            if (state.malformed) {
              body = [];
            }
          } else {
            expect(url).toEndWith('/documents:commit');
            if (state.race !== null) {
              documents.set(payload.writes[0].update.name, state.race);
              state.race = null;
            }
            if (payload.writes.some((write: { update: { name: string } }) => documents.has(write.update.name))) {
              code = 409;
            } else {
              for (const write of payload.writes) {
                expect(write.currentDocument).toEqual({ exists: false });
                expect(write.update.name).toStartWith(documentRoot);
                expect(Object.keys(write.update.fields)).toEqual(['eligible']);
                documents.set(write.update.name, write.update.fields.eligible.booleanValue);
                writes.push({
                  name: write.update.name,
                  eligible: write.update.fields.eligible.booleanValue,
                  exists: write.currentDocument.exists,
                });
              }
              body = {
                writeResults: payload.writes.map(() => ({
                  updateTime: 'fixture',
                })),
              };
            }
          }
        }
        return {
          getResponseCode: () => code,
          getContentText: () => JSON.stringify(body),
        };
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (value: string) => ({ setMimeType: () => value }),
    },
  });
  runInContext(source, context);
  const api = context as unknown as {
    rosterEmailKey_: (value: unknown) => string;
    syncRoster: () => {
      requested: number;
      created: number;
      existing: number;
      disabled: number;
    };
    installRosterSync: () => { triggers: number };
    syncRosterOnFormSubmit: (event: unknown) => { ignored?: number };
    doGet: (event: unknown) => string;
  };
  return {
    api,
    rows,
    properties,
    documents,
    calls,
    writes,
    logs,
    sleeps,
    reads,
    triggers,
    state,
    sheet,
    addTrigger,
    lookup: (key: string) => JSON.parse(api.doGet({ parameter: { emailKey: key } })),
  };
}

describe('private Sheets roster Apps Script', () => {
  test('hash normalization exactly matches the existing importer, including signed digest bytes', () => {
    const f = fixture();
    for (const value of [' PERSON@Example.COM ', 'a+b@example.co.kr', 'Üser@example.com']) {
      expect(f.api.rosterEmailKey_(value)).toBe(emailKey(value));
    }
    for (const invalid of ['', 'no-at', 'x\u0000@example.com', 'x\u007f@example.com', 42, 'x'.repeat(255) + '@x.co']) {
      expect(() => f.api.rosterEmailKey_(invalid)).toThrow('EMAIL');
    }
  });

  test('reads only B; deduplicates; creates only missing records and preserves denied/unlisted records', () => {
    const f = fixture([
      ' PERSON@example.com ',
      'person@example.com',
      '',
      ' ',
      'denied@example.com',
      'existing@example.com',
    ]);
    f.documents.set(documentRoot + emailKey('denied@example.com'), false);
    f.documents.set(documentRoot + emailKey('existing@example.com'), true);
    f.documents.set(documentRoot + emailKey('unlisted@example.com'), true);
    expect(f.api.syncRoster()).toEqual({
      requested: 3,
      created: 1,
      existing: 1,
      disabled: 1,
    });
    expect(f.reads).toEqual([[1, 2, 7, 1]]);
    expect(f.writes).toHaveLength(1);
    expect(f.documents.get(documentRoot + emailKey('denied@example.com'))).toBe(false);
    expect(f.documents.get(documentRoot + emailKey('unlisted@example.com'))).toBe(true);
    expect(f.api.syncRoster().created).toBe(0);
    expect(f.state.released).toBe(2);
    expect(f.properties.get('ROSTER_LAST_SUCCESS_AT')).toBeTruthy();
  });

  test('invalid row or header fails before any Firestore reads or writes', () => {
    for (const values of [
      ['valid@example.com', 'invalid'],
      ['valid@example.com', 123],
    ]) {
      const f = fixture(values);
      expect(() => f.api.syncRoster()).toThrow('EMAIL');
      expect(f.calls).toHaveLength(0);
      expect(f.state.released).toBe(1);
    }
    const f = fixture();
    f.rows[0][0] = '이메일';
    expect(() => f.api.syncRoster()).toThrow('HEADER');
    expect(f.calls).toHaveLength(0);
  });

  test('empty data never deletes and unexpected project fails closed', () => {
    const f = fixture([]);
    expect(f.api.syncRoster()).toEqual({
      requested: 0,
      created: 0,
      existing: 0,
      disabled: 0,
    });
    expect(f.calls).toHaveLength(0);
    f.properties.set('FIREBASE_PROJECT_ID', 'other-project');
    expect(() => f.api.syncRoster()).toThrow('CONFIG');
    expect(f.calls).toHaveLength(0);
  });

  test('create race re-reads and never overwrites a concurrent deny', () => {
    const f = fixture();
    f.state.race = false;
    expect(f.api.syncRoster()).toEqual({
      requested: 1,
      created: 0,
      existing: 0,
      disabled: 1,
    });
    expect(f.writes).toHaveLength(0);
    expect(f.documents.get(documentRoot + emailKey('person@example.com'))).toBe(false);
  });

  test('429 and 5xx retries are bounded and failures never leak identifiers or tokens', () => {
    const f = fixture();
    f.state.nextHttp = [429, 503, 200];
    expect(f.api.syncRoster().created).toBe(1);
    expect(f.sleeps).toEqual([250, 500]);
    const failing = fixture();
    failing.state.nextHttp = [503, 503, 503, 503];
    expect(() => failing.api.syncRoster()).toThrow('HTTP_503');
    expect(failing.calls).toHaveLength(4);
    expect(failing.state.released).toBe(1);
    expect(failing.properties.get('ROSTER_LAST_ERROR')).toBe('HTTP_503');
    const output = [...f.logs, ...failing.logs].join(' ');
    expect(output).not.toContain('person@example.com');
    expect(output).not.toContain(emailKey('person@example.com'));
    expect(output).not.toContain('SECRET_FIXTURE_TOKEN');
  });

  test('malformed readback prevents writes and overlapping runs do not acquire/release another lock', () => {
    const f = fixture();
    f.state.malformed = true;
    expect(() => f.api.syncRoster()).toThrow('RESPONSE');
    expect(f.writes).toHaveLength(0);
    f.state.lockAvailable = false;
    expect(() => f.api.syncRoster()).toThrow('LOCK');
    expect(f.state.released).toBe(1);
  });

  test('setup syncs before installing and repeated setup keeps only its two triggers', () => {
    const f = fixture();
    f.addTrigger('someoneElse', 'CLOCK');
    f.addTrigger('syncRosterOnFormSubmit', 'ON_FORM_SUBMIT', 'wrong-sheet');
    expect(f.api.installRosterSync().triggers).toBe(2);
    expect(f.api.installRosterSync().triggers).toBe(2);
    expect(f.triggers.map((trigger) => trigger.getHandlerFunction()).sort()).toEqual([
      'someoneElse',
      'syncRosterOnFormSubmit',
      'syncRosterScheduled',
    ]);
    const invalid = fixture(['invalid']);
    expect(() => invalid.api.installRosterSync()).toThrow('EMAIL');
    expect(invalid.triggers).toHaveLength(0);
  });

  test('form trigger validates both spreadsheet and tab before reading', () => {
    const f = fixture();
    expect(
      f.api.syncRosterOnFormSubmit({
        source: { getId: () => 'wrong' },
        range: { getSheet: () => f.sheet },
      }),
    ).toEqual({ ignored: 1 });
    expect(f.reads).toHaveLength(0);
    expect(
      f.api.syncRosterOnFormSubmit({
        source: { getId: () => spreadsheetId },
        range: { getSheet: () => ({ ...f.sheet, getName: () => 'wrong-tab' }) },
      }),
    ).toEqual({ ignored: 1 });
    expect(f.reads).toHaveLength(0);
    f.api.syncRosterOnFormSubmit({
      source: { getId: () => spreadsheetId },
      range: { getSheet: () => f.sheet },
    });
    expect(f.writes).toHaveLength(1);
  });

  test('on-demand lookup freshly checks presence and additively provisions only a matching key', () => {
    const f = fixture(['person@example.com', 'other@example.com']);
    const key = emailKey('person@example.com');
    expect(f.lookup(key)).toEqual({ eligible: true });
    expect(f.writes).toHaveLength(1);
    expect(f.documents.has(documentRoot + emailKey('other@example.com'))).toBe(false);
    f.rows.splice(1, 1);
    expect(f.lookup(key)).toEqual({ eligible: false });
    expect(f.documents.get(documentRoot + key)).toBe(true);
    expect(f.reads).toHaveLength(2);
  });

  test('on-demand lookup respects explicit deny and rejects absent/invalid keys without a write', () => {
    const f = fixture();
    f.documents.set(documentRoot + emailKey('person@example.com'), false);
    expect(f.lookup(emailKey('person@example.com'))).toEqual({
      eligible: false,
    });
    expect(f.lookup(emailKey('absent@example.com'))).toEqual({
      eligible: false,
    });
    const before = f.reads.length;
    for (const invalid of ['person@example.com', 'A'.repeat(64), '../bad', '']) {
      expect(f.lookup(invalid)).toEqual({ eligible: false });
    }
    expect(f.reads).toHaveLength(before);
    expect(f.writes).toHaveLength(0);
  });

  test('on-demand failures expose only an unavailable response', () => {
    const f = fixture();
    f.state.nextHttp = [403];
    expect(f.lookup(emailKey('person@example.com'))).toEqual({
      error: 'unavailable',
    });
    expect(f.logs.join('')).not.toContain('SECRET_FIXTURE_TOKEN');
    expect(f.state.released).toBe(1);
  });
});
