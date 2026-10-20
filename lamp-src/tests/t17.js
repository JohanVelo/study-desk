const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();const body=(await res.text());r.fulfill({response:res,body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+body,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript(()=>localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}})));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(1500);
await p.evaluate(()=>setView('learn'));await p.waitForTimeout(900);await p.screenshot({path:'s9/learn-top.png'});
for(const id of ['diagrams']){await p.evaluate(id=>document.getElementById(id)?.scrollIntoView(),id);await p.waitForTimeout(900);await p.screenshot({path:`s9/learn-${id}.png`});await p.evaluate(()=>scrollBy(0,700));await p.waitForTimeout(500);await p.screenshot({path:'s9/learn-diag2.png'})}
await p.evaluate(()=>setView('today'));await p.waitForTimeout(900);await p.evaluate(()=>{const e=[...document.querySelectorAll('.kicker')].find(k=>/see it/i.test(k.textContent));e&&e.scrollIntoView()});await p.waitForTimeout(800);await p.screenshot({path:'s9/today-seeit.png'});
console.log(errs.join('|')||'ok');await b.close()})();
