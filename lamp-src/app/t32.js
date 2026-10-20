const {chromium,devices}=require(process.env.PW);const fs=require('fs');
const FAKE=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
(async()=>{const b=await chromium.launch();let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [dev,cs,day] of [['iPhone 13','light',112],['iPhone 13','dark',3],['Desktop Chrome','light',40],['Desktop Chrome','dark',112]]){
const tag=dev.replace(' ','')+'-'+cs;
const ctx=await b.newContext({...devices[dev],colorScheme:cs,...(dev==='Desktop Chrome'?{viewport:{width:1440,height:900}}:{})});
await ctx.route('**/supabase.js',r=>r.fulfill({body:FAKE,contentType:'application/javascript'}));
await ctx.addInitScript(d=>{localStorage.setItem('lamp-local','1');const done={};for(let i=1;i<d;i++)done[i]=new Date().toISOString();localStorage.setItem('lamp-state-v1',JSON.stringify({done,notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))},day);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8767/');await p.waitForTimeout(4000);
await p.evaluate(()=>stepOpenAt(0));await p.waitForTimeout(200);
const vis=await p.evaluate(()=>{const e=document.querySelector('#wotd');return e&&!e.hidden});ok(vis,`${tag} day ${day} word card shows`);
if(vis){const t=await p.textContent('#wotd');console.log('   ',t.replace(/\s+/g,' ').slice(0,200));
 await p.$eval('#wotd',e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(600);
 await (await p.$('#wotd')).screenshot({path:`${__dirname}/shots/wotd-${tag}.png`});
 await p.click('#wdGo');await p.waitForTimeout(2000);ok(await p.evaluate(()=>OG.sel>=0&&!!document.querySelector('#ogC .og-lem')),`${tag} opens the verse with the word picked`);
 await p.screenshot({path:`${__dirname}/shots/wotd-open-${tag}.png`})}
ok(!errs.length,`${tag} no errors ${errs.join('|')}`);await ctx.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS')})();
