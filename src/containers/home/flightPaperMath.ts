export function flightPaperFlex(progress: number) {
  const contact = Math.min(1, Math.max(0, (progress - 0.62) / 0.18));
  return 1 - contact * contact * (3 - 2 * contact);
}

export interface PaperInertia {
  position: number;
  velocity: number;
  lateral: number;
  lateralVelocity: number;
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Acceleration loads the paper; a damped spring releases it after a reversal. */
export function stepPaperInertia(state: PaperInertia, lateral: number, seconds: number): PaperInertia {
  const dt = Math.min(1 / 30, Math.max(1 / 240, seconds));
  const measuredVelocity = clamp((lateral - state.lateral) / dt, 180);
  const lateralVelocity = state.lateralVelocity + (measuredVelocity - state.lateralVelocity) * (1 - Math.exp(-10 * dt));
  const acceleration = clamp((lateralVelocity - state.lateralVelocity) / dt, 700);
  const target = clamp(-acceleration / 650 - lateralVelocity / 400, 1);
  const velocity = state.velocity + (64 * (target - state.position) - 13 * state.velocity) * dt;
  return { position: clamp(state.position + velocity * dt, 1), velocity, lateral, lateralVelocity };
}

/** Indexed shared vertices avoid cracks and keep the GPU buffers immutable. */
export function createPaperGrid(columns = 40, rows = 8) {
  const vertices = new Float32Array((columns + 1) * (rows + 1) * 2);
  const indices = new Uint16Array(columns * rows * 6);
  let vertex = 0;
  let index = 0;
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      vertices[vertex++] = column / columns;
      vertices[vertex++] = row / rows;
      if (column < columns && row < rows) {
        const top = row * (columns + 1) + column;
        indices.set([top, top + 1, top + columns + 1, top + 1, top + columns + 2, top + columns + 1], index);
        index += 6;
      }
    }
  }
  return { vertices, indices };
}
