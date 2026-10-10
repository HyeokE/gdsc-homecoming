import type { DepartureResult } from './DepartureReveal'
import '../styles/boarding-pass.css'

export interface BoardingPassProps {
  result: DepartureResult
  exportMode?: boolean
  displayMode?: 'compact' | 'expanded'
}

export function AirlineBrand({
  className = 'boarding-pass__brand',
}: {
  className?: string
}) {
  return (
    <strong className={className}>
      <svg viewBox="0 0 48 32" aria-hidden="true" focusable="false">
        <path d="M19 7 6 16" stroke="#EA4335" />
        <path d="m6 16 13 9" stroke="#4285F4" />
        <path d="m29 7 13 9" stroke="#34A853" />
        <path d="m42 16-13 9" stroke="#FBBC05" />
      </svg>
      GDGoC DJU
    </strong>
  )
}

// Decorative stacked print pattern only; contains no passenger data or QR link.
const barcodePath = Array.from({ length: 10 }, (_, row) => {
  let seed = (row + 1) * 7919
  let path = `M0 ${row * 3}h2v3H0zM4 ${row * 3}h1v3H4z`
  for (let column = 8; column < 152; column += 2) {
    seed = (seed * 16807) % 2147483647
    if (seed % 3 !== 0)
      path += `M${column} ${row * 3}h${seed % 2 ? 1 : 2}v3h-${seed % 2 ? 1 : 2}z`
  }
  return `${path}M155 ${row * 3}h2v3h-2zM159 ${row * 3}h1v3h-1z`
}).join('')

function PrintedBarcode() {
  return (
    <svg
      className="boarding-pass__barcode"
      viewBox="0 0 160 30"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      <path d={barcodePath} fill="currentColor" />
    </svg>
  )
}

function BoardingPassStubContent({
  result,
}: Pick<BoardingPassProps, 'result'>) {
  return (
    <>
      <header className="boarding-pass__header">
        <AirlineBrand />
        <span>BOARDING PASS</span>
      </header>
      <strong className="boarding-pass__stub-name">
        {result.passengerName}
      </strong>
      <dl className="boarding-pass__stub-fields">
        <div>
          <dt>FROM</dt>
          <dd>ICN SEOUL / INCHEON</dd>
        </div>
        <div>
          <dt>TO</dt>
          <dd>
            {result.airportCode} {result.city}
          </dd>
        </div>
        <div>
          <dt>FLIGHT</dt>
          <dd>GDG1121</dd>
        </div>
        <div>
          <dt>DATE</dt>
          <dd>21NOV2026</dd>
        </div>
        <div>
          <dt>BOARDING</dt>
          <dd>15:00</dd>
        </div>
        <div>
          <dt>GATE</dt>
          <dd>{result.gate}</dd>
        </div>
      </dl>
      <p className="boarding-pass__stub-class">HOMECOMING CLASS</p>
      <PrintedBarcode />
    </>
  )
}

/** Decorative full-size layer for the tear mesh; semantic content stays on the original pass. */
export function BoardingPassTearLayer({
  result,
}: Pick<BoardingPassProps, 'result'>) {
  return (
    <div className="boarding-pass boarding-pass--expanded">
      <div />
      <div className="boarding-pass__stub">
        <BoardingPassStubContent result={result} />
      </div>
    </div>
  )
}

/** The passenger's detached right-hand portion of the printed boarding pass. */
export function BoardingPassStub({
  result,
  exportMode = false,
}: Pick<BoardingPassProps, 'result' | 'exportMode'>) {
  return (
    <article
      className={`boarding-pass boarding-pass--detached ${exportMode ? '' : 'boarding-pass--paper'}`}
      aria-label={`${result.passengerName}님의 ${result.city}행 탑승권 절취 부분`}
      data-ticket-export
    >
      <div className="boarding-pass__stub">
        <BoardingPassStubContent result={result} />
      </div>
    </article>
  )
}

/** Shared by issuer, enlargement and PNG export. Contains no email. */
export function BoardingPass({
  result,
  exportMode = false,
  displayMode = 'compact',
}: BoardingPassProps) {
  return (
    <article
      className={`boarding-pass boarding-pass--${displayMode} ${exportMode ? '' : 'boarding-pass--paper'}`}
      aria-label={`${result.passengerName}님의 ${result.city}행 기념 탑승권`}
      data-ticket-export
    >
      <div className="boarding-pass__main">
        <header className="boarding-pass__header">
          <AirlineBrand />
          <span>탑승권 BOARDING PASS</span>
        </header>
        <dl className="boarding-pass__identity">
          <div className="boarding-pass__passenger">
            <dt>성명 NAME</dt>
            <dd>{result.passengerName}</dd>
          </div>
          <div>
            <dt>출발 FROM</dt>
            <dd>
              <span>SEOUL / INCHEON</span>
              <b>ICN</b>
            </dd>
          </div>
          <div>
            <dt>도착 TO</dt>
            <dd>
              <span>{result.city}</span>
              <b>{result.airportCode}</b>
            </dd>
          </div>
        </dl>
        <dl className="boarding-pass__fields">
          <div>
            <dt>편명 FLIGHT</dt>
            <dd>GDG1121</dd>
          </div>
          <div>
            <dt>탑승일 DATE</dt>
            <dd>21NOV2026</dd>
          </div>
          <div>
            <dt>탑승시간 BOARDING</dt>
            <dd>15:00</dd>
          </div>
        </dl>
        <dl className="boarding-pass__boarding">
          <div>
            <dt>탑승구 GATE</dt>
            <dd>{result.gate}</dd>
          </div>
          <div>
            <dt>등급 CLASS</dt>
            <dd>HOMECOMING</dd>
          </div>
        </dl>
        <div className="boarding-pass__scan-row">
          <PrintedBarcode />
          <p>
            GDG HOME COMING
            <br />
            21 NOV 2026
          </p>
        </div>
        <footer>EVENT SOUVENIR / NOT VALID FOR AIR TRAVEL</footer>
      </div>
      <aside className="boarding-pass__stub" aria-label="탑승권 절취 부분">
        <BoardingPassStubContent result={result} />
      </aside>
    </article>
  )
}
