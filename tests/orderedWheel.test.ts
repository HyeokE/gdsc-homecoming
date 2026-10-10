import { expect, test } from 'bun:test'
import {
  createRollingPlan,
  rollingStateAt,
  ROLLING_TIMING,
} from '../src/hooks/orderedWheel'
import { departurePreview } from '../src/fixtures/departurePreview'

const planFor = (country: string) =>
  createRollingPlan({ ...departurePreview, country })

test('alphabet advances in order for a full lap then settles on its target', () => {
  const plan = planFor('Z')
  const cell = plan.rows.country[0]
  expect(cell.durations).toHaveLength(51)
  let time = 0
  cell.durations.forEach((duration, step) => {
    const visible = rollingStateAt(plan, time + duration / 2, 1).country[0]
    expect(visible.current).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[step % 26])
    expect(visible.next).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(step + 1) % 26])
    expect(visible.durationMs).toBe(duration)
    time += duration
  })
  expect(rollingStateAt(plan, time, 1).country[0]).toMatchObject({
    current: 'Z',
    next: 'Z',
    isFlipping: false,
  })
})

test('A rolls through Z and returns to A instead of being static', () => {
  const plan = planFor('A')
  expect(plan.rows.country[0].durations).toHaveLength(26)
  expect(rollingStateAt(plan, 0, 1).country[0]).toMatchObject({
    current: 'A',
    next: 'B',
    isFlipping: true,
  })
  expect(rollingStateAt(plan, plan.countryEnd - 1, 1).country[0]).toMatchObject(
    { current: 'Z', next: 'A', isFlipping: true },
  )
  expect(rollingStateAt(plan, plan.countryEnd, 1).country[0]).toMatchObject({
    current: 'A',
    isFlipping: false,
  })
})

test('digits use 0-9 in order; spaces and sample punctuation remain stationary', () => {
  const plan = planFor('3 /')
  const digit = plan.rows.country[0]
  expect(digit.durations).toHaveLength(13)
  let time = 0
  digit.durations.forEach((duration, step) => {
    expect(rollingStateAt(plan, time, 1).country[0]).toMatchObject({
      current: String(step % 10),
      next: String((step + 1) % 10),
    })
    time += duration
  })
  expect(rollingStateAt(plan, time, 1).country[0].current).toBe('3')
  expect(rollingStateAt(plan, 0, 1).country.slice(1)).toMatchObject([
    { current: ' ', isFlipping: false },
    { current: '/', isFlipping: false },
  ])
})

test('late frames preserve the ordered position and replay uses fresh step keys', () => {
  const plan = planFor('J')
  const time =
    plan.rows.country[0].durations.slice(0, 10).reduce((a, b) => a + b, 0) + 5
  const frame = rollingStateAt(plan, time, 1).country[0]
  expect(frame).toMatchObject({ current: 'K', next: 'L', elapsedMs: 5 })
  expect(rollingStateAt(plan, time, 2).country[0].stepId).not.toBe(frame.stepId)
  expect(rollingStateAt(plan, 100000, 1).country[0]).toMatchObject({
    current: 'J',
    isFlipping: false,
  })
})

test('reduced motion reveals all targets immediately without changing confirmation policy', () => {
  const plan = createRollingPlan(departurePreview)
  const state = rollingStateAt(plan, 0, 1, true)
  expect(state.country.map((cell) => cell.current).join('')).toBe('JAPAN')
  expect(state.passenger.map((cell) => cell.current).join('')).toBe(
    'JASON JEONG',
  )
  expect(state.country.every((cell) => !cell.isFlipping)).toBe(true)
  expect(state.countrySettled).toBe(true)
  expect(state.airportSettled).toBe(true)
})

test('sample finishes in 6-8 seconds and detail wheels start after layout completes', () => {
  const plan = createRollingPlan(departurePreview)
  const detailsAt = plan.timeline.find((stage) => stage.phase === 'details')!.at
  expect(plan.readyAt).toBeGreaterThanOrEqual(6000)
  expect(plan.readyAt).toBeLessThanOrEqual(8000)
  expect(plan.rows.passenger[0].startAt).toBe(
    detailsAt + ROLLING_TIMING.layoutMs,
  )
  expect(rollingStateAt(plan, plan.countryEnd - 1, 1).countrySettled).toBe(
    false,
  )
  expect(rollingStateAt(plan, plan.countryEnd, 1).countrySettled).toBe(true)
  const durations = plan.rows.country.flatMap((cell) => cell.durations)
  expect(Math.min(...durations)).toBe(60)
  expect(Math.max(...durations)).toBe(110)
})

test('lowercase rolls in case-preserving order and complex graphemes remain intact', () => {
  const name = 'Jose\u0301 👩🏽‍💻'
  const plan = createRollingPlan({ ...departurePreview, passengerName: name })
  expect(plan.rows.passenger.map((cell) => cell.target).join('')).toBe(name)
  expect(plan.rows.passenger.map((cell) => cell.target)).toContain('e\u0301')
  expect(plan.rows.passenger.map((cell) => cell.target)).toContain('👩🏽‍💻')
  const lower = plan.rows.passenger.find((cell) => cell.target === 'o')!
  expect(lower.wheel).toBe('abcdefghijklmnopqrstuvwxyz')
  const final = rollingStateAt(plan, plan.readyAt, 1)
  expect(final.passenger.map((cell) => cell.current).join('')).toBe(name)
})
