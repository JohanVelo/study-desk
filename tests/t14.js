// t14: round-two upgrades (v4.4)
const { chromium } = require('playwright'); const fs = require('fs');
const SAMPLE = fs.readFileSync(__dirname + '/sample-data.js', 'utf8');
const FAKE = fs.readFileSync(__dirname + '/t11.js', 'utf8').match(/const FAKE = (`[\s\S]*?`);/)[1];
const MOCK_EMBED = `const SYN={forget:'decay',forgetting:'decay',fade:'decay',fades:'decay',faded:'decay',lose:'decay',memories:'memory',traces:'memory',trace:'memory'};
const vec=t=>{const v=new Array(64).fill(0);for(let w of t.toLowerCase().match(/[a-z]+/g)||[]){if(w.length<4)continue;w=SYN[w]||w;let h=0;for(const c of w)h=(h*31+c.charCodeAt(0))|0;v[Math.abs(h)%64]+=1;}const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
self.onmessage=e=>{const {id,op,texts}=e.data;if(op==='load'){let i=0;const t=setInterval(()=>{i++;self.postMessage({op:'progress',loaded:i*5e6,total:23e6});if(i>=4){clearInterval(t);self.postMessage({id,ok:true});}},60);return;}self.postMessage({id,ok:true,vecs:texts.map(vec)});};`;
(async () => { const b = await chromium.launch(); const errs = []; const ok = (c, m) => console.log(c ? 'PASS' : 'FAIL', m);
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true });
 await ctx.route('**/data.js', r => r.fulfill({ contentType: 'text/javascript', body: SAMPLE }));
 await ctx.route('**/embed-worker.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK_EMBED }));
 await ctx.route('**/trystero.js', r => r.fulfill({ contentType: 'text/javascript', body: eval(FAKE) }));
 // 0. IndexedDB v2 → v3 upgrade keeps notes
 const p0 = await ctx.newPage(); await p0.goto('http://localhost:8765/manifest.webmanifest');
 await p0.evaluate(() => new Promise(res => { const r = indexedDB.open('studydesk', 2); r.onupgradeneeded = () => { const d = r.result; ['notes', 'audio', 'sketch'].forEach(s => d.createObjectStore(s, { keyPath: 'id' })); }; r.onsuccess = () => { const t = r.result.transaction('notes', 'readwrite'); t.objectStore('notes').put({ id: 'psy/1/1/1', text: 'Old notes kept after the upgrade.' }); t.oncomplete = () => { r.result.close(); res(); }; }; }));
 await p0.close();
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
 const leaf = await p.evaluate(() => leafIds.find(id => notesOf(id)) || null);
 const up = await p.evaluate(async () => { const d = await new Promise(r => { const q = indexedDB.open('studydesk'); q.onsuccess = () => r(q.result); }); const v = d.version, s = [...d.objectStoreNames]; d.close(); return { v, s }; });
 ok(up.v >= 3 && up.s.includes('pics') && up.s.includes('vec'), 'database upgraded to v3 ' + JSON.stringify(up));
 ok(await p.evaluate(async () => ((await IDB.get('notes', 'psy/1/1/1')) || {}).text === 'Old notes kept after the upgrade.'), 'existing notes survive the upgrade');
 ok(await p.evaluate(() => !document.querySelector('.driver-popover')), 'tour does not pop up during automated runs');
 // 1. practice exam
 await p.evaluate(() => go('practice')); await p.waitForTimeout(400);
 ok(await p.locator('.ex-cta').count() === 1, 'Review shows the practice exam card');
 await p.click('.ex-cta'); await p.waitForTimeout(400);
 await p.click('[data-action=ex-set][data-k=n][data-v="10"]'); await p.click('[data-action=ex-start]'); await p.waitForTimeout(400);
 let r = await p.evaluate(() => ({ n: EX.qs.length, clock: !!document.querySelector('#exTime'), chapters: new Set(EX.qs.map(id => rootOf(exQ(id).node))).size }));
 ok(r.n === 10 && r.clock, 'exam started with 10 questions and a timer'); ok(r.chapters >= 3, 'questions spread across ' + r.chapters + ' chapters');
 const right = await p.evaluate(() => exQ(EX.qs[0]).a);
 await p.click(`[data-action=ex-pick][data-i="${right}"]`); await p.waitForTimeout(200);
 ok(await p.locator('.opt.picked').count() === 1 && await p.locator('.verdict').count() === 0, 'answer is selected, nothing marked yet');
 await p.click('[data-action=ex-go][data-d="1"]'); await p.click('[data-action=ex-pick][data-i="0"]');
 await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => go('exam')); await p.waitForTimeout(300);
 ok(await p.evaluate(() => EX && Object.keys(EX.picks).length === 2 && !EX.done), 'exam survives a reload');
 const mis0 = await p.evaluate(() => Object.values(S.mistakes).reduce((a, m) => a + m.n, 0));
 await p.click('.ex-run > button.link[data-action=ex-hand]'); await p.waitForTimeout(150);
 ok((await p.textContent('.ex-run > button.link[data-action=ex-hand]')).includes('8 unanswered'), 'warns about unanswered questions');
 await p.click('.ex-run > button.link[data-action=ex-hand]'); await p.waitForTimeout(500);
 r = await p.evaluate(() => ({ h: document.querySelector('.ex-res h1')?.textContent, ch: document.querySelectorAll('.ex-ch').length, miss: document.querySelectorAll('.ex-miss').length, mis: Object.values(S.mistakes).reduce((a, m) => a + m.n, 0) }));
 console.log(JSON.stringify(r));
 ok(/%$/.test(r.h) && r.ch >= 3 && r.miss >= 8, 'results show score, chapters and questions to review');
 ok(r.mis > mis0, 'wrong answers go to the mistakes list');
 await p.click('[data-action=ex-again]'); await p.click('[data-action=ex-set][data-k=n][data-v="10"]'); await p.click('[data-action=ex-start]'); await p.waitForTimeout(200);
 await p.evaluate(() => { EX.end = Date.now() + 1200; exSave(); exTimer(); }); await p.waitForTimeout(2600);
 ok(await p.evaluate(() => EX.done && EX.timeUp) && await p.locator('.ex-res').count() === 1, 'time running out hands the exam in');
 await p.click('[data-action=ex-close]'); await p.waitForTimeout(300);
 // 2. focus sounds
 await p.evaluate(() => go('today')); await p.waitForTimeout(400);
 await p.click('.upnext [data-action=focus]'); await p.waitForTimeout(500);
 ok(await p.locator('.snd .chip').count() === 4, 'focus timer offers sounds');
 await p.click('.snd [data-k=rain]'); await p.waitForTimeout(300);
 ok(await p.evaluate(() => SND.playing === 'rain'), 'rain plays');
 await p.click('.focus [data-f=pause]'); await p.waitForTimeout(1200);
 ok(await p.evaluate(() => !SND.playing), 'pausing stops the sound');
 await p.click('.focus [data-f=pause]'); await p.waitForTimeout(300);
 ok(await p.evaluate(() => SND.playing === 'rain'), 'resuming restarts it');
 await p.click('.focus [data-f=stop]'); await p.waitForTimeout(1200);
 ok(await p.evaluate(() => !SND.playing), 'stopping the timer stops the sound');
 // 3. study rhythm
 await p.evaluate(() => { const t = todayKey(); for (let i = 1; i <= 4; i++) S.log.push({ d: addDays(t, -i), t: 'task', m: 30 }); save(); go('progress'); }); await p.waitForTimeout(500);
 r = await p.evaluate(() => ({ cells: document.querySelectorAll('.hm i').length, stats: document.querySelector('.rh-stats').innerText.replace(/\s+/g, ' ') }));
 console.log(r.stats); const sk = await p.evaluate(() => streaks(dayMinutes())); ok(r.cells === 126 && r.stats.includes(sk.cur + ' day') && sk.cur >= 4, 'heatmap with 18 weeks and the streak');
 // 4. picture cards
 const L = await p.evaluate(() => { const id = leafIds.find(i => st(i) >= 1) || leafIds[0]; go('topic:' + id); return id; }); await p.waitForTimeout(500);
 await p.click(`[data-action=pc-new][data-id="${L}"]`); await p.waitForTimeout(400);
 await p.setInputFiles('#oc-file', 'shots43/phone-light-today-empty.png'); await p.waitForSelector('#ocStage img'); await p.waitForTimeout(400);
 const bx = await p.locator('#ocStage').boundingBox();
 const drag = async (x0, y0, x1, y1) => { await p.mouse.move(bx.x + bx.width * x0, bx.y + bx.height * y0); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * x1, bx.y + bx.height * y1, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200); };
 await drag(.05, .1, .45, .16); await p.fill('#oc-label', 'Heading'); await drag(.1, .3, .7, .36); await drag(.5, .5, .52, .505);
 ok(await p.locator('.oc-b').count() === 2, 'two boxes drawn, a tiny accidental one ignored');
 await p.click('[data-action=oc-save]'); await p.waitForTimeout(500);
 r = await p.evaluate(L => ({ cards: S.cards.filter(c => c.kind === 'pic' && c.node === L).map(c => c.b), pics: Object.keys(PICS).length }), L);
 ok(r.cards.length === 2 && r.cards.includes('Heading') && r.pics === 1, 'two picture cards saved ' + JSON.stringify(r));
 ok(await p.locator('.fc-row[data-action=pc-edit]').count() === 2, 'topic lists the picture cards');
 await p.evaluate(L => startReview(L), L); await p.waitForTimeout(600);
 let tries = 0; while (!(await p.evaluate(() => { const c = S.cards.find(x => x.id === R.ids[R.i]); return c && c.kind === 'pic'; })) && tries++ < 30) { await p.click('[data-action=fc-show]'); await p.waitForTimeout(150); await p.click('[data-action=fc-grade][data-g="3"]'); await p.waitForTimeout(450); }
 ok(await p.locator('.fc-front .oc-view img[src^="data:image"]').count() === 1 && await p.locator('.fc-front .oc-m.t').count() === 1, 'review shows the picture with the target box hidden');
 await p.click('[data-action=fc-show]'); await p.waitForTimeout(500);
 ok(await p.locator('.fc-back .oc-m.t.open').count() === 1, 'answer reveals the box');
 const bak = await p.evaluate(() => JSON.parse(exportText()));
 ok(bak.pics && Object.keys(bak.pics).length === 1, 'backup includes the picture');
 await p.evaluate(() => { R = null; go('practice'); });
 await p.evaluate(L => { const c = S.cards.find(x => x.kind === 'pic'); openPicSheet(c.node, c.pic); }, L); await p.waitForTimeout(300);
 ok(await p.locator('.oc-b').count() === 2, 'editing a picture shows its boxes');
 await p.click('.oc-b >> nth=1'); await p.click('[data-action=oc-del]'); await p.click('[data-action=oc-save]'); await p.waitForTimeout(300);
 ok(await p.evaluate(() => S.cards.filter(c => c.kind === 'pic').length) === 1, 'removing a box removes its card');
 // 5. search by meaning
 await p.evaluate(() => saveNotes(leafIds[1], 'Decay theory says that memory traces fade with time when they are not used. Interference is another explanation.'));
 await p.evaluate(() => openSearch()); await p.fill('#srch', 'why do we forget things'); await p.waitForTimeout(500);
 ok(await p.locator('.sm-hint button').count() === 1, 'search suggests turning on search by meaning');
 await p.click('.sm-hint button'); await p.waitForTimeout(600);
 await p.click('[data-action=sm-on]'); await p.waitForFunction(() => SM.on, null, { timeout: 15000 });
 await p.evaluate(() => openSearch()); await p.fill('#srch', 'why do we forget things'); await p.waitForSelector('.sm-hit', { timeout: 10000 });
 r = await p.evaluate(() => [...document.querySelectorAll('.sm-hit .sm-text')].map(x => x.textContent));
 console.log(r[0]); ok(/Decay theory/.test(r[0]), 'finds “decay … fade” when searching “forget”, quoting the notes');
 await p.evaluate(() => closeSheet()); await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
 await p.click('[data-action=sm-off]'); await p.waitForTimeout(400);
 ok(await p.evaluate(async () => !SM.on && (await IDB.all('vec')).length === 0), 'turning it off removes the stored data');
 // 6. QR pairing
 await p.click('[data-action=sync-new]'); await p.waitForSelector('#syncQR svg', { timeout: 5000 });
 const code = await p.evaluate(() => SY.code);
 const decoded = await p.evaluate(async () => { await loadScript('vendor/x/qr-scanner.umd.min.js'); const svg = document.querySelector('#syncQR svg').outerHTML; const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(svg); await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 400; c.getContext('2d').drawImage(img, 0, 0, 400, 400); const r = await QrScanner.scanImage(c, { returnDetailedScanResult: true }); return r.data; });
 ok(decoded.endsWith('#pair=' + code), 'QR code decodes to the pairing link');
 const q = await ctx.newPage(); await q.goto('http://localhost:8765/#pair=' + code); await q.waitForTimeout(2500);
 r = await q.evaluate(() => ({ st: SY.state, code: SY.code, view: stack[stack.length - 1].v, hash: location.hash }));
 ok(r.code === code && r.view === 'settings' && !r.hash, 'opening the link pairs and clears it ' + JSON.stringify(r));
 await p.waitForTimeout(800); ok(await p.evaluate(() => SY.state) === 'connected', 'first device connected');
 await q.close(); await p.click('[data-action=sync-cancel]'); await p.waitForTimeout(200);
 ok(await p.locator('[data-action=sync-scan]').count() === 1, 'Scan a code is offered');
 // 7. tour
 await p.click('[data-action=tour]'); await p.waitForSelector('.driver-popover', { timeout: 5000 });
 let steps = 0; while (await p.locator('.driver-popover').count() && steps < 12) { steps++; await p.click('.driver-popover-next-btn'); await p.waitForTimeout(350); }
 ok(steps >= 7 && await p.evaluate(() => localStorage.getItem('studydesk.tour')) === 'done', 'tour has ' + steps + ' steps and is remembered');
 console.log('ERRORS', errs); await b.close();
})();
