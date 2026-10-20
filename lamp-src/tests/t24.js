const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();
for(const [w,cs] of [[390,'light'],[1440,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:844},colorScheme:cs});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t='<meta charset="utf-8">'+await res.text();r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{__mock.store.set('group/meta',{week:'w11',auto:true,at:new Date(Date.now()-8*864e5).toISOString()})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(1500);await p.evaluate(()=>setView('group'));await p.waitForTimeout(900);
const log=[];log.push('auto after w11: '+await p.evaluate(()=>curWk()+' | '+document.querySelector('.gseries')?.textContent));
await p.screenshot({path:`s11/james-${w}-${cs}.png`});
await p.selectOption('#gSer','som');await p.waitForTimeout(500);log.push('switch series: '+await p.evaluate(()=>WK().id+' '+document.querySelector('.gseries')?.textContent.slice(0,40)));
await p.selectOption('#gSer','jas');await p.waitForTimeout(500);
await p.click('[data-wk="j3"]');await p.waitForTimeout(500);
await p.click('[data-gt="games"]');await p.waitForTimeout(400);await p.click('[data-game="match"]');await p.waitForTimeout(500);log.push('match cards: '+await p.evaluate(()=>document.querySelectorAll('.mcard').length));
await p.evaluate(()=>{G.game=null;G.sub='games';render()});await p.waitForTimeout(300);await p.click('[data-game="verse"]');await p.waitForTimeout(1500);log.push('verse words: '+await p.evaluate(()=>document.querySelectorAll('[data-vk]').length));
await p.evaluate(()=>{G.game=null;G.sub='games';render()});await p.waitForTimeout(300);await p.click('[data-game="quiz"]');await p.waitForTimeout(500);log.push('quiz q: '+await p.evaluate(()=>document.querySelector('.qq,.gq h3,h3')?.textContent?.slice(0,60)));
await p.evaluate(()=>{G.game=null;G.sub='games';render()});await p.waitForTimeout(300);await p.click('[data-gt="study"]');await p.waitForTimeout(400);
await p.click('#gRead');await p.waitForTimeout(1500);log.push('reader: '+await p.textContent('.rbar .rt').catch(()=>'?')+' range '+await p.evaluate(()=>document.querySelectorAll('#scr .v.rng').length));
await p.keyboard.press('Escape');await p.waitForTimeout(400);await p.evaluate(()=>scrollTo(0,0));
await p.click('#gLead');await p.waitForTimeout(400);log.push('leader options: '+await p.evaluate(()=>document.querySelectorAll('#ldWk option').length+' groups '+document.querySelectorAll('#ldWk optgroup').length));
console.log(w,cs,'\n  '+log.join('\n  '),'\n  ERR',errs.join('|')||'none');await ctx.close()}
await b.close()})();
