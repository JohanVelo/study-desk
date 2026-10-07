// t13: clean slate for everyone + the new import flow
const { chromium } = require('playwright'); const fs = require('fs');
const SAMPLE = fs.readFileSync(__dirname + '/sample-data.js', 'utf8');
(async () => { const b = await chromium.launch(); const errs = []; const ok = (c, m) => console.log(c ? 'PASS' : 'FAIL', m);
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
 // A. brand-new install starts empty
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
 let r = await p.evaluate(() => ({ subj: DSUBJ.length, qs: QS.length, log: S.log.length, pill: !!$('.proto'), cta: !!$('[data-go="import"]') }));
 ok(r.subj === 0 && r.qs === 0 && r.log === 0, 'new install has no subjects, questions or fake history ' + JSON.stringify(r));
 ok(!r.pill && r.cta, 'no "Sample data" label; import is the first thing offered');
 // B. an older install that still has the sample, plus things the person added
 await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('studydesk'); });
 await p.route('**/data.js', rt => rt.fulfill({ contentType: 'text/javascript', body: SAMPLE }));
 await p.reload(); await p.waitForTimeout(1500);
 const kept = await p.evaluate(async () => {
   // her own subject, and notes she wrote in a sample topic of Social Work
   S.content.subjects.push({ id: 'mine', name: 'Biology', code: '', course: '', hue: 140, exam: addDays(todayKey(), 40), examTime: '', venue: '', chapters: [{ id: 'mine/cells', title: 'Cells', p1: 1, p2: 10, diff: 2, calc: false, kids: [] }] });
   afterContentChange(true); save(true);
   const sw = leavesBySubject.swk[0].id; await saveNotes(sw, 'My own lecture notes about the Charity Organisation Societies, written in class on Monday. They organised casework.');
   return { sw, before: DSUBJ.map(s => s.name) };
 });
 console.log('before', kept.before);
 await p.unroute('**/data.js'); await p.reload(); await p.waitForTimeout(2200);
 r = await p.evaluate(sw => ({ subj: DSUBJ.map(s => s.name), notes: notesOf(sw).slice(0, 20), from: S.content.from, qs: QS.filter(q => !q.auto).length, log: S.log.length, toast: $('.toast')?.textContent || '' }), kept.sw);
 console.log(JSON.stringify(r));
 ok(!r.subj.includes('Psychology') && !r.subj.includes('Anthropology'), 'untouched sample subjects removed');
 ok(r.subj.includes('Biology'), 'her own subject kept');
 ok(r.subj.includes('Social Work') && r.notes.startsWith('My own'), 'a sample subject she wrote notes in is kept, with the notes');
 ok(r.from === 'own', 'clean-up runs once');
 await p.reload(); await p.waitForTimeout(1500);
 ok(await p.evaluate(() => DSUBJ.length) === r.subj.length, 'nothing else removed on the next start');
 // C. old install that only had the sample: becomes empty
 await p.goto('about:blank'); const p0 = await ctx.newPage(); await p0.goto('http://localhost:8765/manifest.webmanifest');
 await p0.evaluate(() => new Promise(r => { localStorage.clear(); const q = indexedDB.deleteDatabase('studydesk'); q.onsuccess = q.onerror = q.onblocked = r; })); await p0.close();
 await p.route('**/data.js', rt => rt.fulfill({ contentType: 'text/javascript', body: SAMPLE }));
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200); await p.unroute('**/data.js');
 await p.reload(); await p.waitForTimeout(2000);
 r = await p.evaluate(() => ({ subj: DSUBJ.map(s=>s.name), log: S.log.length, cards: S.cards.length, tasks: S.tasks.length }));
 ok(r.subj.length === 0 && r.log === 0 && r.cards === 0 && r.tasks === 0, 'sample-only install is now empty ' + JSON.stringify(r));
 // D. import flow: new subject → PowerPoint → check → done
 await p.evaluate(() => go('import')); await p.waitForTimeout(500);
 ok(await p.locator('.wiz li.now').textContent() === '1Subject', 'step 1 is the subject');
 await p.click('[data-action=imp-new]'); ok((await p.textContent('#imp-err')).includes('name'), 'asks for a name');
 await p.fill('#imp-name', 'Psychology of Memory'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(400);
 ok(await p.locator('.drop-big').count() === 1 && (await p.textContent('.for-chip')).includes('Psychology of Memory'), 'step 2 shows the file box for the new subject');
 await p.setInputFiles('#imp-file', 'sumtest/memory.pptx'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 15000 });
 const found = await p.textContent('.found b'); console.log(found);
 ok(/Found \d+ chapters? and \d+ topics?/.test(found), 'step 3 says what was found');
 await p.click('[data-action=imp-apply]'); await p.waitForSelector('.done-card'); await p.waitForFunction(() => !IMP.done.saving, null, { timeout: 15000 }); await p.waitForTimeout(300);
 r = await p.evaluate(() => ({ text: $('.done-card').textContent, leaves: leafIds.length, withNotes: leafIds.filter(id => notesOf(id)).length }));
 console.log(r.text.replace(/\s+/g, ' ').trim());
 ok(r.leaves > 0 && r.withNotes > 0 && /Notes saved for \d+/.test(r.text), 'done screen confirms notes were saved');
 // E. import again into the same subject, typed list, replace
 await p.click('[data-action=imp-again]'); await p.waitForTimeout(300);
 await p.click('.typed > summary'); await p.fill('#qp-text', '1 Encoding 1-10\n1.1 Levels of processing 1-5\n1.2 Elaboration 6-10 hard'); await p.click('[data-action=imp-typed]'); await p.waitForTimeout(300);
 ok(await p.locator('[data-action=imp-mode]').count() === 2, 'offers add or replace when the subject has chapters');
 await p.click('[data-action=imp-mode][data-m=replace]'); await p.click('[data-action=imp-apply]'); await p.waitForTimeout(500);
 r = await p.evaluate(() => ({ titles: leafIds.map(id => nodes[id].title), done: $('.done-card')?.textContent || '' }));
 ok(r.titles.join() === 'Levels of processing,Elaboration', 'replace swaps the chapters ' + r.titles.join());
 // F. existing subject is offered in step 1, and the editor links to the flow
 await p.evaluate(() => go('import')); await p.waitForTimeout(300);
 ok(await p.locator('.pick-row').count() === 1, 'existing subject offered in step 1');
 await p.evaluate(() => go('editsubj:' + DSUBJ[0].id)); await p.waitForTimeout(300);
 ok(await p.locator('.imp-cta [data-go^="import:"]').count() === 1, 'subject editor links to the import flow');
 await p.click('.imp-cta [data-go^="import:"]'); await p.waitForTimeout(400);
 ok(await p.locator('.wiz li.now').textContent() === '2File', 'from a subject, the flow starts at the file step');
 // G. wrong file type explains itself
 fs.writeFileSync(__dirname + '/notes.txt', 'hello');
 await p.setInputFiles('#imp-file', 'notes.txt'); await p.waitForTimeout(400);
 ok((await p.locator('.drop-big .lock.bad').textContent()).includes('Word'), 'wrong file type shows a clear message');
 // H. the PDF kinds from the old import test, through the new flow
 const F = __dirname + '/fixtures/';
 for (const [f, want] of [['bookmarks.pdf', /Found/], ['toc.pdf', /Found/], ['Week 4 - Attachment.pptx', /Found/]]) {
   await p.evaluate(() => go('import:' + DSUBJ[0].id)); await p.waitForTimeout(300);
   await p.setInputFiles('#imp-file', F + f); await p.waitForFunction(() => document.querySelector('[data-action=imp-apply]') || document.querySelector('.drop-big .lock.bad'), null, { timeout: 20000 });
   const t = await p.evaluate(() => (document.querySelector('.found b') || document.querySelector('.drop-big .lock.bad')).textContent); ok(want.test(t), f + ': ' + t);
 }
 await p.evaluate(() => go('import:' + DSUBJ[0].id)); await p.waitForTimeout(300);
 await p.setInputFiles('#imp-file', F + 'plain.pdf'); await p.waitForFunction(() => document.querySelector('[data-action=imp-apply]') || document.querySelector('.drop-big .lock.bad'), null, { timeout: 20000 });
 console.log('plain.pdf ->', await p.evaluate(() => (document.querySelector('.found') || document.querySelector('.drop-big .lock.bad')).textContent.replace(/\s+/g, ' ')));
 console.log('ERRORS', errs); await b.close();
})();
