// v37: leader summary ("This week at a glance" + weekly recap), press feedback, Bible-quote labels match the BSB
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',when:'Thursdays at 7 pm',at:now});
  for(const id of ['u_a','u_b','u_c'])S.set('gm/'+id,{joined:'2026-01-02',seen:now});S.set('gm/u_old',{joined:'2025-01-01',seen:'2026-01-01T00:00:00Z'})};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}));window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null}});
  if(o.mock!==false){await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED)}
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
// fill the week: Sarah read 5 days, is coming, answered 3, prayed; Pieter read 2, maybe; Lerato nothing; me 1 day, coming
const FILL=()=>{const wk=ringWeek(),rk=rsvpKey(),w=WK(curWk()),pw=ppWeek();const rd=n=>Object.fromEntries(wk.slice(0,n).map(k=>[k,1]));
  Object.assign(G.people.u_a,{rd:rd(5),rsvp:{[rk]:'yes'},ans:{[w.id]:{q1:'Ask',q2:'Seek',q3:'Knock',q4:'  '}},pp:{[pw]:'u_me'},pr:{x:{t:'For my mum',at:new Date().toISOString()}}});
  Object.assign(G.people.u_b,{rd:rd(2),rsvp:{[rk]:'maybe'}});G.people[myKey()]={...G.people[myKey()],rd:rd(1),rsvp:{[rk]:'yes'}}};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});await p.evaluate(FILL);
 const g=await p.evaluate(()=>{const g=wkGlance();return {n:g.rows.length,coming:g.coming,maybe:g.maybe,unsaid:g.unsaid,read:g.read,goal:g.goal,prayed:g.prayed,needs:g.needs,sarah:g.rows.find(r=>r.id==='u_a')}});
 ok(g.n===4&&g.coming===2&&g.maybe===1&&g.unsaid===1,tag+' counts who is coming: '+JSON.stringify(g));
 ok(g.read===8&&g.goal===20&&g.prayed===1&&g.needs===1,tag+' reading ring, prayed and requests add up');
 ok(g.sarah.days===5&&g.sarah.ans===3,tag+' blank answers are not counted');
 await p.evaluate(()=>{setView('group');openLeader()});await p.waitForTimeout(700);
 const ui=await p.evaluate(()=>{const s=document.querySelector('#scrim .glance');return s&&{rows:s.querySelectorAll('.gl-rows li').length,stats:[...s.querySelectorAll('.gl-stats b')].map(x=>x.textContent),sarah:[...s.querySelectorAll('.gl-rows li')].find(li=>/Sarah/.test(li.textContent))?.innerText.replace(/\n/g,' '),dots:s.querySelector('.gl-rows li .gl-d')?.getAttribute('aria-label')}});
 ok(ui&&ui.rows===4,tag+' glance lists 4 active people (not the one away 60+ days)');
 ok(ui&&ui.stats.join()==='2,40%,1,1',tag+' stats: '+(ui&&ui.stats.join()));
 ok(ui&&/Coming/.test(ui.sarah)&&/3 answers/.test(ui.sarah),tag+' Sarah row: '+(ui&&ui.sarah));
 ok(ui&&/^Read on \d of 7 days$/.test(ui.dots),tag+' dots have a spoken label');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('#scrim .gl-rows li')].every(li=>{const r=li.getBoundingClientRect(),q=li.parentElement.getBoundingClientRect();return r.right<=q.right+1})),tag+' nothing spills sideways');
 await p.evaluate(()=>document.querySelector('#scrim .glance').scrollIntoView({block:'start'}));await p.waitForTimeout(250);
 await p.screenshot({path:`${__dirname}/s52/glance-${tag}.png`});
 await p.evaluate(()=>{navigator.share=undefined});await p.click('#ldRecap');await p.waitForTimeout(300);
 const url=await p.evaluate(()=>window.__opened.pop()||'');const txt=decodeURIComponent(url.split('text=')[1]||'');
 ok(/^📖 Thursday group · week 7: /.test(txt)&&/read 8 of 20 days/.test(txt)&&/2 coming so far\. We meet Thursdays at 7 pm\./.test(txt)&&/1 prayer request is on the Prayer wall/.test(txt),tag+' recap text: '+txt.replace(/\n/g,' | '));
 ok(!/Sarah|Pieter|Lerato/.test(txt),tag+' recap names nobody');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// on your own: no glance; empty week reads cleanly
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',seed:()=>{}});await p.evaluate(()=>{setView('group');openLeader()});await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!document.querySelector('#scrim .glance')),'solo: no glance');ok(!errs.length,'solo: no page errors');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});const t=await p.evaluate(()=>recapText());
 ok(/read 0 of 20 days so far this week\./.test(t)&&/We meet Thursdays at 7 pm\./.test(t)&&!/prayer request/.test(t)&&!/\n\n\n/.test(t),'empty week recap: '+t.replace(/\n/g,' | '));ok(!errs.length,'empty: no page errors');await ctx.close()}
// press feedback (motion allowed) and none with reduced motion
{const {ctx,p}=await open({w:390,h:844,cs:'light',rm:'no-preference'});await p.evaluate(()=>{setView('learn');setLtab('topics')});await p.waitForTimeout(900);
 const el=await p.$('[data-tp="joy"]');await el.scrollIntoViewIfNeeded();await p.waitForTimeout(200);const bx=await el.boundingBox();await p.mouse.move(bx.x+20,bx.y+20);await p.mouse.down();await p.waitForTimeout(100);
 const sc=await p.evaluate(()=>getComputedStyle(document.querySelector('[data-tp="joy"]')).scale);await p.mouse.up();ok(sc==='0.98','topic card presses in: '+sc);await ctx.close()}
{const {ctx,p}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>{setView('learn');setLtab('topics')});await p.waitForTimeout(700);
 const el=await p.$('[data-tp="joy"]');await el.scrollIntoViewIfNeeded();await p.waitForTimeout(200);const bx=await el.boundingBox();await p.mouse.move(bx.x+20,bx.y+20);await p.mouse.down();
 const sc=await p.evaluate(()=>getComputedStyle(document.querySelector('[data-tp="joy"]')).scale);await p.mouse.up();ok(sc==='none','reduced motion: no press scale ('+sc+')');
 // every Bible quote label in book intros matches the BSB wording
 const bad=await p.evaluate(async()=>{const out=[];const chk=[['ECC',1,'futile'],['LAM',1,'How lonely lies the city'],['AMO',5,'let justice roll on like a river'],['NAM',1,'The LORD is good, a stronghold'],['HAB',2,'the righteous will live by faith'],['JAS',2,'faith without deeds is dead']];
   for(const [bk,c,q] of chk){const B=await loadBook('BSB',bk);const lbl=BOOKINFO[bk][3].find(x=>x[0]===c)[1];if(!B[c-1].join(' ').toLowerCase().includes(q.toLowerCase()))out.push(bk+' text');if(!lbl.toLowerCase().includes(q.toLowerCase().replace(/^let /,'')))out.push(bk+' label '+lbl)}return out});
 ok(!bad.length,'quoted labels match BSB: '+bad.join(','));await ctx.close()}
console.log(log.join('\n'));await b.close();console.log(fails?'FAILED':'ALL PASS');process.exit(fails?1:0)})();
