// Phillips (1950), Section I, Fig. 2: the single-commodity (Boulding) model.
//
// Hydraulic reading: a tank of stocks w is filled by production flow u (a valve
// driven by a curve of price) and drained by consumption flow v. Price p is read
// from the water level, via the tank's end-wall shape (the demand curve for stocks).
//
// Linear version used in the paper (all variables are deviations from equilibrium):
//   dw/dt = u - v          (identity)
//   u = l p,  v = m p,  w = n p   (hypotheses; n < 0 because price falls as stocks rise)
// Sign convention: l > 0 (production rises with price), m < 0 (consumption falls with
// price), n < 0 (price falls as stocks rise). Stable iff l > m (given n < 0), which
// holds automatically for these signs.
//
// State vector: [w]. Shocks are expressed as:
//   dv : step change in spontaneous consumption (consumption curve shifted right by dv)
//   du : step change in spontaneous production
//   dp : immediate price change from a shift in the demand curve for stocks
//        (the tank's end wall is moved; stocks are unchanged at the instant of the shift)

export function makeCommodityModel({ l, m, n, dv = 0, du = 0, dp = 0 }) {
  if (!(n < 0)) throw new Error('n must be negative (price falls as stocks rise)');
  // Demand shift s: price = (w - s) / n. Choose s so that p(0) = dp when w(0) = 0.
  const s = -n * dp;
  const price = (w) => (w - s) / n;
  const production = (w) => du + l * price(w);
  const consumption = (w) => dv + m * price(w);
  const deriv = (_t, [w]) => [production(w) - consumption(w)];
  return {
    params: { l, m, n, dv, du, dp },
    y0: [0],
    deriv,
    price,
    production,
    consumption,
    stable: l > m,
    // Time constant (positive when stable): n / (l - m) is negative for n<0, l>m.
    timeConstant: Math.abs(n / (l - m)),
  };
}

// Closed-form solutions from the paper (and derived for the demand-shift case).
// k = (l - m) / n  (negative when stable).
export function analyticPrice({ l, m, n, dv = 0, du = 0, dp = 0 }, t) {
  const k = (l - m) / n;
  const ek = Math.exp(k * t);
  // Spontaneous flow shocks: p = (dv - du)/(l - m) * (1 - e^{kt})
  const flowPart = ((dv - du) / (l - m)) * (1 - ek);
  // Demand-curve shift: price jumps by dp then decays back to its old equilibrium.
  const demandPart = dp * ek;
  return flowPart + demandPart;
}
