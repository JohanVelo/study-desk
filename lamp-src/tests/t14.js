const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';require('fs').mkdirSync('s9',{recursive:true});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});await ctx.addInitScript(()=>localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}})));
const p=await ctx.newPage();await p.goto(base);await p.waitForTimeout(1500);
await p.evaluate(()=>setView('learn'));await p.waitForTimeout(800);
await p.evaluate(()=>document.getElementById('diagrams').scrollIntoView());await p.waitForTimeout(800);await p.screenshot({path:'s9/learn-diag.png'});
for(const k of Object.keys(FIGS_KEYS=await p.evaluate(()=>Object.keys(FIGS)))){}
const keys=await p.evaluate(()=>Object.keys(FIGS));
for(const k of keys){await p.evaluate(k=>openFig(k),k);await p.waitForTimeout(1800);await p.screenshot({path:`s9/fig-${k}.png`});await p.evaluate(()=>closeFig());await p.waitForTimeout(400)}
// today map card
await p.evaluate(()=>setView('today'));await p.waitForTimeout(800);
const n=await p.evaluate(()=>{const e=document.querySelector('.mapcard,.map,#map,[class*=map]');if(e){e.scrollIntoView();return e.className}return null});await p.waitForTimeout(700);await p.screenshot({path:'s9/today-map.png'});console.log(keys,n);
await b.close()})();
