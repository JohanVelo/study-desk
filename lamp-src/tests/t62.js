// v47: share sermon notes with the group (This week tab, save a copy to my journal), a Contrast setting (and the phone's Increase Contrast)
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s62',{recursive:true});
const T=d=>`2026-${d}T08:00:00+02:00`;
const ST={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const TUE='2026-11-10T10:00:00+02:00';
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',when:'Thursdays at 7 pm',at:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,sm:{sa1:{d:'2026-11-08',t:'The father who runs',ref:'Luke 15:11-32',who:'Pastor Thabo',act:'Phone my brother this week',body:'The younger son came to his senses.\nThe father ran to him.\nThe older brother stayed outside.',at:'2026-11-08T12:00:00Z'},sa0:{d:'2026-10-18',t:'Too old to show',body:'x',at:'2026-10-18T12:00:00Z'}}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,sm:{sb1:{d:'2026-11-01',ref:'Psalm 23',body:'The Lord is my shepherd.',at:'2026-11-01T12:00:00Z'}}})};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(o.now||TUE).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  if(!o.nomock){await ctx.addInitScript(MOCK);await ctx.addInitScript(SEED)}
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const toStudy=async p=>{await p.evaluate(()=>{setView('group')});await p.waitForTimeout(700);await p.evaluate(()=>{G.sub='study';gSel();gTabInd()});await p.waitForTimeout(500)};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 await toStudy(p);
 const g=await p.evaluate(()=>{const el=document.querySelector('#gSm');return {hidden:el?.hidden,t:el?.innerText.replace(/\n/g,' | '),n:el?.querySelectorAll('details').length,open:[...el.querySelectorAll('details')].map(d=>d.open)}});
 ok(!g.hidden&&g.n===2&&/Sermon notes from the group/.test(g.t)&&/The father who runs/.test(g.t)&&/Psalm 23/.test(g.t)&&!/Too old/.test(g.t)&&g.open[0]&&!g.open[1],tag+' This week lists the 2 recent sermons, newest open, old one left out: '+JSON.stringify(g.open));
 ok(/One thing to live out/i.test(g.t)&&/Phone my brother this week/.test(g.t)&&/Read Luke 15:11/.test(g.t)&&/Save to my journal/.test(g.t),tag+' the open card shows the one thing, a Read link and Save');
 await p.evaluate(()=>document.querySelector('#gSm').scrollIntoView({block:'start'}));await p.waitForTimeout(250);
 await p.screenshot({path:`${__dirname}/s62/group-${tag}.png`});
 const ax=await p.evaluate(AXE+';(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector("#gSm"),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.length)})()');
 ok(!ax.length,tag+' axe: no serious issues in the sermon list '+ax.join(','));
 const tg=await p.evaluate(()=>[...document.querySelectorAll('#gSm summary,#gSm .btn')].filter(e=>e.offsetParent).map(e=>Math.round(e.getBoundingClientRect().height)).filter(x=>x<44));
 ok(!tg.length,tag+' 44 px targets '+tg);
 await p.click('#gSm [data-smsave]');await p.waitForTimeout(400);
 const sv=await p.evaluate(()=>({have:document.querySelector('#gSm .gsm-have')?.textContent,sn:Object.values(JSON.parse(localStorage.getItem('lamp-state-v1')).sn||{}).filter(Boolean)}));
 ok(/In your journal/.test(sv.have||'')&&sv.sn.length===1&&sv.sn[0].src==='u_a:sa1'&&sv.sn[0].act==='Phone my brother this week'&&/came to his senses/.test(sv.sn[0].body),tag+' Save to my journal copies it once');
 // second card opens, and copied stays marked after a repaint
 await p.click('#gSm details:nth-of-type(2) summary');await p.waitForTimeout(250);
 await p.evaluate(()=>paintStudy());await p.waitForTimeout(150);
 ok(await p.evaluate(()=>{const d=[...document.querySelectorAll('#gSm details')];return d[0].open&&d[1].open&&/In your journal/.test(d[0].innerText)}),tag+' a repaint keeps open cards open and the copy marked');
 // Today: the copied sermon's one thing comes back
 await p.evaluate(()=>setView('today'));await p.waitForTimeout(600);
 ok(/Phone my brother this week/.test(await p.evaluate(()=>document.querySelector('#snCard')?.innerText||'')),tag+' the copied one thing shows on Today');
 // Journal shows where it came from
 await p.evaluate(()=>{jTab='notes';setView('journal')});await p.waitForTimeout(600);
 ok(/From Sarah/i.test(await p.evaluate(()=>document.querySelector('.sn-sec')?.innerText||'')),tag+' Journal says who it came from: '+await p.evaluate(()=>document.querySelector('.sn-item')?.innerText.replace(/\n/g,' | ')));
 // share my own
 await p.click('#snNew');await p.waitForTimeout(400);await p.fill('#sn_ref','Romans 8:28');await p.fill('#sn_act','Thank God for one hard thing');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>!!document.querySelector('#sn_sh')&&!document.querySelector('#sn_sh').checked),tag+' the sheet offers to share, off by default');
 if(w===390&&cs==='light'){await p.evaluate(()=>document.querySelector('#sn_sh').scrollIntoView({block:'center'}));await p.waitForTimeout(150);await p.screenshot({path:`${__dirname}/s62/share-${tag}.png`})}
 await p.click('#sn_sh');await p.waitForTimeout(1200);
 const sh=await p.evaluate(()=>{const g=window.__mock.store.get('gm/u_me')||{};const L=Object.values(g.sm||{}).filter(Boolean);return {st:document.querySelector('#snS').textContent,n:L.length,ref:L[0]?.ref,act:L[0]?.act}});
 ok(/Shared with your group/.test(sh.st)&&sh.n===1&&sh.ref==='Romans 8:28'&&sh.act==='Thank God for one hard thing',tag+' ticking Share sends the notes to the group: '+JSON.stringify(sh));
 await p.fill('#sn_body','All things work together for good.');await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>Object.values((window.__mock.store.get('gm/u_me')||{}).sm||{}).some(x=>x&&/work together/.test(x.body))),tag+' later typing reaches the group too');
 await p.click('#snOk');await p.waitForTimeout(400);
 await toStudy(p);
 const me=await p.evaluate(()=>{const d=[...document.querySelectorAll('#gSm details')].find(x=>/Romans 8:28/.test(x.innerText));if(!d)return null;d.open=true;return d.innerText.replace(/\n/g,' | ')});
 ok(me&&/· you/i.test(me)&&/Edit your notes/.test(me)&&!/Save to my journal/.test(me),tag+' my shared notes show as mine with Edit: '+me);
 await p.evaluate(()=>[...document.querySelectorAll('#gSm [data-smmine]')][0].click());await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.querySelector('#sn_sh')?.checked===true&&document.querySelector('#sn_ref').value==='Romans 8:28'),tag+' Edit opens my notes, still shared');
 await p.click('#sn_sh');await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>!Object.values((window.__mock.store.get('gm/u_me')||{}).sm||{}).some(Boolean)&&/Not shared/.test(document.querySelector('#snS').textContent)),tag+' unticking takes it off the group');
 await p.click('#sn_sh');await p.waitForTimeout(900);await p.click('#snDel');await p.click('#snDel');await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>!Object.values((window.__mock.store.get('gm/u_me')||{}).sm||{}).some(Boolean)),tag+' deleting shared notes removes them from the group');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// signed out: no share box, nothing breaks
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',nomock:true});
 await p.evaluate(()=>{jTab='notes';setView('journal')});await p.waitForTimeout(500);await p.click('#snNew');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.querySelector('#sn_sh')),'signed out: no "Share with my group" box');
 ok(!errs.length,'signed out: no errors '+errs.join('|'));await ctx.close()}
// contrast
for(const cs of ['light','dark'])for(const w of [390,1440]){const tag=w+'-'+cs;const {ctx,p,errs}=await open({w,h:w<800?844:900,cs});
 const mv=()=>p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--muted').trim().toUpperCase());
 const base0=await mv();
 await p.evaluate(()=>openSettings());await p.waitForTimeout(500);
 const f=await p.evaluate(()=>{const b=document.querySelector('[data-hc="more"]');b.scrollIntoView({block:'center'});return {t:b.closest('.field').innerText.replace(/\n/g,' | '),h:b.getBoundingClientRect().height}});
 ok(/Contrast/.test(f.t)&&/Match device/.test(f.t)&&f.h>=44,tag+' Settings has Contrast: '+f.t);
 await p.click('[data-hc="more"]');await p.waitForTimeout(300);
 const m1=await mv();const want=cs==='light'?'#3D4540':'#C9D1C8';
 ok(m1===want&&base0!==m1&&await p.evaluate(()=>document.documentElement.classList.contains('hc')&&state.settings.hc==='more'),tag+' More makes grey text stronger: '+base0+' → '+m1);
 await p.screenshot({path:`${__dirname}/s62/contrast-${tag}.png`});
 await p.evaluate(()=>{$('#scrim')?.remove();setView('today')});await p.waitForTimeout(500);
 if(w===390)await p.screenshot({path:`${__dirname}/s62/today-hc-${tag}.png`});
 await p.reload();await p.waitForTimeout(1500);ok(await mv()===want,tag+' it stays after a reload');
 await p.evaluate(()=>openSettings());await p.waitForTimeout(400);await p.click('[data-hc="auto"]');await p.waitForTimeout(200);
 ok(await mv()===base0,tag+' Match device puts it back');
 await p.evaluate(()=>$('#scrim')?.remove());
 await p.emulateMedia({contrast:'more'});await p.waitForTimeout(200);
 ok(await mv()===want,tag+" Match device follows the phone's Increase Contrast");
 ok(!errs.length,tag+' contrast: no errors '+errs.join('|'));await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const bank=await p.evaluate(async()=>{const F=await loadFun();const nw=F.q.slice(528,540);const o={};for(const c of ['2TH','TIT','2PE'])o[c]=(await bqPool(c)).length;return {n:F.q.length,ok:nw.every(x=>x.a.length===4&&new Set(x.a).size===4&&/^[1-3A-Z]{3}\.\d+\.\d+$/.test(x.ref)&&x.c!=='books'),books:[...new Set(nw.map(x=>x.ref.split('.')[0]))].sort().join(','),o}});
 ok(bank.n>=540&&bank.ok&&bank.books==='2PE,2TH,TIT'&&Object.values(bank.o).every(n=>n>=4),'12 new questions; 2 Thessalonians, Titus and 2 Peter get a book quiz: '+JSON.stringify(bank));
 await p.evaluate(()=>openBook('TIT'));await p.waitForTimeout(900);ok(await p.evaluate(()=>!!document.querySelector('#bqGo')),'Titus offers Quiz me');
 ok(!errs.length,'bank: no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
