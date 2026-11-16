// v53: cheer someone on (set words + a verse, from the reading ring; seen on their Today for 3 days), the week's
// reading dots pop in when the group opens; accuracy: 10 Who am I people checked clue by clue (Martha reworded to John 11:1)
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s68',{recursive:true});
const NOW='2026-11-19T09:00:00+02:00';
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  S.set('gm/u_me',{joined:'2026-01-01',seen:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,rd:{'2026-11-16':true,'2026-11-17':true,'2026-11-19':true},cz:{u_me:{k:0,at:'2026-11-18T16:00:00Z'},u_b:{k:3,at:now}}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,rd:{'2026-11-16':true},cz:{u_me:{k:5,at:'2026-11-19T05:00:00Z'}}});
  S.set('gm/u_c',{joined:'2026-01-04',seen:now,cz:{u_me:{k:2,at:'2026-11-10T06:00:00Z'}}})};
const ST={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(NOW).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);

// 1. accuracy: every cheer's words are in its verse; 10 Who am I people
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const C=await p.evaluate(()=>CZ.map(c=>[c[1],c[2]]));const AB={'Galatians':'GAL','1 Thessalonians':'1TH','Philippians':'PHP','Hebrews':'HEB','Numbers':'NUM'};
 const norm=x=>x.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();const bad=[];
 for(const [q,r] of C){const m=r.match(/^(.+) (\d+):(\d+)$/);const v=norm(BSB(AB[m[1]])[m[2]-1][m[3]-1]);for(const part of q.split('…').map(norm).filter(Boolean))if(!v.includes(part.replace(/[.;,]$/,'')))bad.push(r+': '+part)}
 ok(C.length===6&&!bad.length,'all 6 cheers quote their verse word for word (BSB) '+bad.join(' / '));
 const W=await p.evaluate(async()=>{const F=await loadFun();return F.who.slice(40,50)});
 const V=(r)=>{const [c,ch,v]=r.split('.');return BSB(c)[ch-1][v-1]};
 const CH={'John':[['MRK.3.17','Sons of Thunder'],['ACT.3.1','Peter and John were going up to the temple'],['MAT.4.21','son of Zebedee']],'Thomas':[['JHN.11.16','Didymus'],['JHN.11.16','Let us also go, so that we may die with Him'],['JHN.20.25','nail marks'],['JHN.20.28','My Lord and my God']],
  'Judas Iscariot':[['JHN.12.6','money bag'],['JHN.12.5','sold'],['MAT.26.15','thirty pieces of silver'],['MAT.26.49','kissed']],'Martha':[['JHN.11.27','I believe that You are the Christ, the Son of God'],['JHN.11.39','four days'],['LUK.10.39','sat at the Lord'],['JHN.11.1','the village of Mary and her sister Martha']],
  'Mary Magdalene':[['LUK.8.2','seven demons'],['JHN.19.25','Mary Magdalene'],['JHN.20.15','gardener'],['JHN.20.16','Rabboni']],'Lazarus':[['JHN.12.10','kill Lazarus'],['JHN.11.3','sent word'],['JHN.11.35','Jesus wept'],['JHN.11.43','Lazarus, come out']],
  'Zacchaeus':[['LUK.19.2','chief tax collector, who was very wealthy'],['LUK.19.3','small in stature'],['LUK.19.4','climbed a sycamore tree'],['LUK.19.5','stay at your house']],'Nicodemus':[['JHN.19.39','myrrh and aloes'],['JHN.3.1','Pharisee'],['JHN.3.2','at night'],['JHN.3.3','born again']],
  'Pilate':[['MAT.27.19','dream'],['JHN.18.38','What is truth?'],['MAT.27.24','washed his hands before the crowd']],'Paul':[['ACT.22.3','born in Tarsus'],['ACT.22.3','Gamaliel'],['ACT.18.3','tentmakers by trade'],['ACT.9.3','light from heaven']]};
 const badW=[];for(const w of W){const cs=CH[w.n];if(!cs){badW.push('unexpected '+w.n);continue}for(const [r,ph] of cs){const t=V(r)+(r==='JHN.3.1'?BSB('JHN')[2][0]:'');if(!norm(t).includes(norm(ph)))badW.push(w.n+' '+r+' lacks '+ph)}}
 ok(W.length===10&&!badW.length,'Who am I: John to Paul (10 people), every clue backed by its verse '+badW.join(' / '));
 const mt=W.find(w=>w.n==='Martha');ok(mt.clues.includes('My brother Lazarus lived in Bethany, the village where my sister Mary and I lived.')&&!mt.clues.some(c=>/lived with me/.test(c)),'Martha\'s Bethany clue now says what John 11:1 says');
 ok(!errs.length,'data: no errors '+errs.join('|'));await ctx.close()}

// 2. Today: cheers you received, newest first; old ones and other people's not shown; four looks
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs,rm:'no-preference'});
 const c=await p.evaluate(()=>{const c=document.querySelector('#czCard');return c&&{t:c.innerText.replace(/\n/g,' | '),n:c.querySelectorAll('.cz-l li').length,btn:[...c.querySelectorAll('[data-czto]')].map(b=>[b.dataset.czto,b.offsetHeight,b.offsetWidth]),x:c.querySelector('#czX')?.getAttribute('aria-label')}});
 ok(c&&/FROM YOUR GROUP/i.test(c.t)&&/2 people cheered you on/.test(c.t)&&c.n===2,tag+' Today: "2 people cheered you on" '+(c&&c.t.slice(0,90)));
 ok(c.t.indexOf('The LORD bless you')<c.t.indexOf('Keep going!')&&/Numbers 6:24 · from Pieter du Toit/.test(c.t)&&/Galatians 6:9 · from Sarah Mokoena/.test(c.t)&&!/Philippians|Lerato|Well done/.test(c.t),tag+' newest first, with verse and sender; a 9-day-old cheer and a cheer to someone else are not shown');
 ok(c.btn.length===2&&c.btn.every(([,hh,ww])=>hh>=44&&ww>=44)&&c.x==='Hide these cheers',tag+' each has a 44 px Cheer back; X says what it hides');
 await p.evaluate(()=>{const e=document.querySelector('#czCard');scrollTo(0,e.getBoundingClientRect().top+scrollY-(innerWidth<800?90:30))});await p.waitForTimeout(700);
 await p.screenshot({path:`${__dirname}/s68/today-${tag}.png`});
 const ax=await axe(p,'#czCard');ok(!ax.length,tag+' axe: Today card clean '+ax);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 // the reading ring: a cheer button for everyone but me
 await p.evaluate(()=>setView('group'));await p.waitForTimeout(1200);
 const r=await p.evaluate(()=>{const g=document.querySelector('#gRing');return {rows:[...g.querySelectorAll('.rg-list li')].map(li=>[li.querySelector('.rg-nm').textContent,!!li.querySelector('.cz-b'),li.querySelector('.cz-b')?.getAttribute('aria-label')||'']),sz:[...g.querySelectorAll('.cz-b')].every(b=>b.offsetHeight>=44&&b.offsetWidth>=44),rin:g.querySelector('.gring').classList.contains('rg-in'),anim:getComputedStyle(g.querySelector('.rg-dots i.on')).animationName}});
 ok(r.rows.find(x=>x[0]==='You')&&!r.rows.find(x=>x[0]==='You')[1]&&r.rows.filter(x=>x[1]).length===3&&r.rows.some(x=>x[2]==='Cheer on Sarah Mokoena')&&r.sz,tag+' ring: Cheer buttons (44 px) for the 3 others, none for me '+JSON.stringify(r.rows));
 ok(r.rin&&r.anim==='rgPop',tag+' feel: the reading dots pop in on first paint ('+r.anim+')');
 await p.evaluate(()=>paintRing());ok(await p.evaluate(()=>!document.querySelector('#gRing .gring').classList.contains('rg-in')),tag+' a live repaint doesn\'t replay the pop');
 await p.evaluate(()=>{const e=document.querySelector('#gRing');scrollTo(0,e.getBoundingClientRect().top+scrollY-(innerWidth<800?120:30))});await p.waitForTimeout(400);
 await p.screenshot({path:`${__dirname}/s68/ring-${tag}.png`});
 const ax2=await axe(p,'#gRing');ok(!ax2.length,tag+' axe: ring clean '+ax2);
 // send a cheer to Sarah
 await p.click('#gRing [data-czto="u_a"]');await p.waitForTimeout(600);
 const sh=await p.evaluate(()=>{const s=document.querySelector('#cz');return s&&{t:s.innerText.replace(/\n/g,' | '),n:s.querySelectorAll('[data-czk]').length,small:[...s.querySelectorAll('[data-czk]')].filter(b=>b.offsetHeight<44).length,foc:document.activeElement?.dataset.czk}});
 ok(sh&&/Sarah Mokoena/.test(sh.t)&&/Sarah will see it on their Today page for three days/.test(sh.t)&&sh.n===6&&!sh.small&&sh.foc==='0',tag+' sheet: 6 cheers with verses, focus on the first '+(sh&&sh.t.slice(0,120)));
 ok(/Galatians 6:9/.test(sh.t)&&/Your group can see who cheered whom/.test(sh.t),tag+' sheet shows the verse and says who can see cheers');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s68/sheet-${tag}.png`});
 const ax3=await axe(p,'#cz');ok(!ax3.length,tag+' axe: sheet clean '+ax3);
 await p.click('#cz [data-czk="1"]');await p.waitForTimeout(1400);
 const sent=await store(p,'gm/u_me');const after=await p.evaluate(()=>({sheet:!!document.querySelector('#cz'),toast:document.querySelector('.toast')?.innerText,b:document.querySelector('#gRing [data-czto="u_a"]')?.getAttribute('aria-label'),on:document.querySelector('#gRing [data-czto="u_a"]')?.classList.contains('on')}));
 ok(sent.cz&&sent.cz.u_a&&sent.cz.u_a.k===1&&/^2026-11-19/.test(sent.cz.u_a.at),tag+' the cheer is saved to my group doc '+JSON.stringify(sent.cz));
 ok(!after.sheet&&/Sent\. Sarah will see .Praying for you today. on Today\./.test(after.toast)&&after.on&&after.b==='You cheered Sarah Mokoena today. Cheer again',tag+' sheet closes, toast confirms, the heart fills '+JSON.stringify(after));
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s68/sent-${tag}.png`});
 // opening again: it says it'll replace today's, and marks it
 await p.click('#gRing [data-czto="u_a"]');await p.waitForTimeout(500);
 ok(/this one will replace it/.test(await txt(p,'#cz'))&&await p.evaluate(()=>document.querySelector('#cz [data-czk="1"]').classList.contains('on')),tag+' opening again: today\'s cheer is marked and will be replaced');
 await p.evaluate(()=>closeTop());await p.waitForTimeout(300);
 ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}

// 3. Cheer back from Today; X hides until a new cheer comes; keyboard
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light'});
 await p.click('#czCard [data-czto="u_b"]');await p.waitForTimeout(500);
 ok(/Pieter du Toit/.test(await txt(p,'#cz')),'Cheer back on Today opens the sheet for Pieter');
 await p.keyboard.press('Tab');await p.keyboard.press('Enter');await p.waitForTimeout(800);
 const s=await store(p,'gm/u_me');ok(s.cz?.u_b?.k===1,'keyboard: Tab then Enter sends the second cheer '+JSON.stringify(s.cz));
 ok(await p.evaluate(()=>document.querySelector('#czCard [data-czto="u_b"]')?.textContent)==='Cheered','the Today button now says Cheered');
 await p.click('#czX');await p.waitForTimeout(500);ok(!await p.$('#czCard'),'X hides the card');
 await p.reload();await p.waitForTimeout(2000);ok(!await p.$('#czCard'),'still hidden after a reload');
 await p.evaluate(async()=>{const a=JSON.parse(JSON.stringify(window.__mock.store.get('gm/u_a')));a.cz.u_me={k:3,at:new Date().toISOString()};await (await window.claude.use('db')).doc('gm/u_a').set(a)});await p.waitForTimeout(1200);
  const t=await txt(p,'#czCard');ok(/Sarah cheered you on/.test(t)&&/Well done this week/.test(t)&&!/Pieter/.test(t),'a new cheer from Sarah shows up live, the hidden ones stay hidden: '+t.slice(0,80));
 ok(!errs.length,'today: no errors '+errs.join('|'));await ctx.close()}

// 4. offline: the cheer waits and sends when the signal is back; read-only members get no buttons; no group = no card
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await p.evaluate(()=>setView('group'));await p.waitForTimeout(1000);
 await ctx.setOffline(true);await p.evaluate(()=>{window.__mock.fail=true});
 await p.click('#gRing [data-czto="u_c"]');await p.waitForTimeout(400);await p.click('#cz [data-czk="4"]');await p.waitForTimeout(1200);
 const q=await p.evaluate(()=>localStorage.getItem('lamp-gq-v1')||'');
 await p.evaluate(()=>{window.__mock.fail=false});await ctx.setOffline(false);await p.evaluate(()=>{dispatchEvent(new Event('online'));gFlush()});await p.waitForTimeout(1500);
 const s=await store(p,'gm/u_me');ok(s.cz?.u_c?.k===4,'a cheer sent with no signal reaches the group later '+(q.includes('u_c')?'(queued)':'(sent)'));
 await p.evaluate(()=>{G.ro=true;paintRing()});ok(await p.evaluate(()=>!document.querySelector('#gRing .cz-b')),'read-only (guest) members see no cheer buttons');
 ok(await p.evaluate(()=>{openCheer(myKey());return !document.querySelector('#cz')}),'you can\'t cheer yourself');
 ok(!errs.length,'offline: no errors '+errs.join('|'));await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',seed:()=>{}});
 ok(await p.evaluate(()=>!document.querySelector('#czCard')&&!!document.querySelector('#czSlot')),'no group: no cheers card, nothing breaks');
 ok(!errs.length,'no group: no errors '+errs.join('|'));await ctx.close()}

console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
