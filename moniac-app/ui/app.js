import { Machine, BASE, DEFAULT_SETTINGS } from '../sim/machine.js';
import { createSchematic } from './schematic.js';
import { createRecorder, RECORDERS } from './recorder.js';
import { EXPERIMENTS } from './experiments.js';
import { createPending } from './pending.js';

const $ = (s) => document.querySelector(s);
const machine = new Machine();
const pending = createPending(machine, (p) => { p.run(); logEvent(p.label, p.key, p.t); if (p.sync) syncControls(); });
const schematic = createSchematic($('#machine'));
const recorders = RECORDERS.map((r) => ({ cfg: r, rec: createRecorder($('#' + r.id), r) }));

let running = true, speed = 0.25;
let data, events, schedule, currentExp = null;

function clearTrace() {
  data = { t: [], Y: [], r: [], S: [], I: [] };
  events = []; pending.clear();
  recorders.forEach((r) => r.rec.reset());
  lastSample = -1;
}
let lastSample = -1;

// ---------- controls ----------
// kind 'set' writes a setting; conv converts slider value <-> setting value.
const SLIDERS = [
  { group: 'Shocks', key: 'dI', label: 'Investment shift ΔI', min: -15, max: 15, step: 0.5, fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(1), hint: 'Slide the investment curve up or down.' },
  { group: 'Shocks', key: 'dS', label: 'Saving shift ΔS', min: -15, max: 15, step: 0.5, fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(1), hint: 'Slide the propensity-to-save curve up or down.' },
  { group: 'Machine settings', key: 'P', label: 'Circulation period P', min: 1, max: 8, step: 0.1, to: (v) => v * 12, from: (v) => v / 12, fmt: (v) => v.toFixed(1) + ' months', hint: 'How long balances take to go round once; the machine’s time constant.' },
  { group: 'Machine settings', key: 'sigma', label: 'Propensity to save σ', min: 0.05, max: 0.6, step: 0.01, fmt: (v) => v.toFixed(2), hint: 'Slope of the saving plate. The multiplier is 1/σ.' },
  { group: 'Machine settings', key: 'eta', label: 'Investment sensitivity to rate', min: 0, max: 6, step: 0.1, to: (v) => -v, from: (v) => -v, fmt: (v) => v.toFixed(1), hint: 'How steeply the marginal-efficiency curve falls with the rate (|η|).' },
  { group: 'Machine settings', key: 'xi', label: 'Saving sensitivity to rate', min: 0, max: 2, step: 0.05, fmt: (v) => v.toFixed(2), hint: 'How much saving rises with the rate (ξ).' },
  { group: 'Machine settings', key: 'lambda', label: 'Liquidity preference |λ|', min: 3, max: 30, step: 0.5, to: (v) => -v, from: (v) => -v, fmt: (v) => v.toFixed(1), hint: 'Idle balances per 1% of interest rate: how flat the liquidity-preference curve is.' },
  { group: 'Accelerator', key: 'beta', label: 'Acceleration coefficient β', min: 0, max: 0.8, step: 0.01, fmt: (v) => v.toFixed(2), hint: 'How strongly investment responds to the rate of change of income. 0 = off.' },
  { group: 'Accelerator', key: 'gamma', label: 'Lag γ', min: 0.1, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) + ' yr', hint: 'The float’s leak: bigger γ means a slower response.' },
];

function buildControls() {
  const host = $('#sliders');
  let group = null, gEl = null;
  for (const sl of SLIDERS) {
    if (sl.group !== group) {
      group = sl.group;
      gEl = document.createElement('fieldset');
      gEl.innerHTML = `<legend>${group}</legend>`;
      host.appendChild(gEl);
    }
    const row = document.createElement('div');
    row.className = 'row'; row.title = sl.hint;
    row.innerHTML = `<label for="s-${sl.key}">${sl.label}</label><output id="o-${sl.key}"></output>
      <input id="s-${sl.key}" type="range" min="${sl.min}" max="${sl.max}" step="${sl.step}">`;
    gEl.appendChild(row);
    row.querySelector('input').addEventListener('input', (e) => {
      const v = +e.target.value;
      const val = sl.from ? sl.from(v) : v;
      pending.add(sl.key, `${sl.label} → ${sl.fmt(v)}`, () => machine.set({ [sl.key]: val }));
      $('#o-' + sl.key).textContent = sl.fmt(v);
    });
  }
  document.querySelectorAll('input[name=mode]').forEach((r) =>
    r.addEventListener('change', (e) => {
      const val = e.target.value;
      pending.add('mode', 'Money supply: ' + e.target.parentElement.textContent.trim(), () => machine.set({ mode: val }), true);
    }));
  $('#s-tap').addEventListener('input', (e) => { const v = +e.target.value; pending.add('tap', 'Money-supply level → ' + v, () => machine.set({ tapTarget: v })); $('#o-tap').textContent = e.target.value; });
  $('#inject-up').onclick = () => pending.add(null, 'Inject +20', () => machine.inject(20));
  $('#inject-down').onclick = () => pending.add(null, 'Withdraw −20', () => machine.inject(-20));
  $('#speed').addEventListener('input', (e) => { speed = +e.target.value; $('#o-speed').textContent = speed.toFixed(2) + ' yr/s'; });
  $('#playpause').onclick = () => setRunning(!running);
  // Reset returns to the undisturbed equilibrium: tanks at rest, all shifts cleared and the
// money-supply level back at its starting value. Structural settings (slopes, lags, mode) are kept,
// since the curves pivot about the equilibrium and so leave it undisturbed.
  $('#reset').onclick = () => {
    currentExp = null; schedule = []; showExperiment(null);
    resetMachine({ ...machine.s, dI: 0, dS: 0, tapTarget: BASE.M20 });
  };
  $('#clear-shocks').onclick = () => { pending.add('clear', 'Shifts cleared', () => machine.set({ dI: 0, dS: 0 }), true); };
}

function syncControls() {
  const s = machine.s;
  for (const sl of SLIDERS) {
    const v = sl.to ? sl.to(s[sl.key]) : s[sl.key];
    $('#s-' + sl.key).value = v;
    $('#o-' + sl.key).textContent = sl.fmt(v);
  }
  document.querySelectorAll('input[name=mode]').forEach((r) => { r.checked = r.value === s.mode; });
  $('#s-tap').value = s.tapTarget; $('#o-tap').textContent = s.tapTarget;
  $('#tap-row').classList.toggle('off', s.mode !== 'tap');
  $('#s-tap').disabled = s.mode !== 'tap';
  $('#o-speed').textContent = speed.toFixed(2) + ' yr/s';
}

function setRunning(v) {
  running = v;
  $('#playpause').textContent = v ? 'Pause' : 'Run';
}

// Every change made to the model is logged; repeated changes to the same control within half a
// model year (a slider drag) update one entry rather than adding many.
function logEvent(label, key = null, t = machine.t) {
  const last = events[events.length - 1];
  if (key && last && last.key === key && t - last.t < 0.5) { last.t = t; last.label = label; }
  else events.push({ t, label, key });
  renderLog();
}
function renderLog() {
  $('#log').innerHTML = events.slice(-4).map((e) => `<li><b>year ${e.t.toFixed(0)}</b> ${e.label}</li>`).join('');
}

function resetMachine(settings) {
  machine.reset(settings);
  clearTrace(); renderLog(); syncControls();
}

// ---------- experiments ----------
function buildExperiments() {
  const sel = $('#exp');
  sel.innerHTML = '<option value="">Free play</option>' + EXPERIMENTS.map((e) => `<option value="${e.id}">${e.title}</option>`).join('');
  sel.addEventListener('change', () => {
    const e = EXPERIMENTS.find((x) => x.id === sel.value);
    showExperiment(e || null);
  });
  $('#run-exp').onclick = () => { if (currentExp) runExperiment(currentExp); };
}
function showExperiment(e) {
  currentExp = e;
  $('#exp').value = e ? e.id : '';
  $('#exp-body').hidden = !e;
  if (e) {
    $('#exp-intro').textContent = e.intro;
    $('#exp-watch').textContent = e.watch;
    $('#exp-ref').textContent = e.ref;
  }
}
function runExperiment(e) {
  resetMachine({ ...DEFAULT_SETTINGS, ...e.setup });
  schedule = e.events.map((ev) => ({ ...ev, done: false }));
  setRunning(true);
}

// ---------- main loop ----------
let schedule_ = [];
schedule = schedule_;
let prev = performance.now();
function frame(now) {
  const dtReal = Math.min(0.05, (now - prev) / 1000); prev = now;
  pending.flush();
  if (running) {
    const dt = dtReal * speed;
    pending.advance(dt);
    for (const ev of schedule) {
      if (!ev.done && machine.t >= ev.t) { ev.done = true; ev.run(machine); logEvent(ev.label, null, ev.t); syncControls(); }
    }
    if (machine.t - lastSample >= 0.02) {
      const o = machine.observe();
      for (const k of ['Y', 'r', 'S', 'I']) data[k].push(o[k]);
      data.t.push(machine.t); lastSample = machine.t;
    }
  }
  const o = machine.observe();
  schematic.update(o, machine, dtReal, running);
  recorders.forEach((r) => r.rec.draw(data, machine.t, events));
  $('#clock').textContent = 'Model time: ' + machine.t.toFixed(1) + ' years' + (pending.nextYear() !== null ? ' · change takes effect at year ' + pending.nextYear() : '');
  $('#readout').innerHTML = [
    ['Income Y', o.Y.toFixed(1)], ['Interest rate r', o.r.toFixed(2) + '%'], ['Saving S', o.S.toFixed(1)],
    ['Investment I', o.I.toFixed(1)], ['Idle balances M2', o.M2.toFixed(1)], ['Active balances M1', o.M1.toFixed(1)],
  ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => recorders.forEach((r) => r.rec.resize()));
buildControls(); buildExperiments(); clearTrace(); syncControls();
// Stop browsers restoring old slider/radio positions on reload; the controls always mirror the machine.
document.querySelectorAll('input, select').forEach((el) => el.setAttribute('autocomplete', 'off'));
window.addEventListener('pageshow', () => { syncControls(); });
window.__moniac = { machine, runExperiment, EXPERIMENTS, setSpeed: (v) => { speed = v; } };
requestAnimationFrame(frame);
