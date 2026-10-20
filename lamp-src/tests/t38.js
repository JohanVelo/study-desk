// first week, read-or-listen, group tabs, reader dock, How's Lamp, path order, no tracking
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';const out=__dirname+'/s22';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const wrap=ctx=>ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
const hosts=new Set();
for(const [w,cs] of [[390,'light'],[1440,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:w<800?844:900},colorScheme:cs,hasTouch:w<800,reducedMotion:'reduce'});await wrap(ctx);
ctx.on('request',r=>{try{hosts.add(new URL(r.url()).host)}catch(e){}});
const days=n=>Object.fromEntries([...Array(n)].map((_,i)=>[i+1,new Date(Date.now()-(n-i+1)*864e5).toISOString()]));
await ctx.addInitScript(MOCK);
await ctx.addInitScript(([d0])=>{if(sessionStorage.k)return;sessionStorage.k=1;localStorage.setItem('lamp-state-v1',JSON.stringify({done:d0,notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}));
  const S=window.__mock.store;S.set('group/meta',{week:'w7',name:'Thursday group'});S.set('gm/u_a',{name:'Sarah',joined:'2026-01-01',fb:{}});},[days(1)]);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const tag=`${w}-${cs}`;
await p.goto(base);await p.waitForTimeout(2500);
// first week
ok(!!await p.$('.soon')&&!await p.$('.qtcard')&&!await p.$('.feelrow'),tag+' day 1: extras wait');
await p.evaluate(()=>{state.done[2]=new Date(Date.now()-3*864e5).toISOString();render()});await p.waitForTimeout(400);
ok(!!await p.$('.qtcard')&&!await p.$('.feelrow'),tag+' after 2 readings: quiet time appears');
await p.evaluate(()=>{for(let i=3;i<=8;i++)state.done[i]=new Date(Date.now()-(10-i)*864e5).toISOString();render()});await p.waitForTimeout(400);
ok(!!await p.$('.feelrow'),tag+' after 4: feelings appear');
// How's Lamp
ok(!!await p.$('#fbCard'),tag+' how is Lamp card after a week');await p.$eval('#fbCard',e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:`${out}/fb-${tag}.png`});
await p.click('[data-fb="more"]');await p.waitForTimeout(1200);
ok(await p.evaluate(()=>window.__mock.store.get('gm/u_me')?.fb?.[fbMonth()])==='more',tag+' choice saved to the group as a total');
ok(!!await p.$('#fbT'),tag+' optional comment box');await p.screenshot({path:`${out}/fb2-${tag}.png`});
await p.click('#fbX');await p.waitForTimeout(400);await p.evaluate(()=>render());ok(!await p.$('#fbCard'),tag+' not asked again this month');
await p.evaluate(()=>openLeader());await p.waitForTimeout(500);ok(/1 answer: 1 reading more/.test(await p.textContent('.pcard')),tag+' leader sees totals');
await p.screenshot({path:`${out}/leader-${tag}.png`});await p.evaluate(()=>document.querySelector('#scrim')?.remove());
// read or listen
await p.evaluate(()=>{setSetting('mode','listen');render()});await p.waitForTimeout(300);
ok(/Listen to/.test(await p.textContent('#openListen'))&&await p.evaluate(()=>document.querySelector('#openListen').compareDocumentPosition(document.querySelector('#openReader'))&4),tag+' listen first when chosen');
await p.evaluate(()=>{setSetting('mode','read');render()});
// group tabs
await p.evaluate(()=>setView('group'));await p.waitForTimeout(1000);
ok(JSON.stringify(await p.$$eval('.gtabs [data-gt]',x=>x.map(b=>b.textContent)))==='["This week","Prayer","Play","Topics"]',tag+' four group tabs');
await p.click('.gtabs [data-gt="games"]');await p.waitForTimeout(500);ok(await p.$$eval('.gplay button',x=>x.length)===3,tag+' play has games, tests, icebreakers');
await p.click('.gplay [data-gt="test"]');await p.waitForTimeout(500);ok(await p.evaluate(()=>G.sub)==='test'&&await p.getAttribute('.gtabs [data-gt="games"]','aria-selected')==='true',tag+' test sets under Play');
await p.screenshot({path:`${out}/group-play-${tag}.png`});
// reader dock
await p.evaluate(()=>setView('today'));await p.waitForTimeout(500);await p.click('#openReader');await p.waitForTimeout(2000);
const dockVis=await p.evaluate(()=>getComputedStyle(document.querySelector('#rDock')).display!=='none');
ok(w<800?dockVis:!dockVis,tag+' reader bottom bar on phones only');
if(w<800){const r0=await p.evaluate(()=>R.p.ch);await p.click('#dNext');await p.waitForTimeout(1200);ok(await p.evaluate(()=>R.p.ch)===r0+1,tag+' next chapter from the bottom bar')}
await p.evaluate(()=>closeReader());
// path order
ok(await p.evaluate(()=>TOTAL===190&&PLAN[0].book==='MRK'&&PLAN[0].ch===1&&STAGES.map(s=>s.book).join(',')),tag+' path order '+await p.evaluate(()=>STAGES.map(s=>s.book).join(',')));
ok(await p.evaluate(()=>STAGES.map(s=>s.book).join(','))==='MRK,GEN,LUK,ACT,JHN,EXO,ROM,GEN,PSA',tag+' stages unchanged');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}
const allowed=['127.0.0.1:8765','fonts.googleapis.com','fonts.gstatic.com'];const bad=[...hosts].filter(h=>!allowed.includes(h));
ok(!bad.length,'no tracking: only own address and fonts contacted '+[...hosts].join(','));
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
