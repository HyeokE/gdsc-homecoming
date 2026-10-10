import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  deploy,
  deploymentCommands,
  parseArguments,
  validateBuild,
  validateEnvironment,
  validateFirebaseConfig,
} from '../scripts/deploy-firebase.mjs';

const environment = {
  VITE_TICKET_SERVICE: 'firebase',
  VITE_USE_FIREBASE_EMULATORS: 'false',
  VITE_FIREBASE_API_KEY: `AIza${'x'.repeat(35)}`,
  VITE_FIREBASE_AUTH_DOMAIN: 'gdsc-homecomming.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'gdsc-homecomming',
  VITE_FIREBASE_STORAGE_BUCKET: 'gdsc-homecomming.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
};
const folders: string[] = [];
const primaryHosting = {
  site: 'gdsc-homecoming',
  public: 'dist',
  rewrites: [{ source: '**', destination: '/index.html' }],
};
const legacyHosting = {
  site: 'gdsc-homecomming',
  redirects: [
    { source: '/', destination: 'https://gdsc-homecoming.web.app/', type: 301 },
    { source: '/:path*', destination: 'https://gdsc-homecoming.web.app/:path', type: 301 },
  ],
};
function firebaseConfig(hosting: unknown = [primaryHosting, legacyHosting]) {
  return { hosting, firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' } };
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'gdg-firebase-deploy-'));
  folders.push(root);
  writeFileSync(join(root, 'firebase.json'), JSON.stringify(firebaseConfig()));
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  writeFileSync(join(root, 'dist', 'index.html'), '<script type="module" src="/assets/main.js"></script>');
  writeFileSync(join(root, 'dist', 'assets', 'main.js'), `const environment = ${JSON.stringify(environment)}`);
  return root;
}
afterEach(() => folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true })));

describe('Firebase deployment CLI boundaries', () => {
  test.each([
    { VITE_FIREBASE_API_KEY: undefined },
    { VITE_FIREBASE_PROJECT_ID: 'another-project' },
    { VITE_FIREBASE_AUTH_DOMAIN: 'another-project.firebaseapp.com' },
    { VITE_FIREBASE_STORAGE_BUCKET: 'another-project.appspot.com' },
    { VITE_FIREBASE_APP_ID: '1:999:web:abcdef' },
    { VITE_FIREBASE_API_KEY: '-----BEGIN PRIVATE KEY-----' },
    { VITE_FIREBASE_APP_ID: ` ${environment.VITE_FIREBASE_APP_ID}` },
    { VITE_TICKET_SERVICE: 'demo' },
    { VITE_USE_FIREBASE_EMULATORS: 'true' },
    { VITE_USE_FIREBASE_EMULATORS: '1' },
    { VITE_SERVICE_ACCOUNT: 'never-print-this-secret' },
    { VITE_ROSTER_LOOKUP_URL: 'https://example.com/lookup' },
    { VITE_ROSTER_LOOKUP_URL: 'https://script.google.com/macros/s/deployment/dev' },
    { VITE_ROSTER_LOOKUP_URL: 'https://script.google.com/macros/s/deployment/exec?token=never-print-this-secret' },
    { VITE_ROSTER_LOOKUP_URL: ' https://script.google.com/macros/s/deployment/exec' },
    { VITE_ROSTER_LOOKUP_URL: null },
  ])('rejects unsafe production configuration %# without leaking values', (overrides) => {
    expect(() => validateEnvironment({ ...environment, ...overrides })).toThrow();
    try {
      validateEnvironment({ ...environment, ...overrides });
    } catch (error) {
      expect(String(error)).not.toContain('never-print-this-secret');
      expect(String(error)).not.toContain('BEGIN PRIVATE KEY');
    }
  });

  test.each([undefined, '', 'https://script.google.com/macros/s/deployment_1/exec'])(
    'accepts an omitted, disabled, or valid live roster lookup URL: %s',
    (url) => {
      expect(() => validateEnvironment({ ...environment, VITE_ROSTER_LOOKUP_URL: url })).not.toThrow();
    },
  );

  test('rejects an invalid lookup endpoint before building or deploying', () => {
    expect(() =>
      deploy({
        root: fixture(),
        environment: { ...environment, VITE_ROSTER_LOOKUP_URL: 'https://example.com/lookup' },
        args: [],
        run: () => {
          throw new Error('must not run');
        },
        log: () => {},
      }),
    ).toThrow('Invalid VITE_ROSTER_LOOKUP_URL.');
  });

  test('rejects project, scope, and unknown option overrides', () => {
    expect(() => parseArguments(['--project', 'other'])).toThrow();
    expect(() => parseArguments(['--only', 'functions'])).toThrow();
    expect(parseArguments(['--', '--prebuilt', '--dry-run'])).toMatchObject({
      prebuilt: true,
      dryRun: true,
    });
    const command = deploymentCommands({ prebuilt: true });
    expect(command).toEqual([
      [
        'bunx',
        [
          'firebase',
          'deploy',
          '--project',
          'gdsc-homecomming',
          '--only',
          'hosting,firestore:rules,firestore:indexes',
          '--non-interactive',
        ],
      ],
    ]);
  });

  test('dry run validates without starting any child process', () => {
    const messages: string[] = [];
    deploy({
      root: fixture(),
      environment,
      args: ['--dry-run'],
      run: () => {
        throw new Error('must not run');
      },
      log: (message: string) => messages.push(message),
    });
    expect(messages.join('\n')).toContain('bun run test:firebase');
    expect(messages.join('\n')).not.toContain(environment.VITE_FIREBASE_API_KEY);
  });

  test('default pipeline checks and tests before build and deploy', () => {
    const calls: string[][] = [];
    deploy({
      root: fixture(),
      environment,
      args: [],
      run: (command: string, args: string[]) => calls.push([command, ...args]),
      log: () => {},
    });
    expect(calls.slice(0, 3)).toEqual([
      ['bun', 'run', 'check'],
      ['bun', 'run', 'test:firebase'],
      ['bun', 'run', 'build'],
    ]);
    expect(calls[3]).toContain('deploy');
  });

  test('failed checks stop before tests, build, or deployment', () => {
    const calls: string[] = [];
    expect(() =>
      deploy({
        root: fixture(),
        environment,
        args: [],
        run: (_command: string, args: string[]) => {
          calls.push(args.join(' '));
          throw new Error('check failed');
        },
        log: () => {},
      }),
    ).toThrow('check failed');
    expect(calls).toEqual(['run check']);
  });

  test('prebuilt deploy skips validation commands but requires existing assets', () => {
    const root = fixture();
    const calls: string[][] = [];
    deploy({
      root,
      environment,
      args: ['--prebuilt'],
      run: (command: string, args: string[]) => calls.push([command, ...args]),
      log: () => {},
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('deploy');
    rmSync(join(root, 'dist', 'assets', 'main.js'));
    expect(() => validateBuild(root, environment)).toThrow('missing or invalid');
  });

  test('prebuilt deploy rejects stale config, demo bundles, and emulator bundles', () => {
    const root = fixture();
    const path = join(root, 'dist', 'assets', 'main.js');
    writeFileSync(path, JSON.stringify({ ...environment, VITE_FIREBASE_PROJECT_ID: 'other' }));
    expect(() => validateBuild(root, environment)).toThrow('does not match');
    writeFileSync(path, `const env = { ...${JSON.stringify(environment)}, VITE_TICKET_SERVICE: "demo" }`);
    expect(() => validateBuild(root, environment)).toThrow('demo tickets or Firebase emulators');
    writeFileSync(path, `const env = { ...${JSON.stringify(environment)}, VITE_USE_FIREBASE_EMULATORS: "true" }`);
    expect(() => validateBuild(root, environment)).toThrow('demo tickets or Firebase emulators');
  });

  test.each(['"', "'", '`'])('validates minified config strings using %s delimiters', (quote) => {
    const root = fixture();
    const path = join(root, 'dist', 'assets', 'main.js');
    const bundle = (overrides = {}) =>
      `const env = {${Object.entries({ ...environment, ...overrides })
        .map(([key, value]) => `${key}:${quote}${value}${quote}`)
        .join(',')}}`;
    writeFileSync(path, bundle());
    expect(() => validateBuild(root, environment)).not.toThrow();
    writeFileSync(path, bundle({ VITE_USE_FIREBASE_EMULATORS: 'true' }));
    expect(() => validateBuild(root, environment)).toThrow('demo tickets or Firebase emulators');
    writeFileSync(path, bundle({ VITE_TICKET_SERVICE: 'demo' }));
    expect(() => validateBuild(root, environment)).toThrow('demo tickets or Firebase emulators');
  });

  test('checked-in multisite config preserves SPA/cache behavior and captures all legacy paths', () => {
    const root = new URL('..', import.meta.url).pathname;
    expect(() => validateFirebaseConfig(root)).not.toThrow();
    const config = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
    expect(config.hosting).toHaveLength(2);
    const primary = config.hosting.find((site: { site: string }) => site.site === 'gdsc-homecoming');
    const legacy = config.hosting.find((site: { site: string }) => site.site === 'gdsc-homecomming');
    expect(primary).toMatchObject(primaryHosting);
    expect(primary.headers).toEqual([
      { source: '**', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/assets/**', headers: [{ key: 'Cache-Control', value: 'public,max-age=31536000,immutable' }] },
    ]);
    expect(legacy).toEqual(legacyHosting);
    expect(legacy.public).toBeUndefined();
  });

  test.each(
    [
      primaryHosting,
      [primaryHosting],
      [legacyHosting],
      [primaryHosting, primaryHosting],
      [primaryHosting, legacyHosting, { site: 'other', public: 'dist' }],
      [{ ...primaryHosting, site: 'other' }, legacyHosting],
      [{ ...primaryHosting, public: 'private' }, legacyHosting],
      [{ ...primaryHosting, rewrites: [{ source: '**', destination: '/other.html' }] }, legacyHosting],
      [
        { ...primaryHosting, redirects: [{ source: '**', destination: 'https://wrong.example', type: 301 }] },
        legacyHosting,
      ],
      [primaryHosting, { ...legacyHosting, public: 'dist' }],
      [primaryHosting, { ...legacyHosting, redirects: legacyHosting.redirects.slice(1) }],
      [
        primaryHosting,
        {
          ...legacyHosting,
          redirects: [
            { ...legacyHosting.redirects[0], destination: 'https://wrong.example/' },
            legacyHosting.redirects[1],
          ],
        },
      ],
      [primaryHosting, { ...legacyHosting, redirects: [{ ...legacyHosting.redirects[0], source: '/' }] }],
      [
        primaryHosting,
        {
          ...legacyHosting,
          redirects: [{ ...legacyHosting.redirects[0], destination: 'https://gdsc-homecoming.web.app/:path*' }],
        },
      ],
      [
        primaryHosting,
        {
          ...legacyHosting,
          redirects: [{ ...legacyHosting.redirects[0], destination: 'https://wrong.example/:path' }],
        },
      ],
      [primaryHosting, { ...legacyHosting, redirects: [{ ...legacyHosting.redirects[0], type: 302 }] }],
      [primaryHosting, { ...legacyHosting, redirects: [{ ...legacyHosting.redirects[0], regex: '/only-this' }] }],
    ].map((hosting) => ({ hosting })),
  )('rejects incomplete multisite or broken redirect configurations before invoking CLI %#', ({ hosting }) => {
    const root = fixture();
    writeFileSync(join(root, 'firebase.json'), JSON.stringify(firebaseConfig(hosting)));
    expect(() => deploy({ root, environment, args: ['--dry-run'], log: () => {} })).toThrow('expected Hosting site');
  });

  test.each([
    firebaseConfig([{ ...primaryHosting, predeploy: ['dangerous'] }, legacyHosting]),
    firebaseConfig([primaryHosting, { ...legacyHosting, predeploy: ['dangerous'] }]),
    firebaseConfig([{ ...primaryHosting, postdeploy: ['dangerous'] }, legacyHosting]),
    { ...firebaseConfig(), firestore: { ...firebaseConfig().firestore, predeploy: ['dangerous'] } },
    { ...firebaseConfig(), firestore: { ...firebaseConfig().firestore, postdeploy: ['dangerous'] } },
  ])('rejects deployment hooks for either Hosting site and Firestore %#', (config) => {
    const root = fixture();
    writeFileSync(join(root, 'firebase.json'), JSON.stringify(config));
    expect(() => deploy({ root, environment, args: ['--dry-run'], log: () => {} })).toThrow('Deployment hooks');
  });
});
