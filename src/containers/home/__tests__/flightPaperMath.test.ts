import { describe, expect, test } from 'bun:test';
import { createPaperGrid, flightPaperFlex, stepPaperInertia } from '../flightPaperMath';

describe('flight paper', () => {
  test('one indexed surface shares all interior edges between adjacent triangles', () => {
    const { vertices, indices } = createPaperGrid(40, 8);
    expect(vertices.length / 2).toBe(41 * 9);
    expect(indices.length / 3).toBe(640);
    const edges = new Map<string, number>();
    for (let index = 0; index < indices.length; index += 3) {
      const triangle = Array.from(indices.slice(index, index + 3));
      expect(new Set(triangle).size).toBe(3);
      for (let side = 0; side < 3; side += 1) {
        const first = triangle[side];
        const second = triangle[(side + 1) % 3];
        const key = [Math.min(first, second), Math.max(first, second)].join(',');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].filter((count) => count === 1).length).toBe(2 * (40 + 8));
    expect([...edges.values()].every((count) => count === 1 || count === 2)).toBe(true);
  });

  test('lateral acceleration bends opposite travel and releases smoothly after stopping', () => {
    let state = { position: 0, velocity: 0, lateral: 0, lateralVelocity: 0 };
    for (let frame = 1; frame <= 30; frame += 1) {
      state = stepPaperInertia(state, frame * 0.5, 1 / 60);
    }
    expect(state.position).toBeLessThan(-0.05);
    const loaded = state.position;
    state = stepPaperInertia(state, 15, 1 / 60);
    expect(Math.abs(state.position - loaded)).toBeLessThan(0.05);
    for (let frame = 0; frame < 240; frame += 1) {
      state = stepPaperInertia(state, 15, 1 / 60);
    }
    expect(Math.abs(state.position)).toBeLessThan(0.0001);
    expect(Math.abs(state.velocity)).toBeLessThan(0.0001);
  });

  test('reversal changes the trailing-edge response without an instantaneous flip', () => {
    let state = { position: 0, velocity: 0, lateral: 0, lateralVelocity: 0 };
    for (let frame = 1; frame <= 30; frame += 1) {
      state = stepPaperInertia(state, frame * 0.5, 1 / 60);
    }
    const before = state.position;
    state = stepPaperInertia(state, 14.5, 1 / 60);
    expect(Math.abs(state.position - before)).toBeLessThan(0.05);
    for (let frame = 2; frame <= 30; frame += 1) {
      state = stepPaperInertia(state, 15 - frame * 0.5, 1 / 60);
    }
    expect(state.position).toBeGreaterThan(0.05);
  });

  test('contact completely disables deformation with smooth damping', () => {
    expect(flightPaperFlex(0.62)).toBe(1);
    expect(flightPaperFlex(0.71)).toBeCloseTo(0.5, 10);
    expect(flightPaperFlex(0.7999)).toBeLessThan(0.000001);
    for (const progress of [0.8, 0.9, 1, 1.1]) {
      expect(flightPaperFlex(progress)).toBe(0);
    }
  });
});
