// v51: Your Bible (every chapter you've read: path days plus chapters ticked at the end of the reader, state.rc, synced),
// the tick pops; accuracy: the library's chapter counts and every Read by topic reference checked against the BSB
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s66',{recursive:true});
const NOW='2026-11-14T09:00:00+02:00';const T=d=>`2026-${d}T08:00:00+02:00`;const U='2026-11-01T08:00:00Z';
const RC={'RUT.1':{u:U},'RUT.2':{u:U},'RUT.3':{u:U},'RUT.4':{u:U},'JOB.1':{u:U},'PSA.8':null,'MRK.1':{u:U}};
const ST={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},rc:RC,settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(NOW).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  if(!o.nomock)await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);

// 1. accuracy: library chapter counts and Read by topic references against the BSB
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const D=await p.evaluate(()=>({lib:LIB.map((x,i)=>[BCODES[i],x[0],x[1]]),tp:TPLANS.map(t=>[t[0],t[3]]),names:Object.fromEntries(BCODES.map(c=>[c,bookName(c)]))}));
 const badC=D.lib.filter(([c,,n])=>BSB(c).length!==n).map(x=>x.join(' '));
 ok(D.lib.length===66&&D.lib.reduce((a,x)=>a+x[2],0)===1189&&!badC.length,'66 books, 1,189 chapters, each count matches the BSB '+badC);
 const badT=[];let n=0;
 for(const [k,rs] of D.tp)for(const [ref,lbl] of rs){n++;const [c,ch,v]=ref.split('.');const B=BSB(c);const name=D.names[c]==='Psalms'?'Psalm':D.names[c];
   const m=lbl.match(/^(.+?) (\d+)(?::(\d+)(?:–(\d+))?)?$/);
   if(!m){badT.push(k+': label '+lbl);continue}
   if(m[1]!==name||+m[2]!==+ch)badT.push(k+': '+ref+' vs '+lbl);
   if(!B[+ch-1]||!B[+ch-1][+v-1])badT.push(k+': no verse '+ref);
   if(m[3]&&+m[3]!==+v)badT.push(k+': start '+ref+' vs '+lbl);
   if(m[4]&&!B[+ch-1][+m[4]-1])badT.push(k+': no end verse '+lbl);
   if(m[4]&&B[+ch-1][+m[4]])null;}
 ok(n>=80&&!badT.length,`all ${n} Read by topic references exist and match their labels `+badT.join(' / '));
 ok(!errs.length,'data: no errors '+errs.join('|'));await ctx.close()}

// 2. the Your Bible card on My path
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 await p.evaluate(()=>setView('path'));await p.waitForTimeout(700);
 const want=await p.evaluate(()=>{const s=new Set();PLAN.forEach((x,i)=>{if(state.done[i+1])s.add(x.book+'.'+x.ch)});['RUT.1','RUT.2','RUT.3','RUT.4','JOB.1','MRK.1'].forEach(k=>s.add(k));return s.size});
 const c=await p.evaluate(()=>{const c=document.querySelector('#ybCard');return {t:c?.innerText.replace(/\n/g,' | '),n:c?.querySelectorAll('[data-ybk]').length,full:[...c.querySelectorAll('.yb-b.full')].map(x=>x.dataset.ybk),some:[...c.querySelectorAll('.yb-b.some')].map(x=>x.dataset.ybk),lbl:c.querySelector('[data-ybk="RUT"]').getAttribute('aria-label'),job:c.querySelector('[data-ybk="JOB"]').getAttribute('aria-label')}});
 ok(c.n===66&&await p.evaluate(()=>[...document.querySelectorAll('.yb-b span')].slice(8,10).map(x=>x.textContent).join())==='1Sa,2Sa'&&new RegExp(want+' of 1,189 chapters').test(c.t),tag+` card counts ${want} chapters (path + ticks, a chapter on both counted once, an unticked one not): `+c.t.slice(0,90));
 ok(c.full.join()==='RUT'&&c.some.includes('JOB')&&c.some.includes('MRK')&&!c.some.includes('PSA'),tag+' Ruth is a whole book, Job and Mark started, Psalms (unticked) not');
 ok(c.lbl==='Ruth: 4 of 4 chapters read'&&c.job==='Job: 1 of 42 chapters read'&&/1 whole book read/.test(c.t),tag+' tiles say what they hold');
 ok(/Old Testament \| 5 of 929/.test(c.t)&&new RegExp('New Testament \\| '+(want-5)+' of 260').test(c.t),tag+' Old and New Testament totals');
 const sz=await p.evaluate(()=>[...document.querySelectorAll('.yb-b')].filter(b=>b.offsetHeight<44||b.offsetWidth<44).length);ok(sz===0,tag+' every tile is at least 44 px');
 await p.evaluate(()=>document.querySelector('#ybCard').scrollIntoView({block:'start'}));await p.waitForTimeout(300);
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s66/card-${tag}.png`});
 const ax=await p.evaluate(AXE+';(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector("#ybCard"),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()');
 ok(!ax.length,tag+' axe: card clean '+ax);
 // a tile opens the book sheet, which marks the same chapters
 await p.click('[data-ybk="JOB"]');await p.waitForTimeout(500);
 const sh=await txt(p,'#scrim');ok(/Job/.test(sh)&&/1 read/.test(sh)&&await p.$('#scrim .cgrid .rd[data-bch="1"]'),tag+' Job tile opens its book sheet with chapter 1 marked');
 await p.evaluate(()=>closeTop());await p.waitForTimeout(300);
 // keyboard: tiles are buttons in order
 if(w===1440){await p.focus('[data-ybk="GEN"]');await p.keyboard.press('Tab');ok(await p.evaluate(()=>document.activeElement?.dataset.ybk)==='EXO',tag+' Tab goes Genesis → Exodus')}
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}

// 3. the reader: tick a chapter that isn't on the path; path chapters keep Mark as read
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs,rm:'no-preference'});
 await p.evaluate(()=>openPassage(passFor('JOB',2),false));await p.waitForTimeout(1500);
 await p.evaluate(()=>{const s=document.querySelector('#rScroll');s.scrollTop=s.scrollHeight});await p.waitForTimeout(500);
 let bt=await p.evaluate(()=>{const b=document.querySelector('#rcTick');return b&&{t:b.innerText,pr:b.getAttribute('aria-pressed'),h:b.offsetHeight}});
 ok(bt&&/I've read this chapter/.test(bt.t)&&bt.pr==='false'&&bt.h>=44,tag+' end of Job 2 offers "I\'ve read this chapter" '+JSON.stringify(bt));
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s66/reader-${tag}.png`});
 await p.click('#rcTick');await p.waitForTimeout(400);
 bt=await p.evaluate(()=>{const b=document.querySelector('#rcTick');return {t:b.innerText,pr:b.getAttribute('aria-pressed'),pop:b.classList.contains('rc-pop'),foc:document.activeElement===b,rc:JSON.parse(localStorage.getItem('lamp-state-v1')).rc['JOB.2'],toast:document.querySelector('.toast')?.innerText||''}});
 ok(bt.pr==='true'&&/counts in Your Bible/.test(bt.t)&&bt.pop&&bt.foc&&bt.rc&&bt.rc.u,tag+' tick saves it, pops and keeps focus '+JSON.stringify(bt));
 ok(/Job 2 counted/.test(bt.toast),tag+' toast: '+bt.toast);
 const ax2=await p.evaluate(AXE+';(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector("#rEnd"),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target).join(";"))})()');
 ok(!ax2.length,tag+' axe: end of chapter clean after ticking '+ax2);
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s66/ticked-${tag}.png`});await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>{const d=window.__mock.store.get('data/users/u_me/progress');return !!(d&&d.rc&&d.rc['JOB.2'])}),tag+' the tick syncs to the account');
 await p.click('#rcTick');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-state-v1')).rc['JOB.2']===null&&document.querySelector('#rcTick').getAttribute('aria-pressed')==='false'),tag+' tapping again unticks it (null, so other phones untick too)');
 // a path chapter: Mark as read, no extra tick
 await p.evaluate(()=>closeReader());await p.waitForTimeout(300);await p.evaluate(()=>openPassage(PLAN[4],false));await p.waitForTimeout(1500);
 await p.evaluate(()=>{const s=document.querySelector('#rScroll');s.scrollTop=s.scrollHeight});await p.waitForTimeout(300);
 ok(await p.$('#rDone')&&!(await p.$('#rcTick')),tag+' a path chapter keeps Mark as read and has no extra tick');
 ok(!errs.length,tag+' reader: no errors '+errs.join('|'));await ctx.close()}

// 4. merging: a tick from another phone arrives; an untick (null) from another phone wins when newer
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const r=await p.evaluate(()=>{merge({rc:{'EST.1':{u:'2026-11-10T08:00:00Z'},'RUT.1':null}});return {est:!!state.rc['EST.1'],rut:state.rc['RUT.1'],n:bibleTotals().n}});
 ok(r.est&&r.rut===null,'merge: ticks arrive and unticks win '+JSON.stringify(r));
 ok(!errs.length,'merge: no errors '+errs.join('|'));await ctx.close()}

// 5. a first-timer (nothing read, no rc in old saved state) sees 0 and works offline
{const st={done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
 const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st,nomock:true});
 await p.evaluate(()=>setView('path'));await p.waitForTimeout(600);
 const t=await txt(p,'#ybCard');ok(/0 of 1,189 chapters/.test(t)&&!/whole book/.test(t),'new reader: 0 of 1,189, no whole-book line');
 await p.evaluate(()=>openPassage(passFor('JOB',3),false));await p.waitForTimeout(1200);await p.evaluate(()=>{const s=document.querySelector('#rScroll');s.scrollTop=s.scrollHeight});await p.waitForTimeout(300);await ctx.setOffline(true);
 await p.click('#rcTick');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!JSON.parse(localStorage.getItem('lamp-state-v1')).rc['JOB.3']),'offline and signed out: the tick is kept on the phone');
 ok(!errs.length,'first-timer: no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
