import type { ServiceErrorKind } from '../types/ticket';

export class TicketServiceError extends Error {
  readonly kind: ServiceErrorKind;

  constructor(kind: ServiceErrorKind) {
    super(kind);
    this.name = 'TicketServiceError';
    this.kind = kind;
  }
}
