// Phillips (1950), Section I.1-I.5, Fig. 3: closed economy, no government.
//
// Stocks (tanks):  M1 active balances,  M2 idle balances.
// Flows:           Y income, C consumption, S savings, I investment, E = C + I.
//
// Identities (paper eq. 1, 7):
//   Y = C + S,   E = C + I,   dM1/dt = E - Y = I - S,   dM2/dt = S - I (+ money supply)
// Hypotheses:
//   Y  = M1 / P                         P = circulation period (years)       (eq. 2)
//   r  = liquidity(M2)                  interest rate read from the M2 level (tank shape)
//   S  = saveY(Y) + saveR(r) + dS(t)    propensity to save + interest-savings curve
//   I  = mec(r) + dI(t) + Iind          marginal efficiency of capital + shift + induced
// Accelerator (eq. 13-14):
//   Ibar = beta dY/dt,   gamma dIind/dt = Ibar - Iind
//
// Money supply modes:
//   'constant-money' : no flow into M2 (tap closed)            -> paper section 3
//   'constant-rate'  : interest rate pegged at r0 by the money supply   -> section 2
//   'tap'            : flow into M2 = tapK * (tapTarget - M2)   -> adjustable money supply
//
// State vector: [M1, M2, Iind].

export function makeClosedEconomy({
  P,
  saveY,
  saveR = () => 0,
  mec,
  liquidity,
  r0 = 0,
  beta = 0,
  gamma = 1,
  mode = 'constant-money',
  tapK = 1,
  tapTarget = 0,
  dI = 0,
  dS = 0,
  y0,
  clampNonNegative = false,
}) {
  const val = (x, t) => (typeof x === 'function' ? x(t) : x);

  const observe = (t, [M1, M2, Iind]) => {
    const Y = M1 / P;
    const r = mode === 'constant-rate' ? r0 : liquidity(M2);
    const S = saveY(Y) + saveR(r) + val(dS, t);
    const Iauto = mec(r) + val(dI, t);
    const I = Iauto + Iind;
    const C = Y - S;
    const E = C + I;
    return { t, M1, M2, Y, r, S, I, Iauto, Iind, C, E, dM1: I - S };
  };

  const deriv = (t, y) => {
    const o = observe(t, y);
    const dM1 = o.I - o.S;
    const dY = dM1 / P;
    const money = mode === 'tap' ? tapK * (tapTarget - y[1]) : 0;
    const dM2 = -dM1 + money;
    const dIind = (beta * dY - y[2]) / gamma;
    return [dM1, dM2, dIind];
  };

  const clamp = clampNonNegative ? (y) => [Math.max(0, y[0]), Math.max(0, y[1]), y[2]] : undefined;

  return { deriv, observe, clamp, y0, params: { P, beta, gamma, mode, r0 } };
}

// Linear version used in the paper's algebra, expressed around a base equilibrium
// (Y0, r0, M20, S0). Parameters are the paper's: sigma, xi, eta, lambda, P, beta, gamma.
//   S = S0 + sigma (Y - Y0) + xi (r - r0)
//   I = S0 + eta (r - r0)
//   r = r0 + (M2 - M20) / lambda        (lambda < 0: rate falls as idle balances rise)
export function makeLinearClosedEconomy({
  P, sigma, xi, eta, lambda,
  beta = 0, gamma = 1,
  base = { Y0: 0, r0: 0, M20: 0, S0: 0 },
  ...rest
}) {
  const { Y0, r0, M20, S0 } = base;
  return makeClosedEconomy({
    P,
    saveY: (Y) => S0 + sigma * (Y - Y0),
    saveR: (r) => xi * (r - r0),
    mec: (r) => S0 + eta * (r - r0),
    liquidity: (M2) => r0 + (M2 - M20) / lambda,
    r0, beta, gamma,
    y0: [P * Y0, M20, 0],
    ...rest,
  });
}

// Closed-form results from the paper (deviations from equilibrium).
export const analytic = {
  // eq. 5: multiplier at constant interest rate
  multiplierConstantRate: ({ P, sigma, dI }, t) => (dI / sigma) * (1 - Math.exp((-sigma * t) / P)),
  // eq. 12: multiplier at constant quantity of money
  multiplierConstantMoney: ({ P, sigma, xi, eta, lambda, dI }, t) => {
    const k = sigma / P + (eta - xi) / lambda;
    const den = sigma + (P / lambda) * (eta - xi);
    return (dI / den) * (1 - Math.exp(-k * t));
  },
  // p.300: path of income after a step increase dM2 in idle balances
  incomeAfterMoneyIncrease: ({ P, sigma, xi, eta, lambda, dM2 }, t) => {
    const k = sigma / P + (eta - xi) / lambda;
    return dM2 * ((eta - xi) / (sigma * lambda + P * (eta - xi))) * (1 - Math.exp(-k * t));
  },
  // p.300, with the dimensionally consistent denominator (see docs/conventions.md)
  rateAfterMoneyIncrease: ({ P, sigma, xi, eta, lambda, dM2 }, t) => {
    const k = sigma / P + (eta - xi) / lambda;
    const g = (eta - xi) / (sigma * lambda + P * (eta - xi));
    return dM2 * (1 / lambda - ((P * g) / lambda) * (1 - Math.exp(-k * t)));
  },
  // lag L of income behind expenditure (p.295): -(P/sigma) ln(1 - sigma)
  distributedLag: ({ P, sigma }) => (sigma === 0 ? P : -(P / sigma) * Math.log(1 - sigma)),
  // eq. 15 stability/oscillation: roots of gamma P x^2 + (gamma sigma + P - beta) x + sigma = 0
  acceleratorDiscriminant: ({ P, sigma, beta, gamma }) =>
    (gamma * sigma + P - beta) ** 2 - 4 * gamma * P * sigma,
  // Income path at constant rate with accelerator (eq. 15), Y(0)=0, Y'(0)=dI/P
  incomeWithAccelerator: ({ P, sigma, beta, gamma, dI }, t) => {
    const a = gamma * P, b = gamma * sigma + P - beta, c = sigma;
    const Yinf = dI / sigma;
    const z0 = -Yinf, dz0 = dI / P; // z = Y - Yinf
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      const al = -b / (2 * a), w = Math.sqrt(-disc) / (2 * a);
      const A = z0, B = (dz0 - al * z0) / w;
      return Yinf + Math.exp(al * t) * (A * Math.cos(w * t) + B * Math.sin(w * t));
    }
    const s = Math.sqrt(disc), r1 = (-b + s) / (2 * a), r2 = (-b - s) / (2 * a);
    if (Math.abs(r1 - r2) < 1e-12) return Yinf + (z0 + (dz0 - r1 * z0) * t) * Math.exp(r1 * t);
    const A = (dz0 - r2 * z0) / (r1 - r2), B = z0 - A;
    return Yinf + A * Math.exp(r1 * t) + B * Math.exp(r2 * t);
  },
};
