import { describe, expect, test } from 'bun:test'
import {
  ciVariables,
  configureFirebaseCi,
  GITHUB_REPOSITORY,
} from '../scripts/configure-firebase-ci.mjs'

const environment = {
  VITE_TICKET_SERVICE: 'firebase',
  VITE_USE_FIREBASE_EMULATORS: 'false',
  VITE_FIREBASE_API_KEY: `AIza${'x'.repeat(35)}`,
  VITE_FIREBASE_AUTH_DOMAIN: 'gdsc-homecomming.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'gdsc-homecomming',
  VITE_FIREBASE_STORAGE_BUCKET: 'gdsc-homecomming.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '719021201597',
  VITE_FIREBASE_APP_ID: '1:719021201597:web:abcdef123456',
}
const silent = () => {}
const metadata = JSON.stringify({
  full_name: GITHUB_REPOSITORY,
  permissions: { admin: true },
})
const readback = (values = ciVariables(environment)) =>
  JSON.stringify(
    Object.entries(values).map(([name, value]) => ({ name, value })),
  )

describe('Firebase GitHub Actions setup CLI', () => {
  test('includes only an exact public Apps Script lookup endpoint when configured', () => {
    const url = 'https://script.google.com/macros/s/test-deployment_123/exec'
    expect(ciVariables(environment)).not.toHaveProperty(
      'VITE_ROSTER_LOOKUP_URL',
    )
    expect(
      ciVariables({ ...environment, VITE_ROSTER_LOOKUP_URL: '' }),
    ).not.toHaveProperty('VITE_ROSTER_LOOKUP_URL')
    expect(
      ciVariables({ ...environment, VITE_ROSTER_LOOKUP_URL: url }),
    ).toHaveProperty('VITE_ROSTER_LOOKUP_URL', url)
  })

  test.each([
    ' ',
    'not-a-url',
    'http://script.google.com/macros/s/id/exec',
    'https://script.google.com.evil.example/macros/s/id/exec',
    'https://user:password@script.google.com/macros/s/id/exec',
    'https://script.google.com:443/macros/s/id/exec',
    'https://script.google.com/macros/s/id/dev',
    'https://script.google.com/macros/s/id/exec?key=secret',
    'https://script.google.com/macros/s/id/exec#fragment',
    'https://script.google.com/macros/s/id/exec/',
    'https://script.google.com/macros/s/id/exec\n',
    'https://docs.google.com/spreadsheets/d/private-sheet/edit',
  ])('rejects malformed lookup URLs before any CLI calls %#', (url) => {
    let calls = 0
    expect(() =>
      configureFirebaseCi({
        environment: { ...environment, VITE_ROSTER_LOOKUP_URL: url },
        args: ['--apply'],
        log: silent,
        run: () => {
          calls++
          return ''
        },
      }),
    ).toThrow('Invalid VITE_ROSTER_LOOKUP_URL')
    expect(calls).toBe(0)
  })

  test('applies and verifies the optional lookup URL without logging its value', () => {
    const url = 'https://script.google.com/macros/s/test-deployment_123/exec'
    const configured = { ...environment, VITE_ROSTER_LOOKUP_URL: url }
    const messages: string[] = []
    const writes: Record<string, string | undefined> = {}
    const result = configureFirebaseCi({
      environment: configured,
      args: ['--apply'],
      log: (message: string) => messages.push(message),
      run: (_command: string, args: string[], options: { input?: string }) => {
        if (args.includes('user')) return 'HyeokE\n'
        if (args[0] === 'api') return metadata
        if (args[1] === 'set') writes[args[2]] = options.input
        if (args[1] === 'list') return readback(ciVariables(configured))
        return ''
      },
    })
    expect(result).toMatchObject({ applied: true })
    expect(writes.VITE_ROSTER_LOOKUP_URL).toBe(url)
    expect(messages.join('\n')).toContain('VITE_ROSTER_LOOKUP_URL')
    expect(messages.join('\n')).not.toContain(url)
  })

  test('plans only public SDK and fixed OIDC repository variables', () => {
    const values = ciVariables(environment)
    expect(Object.keys(values)).toHaveLength(7)
    expect(values.GCP_WORKLOAD_IDENTITY_PROVIDER).toBe(
      'projects/719021201597/locations/global/workloadIdentityPools/gdg-github-actions/providers/github-main',
    )
    expect(values.GCP_SERVICE_ACCOUNT).toBe(
      'github-firebase-deploy@gdsc-homecomming.iam.gserviceaccount.com',
    )
    expect(values).not.toHaveProperty('VITE_FIREBASE_PROJECT_ID')
    expect(values).not.toHaveProperty('VITE_TICKET_SERVICE')
    expect(values).not.toHaveProperty('VITE_USE_FIREBASE_EMULATORS')
    expect(values).not.toHaveProperty('VITE_FIREBASE_MEASUREMENT_ID')
    expect(
      ciVariables({ ...environment, VITE_FIREBASE_MEASUREMENT_ID: 'G-ABC123' }),
    ).toHaveProperty('VITE_FIREBASE_MEASUREMENT_ID', 'G-ABC123')
    expect(() =>
      ciVariables({ ...environment, VITE_FIREBASE_MEASUREMENT_ID: 'secret' }),
    ).toThrow('Invalid VITE_FIREBASE_MEASUREMENT_ID')
  })

  test('default dry run performs no commands and prints names without values', () => {
    const messages: string[] = []
    expect(
      configureFirebaseCi({
        environment,
        args: [],
        run: () => {
          throw new Error('must not run')
        },
        log: (message: string) => messages.push(message),
      }),
    ).toMatchObject({ applied: false })
    expect(messages.join('\n')).toContain('VITE_FIREBASE_API_KEY')
    for (const value of Object.values(ciVariables(environment))) {
      expect(messages.join('\n')).not.toContain(value)
    }
  })

  test.each([
    ['--repo', 'another/repo'],
    ['--apply', '--dry-run'],
    ['--force'],
  ])('rejects ambiguous or unsupported arguments %#', (...args: string[]) => {
    expect(() =>
      configureFirebaseCi({ environment, args, log: silent }),
    ).toThrow()
  })

  test('invalid production config fails before authentication or writes', () => {
    let calls = 0
    expect(() =>
      configureFirebaseCi({
        environment: { ...environment, VITE_TICKET_SERVICE: 'demo' },
        args: ['--apply'],
        run: () => {
          calls++
          return ''
        },
        log: silent,
      }),
    ).toThrow('VITE_TICKET_SERVICE=firebase')
    expect(calls).toBe(0)
  })

  test('apply checks login and admin access, sends each value through stdin, then verifies readback', () => {
    const calls: {
      command: string
      args: string[]
      options: { input?: string; env: Record<string, string> }
    }[] = []
    const messages: string[] = []
    const result = configureFirebaseCi({
      environment,
      args: ['--', '--apply'],
      run: (
        command: string,
        args: string[],
        options: { input?: string; env: Record<string, string> },
      ) => {
        calls.push({ command, args, options })
        if (args.includes('user')) return 'HyeokE\n'
        if (args[0] === 'api') return metadata
        if (args[1] === 'list') return readback()
        return ''
      },
      log: (message: string) => messages.push(message),
    })
    expect(result).toMatchObject({ applied: true })
    expect(calls[0].args).toEqual([
      'auth',
      'status',
      '--hostname',
      'github.com',
    ])
    expect(calls[1].args).toEqual([
      'api',
      '--hostname',
      'github.com',
      'user',
      '--jq',
      '.login',
    ])
    expect(calls[2].args).toEqual([
      'api',
      '--hostname',
      'github.com',
      `repos/${GITHUB_REPOSITORY}`,
    ])
    expect(calls).toHaveLength(11)
    for (const call of calls.slice(3, -1)) {
      const name = call.args[2]
      expect(call.command).toBe('gh')
      expect(call.args).toEqual([
        'variable',
        'set',
        name,
        '--repo',
        GITHUB_REPOSITORY,
      ])
      expect(call.options.input).toBe(ciVariables(environment)[name])
      expect(call.options.env.GH_HOST).toBe('github.com')
      expect(call.options.env.GH_PROMPT_DISABLED).toBe('1')
      expect(call.args).not.toContain(call.options.input!)
    }
    expect(calls.at(-1)?.args).toEqual([
      'variable',
      'list',
      '--repo',
      GITHUB_REPOSITORY,
      '--json',
      'name,value',
    ])
    expect(messages.join('\n')).toContain('Verified 7 repository variables')
    expect(messages.join('\n')).not.toContain(environment.VITE_FIREBASE_API_KEY)
  })

  test.each(['skin-seoul-jason', '', 'HyeokE/other', 'null'])(
    'rejects the wrong or missing account before repository access or writes: %s',
    (login) => {
      const calls: string[][] = []
      expect(() =>
        configureFirebaseCi({
          environment,
          args: ['--apply'],
          log: silent,
          run: (_command: string, args: string[]) => {
            calls.push(args)
            if (args.includes('user')) return login
            return metadata
          },
        }),
      ).toThrow('GitHub account HyeokE is required')
      expect(calls).toHaveLength(2)
      expect(calls.some((args) => args[0] === 'variable')).toBe(false)
    },
  )

  test('accepts the personal account name case-insensitively', () => {
    expect(
      configureFirebaseCi({
        environment,
        args: ['--apply'],
        log: silent,
        run: (_command: string, args: string[]) => {
          if (args.includes('user')) return 'hYeOkE\n'
          if (args[0] === 'api') return metadata
          if (args[1] === 'list') return readback()
          return ''
        },
      }),
    ).toMatchObject({ applied: true })
  })

  test('identity lookup failure prevents writes and sanitizes command errors', () => {
    const calls: string[][] = []
    expect(() =>
      configureFirebaseCi({
        environment,
        args: ['--apply'],
        log: silent,
        run: (_command: string, args: string[]) => {
          calls.push(args)
          if (args.includes('user'))
            throw new Error('sensitive-credential-value')
          return ''
        },
      }),
    ).toThrow('GitHub account identity check failed.')
    expect(calls).toHaveLength(2)
  })

  test('authentication errors are sanitized and prevent all subsequent operations', () => {
    const calls: string[][] = []
    let message = ''
    try {
      configureFirebaseCi({
        environment,
        args: ['--apply'],
        log: silent,
        run: (_command: string, args: string[]) => {
          calls.push(args)
          throw new Error('sensitive-credential-value')
        },
      })
    } catch (error) {
      message = String(error)
    }
    expect(calls).toHaveLength(1)
    expect(message).toContain('authentication')
    expect(message).not.toContain('sensitive-credential-value')
  })

  test.each([
    { full_name: GITHUB_REPOSITORY, permissions: { admin: false, push: true } },
    { full_name: 'wrong/repository', permissions: { admin: true } },
  ])('requires admin access to the exact repository %#', (repository) => {
    const calls: string[][] = []
    expect(() =>
      configureFirebaseCi({
        environment,
        args: ['--apply'],
        log: silent,
        run: (_command: string, args: string[]) => {
          calls.push(args)
          if (args.includes('user')) return 'HyeokE'
          return JSON.stringify(repository)
        },
      }),
    ).toThrow('Repository admin access')
    expect(calls).toHaveLength(3)
  })

  test('a failed variable update stops the remaining writes without leaking its value', () => {
    const calls: string[][] = []
    expect(() =>
      configureFirebaseCi({
        environment,
        args: ['--apply'],
        log: silent,
        run: (_command: string, args: string[]) => {
          calls.push(args)
          if (args.includes('user')) return 'HyeokE\n'
          if (args[0] === 'api') return metadata
          if (args[0] === 'variable')
            throw new Error(environment.VITE_FIREBASE_API_KEY)
          return ''
        },
      }),
    ).toThrow('variable update for VITE_FIREBASE_API_KEY')
    expect(calls).toHaveLength(4)
  })

  test.each([
    'not-json',
    '[]',
    readback({ ...ciVariables(environment), VITE_FIREBASE_APP_ID: 'mismatch' }),
  ])(
    'readback mismatch or invalid response never reports success %#',
    (response) => {
      const messages: string[] = []
      expect(() =>
        configureFirebaseCi({
          environment,
          args: ['--apply'],
          log: (message: string) => messages.push(message),
          run: (_command: string, args: string[]) => {
            if (args.includes('user')) return 'HyeokE\n'
            if (args[0] === 'api') return metadata
            if (args[1] === 'list') return response
            return ''
          },
        }),
      ).toThrow('Setup is not verified')
      expect(messages.join('\n')).not.toContain('Verified 7')
    },
  )
})
