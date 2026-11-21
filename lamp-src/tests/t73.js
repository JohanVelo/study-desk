// v58: Find the book (shelf of 66, names shown / hidden, best times, misses lead to Learn the books);
// toasts sit above an open sheet; verse note empty-save hint is inline; accuracy: Law and Poetry labels
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s73',{recursive:true});
const NOW='2026-11-21T09:00:00+02:00';
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





const shot=async(p,n)=>{await p.waitForTimeout(350);await p.screenshot({path:`${__dirname}/s73/${n}.png`})};

const lib=async p=>{await p.evaluate(()=>{setView('learn');setLtab('library')});await p.waitForTimeout(700)};
// play until done: right picks except the listed miss positions
const play=async(p,missAt=[])=>{for(let i=0;i<10;i++){await p.waitForSelector('#fbk .fbk-q',{timeout:8000});const want=await p.$eval('#fbk .fbk-q b',e=>e.textContent);
  const g=await p.evaluate(w=>LIB.findIndex(x=>x[0]===w),want);const pick=missAt.includes(i)?(g===0?1:g-1):g;await p.click(`#fbk [data-fb="${pick}"]`);await p.waitForTimeout(missAt.includes(i)?2400:300)}
  await p.waitForSelector('#fbkAgain',{timeout:8000})};

// 1. accuracy
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const BI=await p.evaluate(()=>Object.fromEntries(['GEN','EXO','LEV','NUM','DEU','JOB','PSA','PRO','ECC','SNG'].map(k=>[k,BOOKINFO[k]])));
 const Q={'LEV.19':['Love your neighbour as yourself','love your neighbor as yourself'],'NUM.21':['The bronze snake','bronze snake'],'DEU.6':['Hear, O Israel','hear, o israel'],'DEU.30':['Choose life','choose life'],'EXO.3':['The burning bush','burning'],
   'JOB.19':['I know that my Redeemer lives','i know that my redeemer lives'],'JOB.38':['God answers from the whirlwind','out of the whirlwind'],'PSA.23':['The LORD is my shepherd','the lord is my shepherd'],'PSA.51':['Have mercy on me','have mercy on me'],'PSA.103':['Bless the LORD','bless the lord'],'PSA.139':['You have searched me','you have searched me'],
   'PRO.1':['The fear of the LORD','the fear of the lord'],'PRO.3':['Trust in the LORD','trust in the lord'],'PRO.31':['A wife of noble character','a wife of noble character'],'SNG.2':['My beloved approaches','my beloved approaches'],'SNG.8':['Love is as strong as death','love is as strong as death']};
 const bad=[];for(const [k,[l,ph]] of Object.entries(Q)){const [b,c]=k.split('.');const L=BI[b][3].find(x=>x[0]===+c);if(!L||L[1]!==l)bad.push(k+' label '+(L&&L[1]));if(!BSB(b)[c-1].join(' ').toLowerCase().replace(/’/g,"'").includes(ph))bad.push(k+' text lacks '+ph)}
 ok(!bad.length,'Law and Poetry: 16 chapter labels match the BSB text of their chapter '+bad.join(' / '));
 ok(/out of the whirlwind/.test(BI.JOB[0])&&BSB('JOB')[37][0].includes('out of the whirlwind'),'Job summary says whirlwind, like Job 38:1');
 ok(/fear God and keep his commandments/.test(BI.ECC[0])&&BSB('ECC')[11][12].includes('Fear God and keep His commandments'),'Ecclesiastes summary quotes 12:13');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 2. Find the book, on 4 sizes and themes
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=`${w}-${cs}`;
 const {ctx,p,errs}=await open({w,h,cs});await lib(p);
 const c=await p.evaluate(()=>{const b=document.querySelector('#fbkGo'),r=b&&b.getBoundingClientRect(),c=document.querySelector('#b66c').getBoundingClientRect();return b&&{t:b.innerText,h:r.height,below:r.top>=c.bottom-1,w:Math.round(r.width-c.width)}});
 ok(c&&/Find the book/.test(c.t)&&c.h>=44&&c.below&&Math.abs(c.w)<=2,tag+' card under Learn the books, same width '+JSON.stringify(c));
 await p.evaluate(()=>{const e=document.querySelector('#b66c');scrollTo(0,e.getBoundingClientRect().top+scrollY-(innerWidth<800?120:80))});if(w===390&&cs==='light')await shot(p,`phone-${cs}-0-card`);
 await p.click('#fbkGo');await p.waitForSelector('#fbkE');
 ok(await p.evaluate(()=>LAMP_BUSY()),tag+' counts as busy (no silent update mid-game)');
 ok((await p.$$('#fbk .fbk-key li')).length===8,tag+' intro shows the 8 group colours');
 await shot(p,`${w<800?'phone':'desk'}-${cs}-1-intro`);
 let ax=await axe(p,'#fbk');ok(!ax.length,tag+' axe: intro '+ax);
 await p.click('#fbkE');await p.waitForSelector('#fbk .fbk-q');
 const g=await p.evaluate(()=>{const t=[...document.querySelectorAll('#fbk [data-fb]')];const r=t.map(b=>b.getBoundingClientRect());const sh=document.querySelector('#fbk').closest('.sheet');return {n:t.length,minH:Math.min(...r.map(x=>x.height)),minW:Math.min(...r.map(x=>x.width)),labels:t.slice(0,3).map(b=>b.textContent),over:r.some(x=>x.right>sh.getBoundingClientRect().right+1),order:t.every((b,i)=>+b.dataset.fb===i)}});
 ok(g.n===66&&g.order&&g.minH>=44&&g.minW>=40&&!g.over,tag+' 66 tiles in Bible order, 44 px tall, none spill out '+JSON.stringify(g));
 ok(g.labels[0].startsWith('Gen')&&g.labels[0].includes('Genesis'),tag+' tiles show a short name and give screen readers the full one '+g.labels[0]);
 await shot(p,`${w<800?'phone':'desk'}-${cs}-2-game`);
 ax=await axe(p,'#fbk');ok(!ax.length,tag+' axe: shelf '+ax);
 if(w===390&&cs==='light'){
  // a wrong pick: right tile marked, message names both books
  const want=await p.$eval('#fbk .fbk-q b',e=>e.textContent);const gi=await p.evaluate(w=>LIB.findIndex(x=>x[0]===w),want);const wr=gi===0?1:gi-1;
  await p.click(`#fbk [data-fb="${wr}"]`);await p.waitForTimeout(250);
  const m=await p.evaluate(gi=>({s:document.querySelector('#fbk .b66-s').textContent,miss:document.querySelector(`#fbk [data-fb="${gi}"]`).classList.contains('miss'),dis:[...document.querySelectorAll('#fbk [data-fb]')].every(b=>b.disabled)}),gi);
  ok(m.miss&&m.dis&&m.s.includes(want)&&new RegExp(want+' comes '+(wr<gi?'after':'before')).test(m.s),tag+' a wrong tap shows where it is: '+m.s);
  await shot(p,'phone-light-3-miss');
  await p.waitForTimeout(2400);
  ok(/Book 2 of 10/i.test(await txt(p,'#fbk .fun-hd')),tag+' moves on to book 2');
  await play2(p);
 }else{await play(p,[]);}
 const e=await txt(p,'#fbk');
 if(w===390&&cs==='light'){ok(/9 of 10 found first time/i.test(e)&&/Learn the order: /.test(e),tag+' end: 9 of 10, offers the round to learn: '+e.slice(0,160));
  const k=await p.$eval('#fbkLearn',b=>b.dataset.k);await shot(p,'phone-light-4-end');
  const S=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-fbk')));ok(!S.e.b&&S.e.n===1&&S.last.length===10,tag+' a round with a miss sets no best time '+JSON.stringify(S.e));
  await p.click('#fbkLearn');await p.waitForSelector('#b66');ok(await p.evaluate(k=>!!document.querySelector('#b66'),k),tag+' Learn opens that Learn the books round ('+k+')');
 }else{ok(/All 10 found first time/i.test(e),tag+' end: all 10 found');
  const S=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-fbk')));ok(S.e.b>0&&S.e.n===1,tag+' best time saved');
  if(cs==='dark')await shot(p,'desk-dark-4-end');
  // play again: no book from the last round repeats
  const last=S.last;await p.click('#fbkAgain');await p.waitForSelector('#fbk .fbk-q');
  const seen=[];for(let i=0;i<10;i++){const want=await p.$eval('#fbk .fbk-q b',e=>e.textContent);seen.push(await p.evaluate(w=>LIB.findIndex(x=>x[0]===w),want));const gi=seen[i];await p.click(`#fbk [data-fb="${gi}"]`);await p.waitForTimeout(300);if(i<9)await p.waitForSelector('#fbk .fbk-q')}
  ok(!seen.some(x=>last.includes(x))&&new Set(seen).size===10,tag+' the next round asks 10 different books');
  await p.waitForSelector('#fbkAgain');await p.click('#shX');await p.waitForTimeout(500);
  ok(/Best \d+ s with all 10 found|Best \d+ min/.test(await txt(p,'#fbkGo')),tag+' the card shows the best time '+(await txt(p,'#fbkGo')));
 }
 ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}
async function play2(p){for(let i=1;i<10;i++){await p.waitForSelector('#fbk .fbk-q');const want=await p.$eval('#fbk .fbk-q b',e=>e.textContent);const gi=await p.evaluate(w=>LIB.findIndex(x=>x[0]===w),want);await p.click(`#fbk [data-fb="${gi}"]`);await p.waitForTimeout(300)}await p.waitForSelector('#fbkAgain',{timeout:8000})}

// 3. hard mode: names hidden until found; keyboard; laptop
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light'});await lib(p);await p.click('#fbkGo');await p.waitForSelector('#fbkH');await p.click('#fbkH');await p.waitForSelector('#fbk .fbk-q');
 const h=await p.evaluate(()=>[...document.querySelectorAll('#fbk [data-fb]')].filter(b=>b.querySelector('span:not(.sr)')).length);
 ok(h===0,'hard: no names on the tiles ('+h+')');
 ok(/Names hidden/i.test(await txt(p,'#fbk .fun-hd')),'hard: header says names hidden');
 const sr=await p.$eval('#fbk [data-fb="40"]',b=>b.textContent);ok(/New Testament, book 2/.test(sr)&&!/Mark/.test(sr),'hard: screen readers hear the place, not the name: '+sr);
 const want=await p.$eval('#fbk .fbk-q b',e=>e.textContent);const gi=await p.evaluate(w=>LIB.findIndex(x=>x[0]===w),want);
 await p.focus(`#fbk [data-fb="${gi}"]`);await p.keyboard.press('Enter');await p.waitForTimeout(150);
 ok(await p.$eval(`#fbk [data-fb="${gi}"]`,b=>b.classList.contains('got')&&!!b.querySelector('span:not(.sr)')),'hard: Enter on a focused tile picks it and its name appears');
 await shot(p,'desk-light-5-hard');
 const ax=await axe(p,'#fbk');ok(!ax.length,'hard: axe clean '+ax);
 for(let i=1;i<10;i++){await p.waitForSelector('#fbk .fbk-q');await p.waitForTimeout(500);const w2=await p.$eval('#fbk .fbk-q b',e=>e.textContent);const g2=await p.evaluate(w=>LIB.findIndex(x=>x[0]===w),w2);await p.click(`#fbk [data-fb="${g2}"]`)}
 await p.waitForSelector('#fbkAgain',{timeout:8000});
 const S=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-fbk')));ok(S.h&&S.h.b>0&&!S.e,'hard: its own best time '+JSON.stringify(S));
 ok(/You know your way around the Bible/.test(await txt(p,'#fbk')),'hard: a clean round gets its own line');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 4. toasts sit above an open sheet; verse note empty save says so under the box
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark']]){const tag=`${w}-${cs}`;
 const {ctx,p,errs}=await open({w,h,cs});
 await p.evaluate(()=>openVNote('JHN.3.16','For God so loved the world'));await p.waitForSelector('#vnSave');await p.waitForTimeout(400);
 await p.click('#vnSave');await p.waitForTimeout(200);
 const v=await p.evaluate(()=>({c:document.querySelector('#vnC').textContent,warn:document.querySelector('#vnC').classList.contains('warn'),toast:document.querySelector('#toast').classList.contains('show')}));
 ok(v.c==='Write something first'&&v.warn&&!v.toast,tag+' empty save: the hint is under the box, no toast '+JSON.stringify(v));
 await p.fill('#vnT','A');await p.waitForTimeout(100);ok((await p.$eval('#vnC',e=>e.textContent))===''&&!(await p.$eval('#vnC',e=>e.classList.contains('warn'))),tag+' typing clears the hint');
 await p.evaluate(()=>toast('Saved to your journal'));await p.waitForTimeout(500);
 const t=await p.evaluate(()=>{const t=document.querySelector('#toast').getBoundingClientRect(),s=document.querySelector('.scrim>.sheet').getBoundingClientRect();return {tb:Math.round(t.bottom),st:Math.round(s.top),tt:Math.round(t.top),over:!(t.bottom<=s.top+1||t.top>=s.bottom-1)}});
 ok(!t.over&&t.tt>=0,tag+' a toast with a sheet open does not cover the sheet '+JSON.stringify(t));
 await shot(p,`${w<800?'phone':'desk'}-${cs}-6-toast`);
 await p.click('#shX');await p.waitForTimeout(3500);
 await p.evaluate(()=>toast('Back to normal'));await p.waitForTimeout(500);
 const n=await p.evaluate(()=>{const t=document.querySelector('#toast');return {on:t.classList.contains('ontop'),b:Math.round(innerHeight-t.getBoundingClientRect().bottom)}});
 ok(!n.on&&n.b>=80&&n.b<=140,tag+' with no sheet the toast is back at the bottom '+JSON.stringify(n));
 ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}

await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
