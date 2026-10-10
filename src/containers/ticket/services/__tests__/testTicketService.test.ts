import { describe, expect, test } from 'bun:test';
import { createDemoTicketService, DEMO_STORAGE_KEY } from '../demoTicketService';
import { createTestTicketService, isTestAccount, TEST_STORAGE_KEY } from '../testTicketService';
import { createTicketRuntime, getServiceForEmail } from '../ticketService';
import { TicketServiceError } from '../ticketServiceError';

function fixture() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  return { data, storage, service: createTestTicketService(storage) };
}

describe('isolated test account', () => {
  test('normalizes the exact account and leaves all other addresses on the configured service', () => {
    const runtime = createTicketRuntime({});
    expect(runtime.mode).toBe('firebase');
    for (const email of ['test@gmail.com', ' TEST@GMAIL.COM ']) {
      expect(isTestAccount(email)).toBe(true);
      expect(getServiceForEmail(runtime, email)).toBe(runtime.testService);
    }
    for (const email of ['participant@gmail.com', 'test+one@gmail.com', 'test@gmail.com.evil', '', null]) {
      expect(isTestAccount(email)).toBe(false);
      expect(getServiceForEmail(runtime, email)).toBe(runtime.service);
    }
  });

  test('a repeated check-in starts fresh while retries within the active flow keep ticket identity', async () => {
    const { service, storage } = fixture();
    expect(await service.checkEmail(' TEST@GMAIL.COM ')).toEqual({ existing: false });
    const first = await service.issue(' TEST@GMAIL.COM ', '테스트', 'issue');
    expect(await service.issue('test@gmail.com', 'Changed', 'retry')).toEqual(first);
    const restoredService = createTestTicketService(storage);
    expect(await restoredService.restore('test@gmail.com')).toEqual(first);
    expect(await restoredService.checkEmail(' TEST@GMAIL.COM ')).toEqual({ existing: false });
    expect(await restoredService.restore('test@gmail.com')).toBeNull();
    expect(await restoredService.count(first.destinationId)).toBe(0);
    const fresh = await restoredService.issue('test@gmail.com', 'Fresh visitor', 'issue');
    expect(fresh.id).not.toBe(first.id);
    expect(fresh.passengerName).toBe('Fresh visitor');
    expect(fresh.revision).toBe(1);
    await expect(service.checkEmail('participant@gmail.com')).rejects.toMatchObject({ kind: 'not-found' });
    expect(await service.restore('test@gmail.com')).toEqual(fresh);
  });

  test('unlimited reissue excludes the current country and retries do not reallocate', async () => {
    const { service, storage } = fixture();
    let previous = await service.issue('test@gmail.com', '테스트', 'issue');
    for (let revision = 2; revision <= 8; revision += 1) {
      const operationId = `reissue-${revision}`;
      const next = await service.reissue('test@gmail.com', operationId);
      expect(next.destinationId).not.toBe(previous.destinationId);
      expect(next.id).toBe(previous.id);
      expect(next.revision).toBe(revision);
      expect(next.reissueUsed).toBe(false);
      expect(await service.reissue('test@gmail.com', operationId)).toEqual(next);
      expect(await service.count(previous.destinationId)).toBe(0);
      expect(await service.count(next.destinationId)).toBe(1);
      expect(await createTestTicketService(storage).restore('test@gmail.com')).toEqual(next);
      previous = next;
    }
  });

  test('test storage and counts stay separate from demo participants sharing the same browser', async () => {
    const { service, storage, data } = fixture();
    const demoService = createDemoTicketService({ storage });
    const demoTicket = await demoService.issue('demo@gdg.example', 'Participant', 'demo-issue');
    const demoBefore = data.get(DEMO_STORAGE_KEY);
    const first = await service.issue('test@gmail.com', '테스트', 'test-issue');
    await service.reissue('test@gmail.com', 'test-reissue');
    expect(data.has(TEST_STORAGE_KEY)).toBe(true);
    expect(data.get(DEMO_STORAGE_KEY)).toBe(demoBefore);
    expect(await demoService.count(demoTicket.destinationId)).toBe(1);
    expect(await demoService.count(first.destinationId)).toBe(first.destinationId === demoTicket.destinationId ? 1 : 0);
    await expect(demoService.checkEmail('test@gmail.com')).rejects.toMatchObject({ kind: 'not-found' });
  });

  test('an uncertain repeated reissue restores the committed revision without allocating again', async () => {
    const { service } = fixture();
    await service.issue('test@gmail.com', '테스트', 'issue');
    const previous = await service.reissue('test@gmail.com', 'reissue-2');
    service.failNext('reissue', 'uncertain');
    await expect(service.reissue('test@gmail.com', 'reissue-3')).rejects.toMatchObject({ kind: 'uncertain' });
    const restored = await service.restore('test@gmail.com');
    expect(restored?.revision).toBe(previous.revision + 1);
    expect(restored?.reissueUsed).toBe(false);
    expect(await service.reissue('test@gmail.com', 'reissue-3')).toEqual(restored);
  });

  test('a new test check-in discards malformed history without affecting participants', async () => {
    const { service, storage, data } = fixture();
    data.set(TEST_STORAGE_KEY, 'invalid');
    expect(await service.checkEmail('test@gmail.com')).toEqual({ existing: false });
    const demoService = createDemoTicketService({ storage });
    expect(await demoService.checkEmail('demo@gdg.example')).toEqual({ existing: false });
    expect(await service.restore('test@gmail.com')).toBeNull();
  });

  test('reset removes test history and counts while preserving other browser data', async () => {
    const { service, storage, data } = fixture();
    const demoService = createDemoTicketService({ storage });
    const demoTicket = await demoService.issue('demo@gdg.example', 'Participant', 'demo-issue');
    const demoBefore = data.get(DEMO_STORAGE_KEY);
    data.set('unrelated', 'preserved');
    const original = await service.issue('test@gmail.com', 'Original', 'issue');
    const reissued = await service.reissue('test@gmail.com', 'reissue');

    service.reset();

    expect(await service.checkEmail('test@gmail.com')).toEqual({ existing: false });
    expect(await createTestTicketService(storage).restore('test@gmail.com')).toBeNull();
    expect(await service.count(reissued.destinationId)).toBe(0);
    expect(data.get(DEMO_STORAGE_KEY)).toBe(demoBefore);
    expect(await demoService.restore('demo@gdg.example')).toEqual(demoTicket);
    expect(data.get('unrelated')).toBe('preserved');
    const fresh = await service.issue('test@gmail.com', 'Fresh', 'new-issue');
    expect(fresh.id).not.toBe(original.id);
    expect(fresh.passengerName).toBe('Fresh');
    expect(fresh.revision).toBe(1);
    expect(fresh.reissueUsed).toBe(false);
  });

  test('reset reports write failures and preserves the existing test ticket', async () => {
    const { storage, service } = fixture();
    const original = await service.issue('test@gmail.com', 'Original', 'issue');
    const unavailableService = createTestTicketService({
      getItem: storage.getItem,
      setItem() {
        throw new Error('storage unavailable');
      },
    });
    expect(() => unavailableService.reset()).toThrow(TicketServiceError);
    expect(() => unavailableService.reset()).toThrow('storage');
    expect(await service.restore('test@gmail.com')).toEqual(original);
  });
});
