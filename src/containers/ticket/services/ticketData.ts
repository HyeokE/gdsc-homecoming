import { getDestination } from '../constants/destinations';
import type { Ticket } from '../types/ticket';

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function decodeTicket(value: unknown, reissuePolicy: 'once' | 'unlimited' = 'once'): Ticket {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid stored ticket');
  }
  const ticket = value as Record<string, unknown>;
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
    (reissuePolicy === 'once'
      ? ticket.revision !== (ticket.reissueUsed ? 2 : 1)
      : ticket.reissueUsed !== false || (ticket.revision as number) < 1)
  ) {
    throw new Error('Invalid stored ticket');
  }

  const destination = getDestination(ticket.destinationId);
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
  };
}
