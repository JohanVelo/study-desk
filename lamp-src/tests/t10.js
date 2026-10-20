const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const seed={done:{1:new Date().toISOString()},notes:{},saved:{"MRK.1.11":{ref:"Mark 1:11",text:"A voice came out of the sky, “You are my beloved Son, in whom I am well pleased.”",day:1,v:11,at:new Date().toISOString()},"JHN.3.16":{ref:"John 3:16",text:"For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",day:5,v:16,at:new Date().toISOString(),m:1}},settings:{onboarded:true,welcomed:true,intro:false}};
for(const cs of ['light','dark']){
const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:cs});await ctx.addInitScript(s=>localStorage.setItem('lamp-state-v1',s),JSON.stringify(seed));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(base);await p.waitForTimeout(1000);
// highlight
await p.click('#openReader');await p.waitForTimeout(900);await p.click('#scr .v >> nth=2');await p.waitForTimeout(300);await p.screenshot({path:`s6/h-vbar-${cs}.png`});await p.click('[data-hl="g"]');await p.waitForTimeout(200);await p.click('#scr .v >> nth=4');await p.click('[data-hl="b"]');await p.waitForTimeout(300);await p.screenshot({path:`s6/h-hl-${cs}.png`});
const hl=await p.evaluate(()=>JSON.stringify(state.hl));await p.keyboard.press('Escape');await p.waitForTimeout(500);
// memorize
await p.evaluate(()=>{jTab='memo';setView('journal')});await p.waitForTimeout(700);await p.screenshot({path:`s6/h-memo0-${cs}.png`});
await p.click('#mNext');await p.waitForTimeout(400);await p.click('.mw.hid >> nth=0');await p.screenshot({path:`s6/h-memo1-${cs}.png`});
await p.click('#mNext');await p.waitForTimeout(400);await p.screenshot({path:`s6/h-memo2-${cs}.png`});
await p.click('#mNext');await p.waitForTimeout(400);await p.click('#mGot');await p.waitForTimeout(1200);
const m=await p.evaluate(()=>JSON.stringify(Object.values(state.saved).map(v=>[v.ref,v.m])));
// holy week
await p.evaluate(()=>{state.selected=PLAN.find(x=>x.book==='MRK'&&x.ch===14).day;setView('today')});await p.waitForTimeout(800);
const strip=await p.$$eval('.seeit [data-fig]',x=>x.map(e=>e.dataset.fig));
await p.click('.seeit [data-fig="holyweek"]');await p.waitForTimeout(2600);await p.screenshot({path:`s6/h-hw-${cs}.png`});await p.click('[data-rt="4"]');await p.waitForTimeout(1800);await p.screenshot({path:`s6/h-hw4-${cs}.png`});
await p.keyboard.press('Escape');await p.waitForTimeout(400);await p.keyboard.press('3');await p.waitForTimeout(600);const v=await p.evaluate(()=>view);
console.log(cs,hl,m,strip,v,errs.join('|'));await ctx.close()}
await b.close()})();
