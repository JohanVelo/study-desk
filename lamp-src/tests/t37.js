// Today's step: four steps, reviews, group step, done state
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';const out=__dirname+'/s22';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const sizes=(process.env.SIZES||'390x844x light,390x844x dark,1440x900x light,1440x900x dark').split(',').map(x=>x.split('x'));
for(const [w,h,cs] of sizes){for(const grp of [true,false]){
const ctx=await b.newContext({viewport:{width:+w,height:+h},colorScheme:cs.trim(),hasTouch:+w<800,reducedMotion:'reduce'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
const ago=n=>new Date(Date.now()-n*864e5);const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
await ctx.addInitScript(([due,old])=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date(Date.now()-864e5).toISOString()},notes:{},saved:{
  "JHN.3.16":{ref:"John 3:16",text:"For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",m:3,md:old,s:7,d:5,r:1,l:0,lr:due,due},
  "PHP.4.6":{ref:"Philippians 4:6",text:"Be anxious for nothing, but in everything, by prayer and petition, with thanksgiving, present your requests to God.",m:3,md:old}},
  settings:{welcomed:false,onboarded:true,intro:false,hsTip:true}}))},[ymd(ago(8)),ago(20).toDateString()]);
if(grp){await ctx.addInitScript(MOCK);await ctx.addInitScript(()=>{const S=window.__mock.store;const w=new Date(Date.now()-2*864e5).toISOString();
  S.set('group/meta',{week:'w7',name:'Thursday group',auto:false});
  S.set('gm/u_a',{name:'Sarah',joined:'2026-01-01',ans:{w7:{q0:'He taught us to pray simply.'}},pr:{p1:{t:'Please pray for my mum, she has surgery on Friday.',at:w}}});
  S.set('gm/u_b',{name:'Pieter',joined:'2026-01-02',ans:{w7:{q0:'Forgiveness.'}}})})}
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errs.push('console '+m.text())});
const tag=`${w}-${cs.trim()}-${grp?'group':'solo'}`;const shot=n=>p.screenshot({path:`${out}/${n}-${tag}.png`,fullPage:true});
await p.goto(base);await p.waitForTimeout(2500);
ok(await p.$$eval('#tstep .ts',x=>x.length)===4,tag+' four steps');
ok(await p.evaluate(()=>document.querySelector('.ts.open')?.dataset.tsi)==='0',tag+' step 1 open first');
await shot('today');
// step 1
await p.click('#markDone');await p.waitForTimeout(900);
ok(await p.evaluate(()=>document.querySelector('.ts.open')?.dataset.tsi)==='1',tag+' reflect opens after reading');
await p.fill('#q1','The disciples learned to trust Jesus.');await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.querySelectorAll('.ts.done').length)===2,tag+' reflect done after typing');
// step 3
await p.click('[data-ts="2"]');await p.waitForTimeout(300);
const rvN=await p.evaluate(()=>RV.list.length);ok(rvN===2,tag+' two reviews due (one migrated) '+rvN);
await p.click('#rvFl');await p.waitForTimeout(100);ok(/B a f n, b i e/.test(await p.textContent('#rvHint')),tag+' first letters');
await shot('review');
await p.click('#rvShow');await p.click('[data-g="3"]');await p.waitForTimeout(200);
await p.click('#rvShow');await p.click('[data-g="1"]');await p.waitForTimeout(300);
const sv=await p.evaluate(()=>[state.saved["JHN.3.16"].due,state.saved["PHP.4.6"].due,ymd(new Date())]);
ok(sv[0]>sv[2]&&sv[1]>sv[2],tag+' both rescheduled '+sv);
ok(await p.evaluate(()=>document.querySelectorAll('.ts.done').length)===3,tag+' remember done');
await shot('review-done');
// step 4
await p.click('[data-ts="3"]');await p.waitForTimeout(300);
if(grp){ok(/pray for my mum/.test(await p.textContent('#tsGrp')),tag+' prayer request shows');ok(/2 people have answered/.test(await p.textContent('[data-tsi="3"] small')),tag+' answer count');await shot('group');
  await p.click('#tsGroup');await p.waitForTimeout(800);ok(await p.evaluate(()=>view)==='group',tag+' goes to group');await p.evaluate(()=>setView('today'));await p.waitForTimeout(800)}
else{await p.click('#tsPrayed');await p.waitForTimeout(400)}
ok(await p.evaluate(()=>!document.querySelector('#tsDone').hidden),tag+' done for today shows');
ok(/Done for today/.test(await p.textContent('.dayhead h1')),tag+' heading says done');
await shot('done');
await p.click('#tMore summary');await p.waitForTimeout(500);await shot('more');
const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(ov,tag+' no sideways scroll');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
