import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app'

export const FIREBASE_PROJECT_ID = 'gdsc-homecomming'

const configVariables = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const

type FirebaseEnvironment = Readonly<Record<string, string | undefined>>

export type FirebaseClientState =
  | { status: 'not-configured'; missingVariables: string[] }
  | { status: 'initialized'; app: FirebaseApp }

/**
 * Initializes only the SDK app. This does not verify remote services, create a
 * database, authenticate a participant, or save a draw result.
 * SDK/configuration errors propagate to the caller instead of becoming previews.
 */
export function initializeFirebaseClient(
  environment: FirebaseEnvironment = import.meta.env,
): FirebaseClientState {
  const missingVariables = Object.values(configVariables).filter(
    (variable) => !environment[variable]?.trim(),
  )

  if (missingVariables.length > 0) {
    return { status: 'not-configured', missingVariables }
  }

  const options: FirebaseOptions = Object.fromEntries(
    Object.entries(configVariables).map(([option, variable]) => [
      option,
      environment[variable]!.trim(),
    ]),
  )

  if (options.projectId !== FIREBASE_PROJECT_ID) {
    throw new Error(
      `VITE_FIREBASE_PROJECT_ID must be ${FIREBASE_PROJECT_ID}. Check the Firebase Web app configuration.`,
    )
  }

  const measurementId = environment.VITE_FIREBASE_MEASUREMENT_ID?.trim()
  if (measurementId) options.measurementId = measurementId

  // initializeApp reuses an identically configured named app (including HMR).
  const app = initializeApp(options, 'gdg-homecoming-web')
  return { status: 'initialized', app }
}
