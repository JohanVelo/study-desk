// t21x3.js: run t21 (20,000-page library) 3 times and take each screen's median open time.
// WRITE_BASELINE=1 stores the medians in baseline/t21.json; otherwise each screen must open within
// baseline median x 1.1 + 20 ms, and no screen may newly pass 700 ms (the repo's budget; any > 700 ms is listed for JJ).
// Needs fixtures/handbook-20000.pdf (node mkhandbook20k.js, git-ignored). SD_PORT=8866 node t21x3.js
const { spawnSync } = require('child_process'); const fs = require('fs');
const { port, reporter, readJSON } = require('./sdlib');
port(); const R = reporter(), BASE = __dirname + '/baseline/t21.json';
if (!fs.existsSync(__dirname + '/fixtures/handbook-20000.pdf')) { R.fail('setup', 'fixtures/handbook-20000.pdf missing (node mkhandbook20k.js)'); R.end(); process.exit(1); }
const runs = [];
for (let k = 1; k <= 3; k++) {
  const r = spawnSync('node', ['t21.js'], { cwd: __dirname, env: process.env, encoding: 'utf8', timeout: 120 * 60e3, maxBuffer: 64e6 });
  const out = (r.stdout || '') + (r.stderr || ''); fs.writeFileSync(`${__dirname}/reg/t21-${k}.out`, out);
  const times = {}; for (const m of out.matchAll(/^ {2}(open \w+|search)\s+(\d+) ms/gm)) times[m[1]] = +m[2];
  console.log(`run ${k}: exit ${r.status}, ${Object.keys(times).length} screens ${JSON.stringify(times)}`);
  if (r.status !== 0 || !Object.keys(times).length) R.fail('setup', `t21 run ${k} exit ${r.status} (see reg/t21-${k}.out)`);
  runs.push(times);
}
const med = {}; for (const s of Object.keys(runs[0] || {})) { const v = runs.map(x => x[s]).filter(n => n >= 0).sort((a, b) => a - b); med[s] = v[Math.floor(v.length / 2)]; }
fs.writeFileSync(__dirname + '/reg/t21x3.json', JSON.stringify({ runs, median: med }, null, 1));
for (const [s, ms] of Object.entries(med)) if (ms > 700) console.log(`  over 700 ms: ${s} ${ms} ms`);
if (process.env.WRITE_BASELINE) { fs.mkdirSync(__dirname + '/baseline', { recursive: true }); fs.writeFileSync(BASE, JSON.stringify({ written: new Date().toISOString(), median: med, runs }, null, 1)); console.log('wrote ' + BASE); }
else {
  const base = readJSON(BASE, null); if (!base) R.fail('setup', 'no baseline/t21.json');
  else for (const [s, ms] of Object.entries(med)) { const b = base.median[s]; if (b == null) { R.fail('setup', `${s} not in baseline`); continue; }
    R.ok(ms <= b * 1.1 + 20, 't21-slower', `${s}: median ${ms} ms vs baseline ${b} ms (limit ${Math.round(b * 1.1 + 20)})`);
    if (ms > 700 && b <= 700) R.fail('t21-700', `${s} newly over 700 ms (${ms} ms, baseline ${b} ms)`); }
}
R.end();
