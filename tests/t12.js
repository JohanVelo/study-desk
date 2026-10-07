// t12: when the natural voice can't load, the podcast keeps playing with the device voice
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block' });
 await ctx.addInitScript(() => { const f = { speaking: false, getVoices: () => [{ name: 'Test', lang: 'en-GB' }], speak(u) { setTimeout(() => u.onend && u.onend(), 300); }, cancel() { }, pause() { }, resume() { } }; Object.defineProperty(window, 'speechSynthesis', { value: f, configurable: true }); window.SpeechSynthesisUtterance = function (t) { this.text = t; }; });
 await ctx.route('**/voice-worker.js', r => r.fulfill({ contentType: 'text/javascript', body: 'self.onmessage=e=>{if(e.data.op==="load"){self.postMessage({id:e.data.id,ok:true});return;}self.postMessage({id:e.data.id,ok:false,err:"no model"});};' }));
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
 await p.evaluate(() => go('settings')); await p.waitForTimeout(500);
 await p.click('[data-action=nv-pick][data-v="en_GB-alba-medium"]'); await p.waitForTimeout(1500);
 const ok = (c, m) => console.log(c ? 'PASS' : 'FAIL', m);
 ok(await p.evaluate(() => NV.on()), 'voice switched on');
 await p.evaluate(() => { const ep = episodeFor('topic', leafIds[0]); playEpisode(ep); }); await p.waitForTimeout(3000);
 const st = await p.evaluate(() => ({ failed: NV.failed, playing: P_.playing, i: P_.i }));
 console.log(JSON.stringify(st));
 ok(st.failed && st.playing && st.i >= 1, 'falls back to the device voice and keeps playing');
 console.log('ERRORS', errs.filter(e => !/Failed to fetch/.test(e))); await b.close(); })();
