// Preload: older tests expect the old sample subjects, so serve them in place of the now-empty data.js
const pw = require('playwright'); const fs = require('fs'); const BODY = fs.readFileSync(__dirname + '/sample-data.js', 'utf8');
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => { const b = await launch(...a); const nc = b.newContext.bind(b);
  b.newContext = async (...o) => { const c = await nc({ ...(o[0] || {}), serviceWorkers: 'block' }); await c.route('**/data.js', r => r.fulfill({ contentType: 'text/javascript', body: BODY })); return c; }; return b; };
