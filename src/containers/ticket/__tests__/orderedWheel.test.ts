import { expect, test } from 'bun:test';
import { createRollingPlan, rollingStateAt, ROLLING_TIMING } from '../utils/orderedWheel';
import { departurePreview } from '../fixtures/departurePreview';

const planFor = (country: string) => createRollingPlan({ ...departurePreview, country });

test('alphabet advances from a blank plate directly through its ordered target', () => {
  const plan = planFor('Z');
  const cell = plan.rows.country[0];
  expect(cell.durations).toHaveLength(26);
  let time = 0;
  cell.durations.forEach((duration, step) => {
    const visible = rollingStateAt(plan, time + duration / 2, 1).country[0];
    expect(visible.current).toBe(step === 0 ? ' ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[step - 1]);
    expect(visible.next).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[step]);
    expect(visible.durationMs).toBe(duration);
    time += duration;
  });
  expect(rollingStateAt(plan, time, 1).country[0]).toMatchObject({
    current: 'Z',
    next: 'Z',
    isFlipping: false,
  });
});

test('A enters from blank with one real physical flip', () => {
  const plan = planFor('A');
  expect(plan.rows.country[0].durations).toHaveLength(1);
  expect(rollingStateAt(plan, 0, 1).country[0]).toMatchObject({
    current: ' ',
    next: 'A',
    isFlipping: true,
  });
  expect(rollingStateAt(plan, plan.countryEnd - 1, 1).country[0]).toMatchObject({
    current: ' ',
    next: 'A',
    isFlipping: true,
  });
  expect(rollingStateAt(plan, plan.countryEnd, 1).country[0]).toMatchObject({
    current: 'A',
    isFlipping: false,
  });
});

test('digits use 0-9 in order; spaces and sample punctuation remain stationary', () => {
  const plan = planFor('3 /');
  const digit = plan.rows.country[0];
  expect(digit.durations).toHaveLength(4);
  let time = 0;
  digit.durations.forEach((duration, step) => {
    expect(rollingStateAt(plan, time, 1).country[0]).toMatchObject({
      current: step === 0 ? ' ' : String(step - 1),
      next: String(step),
    });
    time += duration;
  });
  expect(rollingStateAt(plan, time, 1).country[0].current).toBe('3');
  expect(rollingStateAt(plan, 0, 1).country.slice(1)).toMatchObject([
    { current: ' ', isFlipping: false },
    { current: '/', isFlipping: false },
  ]);
});

test('late frames preserve the ordered position and replay uses fresh step keys', () => {
  const plan = planFor('J');
  const time = plan.rows.country[0].durations.slice(0, 5).reduce((a, b) => a + b, 0) + 5;
  const frame = rollingStateAt(plan, time, 1).country[0];
  expect(frame).toMatchObject({ current: 'E', next: 'F', elapsedMs: 5 });
  expect(rollingStateAt(plan, time, 2).country[0].stepId).not.toBe(frame.stepId);
  expect(rollingStateAt(plan, 100000, 1).country[0]).toMatchObject({
    current: 'J',
    isFlipping: false,
  });
});

test('reduced motion reveals all targets immediately without changing confirmation policy', () => {
  const plan = createRollingPlan(departurePreview);
  const state = rollingStateAt(plan, 0, 1, true);
  expect(state.country.map((cell) => cell.current).join('')).toBe('JAPAN');
  expect(state.passenger.map((cell) => cell.current).join('')).toBe('JASON JEONG');
  expect(state.country.every((cell) => !cell.isFlipping)).toBe(true);
  expect(state.countrySettled).toBe(true);
  expect(state.airportSettled).toBe(true);
});

test('guide becomes ready after visible wheels settle without a six-second minimum', () => {
  const plan = createRollingPlan(departurePreview);
  const detailsAt = plan.timeline.find((stage) => stage.phase === 'details')!.at;
  expect(plan.readyAt).toBeLessThan(6000);
  const settledAt = plan.readyAt - ROLLING_TIMING.readyHoldMs;
  const settled = rollingStateAt(plan, settledAt, 1);
  expect(settled.boardTransitionProgress).toBe(1);
  expect(settled.gate.every((cell) => !cell.isFlipping)).toBe(true);
  expect(rollingStateAt(plan, settledAt - 1, 1).gate.some((cell) => cell.isFlipping)).toBe(true);
  expect(plan.rows.passenger[0].startAt).toBe(detailsAt + ROLLING_TIMING.layoutMs);
  expect(rollingStateAt(plan, plan.countryEnd - 1, 1).countrySettled).toBe(false);
  expect(rollingStateAt(plan, plan.countryEnd, 1).countrySettled).toBe(true);
  const durations = plan.rows.country.flatMap((cell) => cell.durations);
  expect(Math.min(...durations)).toBe(110);
  expect(Math.max(...durations)).toBe(180);
});

test('lowercase rolls in case-preserving order and complex graphemes remain intact', () => {
  const name = 'Jose\u0301 👩🏽‍💻';
  const plan = createRollingPlan({ ...departurePreview, passengerName: name });
  expect(plan.rows.passenger.map((cell) => cell.target).join('')).toBe(name);
  expect(plan.rows.passenger.map((cell) => cell.target)).toContain('e\u0301');
  expect(plan.rows.passenger.map((cell) => cell.target)).toContain('👩🏽‍💻');
  const lower = plan.rows.passenger.find((cell) => cell.target === 'o')!;
  expect(lower.wheel).toBe('abcdefghijklmnopqrstuvwxyz');
  const final = rollingStateAt(plan, plan.readyAt, 1);
  expect(final.passenger.map((cell) => cell.current).join('')).toBe(name);
});

test('hidden passenger and airport plans never delay visible country and gate confirmation', () => {
  const base = createRollingPlan(departurePreview);
  const hiddenLong = createRollingPlan({
    ...departurePreview,
    passengerName: 'Z'.repeat(100),
    airportCode: 'ZZZZZZZZZZ',
  });
  expect(hiddenLong.readyAt).toBe(base.readyAt);
  const ready = rollingStateAt(hiddenLong, hiddenLong.readyAt, 1);
  expect(ready.passenger.map((cell) => cell.current).join('')).toBe('Z'.repeat(100));
  expect(ready.gate.every((cell) => !cell.isFlipping)).toBe(true);
});

test('board transition progress follows the shared elapsed clock and settles for reduced motion', () => {
  const plan = planFor('JAPAN');
  const begins = plan.countryEnd + ROLLING_TIMING.labelHoldMs;
  expect(rollingStateAt(plan, begins - 1, 1).boardTransitionProgress).toBe(0);
  expect(rollingStateAt(plan, begins, 1).boardTransitionProgress).toBe(0);
  expect(rollingStateAt(plan, begins + ROLLING_TIMING.layoutMs / 2, 1).boardTransitionProgress).toBe(0.5);
  expect(rollingStateAt(plan, begins + ROLLING_TIMING.layoutMs, 1).boardTransitionProgress).toBe(1);
  expect(rollingStateAt(plan, plan.readyAt, 1).boardTransitionProgress).toBe(1);
  expect(rollingStateAt(plan, 0, 1, true).boardTransitionProgress).toBe(1);
});
