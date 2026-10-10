import { useState, type CSSProperties } from 'react'
import { MotionConfig } from 'motion/react'
import type { DepartureResult } from './DepartureReveal'
import { PREPARE_DURATION, type IssuerPhase } from '../hooks/departureFlow'
import { BoardingPass } from './BoardingPass'
import { TicketPresentation } from './TicketPresentation'
import '../styles/ticket-issuer.css'

export type TicketIssuerPhase = IssuerPhase

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
  continueLabel = '탑승권 받기',
}: TicketIssuerProps) {
  const [presenting, setPresenting] = useState(false)
  const complete = phase === 'complete'
  const preparing = phase === 'preparing'

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <section
        className="ticket-issuer w-full min-w-0"
        data-phase={phase}
        data-reduced-motion={reducedMotion}
        aria-labelledby="issuer-title"
      >
        <h1 id="issuer-title" tabIndex={-1} className="sr-only">
          탑승권 발권
        </h1>
        <div className="issuer-scene">
          <div className="issuer-machine" aria-hidden="true">
            <span className="issuer-machine__screw issuer-machine__screw--left" />
            <span className="issuer-machine__screw issuer-machine__screw--right" />
            <span className="issuer-machine__light" />
            <div className="issuer-slot">
              <span className="issuer-slot__roller" />
            </div>
          </div>
          <div className="issuer-paper-window" aria-hidden={preparing}>
            {!complete && (
              <div className="issuer-loading" aria-hidden="true">
                <div className="issuer-loading__graphic">
                  <span className="issuer-loading__slot" />
                  <div className="issuer-loading__paper-window">
                    <div
                      className="issuer-loading__ticket"
                      style={{ animationDuration: `${PREPARE_DURATION}ms` }}
                    >
                      <svg
                        className="issuer-loading__plane"
                        viewBox="0 0 24 24"
                        focusable="false"
                      >
                        <path
                          d="m21 12-7-3V3a2 2 0 0 0-4 0v6l-7 3v3l7-2v5l-3 2v2l5-1 5 1v-2l-3-2v-5l7 2Z"
                          fill="currentColor"
                        />
                      </svg>
                      <span className="issuer-loading__ticket-lines" />
                      <span className="issuer-loading__ticket-stub" />
                      <span className="issuer-loading__ticket-stripe">
                        <i className="bg-brand-blue" />
                        <i className="bg-brand-red" />
                        <i className="bg-brand-yellow" />
                        <i className="bg-brand-green" />
                      </span>
                    </div>
                  </div>
                </div>
                <span>발권 중입니다</span>
              </div>
            )}
            <div
              className="issuer-paper"
              style={
                {
                  '--issuer-feed-duration': `${printDurationMs}ms`,
                } as CSSProperties
              }
            >
              <div className="issuer-paper__sheet">
                <BoardingPass result={result} />
                <span className="issuer-paper__lighting" aria-hidden="true" />
                {complete && (
                  <button
                    type="button"
                    onClick={() => setPresenting(true)}
                    className="issuer-paper__open"
                    aria-label="탑승권 받기"
                    aria-haspopup="dialog"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <p role="status" className="sr-only" aria-atomic="true">
          {complete
            ? `${result.passengerName}님의 ${result.countryLabel ?? result.country}행 탑승권이 나왔습니다. 티켓을 눌러 확인하세요.`
            : preparing
              ? '발권 중입니다.'
              : '탑승권을 출력하고 있습니다.'}
        </p>
      </section>
      <TicketPresentation
        open={presenting}
        result={result}
        ticketId={
          'id' in result && typeof result.id === 'string'
            ? result.id
            : undefined
        }
        onClose={() => setPresenting(false)}
        onContinue={onContinue}
        continueLabel={continueLabel}
        reducedMotion={reducedMotion}
      />
    </MotionConfig>
  )
}

export default TicketIssuer
