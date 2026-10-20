const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();
for(const cs of ['dark','light']){const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:cs,hasTouch:true,isMobile:true,deviceScaleFactor:2});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t.replaceAll('env(safe-area-inset-top,0px)','47px').replaceAll('env(safe-area-inset-top,0)','47px').replaceAll('env(safe-area-inset-top)','47px');r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
const p=await ctx.newPage();await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(2500);
for(const v of ['today','group','path','learn','journal']){await p.evaluate(v=>setView(v),v);await p.waitForTimeout(900);await p.screenshot({path:`${__dirname}/s16/safe-${v}-${cs}.png`,clip:{x:0,y:0,width:390,height:300}})}
await p.evaluate(()=>setView('today'));await p.evaluate(()=>scrollTo(0,600));await p.waitForTimeout(500);await p.screenshot({path:`${__dirname}/s16/safe-scrolled-${cs}.png`,clip:{x:0,y:0,width:390,height:300}});
await ctx.close()}await b.close()})();
