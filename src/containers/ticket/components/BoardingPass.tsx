import { AirlineBrand } from '@/components/brand';
import type { DepartureResult } from '../types/departure';
import '../styles/boarding-pass.css';

export interface BoardingPassProps {
  result: DepartureResult;
  exportMode?: boolean;
  displayMode?: 'compact' | 'expanded';
}

// Decorative stacked print pattern only; contains no passenger data or QR link.
const barcodePath = Array.from({ length: 10 }, (_, row) => {
  let seed = (row + 1) * 7919;
  let path = `M0 ${row * 3}h2v3H0zM4 ${row * 3}h1v3H4z`;
  for (let column = 8; column < 152; column += 2) {
    seed = (seed * 16807) % 2147483647;
    if (seed % 3 !== 0) {
      path += `M${column} ${row * 3}h${seed % 2 ? 1 : 2}v3h-${seed % 2 ? 1 : 2}z`;
    }
  }
  return `${path}M155 ${row * 3}h2v3h-2zM159 ${row * 3}h1v3h-1z`;
}).join('');

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
  );
}

function BoardingPassStubContent({ result }: Pick<BoardingPassProps, 'result'>) {
  return (
    <>
      <header className="boarding-pass__header">
        <AirlineBrand className="boarding-pass__brand" />
        <span>BOARDING PASS</span>
      </header>
      <strong className="boarding-pass__stub-name">{result.passengerName}</strong>
      <dl className="boarding-pass__stub-fields">
        <div>
          <dt>FROM</dt>
          <dd>
            {result.airportCode} {result.city}
          </dd>
        </div>
        <div>
          <dt>TO</dt>
          <dd>ICN SEOUL / INCHEON</dd>
        </div>
        <div>
          <dt>FLIGHT</dt>
          <dd>
            {result.airlineLabel ?? 'GDG'}
            {result.flightNumber ?? '121'}
          </dd>
        </div>
        <div>
          <dt>DATE</dt>
          <dd>21 NOV</dd>
        </div>
        <div>
          <dt>BOARDING</dt>
          <dd>{result.boardingTime ?? '15:00'}</dd>
        </div>
        <div>
          <dt>GATE</dt>
          <dd>{result.gate}</dd>
        </div>
      </dl>
      <p className="boarding-pass__stub-class">HOMECOMING 2026</p>
      <PrintedBarcode />
    </>
  );
}

/** Decorative full-size layer for the tear mesh; semantic content stays on the original pass. */
export function BoardingPassTearLayer({ result }: Pick<BoardingPassProps, 'result'>) {
  return (
    <div className="boarding-pass boarding-pass--expanded">
      <div />
      <div className="boarding-pass__stub">
        <BoardingPassStubContent result={result} />
      </div>
    </div>
  );
}

/** The passenger's detached right-hand portion of the printed boarding pass. */
export function BoardingPassStub({ result, exportMode = false }: Pick<BoardingPassProps, 'result' | 'exportMode'>) {
  return (
    <article
      className={`boarding-pass boarding-pass--detached ${exportMode ? '' : 'boarding-pass--paper'}`}
      aria-label={`${result.passengerName}님의 ${result.city} 출발, 인천행 탑승권 절취 부분`}
      data-ticket-export
    >
      <div className="boarding-pass__stub">
        <BoardingPassStubContent result={result} />
      </div>
    </article>
  );
}

/** Shared by issuer, enlargement and PNG export. Contains no email. */
export function BoardingPass({ result, exportMode = false, displayMode = 'compact' }: BoardingPassProps) {
  return (
    <article
      className={`boarding-pass boarding-pass--${displayMode} ${exportMode ? '' : 'boarding-pass--paper'}`}
      aria-label={`${result.passengerName}님의 ${result.city} 출발, 인천행 기념 탑승권`}
      data-ticket-export
    >
      <div className="boarding-pass__main">
        <header className="boarding-pass__header">
          <AirlineBrand className="boarding-pass__brand" />
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
              <span>{result.city}</span>
              <b>{result.airportCode}</b>
            </dd>
          </div>
          <div>
            <dt>도착 TO</dt>
            <dd>
              <span>SEOUL / INCHEON</span>
              <b>ICN</b>
            </dd>
          </div>
        </dl>
        <dl className="boarding-pass__fields">
          <div>
            <dt>편명 FLIGHT</dt>
            <dd>
              {result.airlineLabel ?? 'GDG'}
              {result.flightNumber ?? '121'}
            </dd>
          </div>
          <div>
            <dt>탑승일 DATE</dt>
            <dd>21 NOV</dd>
          </div>
          <div>
            <dt>탑승시간 BOARDING</dt>
            <dd>{result.boardingTime ?? '15:00'}</dd>
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
            GDGoC DJU
            <br />
            HOMECOMING 2026
          </p>
        </div>
        <footer>EVENT SOUVENIR / NOT VALID FOR AIR TRAVEL</footer>
      </div>
      <aside className="boarding-pass__stub" aria-label="탑승권 절취 부분">
        <BoardingPassStubContent result={result} />
      </aside>
    </article>
  );
}
