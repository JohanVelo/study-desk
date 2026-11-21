// v57: notes on verses (Note in the verse bar, a pen marker in the reader, Journal > Verses, search, sync merge);
// verse bar buttons are 44 px; accuracy: Hebrews to Revelation labels; v56 day buttons' names include their text
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s72',{recursive:true});
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





const VN={'PSA.23.1':{ref:'Psalm 23:1',t:'Read this the night before my exam. The Lord is my shepherd, so I am not alone.',q:'The LORD is my shepherd; I shall not want.',at:'2026-11-15T19:00:00Z',u:'2026-11-15T19:00:00Z'}};
const STV={...ST,vn:VN,pl:{q1:{t:'Peace for my exams',at:'2026-11-05T08:00:00Z',u:'2026-11-05T08:00:00Z'}}};
const toVerses=async p=>{await p.evaluate(()=>{jTab='verses';setView('journal')});await p.waitForTimeout(700)};
const shot=async(p,n)=>{await p.waitForTimeout(350);await p.screenshot({path:`${__dirname}/s72/${n}.png`})};
const openR=async(p,b,c,v)=>{await p.evaluate(([b,c,v])=>openPassage(passFor(b,c),false,v),[b,c,v]);await p.waitForSelector('#scr .v',{timeout:15000});await p.waitForTimeout(900)};

// 1. accuracy + sync
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const BI=await p.evaluate(()=>Object.fromEntries(['HEB','JAS','1PE','2PE','1JN','JUD','REV','3JN'].map(k=>[k,BOOKINFO[k]])));
 const Q={'HEB.1':['God has spoken by his Son','spoken to us by his son'],'HEB.4':['Our great high priest','a great high priest'],'JAS.2':['Faith without deeds is dead','faith without deeds is dead'],'JAS.3':['Taming the tongue','tame the tongue'],'1PE.1':['A living hope','a living hope'],'1PE.2':['A chosen people','a chosen people'],'1PE.5':['Cast your anxiety on him','cast all your anxiety on him'],'2PE.1':['Everything we need','everything we need'],'2PE.3':['The Lord is patient','is patient with you'],'1JN.1':['Walking in the light','walk in the light'],'1JN.3':['What manner of love','what manner of love'],'1JN.4':['God is love','god is love'],'JUD.1':['Keep yourselves in the love of God','keep yourselves in the love of god'],'REV.5':['The Lamb is worthy','worthy is the lamb'],'REV.21':['A new heaven and earth','a new heaven and a new earth'],'REV.22':['Come, Lord Jesus','come, lord jesus'],'3JN.1':['Walking in the truth','walking in the truth']};
 const bad=[];for(const [k,[l,ph]] of Object.entries(Q)){const [b,c]=k.split('.');const L=BI[b][3].find(x=>x[0]===+c);if(!L||L[1]!==l)bad.push(k+' label '+(L&&L[1]));if(!BSB(b)[c-1].join(' ').toLowerCase().replace(/’/g,"'").includes(ph))bad.push(k+' text lacks '+ph)}
 ok(!bad.length,'Hebrews to Revelation: 17 chapter labels match the BSB text of their chapter '+bad.join(' / '));
 ok(/keep you from stumbling/.test(BI.JUD[0])&&BSB('JUD')[0][23].includes('keep you from stumbling'),'Jude\'s summary uses verse 24\'s words');
 const m=await p.evaluate(()=>{state.vn={'JHN.3.16':{ref:'John 3:16',t:'old',at:'2026-11-01T00:00:00Z',u:'2026-11-01T00:00:00Z'}};
   merge({vn:{'JHN.3.16':{ref:'John 3:16',t:'newer from my phone',at:'2026-11-01T00:00:00Z',u:'2026-11-10T00:00:00Z'},'ROM.8.28':{ref:'Romans 8:28',t:'from laptop',u:'2026-11-02T00:00:00Z'}}});const a=state.vn['JHN.3.16'].t,b=state.vn['ROM.8.28'].t;
   merge({vn:{'JHN.3.16':{ref:'John 3:16',t:'stale',u:'2026-10-01T00:00:00Z'}}});const c=state.vn['JHN.3.16'].t;merge({vn:{'ROM.8.28':null}});return [a,b,c,state.vn['ROM.8.28']]});
 ok(m[0]==='newer from my phone'&&m[1]==='from laptop'&&m[2]==='newer from my phone'&&m[3]===null,'notes sync between devices: newer wins, deletes carry over '+JSON.stringify(m));
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 2. write a note from the reader, on phone and laptop, light and dark
for(const o of [{w:390,h:844,cs:'light',t:'phone-light'},{w:390,h:844,cs:'dark',t:'phone-dark'},{w:1440,h:900,cs:'light',t:'desk-light'},{w:1440,h:900,cs:'dark',t:'desk-dark'}]){
 const {ctx,p,errs}=await open(o);await openR(p,'JHN',3,16);
 ok(!!(await p.$('#vbar #vNote'))&&(await p.$eval('#vNote',b=>b.textContent))==='Note',o.t+': the verse bar has Note');
 const hs=await p.$$eval('#vbar>button',x=>x.map(b=>Math.round(b.getBoundingClientRect().height)));ok(hs.length>=8&&hs.every(h=>h>=44),o.t+': every verse bar button is at least 44 px tall '+hs.join(','));
 const fit=await p.$eval('#vbar',b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth});ok(fit,o.t+': the verse bar fits on screen');
 if(o.t!=='desk-light')await shot(p,o.t+'-1-bar');
 const a0=await axe(p,'#vbar');ok(!a0.length,o.t+': axe clean on the verse bar '+JSON.stringify(a0));
 await p.click('#vNote');await p.waitForSelector('#vnote',{timeout:5000});await p.waitForTimeout(400);
 ok(!(await p.$('#vbar')),o.t+': the verse bar closes when the note opens');
 const q=await txt(p,'.vn-q');ok(/For God so loved the world/.test(q)&&/John 3:16/.test(await txt(p,'.vn-ref')),o.t+': the note sheet shows the verse');
 ok(await p.evaluate(()=>document.activeElement.id)==='vnT',o.t+': the cursor is ready in the note');
 await p.click('#vnSave');await p.waitForTimeout(200);ok(/Write something first/.test(await txt(p,'#vnC'))&&!!(await p.$('#vnote')),o.t+': an empty note is not saved');
 await p.fill('#vnT','God gave first. That is what love looks like.\nAsk the group on Thursday what "perish" means.');
 if(o.t!=='desk-dark')await shot(p,o.t+'-2-sheet');
 const a1=await axe(p,'#vnote');ok(!a1.length,o.t+': axe clean on the note sheet '+JSON.stringify(a1));
 await p.click('#vnSave');await p.waitForTimeout(600);
 const sv=await p.evaluate(()=>state.vn['JHN.3.16']);ok(sv&&/what love looks like/.test(sv.t)&&sv.ref==='John 3:16'&&/so loved/.test(sv.q)&&sv.u,o.t+': the note is saved with the verse');
 ok(await p.evaluate(()=>!!pending.vn&&!!pending.vn['JHN.3.16']),o.t+': and queued to sync');
 ok(!!(await p.$('#scr .vn-mk[data-vnk="JHN.3.16"]'))&&(await p.$$('#scr .vn-mk')).length===1,o.t+': a pen marker appears after verse 16');
 const after=await p.evaluate(()=>{const m=document.querySelector('#scr .vn-mk'),w=m.parentElement,v=w.closest('.v'),r=m.getBoundingClientRect(),wr=w.getBoundingClientRect();return [v&&v.dataset.vn,w.classList.contains('vn-nw'),/life\.$/.test(w.textContent.trim()),Math.abs(r.top+r.height/2-(wr.top+wr.height/2))<14]});ok(after[0]==='16'&&after[1]&&after[2]&&after[3],o.t+': the marker sits on the last word of verse 16 '+JSON.stringify(after));
 await p.evaluate(()=>document.querySelector('#scr .vn-mk').scrollIntoView({block:'center'}));
 if(o.t!=='desk-dark')await shot(p,o.t+'-3-marker');
 await p.click('#scr .vn-mk');await p.waitForSelector('#vnote');ok(/what love looks like/.test(await p.$eval('#vnT',e=>e.value))&&(await p.$eval('#vnSave',b=>b.textContent))==='Save changes',o.t+': tapping the marker opens the note to edit');
 await p.evaluate(()=>$('#scrim')?.remove());
 await p.click('#scr .v[data-vn="16"]');await p.waitForTimeout(250);ok((await p.$eval('#vNote',b=>b.textContent))==='Edit note',o.t+': the verse bar now says Edit note');
 ok(!errs.length,o.t+': no errors '+errs.join(' / '));await ctx.close()}

// 3. delete takes two taps; the marker goes
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:STV});await openR(p,'PSA',23,1);
 ok(!!(await p.$('#scr .vn-mk[data-vnk="PSA.23.1"]')),'a saved note shows its marker when the chapter opens');
 await p.evaluate(()=>$('#vbar #vX')?.click());await p.click('#scr .vn-mk');await p.waitForSelector('#vnDel');
 await p.click('#vnDel');ok((await p.$eval('#vnDel',b=>b.textContent))==='Tap again to delete'&&await p.evaluate(()=>!!state.vn['PSA.23.1']),'the first tap only asks');
 await p.click('#vnDel');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>state.vn['PSA.23.1']===null)&&!(await p.$('#scr .vn-mk'))&&!(await p.$('#scr .vn-nw')),'the second tap deletes it and the marker goes');
 ok(/(I shall not want|I shall lack nothing)\. *$/.test(await p.$$eval('#scr .v[data-vn="1"]',es=>es.map(e=>e.textContent).join(" ")))&&await p.evaluate(()=>!document.querySelector('#scr').textContent.match(/\b(\w+)\.?\1\b/)),'the verse text is whole again');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 4. Journal > Verses shows notes; search finds them; Read opens the verse
for(const o of [{w:390,h:844,cs:'light',t:'phone-light'},{w:1440,h:900,cs:'dark',t:'desk-dark'}]){
 const {ctx,p,errs}=await open({...o,st:STV});await toVerses(p);
 const t=await txt(p,'#view');ok(/Your notes on verses/.test(t)&&/night before my exam/.test(t)&&!/Verses worth keeping/.test(t),o.t+': with only a note, Verses shows the note instead of the empty card');
 ok(/Verses \u00b7 1/.test(await p.$eval('.seg button[data-tab="verses"]',b=>b.textContent)),o.t+': the Verses count includes notes');
 await shot(p,o.t+'-4-journal');
 const a=await axe(p,'.vn-sec');ok(!a.length,o.t+': axe clean on the notes list '+JSON.stringify(a));
 await p.click('[data-vned="PSA.23.1"]');await p.waitForSelector('#vnote');await p.fill('#vnT','Edited from the journal');await p.click('#vnSave');await p.waitForTimeout(700);
 ok(/Edited from the journal/.test(await txt(p,'.vn-sec')),o.t+': Edit from the journal updates the list');
 await p.fill('#jq','edited journal');await p.waitForTimeout(500);
 ok(/Verse note/i.test(await txt(p,'#jRes'))&&/Psalm 23:1/.test(await txt(p,'#jRes')),o.t+': journal search finds the note');
 await p.click('#jRes [data-jgo="n:PSA.23.1"]');await p.waitForSelector('#scr .v',{timeout:15000});await p.waitForTimeout(800);
 ok(await p.evaluate(()=>R&&R.p.book==='PSA'&&R.p.ch===23&&R.sel===1),o.t+': the search result opens Psalm 23 at verse 1');
 ok(!errs.length,o.t+': no errors '+errs.join(' / '));await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:{...STV,saved:{'JHN.11.35':{ref:'John 11:35',text:'Jesus wept.',tr:'BSB',v:35,at:'2026-11-10T08:00:00Z'}}}});await toVerses(p);
 const t=await txt(p,'#view');ok(/Your notes on verses/.test(t)&&/Saved verses/.test(t)&&/Jesus wept/.test(t)&&/Verses \u00b7 2/.test(await p.$eval('.seg button[data-tab="verses"]',b=>b.textContent)),'notes and saved verses show together, each with a heading');
 await p.click('[data-vnread="PSA.23.1"]');await p.waitForSelector('#scr .v',{timeout:15000});ok(await p.evaluate(()=>R.p.book==='PSA'&&R.sel===1),'Read opens the verse');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 5. v56 fix: prayer day buttons read their full day name and still show three letters
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>openRemind('pray'));await p.waitForSelector('.rem-pray');
 const n=await p.$$eval('[data-rd]',x=>x.map(b=>[b.firstChild.textContent,b.textContent]));ok(n[0][0]==='Mon'&&n[0][1]==='Monday'&&n[6][1]==='Sunday',"day buttons show 'Mon' and are named 'Monday'");
 const a=await axe(p,'.rem-pray');ok(!a.length,'axe clean on the prayer time sheet '+JSON.stringify(a));
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

console.log(log.join('\n'));console.log(fails?`FAILED ${fails}`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
