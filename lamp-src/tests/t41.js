// v23: listen together (meeting mode), "Which verse is this?" reviews, leader sends prayer needs
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';const out=__dirname+'/s23';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const sizes=(process.env.SIZES||'390x844x light,390x844x dark,1440x900x light,1440x900x dark').split(',').map(x=>x.split('x'));
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
for(const [w,h,cs] of sizes){
const ctx=await b.newContext({viewport:{width:+w,height:+h},colorScheme:cs.trim(),hasTouch:+w<800,reducedMotion:'reduce'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
const due=ymd(new Date(Date.now()-864e5)),old=new Date(Date.now()-30*864e5).toDateString();
await ctx.addInitScript(([due,old])=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date(Date.now()-864e5).toISOString()},notes:{},saved:{
  "JHN.3.16":{ref:"John 3:16",text:"For God so loved the world that He gave His one and only Son.",m:3,md:old,s:9,d:5,r:1,l:0,lr:due,due},
  "PHP.4.6":{ref:"Philippians 4:6",text:"Be anxious for nothing, but in everything, by prayer and petition, with thanksgiving, present your requests to God.",m:3,md:old,s:12,d:5,r:1,l:0,lr:due,due}},
  settings:{welcomed:false,onboarded:true,intro:false,hsTip:true,allOpen:true}}))},[due,old]);
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{const S=window.__mock.store;const a=new Date(Date.now()-2*864e5).toISOString(),o=new Date(Date.now()-40*864e5).toISOString();
  S.set('group/meta',{week:'w7',name:'Thursday group',auto:false});
  S.set('gm/u_a',{name:'Sarah Mokoena',joined:'2026-01-01',pr:{p1:{t:'My mum has surgery on Friday.',at:a},p0:{t:'Old request',at:o}}});
  S.set('gm/u_b',{name:'Pieter',joined:'2026-01-02',pr:{p2:{t:'A hard week at work.',at:a,anon:true}}})});
await ctx.addInitScript(()=>{window.__shared=null;navigator.share=t=>{window.__shared=t.text;return Promise.resolve()};window.__said=[];speechSynthesis.speak=u=>window.__said.push(u.text)});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errs.push('console '+m.text())});
const tag=`${w}-${cs.trim()}`;const shot=n=>p.screenshot({path:`${out}/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(2500);
// reviews
await p.evaluate(()=>stepOpenAt(2));await p.waitForTimeout(400);
ok(await p.$('.rv-ref')!==null&&!/which verse/.test(await p.textContent('#rvBox')),tag+' first review is the usual kind');
await p.click('#rvShow');await p.click('[data-g="3"]');await p.waitForTimeout(300);
ok(/which verse is this/i.test(await p.textContent('#rvBox')),tag+' second review asks which verse');
ok(await p.$('#rvBox .rv-ref')===null,tag+' reference hidden first');
await p.$eval('#rvBox',e=>e.scrollIntoView({block:'center'}));await shot('rv-ref');
await p.click('#rvShow');await p.waitForTimeout(200);ok(/Philippians 4:6/.test(await p.textContent('#rvBox .rv-ref')),tag+' reference shown');
await shot('rv-ref-shown');
await p.click('[data-g="3"]');await p.waitForTimeout(300);ok(/Reviews done/.test(await p.textContent('#rvBox')),tag+' reviews done');
// leader prayer needs
await p.evaluate(()=>{setView('group');});await p.waitForTimeout(1200);
await p.evaluate(()=>openLeader());await p.waitForTimeout(600);
ok(/2 open requests/.test(await p.textContent('.sheet, #scrim')),tag+' two open requests (old one left out)');
await p.$eval('#ldPray',e=>e.scrollIntoView({block:'center'}));await shot('leader');
await p.click('#ldPray');await p.waitForTimeout(300);const sh=await p.evaluate(()=>window.__shared);
ok(/Sarah: My mum/.test(sh)&&/Someone: A hard week/.test(sh)&&!/Pieter/.test(sh)&&!/Old request/.test(sh),tag+' prayer list text '+JSON.stringify(sh));
await p.evaluate(()=>$("#scrim")?.remove());
// listen together
await p.evaluate(()=>openMeet());await p.waitForTimeout(400);
for(let i=0;i<2;i++){await p.click('#mNext');await p.waitForTimeout(300)}
await p.waitForSelector('#mSay',{timeout:8000});await shot('meet-read');
await p.click('#mSay');await p.waitForTimeout(500);
ok(/Stop/.test(await p.textContent("#mSay"))&&await p.$("#mStage .mv.speaking")!==null&&await p.evaluate(()=>window.__said.length===1),tag+" reading aloud, first verse lit");
await shot('meet-say');
await p.click('#mNext');await p.waitForTimeout(300);ok(await p.evaluate(()=>!MS.on),tag+' stops on next slide');
await p.evaluate(()=>closeMeet());
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
