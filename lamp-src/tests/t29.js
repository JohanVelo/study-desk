const {chromium,devices}=require(process.env.PW);const fs=require('fs');
const FAKE=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
(async()=>{const b=await chromium.launch();
for(const [dev,cs] of [['iPhone 13','light'],['Desktop Chrome','dark']]){
const ctx=await b.newContext({...devices[dev],colorScheme:cs,...(dev==='Desktop Chrome'?{viewport:{width:1440,height:900}}:{})});
await ctx.route('**/supabase.js',r=>r.fulfill({body:FAKE,contentType:'application/javascript'}));
await ctx.addInitScript(()=>{localStorage.setItem('lamp-local','1');localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8767/');await p.waitForTimeout(2500);
const n=await p.evaluate(()=>ART.length);
await p.evaluate(()=>setView('learn'));await p.waitForTimeout(800);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/^Art$/.test(x.textContent.trim()));b&&b.click()});await p.waitForTimeout(1500);
await p.screenshot({path:__dirname+`/shots/art-${dev.replace(' ','')}.png`});
const broken=await p.evaluate(async()=>{let bad=0;for(let i=100;i<ART.length;i++){const ok=await new Promise(r=>{const im=new Image();im.onload=()=>r(1);im.onerror=()=>r(0);im.src=artSrc(i,true)});if(!ok)bad++}return bad});
console.log(dev,'ART',n,'broken thumbs',broken,'ERR',errs.join('|')||'none');await ctx.close()}
await b.close()})();
