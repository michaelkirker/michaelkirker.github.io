// Changes made to the machine take effect at the start of the next whole model year, so the
// chart markers (and the label "change at year N") always sit on a whole year, and the response
// begins exactly at the marker. A change made at exactly a whole year applies at once.
// Several changes to the same control within one year collapse into the last one.
export function createPending(machine, onApply) {
  let list = [];
  const EPS = 1e-9;
  const api = {
    add(key, label, run, sync = false) {
      const t = Math.ceil(machine.t - EPS);
      const same = key && list.find((p) => p.key === key && p.t === t);
      if (same) { same.label = label; same.run = run; same.sync = sync; }
      else list.push({ t, key, label, run, sync });
    },
    clear() { list = []; },
    nextYear() { return list.length ? Math.min(...list.map((p) => p.t)) : null; },
    flush() {
      const due = list.filter((p) => p.t <= machine.t + EPS).sort((a, b) => a.t - b.t);
      list = list.filter((p) => p.t > machine.t + EPS);
      for (const p of due) onApply(p);
    },
    // advance the machine by dt model-years, pausing at each whole year where a change is due
    advance(dt) {
      let rem = dt;
      for (let guard = 0; guard < 50; guard++) {
        const n = api.nextYear();
        if (n !== null && machine.t + rem >= n - EPS) {
          const d = Math.max(0, n - machine.t);
          if (d > 0) machine.advance(d);
          rem -= d;
          api.flush();
        } else { if (rem > 0) machine.advance(rem); break; }
      }
    },
  };
  return api;
}
