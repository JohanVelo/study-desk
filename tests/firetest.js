// firetest.js [id-prefix ...]: run planted faults from baseline/plants.json, one at a time, and check each produces
// exactly its expected set of FAIL check-names and exit code. Results in reg/firetest.json (the observed set is the proof).
// SD_PORT=8866 SD_PORT2=8867 node firetest.js tap- contrast-
const { spawnSync } = require('child_process'); const fs = require('fs');
const { port, failNames, reporter } = require('./sdlib');
port(); port('SD_PORT2');
// bash: on PATH in a Git Bash shell; a process started elsewhere (e.g. detached from PowerShell) needs Git's own copy
const BASH = spawnSync('bash', ['-c', 'true']).error ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const R = reporter(), want = process.argv.slice(2), plants = JSON.parse(fs.readFileSync(__dirname + '/baseline/plants.json', 'utf8')).plants;
const todo = plants.filter(p => !want.length || want.some(w => p.id.startsWith(w)));
const results = [];
for (const pl of todo) {
  const env = { ...process.env, ...pl.env }; delete env.WRITE_BASELINE;
  if (!pl.env.TAPPROBE_LIVE) delete env.TAPPROBE_LIVE; if (!pl.env.T7_PLANT) delete env.T7_PLANT; if (!pl.env.PLANT) delete env.PLANT;
  const t0 = Date.now(); const r = spawnSync(BASH, ['-c', pl.cmd], { cwd: __dirname, env, encoding: 'utf8', timeout: 60 * 60e3, maxBuffer: 64e6 });
  if (r.error) R.fail('setup', `${pl.id} did not run: ${r.error.message}`);
  const out = (r.stdout || '') + (r.stderr || ''), got = failNames(out), exp = [...pl.expect].sort();
  fs.writeFileSync(`${__dirname}/reg/fire-${pl.id}.out`, out);
  const opt = pl.optional || [], core = got.filter(g => !opt.includes(g) || exp.includes(g));
  const same = core.join() === exp.join() && r.status === pl.exit, targetSeen = !pl.target || got.includes(pl.target);
  results.push({ id: pl.id, exit: r.status, expectExit: pl.exit, got, expect: exp, ok: same, secs: Math.round((Date.now() - t0) / 1000) });
  R.ok(same && targetSeen, 'fire', `${pl.id}: FAIL set {${got.join(', ')}} exit ${r.status}; expected {${exp.join(', ')}}${opt.length ? ' (+ optional ' + opt.join(', ') + ')' : ''} exit ${pl.exit} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
fs.writeFileSync(__dirname + '/reg/firetest.json', JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
R.end();
