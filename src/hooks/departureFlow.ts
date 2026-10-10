import type { DeparturePhase } from '../components/DepartureReveal'

const DEPARTURE_PHASES: readonly DeparturePhase[] = [
  'anticipation',
  'country',
  'details',
  'ready',
]
export const PREPARE_DURATION = 2000
export const PRINT_DURATION = 3200
export type IssuerPhase = 'preparing' | 'printing' | 'complete'
export type DepartureFlow =
  | { screen: 'idle' }
  | {
      screen: 'reveal'
      runId: number
      startedAt: number
      pausedAt: number | null
      resumedAt: number
      phase: DeparturePhase
    }
  | {
      screen: 'issuer'
      runId: number
      phase: IssuerPhase
      printingStartedAt: number
    }

type FlowAction =
  | { type: 'start'; now: number; reducedMotion: boolean; landscape: boolean }
  | { type: 'reveal'; runId: number; startedAt: number; phase: DeparturePhase }
  | { type: 'orientation'; now: number; landscape: boolean }
  | { type: 'confirm'; now: number; reducedMotion: boolean }
  | { type: 'print'; runId: number }
  | { type: 'printed'; runId: number }

export function departureFlowReducer(
  state: DepartureFlow,
  action: FlowAction,
): DepartureFlow {
  switch (action.type) {
    case 'start':
      return {
        screen: 'reveal',
        runId: action.now,
        startedAt: action.now,
        pausedAt: action.landscape ? null : action.now,
        resumedAt: action.now,
        phase: action.reducedMotion ? 'ready' : 'anticipation',
      }
    case 'reveal': {
      if (
        state.screen !== 'reveal' ||
        state.runId !== action.runId ||
        state.pausedAt !== null ||
        state.startedAt !== action.startedAt
      )
        return state
      const current = DEPARTURE_PHASES.indexOf(state.phase)
      const next = DEPARTURE_PHASES.indexOf(action.phase)
      return next > current ? { ...state, phase: action.phase } : state
    }
    case 'orientation':
      if (state.screen !== 'reveal') return state
      if (!action.landscape)
        return state.pausedAt === null
          ? { ...state, pausedAt: action.now }
          : state
      return state.pausedAt === null
        ? state
        : {
            ...state,
            startedAt: state.startedAt + action.now - state.pausedAt,
            pausedAt: null,
            resumedAt: action.now,
          }
    case 'confirm':
      if (
        state.screen !== 'reveal' ||
        state.pausedAt !== null ||
        (state.phase !== 'ready' && !action.reducedMotion)
      )
        return state
      return {
        screen: 'issuer',
        runId: state.runId,
        phase: 'preparing',
        printingStartedAt: action.now,
      }
    case 'print':
      return state.screen === 'issuer' &&
        state.phase === 'preparing' &&
        state.runId === action.runId
        ? { ...state, phase: 'printing' }
        : state
    case 'printed':
      return state.screen === 'issuer' &&
        state.phase === 'printing' &&
        state.runId === action.runId
        ? { ...state, phase: 'complete' }
        : state
  }
}
