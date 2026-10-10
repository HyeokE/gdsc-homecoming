import { useState, type CSSProperties } from 'react'
import type { RollingCell, RollingState } from '../types/rolling'
import { makePanelRows } from '../hooks/panelSlots'
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
} from 'motion/react'
import '../styles/departure-reveal.css'

export type DeparturePhase = 'anticipation' | 'country' | 'details' | 'ready'

export interface DepartureResult {
  passengerName: string
  country: string
  countryLabel?: string
  city: string
  airportCode: string
  gate: string
}

interface DepartureRevealProps {
  result: DepartureResult
  phase: DeparturePhase
  reducedMotion?: boolean
  onConfirm: () => void
  rolling: RollingState
}

function FlapLeaves({ cell }: { cell: RollingCell }) {
  // Capture lateness once per step; RAF updates must not advance CSS twice.
  const [initialElapsed] = useState(() => cell.elapsedMs)
  return (
    <span
      className="flap-moving"
      style={{ '--flap-elapsed': `${initialElapsed}ms` } as CSSProperties}
    >
      <span className="flap-upper">
        <span className="flap-half__glyph">{cell.current}</span>
      </span>
      <span className="flap-lower">
        <span className="flap-half__glyph">{cell.next}</span>
      </span>
    </span>
  )
}

function FlapCell({
  cell,
  reducedMotion,
  primary = false,
  style,
}: {
  cell: RollingCell
  reducedMotion: boolean
  primary?: boolean
  style?: CSSProperties
}) {
  const moving = cell.isFlipping && !reducedMotion
  const current = cell.current === ' ' ? '\u00a0' : cell.current
  const next = cell.next === ' ' ? '\u00a0' : cell.next
  return (
    <span
      className={`flap-letter ${primary ? 'flap-letter--primary' : ''}`}
      style={
        { '--flap-step': `${cell.durationMs / 2}ms`, ...style } as CSSProperties
      }
    >
      <span className="flap-half flap-half--top">
        <span className="flap-half__glyph">{moving ? next : current}</span>
      </span>
      <span className="flap-half flap-half--bottom">
        <span className="flap-half__glyph">{current}</span>
      </span>
      {moving && <FlapLeaves key={cell.stepId} cell={cell} />}
    </span>
  )
}

interface MatrixSlot {
  cell: RollingCell
  row: number
  column: number
  primary: boolean
}

function staticCells(text: string, prefix: string): RollingCell[] {
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    (entry, index) => ({
      current: entry.segment,
      next: entry.segment,
      stepId: `${prefix}:${index}`,
      isFlipping: false,
      durationMs: 0,
      elapsedMs: 0,
    }),
  )
}
// User-requested illustrative rows. Fixed UI fixtures, never live flight records.
const mockDepartures = [
  { time: '15:15', country: 'SINGAPORE', flight: 'GDG1122', gate: 'B02' },
  { time: '15:30', country: 'CANADA', flight: 'GDG1123', gate: 'C03' },
  { time: '15:45', country: 'AUSTRALIA', flight: 'GDG1124', gate: 'D04' },
] as const

export function DepartureReveal({
  result,
  phase,
  reducedMotion = false,
  onConfirm,
  rolling,
}: DepartureRevealProps) {
  const detailsVisible =
    reducedMotion || phase === 'details' || phase === 'ready'
  const ready = reducedMotion || phase === 'ready'
  const layoutTransition = {
    duration: reducedMotion ? 0 : rolling.layoutDurationMs / 1000,
    ease: [0.22, 1, 0.36, 1] as const,
  }

  const countryColumns = 14
  const totalColumns = 36
  const actualRows = Math.max(
    1,
    Math.ceil(rolling.country.length / countryColumns),
    Math.ceil(rolling.gate.length / 3),
  )
  const actualCountrySpan = Math.min(
    countryColumns,
    Math.max(1, rolling.country.length),
  )
  const countryRows = detailsVisible
    ? Array.from(
        {
          length: Math.max(
            1,
            Math.ceil(rolling.country.length / countryColumns),
          ),
        },
        (_, row) =>
          rolling.country.slice(
            row * countryColumns,
            (row + 1) * countryColumns,
          ),
      )
    : [rolling.country]
  const slots: MatrixSlot[] = []
  function addColumn(
    cells: readonly RollingCell[],
    row: number,
    column: number,
    columns: number,
    primary: boolean,
    rows = 1,
  ) {
    makePanelRows(cells, columns, rows).forEach((cellsInRow, offset) =>
      cellsInRow.forEach((cell, index) =>
        slots.push({
          cell,
          row: row + offset,
          column: column + index,
          primary,
        }),
      ),
    )
  }
  addColumn(staticCells('15:00', 'time'), 1, 1, 5, true, actualRows)
  makePanelRows(rolling.country, countryColumns, actualRows).forEach(
    (cells, row) =>
      cells.forEach((cell, index) => {
        if (row * countryColumns + index >= rolling.country.length)
          slots.push({ cell, row: row + 1, column: 6 + index, primary: true })
      }),
  )
  addColumn(staticCells('GDG AIR', 'airline'), 1, 20, 7, true, actualRows)
  addColumn(staticCells('GDG1121', 'flight'), 1, 27, 7, true, actualRows)
  addColumn(rolling.gate, 1, 34, 3, true, actualRows)
  mockDepartures.forEach((fixture, index) => {
    const row = actualRows + index + 1
    addColumn(staticCells(fixture.time, `mock:${index}:time`), row, 1, 5, false)
    addColumn(
      staticCells(fixture.country, `mock:${index}:country`),
      row,
      6,
      14,
      false,
    )
    addColumn(
      staticCells('GDG AIR', `mock:${index}:airline`),
      row,
      20,
      7,
      false,
    )
    addColumn(
      staticCells(fixture.flight, `mock:${index}:flight`),
      row,
      27,
      7,
      false,
    )
    addColumn(
      staticCells(fixture.gate, `mock:${index}:gate`),
      row,
      34,
      3,
      false,
    )
  })
  const countryCellKey = (cell: RollingCell) =>
    `country:${rolling.country.indexOf(cell)}`

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <LayoutGroup>
        <section
          className="departure-reveal w-full min-w-0"
          data-reduced-motion={reducedMotion}
          data-phase={phase}
          aria-labelledby="departure-title"
        >
          <motion.div
            layout={false}
            className={`departure-board text-board-ink ${detailsVisible ? 'departure-board--expanded' : 'departure-board--compact'}`}
          >
            <motion.div
              layout={false}
              transition={{
                layout: layoutTransition,
                opacity: { duration: reducedMotion ? 0 : 0.24 },
              }}
              initial={false}
              animate={{ opacity: detailsVisible ? 1 : 0 }}
              className="departure-board__backdrop bg-board"
              style={{ borderRadius: 2 }}
              aria-hidden="true"
            />
            <div className="departure-board__header">
              <h1
                id="departure-title"
                tabIndex={-1}
                className="departure-title"
              >
                DEPARTURES
              </h1>
              <span>출발 안내</span>
            </div>
            {detailsVisible && (
              <div
                className="departure-column-headers"
                style={{ '--matrix-columns': totalColumns } as CSSProperties}
              >
                <span style={{ gridColumn: '1 / span 5' }}>
                  <strong>시간</strong>
                  <small>TIME</small>
                </span>
                <span style={{ gridColumn: '6 / span 14' }}>
                  <strong>도착국가</strong>
                  <small>DESTINATION</small>
                </span>
                <span style={{ gridColumn: '20 / span 7' }}>
                  <strong>항공사</strong>
                  <small>AIRLINE</small>
                </span>
                <span style={{ gridColumn: '27 / span 7' }}>
                  <strong>편명</strong>
                  <small>FLIGHT</small>
                </span>
                <span style={{ gridColumn: '34 / span 3' }}>
                  <strong>게이트</strong>
                  <small>GATE</small>
                </span>
              </div>
            )}
            <div
              className="departure-board__matrix"
              aria-hidden="true"
              style={{ '--matrix-columns': totalColumns } as CSSProperties}
            >
              <motion.div
                layout={!reducedMotion}
                layoutId="departure-country-panel"
                transition={{ layout: layoutTransition }}
                className="departure-country"
                style={
                  {
                    gridColumn: `6 / span ${actualCountrySpan}`,
                    gridRow: `1 / span ${countryRows.length}`,
                    '--country-count': Math.max(1, rolling.country.length),
                  } as CSSProperties
                }
              >
                <span
                  className="flap-letters flap-letters--country"
                  style={
                    {
                      '--panel-columns': detailsVisible
                        ? actualCountrySpan
                        : Math.max(1, rolling.country.length),
                    } as CSSProperties
                  }
                >
                  {countryRows.map((cells, rowIndex) => (
                    <span className="flap-panel-row" key={rowIndex}>
                      {cells.map((cell) => (
                        <FlapCell
                          cell={cell}
                          reducedMotion={reducedMotion}
                          primary={detailsVisible}
                          key={countryCellKey(cell)}
                        />
                      ))}
                    </span>
                  ))}
                </span>
              </motion.div>
              {detailsVisible &&
                slots.map((slot) => (
                  <FlapCell
                    key={`${slot.row}:${slot.column}`}
                    cell={slot.cell}
                    reducedMotion={reducedMotion}
                    primary={slot.primary}
                    style={{ gridRow: slot.row, gridColumn: slot.column }}
                  />
                ))}
            </div>
            {detailsVisible && (
              <p
                className="departure-board__footer"
                aria-hidden={!rolling.countrySettled && !reducedMotion}
              >
                {rolling.countrySettled || reducedMotion
                  ? (result.countryLabel ?? result.country)
                  : '\u00a0'}
                {(rolling.airportSettled || reducedMotion) &&
                  ` · ${result.city}`}
              </p>
            )}
          </motion.div>

          <motion.div
            layout="position"
            transition={{ layout: layoutTransition }}
            className={`departure-confirm ${detailsVisible ? '' : 'departure-confirm--hidden'}`}
          >
            <AnimatePresence initial={false}>
              {ready ? (
                <motion.button
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.24 }}
                  type="button"
                  onClick={onConfirm}
                  className="min-h-control w-full rounded-control bg-primary px-6 text-body font-semibold text-on-primary transition-colors duration-feedback ease-ui hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:bg-primary-active"
                >
                  확인했어요
                </motion.button>
              ) : detailsVisible ? (
                <p
                  key="pending"
                  className="text-center text-caption text-muted"
                >
                  탑승 정보를 준비하고 있어요.
                </p>
              ) : null}
            </AnimatePresence>
          </motion.div>
          <p className="sr-only" role="status" aria-atomic="true">
            {ready
              ? `${result.passengerName}님의 국가는 ${result.countryLabel ?? result.country}, 도시는 ${result.city}, 공항 코드는 ${result.airportCode}, 게이트는 ${result.gate}입니다. 확인했어요 버튼을 눌러 발권해주세요.`
              : '여행지를 공개하고 있습니다.'}
          </p>
          {ready && (
            <dl className="sr-only">
              <dt>승객명</dt>
              <dd>{result.passengerName}</dd>
              <dt>국가</dt>
              <dd>{result.countryLabel ?? result.country}</dd>
              <dt>도시</dt>
              <dd>{result.city}</dd>
              <dt>공항 코드</dt>
              <dd>{result.airportCode}</dd>
              <dt>게이트</dt>
              <dd>{result.gate}</dd>
              <dt>운항표 예시</dt>
              <dd>하단 세 행은 고정된 예시 운항 정보입니다.</dd>
            </dl>
          )}
        </section>
      </LayoutGroup>
    </MotionConfig>
  )
}

export default DepartureReveal
