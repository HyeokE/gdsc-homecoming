import { MotionConfig, motion } from 'motion/react'
import type { DepartureResult } from './DepartureReveal'
import { BoardingPass } from './BoardingPass'
import { primaryButtonClass } from './screens/InputScreen'
import '../styles/ticket-issuer.css'

export type TicketIssuerPhase = 'printing' | 'complete'

interface TicketIssuerProps {
  result: DepartureResult
  phase: TicketIssuerPhase
  printDurationMs: number
  reducedMotion?: boolean
  onContinue?: () => void
  continueLabel?: string
}

export function TicketIssuer({
  result,
  phase,
  printDurationMs,
  reducedMotion = false,
  onContinue,
  continueLabel = '탑승권 보기',
}: TicketIssuerProps) {
  const complete = phase === 'complete'

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <section
        className="ticket-issuer w-full min-w-0"
        data-phase={phase}
        data-reduced-motion={reducedMotion}
        aria-labelledby="issuer-title"
      >
        <div className="issuer-output">
          <header className="issuer-machine">
            <div className="issuer-machine__header">
              <h1 id="issuer-title" tabIndex={-1}>
                GDG AIR
              </h1>
              <p>{complete ? '출력 완료' : '탑승권 출력 중'}</p>
            </div>
            <div className="issuer-machine__slot" aria-hidden="true" />
          </header>
          <div className="issuer-paper-window">
            <motion.div
              className="issuer-paper"
              initial={
                reducedMotion || complete ? false : { x: 'calc(-100% - 8px)' }
              }
              animate={{ x: '0%' }}
              transition={{
                duration: reducedMotion ? 0 : printDurationMs / 1000,
                ease: [0.16, 0.12, 0.76, 1],
              }}
              aria-label={
                complete ? '출력된 기념 탑승권' : '출력 중인 기념 탑승권'
              }
            >
              <BoardingPass result={result} />
            </motion.div>
          </div>
        </div>
        <div className="issuer-footer">
          <div className="issuer-caption">
            <p>{complete ? '탑승권이 나왔어요' : '잠시만 기다려주세요'}</p>
            <span>
              {complete
                ? '홈커밍에서 만나요.'
                : '기념 탑승권을 출력하고 있어요.'}
            </span>
          </div>
          {complete && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className={`${primaryButtonClass} issuer-continue`}
            >
              {continueLabel}
            </button>
          )}
        </div>
        <p role="status" className="sr-only" aria-atomic="true">
          {complete
            ? `${result.passengerName}님의 ${result.countryLabel ?? result.country}행 기념 탑승권 출력이 완료됐습니다.`
            : '탑승권을 출력하고 있습니다.'}
        </p>
      </section>
    </MotionConfig>
  )
}

export default TicketIssuer
