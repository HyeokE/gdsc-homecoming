import type { DepartureResult } from './DepartureReveal'
import '../styles/boarding-pass.css'
export interface BoardingPassProps {
  result: DepartureResult
  exportMode?: boolean
  displayMode?: 'compact' | 'expanded'
}
/** The only visual source for issuer, viewing and image export. Contains no email. */
export function BoardingPass({
  result,
  exportMode = false,
  displayMode = 'compact',
}: BoardingPassProps) {
  return (
    <article
      className={`boarding-pass boarding-pass--${displayMode} bg-ticket text-ticket-ink ${exportMode ? '' : 'boarding-pass--paper'}`}
      aria-label={`${result.passengerName}님의 ${result.city}행 기념 탑승권`}
      data-ticket-export
    >
      <div className="boarding-pass__main">
        <header className="boarding-pass__header">
          <strong>GDG AIR</strong>
          <span>BOARDING PASS</span>
        </header>
        <div className="boarding-pass__route">
          <div>
            <strong>ICN</strong>
            <span>SEOUL / INCHEON</span>
          </div>
          <span className="boarding-pass__arrow" aria-hidden="true">
            →
          </span>
          <div>
            <strong>{result.airportCode}</strong>
            <span>{result.city}</span>
          </div>
        </div>
        <div className="boarding-pass__passenger">
          <span className="boarding-pass__label">PASSENGER</span>
          <strong>{result.passengerName}</strong>
        </div>
        <dl className="boarding-pass__fields">
          <div>
            <dt>FLIGHT</dt>
            <dd>GDG1121</dd>
          </div>
          <div>
            <dt>DATE</dt>
            <dd>21 NOV 2026</dd>
          </div>
          <div>
            <dt>TIME</dt>
            <dd>15:00</dd>
          </div>
        </dl>
        <footer>GDG HOME COMING · 성수 그린힐드</footer>
      </div>
      <aside className="boarding-pass__stub">
        <span className="boarding-pass__label">GDG AIR</span>
        <strong className="boarding-pass__stub-code">
          {result.airportCode}
        </strong>
        <div className="boarding-pass__stub-gate">
          <span className="boarding-pass__label">GATE</span>
          <strong className="boarding-pass__gate">{result.gate}</strong>
        </div>
        <span className="boarding-pass__stub-note">
          HOMECOMING
          <br />
          기념 탑승권
        </span>
      </aside>
      <div className="boarding-pass__stripe" aria-hidden="true">
        <span className="bg-brand-blue" />
        <span className="bg-brand-red" />
        <span className="bg-brand-yellow" />
        <span className="bg-brand-green" />
      </div>
    </article>
  )
}
