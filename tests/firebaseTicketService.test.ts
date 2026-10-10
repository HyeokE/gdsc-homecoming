import { describe, expect, test } from 'bun:test'
import {
  createFirebaseTicketService,
  createFirebaseTicketCall,
  firestoreEmailKey,
  decodeTicket,
  type TicketApiRequest,
} from '../src/services/firebaseTicketService'
import { createTicketRuntime } from '../src/services/ticketService'

const storedTicket = {
  id: 'ticket-1',
  destinationId: 'jp',
  passengerName: 'JASON JEONG',
  gate: 'A03',
  issuedAt: 1_791_600_000_000,
  reissueUsed: false,
  revision: 1,
}

describe('Firebase ticket adapter', () => {
  test('calls each action with normalized email and preserves operation IDs', async () => {
    const requests: TicketApiRequest[] = []
    const service = createFirebaseTicketService(async (request) => {
      requests.push(request)
      if (request.action === 'check') return { existing: true }
      if (request.action === 'count') return { count: 3 }
      return { ticket: storedTicket }
    })
    expect(await service.checkEmail(' PERSON@Example.com ')).toEqual({
      existing: true,
    })
    expect(await service.restore(' PERSON@Example.com ')).toEqual(
      decodeTicket(storedTicket),
    )
    await service.issue(' PERSON@Example.com ', 'Jason', 'stable-issue-id')
    await service.reissue(' PERSON@Example.com ', 'stable-reissue-id')
    expect(await service.count('jp')).toBe(3)
    expect(requests).toEqual([
      { action: 'check', email: 'person@example.com' },
      { action: 'restore', email: 'person@example.com' },
      {
        action: 'issue',
        email: 'person@example.com',
        passengerName: 'Jason',
        operationId: 'stable-issue-id',
      },
      {
        action: 'reissue',
        email: 'person@example.com',
        operationId: 'stable-reissue-id',
      },
      { action: 'count', destinationId: 'jp' },
    ])
  })

  test('hydrates display fields from the destination catalog, never server-provided labels', () => {
    expect(
      decodeTicket({
        ...storedTicket,
        country: 'invented',
        airportCode: 'BAD',
      }),
    ).toMatchObject({
      country: 'JAPAN',
      countryLabel: '일본',
      airportCode: 'NRT',
      city: 'TOKYO / NARITA',
    })
  })

  test('restore accepts explicit null; issue never treats null as successful issuance', async () => {
    const service = createFirebaseTicketService(async () => ({ ticket: null }))
    expect(await service.restore('a@example.com')).toBeNull()
    await expect(
      service.issue('a@example.com', 'A', 'op'),
    ).rejects.toMatchObject({ kind: 'uncertain' })
  })

  test.each([
    undefined,
    { ...storedTicket, destinationId: 'unknown' },
    { ...storedTicket, issuedAt: 'yesterday' },
    { ...storedTicket, issuedAt: -1 },
    { ...storedTicket, revision: 0 },
    { ...storedTicket, reissueUsed: true },
    { ...storedTicket, passengerName: '' },
    { ...storedTicket, gate: null },
  ])('rejects malformed stored ticket %#', async (ticket) => {
    const service = createFirebaseTicketService(async () => ({ ticket }))
    await expect(service.restore('a@example.com')).rejects.toMatchObject({
      kind: 'connection',
    })
    await expect(service.reissue('a@example.com', 'op')).rejects.toMatchObject({
      kind: 'uncertain',
    })
  })

  test.each([
    'not-found',
    'capacity',
    'no-alternative',
    'reissue-used',
    'not-configured',
    'invalid-input',
  ])('preserves the domain error %s', async (kind) => {
    const service = createFirebaseTicketService(async () => {
      throw { code: 'failed-precondition', details: { kind } }
    })
    await expect(
      service.issue('a@example.com', 'A', 'op'),
    ).rejects.toMatchObject({ kind })
  })

  test.each(['unavailable', 'deadline-exceeded', 'internal'])(
    'ambiguous %s writes enter restore recovery',
    async (code) => {
      const service = createFirebaseTicketService(async () => {
        throw { code }
      })
      await expect(service.checkEmail('a@example.com')).rejects.toMatchObject({
        kind: 'connection',
      })
      await expect(
        service.issue('a@example.com', 'A', 'op'),
      ).rejects.toMatchObject({ kind: 'uncertain' })
      await expect(
        service.reissue('a@example.com', 'op'),
      ).rejects.toMatchObject({
        kind: 'uncertain',
      })
    },
  )

  test('denied Firestore access reports configuration failure', async () => {
    const service = createFirebaseTicketService(async () => {
      throw { code: 'permission-denied' }
    })
    await expect(service.checkEmail('a@example.com')).rejects.toMatchObject({
      kind: 'not-configured',
    })
  })

  test.each([-1, 5, 1.5, '3', undefined])(
    'rejects impossible count %s',
    async (count) => {
      const service = createFirebaseTicketService(async () => ({ count }))
      await expect(service.count('jp')).rejects.toMatchObject({
        kind: 'connection',
      })
    },
  )

  test('rejects non-boolean existing flags', async () => {
    const service = createFirebaseTicketService(async () => ({
      existing: 'false',
    }))
    await expect(service.checkEmail('a@example.com')).rejects.toMatchObject({
      kind: 'connection',
    })
  })
})

describe('ticket service mode selection', () => {
  test('missing Firebase config fails visibly and never issues local demo tickets', async () => {
    const runtime = createTicketRuntime({})
    expect(runtime.mode).toBe('firebase')
    await expect(
      runtime.service.checkEmail('demo@gdg.example'),
    ).rejects.toMatchObject({ kind: 'not-configured' })
    await expect(
      runtime.service.issue('demo@gdg.example', 'A', 'op'),
    ).rejects.toMatchObject({ kind: 'not-configured' })
  })

  test('demo requires explicit opt-in and uses a different session from cloud/emulator', () => {
    const live = createTicketRuntime({})
    const demo = createTicketRuntime({ VITE_TICKET_SERVICE: 'demo' })
    const emulator = createTicketRuntime({
      VITE_USE_FIREBASE_EMULATORS: 'true',
    })
    expect(demo.mode).toBe('demo')
    expect(emulator.mode).toBe('emulator')
    expect(
      new Set([live.sessionKey, demo.sessionKey, emulator.sessionKey]).size,
    ).toBe(3)
  })
})

describe('direct Firestore boundaries', () => {
  test('email keys normalize case and whitespace without conflating aliases', async () => {
    expect(await firestoreEmailKey(' PERSON@Example.com ')).toBe(
      await firestoreEmailKey('person@example.com'),
    )
    expect(await firestoreEmailKey('person+tag@example.com')).not.toBe(
      await firestoreEmailKey('person@example.com'),
    )
    expect(await firestoreEmailKey('person@example.com')).toMatch(
      /^[0-9a-f]{64}$/,
    )
  })
  test.each(['', 'not-an-email', 'a\u0000@example.com', 'a b@example.com'])(
    'rejects invalid email input %s',
    async (email) => {
      await expect(firestoreEmailKey(email)).rejects.toMatchObject({
        kind: 'invalid-input',
      })
    },
  )
  test('emulator mode rejects nonlocal hosts before any connection', () => {
    expect(() =>
      createFirebaseTicketCall({
        VITE_USE_FIREBASE_EMULATORS: 'true',
        VITE_FIREBASE_EMULATOR_HOST: 'firestore.googleapis.com',
      }),
    ).toThrow('not-configured')
  })
})
