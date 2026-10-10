import { startTransition, useEffect, useRef, useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { DepartureReveal } from './components/DepartureReveal'
import { TicketIssuer } from './components/TicketIssuer'
import { OrientationPrompt } from './components/OrientationPrompt'
import { LandingScreen } from './components/screens/LandingScreen'
import { EmailScreen } from './components/screens/EmailScreen'
import { NicknameScreen } from './components/screens/NicknameScreen'
import { TicketScreen } from './components/screens/TicketScreen'
import { EnlargedTicketModal } from './components/EnlargedTicketModal'
import { ReissueConfirmModal } from './components/ReissueConfirmModal'
import { primaryButtonClass } from './components/screens/InputScreen'
import type {
  InputScreenError,
  InputScreenStatus,
} from './components/screens/InputScreen'
import { getDestination } from './data/destinations'
import { PRINT_DURATION } from './hooks/departureFlow'
import { useDepartureReveal } from './hooks/useDepartureReveal'
import { reissueDisplayState } from './hooks/ticketOperationState'
import type { ReissueActivity } from './hooks/ticketOperationState'
import {
  guardedTicketRoute,
  restoredTicketRoute,
  ticketIdFromResultPath,
  ticketMatchesResultRoute,
  ticketResultPath,
  TICKET_ROUTES,
} from './routes/ticketRoutes'
import { TicketServiceError } from './services/ticketServiceError'
import {
  createTicketRuntime,
  type TicketRuntime,
} from './services/ticketService'
import { saveTicketImage } from './services/saveTicketImage'
import type { DemoTicket } from './types/ticket'

const defaultRuntime = createTicketRuntime()
function storedEmail(sessionKey: string) {
  try {
    return sessionStorage.getItem(sessionKey) ?? ''
  } catch {
    return ''
  }
}
function inputError(error: unknown): InputScreenError {
  const kind = error instanceof TicketServiceError ? error.kind : 'connection'
  return {
    kind:
      kind === 'not-found'
        ? 'not-found'
        : kind === 'uncertain'
          ? 'uncertain'
          : 'connection',
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
  }
}
function IssuingFlow({
  ticket,
  onTicket,
}: {
  ticket: DemoTicket
  onTicket: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    flow,
    confirm,
    reducedMotion,
    rolling,
    needsOrientation,
    userRowIndex,
    setRowCapacity,
  } = useDepartureReveal(ticket)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('main h1[tabindex]')
        ?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [needsOrientation])
  if (flow.screen === 'idle') return null
  const issuer = location.pathname === '/issuer'
  if (issuer && flow.screen !== 'issuer')
    return <Navigate to="/departure" replace />
  if (!issuer && flow.screen === 'issuer')
    return <Navigate to="/issuer" replace />
  return (
    <section className="w-full min-w-0">
      {needsOrientation ? (
        <OrientationPrompt />
      ) : flow.screen === 'reveal' ? (
        <DepartureReveal
          result={ticket}
          phase={reducedMotion ? 'ready' : flow.phase}
          userRowIndex={userRowIndex}
          onRowCapacity={setRowCapacity}
          rolling={rolling}
          reducedMotion={reducedMotion}
          onConfirm={() => {
            confirm()
            navigate('/issuer', { replace: true })
          }}
        />
      ) : (
        <TicketIssuer
          result={ticket}
          phase={flow.phase}
          reducedMotion={reducedMotion}
          printDurationMs={PRINT_DURATION}
          onContinue={onTicket}
        />
      )}
    </section>
  )
}
function App({ runtime = defaultRuntime }: { runtime?: TicketRuntime }) {
  const { service, sessionKey, mode } = runtime
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => storedEmail(sessionKey))
  const requestedResultPath = useRef(
    ticketIdFromResultPath(location.pathname) !== null ? location.pathname : '',
  )
  const [verified, setVerified] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [ticket, setTicket] = useState<DemoTicket | null>(null)
  const [booting, setBooting] = useState(() => Boolean(storedEmail(sessionKey)))
  const [status, setStatus] = useState<InputScreenStatus>('idle')
  const [error, setError] = useState<InputScreenError>()
  const busy = useRef(false)
  const operation = useRef<string | null>(null)
  const uncertain = useRef(false)
  const [enlarge, setEnlarge] = useState(false)
  const [reissueOpen, setReissueOpen] = useState(false)
  const [reissueStatus, setReissueStatus] =
    useState<ReissueActivity>('available')
  const [reissueError, setReissueError] = useState<string>()
  const ticketRef = useRef<HTMLDivElement>(null)
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle')
  const saving = useRef(false)
  const saveRequest = useRef(0)
  const [companions, setCompanions] = useState<{
    status: 'loading' | 'ready' | 'error'
    count?: number
  }>({ status: 'loading' })
  const [countAttempt, setCountAttempt] = useState(0)
  useEffect(() => {
    if (booting) return
    const frame = requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>('main h1[tabindex]') ??
        document.querySelector<HTMLElement>('main')
      target?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, booting])
  useEffect(() => {
    // Only an initial saved session enters booting. Route navigation must never
    // restore over an explicit issue/reissue or restart its reveal/print flow.
    if (!booting) return
    const saved = storedEmail(sessionKey)
    if (!saved) return
    let active = true
    service
      .restore(saved)
      .then((result) => {
        if (!active) return
        setVerified(saved)
        setTicket(result)
        setBooting(false)
        navigate(
          restoredTicketRoute(requestedResultPath.current, result?.id ?? null),
          { replace: true },
        )
        requestedResultPath.current = ''
      })
      .catch((err) => {
        if (active) {
          setBooting(false)
          setError(inputError(err))
          navigate('/email', { replace: true })
        }
      })
    return () => {
      active = false
    }
  }, [booting, navigate, service, sessionKey])
  useEffect(() => {
    if (!ticket) return
    let active = true
    service
      .count(ticket.destinationId)
      .then((count) => {
        if (active) setCompanions({ status: 'ready', count })
      })
      .catch(() => {
        if (active) setCompanions({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [ticket, countAttempt, service])
  async function checkEmail() {
    if (busy.current) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError({ kind: 'field', message: '이메일 형식을 확인해주세요.' })
      return
    }
    busy.current = true
    setStatus('loading')
    setError(undefined)
    try {
      const normalized = email.trim().toLowerCase()
      const checked = await service.checkEmail(normalized)
      setStatus('checking-result')
      const result = checked.existing ? await service.restore(normalized) : null
      setVerified(normalized)
      try {
        sessionStorage.setItem(sessionKey, normalized)
      } catch {
        /* The current tab can continue without session persistence. */
      }
      setTicket(result)
      setReissueStatus('available')
      setReissueError(undefined)
      setSaveStatus('idle')
      setCompanions({ status: 'loading' })
      setEnlarge(false)
      setReissueOpen(false)
      saveRequest.current += 1
      saving.current = false
      if (normalized !== verified) setNickname('')
      operation.current = null
      uncertain.current = false
      navigate(
        restoredTicketRoute(requestedResultPath.current, result?.id ?? null),
      )
      requestedResultPath.current = ''
    } catch (err) {
      setError(inputError(err))
    } finally {
      busy.current = false
      setStatus('idle')
    }
  }
  async function issue() {
    if (busy.current || !verified) return
    if (!nickname.trim()) {
      setError({
        kind: 'field',
        message: '탑승권에 표시할 닉네임을 입력해주세요.',
      })
      return
    }
    busy.current = true
    setError(undefined)
    setStatus(uncertain.current ? 'checking-result' : 'loading')
    operation.current ??= crypto.randomUUID()
    try {
      const recovered = uncertain.current
        ? await service.restore(verified)
        : null
      const result =
        recovered ??
        (await service.issue(verified, nickname.trim(), operation.current))
      // BrowserRouter defers its location update. Commit the saved result in
      // the same transition so the nickname guard cannot restore it first.
      startTransition(() => {
        setTicket(result)
        setCompanions({ status: 'loading' })
        navigate('/departure')
      })
      uncertain.current = false
    } catch (err) {
      if (err instanceof TicketServiceError && err.kind === 'uncertain') {
        uncertain.current = true
        setStatus('checking-result')
        try {
          const result = await service.restore(verified)
          if (result) {
            startTransition(() => {
              setTicket(result)
              setCompanions({ status: 'loading' })
              navigate('/departure')
            })
            uncertain.current = false
            return
          }
        } catch {
          /* Keep the operation id for a result lookup before retry. */
        }
      }
      setError(inputError(err))
    } finally {
      busy.current = false
      setStatus('idle')
    }
  }
  async function reissue() {
    if (busy.current || !verified || !ticket) return
    busy.current = true
    setReissueStatus(uncertain.current ? 'checking-result' : 'loading')
    setReissueError(undefined)
    operation.current ??= crypto.randomUUID()
    try {
      const recovered = uncertain.current
        ? await service.restore(verified)
        : null
      const result = recovered?.reissueUsed
        ? recovered
        : await service.reissue(verified, operation.current)
      setTicket(result)
      setReissueOpen(false)
      setReissueStatus('available')
      setSaveStatus('idle')
      setCompanions({ status: 'loading' })
      uncertain.current = false
      operation.current = null
      navigate('/departure')
    } catch (err) {
      if (err instanceof TicketServiceError && err.kind === 'uncertain') {
        uncertain.current = true
        setReissueStatus('checking-result')
        try {
          const result = await service.restore(verified)
          if (result?.reissueUsed) {
            setTicket(result)
            setReissueOpen(false)
            setReissueStatus('available')
            uncertain.current = false
            operation.current = null
            navigate('/departure')
            return
          }
        } catch {
          /* Retry starts with a result lookup. */
        }
      }
      setReissueStatus(
        err instanceof TicketServiceError && err.kind === 'no-alternative'
          ? 'unavailable'
          : 'error',
      )
      setReissueError(
        '재발급 결과를 확인하지 못했어요. 현재 탑승권은 유지돼요. 다시 확인해주세요.',
      )
    } finally {
      busy.current = false
    }
  }
  async function save() {
    if (saving.current || !ticketRef.current || !ticket) return
    saving.current = true
    const request = ++saveRequest.current
    setSaveStatus('saving')
    try {
      await saveTicketImage(ticketRef.current, ticket.id)
      if (request === saveRequest.current) setSaveStatus('success')
    } catch {
      if (request === saveRequest.current) setSaveStatus('error')
    } finally {
      if (request === saveRequest.current) saving.current = false
    }
  }
  const guard = guardedTicketRoute(
    location.pathname,
    verified,
    ticket?.id ?? null,
  )
  const isResultRoute = ticketIdFromResultPath(location.pathname) !== null
  const ticketView = ticket ? (
    <div className="mx-auto w-full max-w-mobile">
      <TicketScreen
        ticket={ticket}
        destination={getDestination(ticket.destinationId)}
        ticketRef={ticketRef}
        saveStatus={saveStatus}
        onSave={() => void save()}
        onEnlarge={() => setEnlarge(true)}
        companionStatus={companions.status}
        companionCount={companions.count}
        onCompanionRetry={() => {
          setCompanions({ status: 'loading' })
          setCountAttempt((n) => n + 1)
        }}
        reissueStatus={reissueDisplayState(ticket, reissueStatus)}
        reissueError={reissueError}
        onReissueRequest={() => {
          operation.current = null
          setReissueOpen(true)
        }}
      />
      <EnlargedTicketModal
        open={enlarge}
        result={ticket}
        onClose={() => setEnlarge(false)}
      />
      <ReissueConfirmModal
        open={reissueOpen}
        currentCountry={ticket.countryLabel ?? ticket.country}
        status={reissueStatus === 'available' ? 'idle' : reissueStatus}
        error={reissueError}
        onClose={() => {
          if (!busy.current) setReissueOpen(false)
        }}
        onConfirm={() => void reissue()}
      />
    </div>
  ) : null
  return (
    <main
      tabIndex={-1}
      className={`mx-auto flex min-h-svh w-full flex-col items-start py-4 text-foreground ${isResultRoute && !booting ? 'max-w-none bg-black px-page' : location.pathname === '/issuer' && !booting ? 'max-w-none bg-canvas px-0' : location.pathname === '/departure' && !booting ? 'max-w-[960px] bg-canvas px-page' : 'max-w-mobile bg-canvas px-4'}`}
    >
      {mode !== 'firebase' && (
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
          onSubmit={() => {}}
          onBack={() => {}}
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
            element={
              <LandingScreen
                onStart={() => {
                  setError(undefined)
                  navigate('/email')
                }}
              />
            }
          />
          <Route
            path="/email"
            element={
              <EmailScreen
                value={email}
                onChange={(value) => {
                  setEmail(value)
                  setError(undefined)
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
                  setNickname(value)
                  setError(undefined)
                }}
                onSubmit={() => void issue()}
                onBack={() => {
                  setError(undefined)
                  navigate('/email')
                }}
                status={status}
                error={error}
              />
            }
          />
          <Route
            path="/departure"
            element={
              ticket ? (
                <IssuingFlow
                  key={`${ticket.id}:${ticket.revision}`}
                  ticket={ticket}
                  onTicket={() =>
                    navigate(ticketResultPath(ticket.id), { replace: true })
                  }
                />
              ) : null
            }
          />
          <Route
            path="/issuer"
            element={
              ticket ? (
                <IssuingFlow
                  key={`${ticket.id}:${ticket.revision}`}
                  ticket={ticket}
                  onTicket={() =>
                    navigate(ticketResultPath(ticket.id), { replace: true })
                  }
                />
              ) : null
            }
          />
          <Route
            path={TICKET_ROUTES.result}
            element={
              ticketMatchesResultRoute(
                location.pathname,
                ticket?.id ?? null,
              ) ? (
                ticketView
              ) : (
                <section className="w-full py-8">
                  <h1 tabIndex={-1} className="text-title font-semibold">
                    탑승권을 찾을 수 없어요
                  </h1>
                  <p className="mt-3 text-body text-muted">
                    현재 확인한 이메일의 탑승권과 주소가 일치하지 않아요.
                    탑승권을 발급한 이메일로 다시 확인해주세요.
                  </p>
                  <button
                    type="button"
                    className={`${primaryButtonClass} mt-6`}
                    onClick={() => {
                      requestedResultPath.current = location.pathname
                      navigate('/email')
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
  )
}
export default App
