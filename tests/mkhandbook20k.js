// makes fixtures/handbook-20000.pdf: a 20,000-page handbook, 500 chapters x 10 sections, no bookmarks or contents page
// Built in 10 parts of 50 chapters (2,000 pages) and joined with pypdf: one 20,000-page document crashes the browser
// renderer on an 8 GB-free laptop. The text is the same seeded sequence as before; only the footer page number restarts per part.
// node mkhandbook20k.js            (needs a Python with pypdf: PYTHON=... or C:/Users/jjsch/.qgis-venv/Scripts/python.exe)
const { chromium } = require('playwright'); const fs = require('fs'); const { spawnSync } = require('child_process');
const words = 'assessment practice client support evidence theory framework community wellbeing ethics policy risk planning review outcome development learning family relationship strengths resilience intervention context analysis research method approach responsibility service model principle'.split(' ');
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sent = () => { const n = 14 + Math.floor(rnd() * 12); let s = []; for (let i = 0; i < n; i++) s.push(words[Math.floor(rnd() * words.length)]); s[0] = s[0][0].toUpperCase() + s[0].slice(1); return s.join(' ') + '.'; };
const para = () => '<p>' + Array.from({ length: 5 }, sent).join(' ') + '</p>';
const STYLE = `<style>@page{size:A4;margin:20mm}body{font:11pt/1.5 Georgia,serif;color:#111}h1{font:700 24pt/1.2 Helvetica,Arial,sans-serif;margin:0 0 14pt}h2{font:700 15pt/1.25 Helvetica,Arial,sans-serif;margin:16pt 0 8pt}p{margin:0 0 8pt;text-align:justify}.b{break-after:page}.pg{height:240mm;overflow:hidden}</style>`;
const PER_PART = 50, OUT = __dirname + '/fixtures/handbook-20000.pdf', PARTS = __dirname + '/fixtures/_parts20k';
const parts = []; let html = STYLE, page = 0;
for (let c = 1; c <= 500; c++) {
  for (let s = 0; s <= 9; s++) {
    // each section is 4 pages
    for (let k = 0; k < 4; k++) { html += `<div class="pg">` + (k === 0 ? (s === 0 ? `<h1>Chapter ${c} ${words[c % words.length][0].toUpperCase() + words[c % words.length].slice(1)} in practice</h1>` : '') + `<h2>${c}.${s + 1} ${words[(c * 3 + s) % words.length][0].toUpperCase() + words[(c * 3 + s) % words.length].slice(1)} and ${words[(c + s * 7) % words.length]}</h2>` : '') + para().repeat(7) + `</div><div class="b"></div>`; page++; }
  }
  if (c % PER_PART === 0) { parts.push(html); html = STYLE; }
}
(async () => {
  fs.mkdirSync(PARTS, { recursive: true }); const files = [];
  for (let i = 0; i < parts.length; i++) {
    const b = await chromium.launch({ args: ['--js-flags=--max-old-space-size=4096'] }); const p = await b.newPage();
    await p.setContent(parts[i], { timeout: 0 }); const f = `${PARTS}/part-${String(i + 1).padStart(2, '0')}.pdf`;
    await p.pdf({ timeout: 0, path: f, format: 'A4', displayHeaderFooter: true, headerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">Social Work Practice Handbook</div>', footerTemplate: '<div style="font-size:9px;width:100%;text-align:center"><span class="pageNumber"></span></div>', margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } });
    await b.close(); files.push(f); console.log(`part ${i + 1}/${parts.length} done`);
  }
  const py = process.env.PYTHON || 'C:/Users/jjsch/.qgis-venv/Scripts/python.exe';
  const r = spawnSync(py, ['-c', 'import sys,pypdf\nw=pypdf.PdfWriter()\nfor f in sys.argv[2:]: w.append(f)\nw.write(sys.argv[1])\nprint(len(w.pages))', OUT, ...files], { encoding: 'utf8' });
  if (r.status !== 0) { console.log('merge failed: ' + (r.stderr || r.error)); process.exit(1); }
  fs.rmSync(PARTS, { recursive: true, force: true });
  console.log('pages', page, 'merged', r.stdout.trim());
})();
