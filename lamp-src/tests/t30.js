const {chromium,devices}=require(process.env.PW);const fs=require('fs');
const FAKE=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
(async()=>{const b=await chromium.launch();let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [dev,cs] of [['iPhone 13','light'],['iPhone 13','dark'],['Desktop Chrome','light'],['Desktop Chrome','dark']]){
const tag=dev.replace(' ','')+'-'+cs;
const ctx=await b.newContext({...devices[dev],colorScheme:cs,...(dev==='Desktop Chrome'?{viewport:{width:1440,height:900}}:{})});
await ctx.route('**/supabase.js',r=>r.fulfill({body:FAKE,contentType:'application/javascript'}));
await ctx.addInitScript(()=>{localStorage.setItem('lamp-local','1');localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|Failed to load resource/.test(m.text()))errs.push('console '+m.text())});
await p.goto('http://localhost:8767/');await p.waitForTimeout(2500);
for(const [bk,ch,v,word,lang] of [['JHN',19,30,'τετ','Greek'],['PSA',23,1,'רֹ','Hebrew']]){
  await p.evaluate(([bk,ch,v])=>openPassage(passFor(bk,ch),false,v),[bk,ch,v]);await p.waitForTimeout(1500);
  await p.evaluate(v=>{if(R.sel!==v)selectVerse(v)},v);await p.waitForTimeout(400);
  ok(await p.locator('#vOrig').textContent()===lang,`${tag} ${bk} button says ${lang}`);
  await p.click('#vOrig');await p.waitForSelector('#ogW .og-w',{timeout:8000});
  await p.waitForTimeout(500);await p.screenshot({path:`${__dirname}/shots/orig-${bk}-${tag}.png`});
  const i=await p.evaluate(w=>[...document.querySelectorAll('#ogW .og-o')].findIndex(x=>x.textContent.includes(w)),word);
  ok(i>=0,`${tag} ${bk} shows ${word}`);
  await p.click(`[data-ow="${i}"]`);await p.waitForTimeout(600);
  const t=await p.textContent('#ogC');ok(/times this word|only place/.test(t),`${tag} ${bk} word card: ${t.slice(0,140).replace(/\s+/g,' ')}`);
  await p.screenshot({path:`${__dirname}/shots/orig-${bk}-${tag}-word.png`,fullPage:false});
  const sheet=await p.$('#scrim .sheet');await sheet.screenshot({path:`${__dirname}/shots/orig-${bk}-${tag}-sheet.png`});
  const ov=await p.evaluate(()=>{const s=document.querySelector('#scrim .sheet');return s.scrollWidth<=s.clientWidth+1});ok(ov,`${tag} ${bk} no sideways scroll in sheet`);
  if(bk==='JHN'){await p.click('[data-ogr]');await p.waitForTimeout(1200);ok(!(await p.$('#scrim')),`${tag} also-used opens a passage`)}
  else await p.click('#shX');
  await p.evaluate(()=>closeReader());await p.waitForTimeout(500)}
ok(!errs.length,`${tag} no errors ${errs.join('|')}`);await ctx.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS')})();
