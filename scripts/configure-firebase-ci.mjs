import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'
import { validateEnvironment } from './deploy-firebase.mjs'

export const GITHUB_ACCOUNT = 'HyeokE'
export const GITHUB_REPOSITORY = `${GITHUB_ACCOUNT}/gdsc-homecoming`
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_VARIABLES = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export function ciVariables(environment) {
  const production = validateEnvironment(environment)
  const variables = Object.fromEntries(
    PUBLIC_VARIABLES.map((key) => [key, production[key]]),
  )
  const measurementId = production.VITE_FIREBASE_MEASUREMENT_ID
  if (measurementId?.trim()) {
    if (!/^G-[A-Z0-9]+$/.test(measurementId)) {
      throw new Error('Invalid VITE_FIREBASE_MEASUREMENT_ID.')
    }
    variables.VITE_FIREBASE_MEASUREMENT_ID = measurementId
  }
  return {
    ...variables,
    GCP_WORKLOAD_IDENTITY_PROVIDER:
      'projects/719021201597/locations/global/workloadIdentityPools/gdg-github-actions/providers/github-main',
    GCP_SERVICE_ACCOUNT:
      'github-firebase-deploy@gdsc-homecomming.iam.gserviceaccount.com',
  }
}

function runCommand(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (result.error || result.status !== 0) throw new Error('GitHub CLI failed.')
  return result.stdout
}

export function configureFirebaseCi({
  args = process.argv.slice(2),
  root = ROOT,
  environment = loadEnv('production', root, 'VITE_'),
  run = runCommand,
  log = console.log,
} = {}) {
  const allowed = new Set(['--', '--apply', '--dry-run', '--help', '-h'])
  if (args.some((arg) => !allowed.has(arg))) {
    throw new Error('Unknown option. Use --help for supported setup options.')
  }
  if (args.includes('--apply') && args.includes('--dry-run')) {
    throw new Error('Choose either --apply or --dry-run.')
  }
  if (args.includes('--help') || args.includes('-h')) {
    log(`Usage: bun run setup:firebase-ci [--dry-run | --apply]

Default: validate production Firebase config and list variable names without writes.
--apply    Verify the HyeokE account and repository admin access, set public repository
           variables, then read them back and verify their values.

Repository: ${GITHUB_REPOSITORY}
Authenticate first with: gh auth login --hostname github.com
This command does not push code, dispatch workflows, or change Google Cloud resources.`)
    return
  }
  const variables = ciVariables(environment)
  const names = Object.keys(variables)
  log(`GitHub repository: ${GITHUB_REPOSITORY}`)
  log(`Repository variables (${names.length}): ${names.join(', ')}`)
  if (!args.includes('--apply')) {
    log('Dry run complete. No GitHub commands executed or variables changed.')
    return { applied: false, names }
  }
  const invoke = (commandArgs, operation, input) => {
    try {
      return run('gh', commandArgs, {
        cwd: root,
        env: { ...process.env, GH_HOST: 'github.com', GH_PROMPT_DISABLED: '1' },
        ...(input === undefined ? {} : { input }),
      })
    } catch {
      const hint =
        commandArgs[0] === 'auth'
          ? ' Run gh auth login --hostname github.com, then retry.'
          : ' Resolve GitHub access and rerun --apply.'
      throw new Error(
        `GitHub ${operation} failed.${hint} No command output or values were logged.`,
      )
    }
  }
  invoke(['auth', 'status', '--hostname', 'github.com'], 'authentication')
  const account = invoke(
    ['api', '--hostname', 'github.com', 'user', '--jq', '.login'],
    'account identity check',
  ).trim()
  if (account.toLowerCase() !== GITHUB_ACCOUNT.toLowerCase()) {
    throw new Error(
      `GitHub account ${GITHUB_ACCOUNT} is required. No repository variables were changed.`,
    )
  }
  const repositoryOutput = invoke(
    ['api', '--hostname', 'github.com', `repos/${GITHUB_REPOSITORY}`],
    'repository access check',
  )
  let repository
  try {
    repository = JSON.parse(repositoryOutput)
  } catch {
    throw new Error('GitHub returned invalid repository metadata.')
  }
  if (
    repository?.full_name?.toLowerCase() !== GITHUB_REPOSITORY.toLowerCase() ||
    repository?.permissions?.admin !== true
  ) {
    throw new Error(
      `Repository admin access to ${GITHUB_REPOSITORY} is required.`,
    )
  }
  for (const [name, value] of Object.entries(variables)) {
    invoke(
      ['variable', 'set', name, '--repo', GITHUB_REPOSITORY],
      `variable update for ${name}`,
      value,
    )
  }
  const readbackOutput = invoke(
    ['variable', 'list', '--repo', GITHUB_REPOSITORY, '--json', 'name,value'],
    'variable readback',
  )
  let readback
  try {
    readback = JSON.parse(readbackOutput)
  } catch {
    throw new Error(
      'GitHub variable readback was invalid. Setup is not verified.',
    )
  }
  if (
    !Array.isArray(readback) ||
    Object.entries(variables).some(
      ([name, value]) =>
        !readback.some(
          (entry) => entry?.name === name && entry.value === value,
        ),
    )
  ) {
    throw new Error(
      'GitHub variable readback did not match. Setup is not verified; rerun --apply.',
    )
  }
  log(`Verified ${names.length} repository variables. Values were not logged.`)
  return { applied: true, names }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    configureFirebaseCi()
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Firebase CI setup failed.',
    )
    process.exitCode = 1
  }
}
