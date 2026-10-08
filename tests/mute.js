// mute.js: every test browser starts with --mute-audio, so podcast and voice tests never play out of the laptop speakers.
// Loaded by sdlib.js and, for the older tests, through NODE_OPTIONS in runall.sh. Audio still plays inside the page (events fire).
const pw = require('playwright'); const launch = pw.chromium.launch.bind(pw.chromium);
if (!pw.chromium.__muted) { pw.chromium.launch = (o = {}) => launch({ ...o, args: [...(o.args || []), '--mute-audio'] }); pw.chromium.__muted = true; }
