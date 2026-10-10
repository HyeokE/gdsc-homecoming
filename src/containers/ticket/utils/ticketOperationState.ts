import type { DemoTicket } from '../types/ticket';
export type ReissueActivity = 'available' | 'loading' | 'unavailable' | 'error' | 'checking-result';
// Consumption belongs to the ticket, never to an operation's temporary UI state.
export function reissueDisplayState(ticket: Pick<DemoTicket, 'reissueUsed'>, activity: ReissueActivity) {
  return ticket.reissueUsed ? 'used' : activity;
}
