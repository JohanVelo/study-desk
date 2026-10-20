const {chromium,devices}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();
for(const [dev,cs] of [['iPhone 13','light'],['Pixel 7','dark']]){
const ctx=await b.newContext({...devices[dev],colorScheme:cs});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.addInitScript("window.__me='u_b'");await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{__mock.store.set('group/meta',{week:'w7',name:'Bible study group',auto:true,at:new Date().toISOString()})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(2000);
const tip=await p.$('#hsTip');await p.screenshot({path:`s11/m-today-${cs}.png`});
await p.tap('#hsGo');await p.waitForTimeout(900);await p.screenshot({path:`s11/m-install-${cs}.png`});
const os=await p.evaluate(()=>document.querySelector('[data-os][aria-pressed="true"]')?.textContent);
await p.keyboard.press('Escape');await p.waitForTimeout(400);
await p.tap('#hsX');await p.waitForTimeout(500);const gone=!(await p.$('#hsTip'));
await p.evaluate(()=>openSettings());await p.waitForTimeout(400);const si=!!(await p.$('#setInstall'));
console.log(dev,cs,'tip:',!!tip,'os:',os,'dismissed:',gone,'settings btn:',si,'sw',await p.evaluate(()=>document.documentElement.scrollWidth),'ERR',errs.join('|')||'none');await ctx.close()}
const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(MOCK);const p=await ctx.newPage();await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(1500);console.log('desktop tip:',!!(await p.$('#hsTip')));
await b.close()})();
