const {chromium,devices}=require(process.env.PW);const fs=require('fs');
const FAKE=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
(async()=>{const b=await chromium.launch();let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const ctx=await b.newContext({...devices['iPhone 13']});
await ctx.route('**/supabase.js',r=>r.fulfill({body:FAKE,contentType:'application/javascript'}));
await ctx.addInitScript(()=>{localStorage.setItem('lamp-local','1');localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8767/');await p.waitForTimeout(3000);
await p.evaluate(()=>openSettings());await p.waitForTimeout(500);ok(!!await p.$('#offBible'),'offline buttons show');
await p.$eval('#offBible',e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:__dirname+'/shots/off-before.png'});
await p.click('#offBible');await p.waitForFunction(()=>/saved|Saved \d/.test(document.querySelector('#offMsg')?.textContent||''),null,{timeout:60000});
const m=await p.textContent('#offMsg');ok(/whole Bible is saved/.test(m),'bible saved: '+m);await p.waitForTimeout(1500);ok(await p.getAttribute('#offBible','aria-pressed')==='true','button shows saved');await p.screenshot({path:__dirname+'/shots/off-after.png'});
// offline reading of a non-plan book
await ctx.setOffline(true);await p.reload().catch(()=>{});await p.waitForTimeout(3000);
const t=await p.evaluate(async()=>{try{const a=await loadBook("BSB","OBA");return a[0][0].slice(0,40)}catch(e){return 'ERR '+e}});ok(!/ERR/.test(t),'offline Obadiah: '+t);
ok(!errs.length,'no errors '+errs.join('|'));await b.close();console.log(fails?fails+' FAILED':'ALL PASS')})();
