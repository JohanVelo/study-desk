// v34: grace days keep a streak alive, and every quiz shows what you picked and the right answer (JJ, 28 Oct 2026)
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1500);
// pattern: a string of 1 (read) and 0 (missed) days, oldest first, ending on `end`
const run=(pat,endRead=true)=>p.evaluate(([pat,endRead])=>{const end=new Date(2026,9,28);const days=new Set();const n=pat.length;
  [...pat].forEach((c,i)=>{const d=new Date(end);d.setDate(d.getDate()-(n-1-i));if(c==="1")days.add(dayKey(d))});return streakRun(days,end)},[pat,endRead]);
let r;
r=await run('1111111');ok(r.n===7&&r.bank===1,'7 days earns 1 grace day '+JSON.stringify(r));
r=await run('11111110');ok(r.n===7,'today not read yet: streak stays 7 '+JSON.stringify(r));
r=await run('111111101');ok(r.n===8&&r.used===0&&r.rests===1,'one missed day after 6+ = free rest day '+JSON.stringify(r));
r=await run('1111111001');ok(r.n===8&&r.used===1&&r.bank===0,'two missed days: rest day + 1 grace day '+JSON.stringify(r));
r=await run('11111110001');ok(r.n===1&&r.bank===0,'three missed days with 1 grace: streak restarts '+JSON.stringify(r));
r=await run('1'.repeat(21)+'0001');ok(r.n===22&&r.used===2&&r.bank===1,'21 days banks 3; 3 missed = rest + 2 grace '+JSON.stringify(r));
r=await run('1'.repeat(40));ok(r.bank===3,'grace days cap at 3 '+JSON.stringify(r));
r=await run('110111');ok(r.n===5&&r.best===5,'the free rest day can come early: 110111 counts 5 '+JSON.stringify(r)+'');
r=await run('1111111'+'0'.repeat(5)+'11');ok(r.n===2&&r.best===7,'best streak remembered after a break '+JSON.stringify(r));
// streak sheet
await p.evaluate(()=>{const d=new Date();for(let i=1;i<=9;i++){const x=new Date(d);x.setDate(d.getDate()-i);state.done[i]=x.toISOString()}render()});await p.waitForTimeout(400);
await p.click('#topStreak');await p.waitForTimeout(500);
const sh=await p.evaluate(()=>document.querySelector('#scrim .stk')?.innerText||'');
ok(/9 days and counting/.test(sh)&&/1 grace day saved/i.test(sh)&&/how it works/i.test(sh),'streak sheet explains grace days: '+sh.slice(0,140).replace(/\n/g,' | '));
ok(await p.evaluate(()=>document.querySelectorAll('.stk-grace i.on').length)===1,'one grace flame lit');
await p.screenshot({path:__dirname+'/s49-streak.png'});
await p.evaluate(()=>closeTop());await p.waitForTimeout(300);
// Today's five: answer all five wrong-or-right and check the review
await p.evaluate(()=>openPlay('five'));await p.waitForTimeout(1200);
for(let i=0;i<5;i++){await p.waitForSelector('#fun [data-qo]');const right=await p.evaluate(()=>{const b=[...document.querySelectorAll('#fun [data-qo]')];return b.length});
  // pick option 0 each time; whichever it is, the review must show the truth
  const fq=await p.evaluate(()=>{document.querySelector('#fun [data-qo="0"]').click();const f=document.querySelector('#fun .fq-f');return {miss:f.classList.contains('miss'),t:f.hidden?'':f.textContent,wrong:!!document.querySelector('#fun .qo.wrong')}});
  if(fq.wrong)ok(/^The answer: /.test(fq.t),'wrong pick shows the answer at once: '+fq.t.slice(0,60));
  await p.waitForTimeout(3400)}
const rev=await p.evaluate(()=>[...document.querySelectorAll('#fun .ans-rev li')].map(li=>({ok:li.classList.contains('ok'),r:li.querySelector('.ar.r')?.innerText||'',m:li.querySelector('.ar.m')?.innerText||''})));
ok(rev.length===5,'five answers reviewed');
ok(rev.every(x=>/^✓/.test(x.r)&&x.r.length>3),'every row shows the right answer');
ok(rev.filter(x=>!x.ok).every(x=>/You said/i.test(x.m)),'every wrong row shows what you said');
await p.screenshot({path:__dirname+'/s49-five.png',fullPage:true});
ok(!errs.length,'no page errors '+errs.join('|'));
console.log(log.join('\n'));await b.close();console.log(fails?'FAILED':'ALL PASS');process.exit(fails?1:0)})();
