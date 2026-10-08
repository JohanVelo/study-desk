// t7: the installed app works offline. Needs the app served under /study-desk/ on SD_PORT2 and the sample
// subjects inside data.js itself (runall.sh swaps them in and restores data.js afterwards).
// PASS when: service worker scope ends '/study-desk/', manifest loads, the offline reload shows Today's title, no errors.
// T7_PLANT=block-sw (fire test, through runall.sh with RUNALL_FIRE=1): sw.js is aborted, so all of it must fail.
const { port, reporter } = require('./sdlib');
const { chromium } = require('playwright');
const P2 = port('SD_PORT2'), PLANT = process.env.T7_PLANT || '';
(async () => { const R = reporter(); const b = await chromium.launch(); const ctx = await b.newContext(); let hits = 0;
 if (PLANT === 'block-sw') await ctx.route('**/sw.js', r => { hits++; r.abort(); });
 const p = await ctx.newPage(); const errs = [];
 p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|net::/.test(m.text())) errs.push(m.text()); });
 p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
 await p.goto(`http://localhost:${P2}/study-desk/`); await p.waitForTimeout(2500);
 const scope = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r && r.scope; });
 console.log('sw', scope);
 const man = await p.evaluate(async () => { const r = await fetch(document.querySelector('link[rel=manifest]').href); return r.ok; }); console.log('manifest', man);
 await p.reload(); await p.waitForTimeout(1000); await ctx.setOffline(true); await p.reload().catch(e => errs.push('offline reload: ' + e.message.split('\n')[0])); await p.waitForTimeout(1500);
 const hero = await p.evaluate(() => document.querySelector('#heroTitle')?.innerText).catch(() => null); console.log('offline', hero);
 await p.evaluate(() => go('editsubj:psy')).catch(e => errs.push('go: ' + e.message.split('\n')[0])); await p.waitForTimeout(500);
 console.log('errs', errs);
 if (PLANT === 'block-sw') { if (hits) console.log(`PLANT block-sw active (${hits} sw.js request(s) aborted)`); else R.fail('setup', 'plant block-sw not active (no sw.js request seen)'); }
 R.ok(!!scope && scope.endsWith('/study-desk/'), 't7-sw', `service worker registered for /study-desk/ (${scope})`);
 R.ok(man === true, 't7-manifest', 'manifest loads');
 R.ok(!!(hero && hero.trim()), 't7-offline', `offline reload shows Today (${hero ? hero.trim().slice(0, 40) : 'nothing'})`);
 R.ok(!errs.length, 't7-errs', `${errs.length} error(s)`);
 await b.close(); R.end(); })();
