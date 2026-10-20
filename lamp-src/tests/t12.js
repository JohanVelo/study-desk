const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs});await ctx.addInitScript(()=>localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString(),2:new Date().toISOString(),3:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}})));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('requestfailed',r=>errs.push('fail '+r.url()));
await p.goto(base);await p.waitForTimeout(2500);await p.screenshot({path:`s6/a-today-${w}.png`});
await p.click('#openReader');await p.waitForTimeout(1500);await p.screenshot({path:`s6/a-reader-${w}.png`});
await p.click('.rart button');await p.waitForTimeout(900);await p.screenshot({path:`s6/a-lb-${w}.png`});await p.keyboard.press('ArrowRight');await p.waitForTimeout(700);const t=await p.textContent('.artv-meta h2');
await p.click('#artRead').catch(()=>{});await p.waitForTimeout(900);const after=await p.evaluate(()=>[view,!!document.querySelector('.reader'),!!document.querySelector('#artv'),PLAN[state.selected-1]?.book+PLAN[state.selected-1]?.ch]);
await p.evaluate(()=>{setView('learn')});await p.waitForTimeout(800);await p.evaluate(()=>document.getElementById('art').scrollIntoView());await p.waitForTimeout(1500);await p.screenshot({path:`s6/a-gal-${w}.png`});
console.log(w,t,JSON.stringify(after),await p.evaluate(()=>document.documentElement.scrollWidth),errs.join('|'));await ctx.close()}
await b.close()})();
