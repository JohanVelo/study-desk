// v56: a nudge to pray (prayer time reminder on chosen days, from the Prayers tab and Settings, opens the prayer list via #pray);
// an answered prayer folds away and lands glowing in Answered prayers; accuracy: Acts and Paul's letters' book labels
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s71',{recursive:true});
const NOW='2026-11-19T09:00:00+02:00';
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  S.set('gm/u_me',{joined:'2026-01-01',seen:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,rd:{'2026-11-16':true,'2026-11-17':true,'2026-11-19':true},cz:{u_me:{k:0,at:'2026-11-18T16:00:00Z'},u_b:{k:3,at:now}}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,rd:{'2026-11-16':true},cz:{u_me:{k:5,at:'2026-11-19T05:00:00Z'}}});
  S.set('gm/u_c',{joined:'2026-01-04',seen:now,cz:{u_me:{k:2,at:'2026-11-10T06:00:00Z'}}})};
const ST={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(NOW).getTime());
  if(o.block)await ctx.route('**/bib/**',r=>r.abort());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base+(o.hash||''));await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);




const PL={q1:{t:"Mum's operation on Friday",at:'2026-11-01T08:00:00Z',u:'2026-11-01T08:00:00Z'},q2:{t:'Wisdom for my exams',at:'2026-11-05T08:00:00Z',u:'2026-11-05T08:00:00Z'},
  q3:{t:'A job for Thabo',at:'2026-10-01T08:00:00Z',u:'2026-10-12T08:00:00Z',ans:'2026-10-12T08:00:00Z',an:'He starts in January'}};
const STP={...ST,pl:PL};
const toPray=async p=>{await p.evaluate(()=>{jTab='pray';setView('journal')});await p.waitForTimeout(700)};
const shot=async(p,n)=>{await p.waitForTimeout(350);await p.screenshot({path:`${__dirname}/s71/${n}.png`})};
const BK=c=>BSB(c);

// 1. accuracy and the calendar rule
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const BI=await p.evaluate(()=>Object.fromEntries(['ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM'].map(k=>[k,BOOKINFO[k]])));
 const Q={'ROM.3':'all have sinned','ROM.8':'no condemnation','ROM.12':'living sacrifices','1CO.1':'the message of the cross','2CO.4':'jars of clay','2CO.5':'a new creation','2CO.12':'my grace is sufficient','GAL.2':'crucified with christ','EPH.1':'every spiritual blessing','EPH.6':'armor of god','PHP.2':'humbled himself','COL.3':'set your minds on things above','2TH.3':'do not grow weary','1TI.6':'godliness with contentment','2TI.1':'spirit of fear','2TI.3':'god-breathed','2TI.4':'i have finished the race','TIT.2':'the grace of god has appeared','PHP.4':'be anxious for nothing'};
 const LBL={'ROM.3':'All have sinned','ROM.8':'No condemnation','ROM.12':'Living sacrifices','1CO.1':'The message of the cross','2CO.4':'Treasure in jars of clay','2CO.5':'A new creation','2CO.12':'My grace is sufficient','GAL.2':'Crucified with Christ','EPH.1':'Every spiritual blessing','EPH.6':'The armour of God','PHP.2':'Christ humbled himself','COL.3':'Set your minds on things above','2TH.3':'Do not grow weary','1TI.6':'Godliness with contentment','2TI.1':'Not a spirit of fear','2TI.3':'All Scripture is God-breathed','2TI.4':'I have finished the race','TIT.2':'The grace of God has appeared','PHP.4':'Rejoice; be anxious for nothing'};
 const norm=x=>x.toLowerCase().replace(/[’‘]/g,"'");const bad=[];
 for(const [k,ph] of Object.entries(Q)){const [b,c]=k.split('.');const L=BI[b][3].find(x=>x[0]===+c);if(!L||L[1]!==LBL[k])bad.push(k+' label '+(L&&L[1]));if(!norm(BK(b)[c-1].join(' ')).includes(ph))bad.push(k+' text lacks '+ph)}
 ok(!bad.length,'Acts and Paul: 19 chapter labels match the BSB text of their chapter '+bad.join(' / '));
 ok(/no longer as a slave but as a beloved brother/.test(BI.PHM[0])&&!/runaway/.test(BI.PHM[0])&&BK('PHM')[0][15].includes('no longer as a slave')&&BK('PHM')[0][15].includes('beloved brother'),'Philemon follows verse 16 and no longer calls Onesimus a runaway');
 const T=await p.evaluate(()=>[remDaysTxt([0,1,2,3,4,5,6]),remDaysTxt([5,1,2,3,4]),remDaysTxt([0,6]),remDaysTxt([3]),remDaysTxt([0,1,3])]);
 ok(JSON.stringify(T)===JSON.stringify(['Every day','Weekdays','Weekends','Wednesdays','Mon, Wed and Sun']),'day summaries read naturally '+JSON.stringify(T));
 const E=await p.evaluate(()=>{const a=remEvent('pray','06:45',[1,3,5]),b=remEvent('pray','21:00',[0,1,2,3,4,5,6]);return {ar:a.rule,ad:a.st.getDay(),ah:a.st.getHours(),am:a.st.getMinutes(),af:a.st>=new Date(),br:b.rule,ics:ics(a),t:a.title}});
 ok(E.ar==='FREQ=WEEKLY;BYDAY=MO,WE,FR'&&[1,3,5].includes(E.ad)&&E.ah===6&&E.am===45&&E.af,'Mon, Wed and Fri at 06:45 makes a weekly rule that starts on one of those days '+JSON.stringify([E.ar,E.ad]));
 ok(E.br==='FREQ=DAILY','every day makes a daily rule');
 ok(/^RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\r?$/m.test(E.ics)&&/^UID:[A-Za-z0-9-]+@lamp\r?$/m.test(E.ics)&&/SUMMARY:Lamp: time to pray/.test(E.ics),'the calendar file is valid (safe UID, weekly rule)');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 2. Prayers tab: set a prayer time on phone and laptop, light and dark
for(const o of [{w:390,h:844,cs:'light',t:'phone-light'},{w:390,h:844,cs:'dark',t:'phone-dark'},{w:1440,h:900,cs:'light',t:'desk-light'},{w:1440,h:900,cs:'dark',t:'desk-dark'}]){
 const {ctx,p,errs}=await open({...o,st:STP});await toPray(p);
 const row=await txt(p,'#plRem');ok(/Set a time to pray/.test(row),o.t+': the Prayers tab offers a prayer time '+row);
 await shot(p,o.t+'-1-tab');
 const a0=await axe(p,'.plnew');ok(!a0.length,o.t+': axe clean on the prayer card '+JSON.stringify(a0));
 await p.evaluate(()=>{window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null}});
 await p.click('#plRem');await p.waitForSelector('.rem-pray',{timeout:5000});await p.waitForTimeout(300);
 ok(await p.$$eval('[data-rd][aria-pressed="true"]',x=>x.length)===7&&/Every day/.test(await txt(p,'#remSum')),o.t+': all seven days start on');
 ok((await p.$$eval('[data-rd]',x=>x.map(b=>b.textContent))).join(' ')==='Mon Tue Wed Thu Fri Sat Sun',o.t+': the week starts on Monday');
 await p.click('[data-rd="6"]');await p.click('[data-rd="0"]');
 ok(await txt(p,'#remSum')==='Weekdays',o.t+': turning off Saturday and Sunday says Weekdays');
 await p.fill('#remT','06:45');
 if(o.t==='phone-light'||o.t==='phone-dark'||o.t==='desk-light')await shot(p,o.t+'-2-sheet');
 const a1=await axe(p,'.rem-pray');ok(!a1.length,o.t+': axe clean on the sheet '+JSON.stringify(a1));
 await p.click('#remG');await p.waitForTimeout(200);
 const u=await p.evaluate(()=>window.__opened[0]||'');const q=new URL(u).searchParams;
 ok(/calendar\.google\.com/.test(u)&&q.get('recur')==='RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'&&q.get('text')==='Lamp: time to pray'&&/2 prayers on your list/.test(q.get('details')),o.t+': Google Calendar gets a weekday reminder with the list count');
 ok(/T064500\//.test(q.get('dates')),o.t+': at 06:45');
 const sv=await p.evaluate(()=>state.settings.remP);ok(sv&&sv.t==='06:45'&&JSON.stringify(sv.d.slice().sort())==='[1,2,3,4,5]',o.t+': the choice is remembered');
 await p.evaluate(()=>$('#scrim')?.remove());await p.evaluate(()=>render());await p.waitForTimeout(300);
 ok(/Prayer time 06:45/.test(await txt(p,'#plRem'))&&/Weekdays/.test(await txt(p,'#plRem')),o.t+': the tab shows the prayer time');
 if(o.t==='phone-light')await shot(p,o.t+'-3-tab-set');
 await p.click('#plRem');await p.waitForSelector('.rem-pray');ok(await p.$$eval('[data-rd][aria-pressed="true"]',x=>x.length)===5&&await p.$eval('#remT',e=>e.value)==='06:45',o.t+': opening again shows the saved choice');
 for(const d of [1,2,3,4])await p.click(`[data-rd="${d}"]`);await p.click('[data-rd="5"]');await p.waitForTimeout(150);
 ok(await p.$eval('[data-rd="5"]',b=>b.getAttribute('aria-pressed'))==='true'&&/at least one day/.test(await txt(p,'#toast')),o.t+': the last day cannot be turned off');
 ok(!errs.length,o.t+': no errors '+errs.join(' / '));await ctx.close()}

// 3. installed app: the phone calendar file, Settings row, and the #pray link
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:STP});
 await p.evaluate(()=>{window.LAMP_APP={standalone:true};window.__a=[];HTMLAnchorElement.prototype.click=function(){window.__a.push([this.href,this.getAttribute('download')])}});
 await p.evaluate(()=>openSettings?.()||document.querySelector('[data-settings]').click());await p.waitForTimeout(800);
 ok(!!(await p.$('#remPray')),'Settings has a Prayer time reminder');
 await p.click('#remPray');await p.waitForSelector('.rem-pray');await p.click('#remIcs');await p.waitForTimeout(150);
 const [h,dl]=await p.evaluate(()=>window.__a[0]||['','']);const t=decodeURIComponent(h.replace(/^data:text\/calendar;charset=utf-8,/,''));
 ok(/RRULE:FREQ=DAILY/.test(t)&&/#pray/.test(t)&&(dl==='lamp-prayer.ics'||dl===null),'the phone calendar file repeats daily and opens the prayer list');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:STP,hash:'#pray'});
 const v=await p.evaluate(()=>[view,jTab,document.querySelector('.seg button[aria-pressed="true"]')?.textContent||'']);
 ok(v[0]==='journal'&&v[1]==='pray'&&/Prayers/.test(v[2])&&!!(await p.$('#plRem')),'opening Lamp with #pray shows the prayer list '+JSON.stringify(v));
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 4. feel: an answered prayer folds away and lands glowing in Answered prayers
for(const rm of ['no-preference','reduce']){const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:STP,rm});await toPray(p);
 await p.click('[data-pla="q1"]');await p.fill('[data-plaf="q1"] input','The operation went well');await p.click('[data-plaf="q1"] button');
 if(rm!=='reduce'){await p.waitForTimeout(700);const an=await p.evaluate(()=>{const c=document.querySelector('.plc[data-pl="q1"]');return c?c.getAnimations().length:-1});ok(an>0,'motion on: the card folds away')}
 await p.waitForSelector('.pl-tl li.pl-new[data-pl="q1"]',{timeout:4000});
 const vis=await p.evaluate(()=>{const r=document.querySelector('.pl-tl li[data-pl="q1"]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight});
 ok(vis&&!(await p.$('.plc[data-pl="q1"]')),rm+': it lands in Answered prayers, in view, marked as new');
 ok(/The operation went well/.test(await txt(p,'.pl-tl li[data-pl="q1"]')),rm+': with how it was answered');
 if(rm!=='reduce'){await p.waitForTimeout(250);await shot(p,'answered-land')}
 await p.waitForTimeout(2800);ok(!(await p.$('.pl-tl li.pl-new')),rm+': the glow fades');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

console.log(log.join('\n'));console.log(fails?`FAILED ${fails}`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
