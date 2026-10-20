// streak rules, best streak, offline outbox, busy flag for safe updates
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const wrap=async ctx=>ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
// ---- streak maths (local only)
for(const tz of ['Africa/Johannesburg','Europe/London']){
  const ctx=await b.newContext({timezoneId:tz});await wrap(ctx);const p=await ctx.newPage();
  await p.clock.install({time:new Date('2026-10-28T10:00:00')});
  await p.goto(base);await p.waitForTimeout(1500);
  const run=async(days,qt=[])=>p.evaluate(([days,qt])=>{state.done={};days.forEach((d,i)=>state.done[i+1]=new Date(d+'T09:00:00').toISOString());state.qt={};qt.forEach(k=>{const [y,m,d]=k.split('-').map(Number);state.qt[`${y}-${m}-${d}`]={at:'x'}});return [streak(),bestStreak()]},[days,qt]);
  const R=(a,b)=>{const o=[];for(let d=new Date(a+'T12:00:00');d<=new Date(b+'T12:00:00');d.setDate(d.getDate()+1))o.push(d.toISOString().slice(0,10));return o};
  let r=await run(R('2026-10-22','2026-10-28'));ok(r[0]===7&&r[1]===7,tz+' 7 days in a row = 7 '+r);
  r=await run([...R('2026-10-22','2026-10-25'),...R('2026-10-27','2026-10-28')]);ok(r[0]===6&&r[1]>=6,tz+' one rest day keeps the streak '+r);
  r=await run([...R('2026-10-20','2026-10-24'),...R('2026-10-27','2026-10-28')]);ok(r[0]===2,tz+' two missed days reset '+r);
  r=await run(['2026-10-27'],['2026-10-28']);ok(r[0]===2,tz+' quiet time counts '+r);
  r=await run(R('2026-10-27','2026-10-27'));ok(r[0]===1,tz+' not read today yet still shows yesterday '+r);
  r=await run([...R('2026-09-01','2026-09-10'),'2026-10-28']);ok(r[0]===1&&r[1]===10,tz+' best streak from an old run '+r);
  r=await run([...R('2026-10-08','2026-10-14'),...R('2026-10-16','2026-10-21'),...R('2026-10-23','2026-10-28')]);ok(r[1]>=r[0]&&r[0]===19,tz+' best never below current '+r);
  await ctx.close()}
// ---- offline outbox
{const ctx=await b.newContext();await wrap(ctx);
 await ctx.addInitScript(MOCK);
 await ctx.addInitScript(()=>{const S=window.__mock.store;try{JSON.parse(localStorage.__store||'[]').forEach(([k,v])=>S.set(k,v))}catch(e){}
   const keep=()=>localStorage.__store=JSON.stringify([...S]);const off=()=>localStorage.__off==='1';
   const orig=window.claude.use;window.claude.use=async n=>{const x=await orig(n);if(n!=='db')return x;
     const wd=d=>({...d,update:async v=>{if(off())throw{code:'network',message:'fetch failed'};await d.update(v);keep()},set:async v=>{if(off())throw{code:'network'};await d.set(v);keep()},get:async()=>{if(off())throw{code:'network'};return d.get()}});
     return {...x,doc:p=>wd(x.doc(p)),collection:c=>{const cr=x.collection(c);return {...cr,doc:id=>wd(cr.doc(id))}}}}});
 let p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(base);await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>!!docRef),'outbox: connected');
 await p.evaluate(()=>{localStorage.__off='1';const t=new Date().toISOString();state.done[5]=t;queue({done:{5:t}});state.notes[5]={a:['offline note'],at:t};queue({notes:{5:state.notes[5]}})});
 await p.waitForTimeout(1500);
 let st=await p.evaluate(()=>{const d=window.__mock.store.get('data/users/u_me/progress');return [!!d?.done?.[5],!!localStorage.getItem('lamp-outbox-v1')]});
 ok(!st[0]&&st[1],'outbox: offline change kept on the phone, not on server '+st);
 await p.evaluate(()=>openSettings());await p.waitForTimeout(400);
 const note=await p.textContent('[data-syncnote]');ok(/waiting for signal/.test(note),'outbox: settings says waiting: '+note);
 await p.close();
 p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(2000);
 await p.evaluate(()=>{localStorage.__off='0';dispatchEvent(new Event('online'))});await p.waitForTimeout(2000);
 st=await p.evaluate(()=>{const d=window.__mock.store.get('data/users/u_me/progress');return [!!d?.done?.[5],d?.notes?.[5]?.a?.[0],localStorage.getItem('lamp-outbox-v1')]});
 ok(st[0]&&st[1]==='offline note'&&!st[2],'outbox: sent after reopening and reconnecting '+JSON.stringify(st));
 await p.evaluate(()=>openSettings());await p.waitForTimeout(400);ok(/All changes saved/.test(await p.textContent('[data-syncnote]')),'outbox: settings says all saved');
 await p.evaluate(()=>document.querySelector('#scrim')?.remove());
 // retry without reopening
 await p.evaluate(()=>{localStorage.__off='1';const t=new Date().toISOString();state.done[6]=t;queue({done:{6:t}})});await p.waitForTimeout(1500);
 await p.evaluate(()=>{localStorage.__off='0'});await p.waitForTimeout(6500);
 ok(await p.evaluate(()=>!!window.__mock.store.get('data/users/u_me/progress')?.done?.[6]),'outbox: retries by itself');
 // busy flag
 ok(await p.evaluate(()=>LAMP_BUSY()===false),'busy: idle on Today');
 await p.evaluate(()=>openQT());await p.waitForTimeout(800);ok(await p.evaluate(()=>LAMP_BUSY()===true),'busy: quiet time blocks updates');
 ok(!errs.length,'no errors '+errs.join('|'));await ctx.close()}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
