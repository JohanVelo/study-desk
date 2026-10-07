// t26: PDFs the importer used to give up on: dot-leader contents pages, bold-only headings,
// no structure at all, and scanned books (pictures of pages, read with on-device text recognition).
// Run `node mkhard.js` first if fixtures/leaders.pdf, boldheads.pdf or scanned.pdf are missing.
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); const F = __dirname + '/fixtures/', SH = __dirname + '/shots413/'; fs.mkdirSync(SH, { recursive: true });
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/^Estimating resolution/.test(m.text())) errs.push(m.text()); });
 await p.goto(`http://localhost:${process.env.SD_PORT || 8765}/`); await p.waitForTimeout(1200);
 const sid = await p.evaluate(() => { S.content.subjects.push({ id: 'bio', name: 'Biology', code: '', course: '', hue: 140, exam: addDays(todayKey(), 40), examTime: '', venue: '', chapters: [] }); afterContentChange(true); save(true); return 'bio'; });
 const pick = async f => {
   await p.evaluate(s => go('import:' + s), sid); await p.waitForTimeout(300);
   await p.setInputFiles('#imp-file', F + f);
   await p.waitForFunction(() => document.querySelector('[data-action=imp-apply]') || document.querySelector('.drop-big .lock.bad, .drop-big .scan-note'), null, { timeout: 30000 });
   return p.evaluate(() => ({ found: document.querySelector('.found')?.textContent.replace(/\s+/g, ' ') || '', bad: document.querySelector('.drop-big .lock.bad, .drop-big .scan-note')?.textContent || '', titles: qpPreview ? qpPreview.roots.flatMap(function w(n) { return [n.title, ...n.kids.flatMap(w)]; }) : [] }));
 };
 // A. contents page with dot leaders glued to the numbers, title in capitals
 let r = await pick('leaders.pdf');
 ok(/Found 3 chapters and 5 topics/.test(r.found), 'dot-leader contents page read: ' + r.found.slice(0, 60));
 ok(r.titles.join('|') === 'Cells|Cell structure|Cell membranes|Genetics|DNA|Inheritance|Evolution|Natural selection', 'titles without the dots: ' + r.titles.join('|'));
 // B. headings only in bold, same size as the text
 r = await pick('boldheads.pdf');
 ok(/bold headings/.test(r.found) && r.titles.slice(1).join('|') === 'Cells|Cell membranes|Genetics|DNA replication|Evolution|Natural selection', 'bold headings become topics: ' + r.titles.join('|'));
 // C. text with no structure at all: still usable, split by pages, never a dead end
 r = await pick('plain.pdf');
 ok(!r.bad && /kept as one topic/.test(r.found), 'a PDF with no structure is kept as one topic: ' + r.found.slice(0, 80));
 // D. the old dead-end message never appears for a PDF with text
 ok(!/Couldn't find bookmarks/.test(JSON.stringify(r)), 'the old dead-end message is gone');
 // E. scanned book: told plainly, offered text recognition, contents page found, notes saved from the pictures
 r = await pick('scanned.pdf');
 ok(/pictures of the pages \(a scan\)/.test(r.bad), 'a scan is named as a scan: ' + r.bad.slice(0, 70));
 ok(await p.locator('[data-action=imp-ocr]').count() === 1, 'offers to read the pictures');
 await p.locator('.drop-big').screenshot({ path: SH + 'scan-offer-390.png' });
 await p.click('[data-action=imp-ocr]');
 await p.waitForSelector('#impOcr', { timeout: 10000 }); await p.waitForTimeout(400);
 await p.locator('.drop-big').screenshot({ path: SH + 'scan-reading-390.png' });
 const t0 = Date.now();
 await p.waitForSelector('[data-action=imp-apply]', { timeout: 240000 });
 const ocrMs = Date.now() - t0;
 r = await p.evaluate(() => ({ found: document.querySelector('.found')?.textContent.replace(/\s+/g, ' ') || '', titles: qpPreview.roots.map(n => n.title + ' ' + n.p1 + '-' + n.p2) }));
 console.log('contents from pictures in', ocrMs, 'ms:', r.titles.join(' | '));
 ok(/from the pictures/.test(r.found) && r.titles.length === 3 && /Cells 3-3/.test(r.titles[0]) && /Genetics 4-4/.test(r.titles[1]) && /Evolution 5/.test(r.titles[2]), 'contents page read from the pictures');
 await p.screenshot({ path: SH + 'scan-found-390.png', fullPage: true });
 await p.click('[data-action=imp-apply]');
 await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 240000 });
 r = await p.evaluate(() => { const ids = leafIds.filter(id => nodes[id].title === 'Cells' || nodes[id].title === 'Genetics'); return { saved: IMP.done.saved, cells: notesOf(ids[0]), gen: notesOf(ids[1]), figs: typeof FIGS === 'object' ? Object.keys(FIGS).length : 0 }; });
 ok(r.saved === 3, 'notes saved for all 3 scanned topics: ' + r.saved);
 ok(/basic unit of life/i.test(r.cells) && /chromosome/i.test(r.gen), 'notes are the text read from each topic\'s own page');
 // F. after a scan error, typing the list keeps the PDF attached, so the pages still become notes
 r = await pick('scanned.pdf');
 await p.fill('#qp-text', '1 Genetics again 4-4');
 ok(await p.locator('.typed').getByText('Your PDF stays attached').count() === 1, 'says the PDF stays attached');
 await p.click('[data-action=imp-typed]'); await p.waitForSelector('[data-action=imp-apply]');
 ok(/pages of your PDF/.test(await p.locator('.found').textContent()), 'step 3 says the PDF pages become notes');
 await p.click('[data-action=imp-apply]');
 await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 120000 });
 r = await p.evaluate(() => { const id = leafIds.find(id => nodes[id].title === 'Genetics again'); return { saved: IMP.done.saved, t: notesOf(id) }; });
 ok(r.saved === 1 && /chromosome/i.test(r.t), 'typed list after a scan still gets notes from the pictures');
 // G. Stop cancels the reading cleanly
 await pick('scanned.pdf'); await p.click('[data-action=imp-ocr]'); await p.waitForSelector('#impOcr');
 await p.click('[data-action=imp-ocr-stop]'); await p.waitForFunction(() => !IMP_OCR, null, { timeout: 60000 }); await p.waitForTimeout(300);
 ok(await p.locator('[data-action=imp-ocr]').count() === 1 && !(await p.evaluate(() => qpPreview && qpPreview.count)), 'Stop leaves the offer and no list');
 // H. look at the new box on phone and laptop, light and dark
 for (const [w, h] of [[390, 844], [1440, 900]]) for (const scheme of ['light', 'dark']) {
   await p.setViewportSize({ width: w, height: h }); await p.emulateMedia({ colorScheme: scheme });
   await p.evaluate(s => { document.documentElement.dataset.theme = s; }, scheme);
   await pick('scanned.pdf'); await p.waitForTimeout(300);
   await p.locator('.drop-big').screenshot({ path: SH + `scan-offer-${w}-${scheme}.png` });
   const box = await p.evaluate(() => { const r = document.querySelector('[data-action=imp-ocr]').getBoundingClientRect(); return { h: r.height, w: r.width, over: document.documentElement.scrollWidth > innerWidth }; });
   await p.addScriptTag({ content: AXE }); const ax = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')));
   ok(!ax.length, `${w} ${scheme}: axe serious/critical: ${ax.length ? ax.join(' | ') : 'none'}`);
   ok(box.h >= 44 && !box.over, `${w} ${scheme}: button ${Math.round(box.w)}x${Math.round(box.h)}, no sideways scroll`);
 }
 console.log('ERRORS', errs); await b.close();
 console.log(fails || errs.length ? (fails + errs.length) + ' FAILED' : 'ALL PASS');
})();
