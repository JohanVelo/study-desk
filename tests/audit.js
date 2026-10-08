// audit.js: open every screen at phone and laptop size, light and dark, tap every safe button,
// and log page errors, console errors, axe serious/critical issues, sideways scroll and slow screens.
// SD_PORT=8866 node -r ./with-sample.js audit.js   ->  reg/audit.json + shotsaudit/*.png
// Gate (exit 1): 0 page errors; tap problems compared with tests/baseline/audit.json (3 runs on v4.13):
//   no new key, no key above its 3-run max. Key = route | action | problem class. Axe and timings are reported, not gated
//   (axe here runs with motion on and catches screens mid-fade; contrast.js is the accessibility gate).
// WRITE_BASELINE=1 adds this run to the baseline (the last 3 runs are kept). PLANT=s3 injects the v4.14 navigate body
// (baseline and fire tests use it: v4.13's random 'Transition was skipped' error is the bug S3 removes); s3+throw | s3+count are fire tests.
const { port, pinClock, reporter, readJSON, installNav } = require('./sdlib');
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const URL0 = `http://localhost:${port()}/`, SH = __dirname + '/shotsaudit/', BASE = __dirname + '/baseline/audit.json', PLANT = process.env.PLANT || '';
fs.mkdirSync(SH, { recursive: true }); fs.mkdirSync(__dirname + '/reg', { recursive: true });
// buttons that erase data, leave the page, download, record, pair devices or spend money are not tapped
const SKIP = /del|remove|erase|reset|wipe|start-again|clear|sync|pair|forget|restore|key|^ai-|switch|prof-|rec-|mic|download|export|anki|ics|nv-pick|nv-dl|stt|share|file|imp-|cancel|backup|undo|logout|install|notif|qr|cam|ocr|snap|leave|quit|^tour$/;  // tour: driver.js overlay would cover every later tap
const cls = msg => /intercepts/.test(msg) ? 'intercepts' : /not visible/.test(msg) ? 'not-visible' : /not stable/.test(msg) ? 'not-stable' : /detached/.test(msg) ? 'detached' : /Timeout/i.test(msg) ? 'timeout' : 'other';
(async () => {
  const R = reporter(); const base = readJSON(BASE, null);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })  // muted: the crawler taps podcast Play buttons;
  const out = { views: [], clicks: [], errors: [], plant: PLANT || null };
  const ctx = await b.newContext({ locale: 'en-GB', viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await pinClock(ctx);
  const p = await ctx.newPage(); let cur = '';
  p.on('pageerror', e => out.errors.push({ at: cur, kind: 'pageerror', msg: e.message.slice(0, 300) }));
  p.on('console', m => { if (m.type() === 'error' && !/Estimating resolution|favicon|net::ERR/.test(m.text())) out.errors.push({ at: cur, kind: 'console', msg: m.text().slice(0, 300) }); });
  p.on('dialog', d => { out.errors.push({ at: cur, kind: 'dialog', msg: d.message().slice(0, 200) }); d.dismiss(); });
  await p.goto(URL0); await p.waitForTimeout(1500);
  if (!(await p.evaluate(() => typeof DSUBJ !== 'undefined' && DSUBJ.length > 0))) { R.fail('setup', 'no sample subjects loaded (run with -r ./with-sample.js)'); R.end(); await b.close(); return; }
  // routes with real ids from the sample library ('failed' is not a route: go('failed') stays where it is)
  const routes = await p.evaluate(() => {
    const s = DSUBJ[0].id, ch = subjects[s].chapterIds[0], leaf = leafIds.find(id => notesOf(id)) || leafIds[0];
    return ['today', 'exams', 'calendar', 'practice', 'progress', 'settings', 'edit', 'listen', 'review', 'import', 'import:' + s,
      'subject:' + s, 'chapter:' + ch, 'topic:' + leaf, 'editsubj:' + s, 'summary:' + s, 'summary:' + leaf, 'map:' + s, 'map:' + ch, 'learn:' + leaf, 'exam:' + s, 'episode:topic:' + leaf];
  });
  // fire tests: a safe handler that throws, or an extra blocked tap on an already-baselined key
  let countPlant = null; const PL = PLANT.split('+');
  if (PL.includes('s3')) { if (await installNav(p, 's3')) console.log('PLANT s3 active (v4.14 navigate body)'); else R.fail('setup', 'plant s3 not active'); }
  if (PL.includes('throw')) { await p.evaluate(() => { window.openSearch = () => { throw new Error('planted: search handler throws'); }; }); console.log('PLANT throw active (openSearch replaced)'); }
  if (PL.includes('count')) {
    // raise an EXISTING baselined key by one: hide one more, normally visible, instance of that (route, action)
    const k = base && (Object.entries(base.max || {}).find(([key]) => key === 'today|toggle|no-visible-match') || Object.entries(base.max || {}).find(([key]) => key.endsWith('|no-visible-match')));
    if (!k) R.fail('setup', 'plant count needs a baselined no-visible-match key'); else { const [route, act] = k[0].split('|'); countPlant = { route, act, key: k[0], max: k[1] }; console.log(`PLANT count targets ${k[0]} (baseline max ${k[1]})`); }
  }
  const look = async (route, tag, axe) => {
    cur = route + ' ' + tag;
    const ms = await p.evaluate(r => { const t = performance.now(); try { go(r); } catch (e) { return -1; } return Math.round(performance.now() - t); }, route);
    await p.waitForTimeout(450);
    const r = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, view: stack[stack.length - 1].v, h1: (document.querySelector('main h1, h1') || {}).textContent || '' }));
    let ax = [];
    if (axe) { await p.addScriptTag({ content: AXE }).catch(() => { }); ax = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id + ': ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' , '))).catch(e => ['axe failed ' + e.message]); }
    await p.screenshot({ path: SH + (route.replace(/[:]/g, '_') + '_' + tag).slice(0, 80) + '.png', fullPage: false });
    out.views.push({ route, tag, ms, ...r, h1: r.h1.trim().slice(0, 60), axe: ax });
  };
  for (const [w, h] of [[390, 844], [1440, 900]]) for (const scheme of ['light', 'dark']) {
    await p.setViewportSize({ width: w, height: h }); await p.emulateMedia({ colorScheme: scheme });
    for (const r of routes) await look(r, `${w}${scheme}`, (w === 390 && scheme === 'light') || (w === 1440 && scheme === 'dark'));
  }
  // tap every safe button on every screen (phone, light)
  await p.setViewportSize({ width: 390, height: 844 }); await p.emulateMedia({ colorScheme: 'light' });
  for (const route of routes) {
    const rk = route.split(':')[0];
    cur = route; await p.evaluate(r => { try { closeSheet(true); } catch (e) { } document.querySelectorAll('.focus-scrim').forEach(x => x.remove()); go(r); }, route); await p.waitForTimeout(450);
    const acts = await p.evaluate(() => [...new Set([...document.querySelectorAll('main [data-action], #app [data-action]')].filter(e => e.offsetParent).map(e => e.dataset.action + '|' + (e.dataset.id || e.dataset.m || e.dataset.k || '')))]);
    let plantedOnce = false;
    for (const a of acts) {
      const [act, id] = a.split('|');
      if (SKIP.test(act)) { out.clicks.push({ route: rk, act, skipped: true }); continue; }
      cur = route + ' → ' + act; const n0 = out.errors.length;
      // the focus timer is a persistent modal by design; drop it so it does not cover every later tap, and wait out the screen change
      await p.evaluate(r => { try { closeSheet(true); } catch (e) { } document.querySelectorAll('.focus-scrim').forEach(x => x.remove()); try { playerStop && playerStop(); } catch (e) { } go(r); }, route); await p.waitForTimeout(450);
      const sel = `[data-action="${act}"]` + (id ? `[data-id="${id}"],[data-action="${act}"][data-m="${id}"],[data-action="${act}"][data-k="${id}"]` : '');
      // hidden-twin fix: the action list comes from visible elements, so tap the first VISIBLE match, not a hidden twin
      const el = p.locator(sel).filter({ visible: true }).first();
      // the screen may still be mid-change (a slow view transition swaps the DOM late): wait for it, up to 2 s
      await p.waitForFunction(v => (document.querySelector('#main .view') || {}).dataset?.view === v && !document.documentElement.dataset.nav, rk, { timeout: 2000 }).catch(() => { });
      await el.waitFor({ state: 'visible', timeout: 2000 }).catch(() => { });
      let ok = true, err = '', klass = null;
      if (countPlant && !plantedOnce && rk === countPlant.route && act === countPlant.act && await el.count()) {
        await p.evaluate(sel => document.querySelectorAll(sel).forEach(e => e.style.setProperty('display', 'none', 'important')), sel); plantedOnce = true;
        console.log(`PLANT count active: hid ${act}${id ? ' ' + id : ''} on ${rk}, a normally visible instance (${await el.count()} visible left)`);
      }
      if (!(await el.count())) { ok = false; klass = 'no-visible-match'; err = 'no visible match for ' + sel.slice(0, 120); }
      else {
        const tap = async () => { try { await el.scrollIntoViewIfNeeded({ timeout: 1500 }); await el.click({ timeout: 2500 }); await p.waitForTimeout(500); return null; } catch (e) { return e; } };
        let e1 = await tap();
        // a tap problem must happen twice: a failed tap dispatched nothing, so re-open the screen and try once more
        // (one-off timeouts on a busy laptop are not app problems; node-move fails every time and stays)
        if (e1) { await p.evaluate(r => { try { closeSheet(true); } catch (e) { } document.querySelectorAll('.focus-scrim').forEach(x => x.remove()); go(r); }, route); await p.waitForTimeout(700);
          await el.waitFor({ state: 'visible', timeout: 2000 }).catch(() => { }); if (await el.count()) { const e2 = await tap(); if (!e2) { out.retried = (out.retried || 0) + 1; e1 = null; } else e1 = e2; } }
        if (e1) { ok = false; err = e1.message.split('\n').filter(l => /intercepts|not visible|not stable|detached/.test(l)).slice(-1).join('').slice(0, 220) || e1.message.split('\n')[0].slice(0, 120); klass = cls(e1.message); }
      }
      const sheet = await p.evaluate(() => !!document.querySelector('.scrim:not([hidden]) .sheet, .sheet.open'));
      if (sheet) { await p.screenshot({ path: SH + ('sheet_' + act).slice(0, 60) + '.png' }); }
      out.clicks.push({ route: rk, act, ok, err, klass, newErrors: out.errors.length - n0, sheet });
    }
  }
  try { await p.evaluate(() => { try { playerStop(); } catch (e) { } }); } catch (e) { }
  // tap-problem keys for this run
  const keys = {}; out.clicks.filter(c => !c.skipped && !c.ok).forEach(c => { const k = `${c.route}|${c.act}|${c.klass}`; keys[k] = (keys[k] || 0) + 1; });
  out.keys = keys; fs.writeFileSync(__dirname + '/reg/audit.json', JSON.stringify(out, null, 1));
  const slow = out.views.filter(v => v.ms > 700), over = out.views.filter(v => v.over > 1), axe = out.views.filter(v => v.axe.length), failClicks = out.clicks.filter(c => !c.skipped && !c.ok);
  console.log(`retried ${out.retried || 0} tap(s) that failed once and then landed`);
  console.log(`views ${out.views.length} · slow ${slow.length} · sideways ${over.length} · axe (report only) ${axe.length} · clicks ${out.clicks.filter(c => !c.skipped).length} (skipped ${out.clicks.filter(c => c.skipped).length}) · tap problems ${failClicks.length} · page errors ${out.errors.filter(e => e.kind === 'pageerror').length}`);
  for (const [k, n] of Object.entries(keys).sort()) console.log(`  key ${k} x${n}`);
  const pe = out.errors.filter(e => e.kind === 'pageerror');
  R.ok(!pe.length, 'pageerror', `${pe.length} page error(s)${pe.length ? ': ' + [...new Set(pe.map(e => e.at + ': ' + e.msg))].slice(0, 4).join(' | ') : ''}`);
  if (process.env.WRITE_BASELINE) {
    const bl = base || { runs: [] }; bl.runs = [...(bl.runs || []), { at: new Date().toISOString(), keys }].slice(-3);
    bl.max = {}; for (const r of bl.runs) for (const [k, n] of Object.entries(r.keys)) bl.max[k] = Math.max(bl.max[k] || 0, n);
    fs.mkdirSync(__dirname + '/baseline', { recursive: true }); fs.writeFileSync(BASE, JSON.stringify(bl, null, 1)); console.log(`baseline now holds ${bl.runs.length} run(s), ${Object.keys(bl.max).length} key(s)`);
  } else if (!base || (base.runs || []).length < 3) R.fail('setup', `no 3-run baseline in ${BASE} (have ${base ? base.runs.length : 0})`);
  else {
    const fresh = Object.keys(keys).filter(k => !(k in base.max)), above = Object.entries(keys).filter(([k, n]) => k in base.max && n > base.max[k]);
    R.ok(!fresh.length, 'new-key', `${fresh.length} tap-problem key(s) not in the baseline${fresh.length ? ': ' + fresh.join(', ') : ''}`);
    R.ok(!above.length, 'count', `${above.length} key(s) above their 3-run max${above.length ? ': ' + above.map(([k, n]) => `${k} ${n} > ${base.max[k]}`).join(', ') : ''}`);
  }
  await b.close(); R.end();
})();
