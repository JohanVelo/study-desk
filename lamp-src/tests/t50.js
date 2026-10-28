// v35: Read by topic (8 short plans) and Hymn of the week (JJ, 28 Oct 2026: "continue improving")
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs,hasTouch:w<800,reducedMotion:'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
await ctx.addInitScript(()=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:'2026-10-01T10:00:00Z',2:'2026-10-02T10:00:00Z',3:'2026-10-03T10:00:00Z'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1500);const tag=`${w}-${cs}`;
// every reference in the plans and hymns is a real chapter and verse
const bad=await p.evaluate(async()=>{const out=[];const refs=[...TPLANS.flatMap(x=>x[3].map(i=>i[0])),...HYMNS.flatMap(h=>h[4].map(r=>r[0]))];
  for(const r of refs){const [bk,c,v]=r.split('.');if(!BCODES.includes(bk)){out.push(r+' book');continue}const B=await loadBook('BSB',bk);const ch=B&&B[+c-1];if(!ch||!ch[+v-1])out.push(r)}return out});
ok(!bad.length,tag+' all plan and hymn references exist: '+bad.join(','));
ok(await p.evaluate(()=>TPLANS.length===8&&TPLANS.every(x=>x[3].length===5)),tag+' 8 plans of 5 readings');
await p.evaluate(()=>{setView('learn');setLtab('topics')});await p.waitForTimeout(700);
ok(await p.evaluate(()=>!document.querySelector('#topics').hidden&&document.querySelectorAll('#topics .tpc').length===8),tag+' Read by topic tab shows 8 plans');
ok(await p.evaluate(()=>{const t=document.querySelector('[role=tab][data-t="topics"]').getBoundingClientRect(),n=document.querySelector('[role=tab][data-t="topics"]').parentElement.getBoundingClientRect();return t.left>=n.left-1&&t.right<=n.right+1}),tag+' chosen tab is scrolled into view');
await p.screenshot({path:`${__dirname}/s50/topics-${tag}.png`});
await p.click('[data-tp="anxious"]');await p.waitForTimeout(600);
ok(await p.evaluate(()=>document.querySelectorAll('#scrim .tplist li').length===5),tag+' plan sheet lists 5 readings');
await p.click('#scrim [data-tpk="0"]');await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!state.settings.tp?.anxious?.d?.[0]&&document.querySelector('#scrim [data-tpk="0"]').getAttribute('aria-pressed')==='true'),tag+' tick saves and shows');
ok(await p.evaluate(()=>/1 of 5/.test(document.querySelector('#scrim .kick').textContent)),tag+' sheet counts 1 of 5');
await p.screenshot({path:`${__dirname}/s50/plan-${tag}.png`});
await p.click('#scrim [data-tpk="0"]');await p.waitForTimeout(300);
ok(await p.evaluate(()=>!state.settings.tp?.anxious?.d?.[0]),tag+' untick works');
await p.click('#scrim [data-tpr="PSA.23.1"]');await p.waitForTimeout(1500);
ok(await p.evaluate(()=>!!document.querySelector('.reader')&&/Psalm 23|Psalms 23/.test(document.querySelector('.reader').textContent)),tag+' Read opens Psalm 23 in the reader');
ok(await p.evaluate(()=>!!state.settings.tp?.anxious?.d?.[2]),tag+' reading it marks it read');
await p.evaluate(()=>{for(let i=0;i<6;i++){try{closeTop()}catch(e){}}});await p.waitForTimeout(500);
ok(await p.evaluate(()=>/1 of 5 read/.test(document.querySelector('[data-tp="anxious"]').textContent)),tag+' card shows progress after closing');
// hymn
await p.evaluate(()=>{setView('learn');setLtab('topics')});await p.waitForTimeout(400);
await p.click('#topics [data-hymn]');await p.waitForTimeout(600);
const hy=await p.evaluate(()=>({t:document.querySelector('#scrim .hymn h2')?.textContent,w:document.querySelector('#scrim .hy-words')?.textContent||'',chips:document.querySelectorAll('#scrim [data-hyr]').length,want:hymnNow()[0]}));
ok(hy.t===hy.want&&hy.w.length>40&&hy.chips>0,tag+' hymn sheet: '+hy.t);
await p.screenshot({path:`${__dirname}/s50/hymn-${tag}.png`});
await p.evaluate(()=>closeTop());await p.waitForTimeout(300);
await p.evaluate(()=>setView('today'));await p.waitForTimeout(600);
ok(await p.evaluate(()=>!!document.querySelector('#view [data-hymn]')),tag+' hymn card on Today');
ok(await p.evaluate(()=>{const n=new Set();const d=new Date(2026,0,5);for(let i=0;i<12;i++){const x=new Date(d);x.setDate(d.getDate()+i*7);const D=Date;window.__t=x;n.add(HYMNS[Math.floor((monOf(x)-new Date(2026,0,5))/6048e5)%HYMNS.length][0])}return n.size===12}),tag+' 12 weeks give 12 different hymns');
ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));await b.close();console.log(fails?'FAILED':'ALL PASS');process.exit(fails?1:0)})();
