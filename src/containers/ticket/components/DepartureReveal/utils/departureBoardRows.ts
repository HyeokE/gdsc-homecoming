import type { RollingCell } from '../../../types/rolling';

import { destinations } from '../../../constants/destinations';

// Identifiers verified against official airport/airline sources; schedules remain mock.
export const mockAirlineFixtures = [
  { code: 'KE', name: 'Korean Air' },
  { code: 'OZ', name: 'Asiana Airlines' },
  { code: 'NH', name: 'All Nippon Airways' },
  { code: 'JL', name: 'Japan Airlines' },
  { code: 'SQ', name: 'Singapore Airlines' },
  { code: 'AM', name: 'Aeromexico' },
] as const;
export const mockAirportFixtures = [
  { code: 'NRT', name: 'Tokyo Narita' },
  { code: 'HND', name: 'Tokyo Haneda' },
  { code: 'SIN', name: 'Singapore Changi' },
  { code: 'BKK', name: 'Bangkok Suvarnabhumi' },
  { code: 'TPE', name: 'Taipei Taoyuan' },
  { code: 'HKG', name: 'Hong Kong' },
  { code: 'LHR', name: 'London Heathrow' },
  { code: 'CDG', name: 'Paris Charles de Gaulle' },
  { code: 'SYD', name: 'Sydney' },
] as const;
export const mockAirlines = mockAirlineFixtures.map((airline) => airline.code);
export const boardHomeLabel = 'HOME';
export const boardUserAirlineLabel = 'GDG';
export const boardDestinationColumns = Math.max(
  ...mockAirportFixtures.map((airport) => airport.code.length),
  boardHomeLabel.length,
);
export const boardStatuses = ['DELAYED', 'BOARDING', 'DEPARTED'] as const;
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const glyphCache = new Map<string, string[]>();
const graphemes = (text: string) => {
  const cached = glyphCache.get(text);
  if (cached) {
    return cached;
  }
  const glyphs = Array.from(segmenter.segment(text), (entry) => entry.segment);
  if (glyphCache.size >= 128) {
    glyphCache.delete(glyphCache.keys().next().value!);
  }
  glyphCache.set(text, glyphs);
  return glyphs;
};
export const boardCountryColumns = Math.max(
  1,
  ...destinations.map((destination) => graphemes(destination.wheelLabel).length),
);
export const boardStatusColumns = Math.max(...boardStatuses.map((status) => graphemes(status).length));
export const boardAirlineColumns = Math.max(
  boardUserAirlineLabel.length,
  ...mockAirlines.map((airline) => graphemes(airline).length),
);

// Deterministic, user-requested mock schedules; not live airport records.
export function mockDepartureAt(index: number, generation = 0, baseTime = '15:00', rowOffset = index + 1) {
  const fixture = (index + generation * 3) % 8000;
  const airlineIndex = fixture % mockAirlines.length;
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(baseTime) ? baseTime : '15:00';
  const [hours, minute] = validTime.split(':').map(Number);
  const offset = Math.max(-4, Math.min(4, rowOffset)) * 12;
  const variation = generation === 0 ? 0 : ((generation % 3) - 1) * 3;
  const minutes = (((hours * 60 + minute + offset + variation) % 1440) + 1440) % 1440;
  return {
    time: `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    country: mockAirportFixtures[fixture % mockAirportFixtures.length].code,
    airline: mockAirlines[airlineIndex],
    flight: String(1122 + fixture)
      .slice(-3)
      .padStart(3, '0'),
    status: boardStatuses[(index + generation) % boardStatuses.length],
    gate: `${String.fromCharCode(66 + (fixture % 5))}${String(2 + (fixture % 8)).padStart(2, '0')}`,
  };
}

export const firstMockUpdateMs = 12000;
export const mockFlipMs = 120;
export const mockBurstMs = 3400;
export const mockSleepMs = 11600;
export const mockCycleMs = mockBurstMs + mockSleepMs;
const WHEEL = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:';
/** Advance every changed plate through a fixed physical wheel, never random glyphs. */
export function orderedTransitionCells(from: string, to: string, id: string, elapsed: number): RollingCell[] {
  const before = graphemes(from);
  const after = graphemes(to);
  return Array.from({ length: Math.max(before.length, after.length) }, (_, index) => {
    const source = before[index] ?? ' ';
    const target = after[index] ?? ' ';
    const wheel =
      /^\d$/.test(source) && /^\d$/.test(target)
        ? '0123456789'
        : /^[ A-Z]$/.test(source) && /^[ A-Z]$/.test(target)
          ? ' ABCDEFGHIJKLMNOPQRSTUVWXYZ'
          : WHEEL;
    const sourceIndex = wheel.indexOf(source);
    const targetIndex = wheel.indexOf(target);
    const settled = {
      current: target,
      next: target,
      stepId: `${id}:${index}:settled`,
      isFlipping: false,
      durationMs: 0,
      elapsedMs: 0,
    };
    if (source === target) {
      return settled;
    }
    if (sourceIndex < 0 || targetIndex < 0) {
      const begins = index * 18;
      if (elapsed >= begins + 180) {
        return settled;
      }
      return {
        ...settled,
        current: source,
        next: elapsed < begins ? source : target,
        stepId: `${id}:${index}:direct`,
        isFlipping: elapsed >= begins,
        durationMs: 180,
        elapsedMs: Math.max(0, elapsed - begins),
      };
    }
    const steps = (targetIndex - sourceIndex + wheel.length) % wheel.length;
    const begins = index * 18;
    if (elapsed < begins) {
      return {
        ...settled,
        current: source,
        next: source,
        stepId: `${id}:${index}:waiting`,
      };
    }
    const step = Math.floor((elapsed - begins) / mockFlipMs);
    if (step >= steps) {
      return settled;
    }
    return {
      current: wheel[(sourceIndex + step) % wheel.length],
      next: wheel[(sourceIndex + step + 1) % wheel.length],
      stepId: `${id}:${index}:${step}`,
      isFlipping: true,
      durationMs: mockFlipMs,
      elapsedMs: (elapsed - begins) % mockFlipMs,
    };
  });
}

const settledRows = new Map<
  string,
  Record<'time' | 'country' | 'airline' | 'flight' | 'gate' | 'status', RollingCell[]>
>();

export function mockRowCellsAt(
  index: number,
  elapsed: number,
  animate: boolean,
  initialReveal: boolean,
  rowCount = 6,
  baseTime = '15:00',
  rowOffset = index + 1,
) {
  const count = Math.max(1, rowCount);
  const cycle = animate && elapsed >= firstMockUpdateMs ? Math.floor((elapsed - firstMockUpdateMs) / mockCycleMs) : -1;
  const generation = cycle >= index ? Math.floor((cycle - index) / count) + 1 : 0;
  const target = mockDepartureAt(index, generation, baseTime, rowOffset);
  const previous = mockDepartureAt(index, Math.max(0, generation - 1), baseTime, rowOffset);
  const within = generation
    ? cycle % count === index
      ? (elapsed - firstMockUpdateMs) % mockCycleMs
      : mockBurstMs
    : elapsed;
  const stable = generation ? within >= mockBurstMs : !animate || !initialReveal || elapsed >= 1400;
  const cacheKey = `${index}:${generation}:${baseTime}:${rowOffset}`;
  if (stable && settledRows.has(cacheKey)) {
    return settledRows.get(cacheKey)!;
  }
  const cells = (field: keyof typeof target) =>
    generation
      ? orderedTransitionCells(previous[field], target[field], `mock:${index}:${field}:${generation}`, within)
      : mockCellsAt(target[field], `mock:${index}:${field}:0`, elapsed, index, animate && initialReveal);
  const row = {
    time: cells('time'),
    country: cells('country'),
    airline: cells('airline'),
    flight: cells('flight'),
    gate: cells('gate'),
    status: cells('status'),
  };
  if (stable) {
    if (settledRows.size >= 128) {
      settledRows.delete(settledRows.keys().next().value!);
    }
    settledRows.set(cacheKey, row);
  }
  return row;
}

/** Count only complete physical rows, including all gaps between them. */
export function fittingMockRows(availableHeight: number, rowHeight: number, rowGap: number, actualRows: number) {
  if (rowHeight <= 0 || !Number.isFinite(availableHeight)) {
    return 0;
  }
  const total = Math.floor((Math.max(0, availableHeight) + rowGap) / (rowHeight + rowGap));
  return Math.max(0, total - actualRows);
}

/** A few numeric plates advance three ordered positions, then stay settled. */
export function mockCellsAt(text: string, id: string, elapsed: number, row: number, animate: boolean): RollingCell[] {
  const glyphs = graphemes(text);
  const selected = glyphs.findLastIndex((glyph) => /^\d$/.test(glyph));
  return glyphs.map((target, index) => {
    const settled = {
      current: target,
      next: target,
      stepId: `${id}:${index}:settled`,
      isFlipping: false,
      durationMs: 0,
      elapsedMs: 0,
    };
    if (!animate || index !== selected || row % 2 !== 0) {
      return settled;
    }
    const begins = 650 + (row % 3) * 90;
    const durations = [100, 140, 180];
    let start = begins;
    const startDigit = (Number(target) + 7) % 10;
    if (elapsed < begins) {
      return {
        ...settled,
        current: String(startDigit),
        next: String(startDigit),
        stepId: `${id}:${index}:waiting`,
      };
    }
    for (let step = 0; step < durations.length; step++) {
      if (elapsed < start + durations[step]) {
        return {
          current: String((startDigit + step) % 10),
          next: String((startDigit + step + 1) % 10),
          stepId: `${id}:${index}:${step}`,
          isFlipping: true,
          durationMs: durations[step],
          elapsedMs: elapsed - start,
        };
      }
      start += durations[step];
    }
    return settled;
  });
}

/** Idle intervals sleep; RAF is needed only while visible plates can be moving. */
export function mockAnimationWindow(elapsed: number, count: number) {
  if (elapsed < 1400) {
    return { active: true, nextAt: 1400 };
  }
  if (!count) {
    return { active: false, nextAt: Number.POSITIVE_INFINITY };
  }
  if (elapsed < firstMockUpdateMs) {
    return { active: false, nextAt: firstMockUpdateMs };
  }
  const cycleStart = firstMockUpdateMs + Math.floor((elapsed - firstMockUpdateMs) / mockCycleMs) * mockCycleMs;
  return {
    active: elapsed < cycleStart + mockBurstMs,
    nextAt: cycleStart + mockCycleMs,
  };
}
