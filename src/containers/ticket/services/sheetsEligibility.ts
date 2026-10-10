import { TicketServiceError } from './ticketServiceError';

export interface SheetsEligibilityOptions {
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs?: number;
}

/** Public deployment URL only; never accept arbitrary origins or URL parameters. */
export function createSheetsEligibilityLookup(
  endpoint: string,
  options: SheetsEligibilityOptions = {},
): (emailKey: string) => Promise<boolean> {
  const url = endpoint.trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/u.test(url)) {
    throw new TicketServiceError('not-configured');
  }

  const request = options.fetch ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? 30_000;

  return async (emailKey) => {
    if (!/^[0-9a-f]{64}$/u.test(emailKey)) {
      throw new TicketServiceError('invalid-input');
    }
    const query = new URLSearchParams({
      emailKey,
      nonce: crypto.randomUUID(),
    });
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new TicketServiceError('connection'));
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        deadline,
        (async () => {
          // No custom headers: Apps Script must be reached with a simple CORS GET.
          // A fresh nonce prevents a prior eligibility result being reused.
          const response = await request(`${url}?${query}`, {
            method: 'GET',
            credentials: 'omit',
            redirect: 'follow',
            mode: 'cors',
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new TicketServiceError('connection');
          }
          const data: unknown = await response.json();
          if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data) ||
            'error' in data ||
            !('eligible' in data) ||
            typeof data.eligible !== 'boolean'
          ) {
            throw new TicketServiceError('connection');
          }
          return data.eligible;
        })(),
      ]);
    } catch {
      // An unavailable/malformed service is never evidence of roster absence.
      throw new TicketServiceError('connection');
    } finally {
      clearTimeout(timer);
    }
  };
}
