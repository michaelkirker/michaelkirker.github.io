// Hover callouts: explain each label, tank and curve plate, and what it depends on in the model.
// Elements opt in with a data-tip attribute; TIPS holds the text.
const TIPS = {
  Y: ['Y: national income', 'The flow of money pumped round the machine each year (bn per year). It leaves the active-balances tank M1 at a rate proportional to the water level: Y = M1 ÷ P, where P is the circulation period (about a quarter of a year). Y therefore chases total spending, with a lag. Depends on: spending (E) and the starting level of M1.'],
  T: ['T: taxation', 'Taxes collected from income and passed to the government box. T = tax rate × Y, plus any tax-shift shock. Depends on: income Y, the tax rate slider and the tax shock. Set by the Taxation plate, which is moved by the Y float.'],
  Yd: ['Yd: disposable income (Y − T)', 'What households have left after tax. It drops down the centre column and divides into consumption C and saving S. Depends on: income Y and taxes T.'],
  C: ['C: consumption', 'Spending by households. It depends on two things: disposable income Yd (more income, more spending, by the marginal propensity to consume) and the interest rate r (a higher rate encourages saving, so consumption falls). The saving shock moves the curve. Set by two plates on one rod: C(Yd) and C(r), whose effects add.'],
  S: ['S: saving', 'The part of disposable income not consumed: S = Yd − C. It runs into the idle-balances tank M2, so saving raises M2 and lowers the interest rate. It has no gate of its own; it is simply what is left after the consumption gate.'],
  I: ['I: investment', 'Spending on new capital, drawn from the idle-balances tank M2. It depends on the interest rate r (a lower rate makes more projects worthwhile) through the marginal-efficiency-of-capital curve. The investment shock shifts the curve. Set by the Investment plate, moved by the r float.'],
  G: ['G: government spending', 'Spending by the government, leaving the GB box. It starts at a fixed level and can be moved with the government-spending shock. If the “automatic stabiliser” slope is set, it also falls as income rises. Set by the Government plate, moved by the Y float.'],
  GT: ['G − T: the budget balance', 'Taxes flow into the GB box and government spending flows out. The difference runs to or from the idle-balances tank M2: a deficit (G above T) draws water out of M2, raising the interest rate; a surplus pours water in. The pipe is stationary when the budget balances.'],
  D: ['D: domestic expenditure (C + I + G)', 'Total spending on consumption, investment and government, before leakage to imports. It is the sum of the three pipes meeting at this box. Imports Im depend on it.'],
  E: ['E: spending on home output (D − Im)', 'Domestic expenditure less the part that leaks abroad as imports. It flows back into M1; export earnings (Ex) are added from the sterling tank. Income Y rises whenever E plus exports exceeds Y.'],
  Im: ['Im: imports', 'Money spent on foreign goods, flowing from the D box into the sterling tank M3. It depends on domestic expenditure D (the propensity to import) and on the exchange rate e (a higher rate for sterling makes imports cheaper, so more are bought). Set by two plates on one rod: Im(D) and Im(e).'],
  Ex: ['Ex: exports', 'Foreign spending on our goods, flowing from the sterling tank M3 back into M1. It depends on overseas demand (the export-demand shock) and on the exchange rate e (a higher rate makes exports dearer, so fewer are sold). Set by two plates on one rod: foreign demand and Ex(e).'],
  e: ['e: the exchange rate', 'The value of sterling, read off the level of the sterling tank M3 (the scale runs inversely: more water means a lower rate). It moves when imports and exports differ, because the gap fills or drains M3. The equalisation account can hold it steady (managed or pegged).'],
  r: ['r: the interest rate', 'Read off the level of the idle-balances tank M2 (liquidity preference): the less idle money, the higher the rate. It rises when the government runs a deficit or investment exceeds saving, and falls when saving exceeds investment. It affects consumption C and investment I.'],
  m1: ['M1: active balances', 'Money in use for transactions. Water flows in as spending E and out as income Y; the level is therefore income itself (Y = M1 ÷ P). The dashed line marks the starting equilibrium.'],
  m2: ['M2: idle balances', 'Money held back from spending. Saving and budget surpluses add to it; investment and budget deficits draw from it. Its level sets the interest rate r (the tank is shaped by the liquidity-preference curve). The dashed line marks the starting equilibrium.'],
  m3: ['M3: foreign-owned sterling', 'Sterling held by foreigners. Imports pour in; exports drain out. The level sets the exchange rate e. The dashed line marks the starting equilibrium.'],
  money: ['Money supply', 'The box that tops up or draws off M2. With the tap closed the total quantity of money is fixed; open it to hold the interest rate steady instead, or to pour water in and out with the buttons.'],
  eq: ['Exchange equalisation account', 'The government’s reserve of sterling. Floating: tap closed and the rate finds its own level. Managed or pegged: the tap opens and the account buys or sells to hold the rate at its target.'],
  gbox: ['GB box (government balance)', 'Where taxes arrive and government spending leaves. Any difference passes to or from M2.'],
  dbox: ['D box', 'Where consumption, investment and government spending meet; imports leak out of its base.'],
  ydbox: ['Yd box', 'Measures disposable income, Y − T, after tax has been taken from income.'],
  gb: ['Budget balance', 'Taxes less government spending. A bar to the left is a deficit, to the right a surplus.'],
  gt: ['Trade balance', 'Exports less imports. A bar to the left is a deficit, to the right a surplus.'],
  gr: ['Equalisation-account reserves', 'How much sterling the account has gained or lost since the start, when it is managing or pegging the rate.'],
  fY: ['Y float', 'Rides the water level in M1, so it reads income Y. Strings carry its movement to the Taxation and Government plates.'],
  fYd: ['Yd float', 'Rides the level in the Yd box, so it reads disposable income. Its string moves the C(Yd) plate.'],
  fr: ['r float', 'Rides the water level in M2, so it reads the interest rate. Strings carry it to the C(r) and I(r) plates.'],
  fD: ['D float', 'Rides the level in the D box, so it reads domestic expenditure. Its string moves the Im(D) plate.'],
  fe: ['e float', 'Rides the water level in M3, so it reads the exchange rate. Strings carry it to the Im(e) and Ex(e) plates.'],
  pt: ['Taxation plate: T(Y)', 'The curve shows tax collected at each level of income. The Y float slides the plate up and down; the cut curve pushes the follower dot sideways, and the rod opens or closes the T gate. Slope: tax-rate slider.'],
  pg: ['Government plate: G(Y)', 'Government spending against income. A flat curve means G ignores income; a sloping one makes spending fall as income rises (automatic stabilisers).'],
  pc: ['Consumption plate: C(Yd)', 'Consumption against disposable income. The slope is the marginal propensity to consume. Works with the C(r) plate on the same gate; their effects add.'],
  pr: ['Consumption plate: C(r)', 'The effect of the interest rate on consumption: a higher rate cuts spending. Works with the C(Yd) plate on the same gate; their effects add.'],
  pi: ['Investment plate: I(r)', 'Investment against the interest rate (marginal efficiency of capital): a higher rate means less investment.'],
  pm: ['Imports plate: Im(D)', 'Imports against domestic expenditure. The slope is the propensity to import. Works with Im(e) on the same gate.'],
  pe: ['Imports plate: Im(e)', 'The effect of the exchange rate on imports: a higher rate for sterling means more imports. Works with Im(D) on the same gate.'],
  px: ['Exports plate: foreign demand', 'Overseas demand for our goods. It has no float: it moves only with the export-demand shock. Works with Ex(e) on the same gate.'],
  pq: ['Exports plate: Ex(e)', 'The effect of the exchange rate on exports: a higher rate for sterling means fewer exports. Works with the foreign-demand plate on the same gate.'],
};

export function attachCallouts(svg) {
  const tip = document.createElement('div');
  tip.className = 'callout'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);
  let current = null;
  const show = (key, x, y) => {
    const t = TIPS[key]; if (!t) return;
    if (current !== key) { tip.innerHTML = '<b></b><span></span>'; tip.firstChild.textContent = t[0]; tip.lastChild.textContent = t[1]; current = key; }
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight, pad = 14;
    let left = x + pad, top = y + pad;
    if (left + w > innerWidth - 8) left = Math.max(8, x - w - pad);
    if (top + h > innerHeight - 8) top = Math.max(8, y - h - pad);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  };
  const hide = () => { tip.hidden = true; current = null; };
  svg.addEventListener('mousemove', (ev) => {
    const el = ev.target.closest && ev.target.closest('[data-tip]');
    if (el) show(el.getAttribute('data-tip'), ev.clientX, ev.clientY); else hide();
  });
  svg.addEventListener('mouseleave', hide);
  // keyboard / touch: tapping an element shows its callout until the next tap
  svg.addEventListener('click', (ev) => {
    const el = ev.target.closest && ev.target.closest('[data-tip]');
    if (el && 'ontouchstart' in window) show(el.getAttribute('data-tip'), ev.clientX, ev.clientY);
  });
}

// ids (or selectors) in the schematic mapped to the tip that explains them
export const TIP_TARGETS = {
  '#t-Y': 'Y', '#t-T': 'T', '#t-YD': 'Yd', '#t-C': 'C', '#t-S': 'S', '#t-I': 'I', '#t-G': 'G', '#t-GT': 'GT',
  '#t-D': 'D', '#t-DM': 'E', '#t-IM': 'Im', '#t-EX': 'Ex', '#t-e': 'e', '#t-r': 'r',
  '#m1w': 'm1', '#m2w': 'm2', '#m3w': 'm3', '#mbox': 'money', '#mboxw': 'money', '#ebox': 'eq', '#eboxw': 'eq',
  '#flY': 'fY', '#flYd': 'fYd', '#flr': 'fr', '#flD': 'fD', '#fle': 'fe',
  '#pt-g': 'pt', '#pg-g': 'pg', '#pc-g': 'pc', '#pr-g': 'pr', '#pi-g': 'pi', '#pm-g': 'pm', '#pe-g': 'pe', '#px-g': 'px', '#pq-g': 'pq',
  '#gbox': 'gbox', '#dbox': 'dbox', '#ydbox': 'ydbox', '#gaugeb': 'gb', '#gaugeT': 'gt', '#gaugeR': 'gr',
};
