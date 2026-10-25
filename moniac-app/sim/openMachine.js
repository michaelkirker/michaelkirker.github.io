// Runtime wrapper for the open-economy model (Fig. 4): owns state and settings, advances time,
// and lets settings change while running. All curves pivot about the base equilibrium, so an
// undisturbed machine stays at rest whatever the settings.
import { rk4Step } from './integrator.js';
import { makeOpenEconomy } from './openEconomy.js';

export const OBASE = {
  Y0: 100, r0: 4, M20: 50, e0: 100, M30: 50,
  T0: 20, G0: 20, C0: 72, I0: 8, Im0: 15, Ex0: 15,
};
OBASE.Yd0 = OBASE.Y0 - OBASE.T0;
OBASE.D0 = OBASE.C0 + OBASE.I0 + OBASE.G0;
export const OLIMITS = { Ymax: 250, rMax: 12, eLo: 50, eHi: 150 };

export const ODEFAULTS = {
  P: 0.3,            // circulation period, years
  c: 0.8,            // marginal propensity to consume out of income after tax
  t: 0.2,            // tax rate: T = t Y (the base equilibrium has T = 20 at Y = 100, so t = 0.2 leaves it at rest;
                     // any other rate is a fiscal shock)
  g: 0,              // automatic stabiliser: government spending falls by g per unit of income
  mu: 0.15,          // marginal propensity to import (out of domestic expenditure)
  mx: 0.2,           // imports rise this much per point of exchange rate (sterling's value)
  ex: -0.2,          // exports change this much per point of exchange rate (<0)
  kappa: -1,         // sterling preference: sterling balances per point of exchange rate (<0)
  xi: 0.3,           // saving rises by this much per 1% interest rate
  eta: -1,           // investment falls by this much per 1% interest rate (<0)
  lambda: -10,       // liquidity preference: idle balances per 1% of rate (<0)
  beta: 0, gamma: 0.5,
  tauC: 0,           // consumption lag, years (0 = none)
  tauM: 0,           // import lag, years (0 = none)
  moneyMode: 'constant-money', tapTarget: 50, tapK: 1.5,
  fxMode: 'floating', fxTarget: 50, fxK: 1.5,
  dI: 0, dS: 0, dG: 0, dT: 0, dEx: 0,
};

export class OpenMachine {
  constructor(settings = {}) { this.reset(settings); }

  reset(settings = {}) {
    this.s = { ...ODEFAULTS, ...settings };
    this.t = 0;
    this.y = [this.s.P * OBASE.Y0, OBASE.M20, OBASE.M30, 0, OBASE.Yd0, OBASE.D0, 0];
    this._build();
  }

  _build() {
    const s = this.s, b = OBASE;
    this.liquidity = (M2) => Math.max(0, b.r0 + (M2 - b.M20) / s.lambda);
    this.sterling = (M3) => Math.max(0, b.e0 + (M3 - b.M30) / s.kappa);
    // plate curves for display (shifts included)
    this.curves = {
      tax: (Y) => Math.max(0, s.t * Y + s.dT),
      consume: (Yd) => b.C0 + s.c * (Yd - b.Yd0) - s.dS,
      invest: (r) => b.I0 + s.eta * (r - b.r0) + s.dI,
      imports: (D) => Math.max(0, b.Im0 + s.mu * (D - b.D0)),
      importsFx: (e) => Math.max(0, b.Im0 + s.mx * (e - b.e0)),
      exportsFx: (e) => Math.max(0, b.Ex0 + s.ex * (e - b.e0) + s.dEx),
      // the second plate of each two-plate gate, and the plates that have no float of their own
      govt: (Y) => Math.max(0, b.G0 - s.g * (Y - b.Y0) + s.dG),          // government gate: G against income
      consumeR: (r) => -s.xi * (r - b.r0),                                  // consumption gate, second plate: interest-rate effect
      importsE: (e) => s.mx * (e - b.e0),                                   // imports gate, second plate: exchange-rate effect
      exportsE: (e) => s.ex * (e - b.e0),                                   // exports gate, second plate: exchange-rate effect
      exportsDem: () => Math.max(0, b.Ex0 + s.dEx),                         // exports gate, first plate: foreign demand (set by hand)
    };
    this.model = makeOpenEconomy({
      P: s.P,
      tax: (Y) => s.t * Y,
      consume: (Yd, r) => b.C0 + s.c * (Yd - b.Yd0) - s.xi * (r - b.r0),
      invest: (r) => b.I0 + s.eta * (r - b.r0),
      govt: (Y) => b.G0 - s.g * (Y - b.Y0),
      imports: (D, e) => b.Im0 + s.mu * (D - b.D0) + s.mx * (e - b.e0),
      exports: (e) => b.Ex0 + s.ex * (e - b.e0),
      liquidity: this.liquidity, sterling: this.sterling,
      r0: b.r0, e0: b.e0,
      beta: s.beta, gamma: s.gamma, tauC: s.tauC, tauM: s.tauM,
      moneyMode: s.moneyMode, tapK: s.tapK, tapTarget: s.tapTarget,
      fxMode: s.fxMode, fxK: s.fxK, fxTarget: s.fxTarget,
      dI: s.dI, dS: s.dS, dG: s.dG, dT: s.dT, dEx: s.dEx,
    });
  }

  // Change settings mid-run. Income stays continuous when P changes; a lag that has just been
  // switched on starts from the current value, so nothing jumps.
  set(changes) {
    const Y = this.y[0] / this.s.P;
    const o = this.model.observe(this.t, this.y);
    const hadC = this.s.tauC > 0, hadM = this.s.tauM > 0;
    Object.assign(this.s, changes);
    this.y[0] = this.s.P * Y;
    // Lag states are only (re)started when a lag is switched on, so changing any other setting in
    // the middle of a transient does not wipe the lag's memory.
    if (!hadC) this.y[4] = o.Yd;
    if (!hadM) this.y[5] = o.D;
    this._build();
  }

  advance(dt, h = 0.005) {
    let left = dt;
    while (left > 1e-12) {
      const d = Math.min(h, left);
      this.y = rk4Step(this.model.deriv, this.t, this.y, d);
      this._clamp();
      this.t += d; left -= d;
    }
  }

  _clamp() {
    this.y[0] = Math.min(Math.max(this.y[0], 0), this.s.P * OLIMITS.Ymax);
    this.y[1] = Math.max(this.y[1], 0);
    this.y[2] = Math.max(this.y[2], 0);
  }

  injectM2(d) { this.y[1] = Math.max(0, this.y[1] + d); }
  injectM3(d) { this.y[2] = Math.max(0, this.y[2] + d); }

  observe() {
    const o = this.model.observe(this.t, this.y);
    const s = this.s;
    o.Ylag = s.beta > 0 ? o.Y - (s.gamma * o.Iind) / s.beta : o.Y;
    o.moneyFlow = s.moneyMode === 'tap' ? s.tapK * (s.tapTarget - o.M2) : 0;
    o.fxFlow = s.fxMode === 'managed' ? s.fxK * (s.fxTarget - o.M3) : s.fxMode === 'pegged' ? o.Ex - o.Im : 0;
    o.net = o.I + o.G - o.T;   // net draw from idle balances
    o.atLimit = this.y[0] >= s.P * OLIMITS.Ymax - 1e-9 || this.y[0] <= 1e-9;
    return o;
  }
}
