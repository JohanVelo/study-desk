// v48: prayer days (pick a day for each private prayer; Today shows that day's prayers; Pray through my list starts with today's, then the longest since prayed),
// swipe right = I prayed, → = next; 12 new questions (Leviticus, Jude, Joel)
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s63',{recursive:true});
const T=d=>`2026-${d}T08:00:00+02:00`;
const WED='2026-11-11T09:00:00+02:00';
const PL={p1:{t:'Mum\'s health',at:'2026-10-01T08:00:00Z',u:'2026-10-01T08:00:00Z',dw:3},p2:{t:'Wisdom at work',at:'2026-10-05T08:00:00Z',u:'2026-10-05T08:00:00Z',dw:7,last:'2026-11-09T08:00:00Z',n:2},
  p3:{t:'Thabo to find a job',at:'2026-10-20T08:00:00Z',u:'2026-10-20T08:00:00Z'},p4:{t:'Our church plant',at:'2026-10-25T08:00:00Z',u:'2026-10-25T08:00:00Z',last:'2026-10-26T08:00:00Z',n:1},
  p5:{t:'Friday only',at:'2026-10-26T08:00:00Z',u:'2026-10-26T08:00:00Z',dw:5}};
const ST={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},pl:PL,settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(o.now||WED).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  if(!o.nomock)await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const pl=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-state-v1')).pl);
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 // Today: Wednesday's prayers (p1 Wednesdays, p2 every day), not Friday's or any-day ones
 const c=await p.evaluate(()=>document.querySelector('#pltCard')?.innerText.replace(/\n/g,' | '));
 ok(/Wednesday's prayers/i.test(c||'')&&/2 prayers for today/.test(c)&&/Mum's health/.test(c)&&/Wisdom at work/.test(c)&&!/Friday only|Thabo|church plant/.test(c),tag+' Today lists Wednesday\'s prayers: '+c);
 await p.evaluate(()=>document.querySelector('#pltCard').scrollIntoView({block:'center'}));await p.waitForTimeout(200);
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s63/today-${tag}.png`});
 const ax=await p.evaluate(AXE+';(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector("#pltCard"),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id)})()');
 ok(!ax.length,tag+' axe: Today card clean '+ax);
 // Pray now: only today's, then the card goes
 await p.click('#pltGo');await p.waitForTimeout(500);
 const s1=await p.evaluate(()=>({n:PN.list.length,t:document.querySelector('#pnStage')?.innerText.replace(/\n/g,' | ')}));
 ok(s1.n===2&&/Mum's health/.test(s1.t)&&/Wednesdays/i.test(s1.t)&&/On your list for 5 weeks/.test(s1.t),tag+' Pray now has today\'s two, the never-prayed first, with its day: '+s1.t);
 if(w===390&&cs==='light')await p.screenshot({path:`${__dirname}/s63/pray-${tag}.png`});
 await p.click('#pnPray');await p.waitForTimeout(500);await p.click('#pnPray');await p.waitForTimeout(500);
 ok(/You prayed for 2 requests/.test(await p.evaluate(()=>document.querySelector('#pnStage').innerText)),tag+' both prayed');
 await p.click('#pnPray');await p.waitForTimeout(500);
 const L1=await pl(p);
 ok(L1.p1.n===1&&L1.p2.n===3&&await p.evaluate(()=>!document.querySelector('#pltCard')),tag+' prayed counts saved and the Today card is gone');
 // Journal: day chips; change one
 await p.evaluate(()=>{jTab='pray';setView('journal')});await p.waitForTimeout(600);
 const chips=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('[data-pldw]')].map(b=>[b.dataset.pldw,b.textContent.trim()])));
 ok(chips.p1==='Wednesdays'&&chips.p2==='Every day'&&chips.p3==='Any day'&&chips.p5==='Fridays',tag+' each prayer shows its day: '+JSON.stringify(chips));
 const hs=await p.evaluate(()=>[...document.querySelectorAll('.plc .btn')].filter(e=>e.offsetParent).map(e=>Math.round(e.getBoundingClientRect().height)).filter(x=>x<36));
 ok(!hs.length,tag+' prayer card buttons are a good size '+hs);
 await p.evaluate(()=>document.querySelector('.pl-list').scrollIntoView({block:'start'}));await p.waitForTimeout(200);
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s63/journal-${tag}.png`});
 await p.click('[data-pldw="p3"]');await p.waitForTimeout(400);
 const sh=await p.evaluate(()=>({t:document.querySelector('#pld')?.innerText.replace(/\n/g,' | '),n:document.querySelectorAll('#pld [data-dw]').length,on:document.querySelector('#pld [aria-pressed="true"]')?.textContent,f:document.activeElement?.textContent,small:[...document.querySelectorAll('#pld button')].map(e=>Math.round(e.getBoundingClientRect().height)).filter(x=>x<44)}));
 ok(sh.n===9&&sh.on==='Any day'&&sh.f==='Any day'&&/Thabo to find a job/.test(sh.t)&&!sh.small.length,tag+' the day sheet has 9 choices, the current one pressed and focused: '+JSON.stringify(sh));
 if(w===390&&cs==='light'||w===1440&&cs==='dark')await p.screenshot({path:`${__dirname}/s63/days-${tag}.png`});
 await p.click('#pld [data-dw="3"]');await p.waitForTimeout(500);
 const L2=await pl(p);
 ok(L2.p3.dw===3&&await p.evaluate(()=>document.querySelector('[data-pldw="p3"]').textContent.trim()==='Wednesdays'),tag+' choosing Wednesdays saves and shows');
 await p.evaluate(()=>setView('today'));await p.waitForTimeout(500);
 ok(/One prayer for today/.test(await p.evaluate(()=>document.querySelector('#pltCard')?.innerText||''))&&/Thabo/.test(await p.evaluate(()=>document.querySelector('#pltCard')?.innerText||'')),tag+' Today now shows the newly added Wednesday prayer');
 // X hides until tomorrow
 await p.click('#pltX');await p.waitForTimeout(500);await p.reload();await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!document.querySelector('#pltCard')),tag+' X hides it until tomorrow');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// Pray through my list: today's first, then the longest since prayed; swipe right = prayed, → = next
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await p.evaluate(()=>{jTab='pray';setView('journal')});await p.waitForTimeout(600);await p.click('#plPray');await p.waitForTimeout(500);
 const ord=await p.evaluate(()=>PN.list.map(x=>x.k).join(','));
 ok(ord==='p1,p2,p3,p5,p4',"order: today's (never prayed first), then never prayed (waiting longest first), then the longest since prayed: "+ord);
 const box=await p.evaluate(()=>{const r=document.querySelector('#pnStage').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
 await p.mouse.move(box.x-80,box.y);await p.mouse.down();await p.mouse.move(box.x+80,box.y,{steps:5});await p.mouse.up();await p.waitForTimeout(500);
 ok(await p.evaluate(()=>PN.i===1&&PN.n===1&&JSON.parse(localStorage.getItem('lamp-state-v1')).pl.p1.n===1),'swipe right says I prayed');
 await p.mouse.move(box.x+80,box.y);await p.mouse.down();await p.mouse.move(box.x-80,box.y,{steps:5});await p.mouse.up();await p.waitForTimeout(500);
 ok(await p.evaluate(()=>PN.i===2&&PN.n===1),'swipe left goes to the next one');
 await p.evaluate(()=>document.querySelector('#pn').focus());await p.keyboard.press('ArrowRight');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>PN.i===3&&PN.n===1),'→ goes to the next one');
 await p.keyboard.press('Escape');await p.waitForTimeout(400);ok(await p.evaluate(()=>!document.querySelector('#pn')),'Escape closes');
 ok(!errs.length,'order: no errors '+errs.join('|'));await ctx.close()}
// group prayer wall is unchanged (newest first, swipe right also prays)
{const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',when:'Thursdays at 7 pm',at:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,pr:{a1:{t:'Old request',at:'2026-11-01T08:00:00Z'},a2:{t:'New request',at:'2026-11-10T08:00:00Z'}}})};
 const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
 await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
 await ctx.addInitScript(st=>{localStorage.setItem('lamp-state-v1',JSON.stringify(st))},ST);await ctx.addInitScript(MOCK);await ctx.addInitScript(SEED);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);
 await p.evaluate(()=>openPrayNow());await p.waitForTimeout(400);
 ok(await p.evaluate(()=>PN.list.map(x=>x.t).join('|')==='New request|Old request'&&!PN.own),'group prayer wall order unchanged');
 ok(!errs.length,'group: no errors '+errs.join('|'));await ctx.close()}
// a Friday: no Today card for Wednesday prayers; signed out works
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:'2026-11-13T09:00:00+02:00',nomock:true});
 const c=await p.evaluate(()=>document.querySelector('#pltCard')?.innerText.replace(/\n/g,' | '));
 ok(/2 prayers for today/.test(c||'')&&/Friday only/.test(c)&&/Wisdom at work/.test(c)&&!/Mum/.test(c),'Friday (signed out): Friday and every-day prayers: '+c);
 const bank=await p.evaluate(async()=>{const F=await loadFun();const nw=F.q.slice(540,552);const o={};for(const c of ['LEV','JUD','JOL'])o[c]=(await bqPool(c)).length;return {n:F.q.length,ok:nw.every(x=>x.a.length===4&&new Set(x.a).size===4&&/^[1-3A-Z]{3}\.\d+\.\d+$/.test(x.ref)&&x.c!=='books'),books:[...new Set(nw.map(x=>x.ref.split('.')[0]))].sort().join(','),o}});
 ok(bank.n>=552&&bank.ok&&bank.books==='JOL,JUD,LEV'&&Object.values(bank.o).every(n=>n>=4),'12 new questions; Leviticus, Jude and Joel get a book quiz: '+JSON.stringify(bank));
 ok(!errs.length,'friday: no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
