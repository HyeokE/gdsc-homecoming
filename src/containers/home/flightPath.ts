/** A shared tangent at each stop keeps speed continuous, including direction changes. */
export function createFlightPath(stops: readonly number[], values: readonly number[]) {
  const slopes = stops.map((stop, index) => {
    if (index === 0 || index === stops.length - 1) {
      return 0;
    }
    const before = (values[index] - values[index - 1]) / (stop - stops[index - 1]);
    const after = (values[index + 1] - values[index]) / (stops[index + 1] - stop);
    if (before * after <= 0) {
      return 0;
    }
    return (
      Math.sign(before) * Math.min(Math.abs((before + after) / 2), 3 * Math.min(Math.abs(before), Math.abs(after)))
    );
  });
  return (progress: number) => {
    if (progress <= stops[0]) {
      return values[0];
    }
    const end = stops.findIndex((stop) => stop > progress);
    if (end === -1) {
      return values[values.length - 1];
    }
    const start = end - 1;
    const span = stops[end] - stops[start];
    const t = (progress - stops[start]) / span;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * values[start] +
      (t3 - 2 * t2 + t) * span * slopes[start] +
      (-2 * t3 + 3 * t2) * values[end] +
      (t3 - t2) * span * slopes[end]
    );
  };
}
