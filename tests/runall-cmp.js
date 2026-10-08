// runall-cmp.js <tests...>: read reg/<t>.out + reg/<t>.exit, write reg/runall.json, and compare with baseline/runall.json.
// Worse = exit code turned non-zero, timed out, fewer PASS lines, more FAIL lines, summary line gone, or an ERRORS entry not in the baseline.
// t8 (offline OCR cache) and t11 (public relays) vary run to run: compared and printed, never counted (report-only).
const fs = require('fs'); const { reporter, readJSON } = require('./sdlib');
const REPORT_ONLY = new Set(['t8', 't11']), BASE = __dirname + '/baseline/runall.json', R = reporter();
const norm = e => e.replace(/\d+(\.\d+)?/g, '#').replace(/\s+/g, ' ').trim().slice(0, 160);
const rec = {};
for (const t of process.argv.slice(2)) {
  const out = fs.existsSync(`${__dirname}/reg/${t}.out`) ? fs.readFileSync(`${__dirname}/reg/${t}.out`, 'utf8') : '';
  const lines = out.split(/\r?\n/).filter(Boolean), exit = +(fs.readFileSync(`${__dirname}/reg/${t}.exit`, 'utf8').trim() || -1);
  const errLine = lines.find(l => l.startsWith('ERRORS ')) || '';
  rec[t] = { exit, timeout: exit === 124, pass: lines.filter(l => /^PASS/.test(l)).length, fail: lines.filter(l => /^FAIL/.test(l)).length,
    summary: /^(ALL PASS|\d+ FAILED)$/.test(lines[lines.length - 1] || ''), errors: [...new Set(errLine.slice(7).split(' | ').filter(Boolean).map(norm))].sort() };
}
fs.writeFileSync(__dirname + '/reg/runall.json', JSON.stringify(rec, null, 1));
if (process.env.WRITE_BASELINE) {
  const old = readJSON(BASE, {}); const merged = { ...(old.tests || {}), ...rec };
  fs.mkdirSync(__dirname + '/baseline', { recursive: true }); fs.writeFileSync(BASE, JSON.stringify({ written: new Date().toISOString(), tests: merged }, null, 1));
  console.log(`baseline: ${Object.keys(rec).length} test(s) written to ${BASE}`); process.exit(0);
}
const base = readJSON(BASE, null);
if (!base) { R.fail('setup', 'no baseline/runall.json (run once with WRITE_BASELINE=1 on the reference code)'); R.end(); process.exit(1); }
for (const [t, r] of Object.entries(rec)) {
  const b = base.tests[t]; if (!b) { R.fail('setup', `${t} has no baseline entry`); continue; }
  const worse = [];
  if (b.exit === 0 && r.exit !== 0) worse.push(`exit ${b.exit} -> ${r.exit}`);
  if (r.timeout && !b.timeout) worse.push('timed out');
  if (r.pass < b.pass) worse.push(`PASS ${b.pass} -> ${r.pass}`);
  if (r.fail > b.fail) worse.push(`FAIL ${b.fail} -> ${r.fail}`);
  if (b.summary && !r.summary) worse.push('summary line missing');
  const newErr = r.errors.filter(e => !b.errors.includes(e)); if (newErr.length) worse.push('new ERRORS: ' + newErr.join(' | '));
  if (!worse.length) { console.log(`  ${t}: same or better`); continue; }
  if (REPORT_ONLY.has(t)) console.log(`  ${t} (report-only): ${worse.join('; ')}`); else R.fail('worse', `${t}: ${worse.join('; ')}`);
}
R.end();
