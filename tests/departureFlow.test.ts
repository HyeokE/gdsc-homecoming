import { describe, expect, test } from 'bun:test'
import {
  PRINT_DURATION,
  departureFlowReducer as reduce,
  type DepartureFlow,
} from '../src/hooks/departureFlow'

function ready(reducedMotion = false): DepartureFlow {
  const start = reduce(
    { screen: 'idle' },
    { type: 'start', now: 100, reducedMotion, landscape: true },
  )
  return reduce(start, {
    type: 'reveal',
    runId: 100,
    startedAt: 100,
    phase: 'ready',
  })
}

const confirm = { type: 'confirm', now: 8000, reducedMotion: false } as const

describe('landscape reveal and direction-independent printing flow', () => {
  test('reveal completion waits for confirmation instead of auto printing', () => {
    const start = reduce(
      { screen: 'idle' },
      { type: 'start', now: 100, reducedMotion: false, landscape: true },
    )
    expect(reduce(start, confirm)).toBe(start)
    const state = ready()
    expect(state).toMatchObject({ screen: 'reveal', phase: 'ready' })
    expect(reduce(state, { type: 'printed', runId: 100 })).toBe(state)
  })

  test('confirmation immediately starts one print with a fixed duration', () => {
    expect(PRINT_DURATION).toBe(1600)
    const printing = reduce(ready(), confirm)
    expect(printing).toMatchObject({
      screen: 'issuer',
      phase: 'printing',
      printingStartedAt: 8000,
    })
    expect(reduce(printing, { ...confirm, now: 10000 })).toBe(printing)
    const complete = reduce(printing, { type: 'printed', runId: 100 })
    expect(complete).toMatchObject({
      phase: 'complete',
      printingStartedAt: 8000,
    })
    expect(reduce(complete, { type: 'printed', runId: 100 })).toBe(complete)
    expect(reduce(complete, { ...confirm, now: 12000 })).toBe(complete)
  })

  test('reduced motion skips reveal but still requires explicit confirmation', () => {
    const state = ready(true)
    expect(state).toMatchObject({ screen: 'reveal', phase: 'ready' })
    expect(reduce(state, { type: 'printed', runId: 100 })).toBe(state)
    const printing = reduce(state, { ...confirm, reducedMotion: true })
    expect(printing).toMatchObject({
      phase: 'printing',
      printingStartedAt: 8000,
    })
    expect(reduce(printing, { type: 'printed', runId: 100 })).toMatchObject({
      phase: 'complete',
    })
  })

  test('replay rejects stale reveal and print timers and out-of-order stages', () => {
    const oldPrinting = reduce(ready(), confirm)
    const state = reduce(oldPrinting, {
      type: 'start',
      now: 10000,
      reducedMotion: false,
      landscape: true,
    })
    expect(
      reduce(state, {
        type: 'reveal',
        runId: 100,
        startedAt: 100,
        phase: 'ready',
      }),
    ).toBe(state)
    expect(reduce(state, { type: 'printed', runId: 100 })).toBe(state)
    const details = reduce(state, {
      type: 'reveal',
      runId: 10000,
      startedAt: 10000,
      phase: 'details',
    })
    expect(
      reduce(details, {
        type: 'reveal',
        runId: 10000,
        startedAt: 10000,
        phase: 'country',
      }),
    ).toBe(details)
    const nextReady = reduce(details, {
      type: 'reveal',
      runId: 10000,
      startedAt: 10000,
      phase: 'ready',
    })
    const printing = reduce(nextReady, { ...confirm, now: 18000 })
    expect(reduce(printing, { type: 'printed', runId: 100 })).toBe(printing)
    expect(reduce(printing, { type: 'printed', runId: 10000 })).toMatchObject({
      phase: 'complete',
      printingStartedAt: 18000,
    })
  })
})

describe('landscape gating and elapsed pause/resume', () => {
  test('portrait starts paused and landscape begins from elapsed zero', () => {
    const paused = reduce(
      { screen: 'idle' },
      {
        type: 'start',
        now: 100,
        reducedMotion: false,
        landscape: false,
      },
    )
    expect(paused).toMatchObject({ phase: 'anticipation', pausedAt: 100 })
    expect(
      reduce(paused, {
        type: 'reveal',
        runId: 100,
        startedAt: 100,
        phase: 'ready',
      }),
    ).toBe(paused)
    expect(reduce(paused, confirm)).toBe(paused)
    const started = reduce(paused, {
      type: 'orientation',
      now: 5100,
      landscape: true,
    })
    expect(started).toMatchObject({
      runId: 100,
      startedAt: 5100,
      resumedAt: 5100,
      pausedAt: null,
      phase: 'anticipation',
    })
  })

  test('multiple pauses preserve elapsed time and reject callbacks from before resume', () => {
    const started = reduce(
      { screen: 'idle' },
      {
        type: 'start',
        now: 100,
        reducedMotion: false,
        landscape: true,
      },
    )
    const country = reduce(started, {
      type: 'reveal',
      runId: 100,
      startedAt: 100,
      phase: 'country',
    })
    const paused = reduce(country, {
      type: 'orientation',
      now: 3100,
      landscape: false,
    })
    expect(
      reduce(paused, { type: 'orientation', now: 5000, landscape: false }),
    ).toBe(paused)
    expect(
      reduce(paused, {
        type: 'reveal',
        runId: 100,
        startedAt: 100,
        phase: 'ready',
      }),
    ).toBe(paused)
    const resumed = reduce(paused, {
      type: 'orientation',
      now: 8100,
      landscape: true,
    })
    expect(resumed).toMatchObject({
      runId: 100,
      startedAt: 5100,
      resumedAt: 8100,
      pausedAt: null,
      phase: 'country',
    })
    expect(
      reduce(resumed, {
        type: 'reveal',
        runId: 100,
        startedAt: 100,
        phase: 'ready',
      }),
    ).toBe(resumed)
    expect(
      reduce(resumed, { type: 'orientation', now: 8200, landscape: true }),
    ).toBe(resumed)
    const pausedAgain = reduce(resumed, {
      type: 'orientation',
      now: 9100,
      landscape: false,
    })
    const resumedAgain = reduce(pausedAgain, {
      type: 'orientation',
      now: 11100,
      landscape: true,
    })
    expect(resumedAgain).toMatchObject({
      startedAt: 7100,
      resumedAt: 11100,
      phase: 'country',
    })
    expect(
      reduce(resumedAgain, {
        type: 'reveal',
        runId: 100,
        startedAt: 5100,
        phase: 'ready',
      }),
    ).toBe(resumedAgain)
    expect(
      reduce(resumedAgain, {
        type: 'reveal',
        runId: 100,
        startedAt: 7100,
        phase: 'details',
      }),
    ).toMatchObject({ phase: 'details' })
  })

  test('ready result stays ready across rotation but confirmation is blocked in portrait', () => {
    const state = ready()
    const paused = reduce(state, {
      type: 'orientation',
      now: 8000,
      landscape: false,
    })
    expect(paused).toMatchObject({ phase: 'ready', runId: 100 })
    expect(reduce(paused, confirm)).toBe(paused)
    const resumed = reduce(paused, {
      type: 'orientation',
      now: 12000,
      landscape: true,
    })
    expect(resumed).toMatchObject({ phase: 'ready', runId: 100 })
    const printing = reduce(resumed, { ...confirm, now: 12001 })
    expect(printing).toMatchObject({
      screen: 'issuer',
      phase: 'printing',
      printingStartedAt: 12001,
    })
    expect(
      reduce(printing, { type: 'orientation', now: 12002, landscape: false }),
    ).toBe(printing)
    const complete = reduce(printing, { type: 'printed', runId: 100 })
    expect(
      reduce(complete, { type: 'orientation', now: 15000, landscape: true }),
    ).toBe(complete)
  })

  test('reduced motion still waits for landscape and explicit confirmation', () => {
    const paused = reduce(
      { screen: 'idle' },
      {
        type: 'start',
        now: 100,
        reducedMotion: true,
        landscape: false,
      },
    )
    expect(paused).toMatchObject({ phase: 'ready', pausedAt: 100 })
    expect(reduce(paused, { ...confirm, reducedMotion: true })).toBe(paused)
    const resumed = reduce(paused, {
      type: 'orientation',
      now: 10000,
      landscape: true,
    })
    expect(
      reduce(resumed, { ...confirm, now: 10001, reducedMotion: true }),
    ).toMatchObject({ screen: 'issuer', printingStartedAt: 10001 })
  })
})
