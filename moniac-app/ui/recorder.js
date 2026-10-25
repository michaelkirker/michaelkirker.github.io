// Strip-chart recorders, like the clockwork chart recorders on Phillips' machine:
// the chart scrolls left as time passes, and each trace follows one variable.
import { OBASE } from '../sim/openMachine.js';

export const WINDOW_YEARS = 12; // minimum width of the time axis
export const LEAD_YEARS = 1;    // how much history to show before the most recent change

const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function createRecorder(canvas, { title, unit, series, lo, hi, baseline }) {
  const ctx = canvas.getContext('2d');
  let yLo = lo, yHi = hi;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(data, now, events) {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const padL = 38, padR = 10, padT = 26, padB = 22;
    ctx.clearRect(0, 0, W, H);
    // The view is anchored to the most recent change: it starts LEAD_YEARS before it and the
    // axis stretches (rather than scrolls) as time passes, so the change is always on screen.
    const last = events.length ? events[events.length - 1] : null;
    const t0 = last ? Math.max(0, last.t - LEAD_YEARS) : 0;
    const t1 = Math.max(now, t0 + WINDOW_YEARS);
    // y range: default, widened to fit what is visible
    yLo = lo; yHi = hi;
    for (const sr of series) {
      const arr = data[sr.key];
      for (let i = 0; i < arr.length; i++) {
        if (data.t[i] < t0) continue;
        if (arr[i] < yLo) yLo = Math.floor(arr[i] / 10) * 10;
        if (arr[i] > yHi) yHi = Math.ceil(arr[i] / 10) * 10;
      }
    }
    const X = (t) => padL + ((t - t0) / (t1 - t0)) * (W - padL - padR);
    const Y = (v) => H - padB - ((v - yLo) / (yHi - yLo)) * (H - padT - padB);

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = css('--fg'); ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(title, padL, 14);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = css('--muted');
    ctx.fillText(unit, padL + ctx.measureText(title).width + 20, 14);

    // grid + y labels
    const step = niceStep((yHi - yLo) / 4);
    ctx.strokeStyle = css('--grid'); ctx.lineWidth = 1; ctx.textAlign = 'right';
    for (let v = Math.ceil(yLo / step) * step; v <= yHi + 1e-9; v += step) {
      ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke();
      ctx.fillText(String(Math.round(v * 100) / 100), padL - 5, Y(v) + 3);
    }
    // x labels: years since the most recent change (zero at the change itself)
    ctx.textAlign = 'center';
    const xs = niceStep((t1 - t0) / 6);
    const origin = last ? last.t : 0;
    for (let yr = Math.ceil((t0 - origin) / xs - 1e-9) * xs; yr <= t1 - origin + 1e-9; yr += xs) {
      ctx.fillText((xs >= 1 ? Math.round(yr) : yr.toFixed(1)) + '', X(origin + yr), H - 6);
    }
    ctx.textAlign = 'left';

    ctx.save();
    ctx.beginPath(); ctx.rect(padL, padT - 4, W - padL - padR, H - padT - padB + 8); ctx.clip();
    // equilibrium baseline
    if (baseline != null) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, Y(baseline)); ctx.lineTo(W - padR, Y(baseline)); ctx.stroke();
      ctx.setLineDash([]);
    }
    // event markers
    ctx.setLineDash([2, 3]); ctx.strokeStyle = css('--accent'); ctx.lineWidth = 1;
    for (const e of events) {
      if (e.t < t0) continue;
      ctx.beginPath(); ctx.moveTo(X(e.t), padT - 4); ctx.lineTo(X(e.t), H - padB); ctx.stroke();
    }
    ctx.setLineDash([]);
    // traces
    for (const sr of series) {
      ctx.strokeStyle = css(sr.color); ctx.lineWidth = 2; ctx.beginPath();
      let started = false;
      for (let i = 0; i < data.t.length; i++) {
        if (data.t[i] < t0 - 0.1) continue;
        const x = X(data.t[i]), y = Y(data[sr.key][i]);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // legend
    if (series.length > 1) {
      let x = W - padR;
      ctx.textAlign = 'right';
      for (const sr of [...series].reverse()) {
        ctx.fillStyle = css(sr.color); ctx.fillText(sr.label, x, 14);
        x -= ctx.measureText(sr.label).width + 12;
      }
      ctx.textAlign = 'left';
    }
  }

  function reset() { yLo = lo; yHi = hi; }
  resize();
  return { draw, resize, reset };
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

export const RECORDERS = [
  { id: 'rec-income', title: 'Income Y', unit: 'bn per year', series: [{ key: 'Y', color: '--c1', label: 'Y' }], lo: 0, hi: 200, baseline: OBASE.Y0 },
  { id: 'rec-rate', title: 'Interest rate r', unit: '%', series: [{ key: 'r', color: '--c2', label: 'r' }], lo: 0, hi: 8, baseline: OBASE.r0 },
  { id: 'rec-fx', title: 'Exchange rate e', unit: 'value of sterling', series: [{ key: 'e', color: '--c4', label: 'e' }], lo: 60, hi: 140, baseline: OBASE.e0 },
  { id: 'rec-trade', title: 'Imports and exports', unit: '', series: [{ key: 'Im', color: '--c2', label: 'imports' }, { key: 'Ex', color: '--c4', label: 'exports' }], lo: 0, hi: 30, baseline: OBASE.Im0 },
  { id: 'rec-fiscal', title: 'Taxes and spending', unit: '', series: [{ key: 'T', color: '--c3', label: 'taxes' }, { key: 'G', color: '--c2', label: 'spending' }], lo: 0, hi: 40, baseline: OBASE.G0 },
  { id: 'rec-si', title: 'Saving and investment', unit: '', series: [{ key: 'S', color: '--c3', label: 'saving' }, { key: 'I', color: '--c1', label: 'investment' }], lo: 0, hi: 30, baseline: OBASE.I0 },
];
