// v46: sermon notes (Journal, Notes; Sunday card on Today; the "one thing" comes back during the week), the journal tab indicator slides, 16 new questions (Nehemiah, Job, Colossians, 1 Peter)
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s61',{recursive:true});
const T=d=>`2026-${d}T08:00:00+02:00`;
const ST={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const SUN='2026-11-08T10:00:00+02:00',TUE='2026-11-10T10:00:00+02:00';
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(o.now||SUN).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  if(!o.nomock)await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const small=p=>p.evaluate(()=>[...document.querySelectorAll('#sn button:not([hidden]),#sn input:not([type=checkbox]),#sn label.shr,#snCard button')].filter(e=>e.offsetParent).map(e=>[e.id||e.className,Math.round(e.getBoundingClientRect().height)]).filter(x=>x[1]<44));
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 // Sunday, nothing yet: Today asks
 const c0=await p.evaluate(()=>({t:document.querySelector('#snCard')?.innerText.replace(/\n/g,' | '),go:document.querySelector('#snCGo')?.textContent}));
 ok(/At church today\?/.test(c0.t||'')&&/Take sermon notes/.test(c0.go||'')&&/Don't ask on Sundays/.test(c0.t),tag+' Sunday: Today asks about church: '+c0.t);
 if(cs==='light'||w===1440){await p.evaluate(()=>document.querySelector('#snCard').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s61/sun-${tag}.png`})}
 await p.click('#snCGo');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!!document.querySelector('#sn')&&document.activeElement?.id==='sn_ref'&&document.querySelector('#sn_d').value==='2026-11-08'),tag+' the sheet opens on Passage with today\'s date');
 ok(!(await small(p)).length,tag+' sheet targets are 44 px: '+JSON.stringify(await small(p)));
 await p.fill('#sn_ref','Luke 15:11-32');await p.waitForTimeout(150);
 ok(/Read Luke 15:11/.test(await p.evaluate(()=>document.querySelector('#snGo')?.textContent||'')),tag+' the passage turns into a Read link');
 await p.fill('#sn_t','The father who runs');await p.fill('#sn_who','Pastor Thabo');
 await p.fill('#sn_body','The younger son came to his senses.\nThe father saw him from far off and ran.\nThe older brother would not go in.');
 await p.fill('#sn_act','Phone my brother this week');await p.waitForTimeout(800);
 const s1=await p.evaluate(()=>({st:document.querySelector('#snS').textContent,h:document.querySelector('#snH2').textContent,del:!document.querySelector('#snDel').hidden,sn:Object.values(JSON.parse(localStorage.getItem('lamp-state-v1')).sn||{})}));
 ok(/Saved/.test(s1.st)&&s1.h==='The father who runs'&&s1.del&&s1.sn.length===1&&s1.sn[0].ref==='Luke 15:11-32'&&s1.sn[0].who==='Pastor Thabo'&&/ran\./.test(s1.sn[0].body)&&s1.sn[0].act==='Phone my brother this week'&&s1.sn[0].d==='2026-11-08',tag+' saves as you type: '+JSON.stringify({st:s1.st,h:s1.h}));
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s61/sheet-${tag}.png`});
 // last words typed right before closing are kept
 await p.fill('#sn_body','The younger son came to his senses.\nThe father saw him from far off and ran.\nThe older brother would not go in.\nGrace is a party.');
 await p.click('#shX');await p.waitForTimeout(400);
 const s2=await p.evaluate(()=>({sn:Object.values(JSON.parse(localStorage.getItem('lamp-state-v1')).sn||{}),card:document.querySelector('#snCard')?.innerText.replace(/\n/g,' | ')}));
 ok(s2.sn.length===1&&/Grace is a party/.test(s2.sn[0].body),tag+' typing just before closing is not lost');
 ok(/Your notes from church/.test(s2.card||'')&&/The father who runs/.test(s2.card||''),tag+' Today now shows your notes: '+s2.card);
 await p.waitForTimeout(900);
 ok(await p.evaluate(()=>{const d=window.__mock.store.get('data/users/u_me/progress');return !!d&&Object.values(d.sn||{}).some(x=>x&&x.t==='The father who runs')}),tag+' the notes sync to the account');
 // Journal, Notes
 await p.evaluate(()=>{jTab='notes';setView('journal')});await p.waitForTimeout(700);
 const j=await p.evaluate(()=>({sec:document.querySelector('.sn-sec')?.innerText.replace(/\n/g,' | '),first:document.querySelector('.sn-sec')?.compareDocumentPosition(document.querySelector('.card.empty'))===4,h:document.querySelector('.sn-item')?.getBoundingClientRect().height}));
 ok(/Sermon notes · 1/.test(j.sec||'')&&/SUN,? 8 NOV/i.test(j.sec)&&/The father who runs/.test(j.sec)&&/Luke 15:11-32 · Pastor Thabo/.test(j.sec)&&j.first&&j.h>=44,tag+' Journal lists the notes above the reading notes: '+j.sec);
 await p.evaluate(()=>document.querySelector('.sn-sec').scrollIntoView({block:'center'}));await p.waitForTimeout(150);
 await p.screenshot({path:`${__dirname}/s61/journal-${tag}.png`});
 // the journal tab indicator sits under the pressed tab
 const ind=await p.evaluate(()=>{const i=document.querySelector('.seg-ind'),o=document.querySelector('.seg button[aria-pressed="true"]');return i&&o?{w:Math.round(i.getBoundingClientRect().width),bw:Math.round(o.getBoundingClientRect().width),dx:Math.round(i.getBoundingClientRect().left-o.getBoundingClientRect().left)}:null});
 ok(ind&&Math.abs(ind.w-ind.bw)<=1&&Math.abs(ind.dx)<=1,tag+' tab indicator sits under the pressed tab: '+JSON.stringify(ind));
 // open, delete needs two taps
 await p.click('.sn-item');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.querySelector('#snH2').textContent==='The father who runs'&&document.querySelector('#sn_who').value==='Pastor Thabo'),tag+' tapping it opens the notes');
 await p.click('#snDel');await p.waitForTimeout(150);
 ok(await p.evaluate(()=>/Tap again/.test(document.querySelector('#snDel').textContent)&&!!document.querySelector('#sn')),tag+' first Delete tap only asks');
 if(w===390&&cs==='light')await p.screenshot({path:`${__dirname}/s61/del-${tag}.png`});
 await p.click('#snDel');await p.waitForTimeout(500);
 const s3=await p.evaluate(()=>({sn:Object.values(JSON.parse(localStorage.getItem('lamp-state-v1')).sn||{}).filter(Boolean).length,sheet:!!document.querySelector('#sn'),empty:document.querySelector('.sn-empty')?.innerText}));
 ok(s3.sn===0&&!s3.sheet&&/Take sermon notes/.test(s3.empty||''),tag+' second tap deletes; Journal offers to take notes: '+JSON.stringify(s3));
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// the week after: the one thing comes back, can be hidden, and older sermons don't show
{const st={...ST,sn:{s1:{d:'2026-11-08',t:'The father who runs',who:'Pastor Thabo',ref:'Luke 15',body:'He ran.',act:'Phone my brother this week',at:'2026-11-08T08:00:00Z'},s0:{d:'2026-10-25',t:'Older',act:'Old thing',at:'2026-10-25T08:00:00Z'}}};
 for(const cs of ['light','dark'])for(const w of [390,1440]){const {ctx,p,errs}=await open({w,h:w<800?844:900,cs,now:TUE,st});const tag=w+'-'+cs;
  const c=await p.evaluate(()=>document.querySelector('#snCard')?.innerText.replace(/\n/g,' | '));
  ok(/From Sunday's sermon/i.test(c||'')&&/One thing to live out/.test(c)&&/Phone my brother this week/.test(c)&&/The father who runs · Pastor Thabo/.test(c),tag+' Tuesday: the one thing comes back: '+c);
  await p.evaluate(()=>document.querySelector('#snCard').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s61/week-${tag}.png`});
  if(w===390&&cs==='light'){await p.click('#snCGo');await p.waitForTimeout(400);ok(await p.evaluate(()=>document.querySelector('#snH2')?.textContent==='The father who runs'),'Open the notes opens them');
   await p.click('#shX');await p.waitForTimeout(300);
   await p.click('#snCX');await p.waitForTimeout(500);ok(await p.evaluate(()=>!document.querySelector('#snCard')&&localStorage.getItem('lamp-sn-x-s1')==='1'),'X hides the reminder');
   await p.reload();await p.waitForTimeout(1600);ok(await p.evaluate(()=>!document.querySelector('#snCard')),'it stays hidden after a reload')}
  ok(!errs.length,tag+' week: no page errors '+errs.join('|'));await ctx.close()}
 const {ctx,p}=await open({w:390,h:844,cs:'light',now:'2026-11-16T10:00:00+02:00',st});
 ok(await p.evaluate(()=>!document.querySelector('#snCard')),'8 days later (a Monday): no reminder');await ctx.close()}
// Sunday: "Don't ask on Sundays", Escape keeps typing, search finds it, keyboard
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light',rm:'no-preference',st:{...ST,notes:{1:{what:'Jesus was baptised',at:'2026-10-20T08:00:00Z'}}}});
 await p.focus('#snCGo');await p.keyboard.press('Enter');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>document.activeElement?.id==='sn_ref'),'keyboard: Enter on the card opens the sheet on Passage');
 await p.keyboard.type('Psalm 23');await p.keyboard.press('Tab');await p.keyboard.press('Tab');
 const f=await p.evaluate(()=>document.activeElement?.id);ok(f==='sn_t'||f==='snGo','keyboard: Tab moves through the form ('+f+')');
 await p.fill('#sn_body','Goodness and mercy follow me');await p.keyboard.press('Escape');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!document.querySelector('#sn')&&Object.values(JSON.parse(localStorage.getItem('lamp-state-v1')).sn||{}).some(x=>x&&/mercy/.test(x.body))),'Escape closes and keeps what you typed');
 await p.evaluate(()=>{jTab='notes';setView('journal')});await p.waitForTimeout(600);
 // indicator slides when motion is on
 await p.click('.seg button[data-tab="pray"]');await p.waitForTimeout(60);
 const mid=await p.evaluate(()=>{const i=document.querySelector('.seg-ind'),o=document.querySelector('.seg button[aria-pressed="true"]');return Math.round(i.getBoundingClientRect().left-o.getBoundingClientRect().left)});
 await p.waitForTimeout(500);
 const end=await p.evaluate(()=>{const i=document.querySelector('.seg-ind'),o=document.querySelector('.seg button[aria-pressed="true"]');return Math.round(i.getBoundingClientRect().left-o.getBoundingClientRect().left)});
 ok(mid<-5&&Math.abs(end)<=1,'motion on: the tab indicator slides from Notes to Prayers ('+mid+' → '+end+')');
 const q=await p.evaluate(async()=>{const i=document.querySelector('#jq');if(!i)return 'no search';i.value='mercy';i.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,300));return document.querySelector('#jRes')?.innerText.replace(/\n/g,' | ')});
 ok(/Sermon/i.test(q||'')&&/Psalm 23/.test(q),'journal search finds sermon notes: '+q);
 await p.click('#jRes [data-jgo]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.querySelector('#snH2')?.textContent==='Psalm 23'),'a search result opens the notes');
 await p.evaluate(()=>$('#scrim')?.remove());
 await p.evaluate(()=>setView('today'));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>/Your notes from church/.test(document.querySelector('#snCard')?.innerText||'')),'Today shows your notes after Escape');
 await p.evaluate(()=>{state.sn={};lsWrite();render()});await p.waitForTimeout(300);
 await p.click('#snOff');await p.waitForTimeout(500);await p.reload();await p.waitForTimeout(1600);
 ok(await p.evaluate(()=>!document.querySelector('#snCard')&&state.settings.snSun===false),"Don't ask on Sundays sticks");
 const bank=await p.evaluate(async()=>{const F=await loadFun();const nw=F.q.slice(512,528);return {n:F.q.length,ok:nw.every(x=>x.a.length===4&&new Set(x.a).size===4&&/^[1-3A-Z]{3}\.\d+\.\d+$/.test(x.ref)&&x.c!=='books'),books:[...new Set(nw.map(x=>x.ref.split('.')[0]))].sort().join(',')}});
 ok(bank.n>=528&&bank.ok&&bank.books==='1PE,COL,JOB,NEH','16 new questions, well formed: '+JSON.stringify(bank));
 const counts=await p.evaluate(async()=>{const o={};for(const c of ['NEH','JOB','COL','1PE'])o[c]=(await bqPool(c)).length;return o});
 ok(Object.values(counts).every(n=>n>=4),'Nehemiah, Job, Colossians and 1 Peter now get a book quiz: '+JSON.stringify(counts));
 ok(!errs.length,'keyboard: no errors '+errs.join('|'));await ctx.close()}
// signed out (no account): still saves on this device
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',nomock:true});
 await p.evaluate(()=>{jTab='notes';setView('journal')});await p.waitForTimeout(600);await p.click('#snNew');await p.waitForTimeout(400);
 await p.fill('#sn_ref','Romans 8');await p.waitForTimeout(800);
 ok(/Saved on this device/.test(await p.evaluate(()=>document.querySelector('#snS').textContent)),'no account: "Saved on this device"');
 await p.click('#snOk');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>/Romans 8/.test(document.querySelector('.sn-sec')?.innerText||'')),'no account: Done shows it in Journal');
 ok(!errs.length,'signed out: no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
