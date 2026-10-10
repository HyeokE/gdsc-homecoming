import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DepartureReveal } from '../components/DepartureReveal'
import { TicketIssuer } from '../components/TicketIssuer'
import { OrientationPrompt } from '../components/OrientationPrompt'
import { departurePreview } from '../fixtures/departurePreview'
import { PRINT_DURATION } from '../hooks/departureFlow'
import { useDepartureReveal } from '../hooks/useDepartureReveal'
import { getPreviewRoute, PREVIEW_ROUTES } from './previewRoutes'

// A separate route subtree: participant storage and App bootstrap never mount here.
export function PreviewApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { flow, start, confirm, rolling, reducedMotion, needsOrientation } =
    useDepartureReveal(departurePreview)
  const canonical = getPreviewRoute(flow)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('main h1[tabindex]')
        ?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, needsOrientation])
  if (location.pathname !== canonical)
    return <Navigate to={canonical} replace />
  return (
    <main
      tabIndex={-1}
      className="mx-auto flex min-h-svh w-full max-w-[960px] flex-col items-start bg-canvas px-page py-4 text-foreground"
    >
      {needsOrientation ? (
        <OrientationPrompt />
      ) : (
        flow.screen === 'reveal' && (
          <DepartureReveal
            key={flow.runId}
            result={departurePreview}
            phase={reducedMotion ? 'ready' : flow.phase}
            rolling={rolling}
            reducedMotion={reducedMotion}
            onConfirm={() => {
              confirm()
              navigate(PREVIEW_ROUTES.issuer, { replace: true })
            }}
          />
        )
      )}
      {flow.screen === 'issuer' && (
        <TicketIssuer
          result={departurePreview}
          phase={flow.phase}
          reducedMotion={reducedMotion}
          printDurationMs={PRINT_DURATION}
          continueLabel="다시 보기"
          onContinue={() => {
            start()
            navigate(PREVIEW_ROUTES.departure, { replace: true })
          }}
        />
      )}
    </main>
  )
}
