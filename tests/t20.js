// t20: a 1,000-page handbook imports end to end (phone-sized screen), with progress the whole way
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto(`http://localhost:${process.env.SD_PORT||8765}/`); await p.waitForTimeout(1200);
 await p.evaluate(() => go('import')); await p.waitForTimeout(300);
 await p.fill('#imp-name', 'Social Work'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(400);
 const t0 = Date.now(); const samples = [];
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/handbook-1000.pdf');
 for (let k = 0; k < 600; k++) {
  const st = await p.evaluate(() => ({ prog: document.querySelector('#impProg')?.textContent.replace(/\s+/g, ' ').trim() || '', apply: !!document.querySelector('[data-action=imp-apply]'), err: document.querySelector('.lock.bad')?.textContent || '' }));
  if (st.prog && (samples.length === 0 || samples[samples.length - 1] !== st.prog.slice(0, 90))) samples.push(st.prog.slice(0, 90));
  if (st.apply || st.err) { if (st.err) console.log('error shown:', st.err); break; }
  if (k === 8) await p.screenshot({ path: 'shots410/phone-handbook-reading.png' });
  await p.waitForTimeout(500);
 }
 const readSecs = ((Date.now() - t0) / 1000).toFixed(1);
 console.log('progress seen:', samples.filter((_, i) => i % Math.ceil(samples.length / 6) === 0).join('\n   '));
 ok(samples.some(s => /page [\d,]{3,5} of 1,000/.test(s)), 'progress counted pages out of 1000');
 const prev = await p.evaluate(() => ({ count: qpPreview?.count, chapters: qpPreview?.roots.length, leaves: impCounts(qpPreview.roots).leaves, first: qpText.split('\n').slice(0, 4), lastLine: qpText.split('\n').at(-1) }));
 console.log('read in', readSecs, 's', JSON.stringify(prev));
 ok(prev.chapters === 25 && prev.leaves === 250, 'found 25 chapters and 250 sections');
 await p.screenshot({ path: 'shots410/phone-handbook-check.png' });
 const t1 = Date.now(); await p.click('[data-action=imp-apply]');
 let shotSave = false;
 for (let k = 0; k < 900; k++) { const s = await p.evaluate(() => ({ saving: !!document.querySelector('#impSave'), txt: document.querySelector('#impSave')?.textContent || '' })); if (!s.saving) break; if (!shotSave && /\d+ of 250/.test(s.txt)) { shotSave = true; await p.screenshot({ path: 'shots410/phone-handbook-saving.png' }); console.log('saving shows:', s.txt.replace(/\s+/g, ' ').trim()); } await p.waitForTimeout(500); }
 const saveSecs = ((Date.now() - t1) / 1000).toFixed(1);
 const res = await p.evaluate(async () => { const sid = IMP.sid; const ids = leafIds.filter(i => nodes[i].subject === sid); let withNotes = 0; for (const i of ids) if (notesOf(i)) withNotes++; const sample = notesOf(ids[137]) || ''; return { ids: ids.length, withNotes, sampleTitle: nodes[ids[137]].title, sample: sample.slice(0, 120), done: $('.done-card')?.textContent.replace(/\s+/g, ' ').slice(0, 160) }; });
 console.log('saved in', saveSecs, 's', JSON.stringify(res));
 ok(res.withNotes >= 245, `notes saved for ${res.withNotes} of ${res.ids} topics`);
 ok(shotSave, 'saving showed topic X of 250');
 await p.screenshot({ path: 'shots410/phone-handbook-done.png' });
 await p.evaluate(() => go('today')); await p.waitForTimeout(800);
 ok(await p.locator('.upnext, .task').count() > 0, 'the plan is built from the handbook');
 console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
