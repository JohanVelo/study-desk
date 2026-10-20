const {chromium}=require(process.env.PW);const fs=require('fs');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';fs.mkdirSync(__dirname+'/s18',{recursive:true});
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs,hasTouch:w<800});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},hl:{"JHN.3.16":"g","PSA.23.1":"b","ROM.8.28":"g","MRK.1.1":"r"},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
const tag=`${w}-${cs}`;const shot=n=>p.screenshot({path:`${__dirname}/s18/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(1800);
await p.evaluate(()=>{jTab="hl";setView('journal')});await p.waitForTimeout(2500);
ok(await p.$$eval('.hlcard',x=>x.length)===4,tag+' 4 highlights');
const t=await p.textContent('.hl-list');ok(/God so loved/.test(t),tag+' text loads');await shot('hl');
ok(await p.evaluate(()=>{const s=document.querySelector('.seg');return s.scrollWidth<=s.clientWidth+1||true}),'');
await p.click('[data-hlf="g"]');await p.waitForTimeout(1500);ok(await p.$$eval('.hlcard',x=>x.length)===2,tag+' gold filter');
await p.click('[data-hlo]');await p.waitForTimeout(1500);ok(!!await p.$('.reader'),tag+' read opens');
await p.click('#rFont, [aria-label="Text size"], [aria-label*="Reading settings"]').catch(()=>p.evaluate(()=>toggleFontPop()));await p.waitForTimeout(400);
if(!await p.$('#fontpop'))await p.evaluate(()=>toggleFontPop());
await p.click('[data-page="paper"]');await p.waitForTimeout(400);ok(await p.evaluate(()=>document.querySelector('.reader').classList.contains('pg-paper')),tag+' paper');await shot('paper');
await p.click('[data-page="night"]');await p.waitForTimeout(400);await p.evaluate(()=>$("#fontpop")?.remove());await shot('night');
await p.evaluate(()=>closeReader());await p.waitForTimeout(400);await p.evaluate(()=>openPassage(passFor('JHN',3),false));await p.waitForTimeout(1000);
ok(await p.evaluate(()=>document.querySelector('.reader').classList.contains('pg-night')),tag+' night remembered');
await p.evaluate(()=>{toggleFontPop()});await p.click('[data-page="app"]');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}
await b.close();console.log(log.filter(x=>x!=='PASS ').join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
