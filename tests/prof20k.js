// times every screen against the saved 20,000-page profile (5,000 topics)
const { chromium } = require('playwright');
(async () => { const ctx = await chromium.launchPersistentContext(__dirname + '/prof-20k', { locale: 'en-GB', serviceWorkers: 'block', viewport: { width: +(process.env.W || 390), height: 844 }, deviceScaleFactor: 1, isMobile: !process.env.W, hasTouch: !process.env.W });
 const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
 const t0 = Date.now(); await (await ctx.newCDPSession(p)).send('Network.setCacheDisabled', { cacheDisabled: true }); await p.goto('http://localhost:8765/'); await p.waitForFunction(() => typeof notesReady !== 'undefined' && notesReady, null, { timeout: 120000 }); console.log('boot to notes ready', Date.now() - t0, 'ms');
 await p.evaluate(() => { S.settings.motion = 'reduced'; applySettings(false); });
 const time = async (label, fn) => { const t = Date.now(); await p.evaluate(fn); const ms = Date.now() - t; console.log('  ' + label.padEnd(26), String(ms).padStart(6), 'ms'); return ms; };
 const sid = await p.evaluate(() => DSUBJ[0].id), cid = await p.evaluate(() => DSUBJ[0].chapterIds[250]); let worst = 0;
 for (const v of ['today', 'exams', 'subject:' + sid, 'topic:' + await p.evaluate(() => leafIds[2500]), 'learn:' + await p.evaluate(() => leafIds[2500]), 'practice', 'progress', 'listen', 'calendar', 'settings', 'summary:' + sid, 'map:' + sid, 'map:' + cid, 'chapter:' + cid]) worst = Math.max(worst, await time('open ' + v.split(':')[0] + (v === 'map:' + cid ? ' (chapter)' : ''), `go(${JSON.stringify(v)})`));
 worst = Math.max(worst, await time('open chapter 300 summary', `go('summary:${sid}'); const d = document.querySelectorAll('details[data-sumch]')[300]; d.open = true; d.dispatchEvent(new Event('toggle'))`));
 worst = Math.max(worst, await time('search', `openSearch(); drawSearch('risk')`)); await p.evaluate(() => closeSheet(true));
 worst = Math.max(worst, await time('backup text', `window.__n = exportText().length`)); console.log('   backup', await p.evaluate(() => (__n / 1e6).toFixed(0)), 'MB');
 const t1 = Date.now(); await p.evaluate(() => { aqKey = ''; return buildAutoQuestions(); }); console.log('  auto questions (background)', Date.now() - t1, 'ms;', await p.evaluate(() => AQ.length), 'questions');
 console.log('worst screen', worst, 'ms'); console.log(errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no page errors'); await ctx.close(); })();
