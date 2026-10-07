// t19: import progress screen
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 fs.mkdirSync('shots410', { recursive: true });
 for (const [dev, vp, scheme] of [['phone', { width: 390, height: 844 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark'], ['laptop', { width: 1440, height: 900 }, 'light'], ['laptop', { width: 1440, height: 900 }, 'dark']]) {
  const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: vp, deviceScaleFactor: dev === 'phone' ? 2 : 1, colorScheme: scheme, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${process.env.SD_PORT||8765}/`); await p.waitForTimeout(1200);
  await p.evaluate(() => go('import')); await p.waitForTimeout(300);
  await p.fill('#imp-name', 'Psychology'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(400);
  // slow pdf.js page reads so the progress can be seen
  await p.evaluate(() => { const _i = pdfPageItems, _l = pdfPageLines; pdfPageItems = async (d, i) => { await new Promise(r => setTimeout(r, 120)); return _i(d, i); }; pdfPageLines = async (d, i) => { await new Promise(r => setTimeout(r, 120)); return _l(d, i); }; });
  await p.setInputFiles('#imp-file', __dirname + '/fixtures/memory-textbook.pdf');
  await p.waitForSelector('#impProg', { timeout: 5000 }).catch(() => {});
  const seen = await p.locator('#impProg').count(); if (dev === 'phone' && scheme === 'light') ok(seen === 1, 'progress panel appears as soon as a file is chosen');
  await p.waitForFunction(() => /page [\d,]+ of [\d,]+/.test(document.querySelector('#impProg')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  const txt = await p.textContent('#impProg').catch(() => '');
  if (dev === 'phone' && scheme === 'light') { ok(/page [\d,]+ of [\d,]+/.test(txt), 'it says which page it is reading: ' + (txt.match(/page [\d,]+ of [\d,]+/) || [''])[0]); ok(/Opened the file/.test(txt), 'finished steps are ticked'); ok(await p.evaluate(() => { const r = $('#impProg').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight - 100; }), 'the panel is on screen'); ok(await p.evaluate(() => getComputedStyle($('.impp-steps li.now .impp-dot')).animationIterationCount === 'infinite'), 'the working step keeps spinning even with reduced motion'); }
  await p.waitForTimeout(400); await p.screenshot({ path: `shots410/${dev}-${scheme}-reading.png` });
  const w1 = await p.evaluate(() => parseFloat($('.impp-bar i')?.style.width)); await p.waitForTimeout(700); const w2 = await p.evaluate(() => parseFloat($('.impp-bar i')?.style.width || 100));
  if (dev === 'phone' && scheme === 'light') ok(w2 > w1, `the bar moves (${w1}% → ${w2}%)`);
  await p.waitForSelector('[data-action=imp-apply]', { timeout: 30000 });
  if (dev === 'phone' && scheme === 'light') ok(await p.locator('#impProg').count() === 0, 'when finished it moves on to the check step');
  // saving step
  await p.evaluate(() => { const _s = saveNotes; saveNotes = async (...a) => { await new Promise(r => setTimeout(r, 250)); return _s(...a); }; });
  await p.click('[data-action=imp-apply]'); await p.waitForFunction(() => /\d+ of \d+/.test(document.querySelector('#impSave')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
  if (dev === 'phone' && scheme === 'light') ok(/\d+ of \d+/.test(await p.textContent('#impSave').catch(() => '')), 'saving notes shows topic X of Y');
  await p.screenshot({ path: `shots410/${dev}-${scheme}-saving.png` });
  // cancel
  await p.click('[data-action=imp-again]'); await p.waitForTimeout(300);
  await p.setInputFiles('#imp-file', __dirname + '/fixtures/memory-textbook.pdf'); await p.waitForSelector('[data-action=imp-cancel]');
  await p.click('[data-action=imp-cancel]'); await p.waitForTimeout(3000);
  if (dev === 'phone' && scheme === 'light') ok(await p.locator('#impProg').count() === 0 && await p.locator('[data-action=imp-apply]').count() === 0 && await p.locator('#imp-file').count() === 1, 'Cancel stops it and nothing appears later');
  await ctx.close(); }
 console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
