// Silent update: a new build goes live while the app is open, and the app swaps to it on its own.
const {chromium,devices}=require(process.env.PW);const fs=require('fs');const {execSync}=require('child_process');
const FAKE=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});
await ctx.route('**/supabase.js',r=>r.fulfill({body:FAKE,contentType:'application/javascript'}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
let navs=0;p.on('framenavigated',f=>{if(f===p.mainFrame())navs++});
await p.goto('http://localhost:8767/');await p.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:15000});
const v1=await p.evaluate(async()=>(await caches.keys()).join());
const n0=navs;
execSync('python3 -c "import time;time.sleep(1.1)"; python3 build.py',{cwd:__dirname});
await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
await p.waitForTimeout(6000);
const v2=await p.evaluate(async()=>(await caches.keys()).join());
const toast=await p.waitForFunction(()=>/updated itself/.test(document.querySelector('#toast')?.textContent||''),null,{timeout:8000}).then(()=>true,()=>false);
console.log('cache before:',v1,'after:',v2,'auto reloads:',navs-n0,'toast:',toast,'ERR',errs.join('|')||'none');
console.log(v1!==v2&&navs-n0===1&&toast?'PASS silent update':'FAIL silent update');await b.close()})();
