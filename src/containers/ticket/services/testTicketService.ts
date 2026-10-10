import { createDemoTicketService, type StoragePort } from './demoTicketService';
import { TicketServiceError } from './ticketServiceError';

const TEST_ACCOUNT_EMAIL = 'test@gmail.com';
export const TEST_STORAGE_KEY = 'gdg-homecoming-test-v1';

export function isTestAccount(email: string | null): boolean {
  return email?.trim().toLowerCase() === TEST_ACCOUNT_EMAIL;
}

/** Test tickets live only in this browser and never consume participant capacity. */
export function createTestTicketService(storage: StoragePort) {
  const service = createDemoTicketService({
    storage,
    storageKey: TEST_STORAGE_KEY,
    emails: [TEST_ACCOUNT_EMAIL],
    allowUnlimitedReissue: true,
  });
  return {
    ...service,
    reset() {
      try {
        storage.setItem(TEST_STORAGE_KEY, JSON.stringify({ version: 1, records: [] }));
      } catch {
        throw new TicketServiceError('storage');
      }
    },
  };
}
