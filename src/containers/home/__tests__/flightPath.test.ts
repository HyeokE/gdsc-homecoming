import { expect, test } from 'bun:test';
import { createFlightPath } from '../flightPath';

const stops = [0, 0.16, 0.32, 0.48, 0.62, 0.73, 0.8, 1];
const values = [8, -14, -11, -6, -2, 0, 0, 0];
const path = createFlightPath(stops, values);

test('flight speed is continuous on both sides of every waypoint', () => {
  const epsilon = 0.000001;
  stops.forEach((stop, index) => {
    expect(path(stop)).toBeCloseTo(values[index], 8);
    const incoming = (path(stop) - path(stop - epsilon)) / epsilon;
    const outgoing = (path(stop + epsilon) - path(stop)) / epsilon;
    expect(Math.abs(incoming - outgoing)).toBeLessThan(0.02);
  });
});

test('flight makes one turn and settles without overshooting the center', () => {
  for (let index = 1; index <= 1000; index += 1) {
    const progress = index / 1000;
    const difference = path(progress) - path(progress - 0.001);
    expect(progress <= 0.16 ? difference <= 0 : difference >= 0).toBe(true);
  }
  expect(path(0.8)).toBe(0);
  expect(path(1.1)).toBe(0);
});
