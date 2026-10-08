// sdlib.js: shared rules for the v4.14 checks (contrast.js, tapprobe.js, audit.js, firetest.js)
// - refuses to run without SD_PORT, or on 8765 (the laptop's QGIS bridge lives there)
// - FAIL lines are '^FAIL <check> <detail>'; firetest.js compares the set of <check> names to plants.json
// - pinClock: Date.now() and new Date() read Wed 2026-10-07 10:00 local plus real elapsed time
//   (a constant offset, so time still moves and GSAP still runs; timers and rAF are untouched)
const fs = require('fs'); require('./mute');  // test browsers never play sound out loud

function port(name = 'SD_PORT') {
  const p = process.env[name];
  if (!p || p === '8765') { console.log(`FAIL setup ${name} is ${p ? '8765 (the QGIS bridge)' : 'not set'}; run with SD_PORT=8866 SD_PORT2=8867`); process.exit(2); }
  return p;
}

// test-only switches must never reach a gate run
function refuseTestModes() {
  for (const k of ['TAPPROBE_LIVE', 'T7_PLANT']) if (process.env[k]) { console.log(`FAIL setup ${k} is set; it is a test-only switch and cannot be used in a gate run`); process.exit(2); }
}

const PIN = { y: 2026, m: 9, d: 7, h: 10, min: 0 };  // Wednesday 7 October 2026, 10:00 local (a study day, inside a study block)
async function pinClock(ctx) {
  await ctx.addInitScript(({ y, m, d, h, min }) => {
    const Real = Date, off = new Real(y, m, d, h, min, 0).getTime() - Real.now();
    class PinnedDate extends Real { constructor(...a) { if (a.length) super(...a); else super(Real.now() + off); } static now() { return Real.now() + off; } }
    window.Date = PinnedDate;
  }, PIN);
}

function reporter() {
  let fails = 0;
  return {
    pass(check, msg) { console.log(`PASS ${check} ${msg}`); },
    fail(check, msg) { fails++; console.log(`FAIL ${check} ${msg}`); },
    ok(c, check, msg) { c ? this.pass(check, msg) : this.fail(check, msg); return c; },
    get fails() { return fails; },
    end() { console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exitCode = fails ? 1 : 0; }
  };
}

// '^FAIL <check>' or '^FAIL [mode] <check>' -> the check name used by firetest.js
const failNames = text => [...new Set(text.split(/\r?\n/).map(l => l.match(/^FAIL ((?:\[[^\]]+\] )?\S+)/)).filter(Boolean).map(m => m[1]))].sort();

const readJSON = (f, dflt) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return dflt; } };

// replace navigate() after load: 's3' = the v4.14 body (GSAP 'nav' tween on the content), 'old' = the v4.13 body (view transition)
async function installNav(p, kind) {
  return p.evaluate(kind => { const DX = { forward: 24, back: -24, 'tab-r': 24, 'tab-l': -24, tab: 0 };
    window.navigate = kind === 's3' ? (fn, dir) => { const run = () => { fn(); render(true); }; run(); if (FX.on) { const v = $('#main .view'); v.style.animation = 'none'; gsap.fromTo(v, { x: DX[dir], y: dir === 'tab' ? 8 : 0, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .28, ease: 'power3.out', overwrite: true, id: 'nav', clearProps: 'transform,opacity' }); } }
      : (fn, dir) => { const run = () => { fn(); render(true); }; if (FX.on && document.startViewTransition) { document.documentElement.dataset.nav = dir; const vt = document.startViewTransition(run); vt.finished.finally(() => delete document.documentElement.dataset.nav); } else run(); };
    return String(navigate).includes(kind === 's3' ? 'gsap.fromTo' : 'startViewTransition'); }, kind);
}

module.exports = { port, refuseTestModes, pinClock, PIN, reporter, failNames, readJSON, installNav };
