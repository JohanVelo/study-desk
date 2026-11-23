// v60: Pray with ACTS (Adore, Confess, Thank, Ask), focus returns after full-screen prayer;
// accuracy: the prophets labels (Isaiah to Malachi)
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s75',{recursive:true});
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
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(NOW).getTime());
  if(o.block)await ctx.route('**/bib/**',r=>r.abort());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base+(o.hash||''));await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);





const shot=async(p,n)=>{await p.waitForTimeout(350);await p.screenshot({path:`${__dirname}/s75/${n}.png`})};
const STP={...ST,pl:{a1:{t:'Peace for my exams',at:'2026-11-05T08:00:00Z',u:'2026-11-05T08:00:00Z'},a2:{t:'Mum\'s knee operation',at:'2026-11-10T08:00:00Z',dw:7,u:'2026-11-10T08:00:00Z'},a3:{t:'Our group to grow',at:'2026-10-01T08:00:00Z',u:'2026-10-01T08:00:00Z'},a4:{t:'Wisdom at work',at:'2026-09-01T08:00:00Z',u:'2026-09-01T08:00:00Z'},
  d1:{t:'A job for Sam',at:'2026-08-01T08:00:00Z',ans:'2026-11-12T08:00:00Z',an:'He starts Monday',u:'2026-11-12T08:00:00Z'}}};
const toPl=async p=>{await p.evaluate(()=>{jTab='pray';setView('journal')});await p.waitForTimeout(700)};
const verse=(b,c,v)=>BSB(b)[c-1][v-1];

// 1. accuracy: prophets + the ACTS verses are the BSB's words
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const BI=await p.evaluate(()=>Object.fromEntries('ISA JER LAM EZK HOS JOL AMO MIC NAM HAB ZEP HAG ZEC MAL'.split(' ').map(k=>[k,BOOKINFO[k]])));
 const Q={'ISA.9':['Unto us a child is born','unto us a child is born'],'ISA.40':['Comfort, comfort my people','comfort, comfort my people'],'ISA.55':['Come to the waters','come to the waters'],'JER.29':['Plans for a future and a hope','a future and a hope'],'LAM.1':['How lonely lies the city','how lonely lies the city'],'LAM.3':['His mercies are new every morning','new every morning'],
  'EZK.36':['A new heart','a new heart'],'HOS.6':['Come, let us return','come, let us return'],'HOS.11':['When Israel was a child','when israel was a child'],'AMO.5':['Let justice roll on like a river','let justice roll on like a river'],'MIC.6':['What does the LORD require?','what does the lord require'],'NAM.1':['The LORD is good, a stronghold','the lord is good, a stronghold'],
  'HAB.2':['The righteous will live by faith','the righteous will live by faith'],'ZEP.3':['He will rejoice over you','he will rejoice over you'],'HAG.1':['Consider carefully your ways','consider carefully your ways'],'ZEC.12':['They will look on the One they have pierced','the one they have pierced'],'MAL.3':['I will send my messenger','i will send my messenger']};
 const bad=[];for(const [k,[l,ph]] of Object.entries(Q)){const [b,c]=k.split('.');const L=BI[b][3].find(x=>x[0]===+c);if(!L||L[1]!==l)bad.push(k+' label '+(L&&L[1]));if(!BSB(b)[c-1].join(' ').toLowerCase().replace(/’/g,"'").includes(ph))bad.push(k+' text lacks '+ph)}
 ok(!bad.length,'Prophets: 17 chapter labels match the BSB text of their chapter '+bad.join(' / '));
 const A=await p.evaluate(()=>PACTS.map(a=>a[4]));const BK={Psalm:'PSA','Revelation':'REV','1 John':'1JN','1 Thessalonians':'1TH','Philippians':'PHP','Matthew':'MAT','1 Peter':'1PE'};
 const vb=[];for(const st of A)for(const [t,r] of st){const m=r.match(/^(.+) (\d+):(\d+)$/);const raw=verse(BK[m[1]],+m[2],+m[3]).replace(/[“”]/g,'').replace(/—$/,'').trim();const want=t.replace(/\.$/,'');if(!raw.startsWith(want)&&!raw.replace(/[.—]$/,'').startsWith(want))vb.push(r+': '+t)}
 ok(A.flat().length===12&&!vb.length,'ACTS: 12 verses, each word for word from the start of its BSB verse '+vb.join(' / '));
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 2. ACTS on 4 sizes
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=`${w}-${cs}`,dev=w<800?'phone':'desk';
 const {ctx,p,errs}=await open({w,h,cs,st:STP});await toPl(p);
 const g=await p.evaluate(()=>{const b=document.querySelector('.plnew [data-acts]');const r=b&&b.getBoundingClientRect();return b&&{t:b.textContent,h:r.height}});
 ok(g&&/Pray with ACTS/.test(g.t)&&g.h>=44,tag+' Prayers card has Pray with ACTS, 44 px '+JSON.stringify(g));
 if(w===390&&cs==='light')await shot(p,'phone-light-0-prayers');
 await p.focus('.plnew [data-acts]');await p.keyboard.press('Enter');await p.waitForSelector('#acts #acStage .qs');
 ok(await p.evaluate(()=>LAMP_BUSY()),tag+' counts as busy');
 const i0=await txt(p,'#acStage');ok(/supplication/.test(i0)&&!/PACTS/.test(await p.evaluate(()=>document.body.innerText))&&/Pray with ACTS/.test(i0)&&/Adore/.test(i0)&&/Confess/.test(i0)&&/Thank/.test(i0)&&/Ask/.test(i0),tag+' intro lists the four steps');
 ok(await p.$eval('#acBack',b=>b.hidden)&&(await p.$eval('#acNext',b=>b.textContent))==='Start',tag+' intro: Start, no Back');
 await shot(p,`${dev}-${cs}-1-intro`);
 let ax=await axe(p,'#acts');ok(!ax.length,tag+' axe: intro '+ax);
 const seen=[];for(let i=1;i<=4;i++){await p.click('#acNext');await p.waitForTimeout(250);seen.push(await txt(p,'#acStage .qt-k'));
  const t=await txt(p,'#acStage');ok(/“.+”/.test(t)&&/\d+:\d+/.test(t),tag+` step ${i} has a verse with its reference`);
  if(i===1)await shot(p,`${dev}-${cs}-2-adore`);
  if(i===3){ok(/Remember/i.test(t)&&/A job for Sam/.test(t),tag+' Thank reminds you of an answered prayer');}
  if(i===4){const a=await p.evaluate(()=>[...document.querySelectorAll('[data-acp]')].map(b=>b.querySelector('span').textContent));
   ok(a.length===3&&a[0]==="Mum's knee operation",tag+' Ask brings 3 from your list, today\'s first '+a.join(' / '));
   ok((await p.$eval('#acNext',b=>b.textContent))==='Amen',tag+' last step says Amen');
   if(w===390&&cs==='light'){await p.click('[data-acp="a2"]');await p.waitForTimeout(200);
    const st=await p.evaluate(()=>({on:document.querySelector('[data-acp="a2"]').getAttribute('aria-pressed'),n:state.pl.a2.n,last:!!state.pl.a2.last}));
    ok(st.on==='true'&&st.n===1&&st.last,tag+' ticking one marks it prayed today '+JSON.stringify(st));
    await p.click('[data-acp="a2"]');ok((await p.evaluate(()=>state.pl.a2.n))===1,tag+' a second tap does not count twice')}
   await shot(p,`${dev}-${cs}-3-ask`);ax=await axe(p,'#acts');ok(!ax.length,tag+' axe: ask '+ax)}}
 ok(seen.map(s=>s.replace(/^[A-Z]\s*/,'').trim().toLowerCase()).join()==='adore,confess,thank,ask',tag+' steps in order '+seen.join('/'));
 if(w===390&&cs==='light'){await p.click('#acBack');await p.waitForTimeout(200);ok(/thank/i.test(await txt(p,'#acStage .qt-k')),tag+' Back goes to Thank');await p.click('#acNext');}
 await p.click('#acNext');await p.waitForTimeout(250);
 ok(/Amen/i.test(await txt(p,'#acStage'))&&/Come back to ACTS/.test(await txt(p,'#acStage'))&&(await p.$eval('#acNext',b=>b.textContent))==='Done',tag+' ends with Amen and Done');
 const S=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-acts')));ok(S.n===1&&S.last==='2026-11-23',tag+' remembers the day '+JSON.stringify(S));
 if(w===390&&cs==='dark')await shot(p,'phone-dark-4-amen');
 await p.click('#acNext');await p.waitForTimeout(300);
 const f=await p.evaluate(()=>({gone:!document.querySelector('#acts'),busy:LAMP_BUSY(),focus:document.activeElement?.matches?.('[data-acts]')}));
 ok(f.gone&&!f.busy&&f.focus,tag+' Done closes it and focus is back on Pray with ACTS '+JSON.stringify(f));
 ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}

// 3. keys, Escape, empty list, timer
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light'});await toPl(p);
 await p.click('.plnew [data-acts]');await p.waitForSelector('#acts');await p.keyboard.press('ArrowRight');await p.waitForTimeout(150);
 ok(/adore/i.test(await txt(p,'#acStage .qt-k')),'arrow right moves on');await p.keyboard.press('ArrowLeft');await p.waitForTimeout(150);ok(/Pray with ACTS/.test(await txt(p,'#acStage')),'arrow left goes back');
 for(let i=0;i<4;i++)await p.keyboard.press('ArrowRight');await p.waitForTimeout(200);
 ok(/list is empty/.test(await txt(p,'#acStage')),'empty list: Ask says where to add prayers');
 ok(!/Remember/.test(await p.evaluate(()=>{actsGo(-1);return document.querySelector('#acStage').innerText})),'no answered prayers: no Remember');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);ok(!(await p.$('#acts'))&&await p.evaluate(()=>document.activeElement?.matches?.('[data-acts]')),'Escape closes it and focus comes back');
 ok(!(await p.evaluate(()=>localStorage.getItem('lamp-acts'))),'closing early does not count a prayer time');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference',st:STP});await toPl(p);await p.click('.plnew [data-acts]');await p.waitForSelector('#acts');await p.click('#acNext');await p.waitForTimeout(300);
 const r=await p.evaluate(()=>getComputedStyle(document.querySelector('.ac-run')).animationDuration);ok(r==='60s','with motion on, a one-minute ring runs ('+r+')');
 await p.evaluate(()=>{const s=document.querySelector('#acts');s.querySelector('.ac-min').classList.add('done')});
 ok(/take your time/.test(await p.evaluate(()=>getComputedStyle(document.querySelector('.ac-min span'),'::after').content)),'after a minute it says take your time');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 4. focus returns after Pray through my list and quiet time
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light',st:STP});await toPl(p);
 await p.focus('#plPray');await p.keyboard.press('Enter');await p.waitForSelector('#pn');await p.keyboard.press('Escape');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.activeElement?.id==='plPray'||document.activeElement?.matches?.('#plPray')),'Pray through my list: focus comes back to its button ('+await p.evaluate(()=>document.activeElement?.id||document.activeElement?.className)+')');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
