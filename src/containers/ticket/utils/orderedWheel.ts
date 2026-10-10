import type { DeparturePhase, DepartureResult } from '../types/departure';
import type { RollingCell, RollingState } from '../types/rolling';

export const ROLLING_TIMING = {
  flipMs: 110,
  finalFlipMs: 180,
  slowSteps: 3,
  staggerMs: 30,
  labelHoldMs: 280,
  layoutMs: 900,
  readyHoldMs: 240,
} as const;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = ALPHABET.toLowerCase();
const DIGITS = '0123456789';
type RowName = 'country' | 'passenger' | 'airport' | 'gate';
interface CellPlan {
  target: string;
  wheel: string;
  startAt: number;
  durations: number[];
  endAt: number;
}
export interface RollingPlan {
  rows: Record<RowName, CellPlan[]>;
  countryEnd: number;
  readyAt: number;
  timeline: ReadonlyArray<{ phase: DeparturePhase; at: number }>;
}

function makeRow(value: string, startAt: number): CellPlan[] {
  const graphemes = Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
    (entry) => entry.segment,
  );
  return graphemes.map((target, index) => {
    const wheel = /^[A-Z]$/.test(target)
      ? ALPHABET
      : /^[a-z]$/.test(target)
        ? LOWERCASE
        : /^\d$/.test(target)
          ? DIGITS
          : '';
    const steps = wheel ? wheel.indexOf(target) + 1 : 0;
    const durations = Array.from({ length: steps }, (_, step) =>
      step >= steps - ROLLING_TIMING.slowSteps ? ROLLING_TIMING.finalFlipMs : ROLLING_TIMING.flipMs,
    );
    const begins = startAt + index * ROLLING_TIMING.staggerMs;
    return {
      target,
      wheel,
      startAt: begins,
      durations,
      endAt: begins + durations.reduce((sum, duration) => sum + duration, 0),
    };
  });
}
const rowEnd = (row: CellPlan[]) => Math.max(0, ...row.filter((cell) => cell.wheel).map((cell) => cell.endAt));

export function createRollingPlan(result: DepartureResult): RollingPlan {
  const country = makeRow(result.country, 0);
  const countryEnd = rowEnd(country);
  const detailsAt = countryEnd + ROLLING_TIMING.labelHoldMs;
  const detailStart = detailsAt + ROLLING_TIMING.layoutMs;
  const rows = {
    country,
    passenger: makeRow(result.passengerName, detailStart),
    airport: makeRow(result.airportCode, detailStart + 100),
    gate: makeRow(result.gate, detailStart + 200),
  };
  const readyAt = Math.max(detailStart, rowEnd(rows.gate)) + ROLLING_TIMING.readyHoldMs;
  return {
    rows,
    countryEnd,
    readyAt,
    timeline: [
      { phase: 'anticipation', at: 0 },
      { phase: 'country', at: countryEnd },
      { phase: 'details', at: detailsAt },
      { phase: 'ready', at: readyAt },
    ],
  };
}

function cellAt(cell: CellPlan, elapsed: number, id: string, reducedMotion: boolean): RollingCell {
  const settled = () => ({
    current: cell.target,
    next: cell.target,
    stepId: `${id}:settled`,
    isFlipping: false,
    durationMs: 0,
    elapsedMs: 0,
  });
  if (!cell.wheel || reducedMotion || elapsed >= cell.endAt) {
    return settled();
  }
  if (elapsed < cell.startAt) {
    return {
      current: ' ',
      next: ' ',
      stepId: `${id}:waiting`,
      isFlipping: false,
      durationMs: 0,
      elapsedMs: 0,
    };
  }
  let at = cell.startAt;
  for (let step = 0; step < cell.durations.length; step++) {
    const durationMs = cell.durations[step];
    if (elapsed < at + durationMs) {
      return {
        current: step === 0 ? ' ' : cell.wheel[step - 1],
        next: cell.wheel[step],
        stepId: `${id}:${step}`,
        isFlipping: true,
        durationMs,
        elapsedMs: elapsed - at,
      };
    }
    at += durationMs;
  }
  return settled();
}

export function rollingStateAt(plan: RollingPlan, elapsed: number, runId: number, reducedMotion = false): RollingState {
  const row = (name: RowName) =>
    plan.rows[name].map((cell, index) =>
      cellAt(cell, elapsed, `${runId}:${name}:${index}`, reducedMotion || elapsed >= plan.readyAt),
    );
  return {
    country: row('country'),
    passenger: row('passenger'),
    airport: row('airport'),
    gate: row('gate'),
    countrySettled: reducedMotion || elapsed >= plan.countryEnd,
    airportSettled: reducedMotion || elapsed >= plan.readyAt || elapsed >= rowEnd(plan.rows.airport),
    boardTransitionProgress: reducedMotion
      ? 1
      : Math.max(0, Math.min(1, (elapsed - plan.countryEnd - ROLLING_TIMING.labelHoldMs) / ROLLING_TIMING.layoutMs)),
    layoutDurationMs: ROLLING_TIMING.layoutMs,
  };
}
