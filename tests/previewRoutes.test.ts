import { expect, test } from 'bun:test'
import { departureFlowReducer as reduce } from '../src/hooks/departureFlow'
import { getPreviewRoute, PREVIEW_ROUTES } from '../src/routes/previewRoutes'

test('direct preview session cannot resolve the issuer route before confirmation', () => {
  const session = reduce(
    { screen: 'idle' },
    { type: 'start', now: 1, reducedMotion: false, landscape: true },
  )
  expect(getPreviewRoute(session)).toBe(PREVIEW_ROUTES.departure)
  const ready = reduce(session, {
    type: 'reveal',
    runId: 1,
    startedAt: 1,
    phase: 'ready',
  })
  expect(getPreviewRoute(ready)).toBe(PREVIEW_ROUTES.departure)
  const confirmed = reduce(ready, {
    type: 'confirm',
    now: 8000,
    reducedMotion: false,
  })
  expect(getPreviewRoute(confirmed)).toBe(PREVIEW_ROUTES.issuer)
  expect(confirmed).toMatchObject({ phase: 'printing' })
})

test('replay starts a fresh departure route and stale print completion cannot affect it', () => {
  const session = reduce(
    { screen: 'idle' },
    { type: 'start', now: 1, reducedMotion: true, landscape: true },
  )
  const issuer = reduce(session, {
    type: 'confirm',
    now: 2,
    reducedMotion: true,
  })
  const replay = reduce(issuer, {
    type: 'start',
    now: 10,
    reducedMotion: false,
    landscape: true,
  })
  expect(getPreviewRoute(replay)).toBe(PREVIEW_ROUTES.departure)
  expect(reduce(replay, { type: 'printed', runId: 1 })).toBe(replay)
  expect(getPreviewRoute({ screen: 'idle' })).toBe(PREVIEW_ROUTES.entry)
})
