// t27: maths in notes. Electrical machines notes as a PDF (equations laid out like Word/LaTeX: subscripts, powers,
// stacked fractions, roots, math-italic letters), as a Word file and as PowerPoint slides with equation-editor maths.
// Formulas must survive import as LaTeX, show as real maths (notes, summary, flashcards, search), never as loose
// letters or raw $…$, and podcasts must say them in words.
// Fixtures: node mkmath.js (machines.pdf) and node mkoffice-math.js (machines.docx, machines.pptx).
const { chromium } = require('playwright'); const fs = require('fs'); require('./mute');
const PORT = process.env.SD_PORT; if (!PORT || PORT === '8765') { console.log('FAIL setup SD_PORT not set (or 8765)'); process.exit(2); }
const F = __dirname + '/fixtures/', SH = __dirname + '/shots415/'; fs.mkdirSync(SH, { recursive: true });
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); return c; };
 for (const [dev, vp, scheme] of [['phone', { width: 390, height: 844 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark'], ['laptop', { width: 1440, height: 900 }, 'light'], ['laptop', { width: 1440, height: 900 }, 'dark']]) {
  const main = dev === 'phone' && scheme === 'light';
  const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: vp, deviceScaleFactor: dev === 'phone' ? 2 : 1, colorScheme: scheme, reducedMotion: 'reduce', isMobile: dev === 'phone', hasTouch: dev === 'phone' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const shot = n => p.screenshot({ path: `${SH}${dev}-${scheme}-${n}.png` });
  await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(1200);
  await p.evaluate(() => { localStorage.setItem('studydesk.tips', '{"topic":1,"practice":1,"settings":1}'); localStorage.setItem('studydesk.tour', '1'); });
  const imp = async (name, file) => {
    await p.evaluate(() => go('import')); await p.waitForTimeout(300); await p.fill('#imp-name', name); await p.click('[data-action=imp-new]'); await p.waitForTimeout(300);
    await p.setInputFiles('#imp-file', F + file); await p.waitForSelector('[data-action=imp-apply]', { timeout: 30000 });
    await p.click('[data-action=imp-apply]'); await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 30000 });
    return p.evaluate(nm => { const s = DSUBJ.find(s => s.name === nm); const ids = leafIds.filter(id => nodes[id].subject === s.id); return { sid: s.id, ids, notes: ids.map(id => ({ id, t: nodes[id].title, n: notesOf(id) })) }; }, name);
  };
  // ---------- A. PDF ----------
  const pdf = await imp('Electrical machines', 'machines.pdf');
  const all = pdf.notes.map(x => x.n).join('\n');
  if (main) {
    const emf = pdf.notes.find(x => /EMF equation/.test(x.t));
    ok(emf && /\$\$E_\{1\} = 4\.44 ?f N_\{1\} ?\\Phi_\{m\}\$\$/.test(emf.n), 'PDF: the EMF equation is one line of maths: ' + (emf?.n.match(/\$\$E_\{1\}[^\n]*/) || [''])[0]);
    ok(/\\frac\{E_\{1\}\}\{E_\{2\}\} = \\frac\{N_\{1\}\}\{N_\{2\}\}/.test(all), 'PDF: stacked fractions become \\frac');
    ok(/\\eta = \\frac\{P_\{\\mathrm\{out\}\}\}\{P_\{\\mathrm\{out\}\} \+ P_\{\\mathrm\{core\}\} \+ P_\{\\mathrm\{cu\}\}\} \\times 100\\%/.test(all), 'PDF: the efficiency fraction keeps its whole denominator');
    ok(/s = \\frac\{n_\{s\} - n_\{r\}\}\{n_\{s\}\}/.test(all), 'PDF: slip fraction');
    ok(/\\sqrt\{3\} ?V_\{L\} ?I_\{L\} ?\\cos ?\\varphi/.test(all), 'PDF: square root, subscripts and cos φ');
    ok(/core is \$\\Phi_\{m\}\$ and/.test(all) && /area in \$m\^\{2\}\$/.test(all), 'PDF: subscripts and powers inside sentences stay in the sentence');
    ok(!all.split('\n').some(l => /^\s*([a-z]{1,3}|\d|\d \d|[a-z] [a-z]|out core cu)\s*$/i.test(l)), 'PDF: no loose subscript lines left behind');
    ok(!/[\u{1D400}-\u{1D7FF}]/u.test(all), 'PDF: math-italic letters turned into plain letters');
    ok(!pdf.notes.some(x => /^\$|frac|=/.test(x.t)), 'PDF: no formula became a topic title: ' + pdf.notes.map(x => x.t).join(' | '));
  }
  const emfId = pdf.notes.find(x => /EMF equation/.test(x.t)).id;
  await p.evaluate(id => go('topic:' + id), emfId); await p.waitForTimeout(800);
  // open the notes card (it may be folded)
  await p.evaluate(() => { document.querySelectorAll('details').forEach(d => { if (/notes/i.test(d.querySelector('summary')?.textContent || '')) d.open = true; }); });
  await p.waitForTimeout(900);
  const view = async () => p.evaluate(() => { const v = document.querySelector('.view:last-of-type') || document.body; const txt = [...v.querySelectorAll('*')].filter(e => !e.closest('.math,textarea,script,style,svg,annotation')).map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('')).join(' '); return { math: v.querySelectorAll('.math').length, raw: v.querySelectorAll('.math-raw').length, dollars: /\$[^$\s][^$]*\$|\\frac|\\Phi|_\{/.test(txt) }; });
  let st = await view();
  if (main) ok(st.math >= 3 && !st.raw && !st.dollars, `topic page shows the formulas as maths (${st.math} formulas, ${st.raw} unreadable, raw LaTeX visible: ${st.dollars})`);
  const nb = await p.$('.math-d'); if (nb) { await nb.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); }
  await shot('topic-maths');
  if (main) { await p.addScriptTag({ content: AXE }); const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => x.id + ' ' + x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | '))); ok(!v.length, 'axe on the topic with maths: ' + (v.join('; ') || 'clean')); }
  // summary of the subject
  await p.evaluate(sid => go('summary:' + sid), pdf.sid); await p.waitForTimeout(1200);
  st = await view();
  if (main) ok(st.math >= 4 && !st.raw && !st.dollars, `summary keeps the formulas and shows them as maths (${st.math})`);
  await shot('summary-maths');
  // podcasts say maths in words
  if (main) {
    const said = await p.evaluate(id => buildEpisode('t', '', [id]).segs.map(s => s.text).join(' '), emfId);
    ok(!/[$\\{}_^]/.test(said) && /E 1 equals 4\.44 f N 1 phi m/.test(said), 'podcast says the formula in words: ' + (said.match(/E 1 equals.{0,30}/) || [''])[0]);
    const words = await p.evaluate(() => [mathWords('n_{s} = \\frac{120f}{P}'), mathWords('P = \\sqrt{3}V_{L}I_{L}\\cos\\varphi'), mathWords('P_{\\mathrm{cu}} = I^{2} R')]);
    ok(words[0] === 'n s equals 120 f over P' && /the square root of 3 V L I L cos phi/.test(words[1]) && /P cu equals I squared R/.test(words[2]), 'maths in words: ' + words.join(' / '));
  }
  // questions and flashcards made from the notes never cut a formula in half
  if (main) {
    await p.waitForFunction(() => QS.some(q => q.auto), null, { timeout: 20000 }).catch(() => { });
    const qs = await p.evaluate(ids => QS.filter(q => ids.includes(q.node)).map(q => [q.q, ...(q.o || []), q.e || ''].join(' ¦ ')), pdf.ids);
    const broken = qs.filter(t => t.split('¦').some(part => (part.match(/(?<!\\)\$/g) || []).length % 2));
    ok(!broken.length, `${qs.length} questions from these notes, none with a broken formula` + (broken[0] ? ': ' + broken[0].slice(0, 160) : ''));
  }
  // search finds a formula's topic and shows it readably
  await p.evaluate(() => go('today')); await p.waitForTimeout(300);
  await p.evaluate(() => openSearch && openSearch()); await p.waitForTimeout(300);
  const box = await p.$('#q, .srch-in input, input[type=search]');
  if (box) { await box.fill('slip'); await p.waitForTimeout(800); const t = await p.evaluate(() => document.querySelector('.sheet, .search')?.innerText || ''); if (main) ok(/slip/i.test(t) && !/\\frac|\$\$/.test(t), 'search results show no raw LaTeX'); await shot('search-maths'); await p.evaluate(() => closeSheet && closeSheet(true)); }
  // ---------- B. Word ----------
  const dx = await imp('Machines Word', 'machines.docx');
  const dall = dx.notes.map(x => x.n).join('\n');
  if (main) {
    ok(/\$E_\{1\}=4\.44fN_\{1\}\\Phi_\{m\}\$/.test(dall), 'Word: inline equation becomes $…$ in its sentence');
    ok(/\$\$n_\{s\}=\\frac\{120f\}\{P\}\$\$/.test(dall) && /\\sum_\{k=1\}\^\{n\}/.test(dall) && /\\begin\{bmatrix\}R & X/.test(dall), 'Word: fractions, sums and matrices become LaTeX');
  }
  await p.evaluate(id => go('topic:' + id), dx.ids[dx.ids.length - 1]); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('details').forEach(d => { if (/notes/i.test(d.querySelector('summary')?.textContent || '')) d.open = true; }); }); await p.waitForTimeout(900);
  st = await view(); if (main) ok(st.math >= 2 && !st.raw && !st.dollars, `Word topic shows maths (${st.math})`);
  const nb2 = await p.$('.math-d'); if (nb2) { await nb2.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); }
  await shot('word-maths');
  // ---------- C. PowerPoint ----------
  const px = await imp('Machines slides', 'machines.pptx');
  const pall = px.notes.map(x => x.n).join('\n');
  if (main) ok(/\$E_\{1\}=4\.44fN_\{1\}\\Phi_\{m\}\$/.test(pall) && /\\frac\{n_\{s\}-n_\{r\}\}\{n_\{s\}\}/.test(pall), 'PowerPoint: slide equations become LaTeX');
  await ctx.close(); }
 console.log(errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
