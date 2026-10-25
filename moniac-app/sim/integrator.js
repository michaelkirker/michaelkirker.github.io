// Generic fixed-step RK4 integrator for autonomous-or-time-dependent ODE systems.
// State is a plain array of numbers; `deriv(t, y)` returns an array of derivatives.

export function rk4Step(deriv, t, y, dt) {
  const n = y.length;
  const add = (a, b, h) => a.map((v, i) => v + h * b[i]);
  const k1 = deriv(t, y);
  const k2 = deriv(t + dt / 2, add(y, k1, dt / 2));
  const k3 = deriv(t + dt / 2, add(y, k2, dt / 2));
  const k4 = deriv(t + dt, add(y, k3, dt));
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = y[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return out;
}

// Integrate from t0 to t1 with step dt (last step shortened to land on t1).
// Returns {t: number[], y: number[][]} including the initial point.
// `clamp(y)` (optional) is applied after every step to enforce physical limits.
export function integrate(deriv, y0, t0, t1, dt, clamp) {
  const ts = [t0];
  const ys = [y0.slice()];
  let t = t0;
  let y = y0.slice();
  while (t < t1 - 1e-12) {
    const h = Math.min(dt, t1 - t);
    y = rk4Step(deriv, t, y, h);
    if (clamp) y = clamp(y);
    t += h;
    ts.push(t);
    ys.push(y);
  }
  return { t: ts, y: ys };
}
