// t11: sync between two devices (needs Nostr relays reachable)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const ok = (c, m) => console.log(c ? 'PASS' : 'FAIL', m);
 const FAKE = `var Trystero={selfId:Math.random().toString(36).slice(2),joinRoom(cfg,id){const me=Trystero.selfId,bc=new BroadcastChannel(cfg.appId+cfg.password+id),acts={},room={onPeerJoin:null,onPeerLeave:null,leave(){bc.postMessage({t:'bye',f:me});bc.close();},makeAction(n){const a={onMessage:null,send(d,o){bc.postMessage({t:'msg',n,d,f:me,to:o&&o.target});return Promise.resolve();}};acts[n]=a;return a;}};const peers=new Set();bc.onmessage=e=>{const m=e.data;if(m.f===me)return;if(m.t==='hi'||m.t==='hi2'){if(!peers.has(m.f)){peers.add(m.f);if(m.t==='hi')bc.postMessage({t:'hi2',f:me});setTimeout(()=>room.onPeerJoin&&room.onPeerJoin(m.f),10);}}else if(m.t==='msg'&&(!m.to||m.to===me)){acts[m.n]&&acts[m.n].onMessage&&acts[m.n].onMessage(m.d,{peerId:m.f});}else if(m.t==='bye'){peers.delete(m.f);room.onPeerLeave&&room.onPeerLeave(m.f);}};setTimeout(()=>bc.postMessage({t:'hi',f:me}),50);return room;}};`;
 const C = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: { width: 390, height: 844 } }); await C.route('**/trystero.js', r => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
 const mk = async () => { const c = C; const p = await c.newPage(); p.on('pageerror', e => console.log('PE', e.message)); await p.goto(`http://localhost:${process.env.SD_PORT||8765}/`); await p.waitForTimeout(1000); await p.evaluate(() => go('settings')); await p.waitForTimeout(400); return p; };
 const A = await mk(), B = await mk();
 await A.evaluate(() => { S.settings.maxPerDay = 5; save(); });
 await A.click('[data-action=sync-new]'); await A.waitForTimeout(1500);
 const code = await A.evaluate(() => SY.code); console.log('code', code, await A.evaluate(() => SY.state));
 await B.click('[data-action=sync-enter]'); await B.fill('#sync-code', code.toUpperCase().replace(/-/g, ' ')); await B.click('[data-action=sync-join]');
 let conn = false; for (let i = 0; i < 30 && !conn; i++) { await A.waitForTimeout(1000); conn = await A.evaluate(() => SY.state === 'connected') && await B.evaluate(() => SY.state === 'connected'); }
 ok(conn, 'devices connected');
 if (conn) { await A.click('[data-action=sync-send]'); await B.waitForSelector('[data-action=sync-apply]', { timeout: 20000 }).catch(() => { }); ok(await B.locator('[data-action=sync-apply]').count() === 1, 'data arrived'); await B.click('[data-action=sync-apply]'); await B.waitForTimeout(800); ok(await B.evaluate(() => S.settings.maxPerDay) === 5, 'settings copied'); }
 await b.close(); })();
