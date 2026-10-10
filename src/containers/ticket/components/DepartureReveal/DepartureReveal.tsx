import type { DeparturePhase, DepartureResult } from '../../types/departure';
import { memo, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { RollingCell, RollingState } from '../../types/rolling';
import { makePanelRows } from './utils/panelSlots';
import {
  boardAirlineColumns,
  boardDestinationColumns,
  boardHomeLabel,
  boardUserAirlineLabel,
  boardStatusColumns,
  mockRowCellsAt,
} from './utils/departureBoardRows';
import { useDepartureBoard } from './hooks/useDepartureBoard';
import { LayoutGroup, MotionConfig, motion } from 'motion/react';
import './departure-reveal.css';
import pointingHand from './assets/pointing-hand-3d-v2.webp';

function HandGuide() {
  return (
    <span className="departure-row-guide" aria-hidden="true">
      <img src={pointingHand} alt="" decoding="async" />
    </span>
  );
}

interface DepartureRevealProps {
  result: DepartureResult;
  phase: DeparturePhase;
  reducedMotion?: boolean;
  onConfirm: () => void;
  rolling: RollingState;
  userRowIndex?: number;
  onRowCapacity?: (count: number) => void;
}

function FlapLeaves({ cell }: { cell: RollingCell }) {
  // Capture lateness once per step; RAF updates must not advance CSS twice.
  const [initialElapsed] = useState(() => cell.elapsedMs);
  return (
    <span className="flap-moving" style={{ '--flap-elapsed': `${initialElapsed}ms` } as CSSProperties}>
      <span className="flap-upper">
        <span className="flap-half__glyph">
          <span>{cell.current}</span>
        </span>
      </span>
      <span className="flap-lower">
        <span className="flap-half__glyph">
          <span>{cell.next}</span>
        </span>
      </span>
    </span>
  );
}

export const FlapCell = memo(
  function FlapCell({
    cell,
    reducedMotion,
    primary = false,
    style,
  }: {
    cell: RollingCell;
    reducedMotion: boolean;
    primary?: boolean;
    style?: CSSProperties;
  }) {
    const moving = cell.isFlipping && !reducedMotion;
    const current = cell.current === ' ' ? '\u00a0' : cell.current;
    const next = cell.next === ' ' ? '\u00a0' : cell.next;
    return (
      <span
        aria-hidden="true"
        className={`flap-letter ${primary ? 'flap-letter--primary' : ''} ${moving ? 'flap-letter--moving' : ''} ${/[^\x20-\x7e]/.test(cell.current + cell.next) ? 'flap-letter--wide' : ''}`}
        style={
          {
            '--flap-step': `${cell.durationMs / 2}ms`,
            '--flap-duration': `${cell.durationMs}ms`,
            '--flap-fold-duration': `${cell.durationMs * 0.45}ms`,
            '--flap-fall-duration': `${cell.durationMs * 0.55}ms`,
            ...style,
          } as CSSProperties
        }
      >
        <span className="flap-half flap-half--top">
          <span className="flap-half__glyph">
            <span>{moving ? next : current}</span>
          </span>
        </span>
        <span className="flap-half flap-half--bottom">
          <span className="flap-half__glyph">
            <span>{current}</span>
          </span>
        </span>
        {moving && <FlapLeaves key={cell.stepId} cell={cell} />}
      </span>
    );
  },
  (previous, next) =>
    previous.reducedMotion === next.reducedMotion &&
    previous.primary === next.primary &&
    previous.style?.gridRow === next.style?.gridRow &&
    previous.style?.gridColumn === next.style?.gridColumn &&
    previous.cell.current === next.cell.current &&
    previous.cell.next === next.cell.next &&
    previous.cell.stepId === next.cell.stepId &&
    previous.cell.isFlipping === next.cell.isFlipping &&
    previous.cell.durationMs === next.cell.durationMs,
);
// elapsedMs is captured only when keyed FlapLeaves mounts. Updating it within
// the same step would not change the leaf, so memo keeps that first offset.

interface MatrixSlot {
  cell: RollingCell;
  row: number;
  column: number;
  primary: boolean;
}

const staticSegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
});
const staticCellCache = new Map<string, RollingCell[]>();
function staticCells(text: string, prefix: string): RollingCell[] {
  const key = `${prefix}:${text}`;
  const cached = staticCellCache.get(key);
  if (cached) {
    return cached;
  }
  const cells = Array.from(staticSegmenter.segment(text), (entry, index) => ({
    current: entry.segment,
    next: entry.segment,
    stepId: `${prefix}:${index}`,
    isFlipping: false,
    durationMs: 0,
    elapsedMs: 0,
  }));
  staticCellCache.set(key, cells);
  return cells;
}

const MockFlapRow = memo(function MockFlapRow({
  cells,
  row,
  reducedMotion,
  countryColumns,
  airlineColumns,
  airlineStart,
  flightStart,
  gateStart,
  statusStart,
  statusColumns,
}: {
  cells: ReturnType<typeof mockRowCellsAt>;
  row: number;
  reducedMotion: boolean;
  countryColumns: number;
  airlineColumns: number;
  airlineStart: number;
  flightStart: number;
  gateStart: number;
  statusStart: number;
  statusColumns: number;
}) {
  const banks = [
    { cells: cells.time, start: 1, columns: 5 },
    { cells: cells.country, start: 7, columns: countryColumns },
    { cells: cells.airline, start: airlineStart, columns: airlineColumns },
    { cells: cells.flight, start: flightStart, columns: 3 },
    { cells: cells.gate, start: gateStart, columns: 3 },
    { cells: cells.status, start: statusStart, columns: statusColumns },
  ];
  return banks.flatMap((bank) =>
    makePanelRows(bank.cells, bank.columns)[0].map((cell, index) => (
      <FlapCell
        key={bank.start + index}
        cell={cell}
        reducedMotion={reducedMotion}
        style={{ gridRow: row, gridColumn: bank.start + index }}
      />
    )),
  );
});

export function DepartureReveal({
  result,
  phase,
  reducedMotion = false,
  onConfirm,
  rolling,
  userRowIndex = 0,
  onRowCapacity,
}: DepartureRevealProps) {
  const detailsVisible = reducedMotion || phase === 'details' || phase === 'ready';
  const ready = reducedMotion || phase === 'ready';
  const boardRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const heroCenter = useRef<{ x: number; y: number } | null>(null);
  const progress = reducedMotion ? 1 : rolling.boardTransitionProgress;
  // First let the large shell read; only then shrink every part together.
  const shrinkProgress = Math.max(0, Math.min(1, (progress - 0.32) / 0.68));
  // Quintic ease has zero velocity/acceleration at both ends: no launch snap
  // or elastic rebound when the equipment reaches its final geometry.
  const easedShrink = shrinkProgress ** 3 * (shrinkProgress * (shrinkProgress * 6 - 15) + 10);
  function appear(start: number, end: number) {
    if (reducedMotion) {
      return 1;
    }
    const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
    return t * t * (3 - 2 * t);
  }
  const shellVisibility = appear(0, 0.1);
  const titleVisibility = appear(0.03, 0.14);
  const columnsVisibility = appear(0.06, 0.17);
  const matrixVisibility = appear(0.1, 0.21);
  const remaining = detailsVisible ? 1 - easedShrink : 0;
  const transitionStage = !detailsVisible
    ? 'country'
    : progress < 0.32
      ? 'board-hold'
      : progress < 1
        ? 'board-shrink'
        : 'board-settled';

  useLayoutEffect(() => {
    const board = boardRef.current;
    const country = countryRef.current;
    if (!board || !country) {
      return;
    }
    const measure = () => {
      if (!detailsVisible) {
        const rect = country.getBoundingClientRect();
        heroCenter.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        return;
      }
      // Measure the final layout before paint, independently of its visual scale.
      const transform = board.style.transform;
      board.style.transform = 'none';
      const boardRect = board.getBoundingClientRect();
      const countryRect = country.getBoundingClientRect();
      const x = countryRect.left + countryRect.width / 2;
      const y = countryRect.top + countryRect.height / 2;
      const center = heroCenter.current ?? { x, y };
      board.style.setProperty('--board-origin-x', `${x - boardRect.left}px`);
      board.style.setProperty('--board-origin-y', `${y - boardRect.top}px`);
      board.style.setProperty('--board-travel-x', `${center.x - x}px`);
      board.style.setProperty('--board-travel-y', `${center.y - y}px`);
      board.style.transform = transform;
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [detailsVisible]);

  const countryColumns = boardDestinationColumns;
  const airlineColumns = boardAirlineColumns;
  const statusColumns = boardStatusColumns;
  const airlineStart = 7 + countryColumns + 1;
  const flightStart = airlineStart + airlineColumns + 1;
  const gateStart = flightStart + 3 + 1;
  const statusStart = gateStart + 3 + 1;
  const totalColumns = 5 + countryColumns + airlineColumns + 3 + 3 + statusColumns;
  const boardGridStyle = {
    '--board-remaining': remaining,
    '--board-title-visibility': titleVisibility,
    '--board-columns-visibility': columnsVisibility,
    '--board-matrix-visibility': matrixVisibility,
    transform: detailsVisible
      ? `translate(calc(var(--board-travel-x, 0px) * ${remaining}), calc(var(--board-travel-y, 0px) * ${remaining})) scale(${1 + 2 * remaining})`
      : 'none',
    '--time-columns': 5,
    '--country-columns': countryColumns,
    '--airline-columns': airlineColumns,
    '--flight-columns': 3,
    '--gate-columns': 3,
    '--status-columns': statusColumns,
    '--category-gap-count': 5,
    '--matrix-columns': totalColumns,
    '--matrix-track-gaps': totalColumns + 4,
  } as CSSProperties;
  const actualRows = Math.max(1, Math.ceil(rolling.gate.length / 3));
  const animateMocks = detailsVisible && !reducedMotion;
  const { matrixRef, mockCount, mockElapsed } = useDepartureBoard(
    detailsVisible,
    animateMocks,
    actualRows,
    onRowCapacity,
  );
  const userStartRow = Math.min(Math.max(0, userRowIndex), mockCount) + 1;
  // Origin header remains actual-length; the three-cell body is an airport.
  const actualCountrySpan = Math.max(1, rolling.country.length);
  const slots: MatrixSlot[] = [];
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
    );
  }
  addColumn(staticCells(result.boardingTime ?? '15:00', 'time'), userStartRow, 1, 5, true, actualRows);
  addColumn(staticCells(boardHomeLabel, 'destination'), userStartRow, 7, countryColumns, true, actualRows);
  addColumn(
    staticCells(result.airlineLabel ?? boardUserAirlineLabel, 'airline'),
    userStartRow,
    airlineStart,
    airlineColumns,
    true,
    actualRows,
  );
  addColumn(staticCells(result.flightNumber ?? '121', 'flight'), userStartRow, flightStart, 3, true, actualRows);
  addColumn(rolling.gate, userStartRow, gateStart, 3, true, actualRows);
  addColumn(staticCells('BOARDING', 'status'), userStartRow, statusStart, statusColumns, true, actualRows);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <LayoutGroup>
        <section
          className="departure-reveal w-full min-w-0"
          data-reduced-motion={reducedMotion}
          data-phase={phase}
          data-transition-stage={transitionStage}
          data-transition-progress={progress}
          aria-labelledby="departure-title"
        >
          <motion.div
            layout={false}
            ref={boardRef}
            style={boardGridStyle}
            className={`departure-board text-board-ink ${detailsVisible ? 'departure-board--expanded' : 'departure-board--compact'} ${ready ? 'departure-board--ready' : ''}`}
          >
            <motion.div
              layout={false}
              initial={false}
              className="departure-board__backdrop bg-board"
              style={{
                borderRadius: 2,
                opacity: detailsVisible ? shellVisibility : 0,
              }}
              aria-hidden="true"
            />
            <div className="departure-board__header">
              <h1 id="departure-title" tabIndex={-1} className="departure-title">
                DEPARTURES
              </h1>
              <motion.div
                ref={countryRef}
                layout={false}
                className="departure-country"
                aria-hidden="true"
                style={
                  {
                    '--country-count': Math.max(1, rolling.country.length),
                  } as CSSProperties
                }
              >
                <span
                  className="flap-letters flap-letters--country"
                  style={
                    {
                      '--panel-columns': detailsVisible ? actualCountrySpan : Math.max(1, rolling.country.length),
                    } as CSSProperties
                  }
                >
                  <span className="flap-panel-row">
                    {rolling.country.map((cell, index) => (
                      <FlapCell key={index} cell={cell} reducedMotion={reducedMotion} />
                    ))}
                  </span>
                </span>
              </motion.div>
            </div>
            {detailsVisible && (
              <div className="departure-column-headers" style={{ '--matrix-columns': totalColumns } as CSSProperties}>
                <span style={{ gridColumn: '1 / span 5' }}>
                  <strong>시간</strong>
                  <small>TIME</small>
                </span>
                <span style={{ gridColumn: `7 / span ${countryColumns}` }}>
                  <strong>도착공항</strong>
                  <small>DESTINATION</small>
                </span>
                <span
                  style={{
                    gridColumn: `${airlineStart} / span ${airlineColumns}`,
                  }}
                >
                  <strong>항공사</strong>
                  <small>AIRLINE</small>
                </span>
                <span style={{ gridColumn: `${flightStart} / span 3` }}>
                  <strong>편명</strong>
                  <small>FLIGHT</small>
                </span>
                <span style={{ gridColumn: `${gateStart} / span 3` }}>
                  <strong>게이트</strong>
                  <small>GATE</small>
                </span>
                <span
                  style={{
                    gridColumn: `${statusStart} / span ${statusColumns}`,
                  }}
                >
                  <strong>상태</strong>
                  <small>STATUS</small>
                </span>
              </div>
            )}
            <div
              ref={matrixRef}
              className="departure-board__matrix"
              data-user-row={userStartRow}
              style={{ '--matrix-columns': totalColumns } as CSSProperties}
            >
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
              {detailsVisible &&
                Array.from({ length: mockCount }, (_, index) => (
                  <MockFlapRow
                    key={`mock:${index}`}
                    cells={mockRowCellsAt(
                      index,
                      mockElapsed,
                      animateMocks,
                      !ready,
                      mockCount,
                      result.boardingTime ?? '15:00',
                      index < userStartRow - 1 ? index - (userStartRow - 1) : index - (userStartRow - 1) + actualRows,
                    )}
                    row={index < userStartRow - 1 ? index + 1 : actualRows + index + 1}
                    reducedMotion={reducedMotion}
                    countryColumns={countryColumns}
                    airlineColumns={airlineColumns}
                    airlineStart={airlineStart}
                    flightStart={flightStart}
                    gateStart={gateStart}
                    statusStart={statusStart}
                    statusColumns={statusColumns}
                  />
                ))}
              {detailsVisible && (
                <button
                  type="button"
                  className="departure-row-action"
                  disabled={!ready}
                  aria-label={`${result.countryLabel ?? result.country} 발권하기`}
                  style={{
                    gridRow: `${userStartRow} / span ${actualRows}`,
                    gridColumn: '1 / -1',
                  }}
                  onClick={() => {
                    if (ready) {
                      onConfirm();
                    }
                  }}
                >
                  {ready && <HandGuide />}
                </button>
              )}
            </div>
          </motion.div>

          <p className="sr-only" role="status" aria-atomic="true">
            {ready
              ? `${result.passengerName}님은 ${result.countryLabel ?? result.country}에서 한국으로 귀국합니다. 출발 도시는 ${result.city}, 출발 공항 코드는 ${result.airportCode}, 게이트는 ${result.gate}입니다. 노란색 내 일정 행을 눌러 발권해주세요.`
              : '여행지를 공개하고 있습니다.'}
          </p>
          {ready && (
            <dl className="sr-only">
              <dt>승객명</dt>
              <dd>{result.passengerName}</dd>
              <dt>출발국가</dt>
              <dd>{result.countryLabel ?? result.country}</dd>
              <dt>출발도시</dt>
              <dd>{result.city}</dd>
              <dt>출발 공항 코드</dt>
              <dd>{result.airportCode}</dd>
              <dt>게이트</dt>
              <dd>{result.gate}</dd>
              <dt>운항표 예시</dt>
              <dd>하단 운항 행은 고정된 예시 운항 정보입니다.</dd>
            </dl>
          )}
        </section>
      </LayoutGroup>
    </MotionConfig>
  );
}

export default DepartureReveal;
