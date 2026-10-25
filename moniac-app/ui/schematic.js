// SVG schematic of the closed-economy machine (Phillips 1950, Fig. 3).
// Tanks fill, pipes carry animated water whose speed and thickness follow the flows,
// valve plates open and close, and small curve plates show the operating points.
import { BASE, LIMITS } from '../sim/machine.js';

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

// Geometry (viewBox 960 x 640)
const M1 = { x: 170, y: 440, w: 470, h: 170 };
const M2 = { x: 400, y: 180, w: 240, h: 200 };
const FLOAT = { x: 670, y: 440, w: 24, h: 170 };
const BOX = { x: 745, y: 215, w: 90, h: 140 };

const PIPES = {
  Y: 'M 170 592 H 50 V 60 H 330',
  C: 'M 330 60 V 440',
  S: 'M 330 60 H 520 V 196',
  I: 'M 520 380 V 440',
  MONEY: 'M 745 300 H 640',
};

const plate = (id, x, y, title, xLabel, yLabel) => `
  <g transform="translate(${x},${y})">
    <rect class="plate" width="110" height="92" rx="3"/>
    <text class="small strong" x="6" y="13">${title}</text>
    <line class="axis" x1="14" y1="76" x2="104" y2="76"/><line class="axis" x1="14" y1="20" x2="14" y2="76"/>
    <text class="tiny" x="104" y="88" text-anchor="end">${xLabel}</text>
    <text class="tiny" x="4" y="26">${yLabel}</text>
    <path id="${id}-line" class="curve" d=""/>
    <line id="${id}-base" class="basecross" x1="0" y1="0" x2="0" y2="0"/>
    <circle id="${id}-dot" class="dot" r="4"/>
  </g>`;

const markup = `
<defs><clipPath id="clip-m1"><rect x="${M1.x}" y="${M1.y}" width="${M1.w}" height="${M1.h}"/></clipPath>
<clipPath id="clip-m2"><rect x="${M2.x}" y="${M2.y}" width="${M2.w}" height="${M2.h}"/></clipPath>
<clipPath id="clip-box"><rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}"/></clipPath></defs>

<!-- tanks: water first, outline on top -->
<rect id="m1w" class="water" x="${M1.x}" y="${M1.y + M1.h}" width="${M1.w}" height="0"/>
<rect class="tank" x="${M1.x}" y="${M1.y}" width="${M1.w}" height="${M1.h}"/>
<rect id="m2w" class="water idle" x="${M2.x}" y="${M2.y + M2.h}" width="${M2.w}" height="0"/>
<rect class="tank" x="${M2.x}" y="${M2.y}" width="${M2.w}" height="${M2.h}"/>
<rect id="fw" class="water" x="${FLOAT.x}" y="${FLOAT.y + FLOAT.h}" width="${FLOAT.w}" height="0"/>
<rect class="tank" x="${FLOAT.x}" y="${FLOAT.y}" width="${FLOAT.w}" height="${FLOAT.h}"/>
<path class="pipe" d="M 640 598 H ${FLOAT.x}"/>
<rect id="boxw" class="water idle" x="${BOX.x}" y="${BOX.y + BOX.h}" width="${BOX.w}" height="0"/>
<rect id="boxo" class="tank" x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}"/>

<!-- scales -->
<g id="scales"></g>

<!-- pipes with animated water -->
${Object.entries(PIPES).map(([k, d]) => `<path class="pipe" d="${d}"/><path id="f-${k}" class="flow" d="${d}"/>`).join('\n')}

<!-- valves: two plates with a gap -->
<g id="vS"><rect class="valve" id="vS-l" x="500" y="124" width="10" height="7"/><rect class="valve" id="vS-r" x="530" y="124" width="10" height="7"/></g>
<g id="vI"><rect class="valve" id="vI-l" x="500" y="406" width="10" height="7"/><rect class="valve" id="vI-r" x="530" y="406" width="10" height="7"/></g>
<line id="tapv" class="tapv" x1="692" y1="288" x2="692" y2="312"/>

<!-- pump -->
<g transform="translate(110,592)"><circle class="pumpc" r="24"/><g id="pump">
<line class="blade" x1="0" y1="0" x2="0" y2="-18"/><line class="blade" x1="0" y1="0" x2="15.6" y2="9"/><line class="blade" x1="0" y1="0" x2="-15.6" y2="9"/></g></g>

<!-- accelerator float marker and link to investment valve -->
<line id="fm" class="marker" x1="${FLOAT.x - 4}" x2="${FLOAT.x + FLOAT.w + 4}" y1="0" y2="0"/>
<path id="flink" class="link" d="M ${FLOAT.x + FLOAT.w / 2} ${FLOAT.y} V 410 H 545"/>

<!-- labels -->
<text class="label" x="${M1.x + 8}" y="${M1.y + M1.h - 8}">M1  active balances</text>
<text class="label" x="${M2.x + 8}" y="${M2.y + 16}">M2  idle balances</text>
<text class="label" x="${FLOAT.x - 6}" y="${FLOAT.y - 8}">accelerator float</text>
<text class="label" id="box-title" x="${BOX.x}" y="${BOX.y - 8}">money supply</text>
<text class="label" x="${BOX.x}" y="${BOX.y + BOX.h + 16}" id="box-note"></text>
<text class="val" id="t-Y" x="38" y="330" transform="rotate(-90 38 330)">Y</text>
<text class="val" id="t-C" x="340" y="260">C</text>
<text class="val" id="t-S" x="530" y="160">S</text>
<text class="val" id="t-I" x="530" y="426">I</text>
<text id="warn" class="warn" x="170" y="428"></text>

${plate('ps', 700, 14, 'Propensity to save', 'income', 'S')}
${plate('pm', 826, 14, 'Marginal eff. of capital', 'rate', 'I')}
`;

export function createSchematic(svg) {
  svg.setAttribute('viewBox', '0 0 960 640');
  svg.innerHTML = markup;
  const $ = (id) => svg.querySelector('#' + CSS.escape(id));
  const el = {};
  for (const id of ['m1w', 'm2w', 'fw', 'fm', 'boxw', 'pump', 'tapv', 'warn', 'box-note', 'box-title',
    't-Y', 't-C', 't-S', 't-I', 'vS-l', 'vS-r', 'vI-l', 'vI-r', 'flink',
    'ps-line', 'ps-dot', 'ps-base', 'pm-line', 'pm-dot', 'pm-base']) el[id] = $(id);
  for (const k of Object.keys(PIPES)) el['f-' + k] = $('f-' + k);

  // Scales
  const sc = $('scales');
  let s = '';
  for (const Y of [0, 50, 100, 150, 200, 250]) {
    const y = M1.y + M1.h - (Y / LIMITS.Ymax) * M1.h;
    s += `<line class="tick" x1="${M1.x - 6}" x2="${M1.x}" y1="${y}" y2="${y}"/><text class="tiny" x="${M1.x - 9}" y="${y + 3}" text-anchor="end">${Y}</text>`;
  }
  s += `<text class="tiny" x="${M1.x - 36}" y="${M1.y - 16}">income Y</text>`;
  for (const r of [0, 3, 6, 9, 12]) {
    const y = M2.y + (r / LIMITS.rMax) * M2.h;
    s += `<line class="tick" x1="${M2.x + M2.w}" x2="${M2.x + M2.w + 6}" y1="${y}" y2="${y}"/><text class="tiny" x="${M2.x + M2.w + 9}" y="${y + 3}">${r}%</text>`;
  }
  s += `<text class="tiny" x="${M2.x + M2.w + 9}" y="${M2.y + M2.h + 18}">interest rate r (level reads inversely)</text>`;
  s += `<line id="eq1" class="eqline" x1="${M1.x}" x2="${M1.x + M1.w}" y1="${M1.y + M1.h - (BASE.Y0 / LIMITS.Ymax) * M1.h}" y2="${M1.y + M1.h - (BASE.Y0 / LIMITS.Ymax) * M1.h}"/>`;
  const yr0 = M2.y + (BASE.r0 / LIMITS.rMax) * M2.h;
  s += `<line class="eqline" x1="${M2.x}" x2="${M2.x + M2.w}" y1="${yr0}" y2="${yr0}"/>`;
  sc.innerHTML = s;

  const offsets = {}; let angle = 0;

  const setLevel = (rect, tank, frac) => {
    const h = clamp(frac) * tank.h;
    rect.setAttribute('y', tank.y + tank.h - h); rect.setAttribute('height', h);
  };
  const flowDraw = (key, value, dt, running) => {
    const p = el['f-' + key];
    const mag = Math.abs(value);
    const w = clamp(2 + 8 * Math.sqrt(mag / 100), 0, 11);
    p.style.strokeWidth = mag < 0.05 ? 0 : w;
    offsets[key] = (offsets[key] || 0) - (running ? Math.sign(value) * (8 + 1.1 * mag) * dt : 0);
    p.style.strokeDashoffset = offsets[key];
    return mag < 0.05 ? 0 : w;
  };
  const valve = (id, w) => {
    const g = Math.max(w, 0.5);
    el[id + '-l'].setAttribute('x', 500); el[id + '-l'].setAttribute('width', 20 - g / 2);
    el[id + '-r'].setAttribute('x', 520 + g / 2); el[id + '-r'].setAttribute('width', 20 - g / 2);
  };
  const mapX = (v, lo, hi) => 14 + ((v - lo) / (hi - lo)) * 90;
  const mapY = (v, lo, hi) => 76 - ((clamp((v - lo) / (hi - lo))) * 56);
  const plateDraw = (id, f, x, xlo, xhi, ylo, yhi, base, dotY) => {
    el[id + '-line'].setAttribute('d', `M ${mapX(xlo, xlo, xhi)} ${mapY(f(xlo), ylo, yhi)} L ${mapX(xhi, xlo, xhi)} ${mapY(f(xhi), ylo, yhi)}`);
    const bx = mapX(base[0], xlo, xhi), by = mapY(base[1], ylo, yhi);
    const b = el[id + '-base'];
    b.setAttribute('x1', bx - 3); b.setAttribute('x2', bx + 3); b.setAttribute('y1', by); b.setAttribute('y2', by);
    el[id + '-dot'].setAttribute('cx', mapX(clamp(x, xlo, xhi), xlo, xhi));
    el[id + '-dot'].setAttribute('cy', mapY(dotY, ylo, yhi));
  };

  function update(o, m, dt, running) {
    const s = m.s;
    setLevel(el.m1w, M1, o.Y / LIMITS.Ymax);
    setLevel(el.fw, FLOAT, o.Y / LIMITS.Ymax);
    setLevel(el.m2w, M2, 1 - o.r / LIMITS.rMax);
    // accelerator float marker (inner water level lags the M1 level)
    const ym = FLOAT.y + FLOAT.h - clamp(o.Ylag / LIMITS.Ymax) * FLOAT.h;
    el.fm.setAttribute('y1', ym); el.fm.setAttribute('y2', ym);
    svg.classList.toggle('no-accel', s.beta <= 0);
    // money box
    const pegged = s.mode === 'constant-rate';
    const tapOn = s.mode === 'tap';
    const rT = tapOn ? m.liquidity(s.tapTarget) : pegged ? BASE.r0 : m.liquidity(o.M2);
    setLevel(el.boxw, BOX, 1 - rT / LIMITS.rMax);
    svg.classList.toggle('money-off', s.mode === 'constant-money');
    el['box-note'].textContent = pegged ? 'rate held at ' + BASE.r0 + '%' : tapOn ? 'tap open' : 'tap closed';
    el.tapv.style.stroke = tapOn ? 'var(--ok)' : 'var(--muted)';
    // flows
    flowDraw('Y', o.Y, dt, running);
    flowDraw('C', o.C, dt, running);
    const wS = flowDraw('S', o.S, dt, running);
    const wI = flowDraw('I', o.I, dt, running);
    flowDraw('MONEY', tapOn ? o.moneyFlow : 0, dt, running);
    valve('vS', wS); valve('vI', wI);
    angle += (o.Y / 100) * 4 * dt * (running ? 1 : 0);
    el.pump.setAttribute('transform', `rotate(${(angle * 180) / Math.PI})`);
    // numbers
    el['t-Y'].textContent = 'Y = ' + o.Y.toFixed(0);
    el['t-C'].textContent = 'C = ' + o.C.toFixed(0);
    el['t-S'].textContent = 'S = ' + o.S.toFixed(1);
    el['t-I'].textContent = 'I = ' + o.I.toFixed(1);
    el.warn.textContent = o.atLimit ? 'tank at its limit: the model has run off the scale' : '';
    // curve plates
    plateDraw('ps', m.saveY, o.Y, 0, LIMITS.Ymax, -10, 70, [BASE.Y0, BASE.S0], m.saveY(o.Y));
    plateDraw('pm', m.mec, o.r, 0, LIMITS.rMax, -10, 70, [BASE.r0, BASE.S0], m.mec(o.r));
  }
  return { update };
}
