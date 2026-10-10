import type { DepartureResult } from '../components/DepartureReveal'

export interface Destination {
  id: string
  name: string
  wheelLabel: string
  city: string
  airportCode: string
  keywords: readonly [string, string, string]
  introduction: string
}

export interface DemoTicket extends DepartureResult {
  id: string
  destinationId: string
  issuedAt: number
  reissueUsed: boolean
  revision: number
}

export type ServiceErrorKind =
  | 'not-found'
  | 'connection'
  | 'uncertain'
  | 'storage'
  | 'capacity'
  | 'no-alternative'
  | 'reissue-used'
export type DemoOperation = 'check' | 'restore' | 'issue' | 'reissue' | 'count'

export interface TicketService {
  checkEmail(email: string): Promise<{ existing: boolean }>
  restore(email: string): Promise<DemoTicket | null>
  issue(
    email: string,
    passengerName: string,
    operationId: string,
  ): Promise<DemoTicket>
  reissue(email: string, operationId: string): Promise<DemoTicket>
  count(destinationId: string): Promise<number>
}
