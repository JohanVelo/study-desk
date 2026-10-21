// v25: adversarial-review fixes (group saving, privacy, offline account, leader week, RSVP, live quiz, meeting keys) + satellite maps
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
const FAKE=fs.readFileSync(__dirname+'/../app/fake-supabase.js','utf8').replace('const run = () => {','const run = () => { if (window.__offline) return bad("TypeError: Failed to fetch");');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';const out=__dirname+'/s25';fs.mkdirSync(out,{recursive:true});
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const fixHtml=async ctx=>ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
const st={done:{1:new Date(Date.now()-864e5).toISOString()},notes:{},saved:{},settings:{welcomed:true,onboarded:true,intro:false,hsTip:true,allOpen:true}};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark']]){
const tag=`${w}-${cs}`;
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs,hasTouch:w<800,reducedMotion:'reduce'});await fixHtml(ctx);
await ctx.addInitScript(s=>localStorage.setItem('lamp-state-v1',JSON.stringify(s)),st);
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{const S=window.__mock.store;const a=new Date(Date.now()-2*864e5).toISOString(),old=new Date(Date.now()-10*864e5);
  S.set('group/meta',{week:'w7',name:'Thursday group',auto:true,at:old.toISOString()});
  S.set('gm/u_me',{joined:'2026-01-01'});
  S.set('gm/u_a',{name:'Sarah',joined:'2026-01-02'});
  S.set('gm/u_b',{joined:'2026-01-03',pr:{p2:{t:'A hard week at work.',at:a,anon:true}},rp:{'pr:u_b:p2':{r1:{t:'Thank you all, it helps.',at:a}}}});
  S.set('gm/u_c',null)});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(base);await p.waitForTimeout(2500);
// broken member doc must not take the group down
await p.evaluate(()=>setView('group'));await p.waitForTimeout(1200);
ok(await p.$('.gtabs')!==null,tag+' group opens with a broken member doc');
// anonymous request: the owner's own reply stays anonymous
await p.evaluate(()=>{G.sub='prayer';render()});await p.waitForTimeout(900);
const pr=await p.evaluate(()=>[...document.querySelectorAll('.prcard')].map(e=>e.textContent).join(' | '));
ok(/A hard week/.test(pr)&&/Thank you all/.test(pr),tag+' anonymous request and its reply show');
ok(!/Pieter/.test(pr),tag+' owner of an anonymous request is not named on their reply: '+pr.slice(0,160));
await p.$eval('.prcard',e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:`${out}/anon-${tag}.png`});
// greeting escapes names
ok(await p.evaluate(()=>{const f=ME.first;ME.first='<b>x</b>';const g=greeting();ME.first=f;return g.includes('&lt;b&gt;')&&!g.includes('<b>')}),tag+' greeting escapes the name');
// RSVP is keyed by the meeting week
await p.evaluate(()=>{G.sub='study';render()});await p.waitForTimeout(800);
await p.click('[data-rsvp="yes"]');await p.waitForTimeout(400);
const rs=await p.evaluate(()=>JSON.stringify(window.__mock.store.get('gm/u_me').rsvp||{}));
ok(/@\d{4}-\d\d-\d\d/.test(rs),tag+' rsvp keyed by week and Monday date '+rs);
ok(await p.$eval('[data-rsvp="yes"]',e=>e.getAttribute('aria-pressed'))==='true',tag+' rsvp shows as coming');
// leader save keeps the weekly rollover day
const before=await p.evaluate(()=>({wk:curWk(),day:new Date(G.meta.at).getDay()}));
await p.evaluate(()=>openLeader());await p.waitForTimeout(600);
await p.fill('#ldName','Thursday group (new name)');await p.click('#ldSave');await p.waitForTimeout(600);
const after=await p.evaluate(()=>({wk:curWk(),day:new Date(G.meta.at).getDay(),name:G.meta.name}));
ok(after.wk===before.wk&&after.day===before.day&&/new name/.test(after.name),tag+` leader save keeps week ${before.wk}→${after.wk} and day ${before.day}→${after.day}`);
// group writes survive failures and reloads
const r1=await p.evaluate(async()=>{const real=G.ref;let n=0;G.ref={update:async()=>{n++;throw {code:'unavailable'}},get:async()=>{throw {code:'unavailable'}},set:real.set};
  gWrite({hello:{x:1}},1);await new Promise(r=>setTimeout(r,300));const kept=localStorage.getItem('lamp-gq-v1');const ro=!!G.ro;G.ref=real;await gFlush();
  return {n,kept,ro,saved:window.__mock.store.get('gm/u_me').hello,left:localStorage.getItem('lamp-gq-v1')}});
ok(r1.n>=1&&/hello/.test(r1.kept||''),tag+' a failed group write is kept on the phone');
ok(!r1.ro,tag+' a failed write does not lock the group');
ok(r1.saved&&r1.saved.x===1&&!r1.left,tag+' it sends once the signal is back');
// leaving the app sends at once
const r2=await p.evaluate(async()=>{gWrite({bye:{y:2}});Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setTimeout(r,80));delete document.visibilityState;return window.__mock.store.get('gm/u_me').bye});
ok(r2&&r2.y===2,tag+' answers send immediately when the app is hidden');
// meeting mode arrows work wherever focus is
await p.evaluate(()=>openMeet());await p.waitForTimeout(600);
await p.evaluate(()=>document.body.focus());await p.evaluate(()=>document.activeElement?.blur());
await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
ok(await p.evaluate(()=>M.i)===1,tag+' arrow key moves the meeting slide');
await p.evaluate(()=>closeMeet());await p.waitForTimeout(400);
await p.keyboard.press('ArrowRight');ok(!(await p.$('#meet')),tag+' meeting keys stop after closing');
// live quiz: host left, players can leave
await p.evaluate(()=>{const qs=liveQs();window.__mock.store.set('live/game',{id:'g1',host:'u_a',at:Date.now(),ph:'q',i:0,qs,qAt:Date.now()-30000,wk:'w7'});window.__mock.store.set('lv/u_me',{g:'g1',a:{},at:Date.now()});window.__mock.fire()});
await p.waitForTimeout(300);
await p.evaluate(()=>{liveShownAt['g1:0']=Date.now()-30000;G.sub='games';startGame('live')});await p.waitForTimeout(800);
ok(await p.$('#lvLeave')!==null,tag+' players can leave a quiz whose host has gone quiet');
await p.$eval('.qcard',e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:`${out}/quiz-left-${tag}.png`});
await p.click('#lvLeave');await p.waitForTimeout(400);ok(await p.$('.qcard.live')===null,tag+' leave closes the quiz');
// satellite maps
await p.evaluate(()=>setView('learn'));await p.waitForTimeout(900);
const sat=await p.evaluate(async()=>{const r={};for(const n of ['holy','abraham','exodus','paul']){const im=new Image();r[n]=await new Promise(res=>{im.onload=()=>res(im.naturalWidth);im.onerror=()=>res(0);im.src='sat/'+n+'.webp'})}return r});
ok(Object.values(sat).every(v=>v>300),tag+' all four satellite images load '+JSON.stringify(sat));
ok(errs.length===0,tag+' no page errors '+errs.join('|'));
await ctx.close();
}
// installed app: signed in, opened with no signal → straight in, outbox kept, joins the group when back
{
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
await ctx.route('**/supabase.js',r=>r.fulfill({body:FAKE,contentType:'application/javascript'}));
await ctx.addInitScript(s=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
  localStorage.setItem('fake-sb',JSON.stringify({users:{u1:{email:'jj@example.com',password:'x'}},members:{u1:{user_id:'u1',name:'JJ',color:'#3B5BBA',role:'leader'}},docs:{'gm/u1':{joined:'2026-01-01'}},config:{join_code:'GRACE7'}}));
  sessionStorage.setItem('fake-session',JSON.stringify({user:{id:'u1',email:'jj@example.com'}}));
  localStorage.setItem('lamp-known','1');localStorage.setItem('lamp-state-v1',JSON.stringify(s))},st);
await ctx.addInitScript(()=>{window.__offline=true});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8767/');await p.waitForTimeout(3000);
ok(await p.evaluate(()=>!document.querySelector('#gate:not(.out)')&&window.LAMP_ACCOUNT===true),'app: signed in + offline opens straight into the app');
await p.evaluate(()=>queue({settings:{offlineTest:1}}));await p.evaluate(()=>connect());await p.waitForTimeout(300);
ok(await p.evaluate(()=>outboxCount()>0),'app: changes made offline stay in the outbox');
await p.evaluate(()=>setView('group'));await p.waitForTimeout(800);
ok(/offline/i.test(await p.textContent('.gnote')),'app: group note says offline, not "no account"');
await p.screenshot({path:`${out}/app-offline.png`});
await p.evaluate(()=>{window.__offline=false;dispatchEvent(new Event('online'))});await p.waitForTimeout(3000);
ok(await p.evaluate(()=>!document.documentElement.classList.contains('lamp-local')&&G.on===true),'app: joins the group when the signal is back');
ok(await p.evaluate(()=>outboxCount()===0),'app: offline changes sent');
ok(errs.length===0,'app: no page errors '+errs.join('|'));
await ctx.close();
}
await b.close();console.log(log.join('\n'));console.log(fails?`FAILED ${fails}`:'ALL PASS');process.exit(fails?1:0)})();
