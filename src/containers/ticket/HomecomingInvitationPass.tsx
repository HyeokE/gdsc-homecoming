import { BoardingPass } from './components/BoardingPass';
import type { DepartureResult } from './types/departure';

const INVITATION_PASS = {
  passengerName: '\u00a0',
  country: 'YOUR JOURNEY',
  city: 'YOUR JOURNEY',
  airportCode: 'GDSC',
  airlineLabel: 'GDG',
  flightNumber: '121',
  boardingTime: '15:00',
  gate: 'DJU',
} satisfies DepartureResult;

/** Invitation artwork only; no passenger record is issued or read. */
export function HomecomingInvitationPass() {
  return <BoardingPass result={INVITATION_PASS} exportMode />;
}
