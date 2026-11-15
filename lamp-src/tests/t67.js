// v52: Learn the 66 books (look at a short list, then put the books back in order), Learn tabs slide in from the side you tapped,
// 13 new checked questions (Malachi, Amos, Hosea, 1 Timothy get book quizzes), 1 Timothy 6:10 wording matches the BSB
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s67',{recursive:true});
const NOW='2026-11-15T09:00:00+02:00';const T=d=>`2026-${d}T08:00:00+02:00`;
const ST={done:{1:T('10-20'),2:T('10-21')},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(NOW).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  if(o.b66)await ctx.addInitScript(v=>{if(!localStorage.getItem('lamp-b66'))localStorage.setItem('lamp-b66',JSON.stringify(v))},o.b66);
  await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const lib=async p=>{await p.evaluate(()=>{setView('learn');setLtab('library')});await p.waitForTimeout(600)};
// answer the open question: right = the book that comes next, else the first other option
const answer=async(p,right=true,key=false)=>p.evaluate(async([right,key])=>{const box=document.querySelector('#b66');const q=box.querySelector('.b66-q').textContent;
  const bs=[...box.querySelectorAll('[data-b6]')];const kicker=box.querySelector('.fun-hd .kicker').textContent;const n=+kicker.match(/Book (\d+)/i)[1];
  const want=window.__b66want[n-1];let i=bs.findIndex(x=>+x.dataset.b6===want);if(!right)i=bs.findIndex(x=>+x.dataset.b6!==want);
  if(key){bs[0].focus();bs[0].dispatchEvent(new KeyboardEvent('keydown',{key:String(i+1),bubbles:true}))}else bs[i].click();return {q,n,i,want}},[right,key]);
const setWant=(p,k)=>p.evaluate(k=>{const r=b66Round(k);window.__b66want=[...Array(r[3]).keys()].map(i=>r[2]+i)},k);
const play=async(p,k,missAt=-1,wait=200)=>{await setWant(p,k);const n=await p.evaluate(k=>b66Round(k)[3],k);for(let i=0;i<n;i++){await answer(p,i!==missAt);await p.waitForTimeout(i===missAt?2100:wait)}await p.waitForTimeout(300)};

// 1. data: the rounds, Paul's letters, the new questions
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const D=await p.evaluate(()=>({r:B66.map(r=>[r[0],r[1],r[2],r[3]]),names:LIB.map(x=>x[0]),codes:BCODES}));
 let at=0,cont=true;for(const r of D.r){if(r[2]!==at)cont=false;at+=r[3]}
 ok(D.r.length===8&&cont&&at===66,'8 rounds cover all 66 books in order, no gaps or overlaps');
 const grp=k=>{const r=D.r.find(x=>x[0]===k);return D.codes.slice(r[2],r[2]+r[3]).join(' ')};
 ok(grp('law')==='GEN EXO LEV NUM DEU'&&grp('major')==='ISA JER LAM EZK DAN'&&grp('minor').split(' ').length===12&&grp('minor').startsWith('HOS')&&grp('minor').endsWith('MAL')&&grp('gosp')==='MAT MRK LUK JHN ACT',
   'groups: Law, Major prophets (Isaiah to Daniel), 12 Minor prophets (Hosea to Malachi), Gospels & Acts');
 const paul=grp('paul').split(' ');const notPaul=paul.filter(c=>!/Paul/.test(BSB(c)[0][0]));
 ok(paul.length===13&&paul[0]==='ROM'&&paul[12]==='PHM'&&!notPaul.length,'Paul\'s letters: all 13 open with Paul\'s name in the BSB '+notPaul);
 ok(grp('gen').split(' ')[0]==='HEB'&&!/Paul/.test(BSB('HEB')[0].slice(0,3).join(' '))&&grp('gen').endsWith('REV'),'Hebrews (no named writer) starts the last round; Revelation ends it');
 // options: every question, many shuffles: 4 different books, the right one in, none already placed in this round
 const bad=await p.evaluate(()=>{const out=[];for(const k of [...B66.map(r=>r[0]),'all'])for(let t=0;t<12;t++){const r=b66Round(k);for(let pos=0;pos<r[3];pos++){const o=b66Opts(r,pos),right=r[2]+pos;
   if(o.length!==4||new Set(o).size!==4||!o.includes(right)||o.some(g=>g<0||g>65)||(66-right>3&&o.some(g=>g>=r[2]&&g<right)))out.push(k+pos+':'+o)}}return out.slice(0,5)});
 ok(!bad.length,'every question offers 4 different books, the right one among them, and never one already placed (unless fewer than 3 books are left) '+bad);
 // the new questions
 const bank=await p.evaluate(async()=>{const F=await loadFun();const o={};for(const c of ['MAL','AMO','HOS','1TI'])o[c]=(await bqPool(c)).length;return {n:F.q.length,nw:F.q.slice(566,579),o,t:F.q.find(x=>x.ref==='1TI.6.10').q}});
 const KEY={'MAL.4.5':'Elijah','MAL.3.8':'tithes and offerings','MAL.4.2':'sun of righteousness','MAL.3.6':'do not change','AMO.5.24':'justice','AMO.7.14':'herdsman and a tender of sycamore-fig trees','AMO.8.11':'famine of hearing the words of the LORD','HOS.6.6':'sacrifice','HOS.3.2':'fifteen shekels of silver','1TI.4.12':'youth','1TI.2.5':'one mediator','1TI.1.15':'sinners'};
 const badQ=[];for(const q of bank.nw){const [c,ch,v]=q.ref.split('.');const t=BSB(c)[ch-1]?.[v-1]||'';const k=KEY[q.ref];if(k&&!t.includes(k))badQ.push(q.ref+' lacks '+k);if(new Set(q.a).size!==4)badQ.push(q.ref+' options')}
 ok(/Out of Egypt I called My Son/.test(BSB('MAT')[1][14])&&/I desire mercy, not sacrifice/.test(BSB('MAT')[8][12]+BSB('MAT')[11][6])&&/the Elijah who was to come/.test(BSB('MAT')[10][13]),'facts quoting Matthew (2:15, 9:13, 12:7, 11:14) match the BSB');
 ok(bank.n>=579&&bank.nw.length===13&&!badQ.length&&Object.values(bank.o).every(n=>n>=4),'13 new questions checked against their verses; Malachi, Amos, Hosea and 1 Timothy get a book quiz: '+JSON.stringify(bank.o)+' '+badQ);
 ok(/is the root of all kinds of evil/.test(bank.t)&&/the root of all kinds of evil/.test(BSB('1TI')[5][9]),'1 Timothy 6:10 question says "the root", as the BSB does');
 ok(!errs.length,'data: no errors '+errs.join('|'));await ctx.close()}

// 2. the card in Learn → Library, four looks
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs,b66:{law:{b:21000,ok:1},hist:{ok:0}}});
 await lib(p);
 const c=await p.evaluate(()=>{const c=document.querySelector('#b66c');return c&&{t:c.innerText.replace(/\n/g,' | '),n:c.querySelectorAll('[data-b66]').length,ok:[...c.querySelectorAll('.b66r.ok')].map(x=>x.dataset.b66),small:[...c.querySelectorAll('[data-b66]')].filter(x=>x.offsetHeight<44||x.offsetWidth<44).length,first:c.parentElement.querySelector('.lede+*')===c}});
 ok(c&&c.n===9&&c.first&&/Know all 66 in order/.test(c.t)&&/1 \| of 8 learnt/.test(c.t),tag+' card sits above the bookcase: 8 rounds + All 66, 1 of 8 learnt: '+(c&&c.t.slice(0,120)));
 ok(c.ok.join()==='law'&&/Law \| 5 books · best 21 s/.test(c.t)&&/History \| 12 books \|/.test(c.t),tag+' a learnt round shows a tick and its best time; a missed try shows nothing yet');
 ok(c.small===0,tag+' every button is at least 44 px');
 await p.evaluate(()=>{const e=document.querySelector('#b66c');scrollTo(0,e.getBoundingClientRect().top+scrollY-(innerWidth<800?150:90))});await p.waitForTimeout(300);
 await p.screenshot({path:`${__dirname}/s67/card-${tag}.png`});
 const ax=await axe(p,'#b66c');ok(!ax.length,tag+' axe: card clean '+ax);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 // look first, then play the Law round with no misses
 await p.click('[data-b66="law"]');await p.waitForTimeout(500);
 let s=await txt(p,'#b66');ok(/LOOK FIRST · 5 BOOKS/i.test(s)&&/1 \| Genesis/.test(s)&&/5 \| Deuteronomy/.test(s)&&/Torah/.test(s),tag+' Law opens on the list to look at first: '+s.slice(0,140));
 ok(await p.evaluate(()=>window.LAMP_BUSY()),tag+' the game holds off silent updates');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s67/look-${tag}.png`});
 const ax1=await axe(p,'#b66');ok(!ax1.length,tag+' axe: look screen clean '+ax1);
 await p.click('#b66Go');await p.waitForTimeout(400);
 s=await txt(p,'#b66');const o=await p.evaluate(()=>[...document.querySelectorAll('#b66 [data-b6]')].map(b=>({t:b.innerText,h:b.offsetHeight})));
 ok(/BOOK 1 OF 5/i.test(s)&&/Which book comes first in the Bible\?/.test(s)&&o.length===4&&o.some(x=>/Genesis/.test(x.t))&&o.every(x=>x.h>=44),tag+' question 1: what comes first, 4 choices, each at least 44 px');
 ok(await p.evaluate(()=>document.querySelectorAll('#b66 .b66p.fut').length===4&&!!document.querySelector('#b66 .b66p.now')),tag+' the trail shows this slot and 4 empty ones');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s67/ask-${tag}.png`});
 const ax2=await axe(p,'#b66');ok(!ax2.length,tag+' axe: question clean '+ax2);
 await setWant(p,'law');await answer(p,true,w===1440);await p.waitForTimeout(250);
 s=await txt(p,'#b66');ok(/Which book comes after Genesis\?/.test(s)&&await p.evaluate(()=>document.querySelector('#b66 .b66-t li')?.textContent)==='Genesis',tag+(w===1440?' key 1–4 picks':' a tap picks')+'; Genesis fills its slot, then "after Genesis?"');
 for(let i=1;i<5;i++){await answer(p,true);await p.waitForTimeout(250)}await p.waitForTimeout(300);
 s=await txt(p,'#b66');const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-b66')));
 ok(/ALL IN ORDER/i.test(s)&&/0 \| missed/.test(s)&&/You know the law in order/.test(s)&&st.law.ok===1&&st.law.b<21000,tag+' end: all in order, none missed, a new best saved '+s.slice(0,160));
 ok(/new best/.test(s)&&await p.evaluate(()=>document.querySelector('#b66Next')?.textContent)==='Next: History',tag+' says a new best and offers Next: History');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s67/end-${tag}.png`});
 const ax3=await axe(p,'#b66');ok(!ax3.length,tag+' axe: end clean '+ax3);
 ok(await p.evaluate(()=>/1 \| of 8 learnt|1\nof 8 learnt/.test(document.querySelector('#b66c').innerText)),tag+' the card behind updates');
 ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}

// 3. a miss: amber, not learnt, Try again goes back to the list; then a clean run counts
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference'});
 await lib(p);await p.click('[data-b66="poet"]');await p.waitForTimeout(500);await p.click('#b66Go');await p.waitForTimeout(400);
 await setWant(p,'poet');await answer(p,true);await p.waitForTimeout(600);
 const r=await answer(p,false);await p.waitForTimeout(300);
 let s=await txt(p,'#b66');const w=await p.evaluate(()=>({wr:!!document.querySelector('#b66 .qo.wrong'),rt:document.querySelector('#b66 .qo.right')?.innerText,mi:document.querySelector('#b66 .b66p.miss')?.textContent,st:document.querySelector('#b66 .b66-s')?.textContent}));
 ok(w.wr&&/Psalms/.test(w.rt)&&w.mi==='Psalms'&&/Not quite\. After Job comes Psalms\./.test(w.st),'a wrong pick shakes, shows Psalms and fills the slot in amber: '+JSON.stringify(w));
 await p.screenshot({path:`${__dirname}/s67/miss-390-light.png`});
 await p.waitForTimeout(2100);for(let i=2;i<5;i++){await answer(p,true);await p.waitForTimeout(600)}await p.waitForTimeout(400);
 s=await txt(p,'#b66');let st=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-b66')));
 ok(/4 OF 5 FIRST TIME/i.test(s)&&/1 \| missed/.test(s)&&/learn the one in amber/.test(s)&&st.poet.ok===0&&!st.poet.b,'end: 4 of 5 first time, not learnt yet '+s.slice(0,200));
 ok(await p.evaluate(()=>document.querySelector('#b66Again')?.textContent==='Try again'&&!document.querySelector('#b66Next')),'offers Try again and no Next until it is learnt');
 await p.screenshot({path:`${__dirname}/s67/endmiss-390-light.png`});
 await p.click('#b66Again');await p.waitForTimeout(500);s=await txt(p,'#b66');ok(/LOOK FIRST/i.test(s),'Try again goes back to the list to look at');
 await p.click('#b66Go');await p.waitForTimeout(400);await play(p,'poet',-1,600);
 st=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-b66')));ok(st.poet.ok===1&&st.poet.b>0,'a clean run then counts as learnt');
 await p.click('#b66Next');await p.waitForTimeout(500);s=await txt(p,'#b66');ok(/Major prophets/.test(s)&&/longer, not more important/.test(s),'Next goes to the next round not yet learnt: '+s.slice(0,90));
 await p.evaluate(()=>closeTop());await p.waitForTimeout(400);ok(!await p.$('#b66')&&!await p.evaluate(()=>window.LAMP_BUSY()),'closing the sheet frees silent updates');
 ok(!errs.length,'miss: no errors '+errs.join('|'));await ctx.close()}

// 4. All 66, offline, laptop: the trail keeps the last four; after 8 rounds the end offers All 66
{const all=Object.fromEntries(['law','hist','poet','major','minor','gosp','paul'].map(k=>[k,{b:30000,ok:1}]));
 const {ctx,p,errs}=await open({w:1440,h:900,cs:'dark',b66:all});
 await ctx.setOffline(true);await lib(p);
 await p.click('[data-b66="gen"]');await p.waitForTimeout(400);await p.click('#b66Go');await p.waitForTimeout(300);await play(p,'gen',-1,220);
 let s=await txt(p,'#b66');ok(await p.evaluate(()=>document.querySelector('#b66Next')?.textContent)==='Try all 66'&&/8 \| of 8 learnt/.test(await txt(p,'#b66c')),'learning the 8th round (offline) offers Try all 66; card says 8 of 8');
 await p.click('#b66Next');await p.waitForTimeout(400);s=await txt(p,'#b66');ok(/All 66 books/.test(s)&&/clock starts/.test(s)&&!await p.$('#b66 .b66-l'),'All 66 starts without the long list');
 await p.click('#b66Go');await p.waitForTimeout(300);await setWant(p,'all');
 for(let i=0;i<10;i++){await answer(p,true);await p.waitForTimeout(220)}await p.waitForTimeout(200);
 const tr=await p.evaluate(()=>[...document.querySelectorAll('#b66 .b66-t li')].map(x=>x.textContent));
 ok(tr.length===6&&tr[0]==='6 before'&&tr[4]==='2 Samuel'&&tr[5]==='?'&&/after 2 Samuel/.test(await txt(p,'#b66 .b66-q')),'the trail keeps the last four books: '+tr.join(','));
 await p.screenshot({path:`${__dirname}/s67/all-1440-dark.png`});
 for(let i=10;i<66;i++){await answer(p,true);await p.waitForTimeout(220)}await p.waitForTimeout(400);
 s=await txt(p,'#b66');const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-b66')).all);
 ok(/ALL IN ORDER/i.test(s)&&/Genesis to Revelation, every one in place/.test(s)&&st.ok===1&&/Best .* with none missed/.test(await txt(p,'[data-b66="all"]')),'All 66 done offline: saved with its best time '+s.slice(0,120));
 ok(!errs.length,'all 66: no errors '+errs.join('|'));await ctx.close()}

// 5. feel: Learn tabs slide in from the side you tapped (not with reduced motion)
for(const rm of ['no-preference','reduce']){const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm});
 await p.evaluate(()=>{setView('learn');setLtab('topics')});await p.waitForTimeout(700);
 await p.click('.ltabs [data-t="library"]');await p.waitForTimeout(30);const a=await p.evaluate(()=>document.getElementById('library').className);
 await p.waitForTimeout(500);const a2=await p.evaluate(()=>document.getElementById('library').className);
 await p.click('.ltabs [data-t="art"]');await p.waitForTimeout(30);const c=await p.evaluate(()=>document.getElementById('art').className);
 if(rm==='no-preference'){ok(/lin-r/.test(a)&&!/lin-/.test(a2)&&/lin-l/.test(c),'motion on: Library (to the right) slides in from the right, Art (back left) from the left, class cleared after: '+[a,a2,c].join(' / '))}
 else ok(!/lin-/.test(a+c),'reduced motion: no slide');
 ok(await p.evaluate(()=>!document.getElementById('art').hidden&&document.getElementById('library').hidden),rm+': the right panel shows');
 ok(!errs.length,rm+' tabs: no errors '+errs.join('|'));await ctx.close()}

// 6. closing the sheet while an answer is still showing: nothing breaks
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await lib(p);await p.click('[data-b66="law"]');await p.waitForTimeout(400);await p.click('#b66Go');await p.waitForTimeout(300);await setWant(p,'law');
 for(let i=0;i<4;i++){await answer(p,true);await p.waitForTimeout(250)}
 await answer(p,true);await p.evaluate(()=>closeTop());await p.waitForTimeout(800);
 ok(!errs.length&&!await p.$('#b66')&&!await p.evaluate(()=>window.LAMP_BUSY()),'closing during the last answer: no errors, nothing left open '+errs.join('|'));
 await p.click('[data-b66="hist"]');await p.waitForTimeout(400);ok(/History/.test(await txt(p,'#b66')),'and the next round still opens');await ctx.close()}

console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
