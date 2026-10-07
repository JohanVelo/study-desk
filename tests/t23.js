// t23: learn a topic step by step: tile, intro, read parts, diagram, quick checks, finish, missed parts again, flashcards
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 fs.mkdirSync('shots410', { recursive: true });
 for (const [dev, vp, scheme] of [['phone', { width: 390, height: 844 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark'], ['laptop', { width: 1440, height: 900 }, 'light'], ['laptop', { width: 1440, height: 900 }, 'dark']]) {
 const main = dev === 'phone' && scheme === 'light';
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: vp, deviceScaleFactor: dev === 'phone' ? 2 : 1, colorScheme: scheme, reducedMotion: 'reduce', isMobile: dev === 'phone', hasTouch: dev === 'phone' });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
 await p.evaluate(() => { localStorage.setItem('studydesk.tips', JSON.stringify({ topic: 1, practice: 1 })); go('import'); }); await p.waitForTimeout(300); await p.fill('#imp-name', 'Psychology'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(300);
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/figures-book.pdf'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 30000 });
 await p.click('[data-action=imp-apply]'); await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 30000 });
 const id = await p.evaluate(() => FIGS.find(f => /2\.1/.test(f.cap))?.node);
 await p.evaluate(async id => { await saveNotes(id, notesOf(id) + `\n\n## The frontal lobe\nThe frontal lobe is the part of the cortex behind the forehead that plans actions and controls behaviour. It contains the motor cortex, which sends signals to the muscles. Damage to the frontal lobe can change personality, as in the case of Phineas Gage in 1848. The prefrontal cortex is the front-most region and supports working memory and decision making. It is the last brain region to mature, finishing in the mid-twenties.\n\n## The temporal lobe\nThe temporal lobe sits at the side of the head, above the ears. It processes sound in the auditory cortex. Wernicke's area is a region in the left temporal lobe that is needed to understand language. The hippocampus lies deep inside the temporal lobe and is essential for forming new long-term memories. For example, the patient H.M. could not form new memories after his hippocampus was removed in 1953.\n\n## The occipital and parietal lobes\nThe occipital lobe at the back of the head contains the visual cortex. The parietal lobe combines touch, position and spatial information. The somatosensory cortex is a strip in the parietal lobe that receives touch signals from the body. Neglect is a condition where damage to the right parietal lobe makes a person ignore the left side of space.`); }, id);
 await p.evaluate(id => go('topic:' + id), id); await p.waitForTimeout(800);
 const tile = await p.textContent('.st-learn').catch(() => '');
 if (main) ok(/Learn it step by step/.test(tile) && /check/.test(tile), 'topic shows the step-by-step tile: ' + tile.replace(/\s+/g, ' ').trim());
 await p.screenshot({ path: `shots410/${dev}-${scheme}-learn-tile.png` });
 await p.click('.st-learn'); await p.waitForTimeout(500);
 const steps = await p.evaluate(() => LN.steps.map(s => s.k));
 if (main) { console.log('  steps:', steps.join(' ')); ok(steps[0] === 'intro' && steps.includes('read') && steps.includes('check') && steps.includes('fig') && steps[steps.length - 1] === 'done', 'steps have an intro, reading, a diagram, checks and an end'); }
 await p.screenshot({ path: `shots410/${dev}-${scheme}-learn-intro.png` });
 let shotR = false, shotF = false, shotQ = false, shotA = false, wrong = 0;
 for (let k = 0; k < 60; k++) {
  const s = await p.evaluate(() => ({ k: LN.steps[LN.i].k, shown: LN.shown }));
  if (s.k === 'done') break;
  if (s.k === 'read' && !shotR && k > 0) { shotR = true; await p.screenshot({ path: `shots410/${dev}-${scheme}-learn-read.png` }); }
  if (s.k === 'fig' && !shotF) { await p.waitForTimeout(400); shotF = true; if (main) ok(await p.evaluate(() => !!$('.ln-fig img')?.src), 'the diagram step shows the picture'); await p.screenshot({ path: `shots410/${dev}-${scheme}-learn-fig.png` }); }
  if (s.k === 'check' && !s.shown) { if (!shotQ) { shotQ = true; await p.screenshot({ path: `shots410/${dev}-${scheme}-learn-check.png` }); } await p.click('[data-action=ln-show]'); await p.waitForTimeout(150); continue; }
  if (s.k === 'check' && s.shown) { if (!shotA) { shotA = true; await p.screenshot({ path: `shots410/${dev}-${scheme}-learn-answer.png` }); } const g = wrong < 1 ? 0 : 1; if (!g) wrong++; await p.click(`[data-action=ln-grade][data-g="${g}"]`); await p.waitForTimeout(150); continue; }
  await p.click('[data-action=ln-next]'); await p.waitForTimeout(150);
 }
 const end = await p.evaluate(() => ({ got: LN.got, asked: LN.asked, miss: LN.miss.size, status: st(LN.id), log: S.log.filter(e => e.learn).length }));
 if (main) { console.log('  end:', JSON.stringify(end)); ok(end.asked >= 2 && end.miss === 1 && end.got === end.asked - 1, 'checks counted (' + end.got + '/' + end.asked + ')'); ok(end.status >= 1 && end.log === 1, 'topic moves to Learning and the session is logged'); }
 await p.screenshot({ path: `shots410/${dev}-${scheme}-learn-done.png` });
 await p.click('[data-action=ln-again]'); await p.waitForTimeout(300);
 const again = await p.evaluate(() => ({ n: LN.steps.length, again: LN.again, txt: $('.ln-card').textContent }));
 if (main) ok(again.again && again.n < steps.length && /Going over the 1 part/.test(again.txt), 'Go over again keeps only the missed part (' + again.n + ' steps)');
 for (let k = 0; k < 20; k++) { const s = await p.evaluate(() => ({ k: LN.steps[LN.i].k, shown: LN.shown })); if (s.k === 'done') break; if (s.k === 'check') { if (!s.shown) await p.click('[data-action=ln-show]'); else await p.click('[data-action=ln-grade][data-g="0"]'); } else await p.click('[data-action=ln-next]'); await p.waitForTimeout(120); }
 const before = await p.evaluate(() => (S.cards || []).length); await p.click('[data-action=ln-cards]'); await p.waitForTimeout(300);
 const after = await p.evaluate(() => (S.cards || []).length);
 if (main) ok(after === before + 1, 'missed check becomes a flashcard');
 await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150); if (main) ok(await p.evaluate(() => LN.steps[LN.i].k !== 'done'), 'arrow keys move between steps');
 await p.evaluate(() => lAction('ln-exit', { dataset: {} })); await p.waitForTimeout(300);
 if (main) ok(await p.evaluate(() => stack[stack.length - 1].v === 'topic'), 'Back to the topic works');
 await ctx.close(); }
 console.log(errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
