const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});await ctx.addInitScript(()=>localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}})));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1500);
const keys=await p.evaluate(()=>Object.keys(FIGS));
for(const k of keys){await p.evaluate(k=>openFig(k),k);await p.waitForTimeout(2600);await p.screenshot({path:`s9/fig-${k}.png`});
 const g=await p.$('.figv [data-note]');if(g&&k==='paul'){await g.dispatchEvent('click');await p.waitForTimeout(500);await p.screenshot({path:`s9/fig-${k}-note.png`})}
 await p.evaluate(()=>closeFig(true));await p.waitForTimeout(200)}
console.log(errs.join('|')||'no errors');await b.close()})();
