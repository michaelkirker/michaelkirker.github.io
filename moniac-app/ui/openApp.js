import { OpenMachine, OBASE, ODEFAULTS } from '../sim/openMachine.js';
import { createOpenSchematic } from './openSchematic.js';
import { createRecorder, RECORDERS } from './recorder.js';
import { OPEN_EXPERIMENTS } from './openExperiments.js';

const $ = (s) => document.querySelector(s);
const machine = new OpenMachine();
const schematic = createOpenSchematic($('#machine'));
const recorders = RECORDERS.map((r) => ({ cfg: r, rec: createRecorder($('#' + r.id), r) }));

let running = true, speed = 0.25;
let data, events, schedule = [], currentExp = null, lastSample = -1;
const KEYS = ['Y', 'r', 'e', 'Im', 'Ex', 'T', 'G', 'S', 'I'];

function clearTrace() {
  data = { t: [] }; KEYS.forEach((k) => { data[k] = []; });
  events = []; lastSample = -1;
  recorders.forEach((r) => r.rec.reset());
}

// ---------- controls ----------
const sgn = (v) => (v > 0 ? '+' : '') + v.toFixed(1);
const SLIDERS = [
  { group: 'Shocks', open: true, key: 'dI', label: 'Investment shift ΔI', min: -15, max: 15, step: 0.5, fmt: sgn, hint: 'Slide the marginal-efficiency-of-capital plate up or down.' },
  { group: 'Shocks', key: 'dS', label: 'Saving shift ΔS', min: -15, max: 15, step: 0.5, fmt: sgn, hint: 'Households save more (+) or less (−) at every income.' },
  { group: 'Shocks', key: 'dG', label: 'Government spending shift ΔG', min: -15, max: 15, step: 0.5, fmt: sgn, hint: 'Open or close the government valve.' },
  { group: 'Shocks', key: 'dT', label: 'Tax shift ΔT', min: -15, max: 15, step: 0.5, fmt: sgn, hint: 'Slide the income-taxation plate up or down.' },
  { group: 'Shocks', key: 'dEx', label: 'Export demand shift ΔEx', min: -10, max: 10, step: 0.5, fmt: sgn, hint: 'Foreign demand for our goods.' },
  { group: 'Fiscal policy', key: 't', label: 'Tax rate', min: 0, max: 0.6, step: 0.01, fmt: (v) => (v * 100).toFixed(0) + '%', hint: 'Taxes are this share of income (the taxation plate is a straight line through the origin). The starting rate is 20%; changing it is a fiscal shock.' },
  { group: 'Fiscal policy', key: 'g', label: 'Automatic stabiliser', min: 0, max: 0.5, step: 0.01, fmt: (v) => v.toFixed(2), hint: 'Government spending falls by this much for each unit rise in income. 0 = off.' },
  { group: 'Trade', key: 'mu', label: 'Propensity to import', min: 0, max: 0.5, step: 0.01, fmt: (v) => v.toFixed(2), hint: 'Imports per unit of extra domestic expenditure.' },
  { group: 'Trade', key: 'mx', label: 'Imports’ sensitivity to exchange rate', min: 0, max: 0.6, step: 0.01, fmt: (v) => v.toFixed(2), hint: 'Imports rise this much per point of exchange rate.' },
  { group: 'Trade', key: 'ex', label: 'Exports’ sensitivity to exchange rate', min: 0, max: 0.6, step: 0.01, to: (v) => -v, from: (v) => -v, fmt: (v) => v.toFixed(2), hint: 'Exports fall this much per point of exchange rate (|slope|).' },
  { group: 'Trade', key: 'kappa', label: 'Sterling preference |κ|', min: 0.3, max: 4, step: 0.05, to: (v) => -v, from: (v) => -v, fmt: (v) => v.toFixed(2), hint: 'Sterling balances per point of exchange rate: how flat the sterling-preference curve is.' },
  { group: 'Home economy', key: 'P', label: 'Circulation period P', min: 1, max: 8, step: 0.1, to: (v) => v * 12, from: (v) => v / 12, fmt: (v) => v.toFixed(1) + ' months', hint: 'The machine’s time constant.' },
  { group: 'Home economy', key: 'c', label: 'Propensity to consume', min: 0.3, max: 0.98, step: 0.01, fmt: (v) => v.toFixed(2), hint: 'Slope of the consumption plate (out of income after tax).' },
  { group: 'Home economy', key: 'eta', label: 'Investment sensitivity to rate', min: 0, max: 3, step: 0.05, to: (v) => -v, from: (v) => -v, fmt: (v) => v.toFixed(2), hint: '|η|' },
  { group: 'Home economy', key: 'xi', label: 'Saving sensitivity to rate', min: 0, max: 1.5, step: 0.05, fmt: (v) => v.toFixed(2), hint: 'ξ' },
  { group: 'Home economy', key: 'lambda', label: 'Liquidity preference |λ|', min: 3, max: 30, step: 0.5, to: (v) => -v, from: (v) => -v, fmt: (v) => v.toFixed(1), hint: 'Idle balances per 1% of interest rate.' },
];

function buildControls() {
  const host = $('#sliders');
  let group = null, gEl = null;
  for (const sl of SLIDERS) {
    if (sl.group !== group) {
      group = sl.group;
      gEl = document.createElement('details');
      gEl.open = !!sl.open;
      gEl.innerHTML = `<summary>${group}</summary>`;
      host.appendChild(gEl);
    }
    const row = document.createElement('div');
    row.className = 'row'; row.title = sl.hint;
    row.innerHTML = `<label for="s-${sl.key}">${sl.label}</label><output id="o-${sl.key}"></output>
      <input id="s-${sl.key}" type="range" min="${sl.min}" max="${sl.max}" step="${sl.step}">`;
    gEl.appendChild(row);
    row.querySelector('input').addEventListener('input', (e) => {
      const v = +e.target.value;
      machine.set({ [sl.key]: sl.from ? sl.from(v) : v });
      $('#o-' + sl.key).textContent = sl.fmt(v);
      logEvent(`${sl.label} → ${sl.fmt(v)}`, sl.key);
    });
  }
  for (const name of ['moneyMode', 'fxMode']) {
    document.querySelectorAll(`input[name=${name}]`).forEach((r) =>
      r.addEventListener('change', (e) => {
        machine.set({ [name]: e.target.value }); syncControls();
        logEvent((name === 'moneyMode' ? 'Money supply: ' : 'Exchange rate: ') + e.target.parentElement.textContent.trim(), name);
      }));
  }
  $('#s-tap').addEventListener('input', (e) => { machine.set({ tapTarget: +e.target.value }); $('#o-tap').textContent = e.target.value; logEvent('Money-supply level → ' + e.target.value, 'tap'); });
  $('#s-fx').addEventListener('input', (e) => { machine.set({ fxTarget: +e.target.value }); $('#o-fx').textContent = e.target.value; logEvent('Account target → ' + e.target.value, 'fxt'); });
  $('#inject-m2-up').onclick = () => { machine.injectM2(20); logEvent('Pour +20 into M2'); };
  $('#inject-m2-down').onclick = () => { machine.injectM2(-20); logEvent('Draw −20 from M2'); };
  $('#inject-m3-up').onclick = () => { machine.injectM3(20); logEvent('Pour +20 into M3'); };
  $('#inject-m3-down').onclick = () => { machine.injectM3(-20); logEvent('Draw −20 from M3'); };
  $('#speed').addEventListener('input', (e) => { speed = +e.target.value; $('#o-speed').textContent = speed.toFixed(2) + ' yr/s'; });
  $('#playpause').onclick = () => setRunning(!running);
  // Reset returns to the undisturbed equilibrium: tanks at rest, all shifts cleared, tap targets back
  // at their starting values. Structural settings (slopes, lags, regimes) are kept, since the curves
  // pivot about the equilibrium and so leave it undisturbed.
  $('#reset').onclick = () => {
    currentExp = null; schedule = []; showExperiment(null);
    resetMachine({ ...machine.s, dI: 0, dS: 0, dG: 0, dT: 0, dEx: 0, tapTarget: OBASE.M20, fxTarget: OBASE.M30 });
  };
  $('#clear-shocks').onclick = () => {
    machine.set({ dI: 0, dS: 0, dG: 0, dT: 0, dEx: 0 }); syncControls(); logEvent('Shifts cleared');
  };
}

function syncControls() {
  const s = machine.s;
  for (const sl of SLIDERS) {
    const v = sl.to ? sl.to(s[sl.key]) : s[sl.key];
    $('#s-' + sl.key).value = v; $('#o-' + sl.key).textContent = sl.fmt(v);
  }
  for (const name of ['moneyMode', 'fxMode'])
    document.querySelectorAll(`input[name=${name}]`).forEach((r) => { r.checked = r.value === s[name]; });
  $('#s-tap').value = s.tapTarget; $('#o-tap').textContent = s.tapTarget; $('#s-tap').disabled = s.moneyMode !== 'tap';
  $('#tap-row').classList.toggle('off', s.moneyMode !== 'tap');
  $('#s-fx').value = s.fxTarget; $('#o-fx').textContent = s.fxTarget; $('#s-fx').disabled = s.fxMode !== 'managed';
  $('#fx-row').classList.toggle('off', s.fxMode !== 'managed');
  $('#o-speed').textContent = speed.toFixed(2) + ' yr/s';
}

function setRunning(v) { running = v; $('#playpause').textContent = v ? 'Pause' : 'Run'; }

// Every change made to the model is logged; repeated changes to the same control within half a
// model year (a slider drag) update one entry rather than adding many.
function logEvent(label, key = null, t = machine.t) {
  const last = events[events.length - 1];
  if (key && last && last.key === key && t - last.t < 0.5) { last.t = t; last.label = label; }
  else events.push({ t, label, key });
  renderLog();
}
function renderLog() {
  $('#log').innerHTML = events.slice(-4).map((e) => `<li>${e.label}</li>`).join('');
}
function resetMachine(settings) { machine.reset(settings); clearTrace(); renderLog(); syncControls(); }

// ---------- experiments ----------
function buildExperiments() {
  const sel = $('#exp');
  sel.innerHTML = '<option value="">Free play</option>' + OPEN_EXPERIMENTS.map((e) => `<option value="${e.id}">${e.title}</option>`).join('');
  sel.addEventListener('change', () => showExperiment(OPEN_EXPERIMENTS.find((x) => x.id === sel.value) || null));
  $('#run-exp').onclick = () => { if (currentExp) runExperiment(currentExp); };
}
function showExperiment(e) {
  currentExp = e;
  $('#exp').value = e ? e.id : '';
  $('#exp-body').hidden = !e;
  if (e) { $('#exp-intro').textContent = e.intro; $('#exp-watch').textContent = e.watch; $('#exp-ref').textContent = e.ref; }
}
function runExperiment(e) {
  resetMachine({ ...ODEFAULTS, ...e.setup });
  schedule = e.events.map((ev) => ({ ...ev, done: false }));
  setRunning(true);
}

// ---------- main loop ----------
let prev = performance.now();
function frame(now) {
  const dtReal = Math.min(0.05, Math.max(0, (now - prev) / 1000)); prev = now;
  if (running) {
    machine.advance(dtReal * speed);
    for (const ev of schedule) {
      if (!ev.done && machine.t >= ev.t) { ev.done = true; ev.run(machine); logEvent(ev.label, null, ev.t); syncControls(); }
    }
    if (machine.t - lastSample >= 0.02) {
      const o = machine.observe();
      for (const k of KEYS) data[k].push(o[k]);
      data.t.push(machine.t); lastSample = machine.t;
    }
  }
  const o = machine.observe();
  schematic.update(o, machine, dtReal, running);
  recorders.forEach((r) => r.rec.draw(data, machine.t, events));
  $('#clock').textContent = events.length ? 'Years since last change: ' + (machine.t - events[events.length - 1].t).toFixed(1) : 'Model time: ' + machine.t.toFixed(1) + ' years';
  $('#readout').innerHTML = [
    ['Income Y', o.Y.toFixed(1)], ['Income after tax', o.Yd.toFixed(1)], ['Interest rate r', o.r.toFixed(2) + '%'], ['Exchange rate e', o.e.toFixed(1)],
    ['Budget T − G', o.budget.toFixed(1)], ['Trade Ex − Im', o.trade.toFixed(1)], ['Reserves', o.R.toFixed(1)],
    ['Idle balances M2', o.M2.toFixed(1)], ['Sterling M3', o.M3.toFixed(1)], ['Active balances M1', o.M1.toFixed(1)],
  ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => recorders.forEach((r) => r.rec.resize()));
buildControls(); buildExperiments(); clearTrace(); syncControls();
// Controls always mirror the machine; stop browsers restoring old slider/radio positions on reload.
document.querySelectorAll('input, select').forEach((el) => el.setAttribute('autocomplete', 'off'));
window.addEventListener('pageshow', () => { syncControls(); });
window.__moniac = { machine, runExperiment, EXPERIMENTS: OPEN_EXPERIMENTS, setSpeed: (v) => { speed = v; } };
requestAnimationFrame(frame);
