// t21: a 20,000-page, 108 MB handbook: import, save notes, then time every screen with 5,000 topics; watch memory
const { chromium } = require('playwright'); const PORT = require('./sdlib').port();  // exits 2 without SD_PORT, or on 8765 (the QGIS bridge)
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
 const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
 const heap = async () => { const m = (await cdp.send('Performance.getMetrics')).metrics; return Math.round(m.find(x => x.name === 'JSHeapUsedSize').value / 1e6); };
 await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(1200);
 await p.evaluate(() => { S.settings.motion = 'reduced'; applySettings(false); go('import'); }); await p.waitForTimeout(300);
 await p.fill('#imp-name', 'Mega Handbook'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(400);
 const t0 = Date.now(); let peak = 0, lastTxt = '';
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/handbook-20000.pdf');
 for (let k = 0; ; k++) {
  const st = await p.evaluate(() => ({ prog: document.querySelector('#impProg')?.textContent.replace(/\s+/g, ' ').trim() || '', apply: !!document.querySelector('[data-action=imp-apply]'), err: document.querySelector('.lock.bad')?.textContent || '' }));
  peak = Math.max(peak, await heap());
  if (k % 20 === 0 && st.prog) console.log('  ', Math.round((Date.now() - t0) / 1000) + 's', st.prog.slice(0, 150), '| heap', await heap(), 'MB');
  if (k === 40) await p.screenshot({ path: 'shots410/phone-20k-reading.png' });
  if (st.apply || st.err) { if (st.err) console.log('error:', st.err); break; }
  if (Date.now() - t0 > 40 * 60e3) { console.log('timed out'); break; }
  await p.waitForTimeout(1000);
 }
 const readS = Math.round((Date.now() - t0) / 1000);
 const prev = await p.evaluate(() => qpPreview ? ({ chapters: qpPreview.roots.length, leaves: impCounts(qpPreview.roots).leaves }) : null);
 console.log('read 20,000 pages in', readS, 's; peak heap', peak, 'MB;', JSON.stringify(prev));
 ok(prev && prev.chapters === 500 && prev.leaves === 5000, 'found 500 chapters and 5,000 sections');
 await p.screenshot({ path: 'shots410/phone-20k-check.png' });
 const t1 = Date.now(); await p.click('[data-action=imp-apply]'); let shot = false;
 for (let k = 0; ; k++) { const s = await p.evaluate(() => document.querySelector('#impSave')?.textContent.replace(/\s+/g, ' ').trim() || ''); peak = Math.max(peak, await heap()); if (!s) break; if (k % 20 === 0) console.log('  ', Math.round((Date.now() - t1) / 1000) + 's', s.slice(0, 140), '| heap', await heap(), 'MB'); if (!shot && /left/.test(s)) { shot = true; await p.screenshot({ path: 'shots410/phone-20k-saving.png' }); } if (Date.now() - t1 > 60 * 60e3) { console.log('timed out'); break; } await p.waitForTimeout(1000); }
 const saveS = Math.round((Date.now() - t1) / 1000);
 const res = await p.evaluate(() => { const ids = leafIds; let w = 0; ids.forEach(i => { if (notesOf(i)) w++; }); return { ids: ids.length, withNotes: w }; });
 console.log('saved notes in', saveS, 's;', JSON.stringify(res), 'peak heap', peak, 'MB');
 ok(res.withNotes >= 4990, 'notes saved for ' + res.withNotes + ' topics');
 const time = async (label, fn) => { const t = Date.now(); await p.evaluate(fn); const ms = Date.now() - t; console.log('  ' + label.padEnd(30), String(ms).padStart(6), 'ms'); return ms; };
 const sid = await p.evaluate(() => DSUBJ[0].id); let worst = 0;
 for (const v of ['today', 'exams', 'subject:' + sid, 'topic:' + await p.evaluate(() => leafIds[2500]), 'practice', 'progress', 'listen', 'calendar', 'settings', 'summary:' + sid, 'map:' + sid]) worst = Math.max(worst, await time('open ' + v.split(':')[0], `go(${JSON.stringify(v)})`));
 worst = Math.max(worst, await time('search', `openSearch(); drawSearch('risk')`)); await p.evaluate(() => closeSheet(true));
 await time('backup', `exportParts().then(ps => window.__n = ps.reduce((a, s) => a + s.length, 0))`); console.log('   backup', await p.evaluate(() => (__n / 1e6).toFixed(0)), 'MB');
 ok(worst < 1500, 'every screen opens in under 1.5 s on this machine (worst ' + worst + ' ms)');
 console.log('localStorage', await p.evaluate(() => (JSON.stringify(localStorage).length / 1e6).toFixed(2)), 'MB; heap now', await heap(), 'MB');
 console.log(errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
