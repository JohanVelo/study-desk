// v43: On this day (what you wrote a week, month, 3/6 months or a year ago), tabs keep their place, history-book dates
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s58',{recursive:true});
const T=(d,h='20:00')=>`2026-${d}T${h}:00+02:00`;
const FULL={done:{1:T('10-05'),2:T('10-06'),3:T('10-07')},
  notes:{1:{what:'Jesus calls the fishermen by the Sea of Galilee and they leave their nets at once.',at:T('10-05')},2:{what:'<img src=x onerror="window.__xss=1"> teaching with authority',at:T('10-20')}},
  qt:{'2026-10-29':{ref:'Psalm 46:10',word:'still',note:'Peace came when I stopped rushing.',at:T('10-29','06:30')}},
  saved:{'MRK.1.17':{ref:'Mark 1:17',text:'“Come, follow Me,” Jesus said, “and I will make you fishers of men.”',tr:'BSB',day:1,v:17,at:T('10-05')}},
  pl:{p1:{t:"Megan's exams next week",at:T('10-05','21:00'),u:T('10-05','21:00')}},
  settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||FULL);
  await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();if(o.now)await p.clock.setFixedTime(new Date(o.now));
  const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const card=p=>p.evaluate(()=>{const c=document.querySelector('#otd');if(!c)return null;return {h:c.querySelector('h2').textContent,items:[...c.querySelectorAll('.otd-i')].map(i=>i.querySelector('.otd-k').textContent+' | '+i.querySelector('.otd-t').textContent+' | '+(i.querySelector('.otd-go')?.textContent||'-')),more:c.querySelector('.otd-more')?.textContent||'',x:c.querySelector('#otdX').getBoundingClientRect().height}});
const NOW='2026-11-05T09:00:00+02:00';
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs,now:NOW});
 let c=await card(p);
 ok(c&&c.h==='A month ago today'&&c.items.length===2&&/And 1 more thing/.test(c.more)&&c.x>=44,tag+' a month ago: 2 shown, 1 more, 44 px close: '+JSON.stringify(c));
 ok(c&&c.items.some(x=>/^Note \| /.test(x)&&/Open that day/.test(x)),tag+' the note is there with Open that day');
 if(cs==='light'||w===1440){await p.evaluate(()=>document.querySelector('#otd').scrollIntoView({block:'center'}));await p.waitForTimeout(250);await p.screenshot({path:`${__dirname}/s58/otd-${tag}.png`})}
 // open the note
 await p.click('#otd [data-otd^="d:"]');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>view==='today'&&state.selected===1),tag+' Open that day selects that reading day');
 await p.evaluate(()=>{state.selected=null;render()});await p.waitForTimeout(500);
 const hasV=await p.evaluate(()=>!!document.querySelector('#otd [data-otd^="v:"]'));
 if(hasV){await p.click('#otd [data-otd^="v:"]');await p.waitForTimeout(1500);ok(await p.evaluate(()=>!!document.querySelector('.reader')&&R.sel===17),tag+' Open the verse opens the reader at Mark 1:17');await p.evaluate(()=>closeReader());await p.waitForTimeout(500)}
 const hasP=await p.evaluate(()=>!!document.querySelector('#otd [data-otd^="p:"]'));
 if(hasP){await p.click('#otd [data-otd^="p:"]');await p.waitForTimeout(800);ok(await p.evaluate(()=>view==='journal'&&jTab==='pray'&&!!document.querySelector('[data-pl="p1"]')),tag+' Open the prayer goes to Journal, Prayers');await p.evaluate(()=>setView('today'));await p.waitForTimeout(500)}
 ok(hasV||hasP,tag+' the second item can be opened too');
 // hide for today
 await p.click('#otdX');await p.waitForTimeout(500);
 {const r=await p.evaluate(()=>({card:!!document.querySelector('#otd'),t:document.querySelector('#toast').textContent}));ok(!r.card&&/Hidden until tomorrow/.test(r.t),tag+' close hides it, with a message: '+JSON.stringify(r))}
 await p.reload();await p.waitForTimeout(1600);ok(!(await card(p)),tag+' stays hidden today after reopening');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// a week ago only, quiet time (nothing to open), and a later day: a year/6/3 months take priority order
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:'2026-11-05T07:00:00+02:00',st:{...FULL,notes:{},saved:{},pl:{}}});
 const c=await card(p);ok(c&&c.h==='A week ago today'&&c.items.length===1&&/^Quiet time \| Psalm 46:10 \| -$/.test(c.items[0])&&!c.more,'a week ago: the quiet time shows, no open button: '+JSON.stringify(c));
 await p.evaluate(()=>document.querySelector('#otd').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s58/week-390-light.png`});
 ok(!errs.length,'no errors (week)');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:'2026-10-31T09:00:00+02:00',st:{...FULL,notes:{1:{what:'Thirtieth of September',at:T('09-30')}},saved:{},pl:{},qt:{}}});
 ok(!(await card(p)),'31 October: no "month ago" (31 September does not exist), so no card');ok(!errs.length,'no errors (31st)');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:'2026-11-20T09:00:00+02:00',st:{...FULL,notes:{2:FULL.notes[2]},saved:{},pl:{},qt:{}}});
 const c=await card(p);ok(c&&c.h==='A month ago today'&&await p.evaluate(()=>!document.querySelector('#otd img')&&!window.__xss),'what you wrote is shown as text, never run');ok(!errs.length,'no errors (xss)');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:NOW,st:{done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}});
 ok(!(await card(p)),'empty journal: no card');ok(!errs.length,'no errors (empty)');await ctx.close()}
// motion on: fades away
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:NOW,rm:'no-preference'});await p.click('#otdX');await p.waitForTimeout(60);
 ok(await p.evaluate(()=>document.querySelector('#otd')?.classList.contains('otd-out')),'motion on: the card fades out');await p.waitForTimeout(500);ok(await p.evaluate(()=>!document.querySelector('#otd')),'then it is gone');ok(!errs.length,'no errors (motion)');await ctx.close()}
// ---- feel: each tab keeps its place ----
for(const [w,h,sel] of [[390,844,'#tabBtns'],[1440,900,'#navBtns']]){const {ctx,p,errs}=await open({w,h,cs:'light',now:NOW});const tag=String(w);
 await p.click(`${sel} [data-v="learn"]`);await p.waitForTimeout(700);
 const tall=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
 await p.evaluate(()=>window.scrollTo(0,500));await p.waitForTimeout(250);
 await p.click(`${sel} [data-v="today"]`);await p.waitForTimeout(700);
 ok(await p.evaluate(()=>view==='today'&&window.scrollY===0),tag+' a new tab opens at the top');
 await p.click(`${sel} [data-v="learn"]`);await p.waitForTimeout(800);
 const y=await p.evaluate(()=>window.scrollY);ok(tall>500?Math.abs(y-500)<6:y>=0,tag+' going back to Learn returns to where you were: '+y+' (room '+tall+')');
 await p.click(`${sel} [data-v="learn"]`);await p.waitForTimeout(500);ok(await p.evaluate(()=>window.scrollY===0),tag+' tapping the tab you are on goes back to the top');
 await p.evaluate(()=>{window.scrollTo(0,400);setView('journal')});await p.waitForTimeout(500);await p.evaluate(()=>setView('learn'));await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.scrollY===0),tag+' links inside the app still open at the top');
 ok(!errs.length,tag+' no errors (tabs) '+errs.join('|'));await ctx.close()}
// dates
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const bi=await p.evaluate(()=>({c1:BOOKINFO['1CH'],c2:BOOKINFO['2CH'][2],ezr:BOOKINFO.EZR[2],neh:BOOKINFO.NEH[2],est:BOOKINFO.EST[2]}));
 ok(/probably for those back from exile/.test(bi.c1[0])&&/9:1 to 2/.test(bi.c1[2])&&/36:22 to 23/.test(bi.c2)&&/\(1:1\).*\(7:7\)/.test(bi.ezr)&&/twentieth year of Artaxerxes \(2:1\)/.test(bi.neh)&&/\(1:3\).*\(3:7\)/.test(bi.est),'history-book dates cite their verses: '+JSON.stringify(bi));
 await p.evaluate(()=>openBook('EST'));await p.waitForTimeout(700);ok(/twelfth \(3:7\)/.test(await p.evaluate(()=>document.querySelector('#scrim')?.innerText||'')),'the Esther intro shows the new line');
 await p.screenshot({path:`${__dirname}/s58/esther-390-light.png`});
 ok(!errs.length,'no errors (dates) '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
