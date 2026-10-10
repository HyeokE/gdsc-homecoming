import { describe, expect, test } from 'bun:test'
import {
  emailKey,
  parseRoster,
  validateTarget,
  initialEvent,
  validateExistingEvent,
  parseArguments,
  importRoster,
} from '../scripts/import-roster.mjs'

const key = emailKey('member@gdg.example')

describe('private roster snapshot import', () => {
  test('normalizes emails without Gmail alias rewriting, deduplicates, and accepts hashes', () => {
    expect(emailKey(' MEMBER@gdg.example ')).toBe(key)
    expect(
      parseRoster({ emails: ['member@gdg.example', ' MEMBER@gdg.example '] }),
    ).toEqual([key])
    expect(parseRoster({ keys: [key, key] })).toEqual([key])
    expect(emailKey('a.b+event@gmail.com')).not.toBe(emailKey('ab@gmail.com'))
  })
  test('rejects malformed input without echoing participant values', () => {
    for (const input of [
      null,
      [],
      {},
      { emails: [] },
      { keys: ['../private'] },
      { emails: ['private-invalid-email'] },
      { emails: ['valid@gdg.example'], keys: [key] },
    ]) {
      expect(() => parseRoster(input)).toThrow()
    }
    expect(() => parseRoster({ emails: ['private-invalid-email'] })).toThrow(
      'Invalid email in input.',
    )
  })
  test('defaults to dry run and requires an explicit target', () => {
    expect(
      parseArguments([
        '--file',
        '.firebase/roster.json',
        '--project',
        'gdsc-homecomming',
      ]).apply,
    ).toBe(false)
    expect(
      parseArguments([
        '--file',
        '.firebase/roster.json',
        '--project',
        'gdsc-homecomming',
        '--apply',
      ]).apply,
    ).toBe(true)
    expect(() => parseArguments(['--file', '.firebase/roster.json'])).toThrow()
    expect(validateTarget('gdsc-homecomming', {})).toBe('live')
  })
  test('never lets emulator seed use a live project or remote Firestore host', () => {
    expect(
      validateTarget('demo-gdg-homecoming', {
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      }),
    ).toBe('emulator')
    for (const [project, env] of [
      ['gdsc-homecomming', { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }],
      ['demo-gdg-homecoming', {}],
      ['demo-gdg-homecoming', { FIRESTORE_EMULATOR_HOST: 'example.com:8080' }],
      ['demo-gdg-homecoming', { FIRESTORE_EMULATOR_HOST: 'localhost:99999' }],
      ['unexpected-project', {}],
    ] as const)
      expect(() => validateTarget(project, env)).toThrow()
  })
  test('checks existing schema and counts without resetting them', () => {
    const event = initialEvent()
    event.total = 1
    event.counts.kr = 1
    event.lastOperationId = 'existing-operation'
    const before = structuredClone(event)
    validateExistingEvent(event)
    expect(event).toEqual(before)
    expect(() =>
      validateExistingEvent({ ...event, schemaVersion: 1 }),
    ).toThrow()
    expect(() => validateExistingEvent({ ...event, total: 0 })).toThrow()
    expect(() =>
      validateExistingEvent({ ...event, counts: { kr: 1 } }),
    ).toThrow()
  })
  test('existing event and ticket data are never written during repeated import', async () => {
    const event = initialEvent()
    event.total = 1
    event.counts.jp = 1
    const writes: { path: string; data: unknown }[] = []
    const ref = (path: string): object => ({
      path,
      collection: (name: string) => ({
        doc: (id: string) => ref(`${path}/${name}/${id}`),
        limit: () => ({ path: `${path}/${name}` }),
      }),
    })
    const db = {
      doc: ref,
      runTransaction: async (
        callback: (transaction: unknown) => Promise<void>,
      ) =>
        callback({
          get: async () => ({ exists: true, data: () => event }),
          create: () => {
            throw new Error('Must not overwrite an existing event')
          },
        }),
      batch: () => ({
        set: (reference: { path: string }, data: unknown) =>
          writes.push({ path: reference.path, data }),
        commit: async () => {},
      }),
      getAll: async () => [{ exists: true, data: () => ({ eligible: true }) }],
    }
    expect(await importRoster(db, [key, key])).toEqual({
      requested: 1,
      verified: 1,
    })
    expect(writes).toEqual([
      { path: `events/homecoming/roster/${key}`, data: { eligible: true } },
    ])
    expect(event.total).toBe(1)
  })
  test('missing event with existing tickets cannot be initialized', async () => {
    let writes = 0
    const db = {
      doc: () => ({ collection: () => ({ limit: () => ({}) }) }),
      runTransaction: async (
        callback: (transaction: unknown) => Promise<void>,
      ) => {
        let reads = 0
        await callback({
          get: async () =>
            ++reads === 1 ? { exists: false } : { empty: false },
          create: () => writes++,
        })
      },
    }
    await expect(importRoster(db, [key])).rejects.toThrow(
      'Tickets exist without event counters',
    )
    expect(writes).toBe(0)
  })
})
