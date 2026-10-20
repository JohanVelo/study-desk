const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();fs.mkdirSync('s11',{recursive:true});
const modes={member:"window.__me='u_b'",readonly:"",signedout:""};
for(const [mode,pre] of Object.entries(modes)){for(const cs of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:cs});
 await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace('<head>','<head><meta charset="utf-8">');r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
 await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
 if(mode!=='signedout'){await ctx.addInitScript(pre);await ctx.addInitScript(MOCK);
  if(mode==='readonly')await ctx.addInitScript(()=>{const u=window.claude.use;window.claude={use:async n=>{const x=await u(n);if(n==='user')return{...x,can:async()=>false};if(n==='db'){const d=x.doc;return{...x,doc:p=>{const r=d(p);return{...r,set:async()=>{throw{code:'permission_denied'}},update:async()=>{throw{code:'permission_denied'}}}}}}return x}}});
  await ctx.addInitScript(()=>{const S=window.__mock.store;S.set('group/meta',{week:'w7',name:'Bible study group',when:''});S.set('gm/u_a',{joined:'2026-10-19',pr:{p1:{t:'Pray for my exams',at:'2026-10-19'}}})});}
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(1800);
 await p.evaluate(()=>setView('group'));await p.waitForTimeout(1200);
 const info=await p.evaluate(()=>({lead:!!document.querySelector('#gLead'),note:document.querySelector('.gnote')?.textContent||'',ro:G.ro,on:G.on,dis:document.querySelectorAll('.ganswer[disabled]').length,sw:document.documentElement.scrollWidth}));
 await p.screenshot({path:`s11/${mode}-${cs}-study.png`});
 for(const t of ['ice','games','test','prayer','topics']){await p.click(`[data-gt="${t}"]`);await p.waitForTimeout(700);await p.screenshot({path:`s11/${mode}-${cs}-${t}.png`,fullPage:true})}
 await p.click('[data-gt="games"]');await p.waitForTimeout(400);await p.click('[data-game="live"]');await p.waitForTimeout(600);const live=await p.evaluate(()=>document.querySelector('#toast,.toast')?.textContent||document.querySelector('#gGame')?.textContent.slice(0,80));
 console.log(mode,cs,JSON.stringify(info),'live:',live,'ERR',errs.join('|')||'none');await ctx.close()}}
await b.close()})();
