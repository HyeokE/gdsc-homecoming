import type { FirebaseEnvironment } from './firebase';
import type { TicketService } from '../types/ticket';
import { createDemoTicketService } from './demoTicketService';
import { createFirebaseTicketCall, createFirebaseTicketService } from './firebaseTicketService';
import { TicketServiceError } from './ticketServiceError';
import { createTestTicketService, isTestAccount } from './testTicketService';

export interface TicketRuntime {
  mode: 'demo' | 'firebase' | 'emulator';
  sessionKey: string;
  service: TicketService;
  testService: TicketService & { reset: () => void };
}

export function getServiceForEmail(runtime: TicketRuntime, email: string | null): TicketService {
  return isTestAccount(email) ? runtime.testService : runtime.service;
}

/** Production never silently substitutes browser-local demo tickets. */
export function createTicketRuntime(environment: FirebaseEnvironment = import.meta.env ?? {}): TicketRuntime {
  const storage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
  };
  const testService = createTestTicketService(storage);
  if (environment.VITE_TICKET_SERVICE === 'demo') {
    return {
      mode: 'demo',
      sessionKey: 'gdg-demo-participant',
      service: createDemoTicketService({ storage }),
      testService,
    };
  }
  const emulator = environment.VITE_USE_FIREBASE_EMULATORS === 'true';
  // Initialize lazily so missing/invalid deployment settings surface through
  // the normal recoverable input error UI rather than preventing app startup.
  let call: ReturnType<typeof createFirebaseTicketCall> | undefined;
  return {
    mode: emulator ? 'emulator' : 'firebase',
    sessionKey: emulator ? 'gdg-emulator-participant-v1' : 'gdg-firebase-participant-v1',
    testService,
    service: createFirebaseTicketService(async (request) => {
      if (!call) {
        try {
          call = createFirebaseTicketCall(environment);
        } catch {
          throw new TicketServiceError('not-configured');
        }
      }
      return call(request);
    }),
  };
}
