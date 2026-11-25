// v62: Advent together on the Group page; feel: (see below)
// accuracy: the Gospels chapter labels
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s77',{recursive:true});
const NOW='2026-11-23T07:00:00+02:00';
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  S.set('gm/u_me',{joined:'2026-01-01',seen:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,rd:{'2026-11-16':true,'2026-11-17':true,'2026-11-19':true},cz:{u_me:{k:0,at:'2026-11-18T16:00:00Z'},u_b:{k:3,at:now}}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,rd:{'2026-11-16':true},cz:{u_me:{k:5,at:'2026-11-19T05:00:00Z'}}});
  S.set('gm/u_c',{joined:'2026-01-04',seen:now,cz:{u_me:{k:2,at:'2026-11-10T06:00:00Z'}}})};
const ST={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(o.now||NOW).getTime());
  if(o.block)await ctx.route('**/bib/**',r=>r.abort());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base+(o.hash||''));await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);
const shot=async(p,n)=>{await p.waitForTimeout(400);await p.screenshot({path:`${__dirname}/s77/${n}.png`})};
const D7='2026-12-07T07:00:00+02:00';
const SEEDA=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  S.set('gm/u_me',{joined:'2026-01-01',seen:now});S.set('gm/u_a',{joined:'2026-01-02',seen:now,av:{'2026-6':true,'2026-5':true},rd:{'2026-12-07':true}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,av:{'2026-6':true}});S.set('gm/u_c',{joined:'2026-01-04',seen:now})};
const toG=async p=>{await p.evaluate(()=>setView('group'));await p.waitForTimeout(1500)};
const advTxt=p=>txt(p,'#gAdv');

// 1. accuracy: the Gospels' chapter labels
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});const BI=await p.evaluate(()=>Object.fromEntries(['MAT','MRK','LUK','JHN'].map(k=>[k,BOOKINFO[k][3]])));
 const Q={'MAT.1':[["Jesus' family line and birth"],[1,1,'genealogy of jesus christ'],[1,18,'birth of jesus christ']],'MAT.5':[['The Sermon on the Mount'],[5,1,'went up on the mountain']],'MAT.13':[['Parables of the kingdom'],[13,3,'parables'],[13,24,'kingdom of heaven']],'MAT.28':[['The resurrection and the Great Commission'],[28,6,'he has risen'],[28,19,'make disciples of all nations']],
  'MRK.1':[['The beginning of the gospel'],[1,1,'beginning of the gospel']],'MRK.8':[['Who do you say I am?'],[8,29,'who do you say i am']],'MRK.10':[['To serve and give his life'],[10,45,'to serve, and to give his life']],'MRK.16':[['He has risen!'],[16,6,'he has risen']],
  'LUK.2':[["Jesus' birth"],[2,7,'gave birth to her firstborn']],'LUK.10':[['The good Samaritan'],[10,33,'samaritan']],'LUK.15':[['The lost sheep, coin and son'],[15,4,'sheep'],[15,8,'coins'],[15,11,'two sons']],'LUK.24':[['The road to Emmaus'],[24,13,'emmaus']],
  'JHN.1':[['The Word became flesh'],[1,14,'the word became flesh']],'JHN.3':[['You must be born again'],[3,7,'you must be born again']],'JHN.11':[['Lazarus raised'],[11,43,'lazarus, come out'],[11,44,'the man who had been dead came out']],'JHN.17':[['Jesus prays for his followers'],[17,20,'those who will believe in me']],'JHN.20':[['The empty tomb'],[20,1,'stone had been removed']]};
 const bad=[];for(const [k,[[lab],...vs]] of Object.entries(Q)){const [b,c]=k.split('.');const L=BI[b].find(x=>x[0]===+c);if(!L||L[1]!==lab)bad.push(k+' label '+(L&&L[1]));for(const [cc,v,ph] of vs){const t=BSB(b)[cc-1][v-1].toLowerCase().replace(/’/g,"'");if(!t.includes(ph))bad.push(`${b} ${cc}:${v} lacks ${ph}`)}}
 ok(!bad.length&&Object.keys(Q).length===17&&['MAT','MRK','LUK','JHN'].reduce((a,b)=>a+BI[b].length,0)===17,"Gospels: all 17 chapter labels match their chapter's BSB words "+bad.join(' / '));
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 2. Advent together on 4 sizes
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=`${w}-${cs}`,dev=w<800?'phone':'desk';
 const {ctx,p,errs}=await open({w,h,cs,now:D7,seed:SEEDA});await toG(p);
 let t=await advTxt(p);ok(/Advent together · 7 December/i.test(t)&&/crush the serpent/.test(t)&&/2 of 4 have read today's Advent reading/.test(t),tag+' Group page: today\'s reading and 2 of 4 '+t.slice(0,140));
 const f=await p.evaluate(()=>[...document.querySelectorAll('#gAdv .advg-f li')].map(li=>(li.classList.contains('on')?'+':'-')+li.querySelector('.sr').textContent).join());
 ok(f==='-You: not yet,+Sarah Mokoena: read,+Pieter du Toit: read,-Lerato Khumalo: not yet',tag+' each face says who has read it '+f);
 await p.evaluate(()=>document.querySelector('#gAdv').scrollIntoView({block:'center'}));await shot(p,`${dev}-${cs}-1-group`);
 let ax=await axe(p,'#gAdv');ok(!ax.length,tag+' axe: Advent together '+ax);
 await p.focus('#gAdv [data-advk="6"]');await p.keyboard.press('Enter');await p.waitForTimeout(1200);
 t=await advTxt(p);ok(/3 of 4 have read/.test(t)&&await p.evaluate(()=>document.activeElement?.closest?.('#gAdv')&&document.activeElement.dataset.advk==='6'),tag+' Mark as read: 3 of 4, focus stays on the button');
 const me=await store(p,'gm/u_me');ok(me&&me.av&&me.av['2026-6']===true,tag+' your tick is shared with the group '+JSON.stringify(me&&me.av));
 ok(await p.evaluate(()=>!!state.settings.tp.adv2026.d[6]),tag+' and saved in your own Advent calendar');
 if(w===390&&cs==='light'){await shot(p,'phone-light-2-ticked');
  await p.click('#gAdv [data-advk="6"]');await p.waitForTimeout(1200);const me2=await store(p,'gm/u_me');ok(!(me2.av&&me2.av['2026-6'])&&/2 of 4/.test(await advTxt(p)),tag+' untick takes it back from the group too '+JSON.stringify(me2.av));
  await p.click('#gAdv [data-adv]');await p.waitForSelector('.advsheet');ok(/Twenty-five days/.test(await txt(p,'.advsheet')),tag+' Calendar opens the Advent calendar');await p.keyboard.press('Escape');await p.waitForTimeout(300)}
 ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}

// 3. privacy, earlier marks, no group, outside December
{const st={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1,shareRead:false,tp:{adv2026:{d:{0:'2026-12-01T08:00:00Z'}}}}};
 const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:D7,seed:SEEDA,st});await toG(p);await p.click('#gAdv [data-advk="6"]');await p.waitForTimeout(1200);
 const me=await store(p,'gm/u_me');ok(!(me&&me.av),'private reading days: nothing about Advent is shared '+JSON.stringify(me&&me.av));
 ok(/reading days are private/.test(await advTxt(p))&&/3 of 4/.test(await advTxt(p)),'private: a note says why, and your own screen still counts you');
 await shot(p,'phone-light-3-private');ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}
{const st={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1,tp:{adv2026:{d:{0:'2026-12-01T08:00:00Z',3:'2026-12-04T08:00:00Z'}}}}};
 const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:D7,seed:SEEDA,st});await toG(p);await p.waitForTimeout(1200);
 const me=await store(p,'gm/u_me');ok(me&&me.av&&me.av['2026-0']&&me.av['2026-3'],'readings ticked before joining are shared when the group opens '+JSON.stringify(me&&me.av));
 ok(!errs.length,'no page errors');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:'2026-11-30T07:00:00+02:00',seed:SEEDA});await toG(p);ok((await advTxt(p))==='','30 November (Advent has begun, no doors yet): no group card');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:'2026-12-26T07:00:00+02:00',seed:SEEDA});await toG(p);ok((await advTxt(p))==='','26 December: no group card');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:D7,seed:()=>{}});await toG(p);ok((await advTxt(p))==='','a group of one (just you): no card');ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 4. feel: first names in the reading ring; surname initial only when first names clash
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:D7,seed:SEEDA});await toG(p);
 const r=await p.evaluate(()=>[...document.querySelectorAll('#gRing .rg-nm')].map(n=>[n.querySelector('[aria-hidden]')?.textContent||n.textContent,n.querySelector('.sr')?.textContent||'',n.scrollWidth<=n.clientWidth+1]));
 ok(JSON.stringify(r.map(x=>x[0]))==='["You","Sarah","Pieter","Lerato"]'&&r.slice(1).every(x=>x[1].includes(' '))&&r.every(x=>x[2]),'ring shows first names, full names for screen readers, nothing cut off '+JSON.stringify(r));
 await p.evaluate(()=>document.querySelector('#gRing').scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-70));await shot(p,'phone-light-4-ring');
 const c=await p.evaluate(()=>{G.prof.u_c={...(G.prof.u_c||{}),name:'Sarah Naidoo'};return [shortName('u_b'),shortName('u_c'),shortName('u_a')]});
 ok(c.join()==='Pieter,Sarah N.,Sarah M.','two Sarahs become Sarah M. and Sarah N. '+c.join());
 ok(await p.evaluate(()=>{G.prof.u_c={...(G.prof.u_c||{}),name:'Cher'};return shortName('u_c')})==='Cher','a one-word name stays as it is');
 const ax=await axe(p,'#gRing');ok(!ax.length,'axe: reading ring '+ax);
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'dark',now:D7,seed:SEEDA});await toG(p);await p.evaluate(()=>document.querySelector('#gRing').scrollIntoView({block:'center'}));await shot(p,'desk-dark-4-ring');ok(!errs.length,'no page errors');await ctx.close()}

await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
