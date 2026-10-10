import { destinations, getDestination } from '../data/destinations'
import { TicketServiceError } from './ticketServiceError'
export { TicketServiceError } from './ticketServiceError'
import type {
  DemoOperation,
  DemoTicket,
  ServiceErrorKind,
  TicketService,
} from '../types/ticket'

export const DEMO_EMAILS = [
  'demo@gdg.example',
  'member@gdg.example',
  'guest@gdg.example',
] as const
export const DEMO_STORAGE_KEY = 'gdg-homecoming-demo-v1'
interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
interface RecordEntry {
  email: string
  ticket: Omit<DemoTicket, 'country' | 'countryLabel' | 'city' | 'airportCode'>
  operationId: string
}
interface Store {
  version: 1
  records: RecordEntry[]
}
interface Options {
  storage: StoragePort
  emails?: readonly string[]
  random?: () => number
  now?: () => number
}
export function createDemoTicketService({
  storage,
  emails = DEMO_EMAILS,
  random = Math.random,
  now = Date.now,
}: Options) {
  const faults = new Map<DemoOperation, ServiceErrorKind>()
  const normalize = (email: string) => email.trim().toLowerCase()
  const eligible = (email: string) => {
    if (!emails.includes(normalize(email)))
      throw new TicketServiceError('not-found')
  }
  function read(): Store {
    try {
      const raw = storage.getItem(DEMO_STORAGE_KEY)
      if (!raw) return { version: 1, records: [] }
      const value = JSON.parse(raw) as Store
      if (value.version !== 1 || !Array.isArray(value.records))
        throw new Error('invalid store')
      for (const record of value.records) {
        if (
          typeof record.email !== 'string' ||
          !record.ticket ||
          typeof record.ticket.passengerName !== 'string' ||
          typeof record.ticket.id !== 'string' ||
          !Number.isInteger(record.ticket.revision) ||
          typeof record.ticket.reissueUsed !== 'boolean'
        )
          throw new Error('invalid record')
        getDestination(record.ticket.destinationId)
      }
      return value
    } catch {
      throw new TicketServiceError('storage')
    }
  }
  function write(store: Store) {
    try {
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store))
    } catch {
      throw new TicketServiceError('storage')
    }
  }
  function display(record: RecordEntry): DemoTicket {
    const destination = getDestination(record.ticket.destinationId)
    return {
      ...record.ticket,
      country: destination.wheelLabel,
      countryLabel: destination.name,
      city: destination.city,
      airportCode: destination.airportCode,
    }
  }
  function before(operation: DemoOperation) {
    const fault = faults.get(operation)
    faults.delete(operation)
    if (fault && fault !== 'uncertain') throw new TicketServiceError(fault)
    return fault
  }
  function select(store: Store, excluded?: string) {
    const available = destinations.filter(
      (destination) =>
        destination.id !== excluded &&
        store.records.filter(
          (record) => record.ticket.destinationId === destination.id,
        ).length < 4,
    )
    if (!available.length)
      throw new TicketServiceError(excluded ? 'no-alternative' : 'capacity')
    return available[
      Math.min(
        available.length - 1,
        Math.max(0, Math.floor(random() * available.length)),
      )
    ]!
  }
  const service: TicketService = {
    async checkEmail(email) {
      before('check')
      eligible(email)
      return {
        existing: read().records.some(
          (record) => record.email === normalize(email),
        ),
      }
    },
    async restore(email) {
      before('restore')
      eligible(email)
      const record = read().records.find(
        (record) => record.email === normalize(email),
      )
      return record ? display(record) : null
    },
    async issue(email, passengerName, operationId) {
      const fault = before('issue')
      eligible(email)
      const store = read()
      const existing = store.records.find(
        (record) => record.email === normalize(email),
      )
      if (existing) return display(existing)
      if (store.records.length >= 60) throw new TicketServiceError('capacity')
      const destination = select(store)
      const record: RecordEntry = {
        email: normalize(email),
        operationId,
        ticket: {
          id: crypto.randomUUID(),
          destinationId: destination.id,
          passengerName,
          gate: 'A03',
          issuedAt: now(),
          reissueUsed: false,
          revision: 1,
        },
      }
      store.records.push(record)
      write(store)
      if (fault === 'uncertain') throw new TicketServiceError('uncertain')
      return display(record)
    },
    async reissue(email, operationId) {
      const fault = before('reissue')
      eligible(email)
      const store = read()
      const record = store.records.find(
        (entry) => entry.email === normalize(email),
      )
      if (!record) throw new TicketServiceError('not-found')
      if (record.operationId === operationId && record.ticket.reissueUsed)
        return display(record)
      if (record.ticket.reissueUsed)
        throw new TicketServiceError('reissue-used')
      const destination = select(store, record.ticket.destinationId)
      record.ticket = {
        ...record.ticket,
        destinationId: destination.id,
        reissueUsed: true,
        revision: record.ticket.revision + 1,
      }
      record.operationId = operationId
      write(store)
      if (fault === 'uncertain') throw new TicketServiceError('uncertain')
      return display(record)
    },
    async count(destinationId) {
      before('count')
      return read().records.filter(
        (record) => record.ticket.destinationId === destinationId,
      ).length
    },
  }
  return {
    ...service,
    failNext(operation: DemoOperation, kind: ServiceErrorKind) {
      faults.set(operation, kind)
    },
  }
}
