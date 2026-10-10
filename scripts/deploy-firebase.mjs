import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

export const PROJECT_ID = 'gdsc-homecomming'
export const DEPLOY_SCOPES = 'hosting,firestore:rules,firestore:indexes'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export function parseArguments(args) {
  const allowed = new Set(['--', '--dry-run', '--prebuilt', '--help', '-h'])
  if (args.some((arg) => !allowed.has(arg))) {
    throw new Error(
      'Unknown option. Use --help for supported deployment options.',
    )
  }
  return {
    dryRun: args.includes('--dry-run'),
    prebuilt: args.includes('--prebuilt'),
    help: args.includes('--help') || args.includes('-h'),
  }
}

export function validateEnvironment(environment) {
  for (const key of CONFIG_KEYS) {
    if (!environment[key]?.trim()) throw new Error(`Missing ${key}.`)
    if (environment[key] !== environment[key].trim()) {
      throw new Error(`Invalid whitespace in ${key}.`)
    }
  }
  if (environment.VITE_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(`VITE_FIREBASE_PROJECT_ID must be ${PROJECT_ID}.`)
  }
  if (
    environment.VITE_TICKET_SERVICE !== undefined &&
    environment.VITE_TICKET_SERVICE !== 'firebase'
  ) {
    throw new Error('Deployment requires VITE_TICKET_SERVICE=firebase.')
  }
  if (
    environment.VITE_USE_FIREBASE_EMULATORS !== undefined &&
    environment.VITE_USE_FIREBASE_EMULATORS !== 'false'
  ) {
    throw new Error('Deployment requires VITE_USE_FIREBASE_EMULATORS=false.')
  }
  const patterns = {
    VITE_FIREBASE_API_KEY: /^AIza[A-Za-z0-9_-]{35}$/,
    VITE_FIREBASE_AUTH_DOMAIN: /^gdsc-homecomming\.firebaseapp\.com$/,
    VITE_FIREBASE_STORAGE_BUCKET:
      /^gdsc-homecomming\.(?:firebasestorage\.app|appspot\.com)$/,
    VITE_FIREBASE_MESSAGING_SENDER_ID: /^\d+$/,
    VITE_FIREBASE_APP_ID: /^1:\d+:web:[a-f0-9]+$/,
  }
  for (const [key, pattern] of Object.entries(patterns)) {
    if (!pattern.test(environment[key])) throw new Error(`Invalid ${key}.`)
  }
  if (
    environment.VITE_FIREBASE_APP_ID.split(':')[1] !==
    environment.VITE_FIREBASE_MESSAGING_SENDER_ID
  ) {
    throw new Error('Firebase app ID and messaging sender ID do not match.')
  }
  for (const key of Object.keys(environment)) {
    if (
      key.startsWith('VITE_') &&
      /SECRET|PRIVATE_KEY|SERVICE_ACCOUNT|CREDENTIAL|TOKEN/i.test(key)
    ) {
      throw new Error('Credentials must never use the public VITE_ prefix.')
    }
  }
  return {
    ...environment,
    VITE_TICKET_SERVICE: 'firebase',
    VITE_USE_FIREBASE_EMULATORS: 'false',
  }
}

export function validateFirebaseConfig(root) {
  const config = JSON.parse(
    readFileSync(resolve(root, 'firebase.json'), 'utf8'),
  )
  if (
    Array.isArray(config.hosting) ||
    config.hosting?.site !== PROJECT_ID ||
    config.hosting?.public !== 'dist' ||
    config.firestore?.rules !== 'firestore.rules' ||
    config.firestore?.indexes !== 'firestore.indexes.json'
  ) {
    throw new Error(
      'firebase.json must target the expected Hosting site and Firestore files.',
    )
  }
  if (config.hosting.predeploy || config.firestore.predeploy) {
    throw new Error(
      'Deployment hooks are not supported; use the checked CLI pipeline.',
    )
  }
}

export function validateBuild(root, environment) {
  const dist = resolve(root, 'dist')
  const indexPath = resolve(dist, 'index.html')
  if (!existsSync(indexPath))
    throw new Error('dist/index.html is missing. Build first.')
  const html = readFileSync(indexPath, 'utf8')
  const assets = [
    ...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g),
  ].map((match) => match[1])
  const javascript = []
  for (const asset of assets) {
    const path = resolve(dist, `.${asset}`)
    if (
      relative(dist, path).startsWith('..') ||
      !existsSync(path) ||
      !statSync(path).isFile()
    ) {
      throw new Error(
        'A build asset referenced by dist/index.html is missing or invalid.',
      )
    }
    if (path.endsWith('.js')) javascript.push(readFileSync(path, 'utf8'))
  }
  if (!javascript.length)
    throw new Error('dist/index.html has no built JavaScript assets.')
  const code = javascript.join('\n')
  for (const key of [
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_API_KEY',
  ]) {
    if (
      !['"', "'", '`'].some((quote) =>
        code.includes(`${quote}${environment[key]}${quote}`),
      )
    ) {
      throw new Error(
        'Built Firebase configuration does not match the deployment environment. Rebuild first.',
      )
    }
  }
  if (
    /["'`]?VITE_USE_FIREBASE_EMULATORS["'`]?\s*:\s*["'`]true["'`]/.test(code) ||
    /["'`]?VITE_TICKET_SERVICE["'`]?\s*:\s*["'`]demo["'`]/.test(code)
  ) {
    throw new Error(
      'The build uses demo tickets or Firebase emulators. Rebuild for production.',
    )
  }
}

export function deploymentCommands({ prebuilt = false } = {}) {
  return [
    ...(!prebuilt
      ? [
          ['bun', ['run', 'check']],
          ['bun', ['run', 'test:firebase']],
          ['bun', ['run', 'build']],
        ]
      : []),
    [
      'bunx',
      [
        'firebase',
        'deploy',
        '--project',
        PROJECT_ID,
        '--only',
        DEPLOY_SCOPES,
        '--non-interactive',
      ],
    ],
  ]
}

function runCommand(command, args, options) {
  const result = spawnSync(command, args, { ...options, stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed; deployment stopped.`)
  }
}

export function deploy({
  args = process.argv.slice(2),
  root = ROOT,
  environment = loadEnv('production', root, 'VITE_'),
  run = runCommand,
  log = console.log,
} = {}) {
  const options = parseArguments(args)
  if (options.help) {
    log(`Usage: bun run deploy:firebase [--dry-run] [--prebuilt]

Default: validate production config, check, emulator tests, build, then deploy.
--dry-run   Validate and print commands; never build, start emulators, or deploy.
--prebuilt  Deploy existing dist after validation; CI must run checks and tests first.

Target: ${PROJECT_ID}; scopes: ${DEPLOY_SCOPES}
Uses Firebase CLI login or Application Default Credentials. Requires Java 21+
and a free Firestore emulator port for the default test pipeline.`)
    return
  }
  const production = validateEnvironment(environment)
  validateFirebaseConfig(root)
  const commands = deploymentCommands(options)
  if (options.prebuilt) validateBuild(root, production)
  log(`Firebase deployment target: ${PROJECT_ID} (${DEPLOY_SCOPES})`)
  if (options.dryRun) {
    commands.forEach(([command, commandArgs]) =>
      log(`${command} ${commandArgs.join(' ')}`),
    )
    log('Dry run complete. No commands executed and no resources changed.')
    return
  }
  for (const [command, commandArgs] of commands) {
    if (commandArgs.includes('deploy')) validateBuild(root, production)
    run(command, commandArgs, {
      cwd: root,
      env: { ...process.env, ...production },
    })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    deploy()
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Firebase deployment failed.',
    )
    process.exitCode = 1
  }
}
