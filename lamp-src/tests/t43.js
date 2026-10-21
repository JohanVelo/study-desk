// v24: journey card, bookshelf, Your Lamp story
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';const out=__dirname+'/s24';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const sizes=(process.env.SIZES||'390x844x light,390x844x dark,1440x900x light,1440x900x dark').split(',').map(x=>x.split('x'));
for(const [w,h,cs] of sizes){for(const rm of ['no-preference','reduce']){
const ctx=await b.newContext({viewport:{width:+w,height:+h},colorScheme:cs.trim(),hasTouch:+w<800,reducedMotion:rm});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
await ctx.addInitScript(()=>{if(sessionStorage.k)return;sessionStorage.k=1;const d={};for(let i=1;i<=20;i++){const x=new Date(Date.now()-(21-i)*864e5);x.setHours(7,15);d[i]=x.toISOString()}
  localStorage.setItem('lamp-state-v1',JSON.stringify({done:d,notes:{2:{what:'Forgiven.'},5:{what:'Peace.'}},saved:{"JHN.3.16":{ref:"John 3:16",text:"For God so loved the world, that he gave his one and only Son.",m:3,s:9}},pl:{a:{t:'Job',at:'2026-10-01T08:00:00Z',ans:'2026-10-10T08:00:00Z'}},ex:{"2026-10-20":{q0:'x'}},
  settings:{welcomed:true,onboarded:true,intro:false,hsTip:true,allOpen:true}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errs.push('console '+m.text())});
const tag=`${w}-${cs.trim()}-${rm==='reduce'?'still':'moving'}`;const shot=n=>p.screenshot({path:`${out}/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(2000);await p.evaluate(()=>setView('path'));await p.waitForTimeout(1600);
ok(await p.$$eval('.spine',x=>x.length)===9,tag+' nine books on the shelf');
ok(await p.$eval('.spine.full',e=>/Meet Jesus/.test(e.getAttribute('aria-label'))),tag+' Mark finished');
ok(await p.$('.spine.now')!==null,tag+' current book marked');
const fit=await p.$eval('.bshelf',e=>e.scrollWidth<=e.clientWidth+1);ok(fit,tag+' shelf fits');
await shot('path');
await p.click('#storyGo');await p.waitForTimeout(900);
ok(/Your Lamp story/.test(await p.textContent('#story')),tag+' story opens');await shot('story1');
const seen=[];for(let i=0;i<10&&await p.$('#story');i++){seen.push(await p.$eval('.st-k',e=>e.textContent));if(await p.$('#stDone'))break;await p.click('#stN');await p.waitForTimeout(rm==='reduce'?200:1300);if(i===0)await shot('story2');if(seen.length===3)await shot('story-morning')}
ok(seen.includes('Chapters read')&&seen.includes('When you read')&&seen.includes('Verses you kept')&&seen.includes('Your heart'),tag+' slides '+seen.join('/'));
ok(/morning reader/.test(await p.evaluate(()=>storySlides().map(s=>s.t).join('|'))),tag+' morning reader');
await shot('story-end');
const dl=p.waitForEvent('download',{timeout:5000}).catch(()=>null);await p.click('#stShare');ok(!!(await dl),tag+' story share card');
await p.click('#stDone');await p.waitForTimeout(300);ok(await p.$('#story')===null,tag+' story closes');
if(rm!=='reduce'){await p.click('#storyGo');await p.waitForTimeout(7200);ok(await p.evaluate(()=>ST.i)>=1,tag+' story moves on by itself');await p.keyboard.press('Escape');ok(await p.$('#story')===null,tag+' escape closes')}
const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(ov,tag+' no sideways scroll');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
