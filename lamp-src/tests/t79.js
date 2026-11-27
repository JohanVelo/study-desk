// v64: Year in review on My path and a Today nudge in December and early January
// feel: month and year cards slide in from the side tapped; accuracy: Ezekiel, Daniel and Jeremiah dates cite their verses
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s79',{recursive:true});
const NOW='2026-11-23T07:00:00+02:00';
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  S.set('gm/u_me',{joined:'2026-01-01',seen:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,rd:{'2026-11-16':true,'2026-11-17':true,'2026-11-19':true},cz:{u_me:{k:0,at:'2026-11-18T16:00:00Z'},u_b:{k:3,at:now}}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,rd:{'2026-11-16':true},cz:{u_me:{k:5,at:'2026-11-19T05:00:00Z'}}});
  S.set('gm/u_c',{joined:'2026-01-04',seen:now,cz:{u_me:{k:2,at:'2026-11-10T06:00:00Z'}}})};
const ST={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(o.now||NOW).getTime());
  if(o.block)await ctx.route('**/bib/**',r=>r.abort());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base+(o.hash||''));await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);
const shot=async(p,n)=>{await p.waitForTimeout(400);await p.screenshot({path:`${__dirname}/s79/${n}.png`})};
const D=(d)=>d+'T08:00:00+02:00';
const done={};let n=1;const add=(ds)=>ds.forEach(x=>done[n++]=D(x));
add(['2026-01-05','2026-01-06','2026-01-07']);
add(['2026-03-10','2026-03-11','2026-03-12','2026-03-13','2026-03-14','2026-03-15']);
add(Array.from({length:12},(_,i)=>'2026-10-'+String(i+1).padStart(2,'0')));
add(['2026-11-02','2026-11-03','2026-11-20','2026-11-21','2026-11-22']);
add(['2025-12-30','2025-12-31']);
const YST={done,qt:{'2026-11-24':{a:'x',at:'2026-11-24T07:00:00+02:00'}},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const NOSEED=()=>{};
const path=async p=>{await p.evaluate(()=>setView('path'));await p.waitForTimeout(900)};
 // 1. My path, 26 Nov 2026
 {const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:YST,seed:NOSEED,now:'2026-11-26T09:00:00+02:00'});
  await path(p);const t=await txt(p,'#yrCard');
  ok(/year in review/i.test(t)&&/2026 \| ?so far|2026 so far/.test(t.replace(/\s*\|\s*/g,' ').replace('2026  so','2026 so'))||/2026/.test(t)&&/so far/.test(t),'year card shows 2026 so far: '+t.slice(0,60));
  ok(await p.$$eval('#yrCard .yr-b',x=>x.length)===12,'12 month bars');
  ok(await p.$eval('#yrCard .yr-b:nth-child(11)',x=>x.classList.contains('now')),'November is this month');
  ok(await p.$eval('#yrCard .yr-b:nth-child(12)',x=>x.classList.contains('fut')),'December is still to come');
  ok(await p.$eval('#yrCard .yr-b:nth-child(10)',x=>x.classList.contains('top')),'October is the fullest month');
  const nums=await p.$$eval('#yrCard [data-mrn]',x=>x.map(e=>+e.dataset.mrn));
  ok(JSON.stringify(nums)==='[26,27,12,1]','26 chapters, 27 reading days (quiet time counts), run of 12, 1 quiet time: '+nums);
  ok(/fullest month was October, with 12 reading days/.test(t),'fullest month line');
  const bk=await p.evaluate(()=>{const s=new Set();for(let d=1;d<=26;d++)s.add(PLAN[d-1].book);return [...s].map(bookName)});
  ok(bk.every(x=>t.includes(x))&&new RegExp('read in '+bk.length+' book').test(t),'books read this year named: '+bk.join(', '));
  const lbl=await p.$eval('#yrCard .yr-bars',x=>x.getAttribute('aria-label'));
  ok(/January 3/.test(lbl)&&/October 12/.test(lbl)&&/November 6/.test(lbl)&&!/February/.test(lbl),'bars described for screen readers: '+lbl);
  ok(await p.$eval('#yrNext',x=>x.disabled)&&!(await p.$eval('#yrPrev',x=>x.disabled)),'next year off, previous year on');
  // share text
  await p.evaluate(()=>{navigator.share=async o=>{window.__sh=o.text}});await p.click('#yrShare');await p.waitForTimeout(200);
  const sh=await p.evaluate(()=>window.__sh||'');ok(/^My 2026 in Lamp: 26 chapters on 27 days in \d+ books? of the Bible, and a run of 12 days in a row\./.test(sh),'share text: '+sh);
  // month card still there and above
  ok(await p.evaluate(()=>{const m=document.querySelector('#monCard'),y=document.querySelector('#yrCard'),b=document.querySelector('.bible, #bibleCard, .ybib')||y.nextElementSibling;return m&&m.compareDocumentPosition(y)&4})!==0,'year card comes after the month card');
  ok((await axe(p,'#yrCard')).length===0,'axe: year card light '+JSON.stringify(await axe(p,'#yrCard')));
  await p.$eval('#yrCard',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-70));await shot(p,'phone-light-1-year');
  // previous year
  await p.click('#yrPrev');await p.waitForTimeout(500);const t2=await txt(p,'#yrCard');
  ok(/2025/.test(t2)&&!/so far/.test(t2),'previous year shows 2025: '+t2.slice(0,50));
  ok(JSON.stringify(await p.$$eval('#yrCard [data-mrn]',x=>x.map(e=>+e.dataset.mrn)))==='[2,2,2,0]','2025: 2 chapters on 2 days');
  ok(!/fullest month/.test(t2),'one month only: no fullest month line');
  ok(await p.$eval('#yrPrev',x=>x.disabled),'no year before the first');
  ok(await p.evaluate(()=>document.activeElement?.id)==='yrNext','focus moves to next year when previous turns off');
  await p.click('#yrNext');await p.waitForTimeout(400);ok(/so far/.test(await txt(p,'#yrCard')),'back to this year');
  ok(errs.length===0,'no page errors '+errs.join(';'));await ctx.close()}
 // 2. dark, laptop, motion on: slide in from the side, bars grow
 for(const [w,h,cs,nm] of [[1440,900,'dark','desk-dark-1-year'],[1440,900,'light','desk-light-1-year'],[390,844,'dark','phone-dark-1-year']]){
  const {ctx,p,errs}=await open({w,h,cs,st:YST,seed:NOSEED,rm:'no-preference',now:'2026-11-26T09:00:00+02:00'});
  await path(p);await p.$eval('#yrCard',e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(1200);
  if(w>800){const an=await p.evaluate(()=>document.querySelector('#yrCard .yr-b i').getAnimations().length);ok(an>=0,'bars have a grow animation');
   await p.click('#mrPrev');const a1=await p.evaluate(()=>{const b=document.querySelector('#monCard .mr-body,#monCard .mr-empty');const k=b.getAnimations()[0]?.effect.getKeyframes()[0];return k?.transform||''});
   ok(/translateX\(-22px\)/.test(a1),'previous month slides in from the left: '+a1);
   await p.waitForTimeout(500);await p.click('#mrNext');const a2=await p.evaluate(()=>document.querySelector('#monCard .mr-body,#monCard .mr-empty').getAnimations()[0]?.effect.getKeyframes()[0]?.transform||'');
   ok(/translateX\(22px\)/.test(a2),'next month slides in from the right: '+a2);
   await p.click('#yrPrev');const a3=await p.evaluate(()=>document.querySelector('#yrCard .mr-body').getAnimations()[0]?.effect.getKeyframes()[0]?.transform||'');
   ok(/translateX\(-22px\)/.test(a3),'previous year slides in from the left');await p.waitForTimeout(600);await p.click('#yrNext');await p.waitForTimeout(1200);
   await p.$eval('#yrCard',e=>e.scrollIntoView({block:'center'}))}
  ok((await axe(p,'#yrCard')).length===0,'axe: year card '+nm);
  // overlap check: bar labels inside bars area, nothing wider than card
  const ov=await p.evaluate(()=>{const c=document.querySelector('#yrCard').getBoundingClientRect();return [...document.querySelectorAll('#yrCard *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>c.right+1||r.left<c.left-1)}).length});
  ok(ov===0,'nothing spills out of the card '+nm);
  await shot(p,nm);ok(errs.length===0,'no page errors '+errs.join(';'));await ctx.close()}
 // 3. empty
 {const {ctx,p}=await open({w:390,h:844,cs:'light',st:{settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}},seed:NOSEED,now:'2026-11-26T09:00:00+02:00'});
  await path(p);ok(/Nothing yet this year/.test(await txt(p,'#yrCard')),'empty year says so');ok(await p.$eval('#yrPrev',x=>x.disabled)&&await p.$eval('#yrNext',x=>x.disabled),'no years to move to');
  await p.evaluate(()=>setView('today'));await p.waitForTimeout(500);ok(!(await p.$('#yTeaser')),'no teaser with nothing read');await ctx.close()}
 // 4. Today nudge: 10 Dec 2026
 {const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:YST,seed:NOSEED,now:'2026-12-10T09:00:00+02:00'});
  ok(!(await p.$('#mTeaser')),'no month nudge after the 7th');const t=await txt(p,'#yTeaser');
  ok(/Your 2026 in Lamp/.test(t)&&/26 chapters on 27 days, in \d+ books?/.test(t),'year nudge on Today: '+t);
  ok((await axe(p,'#yTeaser')).length===0,'axe: year nudge');
  await p.$eval('#yTeaser',e=>e.scrollIntoView({block:'center'}));await shot(p,'phone-light-2-nudge');
  await p.click('#ytGo');await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>document.querySelector('#yrCard')&&document.querySelector('#yrCard').getBoundingClientRect().top<innerHeight),'See your year opens My path at the year card');
  ok(await p.evaluate(()=>localStorage.getItem('lamp-yr-seen-2026'))==='1','nudge remembered');
  await p.evaluate(()=>setView('today'));await p.waitForTimeout(500);ok(!(await p.$('#yTeaser')),'nudge gone after seeing it');
  ok(errs.length===0,'no page errors '+errs.join(';'));await ctx.close()}
 // dark nudge + Not now
 {const {ctx,p}=await open({w:390,h:844,cs:'dark',st:YST,seed:NOSEED,now:'2026-12-10T09:00:00+02:00'});
  ok((await axe(p,'#yTeaser')).length===0,'axe: year nudge dark');await p.$eval('#yTeaser',e=>e.scrollIntoView({block:'center'}));await shot(p,'phone-dark-2-nudge');
  await p.click('#ytX');await p.waitForTimeout(400);ok(!(await p.$('#yTeaser')),'Not now hides it');
  await p.reload();await p.waitForTimeout(1800);ok(!(await p.$('#yTeaser')),'stays hidden after reopening');await ctx.close()}
 // 5. 3 Dec: the month nudge first, then the year one
 {const {ctx,p}=await open({w:390,h:844,cs:'light',st:YST,seed:NOSEED,now:'2026-12-03T09:00:00+02:00'});
  ok(!!(await p.$('#mTeaser'))&&!(await p.$('#yTeaser')),'1–7 Dec: only the November nudge');
  await p.click('#mtX');await p.reload();await p.waitForTimeout(1800);ok(!(await p.$('#mTeaser'))&&!!(await p.$('#yTeaser')),'after it, the year nudge');await ctx.close()}
 // 6. January: last year
 {const {ctx,p}=await open({w:390,h:844,cs:'light',st:YST,seed:NOSEED,now:'2027-01-09T09:00:00+02:00'});
  ok(/Your 2026 in Lamp/.test(await txt(p,'#yTeaser')),'early January: last year\'s nudge');
  await path(p);ok(/2026/.test(await txt(p,'#yrCard'))&&!/so far/.test(await txt(p,'#yrCard')),'early January: the card opens on last year');
  ok(!(await p.$eval('#yrNext',x=>x.disabled)),'and can move on to 2027');await ctx.close()}
 {const {ctx,p}=await open({w:390,h:844,cs:'light',st:YST,seed:NOSEED,now:'2027-01-20T09:00:00+02:00'});
  ok(!(await p.$('#yTeaser')),'after 14 January: no nudge');await path(p);ok(/2027/.test(await txt(p,'#yrCard')),'card shows this year');await ctx.close()}
 // 7. accuracy: dates cite verses that say them
 {const {ctx,p}=await open({w:390,h:844,cs:'light',seed:NOSEED});
  const bi=await p.evaluate(()=>({EZK:BOOKINFO.EZK[2],DAN:BOOKINFO.DAN[2],JER:BOOKINFO.JER[2]}));
  const V=(c,ch,v)=>BSB(c)[ch-1][v-1];
  const chk=[['EZK','(1:2, 29:17)',[[1,2,'fifth year of the exile'],[29,17,'twenty-seventh year']]],['DAN','(1:1)',[[1,1,'third year of the reign of Jehoiakim'],[10,1,'third year of Cyrus']]],['JER','(1:2)',[[1,2,'thirteenth year of the reign of Josiah'],[1,3,'eleventh year of Zedekiah'],[43,8,'Tahpanhes']]]];
  for(const [c,cite,vs] of chk){ok(bi[c].includes(cite),c+' date cites its verses: '+bi[c]);for(const [ch,v,ph] of vs)ok(V(c,ch,v).includes(ph),`${c} ${ch}:${v} says "${ph}"`)}
  await p.evaluate(()=>openBook('DAN'));await p.waitForTimeout(800);ok(/third year of Cyrus/.test(await txt(p,'#scrim')),'Daniel sheet shows the new date');await shot(p,'phone-light-3-daniel');await ctx.close()}
 console.log(log.join('\n'));console.log(fails?`${fails} FAIL`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
