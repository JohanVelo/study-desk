// t17: v4.7 ease of use: topic study tiles, settings jump row, first-time tips
const { chromium } = require('playwright'); const fs = require('fs');
const SAMPLE = fs.readFileSync(__dirname + '/sample-data.js', 'utf8');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true });
 await ctx.route('**/data.js', r => r.fulfill({ contentType: 'text/javascript', body: SAMPLE }));
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
 const leaf = await p.evaluate(() => { const id = leafIds.find(i => st(i) >= 1 && (S.cards || []).some(c => c.node === i)) || leafIds.find(i => st(i) >= 1); return id; });
 await p.evaluate(id => go('topic:' + id), leaf); await p.waitForTimeout(400);
 ok(await p.locator('.st-tile').count() === 6, 'topic shows six ways to study it');
 ok(await p.evaluate(() => { const t = $('.st-wrap').getBoundingClientRect(); return t.top < 400; }), 'tiles sit near the top of the page');
 ok(await p.evaluate(() => { const h = [...document.querySelectorAll('section.card h2')].find(h => h.textContent === 'Flashcards'); return h && !h.closest('section').querySelector('[data-action=blurt],[data-action=tb-open],[data-action=fc-topic]'); }), 'buttons are not repeated in the flashcards card');
 ok(await p.locator('.ez-tip').count() === 1, 'a one-line tip shows the first time');
 await p.click('[data-action=tip-x]'); await p.evaluate(() => rerender()); await p.waitForTimeout(200);
 ok(await p.locator('.ez-tip').count() === 0, 'the tip stays gone once dismissed');
 for (const [sel, check, name] of [['[data-action=blurt]', '.sheet', 'Blurt check'], ['[data-action=tb-open]', '[data-action=tb-start],.lock', 'Teach it back'], ['.st-tile[data-action=notes]', '#notes-text', 'Notes']]) {
  await p.click('.st-grid ' + sel); await p.waitForTimeout(400); ok(await p.locator(check).count() >= 1, name + ' tile opens it'); await p.evaluate(() => closeSheet(true));
 }
 await p.click('.st-grid [data-action=practise]'); await p.waitForTimeout(500);
 ok(await p.evaluate(() => stack.at(-1).v === 'practice'), 'Practise tile opens practice');
 await p.evaluate(() => go('settings')); await p.waitForTimeout(400);
 const n = await p.locator('.set-jump a').count(); ok(n >= 6, 'settings has a jump row with ' + n + ' links');
 await p.click('.set-jump a:has-text("Backup")'); await p.waitForTimeout(900);
 ok(await p.evaluate(() => { const r = $('#set-backup').getBoundingClientRect(); return r.top > 100 && r.top < 200 && r.top >= $(".set-jump").getBoundingClientRect().bottom; }), 'Backup link scrolls to the backup card');
 // catch up
 await p.evaluate(() => { const t = todayKey(); tasksOn(t).forEach((x, i) => { x.start = i < 3 ? 1 : 1439 - 60; x.dur = i < 3 ? 1 : 30; x.done = false; }); save(); go('today'); });
 await p.waitForTimeout(500);
 ok(await p.locator('.catchup').count() === 1 && /3 earlier sessions/.test(await p.textContent('.catchup')), 'Today offers to catch up 3 earlier sessions');
 const st0 = await p.evaluate(() => tasksOn(todayKey()).filter(x => x.done).length);
 await p.click('[data-action=cu-done]'); await p.waitForTimeout(600);
 ok(await p.evaluate(n => tasksOn(todayKey()).filter(x => x.done).length === n + 3, st0) && await p.locator('.catchup').count() === 0, '"I did them" ticks all three');
 await p.evaluate(() => undo()); await p.waitForTimeout(500);
 ok(await p.locator('.catchup').count() === 1, 'undo brings them back');
 await p.click('[data-action=cu-move]'); await p.waitForTimeout(600);
 ok(await p.locator('.catchup').count() === 0 && await p.evaluate(() => tasksOn(todayKey()).filter(x => !x.done && x.start + x.dur <= new Date().getHours() * 60 + new Date().getMinutes()).length === 0), '"Move them" clears them from earlier today');
 // practice filter
 await p.evaluate(() => { Q = { ...Q, subj: 'all', lvl: 'all', topic: null, mode: 'all' }; go('practice'); }); await p.waitForTimeout(300);
 ok(await p.locator('details.qfilt:not([open])').count() === 1, 'practice filters are folded into one Filter row');
 await p.click('.qfilt summary'); await p.click('.qfilt [data-k=subj] >> nth=1'); await p.waitForTimeout(300);
 ok(await p.locator('details.qfilt[open]').count() === 1 && !/All subjects/.test(await p.textContent('.qfilt summary')), 'a chosen filter shows in the summary and stays open');
 console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors'); if (errs.length) fails++;
 console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); })();
