import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { destinations } from '../../constants/destinations';
import { createFirebaseTicketService, createFirestoreTicketCall, firestoreEmailKey } from '../firebaseTicketService';
import type { TicketService } from '../../types/ticket';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!emulator)('direct browser Firestore issuance', () => {
  let environment: RulesTestEnvironment;
  let service: TicketService;
  beforeAll(async () => {
    if (!emulator || !/^(127\.0\.0\.1|localhost):\d+$/.test(emulator)) {
      throw new Error('Integration tests require a local Firestore emulator');
    }
    const [host, port] = emulator.split(':');
    environment = await initializeTestEnvironment({
      projectId: 'demo-gdg-homecoming-client',
      firestore: {
        host,
        port: Number(port),
        rules: await readFile(new URL('../../../../../firestore.rules', import.meta.url), 'utf8'),
      },
    });
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'events/homecoming'), {
        schemaVersion: 2,
        total: 0,
        counts: Object.fromEntries(destinations.map(({ id }) => [id, 0])),
        lastOperationId: '',
      });
      await Promise.all(
        Array.from({ length: 66 }, async (_, index) => {
          const key = await firestoreEmailKey(`member${index}@example.test`);
          await setDoc(doc(db, `events/homecoming/roster/${key}`), {
            eligible: true,
          });
        }),
      );
    });
    const db = environment.unauthenticatedContext().firestore() as unknown as Firestore;
    service = createFirebaseTicketService(createFirestoreTicketCall(db));
  }, 30_000);
  afterAll(async () => {
    await environment?.cleanup();
  });

  test('nonmembers and invalid data cannot issue', async () => {
    await expect(service.checkEmail('absent@example.test')).rejects.toMatchObject({ kind: 'not-found' });
    await expect(service.issue('absent@example.test', 'ABSENT', crypto.randomUUID())).rejects.toMatchObject({
      kind: 'not-found',
    });
    await expect(service.issue('member0@example.test', '', crypto.randomUUID())).rejects.toMatchObject({
      kind: 'invalid-input',
    });
    await expect(service.checkEmail('not-email')).rejects.toMatchObject({
      kind: 'invalid-input',
    });
  });

  test('duplicate concurrent issuance and redraw are idempotent; capacity stays atomic', async () => {
    const email = 'member0@example.test';
    expect(await service.checkEmail(email)).toEqual({ existing: false });
    expect(await service.restore(email)).toBeNull();
    const issued = await Promise.all(
      Array.from({ length: 6 }, () => service.issue(email, 'TEST PASSENGER', crypto.randomUUID())),
    );
    expect(new Set(issued.map((ticket) => ticket.id)).size).toBe(1);
    expect(new Set(issued.map((ticket) => ticket.destinationId)).size).toBe(1);
    expect(issued[0].revision).toBe(1);
    expect(issued[0].issuedAt).toBeGreaterThan(0);
    const operation = crypto.randomUUID();
    const redrawn = await Promise.all(Array.from({ length: 6 }, () => service.reissue(email, operation)));
    expect(new Set(redrawn.map((ticket) => ticket.destinationId)).size).toBe(1);
    expect(redrawn[0].destinationId).not.toBe(issued[0].destinationId);
    expect(redrawn[0]).toMatchObject({
      id: issued[0].id,
      issuedAt: issued[0].issuedAt,
      passengerName: 'TEST PASSENGER',
      revision: 2,
      reissueUsed: true,
    });
    expect(await service.restore(email)).toEqual(redrawn[0]);
    expect(await service.issue(email, 'DIFFERENT NAME', crypto.randomUUID())).toEqual(redrawn[0]);
    expect(await service.count(issued[0].destinationId)).toBe(0);
    expect(await service.count(redrawn[0].destinationId)).toBe(1);
    await expect(service.reissue(email, crypto.randomUUID())).rejects.toMatchObject({ kind: 'reissue-used' });

    const results: Array<PromiseSettledResult<unknown>> = [];
    for (let start = 1; start < 66; start += 5) {
      results.push(
        ...(await Promise.allSettled(
          Array.from({ length: Math.min(5, 66 - start) }, (_, offset) =>
            service.issue(`member${start + offset}@example.test`, 'CAPACITY TEST', crypto.randomUUID()),
          ),
        )),
      );
    }
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(59);
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected).toHaveLength(6);
    for (const result of rejected) {
      expect(result.reason).toMatchObject({ kind: 'capacity' });
    }
    const competingRedraws = await Promise.allSettled([
      service.reissue('member1@example.test', crypto.randomUUID()),
      service.reissue('member1@example.test', crypto.randomUUID()),
    ]);
    expect(competingRedraws.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const lostRedraw = competingRedraws.find((result) => result.status === 'rejected');
    expect(lostRedraw?.reason).toMatchObject({ kind: 'reissue-used' });
    await environment.withSecurityRulesDisabled(async (context) => {
      const event = (await getDoc(doc(context.firestore(), 'events/homecoming'))).data()!;
      const counts = Object.values(event.counts) as number[];
      expect(event.total).toBe(60);
      expect(counts.reduce((sum, count) => sum + count, 0)).toBe(60);
      expect(counts.every((count) => count >= 0 && count <= 4)).toBe(true);
      expect(Object.keys(event).sort()).toEqual(['counts', 'lastOperationId', 'schemaVersion', 'total']);
    });
  }, 120_000);
});
