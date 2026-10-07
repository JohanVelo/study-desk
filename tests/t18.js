// t18: v4.9 swipe, shortcuts, text size, tab slide direction, buzz, folded changes, quick add, recent searches
const { chromium } = require('playwright'); const fs = require('fs');
const SAMPLE = fs.readFileSync(__dirname + '/sample-data.js', 'utf8');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
 await ctx.route('**/data.js', r => r.fulfill({ contentType: 'text/javascript', body: SAMPLE }));
 await ctx.addInitScript(() => { window.__vib = []; navigator.vibrate = p => { window.__vib.push(p); return true; }; });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
 await p.evaluate(() => { const t = todayKey(); tasksOn(t).forEach((x, i) => { x.start = 1300 + i; x.dur = 20; x.done = false; }); save(); go('today'); }); await p.waitForTimeout(400);
 const swipe = (sel, dx) => p.evaluate(([sel, dx]) => { const r = document.querySelector(sel), b = r.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
   const ev = (t, cx) => (t === 'pointerdown' ? r.querySelector('.title') : document).dispatchEvent(new PointerEvent(t, { pointerType: 'touch', clientX: cx, clientY: y, bubbles: true, isPrimary: true }));
   ev('pointerdown', x); for (let i = 1; i <= 8; i++) ev('pointermove', x + dx * i / 8); ev('pointerup', x + dx); return r.querySelector('.check').dataset.id; }, [sel, dx]);
 let id = await swipe('.plan .task', 40); await p.waitForTimeout(500);
 ok(await p.evaluate(id => !S.tasks.find(x => x.id === id).done && !document.querySelector('.swiping'), id), 'a short swipe springs back and changes nothing');
 id = await swipe('.plan .task', 200); await p.waitForTimeout(900);
 ok(await p.evaluate(id => S.tasks.find(x => x.id === id).done, id), 'swipe right ticks the session off');
 ok(await p.evaluate(() => __vib.length >= 1), 'the phone buzzes when it is ticked (' + await p.evaluate(() => JSON.stringify(__vib)) + ')');
 ok(await p.evaluate(() => stack.at(-1).v === 'today'), 'the swipe did not open the topic');
 id = await swipe('.plan .task:not(.done)', -200); await p.waitForTimeout(900);
 ok(await p.evaluate(id => { const t = S.tasks.find(x => x.id === id); return !t.done && (t.date !== todayKey() || t.carried); }, id), 'swipe left moves the session to later');
 ok(await p.locator('.toast:has-text("Undo")').count() === 1, 'moving offers Undo');
 ok(await p.locator('details.chg').count() === 1 && !(await p.evaluate(() => $('details.chg').open)), 'plan changes are folded into one line');
 ok(await p.evaluate(() => { const c = $('details.chg').getBoundingClientRect(), u = $('.upnext').getBoundingClientRect(); return c.top > u.bottom; }), 'the next session comes before the changes');
 await p.click('details.chg summary'); ok(await p.evaluate(() => $('details.chg').open && /moved to/.test($('details.chg ul').textContent)), 'tapping it shows what changed');
 // quick add
 ok(await p.locator('.qa-btn').count() === 1, 'Today has an Add button');
 await p.click('.qa-btn'); await p.waitForTimeout(400);
 ok(await p.locator('#qa-topic option').count() > 5, 'quick add lists topics');
 const topic = await p.evaluate(() => { const s = $('#qa-topic'); s.selectedIndex = 3; return s.value; });
 await p.click('[data-action=qa-card]'); await p.waitForTimeout(400);
 ok(await p.locator('#fc-f').count() === 1 && (await p.textContent('.sheet-head')).includes(await p.evaluate(t => nodes[t].title, topic)), 'Flashcard opens a new card for the chosen topic');
 await p.evaluate(() => closeSheet(true)); await p.click('.qa-btn'); await p.waitForTimeout(300); await p.click('[data-action=qa-notes]'); await p.waitForTimeout(400);
 ok(await p.locator('#notes-text').count() === 1, 'Notes opens the notes editor');
 await p.evaluate(() => closeSheet(true)); await p.click('.qa-btn'); await p.waitForTimeout(300); await p.click('[data-action=qa-subject]'); await p.waitForTimeout(500);
 ok(await p.evaluate(() => stack.at(-1).v === 'editsubj'), 'New subject opens the subject form');
 // review naming
 await p.evaluate(() => go('practice')); await p.waitForTimeout(400);
 ok((await p.textContent('.view h1')).trim() === 'Review', 'the Review tab page is called Review');
 // tab slide direction
 const dirs = await p.evaluate(async () => { const out = []; const real = document.startViewTransition?.bind(document); document.startViewTransition = fn => { out.push(document.documentElement.dataset.nav); fn(); return { finished: Promise.resolve() }; };
   const was = S.settings.motion; go('today'); go('progress'); go('listen'); document.startViewTransition = real; return out; });
 ok(dirs.join() === 'tab-l,tab-r,tab-l' || dirs.length === 0, 'tabs slide from the side they sit on: ' + dirs.join());
 // recent searches
 await p.evaluate(() => openSearch()); const W = await p.evaluate(() => nodes[leafIds[2]].title.split(' ')[0].toLowerCase()); await p.fill('#srch', W); await p.waitForTimeout(300);
 await p.click('#srchRes [data-sgo] >> nth=0'); await p.waitForTimeout(400);
 await p.evaluate(() => openSearch()); await p.waitForTimeout(200);
 ok(await p.locator('.rs .chip').count() === 1 && (await p.textContent('.rs .chip')).trim() === W, 'search remembers ' + W);
 await p.click('.rs .chip'); await p.waitForTimeout(200);
 ok(await p.inputValue('#srch') === W && await p.locator('#srchRes [data-sgo]').count() > 0, 'tapping a recent search runs it');
 await p.fill('#srch', ''); await p.dispatchEvent('#srch', 'input'); await p.click('[data-action=rs-clear]'); await p.waitForTimeout(100);
 ok(await p.locator('.rs').count() === 0, 'Clear forgets them');
 await p.evaluate(() => closeSheet(true));
 // text size
 await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
 await p.click('[data-k=text][data-v=large]'); await p.waitForTimeout(200);
 ok(await p.evaluate(() => document.documentElement.classList.contains('big') && S.settings.text === 'large'), 'Larger text turns on');
 await p.reload(); await p.waitForTimeout(1500);
 ok(await p.evaluate(() => document.documentElement.classList.contains('big')), 'Larger text is remembered');
 ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scrolling with larger text');
 await p.evaluate(() => { S.settings.text = 'normal'; applySettings(false); });
 // shortcuts
 for (const [what, check, name] of [['search', '#srch', 'Search'], ['add', '#qa-topic', 'Add'], ['next', '.focus-scrim,.focus', 'Start next session']]) {
  await p.goto('http://localhost:8765/?do=' + what); await p.waitForTimeout(1700);
  ok(await p.locator(check).count() >= 1, name + ' shortcut opens it');
  ok(await p.evaluate(() => !location.search.includes('do=')), name + ' shortcut tidies the address');
 }
 const man = JSON.parse(fs.readFileSync(__dirname + '/../manifest.webmanifest', 'utf8')); ok(man.shortcuts.length === 4, 'manifest lists 4 shortcuts');
 console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
