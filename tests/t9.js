// t9: real PowerPoint + PDF import → notes → summary, flashcards, podcast, search, explain
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 390, height: 844 } });
 p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
 const ok = (c, m) => console.log(c ? 'PASS' : 'FAIL', m);
 for (const [file, needle] of [['sumtest/memory.pptx', 'Phonological loop'], ['sumtest/methods.pdf', 'Confounding variables']]) {
  await p.evaluate(() => go('import:psy')); await p.waitForTimeout(500);
  await p.setInputFiles('#imp-file', file); await p.waitForSelector('[data-action=imp-apply]', { timeout: 15000 });
  const before = await p.evaluate(() => Object.keys(nodes).length);
  await p.click('[data-action=imp-apply]'); await p.waitForTimeout(2500);
  const r = await p.evaluate((needle) => {
   const ids = leafIds.filter(id => (notesOf(id) || '').includes(needle));
   const id = ids[0]; if (!id) return { none: true, leaves: leafIds.length };
   const sm = summaryOf(id); const cards = autoCardsFor(id); const ep = buildEpisode('x', 'y', [id]);
   const all = sm.sections.flatMap(s => s.items.map(i => i.t)).join(' ');
   return { id, title: nodes[id].title, inSum: all.includes(needle) || sm.defs.some(d => d.term.includes(needle)), cov: sm.coverage, defCards: cards.filter(c => c.k.includes(':def:')).length, ep: ep.segs.some(s => s.text.includes(needle.split(' ')[0])), notes: notesOf(id).slice(0, 120), explain: explainFor(id).simple };
  }, needle);
  console.log(file, JSON.stringify(r));
  ok(!r.none, 'notes saved for imported topic'); if (r.none) continue;
  ok(r.inSum, 'summary contains ' + needle); ok(r.cov.sectionsCovered === r.cov.sections && r.cov.termsCovered === r.cov.terms, 'full section and term coverage');
  ok(r.defCards > 0, 'definition flashcards made'); ok(r.ep, 'podcast reads it');
  await p.evaluate(id => go('topic:' + id), r.id); await p.waitForTimeout(600);
  ok(await p.locator('.cov').count() > 0, 'coverage line shown on topic page');
  const hits = await p.evaluate(async (w) => { const ms = await searchIndex(); return ms ? ms.search(w).length : -1; }, needle.split(' ')[0].toLowerCase());
  console.log('search hits', hits);
 }
 console.log('ERRORS', errs); await b.close(); })();
