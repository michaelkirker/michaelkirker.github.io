// Runtime wrapper around the closed-economy model: owns the state and settings,
// advances time, and lets settings change while the machine is running (as the
// physical machine's valves and curve plates could be adjusted by hand).
//
// Curves pivot about the base equilibrium, so a machine that has not been disturbed
// stays exactly at rest whatever the settings.
import { rk4Step } from './integrator.js';
import { makeClosedEconomy } from './closedEconomy.js';

export const BASE = { Y0: 100, r0: 4, M20: 50, S0: 20 }; // income, rate (%), idle balances, saving = investment
export const LIMITS = { Ymax: 250, rMax: 12 };           // tank capacity (income scale) and rate scale

export const DEFAULT_SETTINGS = {
  P: 0.3,          // circulation period, years (3.6 months)
  sigma: 0.2,      // marginal propensity to save
  xi: 0.5,         // slope of interest-savings curve (saving per % of rate)
  eta: -2,         // slope of marginal-efficiency-of-capital curve (<0)
  lambda: -10,     // liquidity preference: idle balances per % of rate (<0)
  beta: 0,         // acceleration coefficient
  gamma: 0.5,      // accelerator lag, years
  mode: 'constant-money', // 'constant-money' | 'constant-rate' | 'tap'
  tapTarget: 50,   // idle-balance level the money-supply box pulls towards (tap mode)
  tapK: 1.5,       // tap speed, per year
  dI: 0,           // spontaneous shift of investment (bn/yr)
  dS: 0,           // spontaneous shift of saving (bn/yr)
};

export class Machine {
  constructor(settings = {}) { this.reset(settings); }

  reset(settings = {}) {
    this.s = { ...DEFAULT_SETTINGS, ...settings };
    this.t = 0;
    this.y = [this.s.P * BASE.Y0, BASE.M20, 0]; // [M1, M2, induced investment]
    this._build();
  }

  _build() {
    const s = this.s, { Y0, r0, M20, S0 } = BASE;
    this.liquidity = (M2) => Math.max(0, r0 + (M2 - M20) / s.lambda);
    this.saveY = (Y) => S0 + s.sigma * (Y - Y0) + s.dS;
    this.mec = (r) => S0 + s.eta * (r - r0) + s.dI;
    this.model = makeClosedEconomy({
      P: s.P,
      saveY: (Y) => S0 + s.sigma * (Y - Y0),
      saveR: (r) => s.xi * (r - r0),
      mec: (r) => S0 + s.eta * (r - r0),
      liquidity: this.liquidity,
      r0, beta: s.beta, gamma: s.gamma, mode: s.mode,
      tapK: s.tapK, tapTarget: s.tapTarget, dI: s.dI, dS: s.dS,
      y0: this.y,
    });
  }

  // Change settings mid-run. Income stays continuous when P changes.
  set(changes) {
    const Y = this.y[0] / this.s.P;
    Object.assign(this.s, changes);
    this.y[0] = this.s.P * Y;
    this._build();
  }

  advance(dt, h = 0.005) {
    let left = dt;
    while (left > 1e-12) {
      const d = Math.min(h, left);
      this.y = rk4Step(this.model.deriv, this.t, this.y, d);
      this._clamp();
      this.t += d;
      left -= d;
    }
  }

  _clamp() {
    this.y[0] = Math.min(Math.max(this.y[0], 0), this.s.P * LIMITS.Ymax); // M1 tank: empty .. overflow weir
    this.y[1] = Math.max(this.y[1], 0);
  }

  // Pour water into (or draw it from) the idle-balances tank.
  inject(dM2) { this.y[1] = Math.max(0, this.y[1] + dM2); }

  observe() {
    const o = this.model.observe(this.t, this.y);
    const s = this.s;
    // Level of the accelerator float's inner water, which lags the M1 level:
    // Iind = beta (Y - Ylag) / gamma
    o.Ylag = s.beta > 0 ? o.Y - (s.gamma * o.Iind) / s.beta : o.Y;
    o.moneyFlow = s.mode === 'tap' ? s.tapK * (s.tapTarget - o.M2) : 0;
    o.atLimit = this.y[0] >= s.P * LIMITS.Ymax - 1e-9 || this.y[0] <= 1e-9;
    return o;
  }
}
