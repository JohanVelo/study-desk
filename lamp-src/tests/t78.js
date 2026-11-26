// v63: the same story in the other Gospels (reader); feel: see below
// accuracy: 37 Gospel parallels checked
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s78',{recursive:true});
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
const shot=async(p,n)=>{await p.waitForTimeout(400);await p.screenshot({path:`${__dirname}/s78/${n}.png`})};
const PH={"MAT.3.1-12": "wilderness", "MRK.1.1-8": "wilderness", "LUK.3.1-18": "wilderness", "JHN.1.19-28": "voice of one calling", "MAT.3.13-17": "beloved son", "MRK.1.9-11": "beloved son", "LUK.3.21-22": "beloved son", "MAT.4.1-11": "tempted", "MRK.1.12-13": "tempted", "LUK.4.1-13": "tempted", "MAT.4.18-22": "fishers of men", "MRK.1.16-20": "fishers of men", "LUK.5.1-11": "catch men", "MAT.8.1-4": "leprosy", "MRK.1.40-45": "leprosy", "LUK.5.12-16": "leprosy", "MAT.9.1-8": "paralytic", "MRK.2.1-12": "paralytic", "LUK.5.17-26": "paralyzed", "MAT.9.9-13": "follow me", "MRK.2.13-17": "follow me", "LUK.5.27-32": "follow me", "MAT.12.1-8": "lord of the sabbath", "MRK.2.23-28": "lord even of the sabbath", "LUK.6.1-5": "lord of the sabbath", "MAT.10.1-4": "twelve", "MRK.3.13-19": "twelve", "LUK.6.12-16": "twelve", "MAT.13.1-23": "sow", "MRK.4.1-20": "sow", "LUK.8.4-15": "sow", "MAT.13.31-32": "mustard seed", "MRK.4.30-32": "mustard seed", "LUK.13.18-19": "mustard seed", "MAT.8.23-27": "the wind", "MRK.4.35-41": "the wind", "LUK.8.22-25": "the wind", "MAT.8.28-34": "pigs", "MRK.5.1-20": "pigs", "LUK.8.26-39": "pigs", "MAT.9.18-26": "cloak", "MRK.5.21-43": "cloak", "LUK.8.40-56": "cloak", "MAT.13.53-58": "hometown", "MRK.6.1-6": "hometown", "LUK.4.16-30": "hometown", "MAT.14.1-12": "herodias", "MRK.6.14-29": "herodias", "MAT.14.13-21": "five loaves", "MRK.6.30-44": "five loaves", "LUK.9.10-17": "five loaves", "JHN.6.1-14": "five barley loaves", "MAT.14.22-33": "walking on the sea", "MRK.6.45-52": "walking on the sea", "JHN.6.16-21": "walking on the sea", "MAT.15.32-39": "four thousand", "MRK.8.1-10": "four thousand", "MAT.16.13-20": "you are the christ", "MRK.8.27-30": "you are the christ", "LUK.9.18-20": "the christ of god", "MAT.16.24-28": "take up his cross", "MRK.8.34-38": "take up his cross", "LUK.9.23-27": "take up his cross", "MAT.17.1-13": "elijah", "MRK.9.2-13": "elijah", "LUK.9.28-36": "elijah", "MAT.19.13-15": "little children", "MRK.10.13-16": "little children", "LUK.18.15-17": "little children", "MAT.19.16-30": "eye of a needle", "MRK.10.17-31": "eye of a needle", "LUK.18.18-30": "eye of a needle", "MAT.20.29-34": "son of david", "MRK.10.46-52": "bartimaeus", "LUK.18.35-43": "son of david", "MAT.21.1-11": "hosanna", "MRK.11.1-11": "hosanna", "LUK.19.28-40": "blessed is the king", "JHN.12.12-19": "hosanna", "MAT.21.12-17": "den of robbers", "MRK.11.15-19": "den of robbers", "LUK.19.45-48": "den of robbers", "MAT.22.34-40": "love the lord your god", "MRK.12.28-34": "love the lord your god", "MRK.12.41-44": "widow", "LUK.21.1-4": "widow", "MAT.26.6-13": "bethany", "MRK.14.3-9": "bethany", "JHN.12.1-8": "bethany", "MAT.26.17-30": "this is my body", "MRK.14.12-26": "this is my body", "LUK.22.7-23": "this is my body", "MAT.26.36-46": "gethsemane", "MRK.14.32-42": "gethsemane", "LUK.22.39-46": "mount of olives", "MAT.26.47-56": "judas", "MRK.14.43-52": "judas", "LUK.22.47-53": "judas", "JHN.18.1-11": "judas", "MAT.26.69-75": "rooster", "MRK.14.66-72": "rooster", "LUK.22.54-62": "rooster", "JHN.18.15-27": "rooster", "MAT.27.11-26": "barabbas", "MRK.15.1-15": "barabbas", "LUK.23.13-25": "barabbas", "JHN.18.28-40": "barabbas", "MAT.27.32-56": "crucified", "MRK.15.21-41": "crucified", "LUK.23.26-49": "crucified", "JHN.19.16-37": "crucified", "MAT.27.57-61": "joseph", "MRK.15.42-47": "joseph", "LUK.23.50-56": "joseph", "JHN.19.38-42": "joseph", "MAT.28.1-10": "he has risen", "MRK.16.1-8": "he has risen", "LUK.24.1-12": "he has risen", "JHN.20.1-10": "tomb"};
const rd=async(p,b,c)=>{await p.evaluate(([b,c])=>openPassage(passFor(b,c)),[b,c]);await p.waitForTimeout(2200)};

// 1. accuracy: every parallel passage is real and tells that event (a key phrase from the BSB inside the range)
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});const G=await p.evaluate(()=>GPAR);
 const bad=[];let n=0;for(const [t,rs] of G){if(rs.length<2)bad.push(t+' has one account');const books=new Set();for(const r of rs){n++;const [b,c,v]=r.split('.');const [a,z]=v.split('-').map(Number);books.add(b);
   const ch=BSB(b)[c-1];if(!ch||!ch[z-1]||a>z){bad.push(r+' not a real range');continue}const txt=ch.slice(a-1,z).join(' ').toLowerCase().replace(/’/g,"'");if(!PH[r])bad.push(r+' no check phrase');else if(!txt.includes(PH[r]))bad.push(r+' lacks '+PH[r])}
  if(books.size!==rs.length)bad.push(t+' same book twice')}
 ok(G.length===38&&n===119&&!bad.length,`Gospel parallels: ${G.length} events, ${n} passages, each a real BSB range that tells it `+bad.join(' / '));
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 2. the box at the end of Mark 6 on 4 sizes; opening a parallel; back
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=`${w}-${cs}`,dev=w<800?'phone':'desk';
 const {ctx,p,errs}=await open({w,h,cs});await rd(p,'MRK',6);
 const t=await txt(p,'.gpar');ok(/Also told in the other Gospels/i.test(t)&&/Rejected in his home town.*verses 1–6.*Matthew 13:53–58.*Luke 4:16–30/.test(t)&&/Feeding the five thousand.*verses 30–44.*Matthew 14:13–21.*Luke 9:10–17.*John 6:1–14/.test(t)&&/similar events/.test(t),tag+' Mark 6 lists its 4 shared events in verse order '+t.slice(0,90));
 const ch=await p.evaluate(()=>[...document.querySelectorAll('.gpar [data-gpo]')].map(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.right<=innerWidth}));ok(ch.length===8&&ch.every(Boolean),tag+' 8 links, all 44 px and on screen');
 await p.evaluate(()=>document.querySelector('.gpar').scrollIntoView({block:'start'}));await shot(p,`${dev}-${cs}-1-box`);
 const ax=await axe(p,'.gpar');ok(!ax.length,tag+' axe: the box '+ax);
 await p.focus('[data-gpo="JHN.6.1-14"]');await p.keyboard.press('Enter');await p.waitForTimeout(2200);
 const r=await p.evaluate(()=>({b:R.p.book,c:R.p.ch,rg:R.range,n:document.querySelectorAll('#scr .v.rng').length,first:document.querySelector('#scr .v.rng')?.dataset.vn,back:document.querySelector('#rBack')?.textContent.trim()}));
 ok(r.b==='JHN'&&r.c===6&&r.n===14&&r.first==='1'&&/Mark 6/.test(r.back),tag+' John 6:1–14 opens with those verses marked and Back to Mark 6 '+JSON.stringify(r));
 await p.evaluate(()=>document.querySelector('#scr .v.rng').scrollIntoView({block:'start'}));await shot(p,`${dev}-${cs}-2-john6`);
 await p.click('#rBack');await p.waitForTimeout(1800);ok(await p.evaluate(()=>R.p.book==='MRK'&&R.p.ch===6&&!document.querySelector('#scr .v.rng')),tag+' Back returns to Mark 6 with no marking');
 ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}

// 3. other chapters, and Gospel chapters with nothing shared
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await rd(p,'GEN',1);ok(!(await p.$('.gpar')),'Genesis 1: no box');
 await rd(p,'MRK',1);ok((await p.$$eval('.gpar li',l=>l.length))===5,'Mark 1: five shared events (John, baptism, temptation, first disciples, leprosy)');
 await rd(p,'JHN',3);ok(!(await p.$('.gpar')),'John 3: nothing shared, no box');
 await rd(p,'LUK',24);ok(/The empty tomb/.test(await txt(p,'.gpar')),'Luke 24: the empty tomb');
 await rd(p,'MAT',14);ok((await p.$$eval('.gpar li',l=>l.length))===3,'Matthew 14 (beyond the path): three shared events');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 4. feel: a marked range reads as one band (each line touches the next, no stripes); still with reduced motion
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference'});await p.evaluate(()=>openPassage(passFor('MAT',14),false,13,{range:[13,21]}));await p.waitForTimeout(2500);
 const g=await p.evaluate(()=>{const out=[];for(const v of document.querySelectorAll('#scr .v.rng')){const rs=[...v.getClientRects()];for(let i=1;i<rs.length;i++)out.push(+(rs[i].top-rs[i-1].bottom).toFixed(1))}return{gaps:out,anim:getComputedStyle(document.querySelector('#scr .v.rng')).animationName}});
 ok(g.gaps.length>5&&g.gaps.every(x=>x<=0.5&&x>=-2),'band lines touch: no gaps and at most a hairline of overlap '+JSON.stringify(g.gaps.slice(0,8)));
 ok(g.anim==='rngIn','with motion on, the band glows in once');
 await p.evaluate(()=>document.querySelector('#scr .v.rng').scrollIntoView({block:'start'}));await p.screenshot({path:__dirname+'/s78/phone-light-3-band.png',clip:{x:0,y:60,width:390,height:360}});
 ok(!errs.length,'no page errors');await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>openPassage(passFor('MAT',14),false,13,{range:[13,21]}));await p.waitForTimeout(2200);
 ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#scr .v.rng')).animationName)==='none','reduced motion: no glow');ok(!errs.length,'no page errors');await ctx.close()}

// 5. clean-up: only one drag-to-close handler is left (two older copies were also running)
{const src=fs.readFileSync(__dirname+'/../lamp/lamp.html','utf8');ok((src.match(/document\.addEventListener\("touchstart"/g)||[]).length===1&&!/Phone sheets: swipe down to close =/.test(src)&&!/drag a sheet down to close it, like iOS \*\//.test(src),'only one swipe-to-close handler in the app');}

await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
