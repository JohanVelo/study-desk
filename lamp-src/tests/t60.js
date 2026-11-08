// v45: compare a verse across translations (from the verse bar), the verse bar eases away, 10 new questions (Isaiah, Jeremiah, Ruth)
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s60',{recursive:true});
const ST={done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  if(o.block)await ctx.route(o.block,r=>r.abort());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(()=>{window.__copied=[];try{Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window.__copied.push(t);return Promise.resolve()}}})}catch(e){}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const rows=p=>p.evaluate(()=>[...document.querySelectorAll('#cmpL .cmp-i')].map(li=>li.querySelector('b').textContent+(li.classList.contains('cur')?'*':'')+' | '+li.querySelector('.cmp-t').textContent));
const toVerse=async(p,v)=>{await p.evaluate(()=>openReader(1,false));await p.waitForTimeout(1600);await p.evaluate(v=>selectVerse(v),v);await p.waitForTimeout(400)};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});await toVerse(p,17);
 const bar=await p.evaluate(()=>{const b=document.querySelector('#vCmp');const r=b?.getBoundingClientRect(),vb=document.querySelector('#vbar').getBoundingClientRect();return {t:b?.textContent,in:r&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,fits:vb.left>=0&&vb.right<=innerWidth}});
 ok(bar.t==='Compare'&&bar.in&&bar.fits,tag+' the verse bar has Compare, on screen: '+JSON.stringify(bar));
 if(w===390&&cs==='light')await p.screenshot({path:`${__dirname}/s60/bar-${tag}.png`});
 await p.click('#vCmp');await p.waitForTimeout(1500);
 let r=await rows(p);const tr=await p.evaluate(()=>R.tr);
 ok(r.length>=3&&r[0].startsWith(tr+'*')&&r.some(x=>/^KJV \| .*fishers of men/.test(x))&&r.some(x=>/^BSB/.test(x))&&r.some(x=>/^BBE/.test(x)),tag+' Mark 1:17 in '+r.length+' translations, the one you are reading first: '+r.map(x=>x.slice(0,40)).join(' / '));
 ok(await p.evaluate(()=>!/undefined|null/.test(document.querySelector('#cmp').textContent)&&document.querySelectorAll('#cmp svg').length>=4),tag+' no stray text: every icon is drawn');
 ok(await p.evaluate(()=>/Mark 1:17/.test(document.querySelector('.cmp-ref').textContent)&&!document.querySelector('#vbar')),tag+' the sheet names the verse and the verse bar is gone');
 const more=await p.evaluate(()=>{const b=document.querySelector('#cmpBig');return b?{t:b.textContent,h:b.getBoundingClientRect().height}:null});
 ok(more&&/Add NHEB, ASV, YLT/.test(more.t)&&more.h>=44,tag+' offers the 3 bigger translations: '+JSON.stringify(more));
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s60/cmp-${tag}.png`});
 await p.click('#cmpBig');await p.waitForTimeout(4000);r=await rows(p);
 ok(['NHEB','ASV','YLT'].every(t=>r.some(x=>x.startsWith(t+' |')||x.startsWith(t+'*')))&&r.length>=6&&!(await p.$('#cmpBig')),tag+' all '+r.length+' translations after Add');
 if(w===390&&cs==='dark')await p.screenshot({path:`${__dirname}/s60/cmp-all-${tag}.png`,fullPage:false});
 await p.click('[data-cmpc="KJV"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>(window.__copied||[]).some(t=>/fishers of men.*\(Mark 1:17, KJV\)/.test(t))||/Copied/i.test(document.querySelector('#toast').textContent)),tag+' Copy copies that translation with the reference');
 ok(await p.evaluate(()=>[...document.querySelectorAll('.cmp-c')].every(b=>b.getBoundingClientRect().height>=44)),tag+' copy buttons are 44 px');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 await p.keyboard.press('Escape');await p.waitForTimeout(400);ok(await p.evaluate(()=>!document.querySelector('#cmp')&&!!document.querySelector('.reader')),tag+' Escape closes, back in the reader');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// offline for the bigger ones
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',block:/bib\/(NHEB|ASV|YLT)-/});await toVerse(p,1);await p.click('#vCmp');await p.waitForTimeout(1500);
 await p.click('#cmpBig');await p.waitForTimeout(1500);
 ok(/couldn't load/.test(await p.evaluate(()=>document.querySelector('#cmpMore').textContent))&&(await rows(p)).length>=3,'no signal for the big ones: says so, keeps the rest');ok(!errs.length,'offline: no errors '+errs.join('|'));await ctx.close()}
// feel: the verse bar eases away (motion on), and is gone at once with reduced motion
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference'});await toVerse(p,5);
 await p.evaluate(()=>clearSel());const mid=await p.evaluate(()=>({ghost:document.querySelectorAll('.vbar').length,id:!!document.querySelector('#vbar'),pe:document.querySelector('.vbar')?.style.pointerEvents}));
 await p.waitForTimeout(400);const after=await p.evaluate(()=>document.querySelectorAll('.vbar').length);
 ok(mid.ghost===1&&!mid.id&&mid.pe==='none'&&after===0,'motion on: the bar fades out, cannot be tapped while leaving, then is removed: '+JSON.stringify(mid));
 await p.evaluate(()=>selectVerse(6));await p.waitForTimeout(100);await p.evaluate(()=>clearSel());await p.evaluate(()=>selectVerse(7));await p.waitForTimeout(50);
 ok(await p.evaluate(()=>!!document.querySelector('#vbar')&&document.querySelector('#vbar b').textContent.endsWith(':7')),'selecting again straight away shows the new bar');
 ok(!errs.length,'motion: no errors '+errs.join('|'));await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await toVerse(p,5);await p.evaluate(()=>clearSel());
 ok(await p.evaluate(()=>!document.querySelectorAll('.vbar').length),'reduced motion: the bar goes at once');
 const bank=await p.evaluate(async()=>{const F=await loadFun();const nw=F.q.slice(502);const pools={};for(const c of ['ISA','JER','RUT'])pools[c]=(await bqPool(c)).length;
  return {n:F.q.length,ok:nw.every(x=>x.a.length===4&&new Set(x.a).size===4&&/^[1-3A-Z]{3}\.\d+\.\d+$/.test(x.ref)),pools}});
 ok(bank.n===512&&bank.ok&&bank.pools.ISA>=4&&bank.pools.JER>=4&&bank.pools.RUT>=4,'10 new questions; Isaiah, Jeremiah and Ruth now have a book quiz: '+JSON.stringify(bank));
 await p.evaluate(()=>{closeReader();openBook('JER')});await p.waitForTimeout(900);ok(await p.evaluate(()=>/Quiz me on Jeremiah/.test(document.querySelector('.bq-row')?.textContent||'')),'the Jeremiah book sheet offers its quiz');
 ok(!errs.length,'no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
