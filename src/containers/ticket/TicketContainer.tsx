import { startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DepartureReveal } from './components/DepartureReveal';
import { TicketIssuer } from './components/TicketIssuer';
import { OrientationPrompt } from './components/OrientationPrompt';
import { EmailScreen } from './components/CheckInForm';
import { NicknameScreen } from './components/CheckInForm';
import { TicketScreen } from './components/screens/TicketScreen';
import { EnlargedTicketModal } from './components/EnlargedTicketModal';
import { ReissueConfirmModal } from './components/ReissueConfirmModal';
import { TestAccountChip } from './components/TestAccountChip/TestAccountChip';
import { primaryButtonClass } from '@/components/common/buttonClasses';
import type { InputScreenError, InputScreenStatus } from './components/CheckInForm';
import { getDestination } from './constants/destinations';
import { PRINT_DURATION } from './utils/departureFlow';
import { useDepartureReveal } from './hooks/useDepartureReveal';
import { reissueDisplayState } from './utils/ticketOperationState';
import { runTicketOperation } from './utils/runTicketOperation';
import type { ReissueActivity } from './utils/ticketOperationState';
import {
  guardedTicketRoute,
  restoredTicketRoute,
  ticketIdFromResultPath,
  ticketMatchesResultRoute,
  ticketResultPath,
  TICKET_ROUTES,
} from './routes/ticketRoutes';
import { TicketServiceError } from './services';
import { createTicketRuntime, getServiceForEmail, isTestAccount, type TicketRuntime } from './services';
import { useTicketImageSave } from './hooks/useTicketImageSave';
import type { DemoTicket } from './types/ticket';

const defaultRuntime = createTicketRuntime();
function storedEmail(sessionKey: string) {
  try {
    return sessionStorage.getItem(sessionKey) ?? '';
  } catch {
    return '';
  }
}
function inputError(error: unknown): InputScreenError {
  const kind = error instanceof TicketServiceError ? error.kind : 'connection';
  return {
    kind: kind === 'not-found' ? 'not-found' : kind === 'uncertain' ? 'uncertain' : 'connection',
    message:
      kind === 'not-found'
        ? '신청 내역을 찾을 수 없어요. 이메일을 다시 확인해주세요.'
        : kind === 'uncertain'
          ? '발급 결과를 아직 확인하지 못했어요. 다시 시도하면 저장된 결과부터 확인해요.'
          : kind === 'not-configured'
            ? '발권 서비스가 아직 준비되지 않았어요. 행사 운영진에게 문의해주세요.'
            : kind === 'invalid-input'
              ? '입력한 내용을 확인하고 다시 시도해주세요.'
              : kind === 'capacity'
                ? '현재 발급 가능한 자리가 없어요. 잠시 후 다시 확인해주세요.'
                : '연결하지 못했어요. 입력한 내용은 유지돼요. 다시 시도해주세요.',
  };
}
function IssuingFlow({
  ticket,
  onTicket,
  isReplay,
  onReplayExit,
}: {
  ticket: DemoTicket;
  onTicket: (boardingTime?: string) => void;
  isReplay: boolean;
  onReplayExit: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { flow, displayResult, confirm, reducedMotion, rolling, needsOrientation, userRowIndex, setRowCapacity } =
    useDepartureReveal(ticket);
  const presentedResult = isReplay ? { ...displayResult, boardingTime: ticket.boardingTime } : displayResult;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('main h1[tabindex]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [needsOrientation]);
  if (flow.screen === 'idle') {
    return null;
  }
  const issuer = location.pathname === '/issuer';
  if (issuer && flow.screen !== 'issuer') {
    return <Navigate to="/departure" replace />;
  }
  if (!issuer && flow.screen === 'issuer') {
    return <Navigate to="/issuer" replace />;
  }
  return (
    <section className="relative w-full min-w-0">
      {isReplay && (
        <button
          type="button"
          onClick={onReplayExit}
          className="absolute top-0 right-4 z-10 min-h-control px-3 text-caption underline underline-offset-4"
        >
          탑승권으로 돌아가기
        </button>
      )}
      {needsOrientation ? (
        <OrientationPrompt />
      ) : flow.screen === 'reveal' ? (
        <DepartureReveal
          result={presentedResult}
          phase={reducedMotion ? 'ready' : flow.phase}
          userRowIndex={userRowIndex}
          onRowCapacity={setRowCapacity}
          rolling={rolling}
          reducedMotion={reducedMotion}
          onConfirm={() => {
            confirm();
            navigate('/issuer', { replace: true });
          }}
        />
      ) : (
        <TicketIssuer
          result={presentedResult}
          phase={flow.phase}
          reducedMotion={reducedMotion}
          printDurationMs={PRINT_DURATION}
          onContinue={() => onTicket(displayResult.boardingTime)}
        />
      )}
    </section>
  );
}
function TicketContainer({
  runtime = defaultRuntime,
  landing,
}: {
  runtime?: TicketRuntime;
  landing: (onStart: () => void) => ReactNode;
}) {
  const { sessionKey, mode } = runtime;
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() => storedEmail(sessionKey));
  const requestedResultPath = useRef(ticketIdFromResultPath(location.pathname) !== null ? location.pathname : '');
  const [verified, setVerified] = useState<string | null>(null);
  const service = getServiceForEmail(runtime, verified);
  const testAccount = isTestAccount(verified);
  const [isReplaying, setIsReplaying] = useState(false);
  const [nickname, setNickname] = useState('');
  const [ticket, setTicket] = useState<DemoTicket | null>(null);
  const [booting, setBooting] = useState(() => Boolean(storedEmail(sessionKey)));
  const [status, setStatus] = useState<InputScreenStatus>('idle');
  const [error, setError] = useState<InputScreenError>();
  const busy = useRef(false);
  const operation = useRef<string | null>(null);
  const uncertain = useRef(false);
  const [enlarge, setEnlarge] = useState(false);
  const [reissueOpen, setReissueOpen] = useState(false);
  const [reissueStatus, setReissueStatus] = useState<ReissueActivity>('available');
  const [reissueError, setReissueError] = useState<string>();
  const { captureRef: ticketRef, status: saveStatus, save, reset: resetSave } = useTicketImageSave(ticket?.id ?? null);
  const [companions, setCompanions] = useState<{
    status: 'loading' | 'ready' | 'error';
    count?: number;
  }>({ status: 'loading' });
  const [countAttempt, setCountAttempt] = useState(0);
  useEffect(() => {
    if (booting) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>('main h1[tabindex]') ?? document.querySelector<HTMLElement>('main');
      target?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, booting]);
  useEffect(() => {
    // Only an initial saved session enters booting. Route navigation must never
    // restore over an explicit issue/reissue or restart its reveal/print flow.
    if (!booting) {
      return;
    }
    const saved = storedEmail(sessionKey);
    if (!saved) {
      return;
    }
    let active = true;
    getServiceForEmail(runtime, saved)
      .restore(saved)
      .then((result) => {
        if (!active) {
          return;
        }
        setVerified(saved);
        setTicket(result);
        setBooting(false);
        navigate(restoredTicketRoute(requestedResultPath.current, result?.id ?? null, !isTestAccount(saved)), {
          replace: true,
        });
        requestedResultPath.current = '';
      })
      .catch((err) => {
        if (active) {
          setBooting(false);
          setError(inputError(err));
          navigate('/email', { replace: true });
        }
      });
    return () => {
      active = false;
    };
  }, [booting, navigate, runtime, sessionKey]);
  useEffect(() => {
    if (!ticket) {
      return;
    }
    let active = true;
    service
      .count(ticket.destinationId)
      .then((count) => {
        if (active) {
          setCompanions({ status: 'ready', count });
        }
      })
      .catch(() => {
        if (active) {
          setCompanions({ status: 'error' });
        }
      });
    return () => {
      active = false;
    };
  }, [ticket, countAttempt, service]);
  async function checkEmail() {
    if (busy.current) {
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError({ kind: 'field', message: '이메일 형식을 확인해주세요.' });
      return;
    }
    busy.current = true;
    setStatus('loading');
    setError(undefined);
    try {
      const normalized = email.trim().toLowerCase();
      const selectedService = getServiceForEmail(runtime, normalized);
      const checked = await selectedService.checkEmail(normalized);
      setStatus('checking-result');
      const result = checked.existing ? await selectedService.restore(normalized) : null;
      setVerified(normalized);
      try {
        sessionStorage.setItem(sessionKey, normalized);
      } catch {
        /* The current tab can continue without session persistence. */
      }
      setTicket(result);
      setIsReplaying(false);
      setReissueStatus('available');
      setReissueError(undefined);
      resetSave();
      setCompanions({ status: 'loading' });
      setEnlarge(false);
      setReissueOpen(false);
      if (normalized !== verified) {
        setNickname('');
      }
      operation.current = null;
      uncertain.current = false;
      navigate(restoredTicketRoute(requestedResultPath.current, result?.id ?? null, !isTestAccount(normalized)));
      requestedResultPath.current = '';
    } catch (err) {
      setError(inputError(err));
    } finally {
      busy.current = false;
      setStatus('idle');
    }
  }
  function revealTicket(result: DemoTicket) {
    setIsReplaying(false);
    // Keep the ticket and deferred router update in the same transition.
    startTransition(() => {
      setTicket(result);
      setCompanions({ status: 'loading' });
      navigate(TICKET_ROUTES.departure);
    });
    setReissueOpen(false);
    setReissueStatus('available');
    setReissueError(undefined);
    resetSave();
    uncertain.current = false;
    operation.current = null;
  }
  async function issue() {
    if (busy.current || !verified) {
      return;
    }
    if (!nickname.trim()) {
      setError({
        kind: 'field',
        message: '탑승권에 표시할 닉네임을 입력해주세요.',
      });
      return;
    }
    busy.current = true;
    setError(undefined);
    setStatus(uncertain.current ? 'checking-result' : 'loading');
    const operationId = (operation.current ??= crypto.randomUUID());
    try {
      const result = await runTicketOperation({
        retrying: uncertain.current,
        restore: () => service.restore(verified),
        perform: () => service.issue(verified, nickname.trim(), operationId),
        onUncertain: () => {
          uncertain.current = true;
          setStatus('checking-result');
        },
      });
      revealTicket(result);
    } catch (err) {
      setError(inputError(err));
    } finally {
      busy.current = false;
      setStatus('idle');
    }
  }
  async function reissue() {
    if (busy.current || !verified || !ticket) {
      return;
    }
    busy.current = true;
    setReissueStatus(uncertain.current ? 'checking-result' : 'loading');
    setReissueError(undefined);
    const operationId = (operation.current ??= crypto.randomUUID());
    try {
      const result = await runTicketOperation({
        retrying: uncertain.current,
        restore: async () => {
          const restored = await service.restore(verified);
          return restored && restored.revision > ticket.revision ? restored : null;
        },
        perform: () => service.reissue(verified, operationId),
        onUncertain: () => {
          uncertain.current = true;
          setReissueStatus('checking-result');
        },
      });
      revealTicket(result);
    } catch (err) {
      setReissueStatus(err instanceof TicketServiceError && err.kind === 'no-alternative' ? 'unavailable' : 'error');
      setReissueError('재발급 결과를 확인하지 못했어요. 현재 탑승권은 유지돼요. 다시 확인해주세요.');
    } finally {
      busy.current = false;
    }
  }
  const isResultRoute = ticketIdFromResultPath(location.pathname) !== null;
  const guard =
    testAccount && isResultRoute
      ? restoredTicketRoute(location.pathname, ticket?.id ?? null, false)
      : guardedTicketRoute(location.pathname, verified, ticket?.id ?? null);
  const issuingView = ticket ? (
    <IssuingFlow
      key={`${ticket.id}:${ticket.revision}`}
      ticket={ticket}
      isReplay={isReplaying}
      onReplayExit={() => {
        setIsReplaying(false);
        navigate(ticketResultPath(ticket.id), { replace: true });
      }}
      onTicket={(boardingTime) => {
        if (!isReplaying) {
          setTicket({ ...ticket, boardingTime });
        }
        setIsReplaying(false);
        navigate(ticketResultPath(ticket.id), { replace: true });
      }}
    />
  ) : null;
  const ticketView = ticket ? (
    <div className="mx-auto w-full max-w-mobile">
      <TicketScreen
        ticket={ticket}
        destination={getDestination(ticket.destinationId)}
        ticketRef={ticketRef}
        saveStatus={saveStatus}
        onSave={() => void save()}
        onEnlarge={() => setEnlarge(true)}
        isTestAccount={testAccount}
        onReplay={() => {
          setIsReplaying(true);
          navigate(TICKET_ROUTES.departure);
        }}
        companionStatus={companions.status}
        companionCount={companions.count}
        onCompanionRetry={() => {
          setCompanions({ status: 'loading' });
          setCountAttempt((n) => n + 1);
        }}
        reissueStatus={reissueDisplayState(ticket, reissueStatus)}
        reissueError={reissueError}
        onReissueRequest={() => {
          operation.current = null;
          setReissueOpen(true);
        }}
      />
      <EnlargedTicketModal open={enlarge} result={ticket} onClose={() => setEnlarge(false)} />
      <ReissueConfirmModal
        open={reissueOpen}
        currentCountry={ticket.countryLabel ?? ticket.country}
        isTestAccount={testAccount}
        status={reissueStatus === 'available' ? 'idle' : reissueStatus}
        error={reissueError}
        onClose={() => {
          if (!busy.current) {
            setReissueOpen(false);
          }
        }}
        onConfirm={() => void reissue()}
      />
    </div>
  ) : null;
  return (
    <main
      tabIndex={-1}
      className={`mx-auto flex min-h-svh w-full flex-col items-start py-4 text-foreground ${isResultRoute && !booting ? 'ticket-result-page max-w-none px-page' : location.pathname === '/issuer' && !booting ? 'max-w-none bg-canvas px-0' : location.pathname === '/departure' && !booting ? 'max-w-[960px] bg-canvas px-page' : 'max-w-mobile bg-canvas px-4'}`}
    >
      {testAccount && (
        <TestAccountChip
          disabled={status !== 'idle' || reissueStatus === 'loading' || reissueStatus === 'checking-result'}
          onReset={() => {
            if (busy.current) {
              return;
            }
            runtime.testService.reset();
            try {
              sessionStorage.removeItem(sessionKey);
            } catch {
              /* Local test ticket has already been cleared. */
            }
            setTicket(null);
            setVerified(null);
            setNickname('');
            setEmail('test@gmail.com');
            setIsReplaying(false);
            setReissueOpen(false);
            setEnlarge(false);
            setReissueStatus('available');
            setReissueError(undefined);
            setError(undefined);
            resetSave();
            operation.current = null;
            uncertain.current = false;
            requestedResultPath.current = '';
            navigate(TICKET_ROUTES.email, { replace: true });
          }}
        />
      )}
      {!testAccount && mode !== 'firebase' && (
        <p className="mb-4 text-caption text-muted">
          {mode === 'demo'
            ? '데모 · 예시 이메일의 탑승권만 이 브라우저에 저장돼요. 실제 행사 발권은 아닙니다.'
            : '테스트 · Firebase 에뮬레이터에 저장돼요. 실제 행사 발권은 아닙니다.'}
        </p>
      )}
      {booting ? (
        <EmailScreen
          value={email}
          onChange={setEmail}
          onSubmit={() => undefined}
          onBack={() => undefined}
          status="checking-result"
          disabled
          demoEmail={mode === 'demo' ? 'demo@gdg.example' : undefined}
        />
      ) : guard !== location.pathname ? (
        <Navigate to={guard} replace />
      ) : (
        <Routes>
          <Route
            path="/"
            element={landing(() => {
              setError(undefined);
              navigate('/email');
            })}
          />
          <Route
            path="/email"
            element={
              <EmailScreen
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setError(undefined);
                }}
                onSubmit={() => void checkEmail()}
                onBack={() => navigate('/')}
                status={status}
                error={error}
                demoEmail={mode === 'demo' ? 'demo@gdg.example' : undefined}
              />
            }
          />
          <Route
            path="/nickname"
            element={
              <NicknameScreen
                value={nickname}
                onChange={(value) => {
                  setNickname(value);
                  setError(undefined);
                }}
                onSubmit={() => void issue()}
                onBack={() => {
                  setError(undefined);
                  navigate('/email');
                }}
                status={status}
                error={error}
              />
            }
          />
          <Route path={TICKET_ROUTES.departure} element={issuingView} />
          <Route path={TICKET_ROUTES.issuer} element={issuingView} />
          <Route
            path={TICKET_ROUTES.result}
            element={
              ticketMatchesResultRoute(location.pathname, ticket?.id ?? null) ? (
                ticketView
              ) : (
                <section className="w-full py-8">
                  <h1 tabIndex={-1} className="text-title font-semibold">
                    탑승권을 찾을 수 없어요
                  </h1>
                  <p className="mt-3 text-body text-muted">
                    현재 확인한 이메일의 탑승권과 주소가 일치하지 않아요. 탑승권을 발급한 이메일로 다시 확인해주세요.
                  </p>
                  <button
                    type="button"
                    className={`${primaryButtonClass} mt-6`}
                    onClick={() => {
                      requestedResultPath.current = location.pathname;
                      navigate('/email');
                    }}
                  >
                    이메일 다시 확인
                  </button>
                </section>
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </main>
  );
}
export default TicketContainer;
