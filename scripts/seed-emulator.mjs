import { applyRoster, parseRoster, validateTarget, ImportError } from './import-roster.mjs';

try {
  validateTarget('demo-gdg-homecoming');
  const keys = parseRoster({
    emails: ['demo@gdg.example', 'member@gdg.example', 'guest@gdg.example'],
  });
  const result = await applyRoster('demo-gdg-homecoming', keys);
  console.log(JSON.stringify({ mode: 'emulator-seed', ...result }));
} catch (error) {
  console.error(
    error instanceof ImportError
      ? error.message
      : 'Emulator seed failed. Check the local Firestore emulator connection.',
  );
  process.exitCode = 1;
}
