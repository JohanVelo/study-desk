const {chromium}=require(process.env.PW);const fs=require('fs');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';fs.mkdirSync(__dirname+'/s17',{recursive:true});
const sizes=[[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']];
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [w,h,cs] of sizes){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs,hasTouch:w<800});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{"JHN.3.16":{ref:"John 3:16",text:"For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",tr:"BSB",v:16,at:new Date().toISOString()}},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
const tag=`${w}-${cs}`;const shot=n=>p.screenshot({path:`${__dirname}/s17/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(2000);
ok(await p.$$eval('[data-feel]',x=>x.length)===12,tag+' feelings row');await p.$eval('.feelrow',e=>e.scrollIntoView({block:'center'}));await shot('today-feel');
await p.click('[data-feel="anxious"]');await p.waitForTimeout(2500);
const ft=await p.textContent('#fdStage');ok(/anxious/i.test(ft)&&/prayer and petition/i.test(ft),tag+' feel deck: '+ft.slice(0,90));await shot('feel1');
await p.click('#fdSave');await p.waitForTimeout(300);ok(await p.evaluate(()=>!!state.saved["PHP.4.6"]),tag+' feel save');
await p.click('#fdNext');await p.waitForTimeout(700);await shot('feel2');ok(await p.evaluate(()=>FD.i===1),tag+' feel next');
await p.keyboard.press('Escape');await p.waitForTimeout(300);ok(!await p.$('#fd'),tag+' feel closes');
// listen
await p.evaluate(()=>openPassage(passFor('PSA',23),false));await p.waitForTimeout(1500);
await p.click('#rSpeak');await p.waitForTimeout(1200);ok(!!await p.$('#ls .ls-verse'),tag+' listen opens');await shot('listen');
await p.click('#lsNext');await p.waitForTimeout(700);ok(await p.evaluate(()=>LSN.i===1),tag+' listen next');
await p.click('#lsRate');ok(await p.textContent('#lsRate')==='1.25×',tag+' speed');
{const a=await p.evaluate(()=>LSN.on);await p.click('#lsPlay');await p.waitForTimeout(100)}
await p.evaluate(()=>{LSN.i=LSN.list.length;lsPaint()});await p.waitForTimeout(500);await shot('listen-end');
await p.click('#lsX');await p.waitForTimeout(300);ok(!await p.$('#ls'),tag+' listen closes');
await p.evaluate(()=>closeReader());await p.waitForTimeout(500);
// puzzle
await p.evaluate(()=>{jTab="memo";setView('journal')});await p.waitForTimeout(1000);await shot('memo');
await p.click('#mPuz');await p.waitForTimeout(600);await shot('puzzle');
await p.evaluate(()=>{const b=[...document.querySelectorAll('[data-pz]')].find(x=>+x.dataset.pz!==0);pzTap(b)});
const n=await p.evaluate(()=>PZ.parts.length);for(let i=0;i<n;i++){await p.click(`[data-pz="${i}"]`);await p.waitForTimeout(60)}
await p.waitForTimeout(800);ok(/Well done|Perfect|got there/.test(await p.textContent('.pz-win')),tag+' puzzle won');await shot('puzzle-win');
{const bt=await p.evaluate(()=>[state.saved[PZ.key]?.bt,PZ.key,Object.keys(state.saved)]);ok(bt[0]>=0,tag+' best time saved '+JSON.stringify(bt))}
await p.click('#pzDone');await p.waitForTimeout(500);
const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(ov,tag+' no sideways scroll');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
