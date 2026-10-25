// Guided experiments. Each sets the machine up from rest, applies one or more shocks
// at given times, and explains what to watch. Times are model years.
export const EXPERIMENTS = [
  {
    id: 'multiplier-pegged',
    title: 'The multiplier (rate pegged)',
    setup: { mode: 'constant-rate' },
    events: [{ t: 1, label: 'Investment +10', run: (m) => m.set({ dI: 10 }) }],
    intro: 'The central bank holds the interest rate at 4%. Investment suddenly rises by 10 a year.',
    watch: 'Income climbs to 150: a rise of 50, which is 10 ÷ the propensity to save (0.2), the textbook multiplier of 5. It does not jump. Spending first piles up in the tank and income follows it up with a lag, so the adjustment is exponential with a time constant of P ÷ σ, about 1.5 years. Watch saving rise until it equals investment again.',
    ref: 'Phillips §2, eq. 5–6',
  },
  {
    id: 'multiplier-money',
    title: 'The multiplier (fixed money)',
    setup: { mode: 'constant-money' },
    events: [{ t: 1, label: 'Investment +10', run: (m) => m.set({ dI: 10 }) }],
    intro: 'The same investment boost, but now the quantity of money is fixed and the interest rate is free to move.',
    watch: 'Higher income draws water out of the idle-balances tank, so the interest rate rises. That chokes off some investment and encourages some saving. Income ends well below 150 and settles faster than in the pegged case. Phillips: “the multiplier is smaller, and the process of adjustment more rapid”. Compare with the previous experiment.',
    ref: 'Phillips §3, eq. 11–12',
  },
  {
    id: 'easy-money',
    title: 'Easy money',
    setup: { mode: 'constant-money' },
    events: [{ t: 1, label: 'Inject +20 idle balances', run: (m) => m.inject(20) }],
    intro: 'Extra money (+20) is poured into the idle-balances tank, with the money tap closed.',
    watch: 'The interest rate drops at once, because price is read straight off the water level. Investment then rises, income follows, and the extra income pulls water back out of the idle tank, so the interest rate climbs part of the way back. Liquidity preference and loanable funds are two halves of one process.',
    ref: 'Phillips §5, p.299–300',
  },
  {
    id: 'thrift',
    title: 'The paradox of thrift',
    setup: { mode: 'constant-rate' },
    events: [{ t: 1, label: 'Saving +5', run: (m) => m.set({ dS: 5 }) }],
    intro: 'Households decide to save 5 more at every level of income. The interest rate is pegged.',
    watch: 'Saving jumps above investment, so more water drains into idle balances than comes back out as investment. Income falls until saving has been pushed back to equal investment, a fall of 25. Everyone tried to save more, and total saving ends up unchanged.',
    ref: 'Follows from Phillips §2',
  },
  {
    id: 'accelerator',
    title: 'Accelerator cycles',
    setup: { mode: 'constant-rate', beta: 0.3, gamma: 0.5 },
    events: [{ t: 1, label: 'Investment +10', run: (m) => m.set({ dI: 10 }) }],
    intro: 'Induced investment now responds to the rate of change of income (the accelerator float), with a lag.',
    watch: 'Income overshoots its new level and then oscillates, with the cycles dying away. Watch the float on the right: its marker lags behind the water level and pulls the investment valve. Try raising the acceleration coefficient β until the cycles stop dying away, and then explode.',
    ref: 'Phillips §4, eq. 13–15',
  },
];
