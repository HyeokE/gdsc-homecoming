import type { DepartureFlow } from '../hooks/departureFlow'

export const PREVIEW_ROUTES = {
  entry: '/',
  departure: '/preview/departure',
  issuer: '/preview/issuer',
} as const

export function getPreviewRoute(flow: DepartureFlow) {
  if (flow.screen === 'reveal') return PREVIEW_ROUTES.departure
  if (flow.screen === 'issuer') return PREVIEW_ROUTES.issuer
  return PREVIEW_ROUTES.entry
}
