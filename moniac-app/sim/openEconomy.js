// Phillips (1950), Section II, Fig. 4: open economy with government.
//
// Stocks (tanks):   M1 active balances, M2 idle balances, M3 foreign-owned (sterling) balances,
//                   R  reserves of the exchange equalisation account (a bookkeeping total).
// Flows:            Y income, T taxation, Yd = Y - T income after tax, C consumption, S saving
//                   (the residual of Yd), I investment, G government spending,
//                   D = C + I + G domestic expenditure, Im imports, Ex exports,
//                   E = D - Im + Ex total expenditure on home goods.
//
// Identities (paper p.301-303):
//   dM1/dt = E - Y
//   dM2/dt = S + T - I - G (+ money supply)   a budget deficit is met from idle balances, and a
//                                              surplus lets idle balances build up
//   dM3/dt = Im - Ex (+ equalisation account flow)
//   M1 + M2 + M3 - R is constant unless money is poured in by hand or the money-supply tap is open.
// Hypotheses:
//   Y   = M1 / P
//   T   = tax(Y) + dT                     income-taxation curve
//   C   = consume(Yd_eff, r) - dS         propensity to consume + interest-rate-consumption curve
//   S   = Yd - C                          residual
//   I   = invest(r) + dI + Iind           marginal efficiency of capital; Iind is the accelerator
//   G   = govt(Y) + dG                    can fall with income (automatic stabiliser)
//   r   = liquidity(M2)                   interest rate from the M2 level
//   e   = sterling(M3)                    exchange rate from the M3 level (more sterling abroad, lower e)
//   Im  = imports(D_eff, e)               propensity to import + exchange-rate-imports curve
//   Ex  = exports(e) + dEx                exchange-rate-exports curve; dEx is foreign demand
// Optional lags ("psychological" lags from the servo-mechanisms): Yd_eff and D_eff are first-order
// lags of Yd and D with time constants tauC and tauM (years); 0 means no lag.
//
// Money-supply modes (M2):  'constant-money' | 'constant-rate' | 'tap'
// Exchange-rate regimes:    'floating' | 'managed' (equalisation account tap) | 'pegged'
//
// State vector: [M1, M2, M3, Iind, Ydl, Dl, R].

export function makeOpenEconomy({
  P, tax, consume, invest, govt, imports, exports, liquidity, sterling,
  r0 = 0, e0 = 0,
  beta = 0, gamma = 1, tauC = 0, tauM = 0,
  moneyMode = 'constant-money', tapK = 1, tapTarget = 0,
  fxMode = 'floating', fxK = 1, fxTarget = 0,
  dI = 0, dS = 0, dG = 0, dT = 0, dEx = 0,
}) {
  const val = (x, t) => (typeof x === 'function' ? x(t) : x);
  const pos = (x) => Math.max(0, x);

  const observe = (t, [M1, M2, M3, Iind, Ydl, Dl, R]) => {
    const Y = M1 / P;
    const T = pos(tax(Y) + val(dT, t));
    const Yd = Y - T;
    const Ydeff = tauC > 0 ? Ydl : Yd;
    const r = moneyMode === 'constant-rate' ? r0 : liquidity(M2);
    const C = consume(Ydeff, r) - val(dS, t);
    const S = Yd - C;
    const Iauto = invest(r) + val(dI, t);
    const I = Iauto + Iind;
    const G = pos(govt(Y) + val(dG, t));
    const D = C + I + G;
    const Deff = tauM > 0 ? Dl : D;
    const e = fxMode === 'pegged' ? e0 : sterling(M3);
    const Im = pos(imports(Deff, e));
    const Ex = pos(exports(e) + val(dEx, t));
    const E = D - Im + Ex;
    return {
      t, M1, M2, M3, R, Iind, Ydl, Dl,
      Y, T, Yd, r, e, C, S, I, Iauto, G, D, Im, Ex, E,
      budget: T - G, trade: Ex - Im,
    };
  };

  const deriv = (t, y) => {
    const o = observe(t, y);
    const dM1 = o.E - o.Y;
    const dY = dM1 / P;
    const moneyFlow = moneyMode === 'tap' ? tapK * (tapTarget - y[1]) : 0;
    const dM2 = o.S + o.T - o.I - o.G + moneyFlow;
    let dM3, dR;
    if (fxMode === 'pegged') { dM3 = 0; dR = o.Ex - o.Im; }
    else if (fxMode === 'managed') {
      const f = fxK * (fxTarget - y[2]);
      dM3 = o.Im - o.Ex + f; dR = f;
    } else { dM3 = o.Im - o.Ex; dR = 0; }
    const dIind = (beta * dY - y[3]) / gamma;
    const dYdl = tauC > 0 ? (o.Yd - y[4]) / tauC : 0;
    const dDl = tauM > 0 ? (o.D - y[5]) / tauM : 0;
    return [dM1, dM2, dM3, dIind, dYdl, dDl, dR];
  };

  return { deriv, observe, params: { P, beta, gamma, tauC, tauM, moneyMode, fxMode } };
}

// Closed-form results for the linear model with the interest rate and exchange rate pegged,
// no lags and no accelerator. Deviations from equilibrium.
//   k = 1 - (1 - mu) (c (1 - t) - g)
//   A = (1 - mu)(dI + dG - c dT - dS) + dEx
//   Y(t) = (A / k) (1 - exp(-k t / P))
export const openAnalytic = {
  k: ({ mu, c, t, g }) => 1 - (1 - mu) * (c * (1 - t) - g),
  A: ({ mu, c, dI = 0, dG = 0, dT = 0, dS = 0, dEx = 0 }) => (1 - mu) * (dI + dG - c * dT - dS) + dEx,
  income(p, time) {
    const k = openAnalytic.k(p), A = openAnalytic.A(p);
    return (A / k) * (1 - Math.exp((-k * time) / p.P));
  },
  multiplier: (p, shock) => openAnalytic.A({ ...p, ...shock }) / openAnalytic.k(p),
};
