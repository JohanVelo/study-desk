// contrast.js: full axe-core scan of every screen with motion OFF (so nothing is caught mid-fade),
// phone 390 and laptop 1440, light and dark = 22 routes x 4 themes = 88 checks ('failed' is not a route: go('failed') stays on the exam screen).
// Serious/critical colour-contrast -> 'FAIL contrast', any other serious/critical rule -> 'FAIL axe'.
// SD_PORT=8866 node -r ./with-sample.js contrast.js [--route <route-prefix>]   ->  reg/contrast.json
// PLANT=s2fix (chip rule + calendar label) | s2fix+faint  (fire tests only; injected after load, each asserts it is active)
const { port, pinClock, reporter } = require('./sdlib');
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const URL0 = `http://localhost:${port()}/`, PLANT = process.env.PLANT || '';
const ONLY = process.argv.includes('--route') ? process.argv[process.argv.indexOf('--route') + 1] : '';
const THEMES = [[390, 844, 'light'], [390, 844, 'dark'], [1440, 900, 'light'], [1440, 900, 'dark']];
const AXE_OPTS = { resultTypes: ['violations'] };  // every rule axe ships, default tags
const S2_RULE = ".chip[aria-pressed='true'] .muted{color:inherit;opacity:.8}";
const FAINT = '.muted{color:#c9c9c9!important}';
// the practice-exam question-set chips (All / Failed): a pressed chip with a .muted count inside (more.js:220)
const CHIP = '.chip[aria-pressed="true"] .muted';
(async () => {
  const R = reporter(); fs.mkdirSync(__dirname + '/reg', { recursive: true });
  console.log('options', JSON.stringify({ axe: AXE_OPTS, reducedMotion: 'reduce', serviceWorkers: 'block', settleMs: 700, plant: PLANT || 'none', only: ONLY || 'all' }));
  const b = await chromium.launch(); const out = []; let checks = 0, chipSeen = 0, expected = 0;
  for (const [w, h, scheme] of THEMES) {
    const ctx = await b.newContext({ locale: 'en-GB', viewport: { width: w, height: h }, reducedMotion: 'reduce', colorScheme: scheme, serviceWorkers: 'block' });
    await pinClock(ctx);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await p.goto(URL0); await p.waitForTimeout(1500);
    if (!(await p.evaluate(() => typeof DSUBJ !== 'undefined' && DSUBJ.length > 0))) { R.fail('setup', 'no sample subjects loaded (run with -r ./with-sample.js)'); break; }
    if (PLANT.startsWith('s2fix')) { await p.addStyleTag({ content: S2_RULE });
      // S2 part 2 (JJ 2026-10-08): a calendar exam-day button's spoken label starts with its visible text (WCAG 2.5.3 label in name)
      await p.evaluate(() => { const f = V.calendar; V.calendar = a => f(a).replace(/aria-label="([^"]*)">(\s*)<span>(\d+)<\/span><span class="ex">([^<]*)<span class="exw"> exam/g, (m, lab, ws, d, ab) => `aria-label="${d} ${ab} exam, ${lab}">${ws}<span>${d}</span> <span class="ex">${ab}<span class="exw"> exam`); }); }
    if (PLANT === 's2fix+faint') await p.addStyleTag({ content: FAINT });
    await p.addScriptTag({ content: AXE });
    let routes = await p.evaluate(() => { const s = DSUBJ[0].id, ch = subjects[s].chapterIds[0], leaf = leafIds.find(id => notesOf(id)) || leafIds[0];
      return ['today', 'exams', 'calendar', 'practice', 'progress', 'settings', 'edit', 'listen', 'review', 'import', 'import:' + s, 'subject:' + s, 'chapter:' + ch, 'topic:' + leaf, 'editsubj:' + s, 'summary:' + s, 'summary:' + leaf, 'map:' + s, 'map:' + ch, 'learn:' + leaf, 'exam:' + s, 'episode:topic:' + leaf]; });
    if (ONLY) routes = routes.filter(r => r.startsWith(ONLY));
    expected += routes.length;
    for (const r of routes) {
      await p.evaluate(r => { try { closeSheet(true); } catch (e) { } go(r); }, r); await p.waitForTimeout(700);
      const st = await p.evaluate(([r, CHIP]) => ({ view: stack[stack.length - 1].v, want: r.split(':')[0], broken: /Something went wrong on this screen/.test(document.querySelector('#main .view')?.textContent || ''),
        chip: [...document.querySelectorAll(CHIP)].filter(e => e.getClientRects().length).length,
        chipStyle: (e => e ? { op: getComputedStyle(e).opacity, color: getComputedStyle(e).color } : null)(document.querySelector(CHIP)),
        muted: (e => e ? getComputedStyle(e).color : null)(document.querySelector('.muted')) }), [r, CHIP]);
      if (st.view !== st.want || st.broken) { R.fail('setup', `${w}${scheme} ${r} did not render (view ${st.view}${st.broken ? ', error card' : ''})`); continue; }
      if (st.chip) { chipSeen++;
        if (PLANT.startsWith('s2fix') && st.chipStyle.op !== '0.8') R.fail('setup', 'plant s2fix not active on ' + r);
      }
      if (PLANT.startsWith('s2fix') && r === 'calendar' && !(await p.evaluate(() => [...document.querySelectorAll('.day.examday')].filter(b => /^\d+ \S+ exam, /.test(b.getAttribute('aria-label'))).length))) R.fail('setup', 'plant s2fix calendar part not active');
      if (PLANT === 's2fix+faint' && st.muted && st.muted !== 'rgb(201, 201, 201)') R.fail('setup', 'plant faint not active on ' + r + ' (' + st.muted + ')');
      const v = await p.evaluate(async o => (await axe.run(document, o)).violations.filter(v => ['serious', 'critical'].includes(v.impact))
        .map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ t: n.target.join(' ').slice(0, 120), d: v.id === 'color-contrast' ? ((n.any[0] || {}).data || {}) : {} })) })), AXE_OPTS).catch(e => [{ id: 'axe-error', nodes: [{ t: e.message }] }]);
      checks++;
      for (const x of v) for (const n of x.nodes) out.push({ theme: w + scheme, route: r, rule: x.id, impact: x.impact, sel: n.t, ratio: n.d.contrastRatio, fg: n.d.fgColor, bg: n.d.bgColor });
    }
    if (errs.length) R.fail('pageerror', `${w}${scheme}: ${[...new Set(errs)].join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(__dirname + '/reg/contrast.json', JSON.stringify({ checks, chipSeen, plant: PLANT || null, violations: out }, null, 1));
  const cc = out.filter(o => o.rule === 'color-contrast'), other = out.filter(o => o.rule !== 'color-contrast');
  R.ok(checks === expected && (ONLY || expected === 88), 'setup', `${checks} of ${expected} checks executed${ONLY ? '' : ' (want 88)'}`);
  if (!ONLY) R.ok(chipSeen > 0, 'setup', `pressed exam/failed chip with .muted present and evaluated on ${chipSeen} screen(s)`);
  for (const o of cc) console.log(`  contrast ${o.theme} ${o.route.split(':')[0]} ${o.sel} ${o.fg} on ${o.bg} ${o.ratio}`);
  R.ok(cc.length === 0, 'contrast', `${cc.length} serious colour-contrast node(s)`);
  for (const o of other) console.log(`  axe ${o.rule} ${o.theme} ${o.route.split(':')[0]} ${o.sel}`);
  R.ok(other.length === 0, 'axe', `${other.length} serious/critical node(s) from other rules (${[...new Set(other.map(o => o.rule))].join(', ') || 'none'})`);
  R.end();
})();
