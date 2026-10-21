// v23: reading buddy, weekly goal, shared reflection, welcome back, my prayer list, evening Examen, easy mode
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';const out=__dirname+'/s23';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const sizes=(process.env.SIZES||'390x844x light,390x844x dark,1440x900x light,1440x900x dark').split(',').map(x=>x.split('x'));
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
for(const [w,h,cs] of sizes){
const ctx=await b.newContext({viewport:{width:+w,height:+h},colorScheme:cs.trim(),hasTouch:+w<800,reducedMotion:'reduce'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
const days=[1,2,3].map(n=>ymd(new Date(Date.now()-n*864e5)));
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date(Date.now()-6*864e5).toISOString()},notes:{},saved:{},
  settings:{welcomed:false,onboarded:true,intro:false,hsTip:true,allOpen:true,exAny:true}}))});
await ctx.addInitScript(MOCK);
await ctx.addInitScript(d=>{const S=window.__mock.store;const rd={};d.forEach(k=>rd[k]=true);
  S.set('group/meta',{week:'w7',name:'Thursday group',auto:false});
  S.set('gm/u_a',{name:'Sarah',joined:'2026-01-01',rd,pd:{2:{t:'Jesus called the disciples and they left their nets straight away.',at:new Date().toISOString()}}});
  S.set('gm/u_b',{name:'Pieter',joined:'2026-01-02'})},days);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errs.push('console '+m.text())});
const tag=`${w}-${cs.trim()}`;const shot=n=>p.screenshot({path:`${out}/${n}-${tag}.png`,fullPage:true});
await p.goto(base);await p.waitForTimeout(2500);
// welcome back + weekly goal chip
ok(/No catching up needed/.test(await p.textContent('body')),tag+' welcome back after 6 days');
ok(/of 4 days this week/.test(await p.textContent('.dayhead')),tag+' weekly goal chip');
ok(await p.$('#exGo')!==null,tag+' examen card');
await shot('today');
// shared reflection
await p.click('#markDone');await p.waitForTimeout(900);
ok(await p.$('#shrRef')!==null,tag+' share reflection box');
ok(/Sarah/.test(await p.textContent('#grpRef')),tag+' sees Sarah\'s reflection');
await p.check('#shrRef');await p.fill('#q1','Peter left everything to follow.');await p.waitForTimeout(2500);
const pd=await p.evaluate(()=>{for(const [k,v] of window.__mock.store)if(/^gm\//.test(k)&&!/u_[ab]$/.test(k)&&v.pd&&v.pd[2])return v.pd[2].t});ok(/Peter left/.test(pd||''),tag+' reflection written to group '+pd);
await shot('reflect');
// buddy
await p.evaluate(()=>setView('group'));await p.waitForTimeout(1200);
await p.click('[data-bud="u_a"]');await p.waitForTimeout(600);
ok(/You and Sarah/.test(await p.textContent('#gBuddy')),tag+' buddy picked');
await p.$eval('#gBuddy',e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(300);await p.screenshot({path:`${out}/buddy-${tag}.png`});
await p.evaluate(()=>setView('today'));await p.waitForTimeout(900);
ok(/(with|Buddy:) Sarah/.test(await p.textContent('.dayhead')),tag+' buddy chip on Today');
// my prayer list
await p.evaluate(()=>{jTab="pray";setView('journal')});await p.waitForTimeout(800);
await shot('prayers-empty');
await p.fill('#plT','My sister\'s job interview');await p.click('#plF button');await p.waitForTimeout(300);
await p.fill('#plT','Rain for the farms');await p.click('#plF button');await p.waitForTimeout(300);
ok(await p.$$eval('.plc',x=>x.length)===2,tag+' two prayers');
await p.click('#plPray');await p.waitForTimeout(600);ok(/Your prayer list/.test(await p.textContent('#pn')),tag+' pray-through own list');
await shot('pray-through');
await p.click('#pnPray');await p.waitForTimeout(400);
await p.evaluate(()=>closePN());await p.waitForTimeout(500);
ok(await p.evaluate(()=>Object.values(state.pl).some(x=>x&&x.n===1)),tag+' prayed count');
await p.click('.plc:last-child [data-pla]');await p.fill('[data-plaf] input','She got the job!');await p.click('[data-plaf] button');await p.waitForTimeout(900);
ok(/She got the job/.test(await p.textContent('.pl-tl')),tag+' answered timeline');ok(await p.$$eval('.plc',x=>x.length)===1,tag+' one still open');
await shot('prayers');
// examen
await p.evaluate(()=>setView('today'));await p.waitForTimeout(800);
await p.click('#exGo');await p.waitForTimeout(500);await shot('examen');
for(let i=0;i<4;i++){await p.fill('#exA','Thing '+i);await p.click('#exN');await p.waitForTimeout(200)}
ok(/Rest well/.test(await p.textContent('#exBox')),tag+' examen finishes');await shot('examen-done');
await p.click('#exClose');await p.waitForTimeout(500);
ok(await p.evaluate(()=>state.ex[hereDay()].q3==='Thing 3'),tag+' examen saved');
ok(/Done tonight/.test(await p.textContent('#exGo')),tag+' examen done tonight');
// easy mode
await p.evaluate(()=>{setEasy(true);render()});await p.waitForTimeout(600);
ok(await p.evaluate(()=>document.documentElement.classList.contains('easy')&&state.settings.mode==='listen'&&state.settings.rate==.85),tag+' easy mode on');
await shot('easy');
await p.evaluate(()=>{setEasy(false);render()});
const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(ov,tag+' no sideways scroll');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
