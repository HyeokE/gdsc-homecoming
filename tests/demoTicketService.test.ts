import { describe, expect, test } from 'bun:test'
import {
  createDemoTicketService,
  DEMO_STORAGE_KEY,
} from '../src/services/demoTicketService'
function fixture(emails?: string[]) {
  const data = new Map<string, string>()
  return {
    data,
    service: createDemoTicketService({
      storage: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => {
          data.set(key, value)
        },
      },
      emails,
      random: () => 0,
    }),
  }
}
describe('local demo ticket service', () => {
  test('only demo participants; duplicate issue and restore preserve identity', async () => {
    const { service } = fixture()
    await expect(service.checkEmail('real@example.com')).rejects.toMatchObject({
      kind: 'not-found',
    })
    const first = await service.issue('demo@gdg.example', 'Jason 한글', 'one')
    expect(await service.issue('demo@gdg.example', 'Other', 'two')).toEqual(
      first,
    )
    expect(await service.restore(' DEMO@gdg.example ')).toEqual(first)
  })
  test('one reissue excludes old country, retains gate and idempotent result', async () => {
    const { service } = fixture()
    const first = await service.issue('demo@gdg.example', 'Jason', 'one')
    const next = await service.reissue('demo@gdg.example', 'two')
    expect(next.destinationId).not.toBe(first.destinationId)
    expect(next.gate).toBe(first.gate)
    expect(await service.count(first.destinationId)).toBe(0)
    expect(await service.reissue('demo@gdg.example', 'two')).toEqual(next)
    await expect(
      service.reissue('demo@gdg.example', 'three'),
    ).rejects.toMatchObject({ kind: 'reissue-used' })
  })
  test('failure keeps chance; uncertain commit is recovered without reallocation', async () => {
    const { service } = fixture()
    const first = await service.issue('demo@gdg.example', 'Jason', 'one')
    service.failNext('reissue', 'connection')
    await expect(
      service.reissue('demo@gdg.example', 'two'),
    ).rejects.toMatchObject({ kind: 'connection' })
    expect(await service.restore('demo@gdg.example')).toEqual(first)
    service.failNext('reissue', 'uncertain')
    await expect(
      service.reissue('demo@gdg.example', 'two'),
    ).rejects.toMatchObject({ kind: 'uncertain' })
    const restored = await service.restore('demo@gdg.example')
    expect(restored?.reissueUsed).toBe(true)
    expect(await service.reissue('demo@gdg.example', 'two')).toEqual(restored)
  })
  test('country capacity four and event capacity sixty are separate', async () => {
    const emails = Array.from({ length: 61 }, (_, i) => `p${i}@gdg.example`)
    const { service } = fixture(emails)
    for (let i = 0; i < 60; i++)
      await service.issue(emails[i]!, `P${i}`, `${i}`)
    expect(await service.count('kr')).toBe(4)
    await expect(
      service.issue(emails[60]!, 'Last', 'last'),
    ).rejects.toMatchObject({ kind: 'capacity' })
  })
  test('invalid storage is reported, never silently deleted', async () => {
    const { data, service } = fixture()
    data.set(DEMO_STORAGE_KEY, 'broken')
    await expect(service.restore('demo@gdg.example')).rejects.toMatchObject({
      kind: 'storage',
    })
    expect(data.get(DEMO_STORAGE_KEY)).toBe('broken')
  })
})
