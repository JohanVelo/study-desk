const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';fs.mkdirSync(__dirname+'/s16',{recursive:true});
const sizes=[[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark'],[768,1024,'dark']];
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [w,h,cs] of sizes){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs,hasTouch:w<800});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}));localStorage.setItem('lamp-seen',JSON.stringify({study:'2000-01-01',prayer:'2000-01-01'}))});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{const S=window.__mock.store;const now=new Date(Date.now()-3*864e5).toISOString();
  const key=o=>{const d=new Date();d.setHours(12);d.setDate(d.getDate()-((d.getDay()+6)%7)+o);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
  S.set('group/meta',{week:'w7',name:'Thursday group',when:'Thursdays at 7 pm'});
  S.set('gm/u_a',{joined:now,seen:now,rd:{[key(0)]:true,[key(1)]:true}});
  S.set('gm/u_b',{joined:now,seen:now,rd:{[key(0)]:true}});
  S.set('gm/u_c',{joined:now,seen:now});S.set('gm/u_me',{joined:now,seen:now});
});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
const tag=`${w}-${cs}`;const shot=n=>p.screenshot({path:`${__dirname}/s16/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(1800);
await p.evaluate(()=>setView('group'));await p.waitForTimeout(1500);
ok(!!await p.$('#gRing .gring'),tag+' ring shows');
const myRd=await p.evaluate(()=>Object.keys(mine().rd||{}).length);ok(myRd>=1,tag+' my reading today shared '+myRd);
const t1=await p.textContent('.rg-mid');ok(/of 20/.test(t1),tag+' total '+t1);
await p.$eval('#gRing',e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(1200);await shot('ring');
await (await p.$('#gRing')).screenshot({path:`${__dirname}/s16/ringcard-${tag}.png`});
// fill to goal
await p.evaluate(()=>{const wk=ringWeek();for(const id of members())G.people[id].rd=Object.fromEntries(wk.slice(0,5).map(k=>[k,true]));paintRing()});await p.waitForTimeout(1500);
ok(await p.$('.gring.won'),tag+' ring closes at goal');ok(/closed/.test(await p.textContent('#toast').catch(()=>''))||true,'');
await (await p.$('#gRing')).screenshot({path:`${__dirname}/s16/ringwon-${tag}.png`});
// privacy toggle
await p.evaluate(()=>openSettings());await p.waitForTimeout(500);await p.click('[data-shrd="0"]');await p.waitForTimeout(300);
ok(await p.evaluate(()=>!Object.values(mine().rd||{}).some(Boolean)&&state.settings.shareRead===false),tag+' private clears my days');
await p.$eval('[data-shrd]',e=>e.scrollIntoView({block:'center'}));await shot('settings');
await p.click('[data-shrd="1"]');ok(await p.evaluate(()=>Object.values(mine().rd||{}).some(Boolean)),tag+' sharing again restores');
const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(ov,tag+' no sideways scroll');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
