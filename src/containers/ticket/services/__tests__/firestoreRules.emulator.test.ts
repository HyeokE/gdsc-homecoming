import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { destinations } from '../../constants/destinations';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const root = 'events/homecoming';
const member = 'a'.repeat(64);
const anotherMember = 'b'.repeat(64);
const outsider = 'c'.repeat(64);
const emptyCounts = () => Object.fromEntries(destinations.map(({ id }) => [id, 0]));
const emptyEvent = () => ({
  schemaVersion: 2,
  total: 0,
  counts: emptyCounts(),
  lastOperationId: 'seed_v2_initial',
});

type Allocation = ReturnType<typeof emptyEvent>;
type Commit = {
  allocation: Allocation;
  ticket: DocumentData;
  key: string;
  operationId: string;
};

describe.skipIf(!emulator)('direct Firestore allocation rules', () => {
  let environment: RulesTestEnvironment;
  let db: Firestore;

  beforeAll(async () => {
    if (!emulator || !/^(127\.0\.0\.1|localhost):\d+$/.test(emulator)) {
      throw new Error('Rules tests require a local Firestore emulator');
    }
    const [host, port] = emulator.split(':');
    environment = await initializeTestEnvironment({
      projectId: 'demo-gdg-homecoming-rules',
      firestore: {
        host,
        port: Number(port),
        rules: await readFile(new URL('../../../../../firestore.rules', import.meta.url), 'utf8'),
      },
    });
    db = environment.unauthenticatedContext().firestore();
  });
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();
      await Promise.all([
        setDoc(doc(admin, root), emptyEvent()),
        setDoc(doc(admin, `${root}/roster/${member}`), { eligible: true }),
        setDoc(doc(admin, `${root}/roster/${anotherMember}`), {
          eligible: true,
        }),
      ]);
    });
  });
  afterAll(async () => {
    await environment?.cleanup();
  });

  async function planIssue(key = member, destinationId = 'kr'): Promise<Commit> {
    const allocation = (await getDoc(doc(db, root))).data() as Allocation;
    const operationId = crypto.randomUUID();
    allocation.total++;
    allocation.counts[destinationId]++;
    allocation.lastOperationId = operationId;
    return {
      allocation,
      key,
      operationId,
      ticket: {
        id: crypto.randomUUID(),
        destinationId,
        passengerName: 'TEST PASSENGER',
        gate: 'A03',
        issuedAt: serverTimestamp(),
        reissueUsed: false,
        revision: 1,
        lastOperationId: operationId,
      },
    };
  }
  async function planRedraw(destinationId = 'jp'): Promise<Commit> {
    const allocation = (await getDoc(doc(db, root))).data() as Allocation;
    const ticket = (await getDoc(doc(db, `${root}/tickets/${member}`))).data()!;
    const operationId = crypto.randomUUID();
    allocation.counts[ticket.destinationId]--;
    allocation.counts[destinationId]++;
    allocation.lastOperationId = operationId;
    return {
      allocation,
      key: member,
      operationId,
      ticket: {
        ...ticket,
        destinationId,
        reissueUsed: true,
        revision: 2,
        lastOperationId: operationId,
      },
    };
  }
  function commit(plan: Commit, omit?: 'event' | 'ticket' | 'operation') {
    const batch = writeBatch(db);
    if (omit !== 'event') {
      batch.set(doc(db, root), plan.allocation);
    }
    if (omit !== 'ticket') {
      batch.set(doc(db, `${root}/tickets/${plan.key}`), plan.ticket);
    }
    if (omit !== 'operation') {
      batch.set(doc(db, `${root}/operations/${plan.operationId}`), {
        ticketKey: plan.key,
        revision: plan.ticket.revision,
      });
    }
    return batch.commit();
  }
  async function issue() {
    await assertSucceeds(commit(await planIssue()));
  }
  async function seedAllocation(allocation: Allocation) {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), root), allocation);
    });
  }

  test('anonymous members can issue and redraw atomically with preserved identity', async () => {
    await issue();
    const original = (await getDoc(doc(db, `${root}/tickets/${member}`))).data()!;
    expect(original.issuedAt).toBeInstanceOf(Timestamp);
    await assertSucceeds(commit(await planRedraw()));
    const ticket = (await getDoc(doc(db, `${root}/tickets/${member}`))).data()!;
    const event = (await getDoc(doc(db, root))).data()!;
    expect(ticket).toEqual({
      ...original,
      destinationId: 'jp',
      revision: 2,
      reissueUsed: true,
      lastOperationId: event.lastOperationId,
    });
    expect(event.total).toBe(1);
    expect(event.counts.kr).toBe(0);
    expect(event.counts.jp).toBe(1);
  });

  test('only exact roster/member ticket and public aggregate reads are allowed', async () => {
    await issue();
    await assertSucceeds(getDoc(doc(db, root)));
    await assertSucceeds(getDoc(doc(db, `${root}/roster/${member}`)));
    await assertSucceeds(getDoc(doc(db, `${root}/roster/${outsider}`)));
    await assertSucceeds(getDoc(doc(db, `${root}/tickets/${anotherMember}`)));
    await assertFails(getDoc(doc(db, `${root}/tickets/${outsider}`)));
    await assertFails(getDoc(doc(db, `${root}/roster/not-a-hash`)));
    const operationId = (await getDoc(doc(db, root))).data()!.lastOperationId;
    await assertFails(getDoc(doc(db, `${root}/operations/${operationId}`)));
    for (const path of ['events', `${root}/roster`, `${root}/tickets`, `${root}/operations`]) {
      await assertFails(getDocs(collection(db, path)));
    }
  });

  test.each(['event', 'ticket', 'operation'] as const)('rejects issuance missing its %s write', async (omit) => {
    await assertFails(commit(await planIssue(), omit));
  });
  test('rejects standalone counter forgery', async () => {
    await assertFails(
      setDoc(doc(db, root), {
        ...emptyEvent(),
        total: 1,
        counts: { ...emptyCounts(), kr: 1 },
        lastOperationId: crypto.randomUUID(),
      }),
    );
  });
  test('rejects nonmember and revoked member issuance', async () => {
    await assertFails(commit(await planIssue(outsider)));
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `${root}/roster/${member}`), {
        eligible: false,
      });
    });
    await assertFails(commit(await planIssue()));
  });
  test('rejects two tickets coupled to one allocation update', async () => {
    const plan = await planIssue();
    const batch = writeBatch(db);
    batch.set(doc(db, root), plan.allocation);
    batch.set(doc(db, `${root}/tickets/${member}`), plan.ticket);
    batch.set(doc(db, `${root}/tickets/${anotherMember}`), {
      ...plan.ticket,
      id: crypto.randomUUID(),
    });
    batch.set(doc(db, `${root}/operations/${plan.operationId}`), {
      ticketKey: member,
      revision: 1,
    });
    await assertFails(batch.commit());
  });
  test.each(['extra', 'missing', 'fractional', 'negative', 'unrelated', 'unchanged'] as const)(
    'rejects %s counters',
    async (kind) => {
      const plan = await planIssue();
      if (kind === 'extra') {
        plan.allocation.counts.fake = 0;
      }
      if (kind === 'missing') {
        delete plan.allocation.counts.nz;
      }
      if (kind === 'fractional') {
        plan.allocation.counts.kr = 1.5;
      }
      if (kind === 'negative') {
        plan.allocation.counts.kr = -1;
      }
      if (kind === 'unrelated') {
        plan.allocation.counts.jp = 1;
      }
      if (kind === 'unchanged') {
        plan.allocation.counts.kr = 0;
      }
      await assertFails(commit(plan));
    },
  );
  test('rejects destination capacity overflow', async () => {
    await seedAllocation({
      ...emptyEvent(),
      total: 4,
      counts: { ...emptyCounts(), kr: 4 },
    });
    await assertFails(commit(await planIssue()));
  });
  test('rejects total capacity overflow even when destination has space', async () => {
    await seedAllocation({
      ...emptyEvent(),
      total: 60,
      counts: Object.fromEntries(destinations.map(({ id }) => [id, 3])),
    });
    await assertFails(commit(await planIssue()));
  });
  test('rejects altered total, event schema and extra event fields', async () => {
    for (const field of ['total', 'schemaVersion', 'extra']) {
      const plan = await planIssue();
      Object.assign(plan.allocation, { [field]: field === 'total' ? 0 : 7 });
      await assertFails(commit(plan));
    }
  });
  test.each([
    'name',
    'control',
    'long',
    'id',
    'gate',
    'timestamp',
    'destination',
    'revision',
    'redraw',
    'extra',
    'operation',
  ] as const)('rejects invalid ticket %s', async (kind) => {
    const plan = await planIssue();
    if (kind === 'name') {
      plan.ticket.passengerName = '';
    }
    if (kind === 'control') {
      plan.ticket.passengerName = 'BAD\nNAME';
    }
    if (kind === 'long') {
      plan.ticket.passengerName = '가'.repeat(61);
    }
    if (kind === 'id') {
      plan.ticket.id = 'not-a-uuid';
    }
    if (kind === 'gate') {
      plan.ticket.gate = 'B99';
    }
    if (kind === 'timestamp') {
      plan.ticket.issuedAt = Timestamp.fromMillis(1);
    }
    if (kind === 'destination') {
      plan.ticket.destinationId = 'fake';
    }
    if (kind === 'revision') {
      plan.ticket.revision = 2;
    }
    if (kind === 'redraw') {
      plan.ticket.reissueUsed = true;
    }
    if (kind === 'extra') {
      plan.ticket.email = 'private@example.com';
    }
    if (kind === 'operation') {
      plan.ticket.lastOperationId = 'x';
    }
    await assertFails(commit(plan));
  });
  test('rejects second redraw and redraw to same destination', async () => {
    await issue();
    await assertFails(commit(await planRedraw('kr')));
    await assertSucceeds(commit(await planRedraw('jp')));
    await assertFails(commit(await planRedraw('fr')));
  });
  test.each(['id', 'passengerName', 'gate', 'issuedAt'] as const)('redraw cannot modify %s', async (field) => {
    await issue();
    const plan = await planRedraw();
    const changes = {
      id: crypto.randomUUID(),
      passengerName: 'DIFFERENT',
      gate: 'B99',
      issuedAt: Timestamp.fromMillis(1),
    };
    plan.ticket[field] = changes[field];
    await assertFails(commit(plan));
  });
  test('redraw must release old seat and reserve new one together', async () => {
    await issue();
    const plan = await planRedraw();
    plan.allocation.counts.kr = 1;
    await assertFails(commit(plan));
    const other = await planRedraw();
    other.allocation.counts.jp = 0;
    await assertFails(commit(other));
  });
  test('operation receipts cannot be replayed, read, modified or deleted', async () => {
    const initial = await planIssue();
    await assertSucceeds(commit(initial));
    const redraw = await planRedraw();
    redraw.operationId = initial.operationId;
    redraw.ticket.lastOperationId = initial.operationId;
    redraw.allocation.lastOperationId = initial.operationId;
    await assertFails(commit(redraw));
    await assertFails(
      setDoc(doc(db, `${root}/operations/${initial.operationId}`), {
        ticketKey: anotherMember,
        revision: 2,
      }),
    );
    await assertFails(deleteDoc(doc(db, `${root}/operations/${initial.operationId}`)));
  });
  test('clients cannot create roster entries, delete data or create another event', async () => {
    await issue();
    await assertFails(setDoc(doc(db, `${root}/roster/${outsider}`), { eligible: true }));
    await assertFails(setDoc(doc(db, 'events/other'), emptyEvent()));
    for (const path of [root, `${root}/tickets/${member}`, `${root}/roster/${member}`]) {
      await assertFails(deleteDoc(doc(db, path)));
    }
  });
});
