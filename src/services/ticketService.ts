import type { FirebaseEnvironment } from '../lib/firebase'
import type { TicketService } from '../types/ticket'
import { createDemoTicketService } from './demoTicketService'
import {
  createFirebaseTicketCall,
  createFirebaseTicketService,
} from './firebaseTicketService'
import { TicketServiceError } from './ticketServiceError'

export interface TicketRuntime {
  mode: 'demo' | 'firebase' | 'emulator'
  sessionKey: string
  service: TicketService
}

/** Production never silently substitutes browser-local demo tickets. */
export function createTicketRuntime(
  environment: FirebaseEnvironment = import.meta.env ?? {},
): TicketRuntime {
  if (environment.VITE_TICKET_SERVICE === 'demo') {
    return {
      mode: 'demo',
      sessionKey: 'gdg-demo-participant',
      service: createDemoTicketService({
        storage: {
          getItem: (key) => localStorage.getItem(key),
          setItem: (key, value) => localStorage.setItem(key, value),
        },
      }),
    }
  }
  const emulator = environment.VITE_USE_FIREBASE_EMULATORS === 'true'
  // Initialize lazily so missing/invalid deployment settings surface through
  // the normal recoverable input error UI rather than preventing app startup.
  let call: ReturnType<typeof createFirebaseTicketCall> | undefined
  return {
    mode: emulator ? 'emulator' : 'firebase',
    sessionKey: emulator
      ? 'gdg-emulator-participant-v1'
      : 'gdg-firebase-participant-v1',
    service: createFirebaseTicketService(async (request) => {
      if (!call) {
        try {
          call = createFirebaseTicketCall(environment)
        } catch {
          throw new TicketServiceError('not-configured')
        }
      }
      return call(request)
    }),
  }
}
