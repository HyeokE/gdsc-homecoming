import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  deploy,
  deploymentCommands,
  parseArguments,
  validateBuild,
  validateEnvironment,
} from '../scripts/deploy-firebase.mjs'

const environment = {
  VITE_TICKET_SERVICE: 'firebase',
  VITE_USE_FIREBASE_EMULATORS: 'false',
  VITE_FIREBASE_API_KEY: `AIza${'x'.repeat(35)}`,
  VITE_FIREBASE_AUTH_DOMAIN: 'gdsc-homecomming.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'gdsc-homecomming',
  VITE_FIREBASE_STORAGE_BUCKET: 'gdsc-homecomming.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
}
const folders: string[] = []
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'gdg-firebase-deploy-'))
  folders.push(root)
  writeFileSync(
    join(root, 'firebase.json'),
    JSON.stringify({
      hosting: { site: 'gdsc-homecomming', public: 'dist' },
      firestore: {
        rules: 'firestore.rules',
        indexes: 'firestore.indexes.json',
      },
    }),
  )
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true })
  writeFileSync(
    join(root, 'dist', 'index.html'),
    '<script type="module" src="/assets/main.js"></script>',
  )
  writeFileSync(
    join(root, 'dist', 'assets', 'main.js'),
    `const environment = ${JSON.stringify(environment)}`,
  )
  return root
}
afterEach(() =>
  folders
    .splice(0)
    .forEach((folder) => rmSync(folder, { recursive: true, force: true })),
)

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
  ])(
    'rejects unsafe production configuration %# without leaking values',
    (overrides) => {
      expect(() =>
        validateEnvironment({ ...environment, ...overrides }),
      ).toThrow()
      try {
        validateEnvironment({ ...environment, ...overrides })
      } catch (error) {
        expect(String(error)).not.toContain('never-print-this-secret')
        expect(String(error)).not.toContain('BEGIN PRIVATE KEY')
      }
    },
  )

  test('rejects project, scope, and unknown option overrides', () => {
    expect(() => parseArguments(['--project', 'other'])).toThrow()
    expect(() => parseArguments(['--only', 'functions'])).toThrow()
    expect(parseArguments(['--', '--prebuilt', '--dry-run'])).toMatchObject({
      prebuilt: true,
      dryRun: true,
    })
    const command = deploymentCommands({ prebuilt: true })
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
    ])
  })

  test('dry run validates without starting any child process', () => {
    const messages: string[] = []
    deploy({
      root: fixture(),
      environment,
      args: ['--dry-run'],
      run: () => {
        throw new Error('must not run')
      },
      log: (message: string) => messages.push(message),
    })
    expect(messages.join('\n')).toContain('bun run test:firebase')
    expect(messages.join('\n')).not.toContain(environment.VITE_FIREBASE_API_KEY)
  })

  test('default pipeline checks and tests before build and deploy', () => {
    const calls: string[][] = []
    deploy({
      root: fixture(),
      environment,
      args: [],
      run: (command: string, args: string[]) => calls.push([command, ...args]),
      log: () => {},
    })
    expect(calls.slice(0, 3)).toEqual([
      ['bun', 'run', 'check'],
      ['bun', 'run', 'test:firebase'],
      ['bun', 'run', 'build'],
    ])
    expect(calls[3]).toContain('deploy')
  })

  test('failed checks stop before tests, build, or deployment', () => {
    const calls: string[] = []
    expect(() =>
      deploy({
        root: fixture(),
        environment,
        args: [],
        run: (_command: string, args: string[]) => {
          calls.push(args.join(' '))
          throw new Error('check failed')
        },
        log: () => {},
      }),
    ).toThrow('check failed')
    expect(calls).toEqual(['run check'])
  })

  test('prebuilt deploy skips validation commands but requires existing assets', () => {
    const root = fixture()
    const calls: string[][] = []
    deploy({
      root,
      environment,
      args: ['--prebuilt'],
      run: (command: string, args: string[]) => calls.push([command, ...args]),
      log: () => {},
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('deploy')
    rmSync(join(root, 'dist', 'assets', 'main.js'))
    expect(() => validateBuild(root, environment)).toThrow('missing or invalid')
  })

  test('prebuilt deploy rejects stale config, demo bundles, and emulator bundles', () => {
    const root = fixture()
    const path = join(root, 'dist', 'assets', 'main.js')
    writeFileSync(
      path,
      JSON.stringify({ ...environment, VITE_FIREBASE_PROJECT_ID: 'other' }),
    )
    expect(() => validateBuild(root, environment)).toThrow('does not match')
    writeFileSync(
      path,
      `const env = { ...${JSON.stringify(environment)}, VITE_TICKET_SERVICE: "demo" }`,
    )
    expect(() => validateBuild(root, environment)).toThrow(
      'demo tickets or Firebase emulators',
    )
    writeFileSync(
      path,
      `const env = { ...${JSON.stringify(environment)}, VITE_USE_FIREBASE_EMULATORS: "true" }`,
    )
    expect(() => validateBuild(root, environment)).toThrow(
      'demo tickets or Firebase emulators',
    )
  })

  test.each(['"', "'", '`'])(
    'validates minified config strings using %s delimiters',
    (quote) => {
      const root = fixture()
      const path = join(root, 'dist', 'assets', 'main.js')
      const bundle = (overrides = {}) =>
        `const env = {${Object.entries({ ...environment, ...overrides })
          .map(([key, value]) => `${key}:${quote}${value}${quote}`)
          .join(',')}}`
      writeFileSync(path, bundle())
      expect(() => validateBuild(root, environment)).not.toThrow()
      writeFileSync(path, bundle({ VITE_USE_FIREBASE_EMULATORS: 'true' }))
      expect(() => validateBuild(root, environment)).toThrow(
        'demo tickets or Firebase emulators',
      )
      writeFileSync(path, bundle({ VITE_TICKET_SERVICE: 'demo' }))
      expect(() => validateBuild(root, environment)).toThrow(
        'demo tickets or Firebase emulators',
      )
    },
  )

  test('rejects deployment hooks and mismatched Hosting site before invoking CLI', () => {
    const root = fixture()
    writeFileSync(
      join(root, 'firebase.json'),
      JSON.stringify({ hosting: { site: 'wrong', public: 'dist' } }),
    )
    expect(() =>
      deploy({ root, environment, args: ['--dry-run'], log: () => {} }),
    ).toThrow('expected Hosting site')
    writeFileSync(
      join(root, 'firebase.json'),
      JSON.stringify({
        hosting: {
          site: 'gdsc-homecomming',
          public: 'dist',
          predeploy: ['dangerous'],
        },
        firestore: {
          rules: 'firestore.rules',
          indexes: 'firestore.indexes.json',
        },
      }),
    )
    expect(() =>
      deploy({ root, environment, args: ['--dry-run'], log: () => {} }),
    ).toThrow('Deployment hooks')
  })
})
