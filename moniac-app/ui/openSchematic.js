// SVG schematic of Phillips' full machine (Economica 1950, Fig. 4).
//
// Income is pumped up the far-left column and along the top, then divides: taxes T down the left
// column into the GB box; the rest (Y-T) drops through the Yd box into the centre column, where
// saving S slopes off into M2 and consumption C runs straight down to the D box. Government
// spending G leaves the GB box (which exchanges G-T with M2) and investment I leaves M2; both slope
// in to meet C at the D box (G + I + C = D). Imports branch off into the sterling tank M3, exports
// return from it to M1.
//
// Every flow that is a function (T, G, C, I, Im, Ex) passes a gate: a pair of black bars across the
// pipe. A rod moves each bar, and the rod is pushed by a follower riding the cut curve on a plate,
// as in Fig. 4. Each plate hangs on a string from a float whose letter says what it measures (Y, Yd,
// r, D, e). When the water level moves, the string moves the plate, the curve pushes the follower
// sideways and the gate opens or closes. Three gates are fed by two plates on one rod (consumption,
// imports, exports), so their effects add. Saving has no gate: it is what is left of income after
// tax once the consumption gate has taken its share.
import { OBASE, OLIMITS } from '../sim/openMachine.js';
import { attachCallouts, TIP_TARGETS } from './callouts.js';

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

const M1 = { x: 130, y: 700, w: 340, h: 140 };
const M2 = { x: 420, y: 290, w: 180, h: 170 };
const M3 = { x: 600, y: 700, w: 180, h: 130 };
const MBOX = { x: 830, y: 310, w: 70, h: 120 };    // money-supply box (M2)
const EBOX = { x: 880, y: 700, w: 70, h: 112 };    // exchange equalisation account box (M3)
const YDBOX = { x: 362, y: 90, w: 36, h: 50 };
const DBOX = { x: 362, y: 545, w: 36, h: 36 };

const PIPES = {
  GT: 'M 420 395 H 286',
  Y: 'M 130 826 H 40 V 34 H 100',
  YD: 'M 100 34 H 380 V 90',
  T: 'M 100 34 L 170 80 V 330 H 268 V 345',
  C: 'M 380 140 V 545',
  S: 'M 380 140 L 560 200 V 292',
  G: 'M 268 410 V 490 L 380 545',
  I: 'M 570 460 V 495 L 380 545',
  D: 'M 371 581 V 700',
  IM: 'M 389 581 V 596 H 620 V 700',
  EX: 'M 620 830 V 950 H 440 V 842',
  MONEY: 'M 830 380 H 600',
  FX: 'M 880 800 H 780',
};

// gates: centre of the pair of bars on a vertical pipe
const GATES = { T: [170, 255], G: [268, 450], C: [380, 235], I: [570, 485], IM: [620, 650], EX: [620, 882] };

// Curve plates. x, w, h: frame; gate/gy: the gate whose rod the follower drives; side: which side of
// the pipe the plate is on; v: the variable that moves the plate (via its float and string); sgn: +1
// if the plate moves down when v rises; fn: which model curve is cut into the plate; the follower
// sits at the curve's output f. base: [v, f] at the starting equilibrium.
const PLATES = [
  { id: 'pt', title: 'Taxation  T(Y)', x: 56, w: 88, h: 96, gate: 'T', side: 'L', v: 'Y', vlo: 0, vhi: 250, sgn: 1, flo: 0, fhi: 80, fn: 'tax', base: [100, 20] },
  { id: 'pg', title: 'Government  G(Y)', x: 56, w: 88, h: 96, gate: 'G', side: 'L', v: 'Y', vlo: 0, vhi: 250, sgn: 1, flo: 0, fhi: 40, fn: 'govt', base: [100, 20] },
  { id: 'pc', title: 'Consumption  C(Y−T)', x: 232, w: 88, h: 96, gate: 'C', side: 'L', v: 'Yd', vlo: 0, vhi: 200, sgn: 1, flo: 0, fhi: 160, fn: 'consume', base: [80, 72] },
  { id: 'pr', title: 'Consumption  C(r)', x: 700, w: 88, h: 96, gate: 'C', side: 'R', v: 'r', vlo: 0, vhi: 12, sgn: -1, flo: -8, fhi: 8, fn: 'consumeR', base: [4, 0] },
  { id: 'pi', title: 'Investment  I(r)', x: 700, w: 88, h: 96, gate: 'I', side: 'R', v: 'r', vlo: 0, vhi: 12, sgn: -1, flo: -5, fhi: 30, fn: 'invest', base: [4, 8] },
  { id: 'pm', title: 'Imports  Im(D)', x: 504, w: 88, h: 84, gate: 'IM', side: 'L', v: 'D', vlo: 0, vhi: 250, sgn: 1, flo: 0, fhi: 60, fn: 'imports', base: [100, 15] },
  { id: 'pe', title: 'Imports  Im(e)', x: 650, w: 88, h: 84, gate: 'IM', side: 'R', v: 'e', vlo: 50, vhi: 150, sgn: 1, flo: -12, fhi: 12, fn: 'importsE', base: [100, 0] },
  { id: 'px', title: 'Exports  (demand)', x: 504, w: 88, h: 84, gate: 'EX', side: 'L', v: null, flo: 0, fhi: 40, fn: 'exportsDem', base: [0, 15] },
  { id: 'pq', title: 'Exports  Ex(e)', x: 650, w: 88, h: 84, gate: 'EX', side: 'R', v: 'e', vlo: 50, vhi: 150, sgn: 1, flo: -12, fhi: 12, fn: 'exportsE', base: [100, 0] },
];
const PAD_TOP = 20, PAD_BOT = 8, PAD_X = 10;

const plateMarkup = (p) => `
  <g id="${p.id}-g">
    <rect class="plate" width="${p.w}" height="${p.h}" rx="3"/>
    <text class="plt" x="5" y="12">${p.title}</text>
    <path id="${p.id}-line" class="curve" d=""/>
    <line id="${p.id}-base" class="basecross" x1="0" y1="0" x2="0" y2="0"/>
  </g>
  <line id="${p.id}-rod" class="rod" x1="0" y1="0" x2="0" y2="0"/>
  <circle id="${p.id}-dot" class="follower" r="4.5"/>`;

const gauge = (id, label, y) => `
  <g transform="translate(920,${y})" data-tip="${id}" style="pointer-events:all">
    <text class="label" x="0" y="0">${label}</text>
    <rect class="gauge-bg" x="0" y="8" width="300" height="22" rx="3"/>
    <rect id="${id}-bar" class="gauge-pos" x="150" y="10" width="0" height="18"/>
    <line class="gauge-zero" x1="150" y1="6" x2="150" y2="32"/>
    <text id="${id}-txt" class="small" x="0" y="48"></text>
  </g>`;

const barMarkup = Object.keys(GATES).map((k) =>
  `<rect class="valve" id="v${k}-a"/><rect class="valve" id="v${k}-b"/>`).join('');

const floatMarkup = (id, letter, w) => `<g id="${id}"><rect class="floatr" x="${-w / 2}" y="-9" width="${w}" height="18" rx="3"/><text class="floatl" y="4" text-anchor="middle">${letter}</text></g>`;

const stringIds = ['sy', 'sy2', 'syd', 'sr', 'sr2', 'sd', 'se1', 'se2'];
const topStrings = []; // strings that would be drawn over the plates (none: all run behind)

const markup = `
<rect id="m1w" class="water" x="${M1.x}" y="${M1.y + M1.h}" width="${M1.w}" height="0"/>
<rect class="tank" data-tip="m1" style="pointer-events:all" x="${M1.x}" y="${M1.y}" width="${M1.w}" height="${M1.h}"/>
<rect id="m2w" class="water idle" x="${M2.x}" y="${M2.y + M2.h}" width="${M2.w}" height="0"/>
<rect class="tank" data-tip="m2" style="pointer-events:all" x="${M2.x}" y="${M2.y}" width="${M2.w}" height="${M2.h}"/>
<rect id="m3w" class="water foreign" x="${M3.x}" y="${M3.y + M3.h}" width="${M3.w}" height="0"/>
<rect class="tank" data-tip="m3" style="pointer-events:all" x="${M3.x}" y="${M3.y}" width="${M3.w}" height="${M3.h}"/>
<rect id="mboxw" class="water idle" x="${MBOX.x}" y="${MBOX.y + MBOX.h}" width="${MBOX.w}" height="0"/>
<rect id="mbox" class="tank" style="pointer-events:all" x="${MBOX.x}" y="${MBOX.y}" width="${MBOX.w}" height="${MBOX.h}"/>
<rect id="eboxw" class="water foreign" x="${EBOX.x}" y="${EBOX.y + EBOX.h}" width="${EBOX.w}" height="0"/>
<rect id="ebox" class="tank" style="pointer-events:all" x="${EBOX.x}" y="${EBOX.y}" width="${EBOX.w}" height="${EBOX.h}"/>
<!-- small measuring boxes: income after tax, government balance, domestic expenditure -->
<rect class="tank" id="ydbox" style="pointer-events:all" x="${YDBOX.x}" y="${YDBOX.y}" width="${YDBOX.w}" height="${YDBOX.h}" fill="var(--panel)" opacity=".9"/>
<rect class="tank" id="gbox" style="pointer-events:all" x="250" y="345" width="36" height="65" fill="var(--panel)" opacity=".9"/>
<rect class="tank" id="dbox" style="pointer-events:all" x="${DBOX.x}" y="${DBOX.y}" width="${DBOX.w}" height="${DBOX.h}" fill="var(--panel)" opacity=".9"/>
<g id="scales"></g>
${Object.entries(PIPES).map(([k, d]) => `<path class="pipe-o" d="${d}"/><path class="pipe-i" d="${d}"/><path id="f-${k}" class="flow" d="${d}"/>`).join('\n')}
${barMarkup}
<line id="tapm" class="tapl" x1="715" y1="368" x2="715" y2="392"/>
<line id="tape" class="tapl" x1="830" y1="788" x2="830" y2="812"/>
<g transform="translate(85,826)"><circle class="pumpc" r="24"/><g id="pump">
<line class="blade" x1="0" y1="0" x2="0" y2="-18"/><line class="blade" x1="0" y1="0" x2="15.6" y2="9"/><line class="blade" x1="0" y1="0" x2="-15.6" y2="9"/></g></g>
<path class="spare" d="M ${EBOX.x + EBOX.w} 790 q 36 0 36 -36 V 700"/>

${stringIds.filter((k) => !topStrings.includes(k)).map((k) => `<path id="${k}" class="string" d=""/>`).join('\n')}
<g class="pulleys">${[[345, 12], [100, 12], [380, 70], [276, 70], [510, 150], [744, 150], [548, 552]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}</g>
${PLATES.map(plateMarkup).join('')}
${topStrings.map((k) => `<path id="${k}" class="string" d=""/>`).join('')}
${floatMarkup('flY', 'Y', 70)}${floatMarkup('flr', 'r', 48)}${floatMarkup('fle', 'e', 48)}
${floatMarkup('flYd', 'Yd', 30)}${floatMarkup('flD', 'D', 30)}

<text class="label" data-tip="m1" x="${M1.x + 8}" y="${M1.y + M1.h - 8}">M1  active (minimum working) balances</text>
<text class="label" data-tip="m2" x="${M2.x + 8}" y="${M2.y + M2.h - 8}">M2  idle (surplus) balances</text>
<text class="label" data-tip="m3" x="${M3.x + 8}" y="${M3.y + M3.h - 8}">M3  foreign-owned sterling</text>
<text class="label" data-tip="money" x="${MBOX.x - 4}" y="${MBOX.y - 8}">money supply</text>
<text class="tiny" x="${MBOX.x - 4}" y="${MBOX.y + MBOX.h + 14}" id="mbox-note"></text>
<text class="label" data-tip="eq" x="${EBOX.x - 20}" y="${EBOX.y - 8}">equalisation account</text>
<text class="tiny" x="${EBOX.x - 30}" y="${EBOX.y + EBOX.h + 14}" id="ebox-note"></text>
<text class="tiny" x="${EBOX.x + EBOX.w + 14}" y="${EBOX.y + EBOX.h + 4}">to spare tank</text>
<text class="tiny" x="406" y="104">Disposable income</text><text class="tiny" x="406" y="116">(Y−T)</text>
<text class="tiny" x="246" y="382" text-anchor="end">GB box</text>
<text class="tiny" x="354" y="559" text-anchor="end">Domestic expenditure</text><text class="tiny" x="354" y="571" text-anchor="end">(C+I+G)</text>
<text class="val" id="t-Y" x="22" y="330" transform="rotate(-90 22 330)">Y</text>
<text class="val" id="t-T" x="184" y="118">T</text>
<text class="val" id="t-YD" x="220" y="24">Yd</text>
<text class="val" id="t-C" x="392" y="214">C</text>
<text class="val" id="t-S" x="470" y="162">S</text>
<text class="val" id="t-I" x="584" y="470">I</text>
<text class="val" id="t-GT" x="296" y="366">GT</text>
<text class="val" id="t-G" x="286" y="476">G</text>
<text class="val" id="t-D" x="354" y="591" text-anchor="end">D</text>
<text class="val" id="t-DM" x="354" y="672" text-anchor="end">E</text>
<text class="val" id="t-IM" x="640" y="586">Im</text>
<text class="val" id="t-EX" x="500" y="940" text-anchor="end">Ex</text>
<text class="tiny" x="85" y="866" text-anchor="middle">pump</text>
<text class="zone zg" x="238" y="364" text-anchor="end">Government</text>
<text class="zone zb" x="590" y="172" text-anchor="middle">Banking</text>
<text class="zone zf" x="400" y="640" text-anchor="start">Foreign trade</text>
<text id="warn" class="warn" x="160" y="690"></text>

${gauge('gb', 'Budget balance  (taxes − government spending)', 50)}
${gauge('gt', 'Trade balance  (exports − imports)', 138)}
${gauge('gr', 'Equalisation-account reserves', 216)}
<text class="label" x="920" y="300">Exchange rate</text>
<text class="val" id="t-e" x="920" y="326"></text>
<text class="tiny" x="920" y="344">value of sterling; the M3 level reads it inversely</text>
<text class="label" x="920" y="384">Interest rate</text>
<text class="val" id="t-r" x="920" y="410"></text>
`;

export function createOpenSchematic(svg) {
  svg.setAttribute('viewBox', '0 0 1240 990'); svg.classList.add('open');
  svg.innerHTML = markup;
  const $ = (id) => svg.querySelector('#' + CSS.escape(id));
  const el = {};
  for (const [sel, key] of Object.entries(TIP_TARGETS)) { const n = svg.querySelector(sel); if (n) { n.setAttribute('data-tip', key); n.style.cursor = 'help'; } }
  attachCallouts(svg);
  const ids = ['m1w', 'm2w', 'm3w', 'mboxw', 'eboxw', 'pump', 'tapm', 'tape', 'warn', 'mbox-note', 'ebox-note',
    't-Y', 't-T', 't-YD', 't-C', 't-S', 't-I', 't-G', 't-GT', 't-D', 't-DM', 't-IM', 't-EX', 't-e', 't-r',
    'gb-bar', 'gb-txt', 'gt-bar', 'gt-txt', 'gr-bar', 'gr-txt', 'flY', 'flr', 'fle', 'flYd', 'flD', ...stringIds];
  for (const id of ids) el[id] = $(id);
  for (const k of Object.keys(PIPES)) el['f-' + k] = $('f-' + k);
  for (const k of Object.keys(GATES)) { el['v' + k + '-a'] = $('v' + k + '-a'); el['v' + k + '-b'] = $('v' + k + '-b'); }
  for (const p of PLATES) for (const s of ['g', 'line', 'dot', 'base', 'rod']) el[p.id + '-' + s] = $(p.id + '-' + s);

  // scales
  let s = '';
  for (const Y of [0, 50, 100, 150, 200, 250]) {
    const y = M1.y + M1.h - (Y / OLIMITS.Ymax) * M1.h;
    s += `<line class="tick" x1="${M1.x - 6}" x2="${M1.x}" y1="${y}" y2="${y}"/><text class="tiny" x="${M1.x - 9}" y="${y + 3}" text-anchor="end">${Y}</text>`;
  }
  s += `<text class="tiny" x="${M1.x - 36}" y="${M1.y - 14}">income Y</text>`;
  for (const r of [0, 3, 6, 9, 12]) {
    const y = M2.y + (r / OLIMITS.rMax) * M2.h;
    s += `<line class="tick" x1="${M2.x - 6}" x2="${M2.x}" y1="${y}" y2="${y}"/><text class="tiny" x="${M2.x - 9}" y="${y + 3}" text-anchor="end">${r}%</text>`;
  }
  s += `<text class="tiny" x="${M2.x}" y="${M2.y - 6}">r: level reads inversely</text>`;
  for (const e of [50, 75, 100, 125, 150]) {
    const y = M3.y + ((e - OLIMITS.eLo) / (OLIMITS.eHi - OLIMITS.eLo)) * M3.h;
    s += `<line class="tick" x1="${M3.x - 6}" x2="${M3.x}" y1="${y}" y2="${y}"/><text class="tiny" x="${M3.x - 9}" y="${y + 3}" text-anchor="end">${e}</text>`;
  }
  s += `<text class="tiny" x="${M3.x + M3.w + 6}" y="${M3.y + 16}">e: reads inversely</text>`;
  const eq = (y, x0, x1) => `<line class="eqline" x1="${x0}" x2="${x1}" y1="${y}" y2="${y}"/>`;
  s += eq(M1.y + M1.h - (OBASE.Y0 / OLIMITS.Ymax) * M1.h, M1.x, M1.x + M1.w);
  s += eq(M2.y + (OBASE.r0 / OLIMITS.rMax) * M2.h, M2.x, M2.x + M2.w);
  s += eq(M3.y + ((OBASE.e0 - OLIMITS.eLo) / (OLIMITS.eHi - OLIMITS.eLo)) * M3.h, M3.x, M3.x + M3.w);
  $('scales').innerHTML = s;

  const offsets = {}; let angle = 0;
  const setLevel = (rect, tank, frac) => {
    const h = clamp(frac) * tank.h;
    rect.setAttribute('y', tank.y + tank.h - h); rect.setAttribute('height', h);
  };
  const flowDraw = (key, value, dt, running) => {
    const p = el['f-' + key], mag = Math.abs(value);
    const w = mag < 0.05 ? 0 : clamp(2 + 8 * Math.sqrt(mag / 100), 0, 11);
    p.style.strokeWidth = w;
    offsets[key] = (offsets[key] || 0) - (running ? Math.sign(value) * (8 + 1.1 * mag) * dt : 0);
    p.style.strokeDashoffset = offsets[key];
    return w;
  };

  // A gate is a pair of bars across a vertical pipe. hl and hr are how far the inner ends of the
  // left and right bars stand back from the pipe's centre line: with two plates on one rod each
  // plate sets its own bar, so the opening is the sum of the two plates' contributions.
  const gate = (k, hl, hr) => {
    const [gx, gy] = GATES[k], a = el['v' + k + '-a'], b = el['v' + k + '-b'];
    hl = Math.max(hl, 0.25); hr = Math.max(hr, 0.25);
    a.setAttribute('x', gx - 20); a.setAttribute('width', Math.max(0, 20 - hl)); a.setAttribute('y', gy - 3); a.setAttribute('height', 6);
    b.setAttribute('x', gx + hr); b.setAttribute('width', Math.max(0, 20 - hr)); b.setAttribute('y', gy - 3); b.setAttribute('height', 6);
  };

  // plate geometry: local y of the curve at variable value v (the plate slides so that this point
  // sits at the follower's height), and local x of the follower for output f
  const localY = (p, v) => {
    const t = clamp((v - p.vlo) / (p.vhi - p.vlo));
    const top = PAD_TOP, bot = p.h - PAD_BOT;
    return p.sgn > 0 ? bot - t * (bot - top) : top + t * (bot - top);
  };
  const localX = (p, f) => {
    const u = clamp((f - p.flo) / (p.fhi - p.flo));
    return p.side === 'L' ? p.w - PAD_X - u * (p.w - 2 * PAD_X) : PAD_X + u * (p.w - 2 * PAD_X);
  };
  const pdata = {};
  const plateDraw = (p, curves, vNow) => {
    const fn = curves[p.fn], gy = GATES[p.gate][1], gx = GATES[p.gate][0];
    let pts, ly0, fNow;
    if (p.v) {
      pts = [];
      for (let i = 0; i <= 16; i++) {
        const v = p.vlo + ((p.vhi - p.vlo) * i) / 16;
        pts.push(`${i ? 'L' : 'M'} ${localX(p, fn(v)).toFixed(1)} ${localY(p, v).toFixed(1)}`);
      }
      ly0 = localY(p, vNow); fNow = fn(vNow);
      el[p.id + '-line'].setAttribute('d', pts.join(' '));
      const bx = localX(p, p.base[1]), by = localY(p, p.base[0]);
      const b = el[p.id + '-base']; b.setAttribute('x1', bx - 4); b.setAttribute('x2', bx + 4); b.setAttribute('y1', by); b.setAttribute('y2', by);
    } else { // a plate with no float: a vertical curve that only the hand-set shift moves
      fNow = fn(); ly0 = (PAD_TOP + p.h - PAD_BOT) / 2;
      const fx = localX(p, fNow);
      el[p.id + '-line'].setAttribute('d', `M ${fx.toFixed(1)} ${PAD_TOP} L ${fx.toFixed(1)} ${p.h - PAD_BOT}`);
      const bx = localX(p, p.base[1]);
      const b = el[p.id + '-base']; b.setAttribute('x1', bx - 4); b.setAttribute('x2', bx + 4); b.setAttribute('y1', ly0); b.setAttribute('y2', ly0);
    }
    const top = gy - ly0, fxw = p.x + localX(p, fNow);
    el[p.id + '-g'].setAttribute('transform', `translate(${p.x},${top})`);
    el[p.id + '-dot'].setAttribute('cx', fxw); el[p.id + '-dot'].setAttribute('cy', gy);
    const outer = p.side === 'L' ? gx - 20 : gx + 20, rod = el[p.id + '-rod'];
    rod.setAttribute('x1', fxw); rod.setAttribute('x2', outer); rod.setAttribute('y1', gy); rod.setAttribute('y2', gy);
    pdata[p.id] = { top, bot: top + p.h, cx: p.x + p.w / 2 };
  };

  const setGauge = (id, v, scale, label) => {
    const len = clamp(v * scale, -150, 150);
    const bar = el[id + '-bar'];
    bar.setAttribute('x', len >= 0 ? 150 : 150 + len); bar.setAttribute('width', Math.abs(len));
    bar.setAttribute('class', len >= 0 ? 'gauge-pos' : 'gauge-neg');
    el[id + '-txt'].textContent = label(v);
  };
  const sign = (v, d = 1) => (v > 0.05 ? '+' : '') + v.toFixed(d);
  const putFloat = (id, x, y) => el[id].setAttribute('transform', `translate(${x},${y})`);

  function update(o, m, dt, running) {
    const s = m.s, c = m.curves;
    const lvY = o.Y / OLIMITS.Ymax, lvR = 1 - o.r / OLIMITS.rMax, lvE = 1 - (o.e - OLIMITS.eLo) / (OLIMITS.eHi - OLIMITS.eLo);
    setLevel(el.m1w, M1, lvY);
    setLevel(el.m2w, M2, lvR);
    setLevel(el.m3w, M3, lvE);
    // money-supply box
    const pegR = s.moneyMode === 'constant-rate', tapM = s.moneyMode === 'tap';
    const rT = tapM ? m.liquidity(s.tapTarget) : pegR ? OBASE.r0 : o.r;
    setLevel(el.mboxw, MBOX, 1 - rT / OLIMITS.rMax);
    el['mbox-note'].textContent = pegR ? 'rate held at ' + OBASE.r0 + '%' : tapM ? 'tap open' : 'tap closed';
    el.tapm.style.stroke = tapM ? 'var(--ok)' : 'var(--muted)';
    svg.classList.toggle('money-off', s.moneyMode === 'constant-money');
    // equalisation-account box
    const fxM = s.fxMode === 'managed', fxP = s.fxMode === 'pegged';
    const eT = fxM ? m.sterling(s.fxTarget) : fxP ? OBASE.e0 : o.e;
    setLevel(el.eboxw, EBOX, 1 - (eT - OLIMITS.eLo) / (OLIMITS.eHi - OLIMITS.eLo));
    el['ebox-note'].textContent = fxP ? 'rate pegged at ' + OBASE.e0 : fxM ? 'tap open' : 'floating (tap closed)';
    el.tape.style.stroke = fxM || fxP ? 'var(--ok)' : 'var(--muted)';
    svg.classList.toggle('fx-off', s.fxMode === 'floating');

    // flows
    const w = {};
    w.Y = flowDraw('Y', o.Y, dt, running); w.T = flowDraw('T', o.T, dt, running);
    flowDraw('YD', o.Yd, dt, running); w.C = flowDraw('C', o.C, dt, running);
    flowDraw('S', o.S, dt, running);
    w.I = flowDraw('I', o.I, dt, running); w.G = flowDraw('G', o.G, dt, running);
    { const gt = Math.abs(o.G - o.T) < 0.05 ? 0 : o.G - o.T; const wg = flowDraw('GT', gt, dt, running); el['f-GT'].style.strokeWidth = Math.max(wg, 3); }
    flowDraw('D', o.D - o.Im, dt, running);
    w.IM = flowDraw('IM', o.Im, dt, running); w.EX = flowDraw('EX', o.Ex, dt, running);
    flowDraw('MONEY', o.moneyFlow, dt, running);
    flowDraw('FX', s.fxMode === 'floating' ? 0 : o.fxFlow, dt, running);

    // plates (they move with their floats), followers and rods
    const vNow = { Y: o.Y, Yd: o.Yd, r: o.r, D: o.D, e: o.e };
    for (const p of PLATES) plateDraw(p, c, p.v ? vNow[p.v] : 0);

    // gates: single-plate gates open symmetrically; two-plate gates split the opening between the
    // plates in proportion to what each contributes to the flow
    const sym = (k) => gate(k, w[k] / 2, w[k] / 2);
    sym('T'); sym('I'); sym('G');
    const split = (k, first, total, wk) => {
      const share = Math.abs(total) > 1e-6 ? clamp(first / total, -0.5, 1.5) : 0.5;
      gate(k, wk * share, wk * (1 - share));
    };
    split('C', c.consume(o.Yd), o.C, w.C);
    split('IM', c.imports(o.D), o.Im, w.IM);
    split('EX', c.exportsDem(), o.Ex, w.EX);

    // floats ride the water (or the box levels); strings run from float to plate
    const surf = (tank, frac) => tank.y + tank.h - clamp(frac) * tank.h;
    const yY = surf(M1, lvY), yR = surf(M2, lvR), yE = surf(M3, lvE);
    const yYd = surf(YDBOX, o.Yd / 200), yD = surf(DBOX, o.D / 250);
    putFloat('flY', 345, yY - 9); putFloat('flr', 510, yR - 9); putFloat('fle', 694, yE - 9);
    putFloat('flYd', 380 + 0, yYd - 6); putFloat('flD', 380, yD - 6);
    const P = pdata;
    el.sy.setAttribute('d', `M 345 ${yY - 18} V 12 H ${P.pt.cx} V ${P.pt.top}`);
    el.sy2.setAttribute('d', `M ${P.pt.cx} ${P.pt.bot} V ${P.pg.top}`);
    el.syd.setAttribute('d', `M 380 ${yYd - 12} V 70 H ${P.pc.cx} V ${P.pc.top}`);
    el.sr.setAttribute('d', `M 510 ${yR - 18} V 150 H ${P.pr.cx} V ${P.pr.top}`);
    const mid = (P.pr.bot + P.pi.top) / 2;
    el.sr2.setAttribute('d', `M ${P.pr.cx} ${P.pr.bot} V ${mid} H ${P.pi.cx} V ${P.pi.top}`);
    const sx = P.pm.cx, sTop = DBOX.y + 7;
    el.sd.setAttribute('d', `M 380 ${yD - 12} V ${sTop} H ${sx} V ${P.px.bot - 8}`);
    el.se1.setAttribute('d', `M 694 ${yE - 18} V ${P.pe.bot}`);
    el.se2.setAttribute('d', `M 694 ${yE} V ${P.pq.top}`);

    angle += (o.Y / 100) * 4 * dt * (running ? 1 : 0);
    el.pump.setAttribute('transform', `rotate(${(angle * 180) / Math.PI})`);
    // numbers
    const NS = 'http://www.w3.org/2000/svg';
    const t = (id, txt) => {
      const node = el['t-' + id], i = txt.indexOf('  (');
      node.textContent = i < 0 ? txt : txt.slice(0, i);
      if (i >= 0) {
        const sp = document.createElementNS(NS, 'tspan'); sp.setAttribute('class', 'delta');
        if (id === 'GT') { sp.setAttribute('x', node.getAttribute('x')); sp.setAttribute('dy', '14'); sp.textContent = txt.slice(i + 2); }
        else sp.textContent = txt.slice(i);
        node.appendChild(sp);
      }
    };
    const B = OBASE, Yd0 = B.Y0 - B.T0, D0 = B.C0 + B.I0 + B.G0;
    // value, with the change from the starting equilibrium in brackets once it shows at this precision
    const dl = (v, v0, dec) => { const d = +(v - v0).toFixed(dec); return d === 0 ? '' : '  (' + (d > 0 ? '+' : '−') + Math.abs(d).toFixed(dec) + ')'; };
    t('Y', 'Y = ' + o.Y.toFixed(0) + dl(o.Y, B.Y0, 0)); t('T', 'T = ' + o.T.toFixed(1) + dl(o.T, B.T0, 1));
    t('YD', 'Yd ' + o.Yd.toFixed(0) + dl(o.Yd, Yd0, 0));
    t('C', 'C = ' + o.C.toFixed(0) + dl(o.C, B.C0, 0)); t('S', 'S = ' + o.S.toFixed(1) + dl(o.S, Yd0 - B.C0, 1));
    t('I', 'I = ' + o.I.toFixed(1) + dl(o.I, B.I0, 1)); t('G', 'G = ' + o.G.toFixed(1) + dl(o.G, B.G0, 1));
    t('GT', 'G−T = ' + (o.G - o.T).toFixed(1) + dl(o.G - o.T, B.G0 - B.T0, 1));
    t('D', 'D = ' + o.D.toFixed(0) + dl(o.D, D0, 0)); t('DM', 'E = ' + (o.D - o.Im).toFixed(0) + dl(o.D - o.Im, D0 - B.Im0, 0));
    t('IM', 'Im = ' + o.Im.toFixed(1) + dl(o.Im, B.Im0, 1)); t('EX', 'Ex = ' + o.Ex.toFixed(1) + dl(o.Ex, B.Ex0, 1));
    t('e', o.e.toFixed(1) + '   (' + sign(o.e - OBASE.e0) + ')'); t('r', o.r.toFixed(2) + '%   (' + sign(o.r - OBASE.r0, 2) + ')');
    el.warn.textContent = o.atLimit ? 'tank at its limit: the model has run off the scale' : '';
    setGauge('gb', o.budget, 12, (v) => (v >= 0 ? 'surplus ' : 'deficit ') + Math.abs(v).toFixed(1) + ' a year');
    setGauge('gt', o.trade, 12, (v) => (v >= 0 ? 'surplus ' : 'deficit ') + Math.abs(v).toFixed(1) + ' a year');
    setGauge('gr', o.R, 2.5, (v) => 'reserves ' + sign(v) + ' since the start');
  }
  return { update };
}
