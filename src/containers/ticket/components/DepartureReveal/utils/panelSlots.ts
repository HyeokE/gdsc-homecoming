import type { RollingCell } from '../../../types/rolling';

function blankRollingCell(index: number): RollingCell {
  return {
    current: ' ',
    next: ' ',
    stepId: `padding:${index}`,
    isFlipping: false,
    elapsedMs: 0,
    durationMs: 0,
  };
}

export function makePanelRows(cells: readonly RollingCell[], columns: number, minRows = 1): RollingCell[][] {
  if (!Number.isSafeInteger(columns) || columns <= 0) {
    throw new RangeError('columns must be a positive integer');
  }
  if (!Number.isSafeInteger(minRows) || minRows < 0) {
    throw new RangeError('minRows must be a non-negative integer');
  }
  const rowCount = Math.max(minRows, Math.ceil(cells.length / columns));
  return Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const index = row * columns + column;
      return cells[index] ?? blankRollingCell(index);
    }),
  );
}
