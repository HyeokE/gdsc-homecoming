import { describe, expect, mock, test } from 'bun:test';
import { TicketServiceError } from '../services';
import type { Ticket } from '../types/ticket';
import { runTicketOperation } from '../utils/runTicketOperation';
import { departurePreview } from '../fixtures/departurePreview';

const ticket: Ticket = {
  ...departurePreview,
  id: 'saved-ticket',
  destinationId: 'japan',
  issuedAt: 1,
  revision: 1,
  reissueUsed: false,
};

describe('uncertain allocation recovery', () => {
  test('successful writes do not perform an extra result lookup', async () => {
    const restore = mock(async () => ticket);
    const onUncertain = mock(() => {});
    expect(
      await runTicketOperation({
        retrying: false,
        restore,
        perform: async () => ticket,
        onUncertain,
      }),
    ).toBe(ticket);
    expect(restore).not.toHaveBeenCalled();
    expect(onUncertain).not.toHaveBeenCalled();
  });

  test('retry returns a committed ticket without allocating again', async () => {
    const perform = mock(async () => ticket);
    expect(
      await runTicketOperation({
        retrying: true,
        restore: async () => ticket,
        perform,
        onUncertain: () => {},
      }),
    ).toBe(ticket);
    expect(perform).not.toHaveBeenCalled();
  });

  test('an unresolved retry performs the original operation', async () => {
    const perform = mock(async () => ticket);
    expect(
      await runTicketOperation({
        retrying: true,
        restore: async () => null,
        perform,
        onUncertain: () => {},
      }),
    ).toBe(ticket);
    expect(perform).toHaveBeenCalledTimes(1);
  });

  test('failed preflight lookup never attempts a new write', async () => {
    const error = new TicketServiceError('connection');
    const perform = mock(async () => ticket);
    await expect(
      runTicketOperation({
        retrying: true,
        restore: async () => {
          throw error;
        },
        perform,
        onUncertain: () => {},
      }),
    ).rejects.toBe(error);
    expect(perform).not.toHaveBeenCalled();
  });

  test('a lost write response is recovered through the same success path', async () => {
    const onUncertain = mock(() => {});
    expect(
      await runTicketOperation({
        retrying: false,
        restore: async () => ticket,
        perform: async () => {
          throw new TicketServiceError('uncertain');
        },
        onUncertain,
      }),
    ).toBe(ticket);
    expect(onUncertain).toHaveBeenCalledTimes(1);
  });

  test.each([false, true])('preserves uncertain error when recovery is absent or fails: %s', async (failed) => {
    const error = new TicketServiceError('uncertain');
    await expect(
      runTicketOperation({
        retrying: false,
        restore: async () => {
          if (failed) {
            throw new TicketServiceError('connection');
          }
          return null;
        },
        perform: async () => {
          throw error;
        },
        onUncertain: () => {},
      }),
    ).rejects.toBe(error);
  });

  test('known failures do not enter the uncertain recovery path', async () => {
    const error = new TicketServiceError('capacity');
    const restore = mock(async () => ticket);
    const onUncertain = mock(() => {});
    await expect(
      runTicketOperation({
        retrying: false,
        restore,
        perform: async () => {
          throw error;
        },
        onUncertain,
      }),
    ).rejects.toBe(error);
    expect(restore).not.toHaveBeenCalled();
    expect(onUncertain).not.toHaveBeenCalled();
  });
});
