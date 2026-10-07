// t24: profiles: add a person, separate data (localStorage + IndexedDB), switch back, rename, remove
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 fs.mkdirSync('shots410', { recursive: true });
 for (const [dev, vp, scheme] of [['phone', { width: 390, height: 844 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark'], ['laptop', { width: 1440, height: 900 }, 'light'], ['laptop', { width: 1440, height: 900 }, 'dark']]) {
 const main = dev === 'phone' && scheme === 'light';
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: vp, deviceScaleFactor: dev === 'phone' ? 2 : 1, colorScheme: scheme, reducedMotion: 'reduce', isMobile: dev === 'phone', hasTouch: dev === 'phone' });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 const shot = n => p.screenshot({ path: `shots410/${dev}-${scheme}-${n}.png` });
 await p.goto(`http://localhost:${process.env.SD_PORT||8765}/`); await p.waitForTimeout(1200);
 await p.evaluate(() => { localStorage.setItem('studydesk.tips', '{"topic":1,"practice":1,"settings":1}'); localStorage.setItem('studydesk.tour', '1'); go('import'); }); await p.waitForTimeout(300);
 await p.fill('#imp-name', 'Psychology'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(300);
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/figures-book.pdf'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 30000 });
 await p.click('[data-action=imp-apply]'); await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 30000 });
 const before = await p.evaluate(() => ({ subj: DSUBJ.length, notes: Object.keys(NOTES).length, figs: FIGS.length }));
 await p.evaluate(() => go('today')); await p.waitForTimeout(300);
 if (main) ok(!(await p.$('.pf-btn')), 'one person: no profile button in the top bar');
 await p.evaluate(() => go('settings')); await p.waitForTimeout(400);
 if (main) ok(/Main profile/.test(await p.textContent('.pf-card')), 'Settings shows People on this device');
 await shot('pf-settings-one');
 await p.click('.pf-card [data-action=pf-add]'); await p.waitForTimeout(400); await p.fill('#pf-new', 'Shasti'); await p.fill('#pf-mine', 'Megan'); await shot('pf-add');
 await Promise.all([p.waitForEvent('load'), p.click('[data-action=pf-create]')]); await p.waitForTimeout(1500);
 const sh = await p.evaluate(() => ({ cur: PROFILES.cur, name: PROFILES.nameOf(PROFILES.cur), subj: DSUBJ.length, notes: Object.keys(NOTES).length, figs: FIGS.length, keys: Object.keys(localStorage).filter(k => k.startsWith('studydesk@')).length }));
 if (main) { console.log('  ', JSON.stringify(before), JSON.stringify(sh)); ok(sh.cur !== 'p0' && sh.name === 'Shasti' && sh.subj === 0 && sh.notes === 0 && sh.figs === 0, 'Shasti starts with an empty Study Desk'); ok(sh.keys >= 1, 'her data is saved under her own keys'); }
 await p.evaluate(() => go('today')); await p.waitForTimeout(400);
 if (main) ok(/S/.test(await p.textContent('.pf-btn')), 'two people: the top bar shows whose profile is open');
 await shot('pf-today');
 await p.evaluate(() => { go('import'); }); await p.waitForTimeout(300); await p.fill('#imp-name', 'Law'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(300);
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/memory-textbook.pdf'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 30000 });
 await p.click('[data-action=imp-apply]'); await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 30000 });
 const shN = await p.evaluate(() => DSUBJ.map(s => s.name).join(','));
 await p.evaluate(() => go('today')); await p.waitForTimeout(300); await p.click('.pf-btn'); await p.waitForTimeout(500); await shot('pf-sheet');
 const dbs = await p.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort().join(','));
 if (main) ok(/studydesk@p/.test(dbs) && /(^|,)studydesk(,|$)/.test(dbs), 'each person has their own database: ' + dbs);
 await Promise.all([p.waitForEvent('load'), p.click('.pf-pick:not(.on)')]); await p.waitForTimeout(1500);
 const back = await p.evaluate(() => ({ cur: PROFILES.cur, name: PROFILES.nameOf(PROFILES.cur), subj: DSUBJ.map(s => s.name).join(','), notes: Object.keys(NOTES).length, figs: FIGS.length }));
 if (main) { console.log('  ', shN, JSON.stringify(back)); ok(back.cur === 'p0' && back.name === 'Megan' && back.subj === 'Psychology' && back.notes === before.notes && back.figs === before.figs, "back in Megan's profile with her own subject, notes and figures"); ok(shN === 'Law', "Shasti's subject stayed in her profile"); }
 await p.evaluate(() => go('settings')); await p.waitForTimeout(400); await shot('pf-settings');
 if (main) ok(/in Megan's profile/.test(await p.textContent('.view')), 'Start again says it only erases this profile');
 await p.click('[data-action=pf-manage]'); await p.waitForTimeout(400); await shot('pf-manage');
 await p.click('[data-action=pf-del]'); await p.waitForTimeout(200); await p.click('[data-action=pf-del]'); await p.waitForTimeout(800);
 const gone = await p.evaluate(async () => ({ n: PROFILES.list.length, keys: Object.keys(localStorage).filter(k => k.startsWith('studydesk@')).length, dbs: (await indexedDB.databases()).map(d => d.name).join(','), subj: DSUBJ.length }));
 if (main) { console.log('  ', JSON.stringify(gone)); ok(gone.n === 1 && gone.keys === 0 && !/@/.test(gone.dbs) && gone.subj === 1, "removing Shasti deletes her keys and database, Megan's stays"); }
 await p.evaluate(() => go('today')); await p.waitForTimeout(300);
 if (main) ok(!(await p.$('.pf-btn')), 'back to one person: the button goes away');
 await ctx.close(); }
 console.log(errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
