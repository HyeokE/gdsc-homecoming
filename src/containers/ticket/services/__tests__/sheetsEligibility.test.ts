import { describe, expect, test } from 'bun:test';
import { createSheetsEligibilityLookup } from '../sheetsEligibility';
import {
  createFirebaseTicketService,
  firestoreEmailKey,
  withSheetsEligibility,
  type TicketApiRequest,
} from '../firebaseTicketService';

const endpoint = 'https://script.google.com/macros/s/test-deployment_123/exec';
const emailKey = 'a'.repeat(64);

describe('on-demand Sheets eligibility', () => {
  test.each([true, false])('accepts an explicit eligible=%s', async (eligible) => {
    const lookup = createSheetsEligibilityLookup(endpoint, {
      fetch: async () => Response.json({ eligible }),
    });
    expect(await lookup(emailKey)).toBe(eligible);
  });

  test('sends a fresh simple GET containing only the email hash and nonce', async () => {
    const requests: Array<{ url: URL; init: RequestInit }> = [];
    const lookup = createSheetsEligibilityLookup(endpoint, {
      fetch: async (url, init) => {
        requests.push({ url: new URL(url), init });
        return Response.json({ eligible: true });
      },
    });
    await lookup(emailKey);
    await lookup(emailKey);
    for (const { url, init } of requests) {
      expect(url.origin + url.pathname).toBe(endpoint);
      expect([...url.searchParams.keys()]).toEqual(['emailKey', 'nonce']);
      expect(url.searchParams.get('emailKey')).toBe(emailKey);
      expect(url.searchParams.get('nonce')).toBeTruthy();
      expect(init).toMatchObject({
        method: 'GET',
        credentials: 'omit',
        redirect: 'follow',
        mode: 'cors',
      });
      expect(init.headers).toBeUndefined();
      expect(init.body).toBeUndefined();
    }
    expect(requests[0].url.searchParams.get('nonce')).not.toBe(requests[1].url.searchParams.get('nonce'));
  });

  test.each([
    null,
    [],
    {},
    { eligible: 'false' },
    { eligible: 0 },
    { error: 'unavailable' },
    { eligible: false, error: 'unavailable' },
  ])('malformed or error responses never imply roster absence %#', async (data) => {
    const lookup = createSheetsEligibilityLookup(endpoint, {
      fetch: async () => Response.json(data),
    });
    await expect(lookup(emailKey)).rejects.toMatchObject({
      kind: 'connection',
    });
  });

  test.each([401, 403, 404, 500])('HTTP %s is a connection error', async (status) => {
    const lookup = createSheetsEligibilityLookup(endpoint, {
      fetch: async () => Response.json({ eligible: false }, { status }),
    });
    await expect(lookup(emailKey)).rejects.toMatchObject({
      kind: 'connection',
    });
  });

  test('an HTML sign-in response is a connection error', async () => {
    const lookup = createSheetsEligibilityLookup(endpoint, {
      fetch: async () => new Response('<html>Sign in</html>'),
    });
    await expect(lookup(emailKey)).rejects.toMatchObject({ kind: 'connection' });
  });

  test('network and CORS failures remain connection errors', async () => {
    const lookup = createSheetsEligibilityLookup(endpoint, {
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await expect(lookup(emailKey)).rejects.toMatchObject({ kind: 'connection' });
  });

  test('the deadline aborts a stalled request without waiting for fetch to reject', async () => {
    let signal: AbortSignal | null | undefined;
    const lookup = createSheetsEligibilityLookup(endpoint, {
      timeoutMs: 10,
      fetch: async (_, init) => {
        signal = init.signal;
        return new Promise<Response>(() => {});
      },
    });
    await expect(lookup(emailKey)).rejects.toMatchObject({ kind: 'connection' });
    expect(signal?.aborted).toBe(true);
  });

  test('the deadline also covers a response body that never finishes', async () => {
    const lookup = createSheetsEligibilityLookup(endpoint, {
      timeoutMs: 10,
      fetch: async () => new Response(new ReadableStream({ start() {} })),
    });
    await expect(lookup(emailKey)).rejects.toMatchObject({ kind: 'connection' });
  });

  test.each([
    '',
    'http://script.google.com/macros/s/id/exec',
    'https://example.com/macros/s/id/exec',
    'https://script.google.com.evil.test/macros/s/id/exec',
    'https://user:password@script.google.com/macros/s/id/exec',
    'https://script.google.com:443/macros/s/id/exec',
    'https://script.google.com/macros/s/id/dev',
    'https://script.google.com/macros/s/id/exec?key=value',
    'https://script.google.com/macros/s/id/exec#fragment',
    'https://script.google.com/macros/s/id/exec/',
  ])('rejects unsupported configured URL %#', (url) => {
    expect(() => createSheetsEligibilityLookup(url)).toThrow('not-configured');
  });
});

describe('Sheets gate on the live Firebase email check', () => {
  const environment = { VITE_ROSTER_LOOKUP_URL: endpoint };

  test('normalizes and hashes the email, rechecks every time, then calls Firestore', async () => {
    const order: string[] = [];
    const keys: string[] = [];
    const service = createFirebaseTicketService(
      withSheetsEligibility(
        async () => {
          order.push('firestore');
          return { existing: true };
        },
        environment,
        {
          fetch: async (url) => {
            order.push('sheets');
            keys.push(new URL(url).searchParams.get('emailKey')!);
            return Response.json({ eligible: true });
          },
        },
      ),
    );
    expect(await service.checkEmail(' PERSON@Example.com ')).toEqual({
      existing: true,
    });
    await service.checkEmail('person@example.com');
    expect(keys).toEqual(Array(2).fill(await firestoreEmailKey('person@example.com')));
    expect(order).toEqual(['sheets', 'firestore', 'sheets', 'firestore']);
  });

  test.each([
    [{ eligible: false }, 'not-found'],
    [{ error: 'unavailable' }, 'connection'],
  ] as const)('never falls through to Firestore for failed eligibility %#', async (data, kind) => {
    let firestoreCalls = 0;
    const service = createFirebaseTicketService(
      withSheetsEligibility(
        async () => {
          firestoreCalls++;
          return { existing: false };
        },
        environment,
        { fetch: async () => Response.json(data) },
      ),
    );
    await expect(service.checkEmail('person@example.com')).rejects.toMatchObject({ kind });
    expect(firestoreCalls).toBe(0);
  });

  test('invalid emails never reach either server', async () => {
    let requests = 0;
    const call = withSheetsEligibility(
      async () => {
        requests++;
        return {};
      },
      environment,
      {
        fetch: async () => {
          requests++;
          return Response.json({ eligible: true });
        },
      },
    );
    await expect(call({ action: 'check', email: 'invalid' })).rejects.toMatchObject({ kind: 'invalid-input' });
    expect(requests).toBe(0);
  });

  test('restore, issue, reissue, and count bypass the Sheet', async () => {
    let sheetCalls = 0;
    const requests: TicketApiRequest[] = [];
    const call = withSheetsEligibility(
      async (request) => {
        requests.push(request);
        return {};
      },
      environment,
      {
        fetch: async () => {
          sheetCalls++;
          return Response.json({ eligible: true });
        },
      },
    );
    for (const action of ['restore', 'issue', 'reissue', 'count'] as const) {
      await call({ action });
    }
    expect(requests.map(({ action }) => action)).toEqual(['restore', 'issue', 'reissue', 'count']);
    expect(sheetCalls).toBe(0);
  });

  test('a malformed live URL fails only the email check, preserving restore', async () => {
    const service = createFirebaseTicketService(
      withSheetsEligibility(async () => ({ ticket: null }), {
        VITE_ROSTER_LOOKUP_URL: 'https://example.com/lookup',
      }),
    );
    expect(await service.restore('person@example.com')).toBeNull();
    await expect(service.checkEmail('person@example.com')).rejects.toMatchObject({
      kind: 'not-configured',
    });
  });

  test.each([
    {},
    { VITE_ROSTER_LOOKUP_URL: '' },
    { VITE_ROSTER_LOOKUP_URL: 'invalid', VITE_USE_FIREBASE_EMULATORS: 'true' },
    { VITE_ROSTER_LOOKUP_URL: 'invalid', VITE_TICKET_SERVICE: 'demo' },
  ])('unconfigured and local modes retain the original transport %#', (config) => {
    const original = async () => ({ existing: false });
    expect(withSheetsEligibility(original, config)).toBe(original);
  });
});
