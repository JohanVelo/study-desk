const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();
for(const [w,cs] of [[390,'light'],[390,'dark'],[1440,'light']]){
const ctx=await b.newContext({viewport:{width:w,height:844},colorScheme:cs});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace('<head>','<head><meta charset="utf-8">');r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript("window.__me='u_b'");await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{__mock.store.set('group/meta',{week:'w7',name:'Bible study group',auto:true,at:new Date().toISOString()})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(1500);
await p.mouse.click(w/2,300);await p.waitForTimeout(1500);
for(let i=0;i<3;i++){await p.click('#onbNext');await p.waitForTimeout(700)}
await p.screenshot({path:`s11/onb4-${w}-${cs}.png`});
const btn=await p.textContent('#onbNext');await p.click('#onbNext');await p.waitForTimeout(1500);
const v=await p.evaluate(()=>view+' | '+(document.querySelector('.ghero h2')?.textContent||''));
await p.screenshot({path:`s11/landed-${w}-${cs}.png`});
// leader as owner
await p.evaluate(()=>{});
console.log(w,cs,'btn:',btn,'landed:',v,'ERR',errs.join('|')||'none');await ctx.close()}
// owner leader sheet
const ctx=await b.newContext({viewport:{width:390,height:844}});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace('<head>','<head><meta charset="utf-8">');r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.addInitScript(MOCK);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(1500);await p.evaluate(()=>setView('group'));await p.waitForTimeout(800);
await p.click('#gLead');await p.waitForTimeout(500);await p.evaluate(()=>document.querySelector('#ldMsg').scrollIntoView());await p.waitForTimeout(300);await p.screenshot({path:'s11/invite.png'});
console.log('msg:',(await p.inputValue('#ldMsg')).slice(0,120),'ERR',errs.join('|')||'none');
await b.close()})();
