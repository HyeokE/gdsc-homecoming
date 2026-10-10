import { describe, expect, test } from 'bun:test';
import { createPaperGeometry, createPaperRenderer, paperRotation, type PaperPose } from '../paperRenderer';

const flat: PaperPose = { tiltX: 0, tiltY: 0, bendX: 0, bendY: 0, grabX: 0, grabY: 0, lift: 0 };

function distance(positions: Float32Array, first: number, second: number): number {
  return Math.hypot(
    positions[first * 3] - positions[second * 3],
    positions[first * 3 + 1] - positions[second * 3 + 1],
    positions[first * 3 + 2] - positions[second * 3 + 2],
  );
}

describe('continuous paper geometry', () => {
  test('a resting sheet is a centered landscape plane with upright texture coordinates', () => {
    const geometry = createPaperGeometry(800, 300, flat);
    expect(geometry.columns).toBeGreaterThanOrEqual(48);
    expect(geometry.rows).toBeGreaterThanOrEqual(20);
    expect(Array.from(geometry.positions.slice(0, 3))).toEqual([-400, -150, 0]);
    expect(Array.from(geometry.positions.slice(-3))).toEqual([400, 150, 0]);
    expect(Array.from(geometry.uvs.slice(0, 2))).toEqual([0, 0]);
    expect(Array.from(geometry.uvs.slice(-2))).toEqual([1, 1]);
    expect(geometry.positions.every((value, index) => index % 3 !== 2 || value === 0)).toBe(true);
    expect(geometry.normals.every((value, index) => index % 3 !== 2 || value === 1)).toBe(true);
  });

  test('triangles share vertices throughout the sheet without disconnected strips or holes', () => {
    const geometry = createPaperGeometry(800, 300, flat);
    const edges = new Map<string, number>();
    const used = new Set<number>();
    for (let triangle = 0; triangle < geometry.indices.length; triangle += 3) {
      const indices = Array.from(geometry.indices.slice(triangle, triangle + 3));
      for (let side = 0; side < 3; side++) {
        const first = indices[side];
        const second = indices[(side + 1) % 3];
        used.add(first);
        if (first === second) {
          throw new Error('Degenerate triangle edge');
        }
        const key = [first, second].sort((a, b) => a - b).join(':');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect(used.size).toBe((geometry.columns + 1) * (geometry.rows + 1));
    expect([...edges.values()].every((count) => count === 1 || count === 2)).toBe(true);
    expect([...edges.values()].filter((count) => count === 1)).toHaveLength(2 * (geometry.columns + geometry.rows));
  });

  test.each([
    { grabX: 1, grabY: -1, bendX: 0.9, bendY: -0.9 },
    { grabX: -1, grabY: -1, bendX: -0.9, bendY: -0.9 },
    { grabX: 1, grabY: 1, bendX: -0.9, bendY: -0.9 },
    { grabX: -1, grabY: 1, bendX: 0.9, bendY: -0.9 },
    { grabX: 0, grabY: 0, bendX: 0.9, bendY: 0.9 },
  ])('strong corner bends preserve all mesh edge lengths without stretching %#', (curl) => {
    const original = createPaperGeometry(800, 300, flat);
    const bent = createPaperGeometry(800, 300, { ...flat, ...curl });
    let minimumRatio = 1;
    let maximumRatio = 1;
    for (let triangle = 0; triangle < bent.indices.length; triangle += 3) {
      for (let side = 0; side < 3; side++) {
        const first = bent.indices[triangle + side];
        const second = bent.indices[triangle + ((side + 1) % 3)];
        const ratio = distance(bent.positions, first, second) / distance(original.positions, first, second);
        minimumRatio = Math.min(minimumRatio, ratio);
        maximumRatio = Math.max(maximumRatio, ratio);
      }
    }
    // Polygon chords can shorten infinitesimally; texture and paper cannot elastically stretch.
    expect(minimumRatio).toBeGreaterThan(0.998);
    expect(maximumRatio).toBeLessThan(1.0001);
    expect(bent.positions.some((value, index) => index % 3 === 2 && Math.abs(value) > 10)).toBe(true);
  });

  test('the grabbed upper-right corner curls while the opposite corner remains anchored', () => {
    const geometry = createPaperGeometry(800, 300, { ...flat, grabX: 1, grabY: -1, bendX: 0.8, bendY: -0.3 });
    expect(geometry.positions[0]).toBeCloseTo(-400, 4);
    expect(geometry.positions[1]).toBeCloseTo(-150, 4);
    expect(geometry.positions[2]).toBe(0);
    expect(geometry.positions.at(-1)!).toBeGreaterThan(20);
    expect(geometry.normals.at(-1)!).toBeLessThan(1);
  });

  test('extreme or invalid input cannot produce invalid positions, normals, or indices', () => {
    const geometry = createPaperGeometry(800, 300, {
      tiltX: Infinity,
      tiltY: NaN,
      bendX: 1e6,
      bendY: -1e6,
      grabX: 90,
      grabY: -90,
      lift: Infinity,
    });
    expect([...geometry.positions, ...geometry.normals, ...geometry.uvs].every(Number.isFinite)).toBe(true);
    expect(Math.max(...geometry.indices)).toBeLessThan(geometry.positions.length / 3);
    let normalError = 0;
    for (let vertex = 0; vertex < geometry.normals.length; vertex += 3) {
      normalError = Math.max(normalError, Math.abs(Math.hypot(...geometry.normals.slice(vertex, vertex + 3)) - 1));
    }
    expect(normalError).toBeLessThan(0.000001);
  });

  test('changing a bend produces continuous positions instead of strip or corner jumps', () => {
    const pose = { ...flat, grabX: 1, grabY: -1, bendX: 0.4, bendY: -0.2 };
    const first = createPaperGeometry(800, 300, pose);
    const second = createPaperGeometry(800, 300, { ...pose, bendX: pose.bendX + 0.00001 });
    const maximumChange = first.positions.reduce(
      (maximum, value, index) => Math.max(maximum, Math.abs(value - second.positions[index])),
      0,
    );
    expect(maximumChange).toBeLessThan(0.01);
  });

  test('crossing a pull direction perpendicular to the grabbed corner does not snap the curl', () => {
    const pose = { ...flat, grabX: 1, grabY: -1, bendX: 0.5, bendY: 0.5 };
    const before = createPaperGeometry(800, 300, { ...pose, bendY: 0.4999 });
    const after = createPaperGeometry(800, 300, { ...pose, bendY: 0.5001 });
    const maximumChange = before.positions.reduce(
      (maximum, value, index) => Math.max(maximum, Math.abs(value - after.positions[index])),
      0,
    );
    expect(maximumChange).toBeLessThan(0.05);
  });
});

describe('paper orientation and fallback', () => {
  test('portrait roll rotates the original ticket plane by 90 degrees without scaling it', () => {
    const rotation = paperRotation({ ...flat, roll: 90 });
    expect(rotation[0]).toBeCloseTo(0, 6);
    expect(rotation[1]).toBeCloseTo(-1, 6);
    expect(rotation[3]).toBeCloseTo(1, 6);
    expect(rotation[4]).toBeCloseTo(0, 6);
    expect(rotation[8]).toBe(1);
  });

  test.each(['tiltX', 'tiltY'] as const)('half a turn around %s exposes the back of the paper', (axis) => {
    const rotation = paperRotation({ ...flat, [axis]: 180 });
    // The third column transforms the front-facing normal (0, 0, 1).
    expect(rotation[6]).toBeCloseTo(0, 6);
    expect(rotation[7]).toBeCloseTo(0, 6);
    expect(rotation[8]).toBeCloseTo(-1, 6);
  });

  test.each([360, -360, 720, -1080])('a complete %s degree turn restores the front and its orientation', (angle) => {
    const rotation = paperRotation({ ...flat, tiltX: angle, tiltY: angle, roll: angle });
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    rotation.forEach((value, index) => expect(value).toBeCloseTo(identity[index], 6));
  });

  test.each([
    { tiltX: 35, tiltY: -25, roll: 90 },
    { tiltX: 160, tiltY: -220, roll: 90 },
    { tiltX: -570, tiltY: 835, roll: -450 },
    { tiltX: Number.MAX_VALUE, tiltY: -Number.MAX_VALUE, roll: Number.MAX_VALUE },
  ])('combined tilt and roll retain lengths, angles, and handedness %#', (angles) => {
    const rotation = paperRotation({ ...flat, ...angles });
    for (let column = 0; column < 3; column++) {
      const vector = rotation.slice(column * 3, column * 3 + 3);
      expect(Math.hypot(...vector)).toBeCloseTo(1, 6);
      for (let other = column + 1; other < 3; other++) {
        const dot = vector.reduce((sum, value, index) => sum + value * rotation[other * 3 + index], 0);
        expect(dot).toBeCloseTo(0, 6);
      }
    }
    const determinant =
      rotation[0] * (rotation[4] * rotation[8] - rotation[7] * rotation[5]) -
      rotation[3] * (rotation[1] * rotation[8] - rotation[7] * rotation[2]) +
      rotation[6] * (rotation[1] * rotation[5] - rotation[4] * rotation[2]);
    expect(determinant).toBeCloseTo(1, 6);
  });

  test('nonfinite angles fall back independently without discarding valid orientation', () => {
    const actual = paperRotation({ ...flat, tiltX: Infinity, tiltY: 180, roll: NaN });
    const expected = paperRotation({ ...flat, tiltY: 180 });
    expect(Array.from(actual)).toEqual(Array.from(expected));

    const reset = paperRotation({ ...flat, tiltX: NaN, tiltY: -Infinity, roll: Infinity });
    expect(Array.from(reset)).toEqual(Array.from(paperRotation(flat)));
  });

  test('unsupported or rejected WebGL initialization returns the caller-controlled fallback', () => {
    const texture = { width: 800, height: 300 } as HTMLCanvasElement;
    expect(createPaperRenderer({ getContext: () => null } as unknown as HTMLCanvasElement, texture)).toBeNull();
    const rejecting = {
      getContext: () => {
        throw new Error('Context unavailable');
      },
    } as unknown as HTMLCanvasElement;
    expect(createPaperRenderer(rejecting, texture)).toBeNull();
  });

  test('a failed shader initialization releases every resource allocated before the failure', () => {
    const program = {};
    const shader = {};
    const deleted: unknown[] = [];
    const context = {
      createProgram: () => program,
      createShader: () => shader,
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => false,
      deleteShader: (value: unknown) => deleted.push(value),
      deleteProgram: (value: unknown) => deleted.push(value),
    };
    const canvas = { getContext: () => context } as unknown as HTMLCanvasElement;
    const texture = { width: 800, height: 300 } as HTMLCanvasElement;
    expect(createPaperRenderer(canvas, texture)).toBeNull();
    expect(deleted).toEqual([shader, program]);
  });
});
