// v33: the group week moves on at midnight every Monday (JJ, 27 Oct 2026)
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const run=async(iso,fn)=>{const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg'});
 await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
 await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(iso).getTime());
 await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}))});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1200);await fn(p);ok(!errs.length,iso+' no page errors '+errs.join('|'));await ctx.close()};
const wk=(p,meta)=>p.evaluate(m=>{G.meta=m;return curWk()},meta);
await run('2026-10-27T21:00:00+02:00',async p=>{
 ok(await wk(p,{})==='w8','no saved start: Tue 27 Oct is week 8');
 ok(await wk(p,{week:'w7',auto:true,at:'2026-10-21T15:00:00+02:00'})==='w8','leader saved week 7 on a Wednesday: next Monday is week 8');
 ok(await wk(p,{week:'w7',auto:false,at:'2026-10-01T10:00:00+02:00'})==='w7','automatic off: stays on the leader\'s week');
 ok(await wk(p,{week:'w11',auto:true,at:'2026-10-27T10:00:00+02:00'})==='w11','saved today: stays on that week');
 await p.evaluate(()=>{G.meta={};G.wk=null;setView('group')});await p.waitForTimeout(800);
 ok(/New this week/.test(await p.textContent('.gseries')),'Tuesday shows New this week');
 ok(/Next week · from Monday 2 November/.test(await p.textContent('.gnext')),'shows next week from Monday 2 November');
 await p.click('.gnext');await p.waitForTimeout(600);ok(/Do not worry/.test(await p.textContent('.ghero h1')),'tapping it opens next week');
 ok(/Back to this week/.test(await p.textContent('.gnext')),'and offers a way back');});
await run('2026-11-01T23:59:50+02:00',async p=>{
 await p.evaluate(()=>{G.meta={};G.wk=null;setView('group')});await p.waitForTimeout(500);ok(await p.evaluate(()=>curWk())==='w8','Sunday night is still week 8');
 ok(/starts tomorrow/.test(await p.textContent('.gnext')),'Sunday says next week starts tomorrow');
 await p.waitForTimeout(11000);await p.evaluate(()=>wkCheck());await p.waitForTimeout(500);
 ok(await p.evaluate(()=>curWk())==='w9'&&/Do not worry/.test(await p.textContent('.ghero h1')),'at Monday midnight the open app moves to week 9');});
await b.close();console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'all passed');process.exit(fails?1:0)})();
