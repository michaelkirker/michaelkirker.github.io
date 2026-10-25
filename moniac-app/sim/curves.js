// Piecewise-linear "cut-out" curves, as on Phillips' perspex plates.
// A curve maps x -> y through control points; it can be shifted (dx, dy), which is
// how the machine models a spontaneous shift of a behavioural function.

export function makeCurve(points, { extrapolate = 'linear' } = {}) {
  if (points.length < 2) throw new Error('curve needs at least two points');
  const pts = points.map(([x, y]) => [x, y]).sort((a, b) => a[0] - b[0]);
  const state = { dx: 0, dy: 0 };
  const seg = (x, i) => {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  };
  const f = (xIn) => {
    const x = xIn - state.dx;
    const n = pts.length;
    if (x <= pts[0][0]) {
      return (extrapolate === 'linear' ? seg(x, 0) : pts[0][1]) + state.dy;
    }
    if (x >= pts[n - 1][0]) {
      return (extrapolate === 'linear' ? seg(x, n - 2) : pts[n - 1][1]) + state.dy;
    }
    let i = 0;
    while (x > pts[i + 1][0]) i++;
    return seg(x, i) + state.dy;
  };
  f.shift = (dx = 0, dy = 0) => { state.dx = dx; state.dy = dy; return f; };
  f.points = pts;
  return f;
}

// Straight line through (x0, y0) with the given slope, as a plain function.
export const linear = (x0, y0, slope) => (x) => y0 + slope * (x - x0);
