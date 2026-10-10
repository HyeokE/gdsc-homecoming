import {
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  getFirestore,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { destinations, getDestination } from '../data/destinations'
import {
  initializeFirebaseClient,
  type FirebaseEnvironment,
} from '../lib/firebase'
import type { ServiceErrorKind, Ticket, TicketService } from '../types/ticket'
import { TicketServiceError } from './ticketServiceError'
import {
  createSheetsEligibilityLookup,
  type SheetsEligibilityOptions,
} from './sheetsEligibility'

export interface TicketApiRequest {
  action: 'check' | 'restore' | 'issue' | 'reissue' | 'count'
  email?: string
  passengerName?: string
  operationId?: string
  destinationId?: string
}

/** Injectable transport also keeps contract tests independent of cloud state. */
export type TicketApiCall = (request: TicketApiRequest) => Promise<unknown>

const domainErrorKinds = new Set<ServiceErrorKind>([
  'not-found',
  'connection',
  'uncertain',
  'capacity',
  'no-alternative',
  'reissue-used',
  'invalid-input',
  'not-configured',
])

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid ticket API response')
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function decodeTicket(value: unknown): Ticket {
  const ticket = object(value)
  if (
    !nonEmptyString(ticket.id) ||
    !nonEmptyString(ticket.destinationId) ||
    !nonEmptyString(ticket.passengerName) ||
    !nonEmptyString(ticket.gate) ||
    typeof ticket.issuedAt !== 'number' ||
    !Number.isSafeInteger(ticket.issuedAt) ||
    ticket.issuedAt <= 0 ||
    ticket.issuedAt > 8_640_000_000_000_000 ||
    typeof ticket.reissueUsed !== 'boolean' ||
    !Number.isSafeInteger(ticket.revision) ||
    ticket.revision !== (ticket.reissueUsed ? 2 : 1)
  )
    throw new Error('Invalid stored ticket')

  const destination = getDestination(ticket.destinationId)
  return {
    id: ticket.id,
    destinationId: destination.id,
    passengerName: ticket.passengerName,
    gate: ticket.gate,
    issuedAt: ticket.issuedAt,
    reissueUsed: ticket.reissueUsed,
    revision: ticket.revision as number,
    country: destination.wheelLabel,
    countryLabel: destination.name,
    city: destination.city,
    airportCode: destination.airportCode,
  }
}

export function mapTicketApiError(
  error: unknown,
  write: boolean,
): TicketServiceError {
  if (error instanceof TicketServiceError) return error
  if (error && typeof error === 'object') {
    const candidate = error as { details?: { kind?: unknown }; code?: unknown }
    const kind = candidate.details?.kind
    if (
      typeof kind === 'string' &&
      domainErrorKinds.has(kind as ServiceErrorKind)
    )
      return new TicketServiceError(kind as ServiceErrorKind)
    // Denied writes did not commit. Unknown transport failures may have committed.
    if (
      candidate.code === 'permission-denied' ||
      candidate.code === 'failed-precondition'
    )
      return new TicketServiceError('not-configured')
    if (candidate.code === 'invalid-argument')
      return new TicketServiceError('invalid-input')
  }
  return new TicketServiceError(write ? 'uncertain' : 'connection')
}

export function createFirebaseTicketService(
  call: TicketApiCall,
): TicketService {
  async function request<T>(
    input: TicketApiRequest,
    decode: (data: Record<string, unknown>) => T,
  ): Promise<T> {
    const write = input.action === 'issue' || input.action === 'reissue'
    try {
      return decode(object(await call(input)))
    } catch (error) {
      throw mapTicketApiError(error, write)
    }
  }
  const normalize = (email: string) => email.trim().toLowerCase()
  return {
    checkEmail: (email) =>
      request({ action: 'check', email: normalize(email) }, (data) => {
        if (typeof data.existing !== 'boolean') throw new Error('Invalid check')
        return { existing: data.existing }
      }),
    restore: (email) =>
      request({ action: 'restore', email: normalize(email) }, (data) =>
        data.ticket === null ? null : decodeTicket(data.ticket),
      ),
    issue: (email, passengerName, operationId) =>
      request(
        {
          action: 'issue',
          email: normalize(email),
          passengerName,
          operationId,
        },
        (data) => decodeTicket(data.ticket),
      ),
    reissue: (email, operationId) =>
      request(
        { action: 'reissue', email: normalize(email), operationId },
        (data) => decodeTicket(data.ticket),
      ),
    count: (destinationId) =>
      request({ action: 'count', destinationId }, (data) => {
        if (
          typeof data.count !== 'number' ||
          !Number.isInteger(data.count) ||
          data.count < 0 ||
          data.count > 4
        )
          throw new Error('Invalid destination count')
        return data.count
      }),
  }
}

const destinationIds = destinations.map(({ id }) => id)
const eventPath = 'events/homecoming'

function fail(kind: ServiceErrorKind): never {
  throw new TicketServiceError(kind)
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0)!
    return code < 32 || code === 127
  })
}

export async function firestoreEmailKey(value: unknown): Promise<string> {
  if (typeof value !== 'string') return fail('invalid-input')
  const email = value.trim().toLowerCase()
  if (
    email.length > 254 ||
    hasControlCharacters(email) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)
  )
    return fail('invalid-input')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(email),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function allocationFrom(snapshot: DocumentSnapshot) {
  if (!snapshot.exists()) return fail('not-configured')
  const data = snapshot.data()
  if (
    data.schemaVersion !== 2 ||
    !Number.isInteger(data.total) ||
    data.total < 0 ||
    data.total > 60 ||
    !data.counts ||
    typeof data.lastOperationId !== 'string'
  )
    return fail('not-configured')
  const counts: Record<string, number> = {}
  for (const id of destinationIds) {
    const count: unknown = data.counts[id]
    if (
      typeof count !== 'number' ||
      !Number.isInteger(count) ||
      count < 0 ||
      count > 4
    )
      return fail('not-configured')
    counts[id] = count
  }
  if (
    Object.keys(data.counts).length !== destinationIds.length ||
    Object.values(counts).reduce((sum, count) => sum + count, 0) !== data.total
  )
    return fail('not-configured')
  return {
    schemaVersion: 2,
    total: data.total as number,
    counts,
    lastOperationId: data.lastOperationId as string,
  }
}

function storedTicketFrom(snapshot: DocumentSnapshot) {
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  if (
    !(data.issuedAt instanceof Timestamp) ||
    typeof data.lastOperationId !== 'string'
  )
    return fail('not-configured')
  const ticket = { ...data, issuedAt: data.issuedAt.toMillis() }
  decodeTicket(ticket)
  return ticket as ReturnType<typeof decodeTicket> & { lastOperationId: string }
}

function chooseDestination(
  counts: Record<string, number>,
  previous?: string,
): string {
  const available = destinationIds.filter(
    (id) => id !== previous && counts[id] < 4,
  )
  if (!available.length) return fail(previous ? 'no-alternative' : 'capacity')
  // Rejection sampling avoids modulo bias. Randomness is intentionally client-side.
  const limit = Math.floor(0x1_0000_0000 / available.length) * available.length
  let value: number
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0]
  } while (value >= limit)
  return available[value % available.length]
}

/** Direct browser transport. Rules validate allocation and replay invariants. */
export function createFirestoreTicketCall(db: Firestore): TicketApiCall {
  const eventRef = doc(db, eventPath)
  return async (request) => {
    if (request.action === 'count') {
      if (
        !request.destinationId ||
        !destinationIds.includes(request.destinationId)
      )
        return fail('invalid-input')
      const allocation = allocationFrom(await getDocFromServer(eventRef))
      return { count: allocation.counts[request.destinationId] }
    }
    const ticketKey = await firestoreEmailKey(request.email)
    const rosterRef = doc(db, `${eventPath}/roster/${ticketKey}`)
    const ticketRef = doc(db, `${eventPath}/tickets/${ticketKey}`)
    if (request.action === 'check' || request.action === 'restore') {
      const roster = await getDocFromServer(rosterRef)
      if (roster.data()?.eligible !== true) return fail('not-found')
      allocationFrom(await getDocFromServer(eventRef))
      const ticket = storedTicketFrom(await getDocFromServer(ticketRef))
      return request.action === 'check'
        ? { existing: ticket !== null }
        : { ticket }
    }
    if (!['issue', 'reissue'].includes(request.action))
      return fail('invalid-input')
    const operationId = request.operationId
    if (
      typeof operationId !== 'string' ||
      !/^[A-Za-z0-9_-]{8,128}$/u.test(operationId)
    )
      return fail('invalid-input')
    const passengerName = request.passengerName?.trim().normalize('NFC')
    if (
      request.action === 'issue' &&
      (!passengerName ||
        [...passengerName].length > 60 ||
        hasControlCharacters(passengerName))
    )
      return fail('invalid-input')
    let observedOperation: string | undefined
    const transact = () =>
      runTransaction(
        db,
        async (transaction) => {
          // Finish every read before writing; retries always re-evaluate availability.
          const roster = await transaction.get(rosterRef)
          if (roster.data()?.eligible !== true) return fail('not-found')
          const ticketSnapshot = await transaction.get(ticketRef)
          const eventSnapshot = await transaction.get(eventRef)
          const allocation = allocationFrom(eventSnapshot)
          observedOperation = allocation.lastOperationId
          const existing = storedTicketFrom(ticketSnapshot)
          if (request.action === 'issue' && existing) return existing
          if (request.action === 'reissue') {
            if (!existing) return fail('not-found')
            if (existing.reissueUsed) {
              if (existing.lastOperationId === operationId) return existing
              return fail('reissue-used')
            }
          }
          if (!existing && allocation.total >= 60) return fail('capacity')
          const previous = existing?.destinationId
          if (previous && allocation.counts[previous] < 1)
            return fail('not-configured')
          const destinationId = chooseDestination(allocation.counts, previous)
          allocation.counts[destinationId]++
          if (previous) allocation.counts[previous]--
          else allocation.total++
          allocation.lastOperationId = operationId
          const revision = existing ? 2 : 1
          transaction.set(doc(db, `${eventPath}/operations/${operationId}`), {
            ticketKey,
            revision,
          })
          if (existing) {
            transaction.update(ticketRef, {
              destinationId,
              reissueUsed: true,
              revision,
              lastOperationId: operationId,
            })
          } else {
            transaction.set(ticketRef, {
              id: crypto.randomUUID(),
              destinationId,
              passengerName,
              gate: 'A03',
              issuedAt: serverTimestamp(),
              reissueUsed: false,
              revision,
              lastOperationId: operationId,
            })
          }
          transaction.set(eventRef, allocation)
          return null
        },
        { maxAttempts: 20 },
      )
    // Rules may reject a stale allocation before the SDK receives an ABORTED
    // conflict. Retry only when a server read proves another allocation committed.
    // A genuine denied request with unchanged event state fails immediately.
    let replay: Awaited<ReturnType<typeof transact>> = null
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        replay = await transact()
        break
      } catch (error) {
        const code = (error as { code?: string })?.code
        if (
          code !== 'permission-denied' ||
          observedOperation === undefined ||
          attempt === 19
        )
          throw error
        const latest = allocationFrom(await getDocFromServer(eventRef))
        if (latest.lastOperationId === observedOperation) throw error
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            30 + (crypto.getRandomValues(new Uint8Array(1))[0] % 90),
          ),
        )
      }
    }
    if (replay) return { ticket: replay }
    // Read authoritative server time. A failed read after commit is an uncertain
    // write, recovered by the UI using restore and the same operation ID.
    try {
      const ticket = storedTicketFrom(await getDocFromServer(ticketRef))
      if (!ticket) return fail('uncertain')
      return { ticket }
    } catch {
      return fail('uncertain')
    }
  }
}

const emulatorConnections = new WeakSet<Firestore>()

/** Check the current Sheet only when entering with an email, not during recovery. */
export function withSheetsEligibility(
  call: TicketApiCall,
  environment: FirebaseEnvironment,
  options?: SheetsEligibilityOptions,
): TicketApiCall {
  const endpoint = environment.VITE_ROSTER_LOOKUP_URL?.trim()
  if (
    !endpoint ||
    environment.VITE_USE_FIREBASE_EMULATORS === 'true' ||
    environment.VITE_TICKET_SERVICE === 'demo'
  )
    return call
  return async (request) => {
    if (request.action === 'check') {
      const key = await firestoreEmailKey(request.email)
      const checkEligibility = createSheetsEligibilityLookup(endpoint, options)
      if (!(await checkEligibility(key))) return fail('not-found')
    }
    // The original transport still enforces the Firestore roster and allocation.
    return call(request)
  }
}

export function createFirebaseTicketCall(
  environment: FirebaseEnvironment,
): TicketApiCall {
  const emulator = environment.VITE_USE_FIREBASE_EMULATORS === 'true'
  const host = environment.VITE_FIREBASE_EMULATOR_HOST?.trim() || '127.0.0.1'
  if (emulator && host !== '127.0.0.1' && host !== 'localhost')
    return fail('not-configured')
  const client = initializeFirebaseClient(environment)
  if (client.status === 'not-configured') return fail('not-configured')
  const db = getFirestore(client.app)
  if (emulator && !emulatorConnections.has(db)) {
    connectFirestoreEmulator(db, host, 8080)
    emulatorConnections.add(db)
  }
  return withSheetsEligibility(createFirestoreTicketCall(db), environment)
}
