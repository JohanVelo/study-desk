// v40: Second chance (missed quiz questions come back; right on two different days = learnt), balanced headings, 3 book-intro dates
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s55',{recursive:true});
const D=n=>new Date(Date.parse('2026-11-03T09:00:00+02:00')+n*864e5);
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.clock.setFixedTime(D(0));
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(()=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}))});
  await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const list=p=>p.evaluate(()=>missList());
const answer=async(p,right)=>{// pick the right (or a wrong) option by its text, using the stored question
  return p.evaluate(r=>{const h=document.querySelector('#fun .qcard h3').textContent;const it=missList().find(x=>x.q.q===h);const good=it.q.o[it.q.c];
    const bs=[...document.querySelectorAll('#fun [data-qo]')];const t=bs.find(x=>r?x.textContent===good:x.textContent!==good);t.click();return {h,good,picked:t.textContent}},right)};
// ---- full click-through on a phone ----
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await p.evaluate(()=>setView('learn'));await p.waitForTimeout(700);
 ok(await p.evaluate(()=>!document.querySelector('.mc-row')),'nothing missed yet: no Second chance row');
 // Today's five: always tap the first option, note which were wrong
 await p.click('[data-fresh="full"] [data-play="five"]');await p.waitForTimeout(900);let wrong5=0;
 for(let i=0;i<5;i++){await p.click('#fun [data-qo="0"]');await p.waitForTimeout(150);if(await p.evaluate(()=>!!document.querySelector('#fun [data-qo="0"].wrong')))wrong5++;await p.waitForTimeout(3300)}
 let L=await list(p);ok(L.length===wrong5,`Today's five: each miss saved (${wrong5} missed, ${L.length} saved)`);
 await p.evaluate(()=>document.querySelector('#scrim')?.remove());
 // Keep playing until two more misses
 await p.evaluate(()=>openEndless('mix'));await p.waitForTimeout(2500);let wrongE=0,n=0;
 while(wrongE<2&&n<16){await p.waitForSelector('#fun [data-qo="0"]');await p.click('#fun [data-qo="0"]');n++;await p.waitForTimeout(150);if(await p.evaluate(()=>!!document.querySelector('#fun [data-qo="0"].wrong')))wrongE++;await p.waitForTimeout(3400)}
 await p.click('#eStop');await p.waitForTimeout(300);await p.evaluate(()=>document.querySelector('#scrim')?.remove());
 L=await list(p);ok(L.length===wrong5+wrongE&&L.every(x=>x.box===0&&x.due===L[0].due),`Keep playing misses saved too (${L.length}), all due tomorrow`);
 ok(await p.evaluate(()=>!missDue().length&&!document.querySelector('.mc-row')),'same day: nothing to try again yet');
 // next day
 await ctx.clock.setFixedTime(D(1));await p.reload();await p.waitForTimeout(1800);
 const tr=await p.evaluate(()=>document.querySelector('[data-fresh] .mc-row')?.innerText.replace(/\n+/g,' | '));
 ok(new RegExp(`${L.length} questions you missed are back`).test(tr||''),'next day: Today shows Second chance: '+tr);
 await p.evaluate(()=>setView('learn'));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>document.querySelector('[data-fresh="full"] .mc-row').getBoundingClientRect().height>=44),'row is a big enough tap target');
 await p.evaluate(()=>document.querySelector('[data-fresh="full"] .mc-row').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s55/row-390-light.png`});
 await p.click('[data-fresh="full"] .mc-row');await p.waitForTimeout(600);
 ok(/Question 1 of \d+ · you missed this one before/i.test(await p.evaluate(()=>document.querySelector('#fun').innerText)),'round opens with the first missed question');
 await p.screenshot({path:`${__dirname}/s55/question-390-light.png`});
 const first=await answer(p,true);await p.waitForTimeout(1900);
 const second=await answer(p,false);await p.waitForTimeout(3400);
 L=await list(p);const f=L.find(x=>x.q.q===first.h),s=L.find(x=>x.q.q===second.h);const today=await p.evaluate(()=>funDay());
 ok(f&&f.box===1&&f.due===today+3,'right once: comes back in 3 days '+JSON.stringify(f&&{box:f.box,due:f.due-today}));
 ok(s&&s.box===0&&s.due===today+1,'missed again: back tomorrow');
 while(await p.evaluate(()=>!!document.querySelector('#fun [data-qo]'))){await answer(p,true);await p.waitForTimeout(1900)}
 const end=await p.evaluate(()=>document.querySelector('#fun').innerText.replace(/\n+/g,' | '));
 ok(/Second chance/.test(end)&&/right this time/i.test(end)&&/will come back/i.test(end)&&/The ones to remember/i.test(end),'end screen sums it up: '+end.slice(0,220));
 await p.screenshot({path:`${__dirname}/s55/end-390-light.png`});
 await p.click('#mcDone');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.querySelector('#scrim')&&!document.querySelector('.mc-row')),'Done closes; nothing else due today, so the row goes');
 // 3 days later: the one right once is right again -> learnt
 await ctx.clock.setFixedTime(D(4));await p.reload();await p.waitForTimeout(1800);await p.evaluate(()=>setView('learn'));await p.waitForTimeout(500);
 await p.click('[data-fresh="full"] .mc-row');await p.waitForTimeout(600);
 const before=(await list(p)).length;let firstSeen=false;
 while(await p.evaluate(()=>!!document.querySelector('#fun [data-qo]'))){const a=await answer(p,true);if(a.h===first.h)firstSeen=true;await p.waitForTimeout(1900)}
 L=await list(p);const end2=await p.evaluate(()=>document.querySelector('#fun').innerText.replace(/\n+/g,' | '));
 ok(firstSeen&&!L.find(x=>x.q.q===first.h)&&/learnt/i.test(end2),'right on a second day: learnt and removed: '+end2.slice(0,160));
 ok(L.length<before,'list got shorter ('+before+' → '+L.length+')');
 await p.screenshot({path:`${__dirname}/s55/learnt-390-light.png`});
 ok(!errs.length,'no page errors '+errs.join('|'));await ctx.close()}
// ---- every size and theme: row, question, end; options are reshuffled; keyboard ----
const SEED=()=>{const a=[0,1,2].map(i=>({q:{id:'t'+i,q:['Who built the ark?','Which sea did Moses cross?','Where was Jesus born?'][i],o:[['Noah','Moses','Abraham','David'],['The Red Sea','The Dead Sea','The Sea of Galilee','The Great Sea'],['Bethlehem','Nazareth','Jerusalem','Capernaum']][i],c:0,r:'Old Testament',f:''},due:funDay(),box:i===2?1:0}));localStorage.setItem('lamp-miss-v1',JSON.stringify(a))};
for(const [w,h,cs] of [[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=w+'-'+cs;const {ctx,p,errs}=await open({w,h,cs});
 await p.evaluate(SEED);await p.evaluate(()=>{paintFresh();setView('learn')});await p.waitForTimeout(600);
 ok(/3 questions you missed are back/.test(await p.evaluate(()=>document.querySelector('[data-fresh="full"] .mc-row').innerText)),tag+' row shows 3');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 await p.evaluate(()=>document.querySelector('[data-fresh="full"] .mc-row').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s55/row-${tag}.png`});
 if(w===1440){await p.focus('[data-fresh="full"] .mc-row');await p.keyboard.press('Enter')}else await p.click('[data-fresh="full"] .mc-row');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!!document.querySelector('#fun .qcard')),tag+(w===1440?' keyboard Enter opens the round':' tap opens the round'));
 let moved=false;for(let k=0;k<3;k++){const pos=await p.evaluate(()=>{const it=missList().find(x=>x.q.q===document.querySelector('#fun .qcard h3').textContent);return [...document.querySelectorAll('#fun [data-qo]')].findIndex(x=>x.textContent===it.q.o[it.q.c])});if(pos!==0)moved=true;
  if(k===2){ok(/right once, one more to learn it/i.test(await p.evaluate(()=>document.querySelector('#fun').innerText)),tag+' third one says it was right once');await p.screenshot({path:`${__dirname}/s55/question-${tag}.png`})}
  await answer(p,true);await p.waitForTimeout(1900)}
 ok(moved,tag+' options are reshuffled, so position does not give it away');
 const e=await p.evaluate(()=>document.querySelector('#fun').innerText);ok(/3 of 3 right this time/i.test(e)&&/1 question learnt/.test(e)&&/2 questions you got right will come back in 3 days/.test(e),tag+' end: 3 of 3, 1 learnt, 2 back');
 await p.screenshot({path:`${__dirname}/s55/end-${tag}.png`});
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// ---- empty and broken storage ----
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>openMiss());await p.waitForTimeout(300);
 ok(/Nothing to try again today/i.test(await p.evaluate(()=>document.querySelector('#fun').innerText)),'empty: friendly explanation');await p.screenshot({path:`${__dirname}/s55/empty-390-light.png`});
 await p.evaluate(()=>{localStorage.setItem('lamp-miss-v1','{oops');paintFresh()});ok(await p.evaluate(()=>missList().length===0&&!document.querySelector('.mc-row')),'broken saved data is ignored');
 await p.evaluate(()=>{localStorage.setItem('lamp-miss-v1',JSON.stringify([{q:{id:'x',q:'?',o:['a'],c:3},due:0,box:0},null,{q:{id:'y',q:'Fine?',o:['a','b','c','d'],c:1},due:0,box:0}]))});ok(await p.evaluate(()=>missList().length===1),'malformed entries are dropped');
 await p.evaluate(()=>{for(let i=0;i<50;i++)missAdd({id:'z'+i,q:'Q'+i,o:['a','b','c','d'],c:0})});ok(await p.evaluate(()=>missList().length===40&&missList()[39].q.id==='z49'),'keeps the newest 40');
 await p.evaluate(()=>{missAdd({id:'z49',q:'Q49',o:['a','b','c','d'],c:0})});ok(await p.evaluate(()=>missList().filter(x=>x.q.id==='z49').length===1),'the same question is never saved twice');
 ok(!errs.length,'no page errors (empty)');await ctx.close()}
// ---- feel: balanced headings, pretty paragraphs ----
{const {ctx,p}=await open({w:390,h:844,cs:'light'});const t=await p.evaluate(()=>({h:getComputedStyle(document.querySelector('h1,h2')).textWrap||getComputedStyle(document.querySelector('h1,h2')).textWrapStyle,p:getComputedStyle(document.querySelector('p')).textWrapStyle}));
 ok(/balance/.test(t.h)&&/pretty/.test(t.p),'headings balance and paragraphs wrap prettily: '+JSON.stringify(t));
 // accuracy: book intros
 const bi=await p.evaluate(()=>[BOOKINFO.PSA[2],BOOKINFO.ISA[2],BOOKINFO.NAM[2]]);
 ok(/Psalm 90/.test(bi[0])&&/Psalm 137/.test(bi[0]),'Psalms date names Moses (Ps 90) and the exile (Ps 137)');
 ok(/Many scholars think chapters 40 to 66/.test(bi[1])&&/44:28/.test(bi[1]),'Isaiah notes the later-chapters view, hedged');
 ok(/663 BC \(3:8\)/.test(bi[2])&&/612 BC/.test(bi[2]),'Nahum dated between Thebes (3:8) and Nineveh');
 await p.evaluate(()=>openBook('ISA'));await p.waitForTimeout(500);ok(/chapters 40 to 66/.test(await p.evaluate(()=>document.querySelector('#scrim').innerText)),'Isaiah intro shows the new note');await p.screenshot({path:`${__dirname}/s55/isaiah-390-light.png`});
 await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
