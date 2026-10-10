import { describe, expect, test } from 'bun:test';
import { makePanelRows } from '../utils/panelSlots';
import { createRollingPlan, rollingStateAt } from '../../../utils/orderedWheel';
import { departurePreview } from '../../../fixtures/departurePreview';
import type { RollingCell } from '../../../types/rolling';

function cellsFor(name: string): RollingCell[] {
  const plan = createRollingPlan({ ...departurePreview, passengerName: name });
  return rollingStateAt(plan, plan.readyAt, 1).passenger;
}

describe('fixed full-panel slots', () => {
  test('preserves original objects and order with identical row widths', () => {
    const cells = Object.freeze(cellsFor('ABCDE'));
    cells.forEach(Object.freeze);
    const rows = makePanelRows(cells, 3);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.length === 3)).toBe(true);
    rows
      .flat()
      .slice(0, cells.length)
      .forEach((cell, index) => {
        expect(cell).toBe(cells[index]);
      });
    expect(rows[1][2]).toEqual({
      current: ' ',
      next: ' ',
      stepId: 'padding:5',
      isFlipping: false,
      elapsedMs: 0,
      durationMs: 0,
    });
  });

  test('one input space occupies one slot and graphemes stay intact', () => {
    const cells = cellsFor('A e\u0301👩🏽‍💻B');
    const rows = makePanelRows(cells, 2);
    expect(rows.map((row) => row.map((cell) => cell.current))).toEqual([
      ['A', ' '],
      ['e\u0301', '👩🏽‍💻'],
      ['B', ' '],
    ]);
    expect(rows[0][1]).toBe(cells[1]);
    expect(rows[1][0]).toBe(cells[2]);
    expect(rows[1][1]).toBe(cells[3]);
  });

  test('wraps long input into full rows without dropping any original cell', () => {
    const name = 'JASON JEONG VERY LONG e\u0301 👩🏽‍💻 NAME';
    const cells = cellsFor(name);
    const rows = makePanelRows(cells, 6, 2);
    expect(rows.length).toBe(Math.ceil(cells.length / 6));
    expect(rows.every((row) => row.length === 6)).toBe(true);
    expect(
      rows
        .flat()
        .slice(0, cells.length)
        .map((cell) => cell.current)
        .join(''),
    ).toBe(name);
    expect(rows.flat().slice(0, cells.length)).toEqual(cells);
  });

  test('empty banks honor minRows and keep unique stable blank step keys', () => {
    const rows = makePanelRows([], 4, 3);
    const repeated = makePanelRows([], 4, 3);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.length === 4)).toBe(true);
    const blanks = rows.flat();
    expect(new Set(blanks.map((cell) => cell.stepId)).size).toBe(12);
    expect(blanks.map((cell) => cell.stepId)).toEqual(repeated.flat().map((cell) => cell.stepId));
    expect(
      blanks.every(
        (cell) =>
          cell.current === ' ' &&
          cell.next === ' ' &&
          !cell.isFlipping &&
          cell.durationMs === 0 &&
          cell.elapsedMs === 0,
      ),
    ).toBe(true);
    expect(makePanelRows([], 4)).toHaveLength(1);
  });

  test('padding slots exist before reveal and keep their keys after settling', () => {
    const plan = createRollingPlan(departurePreview);
    const before = makePanelRows(rollingStateAt(plan, 0, 1).country, 8);
    const after = makePanelRows(rollingStateAt(plan, plan.readyAt, 1).country, 8);
    expect(before[0]).toHaveLength(8);
    expect(before[0].slice(5)).toEqual(after[0].slice(5));
    expect(before[0].slice(5).every((cell) => !cell.isFlipping)).toBe(true);
  });

  test('rejects invalid columns or minimum rows with an explicit error', () => {
    for (const columns of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => makePanelRows([], columns)).toThrow(RangeError);
    }
    for (const minRows of [-1, 1.5, Number.NaN]) {
      expect(() => makePanelRows([], 4, minRows)).toThrow(RangeError);
    }
  });
});
