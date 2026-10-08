// tapprobe.js: after a screen change, how long until a tap on the new screen's first button lands?
// Taps go to the button's SETTLED centre (where it rests once nothing moves it), so a slide that is still
// on its way cannot count as "tappable". Pinned clock (Wed 10:00), sample library, phone size, motion on.
//   SD_PORT=8866 node -r ./with-sample.js tapprobe.js            gate: 50 timed navigations + edge cases (R2, R7)
//   SD_PORT=8866 node -r ./with-sample.js tapprobe.js --reduce   reduced motion runs no animation, both modes (R3)
// Test-only: PLANT=<name> injects a fault after load (fire tests); TAPPROBE_LIVE=1 probes the button's live
// centre instead (counter-control for the settled-point plant, never a gate).
const { port, pinClock, reporter, readJSON } = require('./sdlib');
const { chromium } = require('playwright'); const fs = require('fs');
const LIVE = !!process.env.TAPPROBE_LIVE, REDUCE = process.argv.includes('--reduce'), PLANT = process.env.PLANT || '';
console.log(LIVE ? 'MODE live (counter-control, not a gate)' : REDUCE ? 'MODE reduce' : 'MODE settled');
if (process.env.T7_PLANT) { console.log('FAIL setup T7_PLANT is set; it is a test-only switch for t7.js'); process.exit(2); }
const URL0 = `http://localhost:${port()}/`, N = 50, WARM = 3, CAP = 2000, SETTLE_CAP = 3000;
const BASE = __dirname + '/baseline/tapprobe.json';

// everything the page needs: target finder, settle rule, nav-tween counter, plants
function pageSetup(PLANT) {
  window.__errs = window.__errs || []; window.__nav = [];
  addEventListener('error', e => __errs.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __errs.push(String(e.reason && e.reason.message || e.reason)));
  // positive control: count 'nav' tweens and where they start
  const realFromTo = gsap.fromTo.bind(gsap);
  gsap.fromTo = (t, a, b) => { if (b && b.id === 'nav') __nav.push({ x: a && a.x, y: a && a.y }); return realFromTo(t, a, b); };
  // the first button of a screen that a finger can reach: [data-action]/[data-go], visible, inside the viewport
  window.__target = v => [...v.querySelectorAll('[data-action],[data-go]')].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; }) || null;
  window.__desc = e => e ? e.tagName.toLowerCase() + (e.dataset.action ? `[data-action=${e.dataset.action}]` : '') + (e.dataset.go ? `[data-go=${e.dataset.go}]` : '') : null;
  // settled: no running/pending animation on the button, its ancestors up to .view, or their pseudo-elements,
  // no view transition in progress (its overlay takes every tap), and no active GSAP tween on that chain
  window.__settled = btn => {
    const chain = []; for (let e = btn; e; e = e.parentElement) { chain.push(e); if (e.classList.contains('view')) break; }
    const set = new Set(chain);
    const moving = document.getAnimations().some(a => (a.playState === 'running' || a.playState === 'pending') && a.effect &&
      (set.has(a.effect.target) || String(a.effect.pseudoElement || '').startsWith('::view-transition')));
    return !moving && !chain.some(e => gsap.getTweensOf(e).some(t => t.isActive()));
  };
  const DX = { forward: 24, back: -24, 'tab-r': 24, 'tab-l': -24, tab: 0 };
  // S3's exact body (context /code_facts/s3_nav_body), and faults built on it
  const bodies = {
    s3: (fn, dir) => { const run = () => { fn(); render(true); }; run(); if (FX.on) { const v = $('#main .view'); v.style.animation = 'none'; gsap.fromTo(v, { x: DX[dir], y: dir === 'tab' ? 8 : 0, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .28, ease: 'power3.out', overwrite: true, id: 'nav', clearProps: 'transform,opacity' }); } },
    's3-nofxon': (fn, dir) => { const run = () => { fn(); render(true); }; run(); const v = $('#main .view'); v.style.animation = 'none'; gsap.fromTo(v, { x: DX[dir], y: dir === 'tab' ? 8 : 0, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .28, ease: 'power3.out', overwrite: true, id: 'nav', clearProps: 'transform,opacity' }); },
    's3+overlay': (fn, dir) => { bodies.s3(fn, dir); const r = $('#main .view').getBoundingClientRect(), d = document.createElement('div'); d.className = '__plant';
      d.style.cssText = `position:fixed;left:${r.left}px;top:${Math.max(0, r.top)}px;width:${r.width}px;height:${innerHeight}px;z-index:2147483647;background:transparent`; document.body.append(d); setTimeout(() => d.remove(), 500); },
    // y only, from 4x the button's height below its resting place (kept on screen), opacity always 1, .6 s
    's3-settled': (fn, dir) => { const run = () => { fn(); render(true); }; run(); if (FX.on) { const v = $('#main .view'); v.style.animation = 'none'; const b = __target(v), r = b ? b.getBoundingClientRect() : { height: 40, bottom: 100 };
      const off = Math.max(0, Math.min(4 * r.height, innerHeight - r.bottom - 2)); window.__plantOff = (window.__plantOff || []).concat(Math.round(off / r.height * 10) / 10);
      gsap.fromTo(v, { y: off }, { y: 0, duration: .6, ease: 'power3.out', overwrite: true, id: 'nav', clearProps: 'transform' }); } },
    's3+cover': (fn, dir) => bodies.s3(fn, dir),
    's3-invisible': (fn, dir) => { const run = () => { fn(); render(true); }; run(); if (FX.on) { const v = $('#main .view'); v.style.animation = 'none'; gsap.fromTo(v, { x: DX[dir], opacity: 0 }, { x: 0, opacity: 0, duration: .28, ease: 'power3.out', overwrite: true, id: 'nav' }); } }
  };
  window.__origNav = window.navigate; if (bodies[PLANT]) { window.navigate = bodies[PLANT]; window.__plantName = PLANT; }
  return { fxOn: FX.on, plant: bodies[PLANT] ? navigate === bodies[PLANT] && navigate !== window.__origNav : PLANT && PLANT !== 'reduce-css' ? false : null };
}

(async () => {
  const R = reporter(); const b = await chromium.launch(); const report = { mode: LIVE ? 'live' : REDUCE ? 'reduce' : 'settled', plant: PLANT || null };
  const open = async (reducedMotion, motion) => {
    const ctx = await b.newContext({ locale: 'en-GB', viewport: { width: 390, height: 844 }, reducedMotion, serviceWorkers: 'block' });
    await pinClock(ctx); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await p.goto(URL0); await p.waitForTimeout(1500);
    const ok = await p.evaluate(m => { if (typeof DSUBJ === 'undefined' || !DSUBJ.length) return false; S.settings.motion = m; applySettings(false);
      const ts = tasksOn(todayKey()); if (ts.length) { ts[0].start = 600; ts[0].dur = 60; ts[0].done = false; save(); }  // a session running "now" (10:00)
      stack = [{ v: 'today' }]; render(true); return ts.length > 0; }, motion);
    if (!ok) R.fail('setup', 'no sample subjects or no session today (run with -r ./with-sample.js)');
    const st = await p.evaluate(pageSetup, PLANT);
    // reduce-css: a 400 ms animation on the screen that outranks both reduced-motion rules (#main .view beats html.calm * and *)
    if (PLANT === 'reduce-css') await p.addStyleTag({ content: '@keyframes plant{to{opacity:.99}} #main .view{animation:plant 400ms linear infinite!important}' });
    if (PLANT && st.plant === false) R.fail('setup', `plant ${PLANT} not active`); else if (st.plant) console.log(`PLANT ${PLANT} active`);
    return { ctx, p, errs, fxOn: st.fxOn };
  };
  const ids = async p => p.evaluate(() => ({ s: DSUBJ[0].id, leaf: leafIds.find(id => notesOf(id)) || leafIds[0] }));
  // 10 navigations, 2 per direction; x 5 = 50 timed samples (>= 8 per direction)
  const cycle = ({ s, leaf }) => [['progress', 'tab-r', 'progress'], ['exams', 'tab-l', 'exams'], ['subject:' + s, 'forward', 'subject:' + s], ['back', 'back', 'exams'], ['exams', 'tab', 'exams'],
    ['topic:' + leaf, 'forward', 'topic:' + leaf], ['back', 'back', 'exams'], ['listen', 'tab-r', 'listen'], ['today', 'tab-l', 'today'], ['today', 'tab', 'today']];

  if (!REDUCE) {
    const { ctx, p, errs, fxOn } = await open('no-preference', 'full');
    R.ok(fxOn, 'setup', 'motion is on (FX.on)');
    const I = await ids(p), C = cycle(I);
    // 1) one untimed settle-and-capture visit per distinct probed route
    const routes = [...new Set(C.map(c => c[2]))], rect = {}; report.settle = {};
    console.log(`routes ${routes.length}: ${routes.join(', ')}`);
    for (const r of routes) {
      const c = await p.evaluate(async ([r, CAP]) => { try { closeSheet(true); } catch (e) { } go('today'); await new Promise(z => setTimeout(z, 400)); if (r !== 'today') go(r);
        const t0 = performance.now();
        for (;;) { const v = $('#main .view'), btn = v && __target(v); if (btn && stack[stack.length - 1].v === r.split(':')[0] && __settled(btn) && performance.now() - t0 > 50) {
            const q = btn.getBoundingClientRect(); return { ms: Math.round(performance.now() - t0), x: q.left + q.width / 2, y: q.top + q.height / 2, sel: __desc(btn) }; }
          if (performance.now() - t0 > CAP) return { ms: -1, sel: btn ? __desc(btn) : null }; await new Promise(z => setTimeout(z, 20)); } }, [r, SETTLE_CAP]);
      report.settle[r] = c;
      if (c.ms < 0) R.fail('settle', `never settled ${r} within ${SETTLE_CAP} ms (target ${c.sel})`); else { rect[r] = c; console.log(`  settle ${r.split(':')[0].padEnd(8)} ${String(c.ms).padStart(5)} ms  target ${c.sel} at ${Math.round(c.x)},${Math.round(c.y)}`); }
    }
    const base = readJSON(BASE, null);
    if (base && !process.env.WRITE_BASELINE) for (const r of routes) { const a = base.settle && base.settle[r.split(':')[0]], bsel = rect[r] && rect[r].sel; if (a && bsel && a !== bsel) R.fail('setup', `probed target for ${r.split(':')[0]} is ${bsel}, baseline ${a}`); }
    if (PLANT === 's3+cover') { const ok = await p.evaluate(() => { const d = document.createElement('div'); d.id = '__cover'; d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:transparent'; document.body.append(d);
        return document.elementFromPoint(innerWidth / 2, innerHeight / 2) === d; }); if (ok) console.log('PLANT s3+cover: transparent cover over the whole screen'); else R.fail('setup', 'plant s3+cover not active'); }
    // 2) 3 discarded warm-ups, then exactly 50 timed navigations in one run
    await p.evaluate(() => { go('today'); }); await p.waitForTimeout(800);
    const samples = []; let i = 0;
    while (samples.length < N) {
      const [spec, dir, route] = C[i % C.length]; i++;
      const c = rect[route]; if (!c) { samples.push({ spec, dir, route, ms: CAP, never: true, stale: 0, nav: -1, op600: '?' }); continue; }
      const s = await p.evaluate(async ([spec, cx, cy, LIVE, CAP]) => {
        const oldView = $('#main .view'), n0 = __nav.length, e0 = __errs.length; let stale = 0;
        const t0 = performance.now(); if (spec === 'back') back(); else go(spec);
        const res = await new Promise(done => { const tick = () => {
          const t = performance.now() - t0, v = $('#main .view'), h = document.elementFromPoint(cx, cy);
          if (h && (oldView.contains(h) || !h.isConnected)) stale++;
          if (v && v !== oldView) { const btn = __target(v); if (btn) {
            let hx = h; if (LIVE) { const q = btn.getBoundingClientRect(); hx = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); }
            if (hx && (hx === btn || btn.contains(hx))) return done({ ms: t }); } }
          if (t >= CAP) { const btn = v && __target(v); return done({ ms: CAP, never: true, under: h ? __desc(h) || h.tagName + '.' + h.className : null, want: btn ? __desc(btn) : null, newView: v !== oldView }); } requestAnimationFrame(tick); }; tick(); });  // one hit test per frame: a real tap is handled per frame, and a 2 ms loop of forced layouts starved the animation
        // frame by frame to 600 ms, noting the longest frame: GSAP treats a frame over 500 ms as lag and slows the
        // tween, so after a long frame (the app has pre-existing 200-900 ms tasks on Today/Listen) look again at 1200 ms
        let longest = 0, last = performance.now();
        while (performance.now() - t0 < 600) { await new Promise(z => requestAnimationFrame(z)); const now = performance.now(); longest = Math.max(longest, now - last); last = now; }
        let op600 = getComputedStyle($('#main .view')).opacity, late = null;
        if (op600 !== '1' && longest > 300) { await new Promise(z => setTimeout(z, 1200 - (performance.now() - t0))); late = getComputedStyle($('#main .view')).opacity; if (late === '1') op600 = '1'; }
        const t1 = performance.now(); for (;;) { const v = $('#main .view'), btn = v && __target(v); if (!btn || __settled(btn) || performance.now() - t1 > 3000) break; await new Promise(z => setTimeout(z, 20)); }
        await new Promise(z => setTimeout(z, 80));
        return { longFrame: Math.round(longest), late, ms: Math.round(res.ms), never: !!res.never, under: res.under, want: res.want, newView: res.newView, stale, nav: __nav.length - n0, x: (__nav[__nav.length - 1] || {}).x, vt: document.documentElement.dataset.nav || null, op600, errs: __errs.length - e0 };
      }, [spec, c.x, c.y, LIVE, CAP]);
      if (i > WARM) samples.push({ spec: spec.split(':')[0], dir, route: route.split(':')[0], ...s });
    }
    report.samples = samples;
    const ms = samples.map(s => s.ms).sort((a, b) => a - b), p95 = ms[Math.ceil(0.95 * ms.length) - 1], med = ms[Math.floor(ms.length / 2)];
    console.log('samples ' + samples.map(s => `${s.dir}:${s.ms}`).join(' '));
    report.p95 = p95; report.median = med;
    R.ok(p95 < 150, 'p95', `95th percentile ${p95} ms (median ${med}, n ${samples.length}; target < 150)`);
    for (const d of ['forward', 'back', 'tab', 'tab-l', 'tab-r']) { const xs = samples.filter(s => s.dir === d).map(s => s.ms); const mx = Math.max(...xs);
      R.ok(mx < 250, 'max', `${d}: max ${mx} ms over ${xs.length} (target < 250)`); }
    const badNav = samples.filter(s => s.nav !== 1);
    R.ok(!badNav.length, 'nav-count', `exactly one 'nav' tween per navigation (${samples.length - badNav.length}/${samples.length}${badNav.length ? '; e.g. ' + badNav[0].dir + ' had ' + badNav[0].nav : ''})`);
    const signs = {}; samples.forEach(s => { if (s.nav === 1) signs[s.dir] = Math.sign(s.x || 0); }); console.log('  nav tween x start sign by direction ' + JSON.stringify(signs));
    const st = samples.filter(s => s.stale); R.ok(!st.length, 'stale', `${st.length} navigation(s) where the finger still landed on the old screen`);
    for (const s of samples.filter(s => s.never || s.op600 !== '1')) console.log('  odd sample ' + JSON.stringify(s));
    const nv = samples.filter(s => s.never); R.ok(!nv.length, 'never-hit', `${nv.length} navigation(s) never hit within ${CAP} ms${nv.length ? ' (' + [...new Set(nv.map(s => s.route))].join(', ') + ')' : ''}`);
    const lateOk = samples.filter(s => s.late === '1'); if (lateOk.length) console.log(`  ${lateOk.length} screen(s) fully shown only at 1200 ms after a long frame (${lateOk.map(s => s.longFrame + ' ms').join(', ')})`);
    const op = samples.filter(s => s.op600 !== '1'); R.ok(!op.length, 'view-opacity', `screen fully visible 600 ms after every navigation (${samples.length - op.length}/${samples.length})`);
    if (PLANT === 's3-settled') console.log('  settled-point plant offsets (x button height): ' + JSON.stringify(await p.evaluate(() => [...new Set(window.__plantOff || [])])));
    // 3) edge cases, motion on: each ends when the screen's own slide/fade has finished (max 3 s), then checks it is fully shown
    const edge = async (name, fn) => { const r = await p.evaluate(fn, I).catch(e => ({ ok: false, why: e.message.slice(0, 120) })); R.ok(r.ok, 'edge', `${name}${r.why ? ': ' + r.why : ''}`); };
    const after = `const v = $('#main .view'), cs = getComputedStyle(v); const still = cs.transform === 'none' || new DOMMatrix(cs.transform).isIdentity; return { ok: cs.opacity === '1' && still && stack[stack.length - 1].v === WANT, why: 'opacity ' + cs.opacity + ', transform ' + cs.transform + ', on ' + stack[stack.length - 1].v };`;
    const mk = (body, want) => new Function('I', `return (async () => { const sleep = t => new Promise(z => setTimeout(z, t)); try { closeSheet(true); } catch (e) { } go('today'); await sleep(700); ${body}; await sleep(300); const t0 = performance.now(); while (performance.now() - t0 < 3000 && (gsap.getTweensOf($('#main .view')).some(t => t.isActive()) || document.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.target === $('#main .view') && a.effect.getComputedTiming().iterations !== Infinity))) await sleep(50); await sleep(100); const WANT = '${want}'; ${after} })();`);
    await edge('two go() 50 ms apart ends on the second screen, fully shown', mk(`go('exams'); await sleep(50); go('progress')`, 'progress'));
    await edge('same-tab go() ends fully shown', mk(`go('exams'); await sleep(700); go('exams')`, 'exams'));
    await edge('back() ends fully shown', mk(`go('exams'); await sleep(700); go('subject:' + I.s); await sleep(700); back()`, 'exams'));
    await edge('sheet open, then navigate', mk(`openSearch(); await sleep(300); go('exams')`, 'exams'));
    await edge('editsubj node-move during a navigation', mk(`go('editsubj:' + I.s); await sleep(700); const m = document.querySelector('[data-action=node-move]:not([disabled])'); if (m) m.click(); go('exams')`, 'exams'));
    await edge('rerender() makes no nav tween', () => (async () => { go('exams'); await new Promise(z => setTimeout(z, 700)); const n = __nav.length; rerender(); await new Promise(z => setTimeout(z, 300)); return { ok: __nav.length === n, why: (__nav.length - n) + ' nav tween(s)' }; })());
    await edge('a nav tween is finished within 1 s (pinned clock still moves)', () => (async () => { go('today'); await new Promise(z => setTimeout(z, 700)); go('exams'); await new Promise(z => setTimeout(z, 1000));
      const v = $('#main .view'); return { ok: !gsap.getTweensOf(v).some(t => t.vars.id === 'nav' && t.isActive()) }; })());
    // R7: two navigations in the same task (measured 5/5 'Transition was skipped' on v4.13)
    const before = errs.length;
    for (let k = 0; k < 5; k++) { await p.evaluate(() => { try { closeSheet(true); } catch (e) { } go('today'); }); await p.waitForTimeout(700); await p.evaluate(() => { go('exams'); go('progress'); }); await p.waitForTimeout(1000); }
    const skipped = errs.slice(before).filter(e => /Transition was skipped/.test(e)).length;
    console.log(`  R7 same-task double go(): 'Transition was skipped' ${skipped}/5`);
    R.ok(!errs.length, 'pageerror', `${errs.length} page error(s)${errs.length ? ': ' + [...new Set(errs)].join(' | ') : ''}`);
    if (process.env.WRITE_BASELINE) { fs.mkdirSync(__dirname + '/baseline', { recursive: true }); const s = {}; for (const r of routes) s[r.split(':')[0]] = rect[r] && rect[r].sel;
      fs.writeFileSync(BASE, JSON.stringify({ written: new Date().toISOString(), app: 'e69f73b', settle: s, p95, median: med, samples: samples.map(x => [x.dir, x.ms]) }, null, 1)); console.log('wrote ' + BASE); }
    await ctx.close();
  } else {
    // R3: reduced motion runs zero animations, in both modes
    for (const [tag, rm, motion] of [['os-reduce', 'reduce', 'full'], ['app-reduced', 'no-preference', 'reduced']]) {
      const { ctx, p, errs, fxOn } = await open(rm, motion);
      R.ok(!fxOn, `[${tag}] setup`, 'FX.on is false');
      const C = cycle(await ids(p)); const bad = { nav: [], active: [], animation: [] }; let plantSeen = false;
      for (const [spec, dir] of C) {
        const s = await p.evaluate(async spec => {
          const n0 = __nav.length; if (spec === 'back') back(); else go(spec);
          const look = () => { const anims = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#main') && !a.effect.target.closest('.spin,.impp-bar,.impp-steps'));
            return { long: anims.filter(a => a.effect.getComputedTiming().duration > 1).map(a => (a.animationName || a.id || 'anim') + ':' + Math.round(a.effect.getComputedTiming().duration)),
              plant: anims.some(a => a.animationName === 'plant' && a.effect.getComputedTiming().duration === 400),
              active: gsap.globalTimeline.getChildren(true, true, false).filter(t => t.isActive()).length }; };
          const a = look(); await new Promise(z => setTimeout(z, 100)); const b = look(); await new Promise(z => setTimeout(z, 300)); const c = look();
          await new Promise(z => setTimeout(z, 200));
          return { nav: __nav.length - n0, long: [...new Set([...a.long, ...b.long, ...c.long])], active: Math.max(a.active, b.active, c.active), plant: a.plant || b.plant || c.plant };
        }, spec);
        if (s.plant) plantSeen = true;
        if (s.nav) bad.nav.push(dir + ':' + s.nav); if (s.active) bad.active.push(dir + ':' + s.active); if (s.long.length) bad.animation.push(dir + ' ' + s.long.join(','));
      }
      if (PLANT === 'reduce-css') { if (plantSeen) console.log(`PLANT reduce-css active [${tag}]`); else R.fail(`[${tag}] setup`, 'plant reduce-css not active (no 400 ms animation named plant on #main .view)'); }
      R.ok(!bad.nav.length, `[${tag}] nav`, `0 'nav' tweens after ${C.length} navigations${bad.nav.length ? ' (' + bad.nav.join(' ') + ')' : ''}`);
      R.ok(!bad.active.length, `[${tag}] active`, `0 active GSAP tweens after navigating${bad.active.length ? ' (' + bad.active.join(' ') + ')' : ''}`);
      R.ok(!bad.animation.length, `[${tag}] animation`, `every CSS animation in #main <= 1 ms, spinners exempt${bad.animation.length ? ' (' + bad.animation.slice(0, 3).join(' | ') + ')' : ''}`);
      R.ok(!errs.length, 'pageerror', `[${tag}] ${errs.length} page error(s)${errs.length ? ': ' + [...new Set(errs)].join(' | ') : ''}`);
      await ctx.close();
    }
  }
  fs.mkdirSync(__dirname + '/reg', { recursive: true }); fs.writeFileSync(__dirname + `/reg/tapprobe${REDUCE ? '-reduce' : ''}.json`, JSON.stringify(report, null, 1));
  await b.close(); R.end();
})();
