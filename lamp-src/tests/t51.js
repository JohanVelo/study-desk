// v36: prayer partners. Each week everyone in the group gets one person to pray for, in a ring, so everyone is prayed for too
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  for(const [id,n] of [['u_a','Sarah'],['u_b','Pieter'],['u_c','Lerato']])S.set('gm/'+id,{joined:'2026-01-0'+(id.charCodeAt(2)-96),seen:now,pr:{x1:{t:'For '+n+'\'s exam on Friday',at:now},x2:{t:'SECRET '+n,at:now,anon:true}}});
  S.set('gm/u_old',{joined:'2025-01-01',seen:'2026-01-01T00:00:00Z'})};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  if(o.clock)await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},o.clock);
  await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}))});
  if(o.mock!==false){await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED)}
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
// the ring: everyone gives and receives exactly once, never themselves, for any group size
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const r=await p.evaluate(()=>{const out=[];const keep=G.people,me=G.id;
   for(let n=2;n<=9;n++){const ids=Array.from({length:n},(_,i)=>'m'+i);const P={};ids.forEach(i=>P[i]={seen:new Date().toISOString()});G.people=P;
     const giv={},rec={};for(const i of ids){G.id=i;const f=ppFor();giv[i]=f.to;rec[f.to]=(rec[f.to]||0)+1;if(f.to===i)out.push(n+' self')}
     if(Object.keys(rec).length!==n||Object.values(rec).some(x=>x!==1))out.push(n+' uneven');
     for(const i of ids){G.id=i;const f=ppFor();if(giv[f.from]!==i)out.push(n+' from wrong')}}
   G.people=keep;G.id=me;return out});
 ok(!r.length,'ring is fair for groups of 2 to 9: '+r.join(','));
 ok(await p.evaluate(()=>!ppRing().includes('u_old')&&ppRing().length===4),'someone not seen for 60+ days is left out');
 await p.evaluate(()=>{setView('group');gGo('prayer')});await p.waitForTimeout(900);
 const c=await p.evaluate(()=>{const f=ppFor(),el=document.querySelector('#ppCard');return {to:f.to,from:f.from,hidden:el.hidden,h:el.querySelector('h3')?.textContent,reqs:[...el.querySelectorAll('.pp-reqs li')].map(x=>x.textContent),back:el.querySelector('.pp-back>span:last-child')?.textContent,first:pfirst(f.to),ffrom:pfirst(f.from)}});
 ok(!c.hidden&&c.h==='Pray for '+c.first,'card says who to pray for: '+c.h);
 ok(c.reqs.length===1&&/exam on Friday/.test(c.reqs[0]),'shows their request: '+c.reqs.join('|'));
 ok(!c.reqs.some(x=>/SECRET/.test(x)),'hidden-name requests are not shown on the card');
 ok(c.back.startsWith(c.ffrom+' is praying for you'),'says who prays for me: '+c.back);
 await p.evaluate(()=>document.querySelector('#ppCard').scrollIntoView({block:'center'}));await p.waitForTimeout(250);await p.screenshot({path:__dirname+'/s51/pp-390-light.png'});
 await p.click('#ppDo');await p.waitForTimeout(400);
 const d=await p.evaluate(()=>({v:mine().pp?.[ppWeek()],pr:document.querySelector('#ppDo').getAttribute('aria-pressed'),t:document.querySelector('#ppDo').textContent,saved:window.__mock.store.get('gm/u_me')?.pp}));
 ok(d.v===c.to&&d.pr==='true'&&/You prayed for/.test(d.t),'I prayed saves and shows: '+d.t);
 await p.waitForTimeout(600);ok(!!(await p.evaluate(()=>window.__mock.store.get('gm/u_me')?.pp?.[ppWeek()])),'it reaches the group');
 await p.evaluate(()=>document.querySelector('#ppCard').scrollIntoView({block:'center'}));await p.waitForTimeout(250);await p.screenshot({path:__dirname+'/s51/pp-done-390-light.png'});
 await p.click('#ppDo');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!mine().pp?.[ppWeek()]&&document.querySelector('#ppDo').getAttribute('aria-pressed')==='false'),'tap again takes it back');
 await p.evaluate(f=>{G.people[f].pp={[ppWeek()]:myKey()};paintPrayer()},c.from);await p.waitForTimeout(200);
 ok(/has prayed for you/.test(await p.textContent('#ppCard .pp-back')),'shows when my partner has prayed for me');
 ok(await p.evaluate(()=>{const b=document.querySelector('#ppDo').getBoundingClientRect();return b.height>=44}),'button is at least 44 px tall');
 ok(!errs.length,'no page errors '+errs.join('|'));await ctx.close()}
// same partner on every phone, new partner most weeks
{const rings=[];for(const t of ['2026-10-28T10:00:00+02:00','2026-11-04T10:00:00+02:00','2026-11-11T10:00:00+02:00']){const {ctx,p}=await open({w:390,h:844,cs:'light',clock:new Date(t).getTime()});rings.push(await p.evaluate(()=>ppRing().join()));await ctx.close()}
 ok(new Set(rings).size>=2,'the ring changes from week to week: '+rings.join(' / '));
 const {ctx,p}=await open({w:390,h:844,cs:'light',clock:new Date('2026-10-28T10:00:00+02:00').getTime()});
 ok(await p.evaluate(()=>{const keep=G.id;G.id='u_a';const r=ppRing().join();G.id=keep;return r})===rings[0],'Sarah\'s phone works out the same ring');await ctx.close()}
// on your own: no card
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',seed:()=>{}});await p.evaluate(()=>{setView('group');gGo('prayer')});await p.waitForTimeout(700);
 ok(await p.evaluate(()=>document.querySelector('#ppCard').hidden),'no partner card when you are the only one');ok(!errs.length,'solo: no page errors '+errs.join('|'));await ctx.close()}
// laptop dark and phone dark
for(const [w,h] of [[1440,900],[390,844]]){const {ctx,p,errs}=await open({w,h,cs:'dark'});await p.evaluate(()=>{setView('group');gGo('prayer')});await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!document.querySelector('#ppCard').hidden&&document.documentElement.scrollWidth<=innerWidth),'laptop dark: card shows, no sideways scroll');
 await p.evaluate(()=>document.querySelector('#ppCard').scrollIntoView({block:'center'}));await p.waitForTimeout(250);await p.screenshot({path:__dirname+'/s51/pp-'+w+'-dark.png'});ok(!errs.length,'laptop: no page errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));await b.close();console.log(fails?'FAILED':'ALL PASS');process.exit(fails?1:0)})();
