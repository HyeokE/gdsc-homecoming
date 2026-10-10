import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DepartureReveal } from '../components/DepartureReveal';
import { TicketIssuer } from '../components/TicketIssuer';
import { OrientationPrompt } from '../components/OrientationPrompt';
import { departurePreview } from '../fixtures/departurePreview';
import { PRINT_DURATION } from '../utils/departureFlow';
import { useDepartureReveal } from '../hooks/useDepartureReveal';
import { getPreviewRoute, PREVIEW_ROUTES } from './previewRoutes';
import { PREVIEW_RESULT_PATH } from './previewResultRoute';

// A separate route subtree: participant storage and App bootstrap never mount here.
export function PreviewApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { flow, displayResult, confirm, rolling, reducedMotion, needsOrientation, userRowIndex, setRowCapacity } =
    useDepartureReveal(departurePreview);
  const state: unknown = location.state;
  const replayTime =
    state && typeof state === 'object' && 'replayBoardingTime' in state ? state.replayBoardingTime : undefined;
  const presentedResult =
    typeof replayTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(replayTime)
      ? { ...displayResult, boardingTime: replayTime }
      : displayResult;
  const canonical = getPreviewRoute(flow);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('main h1[tabindex]')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, needsOrientation]);
  if (location.pathname !== canonical) {
    return <Navigate to={canonical} replace state={location.state} />;
  }
  return (
    <main
      tabIndex={-1}
      className={`mx-auto flex min-h-svh w-full flex-col items-start bg-canvas py-4 text-foreground ${flow.screen === 'issuer' ? 'px-0' : 'max-w-[960px] px-page'}`}
    >
      {needsOrientation ? (
        <OrientationPrompt />
      ) : (
        flow.screen === 'reveal' && (
          <DepartureReveal
            key={flow.runId}
            result={presentedResult}
            phase={reducedMotion ? 'ready' : flow.phase}
            userRowIndex={userRowIndex}
            onRowCapacity={setRowCapacity}
            rolling={rolling}
            reducedMotion={reducedMotion}
            onConfirm={() => {
              confirm();
              navigate(PREVIEW_ROUTES.issuer, { replace: true, state: location.state });
            }}
          />
        )
      )}
      {flow.screen === 'issuer' && (
        <TicketIssuer
          result={presentedResult}
          phase={flow.phase}
          reducedMotion={reducedMotion}
          printDurationMs={PRINT_DURATION}
          onContinue={() =>
            navigate(PREVIEW_RESULT_PATH, {
              replace: true,
              state: { boardingTime: presentedResult.boardingTime },
            })
          }
        />
      )}
    </main>
  );
}
