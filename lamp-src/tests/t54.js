// v39: month in review (Path card + a Today nudge in the first week of a month), 4 more topic plans, smooth <details>
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s54',{recursive:true});
// October: chapters on 2–11 Oct (a 10-day run), quiet time only on 20–21 Oct; September: 2 days; November: 1 chapter
const T=(d,h=7)=>`2026-${d}T0${h}:30:00+02:00`;
const FULL={done:Object.fromEntries([...Array(10)].map((_,i)=>[i+1,T('10-'+String(i+2).padStart(2,'0'))]).concat([[11,T('09-10')],[12,T('11-02')]])),
  qt:{'2026-10-20':{ref:'x',at:T('10-20')},'2026-10-21':{ref:'x',at:T('10-21')},'2026-09-12':{ref:'x',at:T('09-12')}},
  notes:{3:{what:'Jesus calls the fishermen',at:T('10-04')},4:{quiz:3,at:T('10-05')}},
  saved:{'MRK.1.17':{ref:'Mark 1:17',text:'Come, follow me',tr:'BSB',day:1,v:17,at:T('10-05')}},
  pl:{p1:{t:'For my mother',at:T('10-01'),ans:T('10-15'),u:T('10-15')}},ex:{'2026-10-21':{q0:'grateful',at:T('10-21'),u:T('10-21')}},
  settings:{onboarded:true,welcomed:true,intro:false,hsTip:1,tp:{money:{d:{0:T('10-22')}}}}};
const EMPTY={done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.clock.setFixedTime(new Date(o.now||'2026-11-03T10:00:00+02:00'));
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st));window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null};try{Object.defineProperty(navigator,'share',{value:undefined,configurable:true})}catch(e){}},o.st||FULL);
  await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const card=p=>p.evaluate(()=>{const c=document.querySelector('#monCard');return c&&{h:c.querySelector('h2').innerText,t:c.innerText.replace(/\n+/g,' | '),
  n:[...c.querySelectorAll('[data-mrn]')].map(x=>x.textContent),on:c.querySelectorAll('.mr-g i.mrd').length,qt:c.querySelectorAll('.mr-g i.mqt').length,pad:c.querySelectorAll('.mr-g i.mpad').length,
  cells:c.querySelectorAll('.mr-g i:not(.mpad)').length,lab:c.querySelector('.mr-cal')?.getAttribute('aria-label'),prev:c.querySelector('#mrPrev').disabled,next:c.querySelector('#mrNext').disabled}});
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 // Today nudge in the first week of November
 const tz=await p.evaluate(()=>document.querySelector('#mTeaser')?.innerText.replace(/\n+/g,' | '));
 ok(/Your October in Lamp/.test(tz)&&/10 chapters on 12 days/.test(tz),tag+' Today: October nudge shows: '+tz);
 if(w===390||cs==='dark'){await p.evaluate(()=>document.querySelector('#mTeaser').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s54/teaser-${tag}.png`})}
 ok(await p.evaluate(()=>[...document.querySelectorAll('#mTeaser button')].every(x=>x.getBoundingClientRect().height>=44)),tag+' nudge buttons are at least 44 px tall');
 await p.click('#mtGo');await p.waitForTimeout(700);
 let c=await card(p);
 ok(await p.evaluate(()=>view==='path'),tag+' See your month opens the Path');
 ok(c&&c.h==='October 2026'&&!/so far/.test(c.h),tag+' card shows October (not this month): '+c?.h);
 ok(c.n.join(',')==='10,12,10,2',tag+' chapters, reading days, longest run, quiet times: '+c.n.join(','));
 ok(['1 note written','1 verse saved','1 prayer answered','1 evening Examen','1 topic reading'].every(x=>c.t.includes(x)),tag+' extras counted only for October: '+c.t);
 ok(/You read in /.test(c.t)&&/10 more reading days than September/.test(c.t),tag+' books and the comparison with September');
 ok(c.cells===31&&c.pad===3&&c.on===10&&c.qt===2,tag+` calendar: 31 days, starts on Thursday, 10 read, 2 quiet-time days (${c.cells},${c.pad},${c.on},${c.qt})`);
 ok(c.lab==='October: read on 12 days of 31',tag+' calendar is spoken: '+c.lab);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 await p.evaluate(()=>document.querySelector('#monCard').scrollIntoView({block:'center'}));await p.waitForTimeout(300);await p.screenshot({path:`${__dirname}/s54/month-${tag}.png`});
 // the cells don't overlap and text fits
 ok(await p.evaluate(()=>{const r=[...document.querySelectorAll('.mr-g i:not(.mpad)')].map(x=>x.getBoundingClientRect());return r.every(a=>a.width>=24)&&[...document.querySelectorAll('.mr-stats div')].every(x=>x.scrollWidth<=x.clientWidth+1)}),tag+' day cells are at least 24 px and stat labels fit');
 // share
 await p.click('#mrShare');const u=await p.evaluate(()=>decodeURIComponent((window.__opened[0]||'').split('text=')[1]||''));
 ok(/^My October in Lamp: 10 chapters on 12 days, 2 quiet times, and a run of 10 days in a row\./.test(u),tag+' share text: '+u);
 // navigation
 await p.click('#mrNext');await p.waitForTimeout(250);c=await card(p);
 ok(/November 2026/.test(c.h)&&/so far/.test(c.h)&&c.n[0]==='1'&&c.next,tag+' next: November so far, and no further: '+c.h);
 ok(await p.evaluate(()=>document.activeElement?.id==='mrNext'||document.activeElement?.id===''||document.activeElement===document.body),tag+' focus kept on the month buttons');
 await p.click('#mrPrev');await p.waitForTimeout(150);await p.click('#mrPrev');await p.waitForTimeout(250);c=await card(p);
 ok(c.h==='September 2026'&&c.n.join(',')==='1,2,1,1'&&c.prev,tag+' back to September, the first month with reading, and no further: '+c.n);
 ok(!/more reading days than/.test(c.t),tag+' no comparison when there is no month before');
 // keyboard
 if(w===1440){await p.focus('#mrNext');await p.keyboard.press('Enter');await p.waitForTimeout(250);ok((await card(p)).h==='October 2026',tag+' keyboard: Enter moves to the next month')}
 // nudge stays away once seen
 await p.evaluate(()=>setView('today'));await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!document.querySelector('#mTeaser')),tag+' nudge gone after it was opened');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// Not now
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await p.click('#mtX');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!document.querySelector('#mTeaser')&&localStorage.getItem('lamp-mr-seen-2026-10')==='1'),'Not now hides the nudge and remembers it');
 await p.reload();await p.waitForTimeout(1500);ok(await p.evaluate(()=>!document.querySelector('#mTeaser')),'still hidden after reopening');ok(!errs.length,'no errors (not now)');await ctx.close()}
// after the first week: no nudge, card shows this month
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:'2026-11-12T10:00:00+02:00'});
 ok(await p.evaluate(()=>!document.querySelector('#mTeaser')),'no nudge after the 7th');
 await p.evaluate(()=>setView('path'));await p.waitForTimeout(500);const c=await card(p);ok(/November 2026/.test(c.h)&&/so far/.test(c.h),'card defaults to this month after the first week: '+c.h);ok(!errs.length,'no errors (mid-month)');await ctx.close()}
// brand-new reader
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:EMPTY});
 ok(await p.evaluate(()=>!document.querySelector('#mTeaser')),'new reader: no nudge');
 await p.evaluate(()=>setView('path'));await p.waitForTimeout(500);const c=await card(p);
 ok(/Nothing yet this month/.test(c.t)&&c.prev&&c.next,'new reader: friendly empty month, both arrows off: '+c.t);await p.screenshot({path:`${__dirname}/s54/empty-390-light.png`});
 ok(!errs.length,'no errors (new reader)');await ctx.close()}
// topic plans: 16, the new four open at the right verse
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>setView('learn'));await p.waitForTimeout(700);
 const ids=await p.evaluate(()=>[...document.querySelectorAll('[data-tp]')].map(x=>x.dataset.tp));
 ok(TPN(ids),'16 topic plans incl. money, family, rest, tempted: '+ids.length);
 for(const id of ['money','family','rest','tempt']){await p.evaluate(i=>openTopic(i),id);await p.waitForTimeout(300);
  const t=await p.evaluate(()=>({n:document.querySelectorAll('#scrim .tplist li').length,r:[...document.querySelectorAll('#scrim [data-tpr]')].map(x=>x.dataset.tpr)}));
  ok(t.n===5&&t.r.every(r=>/^[1-3A-Z]{3}\.\d+\.\d+$/.test(r)),id+' has 5 readings: '+t.r.join(' '));
  if(id==='rest'){await p.screenshot({path:`${__dirname}/s54/topic-rest-390-light.png`})}
  await p.evaluate(()=>document.querySelector('#scrim')?.remove())}
 // the first reading of "When you're tempted" opens Matthew 4 at verse 1
 await p.evaluate(()=>openTopic('tempt'));await p.waitForTimeout(300);await p.click('#scrim [data-tpr="MAT.4.1"]');await p.waitForTimeout(1500);
 ok(/Matthew 4/.test(await p.evaluate(()=>document.querySelector('.reader .rt')?.textContent||'')),'tempted plan opens Matthew 4 in the reader');
 ok(!errs.length,'no errors (topics)');await ctx.close()}
// feel: details open and close smoothly (motion on), instantly with reduced motion
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference'});await p.evaluate(()=>setView('path'));await p.waitForTimeout(900);
 const tr=await p.evaluate(()=>getComputedStyle(document.querySelector('details.stage'),'::details-content').transitionProperty);
 ok(/height/.test(tr),'motion on: stages animate their height: '+tr);
 const st=await p.evaluate(async()=>{const d=[...document.querySelectorAll('details.stage')].find(x=>!x.open);d.querySelector('summary').click();await new Promise(r=>setTimeout(r,90));const mid=d.querySelector('.st-blurb').getBoundingClientRect().height;await new Promise(r=>setTimeout(r,700));
   const end=d.getBoundingClientRect().height;return {open:d.open,mid,end,vis:d.querySelector('.st-blurb').checkVisibility()}});
 ok(st.open&&st.vis&&st.end>120,'a closed stage opens fully: '+JSON.stringify(st));
 ok(!errs.length,'no errors (motion)');await ctx.close()}
{const {ctx,p}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>setView('path'));await p.waitForTimeout(500);
 ok(!/height/.test(await p.evaluate(()=>getComputedStyle(document.querySelector('details.stage'),'::details-content').transitionProperty)),'reduced motion: no height animation');await ctx.close()}
function TPN(ids){return ids.length===16&&['money','family','rest','tempt'].every(x=>ids.includes(x))}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
