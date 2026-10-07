// t22: diagrams and pictures from a PDF: kept with caption and page, shown on the topic, book's own sentences, picture card
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 fs.mkdirSync('shots410', { recursive: true });
 for (const [dev, vp, scheme] of [['phone', { width: 390, height: 844 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark'], ['laptop', { width: 1440, height: 900 }, 'light'], ['laptop', { width: 1440, height: 900 }, 'dark']]) {
 const main = dev === 'phone' && scheme === 'light';
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: vp, deviceScaleFactor: dev === 'phone' ? 2 : 1, colorScheme: scheme, reducedMotion: 'reduce' });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
 await p.evaluate(() => go('import')); await p.waitForTimeout(300); await p.fill('#imp-name', 'Psychology'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(300);
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/figures-book.pdf'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 30000 });
 await p.click('[data-action=imp-apply]'); await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 30000 });
 const figs = await p.evaluate(() => FIGS.map(f => ({ node: nodes[f.node].title, p: f.p, cap: f.cap, drawn: f.drawn, w: f.w, h: f.h })));
 if (main) { console.log(JSON.stringify(figs)); ok(figs.length >= 3, figs.length + ' figures kept'); ok(figs.some(f => /2\.1 The four lobes/.test(f.cap) && f.node === 'Parts of the brain'), 'Figure 2.1 kept with its caption, under Parts of the brain'); ok(figs.some(f => /2\.3/.test(f.cap) && f.drawn), 'the drawn diagram (Figure 2.3) is kept too'); }
 const id = await p.evaluate(() => FIGS.find(f => /2\.1/.test(f.cap))?.node); await p.evaluate(id => go('topic:' + id), id); await p.waitForTimeout(800);
 if (main) ok(await p.locator('.fig-th').count() >= 1 && await p.evaluate(() => !!$('.fig-th img')?.src), 'the topic shows its diagram');
 await p.waitForTimeout(1500); await p.locator('.figs-card').scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.screenshot({ path: `shots410/${dev}-${scheme}-topic-figs.png` });
 await p.click('.fig-th'); await p.waitForTimeout(600);
 const says = await p.textContent('.fig-says').catch(() => '');
 if (main) ok(/shows the four lobes/.test(says), 'the sheet shows what the book says about Figure 2.1');
 await p.screenshot({ path: `shots410/${dev}-${scheme}-fig-sheet.png` });
 await p.click('[data-action=fig-card]'); await p.waitForTimeout(600);
 if (main) ok(await p.evaluate(() => !!(PE && PE.pic && PE.pic.data.startsWith('data:image'))) , 'Make a picture card opens the picture card editor with the diagram');
 await p.screenshot({ path: `shots410/${dev}-${scheme}-fig-card.png` });
 await ctx.close(); }
 console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
