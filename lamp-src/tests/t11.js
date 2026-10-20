const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
for(const [w,h,cs] of [[1440,900,'light'],[1280,800,'dark'],[390,844,'light']]){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs});await ctx.addInitScript(()=>localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}})));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);
await p.screenshot({path:`s6/t-${w}.png`,fullPage:true});const order=await p.evaluate(()=>[...document.querySelectorAll('#view .card,#view .finish')].map(e=>[e.className.split(' ')[1]||e.className,Math.round(e.getBoundingClientRect().top),Math.round(e.getBoundingClientRect().left)]));
console.log(w,JSON.stringify(order),await p.evaluate(()=>document.documentElement.scrollWidth),errs.join('|'));await ctx.close()}
await b.close()})();
