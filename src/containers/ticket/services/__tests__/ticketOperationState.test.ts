import { expect, test } from 'bun:test';
import { reissueDisplayState } from '../../utils/ticketOperationState';
import { createDemoTicketService } from '../demoTicketService';
test('reissue consumption never carries over between participants', async () => {
  const data = new Map<string, string>();
  const service = createDemoTicketService({
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    },
    random: () => 0,
  });
  await service.issue('demo@gdg.example', 'First', 'issue-one');
  const used = await service.reissue('demo@gdg.example', 'reissue-one');
  expect(reissueDisplayState(used, 'available')).toBe('used');
  const fresh = await service.issue('member@gdg.example', 'Second', 'issue-two');
  expect(reissueDisplayState(fresh, 'available')).toBe('available');
  expect(reissueDisplayState(fresh, 'loading')).toBe('loading');
  expect(reissueDisplayState(used, 'error')).toBe('used');
});
