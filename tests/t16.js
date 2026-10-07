// t16: v4.6 find in the book, find bar, keys, pinch, continue reading, card source
const { chromium } = require('playwright');
(async () => {
 const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
 await p.evaluate(() => go('import')); await p.waitForTimeout(200);
 await p.fill('#imp-name', 'Psychology'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(200);
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/memory-textbook.pdf'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 15000 });
 await p.click('[data-action=imp-apply]'); await p.waitForSelector('#bkOffer'); await p.click('[data-action=rd-keep]'); await p.waitForFunction(() => BOOKS.length === 1);
 await p.evaluate(() => go('read:' + BOOKS[0].id)); await p.waitForSelector('.rd-page[data-i="0"].on .textLayer span', { timeout: 15000 });
 // find
 await p.click('[data-action=rd-goto]'); await p.waitForSelector('#rd-n');
 await p.fill('#rd-n', 'interference'); await p.press('#rd-n', 'Enter'); await p.waitForSelector('.rd-hits', { timeout: 10000 });
 const r = await p.evaluate(() => ({ rows: $$('.rd-hits li').length, info: $('#rdFind .tiny').textContent, mark: $('.rd-hits mark').textContent, toc: $('.rd-tocwrap').hidden }));
 console.log('  ', JSON.stringify(r));
 ok(r.rows === 1 && /3 matches on 1 page/.test(r.info) && r.mark.toLowerCase() === 'interference' && r.toc, 'finds words across the book and shows where');
 await p.click('.rd-hits button'); await p.waitForTimeout(900);
 ok((await p.textContent('#rdPg')) === '3', 'tapping a match goes to its page');
 await p.waitForSelector('.rd-page[data-i="2"] .textLayer mark.hit', { timeout: 8000 });
 ok(await p.locator('.rd-page[data-i="2"] .textLayer mark.hit').count() >= 1, 'the words are marked on the page');
 ok(await p.locator('#rdFindBar').count() === 1 && /1 of 1/.test(await p.textContent('#rdFindBar')), 'find bar shows the match position');
 await p.fill('#rdFindBar', '').catch(() => { });
 await p.click('[data-action=rd-goto]'); await p.waitForSelector('#rd-n'); await p.fill('#rd-n', 'memory'); await p.click('[data-action=rd-n]'); await p.waitForSelector('.rd-hits');
 const pages = await p.locator('.rd-hits li').count(); await p.locator('.rd-hits button').first().click(); await p.waitForTimeout(800);
 ok(pages >= 4, 'common word found on ' + pages + ' pages');
 const before = await p.textContent('#rdPg'); await p.click('[data-action=rd-hitgo][data-d="1"]'); await p.waitForTimeout(900);
 ok(+(await p.textContent('#rdPg')) > +before, 'next match moves forward (' + before + ' → ' + await p.textContent('#rdPg') + ')');
 await p.click('[data-action=rd-findx]'); await p.waitForTimeout(200);
 ok(await p.locator('#rdFindBar').count() === 0 && await p.locator('.textLayer mark.hit').count() === 0, 'closing find clears the marks');
 await p.click('[data-action=rd-goto]'); await p.fill('#rd-n', '99'); await p.click('[data-action=rd-n]'); await p.waitForTimeout(200);
 ok(await p.locator('#rd-n').count() === 1, 'a page past the end is refused');
 await p.fill('#rd-n', '5'); await p.click('[data-action=rd-n]'); await p.waitForTimeout(700);
 ok((await p.textContent('#rdPg')) === '5', 'page number still jumps');
 // keys
 await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900);
 ok((await p.textContent('#rdPg')) === '6', 'right arrow goes to the next page');
 await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900);
 ok((await p.textContent('#rdPg')) === '5', 'left arrow goes back');
 const z0 = await p.evaluate(() => RD.zoom); await p.keyboard.press('+'); await p.waitForTimeout(300);
 ok(await p.evaluate(z => RD.zoom > z, z0), '+ makes the page bigger');
 await p.keyboard.press('-'); await p.waitForTimeout(300);
 await p.keyboard.press('/'); await p.waitForTimeout(300);
 ok(await p.locator('#rd-n').count() === 1, '/ opens find in the book (not the app search)');
 await p.evaluate(() => closeSheet(true));
 // pinch
 await p.evaluate(() => {
   const sc = document.querySelector('#rdScroll'), mk = (id, x, y) => new Touch({ identifier: id, target: sc, clientX: x, clientY: y });
   const fire = (type, ts) => sc.dispatchEvent(new TouchEvent(type, { touches: ts, targetTouches: ts, changedTouches: ts, bubbles: true, cancelable: true }));
   fire('touchstart', [mk(1, 150, 400), mk(2, 250, 400)]); fire('touchmove', [mk(1, 110, 400), mk(2, 290, 400)]); fire('touchend', []);
 });
 await p.waitForTimeout(400);
 ok(await p.evaluate(() => RD.zoom > 1.6 && RD.zoom < 2.01), 'pinching zooms the pages (' + await p.evaluate(() => RD.zoom) + ')');
 ok((await p.textContent('#rdPg')) === '5', 'pinch keeps the page');
 // highlight → card source, continue reading
 await p.evaluate(() => rdZoomTo(1)); await p.evaluate(() => rdScrollTo(1, true)); await p.waitForSelector('.rd-page[data-i="1"].on .textLayer span');
 await p.evaluate(() => { const sp = [...document.querySelectorAll('.rd-page[data-i="1"] .textLayer span')].find(s => s.textContent.includes('Working memory is')); const r = document.createRange(); r.selectNodeContents(sp); getSelection().removeAllRanges(); getSelection().addRange(r); });
 await p.waitForSelector('#rdPop'); await p.click('#rdPop [data-action=rd-card]'); await p.waitForSelector('#hl-f'); await p.click('[data-action=rd-mk]'); await p.waitForTimeout(800);
 await p.evaluate(() => go('today')); await p.waitForTimeout(400);
 ok(await p.locator('.cont-read').count() === 1 && /Page 2 of 8/.test(await p.textContent('.cont-read')), 'Today shows Continue reading at page 2');
 await p.evaluate(() => { const c = S.cards.at(-1); R = { ids: [c.id], i: 0, shown: true, start: Date.now(), done: 0, right: 0 }; stack = [{ v: 'today' }, { v: 'review' }]; render(true); });
 await p.waitForTimeout(300);
 ok(/Memory textbook, page 2/.test(await p.textContent('.fc-back')), 'a card from a highlight shows its page');
 await p.evaluate(() => { stack = [{ v: 'today' }]; render(true); openCardSheet(S.cards.at(-1).node, S.cards.at(-1).id); }); await p.waitForTimeout(300);
 await p.click('[data-sgo^="read:"]'); await p.waitForTimeout(1200);
 ok(await p.evaluate(() => stack.at(-1).v === 'read') && (await p.textContent('#rdPg')) === '2', 'card editor opens the page in the textbook');
 console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors'); if (errs.length) fails++;
 console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close();
})();
