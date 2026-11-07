// v44: quiz me on this book (from the book sheet), read chapters marked in the book sheet, group quick-quiz misses go to Second chance, 17 new questions on the letters
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s59',{recursive:true});
const T=d=>`2026-${d}T08:00:00+02:00`;
const ST={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',when:'Thursdays at 7 pm',at:now});
  for(const id of ['u_a','u_b'])S.set('gm/'+id,{joined:'2026-01-02',seen:now})};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
// which option is right? look the question up in the bank
const rightIdx=p=>p.evaluate(async()=>{const F=await loadFun();const h=document.querySelector('#fun .fun-q h3')?.textContent;const x=F.q.find(z=>z.q===h);if(!x)return -1;return [...document.querySelectorAll('#fun [data-qo]')].findIndex(bt=>bt.textContent.trim()===x.a[0])});
const play=async(p,wrongAt)=>{for(let i=0;i<5;i++){await p.waitForSelector('#fun [data-qo]:not([disabled])',{timeout:8000});const r=await rightIdx(p);const pick=i===wrongAt?(r+1)%4:r;await p.click(`#fun [data-qo="${pick}"]`);await p.waitForTimeout(i===wrongAt?3400:1900)}};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 await p.evaluate(()=>openBook('MRK'));await p.waitForTimeout(900);
 const bk=await p.evaluate(()=>{const r=document.querySelector('#bqGo');return {row:document.querySelector('.bq-row')?.innerText.replace(/\n/g,' | '),h:r?.getBoundingClientRect().height,rd:document.querySelectorAll('.cgrid button.rd').length,lab:document.querySelector('.cgrid button.rd')?.getAttribute('aria-label'),sum:document.querySelector('.bk-all summary').textContent,open:document.querySelector('.bk-all').open}});
 ok(bk.row&&/Quiz me on Mark/.test(bk.row)&&bk.h>=44,tag+' Mark offers a quiz, 44 px: '+bk.row);
 ok(bk.rd===3&&bk.lab==='Chapter 1, read'&&/3 read/.test(bk.sum)&&bk.open,tag+' the 3 chapters read are marked and the list is open: '+JSON.stringify(bk));
 if(cs==='light'||w===1440){await p.evaluate(()=>document.querySelector('.bq-row').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s59/book-${tag}.png`})}
 await p.click('#bqGo');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>/Question 1 of 5/i.test(document.querySelector('#fun .fun-hd').textContent)&&document.activeElement?.matches('[data-qo]')),tag+' quiz opens on question 1 of 5, focus on the first answer');
 if(w===390&&cs==='light')await p.screenshot({path:`${__dirname}/s59/q-${tag}.png`});
 await play(p,4);
 const e=await p.evaluate(()=>({hd:document.querySelector('#fun .fun-hd').innerText,sum:document.querySelector('.bq-sum')?.textContent,best:JSON.parse(localStorage.getItem('lamp-bq')||'{}').MRK,miss:missList().length,rev:document.querySelectorAll('.ans-rev li').length}));
 ok(/4 of 5 right/i.test(e.hd)&&/1 question you missed will come back tomorrow in Second chance/.test(e.sum)&&e.best?.s===4&&e.best?.n===5&&e.miss===1&&e.rev===1,tag+' 4 of 5: the miss is shown and saved for Second chance: '+JSON.stringify(e));
 await p.screenshot({path:`${__dirname}/s59/end-${tag}.png`});
 await p.click('#bqAgain');await p.waitForTimeout(700);await play(p,-1);
 const e2=await p.evaluate(()=>({hd:document.querySelector('#fun .fun-hd').innerText,sum:document.querySelector('.bq-sum')?.textContent,best:JSON.parse(localStorage.getItem('lamp-bq')||'{}').MRK}));
 ok(/5 of 5 right.*new best/i.test(e2.hd)&&/Every one right/.test(e2.sum)&&e2.best.s===5,tag+' all right: a new best: '+JSON.stringify(e2));
 await p.click('#bqDone');await p.waitForTimeout(500);ok(await p.evaluate(()=>!document.querySelector('#scrim')),tag+' Done closes');
 await p.evaluate(()=>openBook('MRK'));await p.waitForTimeout(900);ok(/Your best: 5 of 5/.test(await p.evaluate(()=>document.querySelector('.bq-row')?.textContent||'')),tag+' the book shows your best score');
 await p.evaluate(()=>$('#scrim')?.remove());await p.evaluate(()=>openBook('ROM'));await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('#bqGo')&&!document.querySelectorAll('.cgrid button.rd').length&&!document.querySelector('.bk-all').open),tag+' Romans: a quiz now (new questions), no chapters read, list closed');
 await p.evaluate(()=>$('#scrim')?.remove());await p.evaluate(()=>openBook('OBA'));await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!document.querySelector('#bqGo')),tag+' Obadiah: too few questions, so no quiz');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// group quick quiz: a wrong answer goes to Second chance
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await p.evaluate(()=>{setView('group')});await p.waitForTimeout(700);await p.evaluate(()=>{G.sub='games';gSel();gTabInd();startGame('quiz')});await p.waitForTimeout(1500);
 let got=false;for(let i=0;i<8&&!got;i++){const has=await p.$('[data-qo]:not([disabled])');if(!has){await p.waitForTimeout(800);continue}
  await p.click('[data-qo]:not([disabled]) >> nth=0');await p.waitForTimeout(300);got=await p.evaluate(()=>!!document.querySelector('[data-qo].wrong'));if(!got)await p.waitForTimeout(1800)}
 ok(got&&await p.evaluate(()=>missList().length>=1),'group quick quiz: a wrong answer is saved for Second chance');
 ok(!errs.length,'group quiz: no errors '+errs.join('|'));await ctx.close()}
// motion on, keyboard, and the new questions
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light',rm:'no-preference'});
 await p.evaluate(()=>openBook('GAL'));await p.waitForTimeout(900);await p.focus('#bqGo');await p.keyboard.press('Enter');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>document.activeElement?.matches('#fun [data-qo]')),'keyboard: Enter starts the quiz and focuses an answer');
 const r=await rightIdx(p);await p.keyboard.press('Tab');await p.focus(`#fun [data-qo="${r}"]`);await p.keyboard.press('Enter');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.querySelector('#fun [data-qo].right')),'keyboard: Enter answers');
 const bank=await p.evaluate(async()=>{const F=await loadFun();const nw=F.q.slice(485);return {n:F.q.length,ok:nw.every(x=>x.a.length===4&&new Set(x.a).size===4&&/^[1-3A-Z]{3}\.\d+\.\d+$/.test(x.ref)&&x.c!=='books'),books:[...new Set(nw.map(x=>x.ref.split('.')[0]))].sort().join(',')}});
 ok(bank.n===502&&bank.ok&&bank.books==='1CO,EPH,GAL,HEB,PHP,ROM','17 new questions, well formed, on 6 letters: '+JSON.stringify(bank));
 const counts=await p.evaluate(async()=>{const o={};for(const c of ['ROM','PHP','EPH','HEB','GAL','1CO','MAT','OBA'])o[c]=(await bqPool(c)).length;return o});
 ok(['ROM','PHP','EPH','HEB','GAL','1CO'].every(c=>counts[c]>=4)&&counts.MAT>=20&&counts.OBA<4,'each of the 6 letters now has a quiz: '+JSON.stringify(counts));
 ok(!errs.length,'motion: no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
