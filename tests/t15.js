// t15: v4.5 textbook reader, teach it back, handwriting to text
const { chromium } = require('playwright');
const MOCK_STT = `self.onmessage=e=>{const {id,op}=e.data||{};if(op==='load'){self.postMessage({op:'progress',loaded:5e6,total:1e7});setTimeout(()=>self.postMessage({id,ok:true}),50);return;}self.postMessage({id,ok:true,text:'So working memory is a limited capacity system that holds and manipulates information during a task. Um the central executive directs attention and the phonological loop holds spoken material.'});};`;
(async () => {
 const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['microphone', 'clipboard-read', 'clipboard-write'] });
 await ctx.route('**/stt-worker.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK_STT }));
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto(`http://localhost:${process.env.SD_PORT||8765}/`); await p.waitForTimeout(1200);
 const up = await p.evaluate(async () => { const d = await new Promise(r => { const q = indexedDB.open('studydesk'); q.onsuccess = () => r(q.result); }); const v = d.version, s = [...d.objectStoreNames]; d.close(); return { v, s }; });
 ok(up.v === 7 && ['books', 'marks', 'figs', 'aq', 'ai'].every(k => up.s.includes(k)), 'database is v7 with books, marks, figures, saved questions and AI answers');
 // 1. import the textbook, then keep it
 await p.evaluate(() => go('import')); await p.waitForTimeout(300);
 await p.fill('#imp-name', 'Psychology'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(300);
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/memory-textbook.pdf'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 15000 });
 await p.click('[data-action=imp-apply]'); await p.waitForSelector('#bkOffer', { timeout: 8000 });
 ok((await p.textContent('#bkOffer')).includes('memory-textbook.pdf'), 'done step offers to keep the PDF');
 await p.click('[data-action=rd-keep]'); await p.waitForFunction(() => BOOKS.length === 1, null, { timeout: 15000 }); await p.waitForTimeout(300);
 ok((await p.textContent('#bkOffer')).includes('kept on this device'), 'offer turns into a confirmation');
 const bk = await p.evaluate(() => ({ pages: BOOKS[0].pages, thumb: BOOKS[0].thumb.length, ratio: BOOKS[0].ratio }));
 ok(bk.pages === 8 && bk.thumb > 1000 && bk.ratio > 1.3, 'book saved with pages, cover and shape ' + JSON.stringify(bk));
 const sid = await p.evaluate(() => DSUBJ[0].id);
 await p.evaluate(s => go('subject:' + s), sid); await p.waitForTimeout(400);
 ok(await p.locator('#bkShelf .bk-row img').count() === 1, 'subject page shows the textbook with its cover');
 // 2. topic → Read opens the reader at that topic's page
 const wm = await p.evaluate(() => leafIds.find(id => /working memory/i.test(nodes[id].title)));
 ok(!!wm, 'import found the Working memory topic');
 await p.evaluate(id => go('topic:' + id), wm); await p.waitForTimeout(400);
 const readGo = await p.getAttribute('.subhead [data-go^="read:"]', 'data-go');
 ok(/:1$/.test(readGo), 'topic has a Read button that opens page 2 (' + readGo + ')');
 await p.click('.subhead [data-go^="read:"]'); await p.waitForSelector('.rd-page[data-i="1"].on .textLayer span', { timeout: 15000 });
 ok(await p.locator('.rd-page').count() === 8, 'reader lays out all 8 pages');
 ok(await p.evaluate(() => { const r = document.querySelector('.rd-page[data-i="1"]').getBoundingClientRect(); return r.top < 300 && r.bottom > 400; }), 'reader opened scrolled to that page');
 ok((await p.textContent('#rdPg')) === '2', 'page indicator says 2');
 ok(await p.evaluate(() => { const e = document.querySelector('.rd-page[data-i="1"]'), c = e.querySelector('canvas'); return c && c.width >= Math.floor(e.clientWidth * devicePixelRatio) - 1; }), 'page drawn sharp for the screen');
 // 3. select a definition → Make a card
 const sel = async (page, start, end) => p.evaluate(([page, start, end]) => {
   const spans = [...document.querySelectorAll(`.rd-page[data-i="${page}"] .textLayer span`)].filter(s => !s.classList.contains('markedContent'));
   const a = spans.find(s => s.textContent.includes(start)), z = spans.slice(spans.indexOf(a)).find(s => s.textContent.includes(end));
   const r = document.createRange(); r.setStart(a.firstChild, a.textContent.indexOf(start)); r.setEnd(z.firstChild, z.textContent.indexOf(end) + end.length);
   getSelection().removeAllRanges(); getSelection().addRange(r); return getSelection().toString();
 }, [page, start, end]);
 const s1 = await sel(1, 'Working memory is', 'out a task.'); console.log('  selected:', s1.replace(/\s+/g, ' '));
 await p.waitForSelector('#rdPop', { timeout: 3000 });
 ok(await p.evaluate(() => { const r = document.querySelector('#rdPop').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top > 0; }), 'Highlight / Make a card bar appears on screen');
 await p.click('#rdPop [data-action=rd-card]'); await p.waitForSelector('#hl-f');
 const draft = await p.evaluate(() => ({ f: $('#hl-f').value, b: $('#hl-b').value, node: $('#hl-node').value }));
 console.log('  draft:', JSON.stringify(draft));
 ok(draft.f === 'What is working memory?' && /^A limited-capacity system/.test(draft.b), 'definition becomes a question and answer');
 ok(draft.node === wm, 'card goes to the topic for that page');
 const c0 = await p.evaluate(() => S.cards.length);
 await p.click('[data-action=rd-mk]'); await p.waitForTimeout(500);
 ok(await p.evaluate(n => S.cards.length === n + 1 && S.cards.at(-1).kind === 'own' && marksOf(RD.bid).hl[0].card === S.cards.at(-1).id, c0), 'flashcard saved and linked to the highlight');
 ok(await p.locator('.rd-page[data-i="1"] .rd-hl i.c').count() >= 1, 'highlight is drawn on the page (green = has a card)');
 // 4. plain highlight, then make cards from all
 await p.evaluate(() => rdScrollTo(2, true)); await p.waitForSelector('.rd-page[data-i="2"].on .textLayer span', { timeout: 10000 });
 await sel(2, 'Interference occurs', 'confused in memory.'); await p.waitForSelector('#rdPop');
 await p.click('#rdPop [data-action=rd-hl]'); await p.waitForTimeout(300);
 ok((await p.textContent('#rdHlN')) === '2' && await p.locator('.rd-page[data-i="2"] .rd-hl i').count() >= 1, 'highlight added and counted');
 await p.click('[data-action=rd-list]'); await p.waitForSelector('.hl-list');
 ok(await p.locator('.hl-list li').count() === 2 && (await p.textContent('.hl-make')).includes('1 highlight has no card'), 'highlights list shows both, one without a card');
 await p.click('[data-action=rd-mkall]'); await p.waitForTimeout(500);
 const last = await p.evaluate(() => ({ ...S.cards.at(-1), t: nodes[S.cards.at(-1).node]?.title }));
 ok(last.f === 'When does interference occur?' && /forgetting/i.test(last.t), 'make-all card: ' + last.f + ' → ' + last.t);
 // tapping a highlight opens it
 await p.evaluate(() => { const i = document.querySelector('.rd-page[data-i="2"] .rd-hl i'); const r = i.getBoundingClientRect(); document.querySelector('.rd-page[data-i="2"]').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 5, clientY: r.top + r.height / 2 })); });
 await p.waitForTimeout(300);
 ok(await p.locator('.rd-quote').count() === 1, 'tapping a highlight opens it');
 await p.evaluate(() => closeSheet(true));
 // 5. zoom, go to page, remember the page
 const w0 = await p.evaluate(() => $('#rdPages').offsetWidth);
 await p.click('[data-action=rd-zoom][data-d="1"]'); await p.waitForTimeout(400);
 ok(await p.evaluate(w => $('#rdPages').offsetWidth > w * 1.2, w0), 'zoom makes the pages bigger');
 await p.click('[data-action=rd-zoom][data-d="-1"]'); await p.waitForTimeout(300);
 await p.click('[data-action=rd-goto]'); await p.waitForSelector('#rd-n');
 ok(await p.locator('.rd-toc button').count() >= 4, 'contents list shows the chapters');
 await p.fill('#rd-n', '4'); await p.click('[data-action=rd-n]'); await p.waitForTimeout(700);
 ok((await p.textContent('#rdPg')) === '4', 'go to page 4 works');
 await p.waitForTimeout(800);
 await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => go('read:' + BOOKS[0].id)); await p.waitForTimeout(1200);
 ok((await p.textContent('#rdPg')) === '4' && (await p.textContent('#rdHlN')) === '2', 'reopening returns to page 4 with highlights');
 // 6. teach it back
 await p.evaluate(id => go('topic:' + id), wm); await p.waitForTimeout(400);
 await p.click('[data-action=tb-open]'); await p.waitForSelector('[data-action=tb-start]');
 await p.click('[data-action=tb-start]'); await p.waitForSelector('#tbMeter', { timeout: 5000 }); await p.waitForTimeout(2200);
 ok(/0:0[12]/.test(await p.textContent('#tbTime')), 'recording timer runs');
 await p.click('[data-action=tb-stop]'); await p.waitForSelector('.tb-stats', { timeout: 15000 });
 const tb = await p.evaluate(() => ({ sc: TB.result.score, stats: $('.tb-stats').textContent, ok: $$('.blurt-list li.ok').length, log: S.log.filter(e => e.t === 'blurt').length }));
 console.log('  teach:', JSON.stringify(tb));
 ok(tb.ok >= 1 && tb.log === 1 && /1 “um”/.test(tb.stats), 'spoken explanation is checked against the notes');
 await p.evaluate(() => closeSheet(true));
 // 7. handwriting to text
 await p.click('[data-action=notes]'); await p.waitForSelector('[data-action=hw-open]');
 await p.fill('#notes-text', (await p.inputValue('#notes-text')) + '\n\nTyped but not saved yet.');
 await p.click('[data-action=hw-open]'); await p.waitForSelector('[data-action=hw-read]');
 ok((await p.textContent('.sheet h2')) === 'Write by hand' && await p.locator('.sk-pad.lined').count() === 1, 'Write by hand opens a lined pad');
 ok(await p.evaluate(id => notesOf(id).includes('Typed but not saved yet.'), wm), 'unsaved typing in the notes was kept');
 await p.evaluate(() => { // "handwriting": rasterised text turned into ink paths
   const c = document.createElement('canvas'); c.width = 800; c.height = 560; const x = c.getContext('2d'); x.font = 'italic 64px serif'; x.fillText('Chunking groups', 40, 150); x.fillText('items together', 40, 270);
   const d = x.getImageData(0, 0, 800, 560).data; let path = '';
   for (let y = 0; y < 560; y++) { let run = -1; for (let i = 0; i <= 800; i++) { const on = i < 800 && d[(y * 800 + i) * 4 + 3] > 120; if (on && run < 0) run = i; if (!on && run >= 0) { path += `M${run} ${y}h${i - run}v1h-${i - run}Z`; run = -1; } } }
   SK.paths = [{ d: path, c: 'var(--ink)' }, { d: 'M0 0h800v560h-800Z', c: 'oklch(86% 0.17 108 / .55)' }]; drawSkPaths();
 });
 await p.click('[data-action=hw-read]'); await p.waitForSelector('#hw-text', { timeout: 60000 });
 const hw = await p.inputValue('#hw-text'); console.log('  read:', JSON.stringify(hw));
 ok(/chunking/i.test(hw) && /together/i.test(hw), 'handwriting is read as text');
 await p.click('[data-action=hw-add]'); await p.waitForSelector('#notes-text'); await p.waitForTimeout(300);
 ok((await p.inputValue('#notes-text')).includes(hw) && await p.evaluate(([id, t]) => notesOf(id).includes(t), [wm, hw]), 'text added to the notes and the notes sheet is back');
 await p.evaluate(() => closeSheet(true));
 // 8. remove the PDF, cards stay
 await p.evaluate(() => go('read:' + BOOKS[0].id)); await p.waitForTimeout(600);
 const nc = await p.evaluate(() => S.cards.length);
 await p.click('[data-action=rd-list]'); await p.click('.bk-about summary'); await p.click('[data-action=rd-rm]'); await p.click('[data-action=rd-rm]'); await p.waitForTimeout(700);
 ok(await p.evaluate(n => BOOKS.length === 0 && S.cards.length === n && stack.at(-1).v !== 'read', nc), 'removing the PDF keeps the cards and leaves the reader');
 ok(await p.evaluate(async () => (await IDB.all('books')).length === 0), 'PDF deleted from the device');
 // 9. add a PDF straight from the subject page
 await p.evaluate(s => go('subject:' + s), sid); await p.waitForTimeout(300);
 await p.setInputFiles('#rd-file', __dirname + '/fixtures/memory-textbook.pdf'); await p.waitForFunction(() => BOOKS.length === 1, null, { timeout: 15000 }); await p.waitForTimeout(300);
 ok(await p.locator('#bkShelf .bk-row').count() === 1, 'PDF added from the subject page');
 console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors'); if (errs.length) fails++;
 console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close();
})();
