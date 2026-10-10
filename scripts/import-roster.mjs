import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DESTINATION_IDS = [
  'kr',
  'jp',
  'cn',
  'th',
  'in',
  'vn',
  'fr',
  'it',
  'gb',
  'es',
  'de',
  'gr',
  'us',
  'ca',
  'mx',
  'br',
  'ma',
  'eg',
  'au',
  'nz',
];

export class ImportError extends Error {}

export function emailKey(value) {
  if (typeof value !== 'string') {
    throw new ImportError('Invalid email in input.');
  }
  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    [...email].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)
  ) {
    throw new ImportError('Invalid email in input.');
  }
  return createHash('sha256').update(email).digest('hex');
}

export function parseRoster(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ImportError('Expected an object containing emails or keys.');
  }
  const fields = Object.keys(input);
  if (fields.length !== 1 || !['emails', 'keys'].includes(fields[0]) || !Array.isArray(input[fields[0]])) {
    throw new ImportError('Expected exactly one emails or keys array.');
  }
  const keys = input.emails
    ? input.emails.map(emailKey)
    : input.keys.map((key) => {
        if (typeof key !== 'string' || !/^[a-f0-9]{64}$/u.test(key)) {
          throw new ImportError('Invalid SHA-256 key in input.');
        }
        return key;
      });
  if (!keys.length) {
    throw new ImportError('Roster must not be empty.');
  }
  return [...new Set(keys)];
}

export function validateTarget(projectId, environment = process.env) {
  const host = environment.FIRESTORE_EMULATOR_HOST;
  if (host !== undefined) {
    const match = /^(?:127\.0\.0\.1|localhost|\[::1\]):([0-9]+)$/u.exec(host);
    if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535 || projectId !== 'demo-gdg-homecoming') {
      throw new ImportError('Emulator import requires demo-gdg-homecoming and a loopback Firestore host.');
    }
    return 'emulator';
  }
  if (projectId !== 'gdsc-homecomming') {
    throw new ImportError(
      'Live import requires explicit --project gdsc-homecomming; emulator import requires FIRESTORE_EMULATOR_HOST.',
    );
  }
  return 'live';
}

export function initialEvent() {
  return {
    schemaVersion: 2,
    total: 0,
    counts: Object.fromEntries(DESTINATION_IDS.map((id) => [id, 0])),
    lastOperationId: '',
  };
}

export function validateExistingEvent(event) {
  const counts = event?.counts;
  if (
    event?.schemaVersion !== 2 ||
    typeof event.lastOperationId !== 'string' ||
    !Number.isInteger(event.total) ||
    event.total < 0 ||
    event.total > 60 ||
    !counts ||
    Object.keys(counts).length !== DESTINATION_IDS.length ||
    !DESTINATION_IDS.every((id) => Number.isInteger(counts[id]) && counts[id] >= 0 && counts[id] <= 4) ||
    Object.values(counts).reduce((sum, value) => sum + value, 0) !== event.total
  ) {
    throw new ImportError('Existing event has an unsupported or invalid schema. Refusing to change event data.');
  }
}

export async function importRoster(db, keys) {
  // Validate even programmatic callers before using keys as document paths.
  const uniqueKeys = parseRoster({ keys });
  const eventRef = db.doc('events/homecoming');
  await db.runTransaction(async (transaction) => {
    const event = await transaction.get(eventRef);
    if (event.exists) {
      validateExistingEvent(event.data());
      return;
    }
    const tickets = await transaction.get(eventRef.collection('tickets').limit(1));
    if (!tickets.empty) {
      throw new ImportError('Tickets exist without event counters. Refusing to initialize event data.');
    }
    transaction.create(eventRef, initialEvent());
  });
  // Create missing participants only. Reading inside the transaction preserves
  // existing revocations, including a concurrent create or eligibility change.
  for (let offset = 0; offset < uniqueKeys.length; offset += 400) {
    const references = uniqueKeys.slice(offset, offset + 400).map((key) => eventRef.collection('roster').doc(key));
    await db.runTransaction(async (transaction) => {
      const snapshots = await transaction.getAll(...references);
      for (const snapshot of snapshots) {
        if (!snapshot.exists) {
          transaction.create(snapshot.ref, { eligible: true });
        }
      }
    });
  }
  let verified = 0;
  let disabled = 0;
  for (let offset = 0; offset < uniqueKeys.length; offset += 400) {
    const snapshots = await db.getAll(
      ...uniqueKeys.slice(offset, offset + 400).map((key) => eventRef.collection('roster').doc(key)),
    );
    verified += snapshots.filter((snapshot) => snapshot.exists && snapshot.data()?.eligible === true).length;
    disabled += snapshots.filter((snapshot) => snapshot.exists && snapshot.data()?.eligible === false).length;
  }
  if (verified + disabled !== uniqueKeys.length) {
    throw new ImportError('Roster readback did not match the requested count.');
  }
  return { requested: uniqueKeys.length, verified, disabled };
}

export async function applyRoster(projectId, keys, environment = process.env) {
  const target = validateTarget(projectId, environment);
  const { initializeApp, applicationDefault, deleteApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = initializeApp(
    {
      projectId,
      ...(target === 'live' ? { credential: applicationDefault() } : {}),
    },
    `roster-import-${Date.now()}`,
  );
  try {
    return await importRoster(getFirestore(app), keys);
  } finally {
    await deleteApp(app);
  }
}

export function parseArguments(args) {
  const options = { apply: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--apply') {
      options.apply = true;
    } else if (['--file', '--project'].includes(arg) && args[index + 1] && !args[index + 1].startsWith('--')) {
      options[arg.slice(2)] = args[++index];
    } else {
      throw new ImportError('Usage: bun run roster:import --file <private.json> --project <project-id> [--apply]');
    }
  }
  if (!options.file || !options.project) {
    throw new ImportError('Both --file and --project are required; writes require --apply.');
  }
  return options;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  const target = validateTarget(options.project);
  let input;
  try {
    input = JSON.parse(await readFile(options.file, 'utf8'));
  } catch {
    throw new ImportError('Unable to read roster JSON input.');
  }
  const keys = parseRoster(input);
  if (!options.apply) {
    console.log(
      JSON.stringify({
        mode: 'dry-run',
        target,
        participants: keys.length,
        writes: 0,
      }),
    );
    return;
  }
  const result = await applyRoster(options.project, keys);
  console.log(JSON.stringify({ mode: 'applied', target, ...result }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(
      error instanceof ImportError
        ? error.message
        : 'Roster import failed. Check ADC credentials, Firestore permissions, and connectivity. No credentials or participant identifiers were logged.',
    );
    process.exitCode = 1;
  });
}
