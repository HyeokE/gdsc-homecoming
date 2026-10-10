import { TicketServiceError } from '../services';
import type { Ticket } from '../types/ticket';

/** Reconcile an uncertain write before sending another allocation request. */
export async function runTicketOperation({
  retrying,
  restore,
  perform,
  onUncertain,
}: {
  retrying: boolean;
  restore: () => Promise<Ticket | null>;
  perform: () => Promise<Ticket>;
  onUncertain: () => void;
}): Promise<Ticket> {
  if (retrying) {
    const recovered = await restore();
    if (recovered) {
      return recovered;
    }
  }

  try {
    return await perform();
  } catch (error) {
    if (!(error instanceof TicketServiceError) || error.kind !== 'uncertain') {
      throw error;
    }

    onUncertain();
    try {
      const recovered = await restore();
      if (recovered) {
        return recovered;
      }
    } catch {
      // Preserve the uncertain write error and operation id for the next retry.
    }
    throw error;
  }
}
