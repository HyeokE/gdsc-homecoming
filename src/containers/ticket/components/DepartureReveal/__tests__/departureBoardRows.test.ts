import { describe, expect, test } from 'bun:test';
import {
  fittingMockRows,
  mockCellsAt,
  mockDepartureAt,
  boardCountryColumns,
  boardDestinationColumns,
  boardHomeLabel,
  boardUserAirlineLabel,
  mockAirlineFixtures,
  mockAirportFixtures,
  boardAirlineColumns,
  boardStatusColumns,
  boardStatuses,
  orderedTransitionCells,
  mockRowCellsAt,
  mockAnimationWindow,
  mockBurstMs,
  mockSleepMs,
  mockCycleMs,
} from '../utils/departureBoardRows';

describe('viewport flight rows', () => {
  test('fills complete rows at small and large landscape heights without a clipped last row', () => {
    for (const viewportHeight of [375, 390, 600]) {
      const available = viewportHeight - 140 - 20;
      const count = fittingMockRows(available, 44, 5, 1);
      const filledHeight = (count + 1) * 44 + count * 5;
      expect(count).toBeGreaterThan(0);
      expect(filledHeight).toBeLessThanOrEqual(available);
      expect(filledHeight + 49).toBeGreaterThan(available);
    }
    expect(fittingMockRows(44, 44, 5, 1)).toBe(0);
    expect(fittingMockRows(10, 44, 5, 2)).toBe(0);
  });

  test('generates deterministic schedules beyond the first three fixtures', () => {
    expect(mockDepartureAt(0)).toEqual({
      time: '15:12',
      country: 'NRT',
      airline: 'KE',
      flight: '122',
      gate: 'B02',
      status: 'DELAYED',
    });
    expect(mockDepartureAt(7).time).toBe('15:48');
    expect(mockDepartureAt(12)).toEqual(mockDepartureAt(12));
    expect(mockDepartureAt(12).flight).not.toBe(mockDepartureAt(0).flight);
  });
});

describe('mock physical wheel', () => {
  test('only selected numeric plates advance in order and finish before row activation', () => {
    const values = [650, 750, 890].map((elapsed) => mockCellsAt('GDG1122', 'flight', elapsed, 0, true));
    expect(values.map((cells) => cells.at(-1)?.current)).toEqual(['9', '0', '1']);
    expect(values.map((cells) => cells.at(-1)?.next)).toEqual(['0', '1', '2']);
    expect(values.every((cells) => cells.filter((cell) => cell.isFlipping).length === 1)).toBe(true);
    expect(
      mockCellsAt('GDG1122', 'flight', 1400, 0, true)
        .map((cell) => cell.current)
        .join(''),
    ).toBe('GDG1122');
    expect(mockCellsAt('GDG1122', 'flight', 720, 1, true).every((cell) => !cell.isFlipping)).toBe(true);
  });

  test('ready and reduced motion expose settled values, preserving spaces and graphemes', () => {
    const cells = mockCellsAt('A e\u0301 👩🏽‍✈️ 2', 'test', 0, 0, false);
    expect(cells.map((cell) => cell.current)).toEqual(['A', ' ', 'e\u0301', ' ', '👩🏽‍✈️', ' ', '2']);
    expect(cells.every((cell) => !cell.isFlipping && cell.current === cell.next)).toBe(true);
  });
});

describe('continuous departure fixtures', () => {
  test('capacity derives from catalog graphemes and compact airline labels', () => {
    expect(boardCountryColumns).toBe(9);
    expect(boardAirlineColumns).toBe(3);
    expect(boardUserAirlineLabel).toBe('GDG');
    expect(boardDestinationColumns).toBe(4);
    expect(boardHomeLabel).toBe('HOME');
    const rows = Array.from({ length: 6 }, (_, index) => mockDepartureAt(index));
    expect(new Set(rows.map((row) => row.airline)).size).toBe(6);
    expect(rows.every((row) => /^\d{3}$/.test(row.flight) && !row.airline.includes('AIR'))).toBe(true);
  });
  test('rows update after ready, stagger, and remain fixed for reduced motion', () => {
    const text = (cells: ReturnType<typeof mockRowCellsAt>) =>
      cells.country
        .map((cell) => cell.current)
        .join('')
        .trim();
    expect(text(mockRowCellsAt(0, 15000, true, false))).not.toBe(text(mockRowCellsAt(0, 0, true, false)));
    expect(text(mockRowCellsAt(1, 4000, true, false))).toBe(mockDepartureAt(1).country);
    expect(text(mockRowCellsAt(0, 40000, false, false))).toBe(mockDepartureAt(0).country);
  });
  test('changed plates preserve ordered wheel transitions including padding spaces', () => {
    const first = orderedTransitionCells('AZ', 'B', 'cycle', 0);
    expect(first[0].current).toBe('A');
    expect(first[0].next).toBe('B');
    const second = orderedTransitionCells('AZ', 'B', 'cycle', 18);
    expect(second[1].current).toBe('Z');
    expect(second[1].next).toBe(' ');
    const digits = orderedTransitionCells('9', '0', 'digits', 0);
    expect(digits[0].current).toBe('9');
    expect(digits[0].next).toBe('0');
    expect(orderedTransitionCells('9', '0', 'digits', 120)[0].isFlipping).toBe(false);
    expect(
      orderedTransitionCells('AZ', 'B', 'cycle', 2400)
        .map((cell) => cell.current)
        .join(''),
    ).toBe('B ');
  });
  test('idle gaps use timers and visible updates request frames', () => {
    expect(mockAnimationWindow(1500, 1)).toEqual({
      active: false,
      nextAt: 12000,
    });
    expect(mockAnimationWindow(12000, 1).active).toBe(true);
    expect(mockAnimationWindow(16000, 1)).toEqual({
      active: false,
      nextAt: 27000,
    });
  });
});

test('global sleep holds all targets and rotates only one selected row per burst', () => {
  const rowsAt = (elapsed: number) =>
    Array.from({ length: 4 }, (_, index) => mockRowCellsAt(index, elapsed, true, false, 4));
  const frames = [16000, 20000, 26000].map(rowsAt);
  for (const frame of frames) {
    expect(frame.flatMap((row) => Object.values(row).flat()).every((cell) => !cell.isFlipping)).toBe(true);
  }
  const values = frames.map((rows) =>
    rows.map((row) => Object.values(row).map((cells) => cells.map((cell) => cell.current).join(''))),
  );
  expect(values[0]).toEqual(values[1]);
  expect(values[1]).toEqual(values[2]);
  const updating = rowsAt(27050).map((row) =>
    Object.values(row)
      .flat()
      .some((cell) => cell.isFlipping),
  );
  expect(updating).toEqual([false, true, false, false]);
  expect(mockAnimationWindow(26000, 4)).toEqual({
    active: false,
    nextAt: 27000,
  });
});

test('settled rows reuse their snapshot while active leaves preserve current mount lateness', () => {
  expect(mockRowCellsAt(1, 13000, true, false, 4)).toBe(mockRowCellsAt(1, 13500, true, false, 4));
  const first = mockRowCellsAt(0, 12005, true, false, 4);
  const later = mockRowCellsAt(0, 12025, true, false, 4);
  expect(first).not.toBe(later);
  expect(first.country[0].elapsedMs).not.toBe(later.country[0].elapsedMs);
});

test('Korean status changes with a real direct flip and settles completely', () => {
  const initial = orderedTransitionCells('지연', '탑승', 'status', 0);
  expect(initial[0]).toMatchObject({
    current: '지',
    next: '탑',
    isFlipping: true,
    durationMs: 180,
  });
  const stagger = orderedTransitionCells('지연', '탑승', 'status', 30);
  expect(stagger[1]).toMatchObject({
    current: '연',
    next: '승',
    isFlipping: true,
    elapsedMs: 12,
  });
  expect(
    orderedTransitionCells('지연', '탑승', 'status', 200)
      .map((cell) => cell.current)
      .join(''),
  ).toBe('탑승');
});

test('all fixture transitions settle within the physical burst and retain a full quiet hold', () => {
  for (let row = 0; row < 20; row++) {
    const before = mockDepartureAt(row);
    const after = mockDepartureAt(row, 1);
    for (const field of Object.keys(after) as Array<keyof typeof after>) {
      const settled = orderedTransitionCells(before[field], after[field], 'test', mockBurstMs);
      expect(settled.every((cell) => !cell.isFlipping)).toBe(true);
      expect(
        settled
          .map((cell) => cell.current)
          .join('')
          .trim(),
      ).toBe(after[field]);
    }
  }
  expect(mockSleepMs).toBe(11600);
  expect(mockCycleMs - mockBurstMs).toBe(mockSleepMs);
});

test('English status capacity preserves every label and advances through alphabet in order', () => {
  expect(boardStatusColumns).toBe(8);
  expect(boardStatuses).toEqual(['DELAYED', 'BOARDING', 'DEPARTED']);
  const moving = orderedTransitionCells('DELAYED', 'BOARDING', 'english-status', 0);
  expect(moving[0]).toMatchObject({ current: 'D', next: 'E', isFlipping: true });
  expect(moving[0].durationMs).toBe(120);
  const final = orderedTransitionCells('DELAYED', 'BOARDING', 'english-status', mockBurstMs);
  expect(final.map((cell) => cell.current).join('')).toBe('BOARDING');
  expect(final).toHaveLength(boardStatusColumns);
  expect(final.every((cell) => !cell.isFlipping)).toBe(true);
});

test('mock times stay near the captured user clock, wrap midnight, and isolate cached flows', () => {
  expect(mockDepartureAt(0, 0, '00:05', -1).time).toBe('23:53');
  expect(mockDepartureAt(0, 0, '23:55', 1).time).toBe('00:07');
  expect(mockDepartureAt(0, 0, '18:07', -2).time).toBe('17:43');
  expect(mockDepartureAt(0, 999, '18:07', 20).time).toBe('18:52');
  const first = mockRowCellsAt(0, 4000, false, false, 4, '18:07', -1);
  const later = mockRowCellsAt(0, 4000, false, false, 4, '19:07', -1);
  const below = mockRowCellsAt(0, 4000, false, false, 4, '18:07', 1);
  expect(first.time.map((cell) => cell.current).join('')).toBe('17:55');
  expect(later.time.map((cell) => cell.current).join('')).toBe('18:55');
  expect(below.time.map((cell) => cell.current).join('')).toBe('18:19');
  expect(first).toBe(mockRowCellsAt(0, 4000, false, false, 4, '18:07', -1));
  expect(first).not.toBe(later);
});

test('mock schedules use named real IATA fixtures without changing event schedule semantics', () => {
  const airports = new Set(mockAirportFixtures.map((item) => item.code));
  const airlines = new Set(mockAirlineFixtures.map((item) => item.code));
  for (let index = 0; index < 30; index++) {
    const row = mockDepartureAt(index, index % 4, '18:07', 1);
    expect(airports.has(row.country)).toBe(true);
    expect(airlines.has(row.airline)).toBe(true);
    expect(row.country).toMatch(/^[A-Z]{3}$/);
    expect(row.airline).toMatch(/^[A-Z]{2}$/);
    expect(row.flight).toMatch(/^\d{3}$/);
  }
  expect(mockAirlineFixtures.every((item) => item.name.length > item.code.length)).toBe(true);
  expect(mockAirportFixtures.every((item) => item.name.length > item.code.length)).toBe(true);
});
