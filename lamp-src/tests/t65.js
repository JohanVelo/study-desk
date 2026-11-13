// v50: prayer groups (Family, Friends, Church, Work and study, The world, Me; like PrayerMate's categories): pick one when adding,
// filter the list, pray through one group, change it in the day sheet; filtered cards ease in; UI verse quotes match the BSB; 14 new questions
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s65',{recursive:true});
const NOW='2026-11-13T09:00:00+02:00';
const T=d=>`2026-${d}T08:00:00+02:00`;
const PL={p1:{t:'Mum\'s health',at:'2026-10-01T08:00:00Z',u:'2026-10-01T08:00:00Z',c:'family'},p2:{t:'Wisdom at work',at:'2026-10-05T08:00:00Z',u:'2026-10-05T08:00:00Z',c:'work',dw:5},
  p3:{t:'Thabo to find a job',at:'2026-10-20T08:00:00Z',u:'2026-10-20T08:00:00Z',c:'friends'},p4:{t:'Our church plant',at:'2026-10-25T08:00:00Z',u:'2026-10-25T08:00:00Z',c:'church'},
  p5:{t:'Gogo in hospital',at:'2026-10-26T08:00:00Z',u:'2026-10-26T08:00:00Z',c:'family',last:'2026-11-01T08:00:00Z',n:1},p6:{t:'Patience with myself',at:'2026-10-27T08:00:00Z',u:'2026-10-27T08:00:00Z'}};
const ST={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},pl:PL,settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(NOW).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const pl=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-state-v1')).pl);
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const journal=async p=>{await p.evaluate(()=>{jTab='pray';setView('journal')});await p.waitForTimeout(600)};

for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});await journal(p);
 // filter chips: only the groups in use, with counts
 let f=await txt(p,'.plg-filt');
 ok(/All · 6/.test(f)&&/Family · 2/.test(f)&&/Friends · 1/.test(f)&&/Church · 1/.test(f)&&/Work and study · 1/.test(f)&&!/The world|Me ·/.test(f),tag+' filter chips: '+f);
 ok(await p.evaluate(()=>[...document.querySelectorAll('.plc .plg-tag')].map(x=>x.innerText).join('|'))!=='',tag+' cards show their group');
 if(cs==='light'||w===1440){await p.evaluate(()=>document.querySelector('.plg-filt').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s65/list-${tag}.png`})}
 // filter to Family
 await p.click('[data-plgf="family"]');await p.waitForTimeout(300);
 const fam=await p.evaluate(()=>({cards:[...document.querySelectorAll('.plc p')].map(x=>x.innerText),pray:document.querySelector('#plPray').innerText,pressed:document.querySelector('[data-plgf="family"]').getAttribute('aria-pressed'),foc:document.activeElement?.dataset?.plgf}));
 ok(fam.cards.length===2&&fam.cards.includes("Mum's health")&&fam.cards.includes('Gogo in hospital')&&/Pray for family · 2/.test(fam.pray)&&fam.pressed==='true'&&fam.foc==='family',tag+' Family shows 2 and the button prays for family: '+JSON.stringify(fam));
 const ax=await p.evaluate(AXE+';(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector("main")||document.body,{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target).join(","))})()');
 ok(!ax.length,tag+' axe: journal prayers clean '+ax);
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s65/family-${tag}.png`});
 // Pray for family: only those two, the kicker names the group
 await p.click('#plPray');await p.waitForTimeout(500);
 const pn=await p.evaluate(()=>({l:PN.list.map(x=>x.k).join(','),k:document.querySelector('#pnStage .qt-k')?.innerText}));
 ok(pn.l==='p1,p5'&&/family/i.test(pn.k),tag+' Pray for family: just those, never prayed first: '+JSON.stringify(pn));
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s65/pray-${tag}.png`});
 await p.keyboard.press('Escape');await p.waitForTimeout(400);
 // add with a group picked, while the Family filter is on
 ok(!(await p.isVisible('.plg-pick')),tag+' group picker stays out of the way until you type');
 await p.fill('#plT','Peace in Sudan');ok(await p.isVisible('.plg-pick'),tag+' typing shows the group picker');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s65/add-${tag}.png`});
 await p.click('[data-plgp="world"]');ok(await p.$eval('[data-plgp="world"]',b=>b.getAttribute('aria-pressed'))==='true',tag+' group chip toggles on');await p.click('#plF button');await p.waitForTimeout(400);
 let L=await pl(p);const nk=Object.keys(L).find(k=>L[k]&&L[k].t==='Peace in Sudan');
 ok(nk&&L[nk].c==='world',tag+' new prayer saved in The world');
 f=await txt(p,'.plg-filt');const vis=await p.evaluate(()=>[...document.querySelectorAll('.plc p')].map(x=>x.innerText));
 ok(/All · 7/.test(f)&&/The world · 1/.test(f)&&vis.includes('Peace in Sudan'),tag+' filter goes back to All so the new prayer is seen: '+f);
 ok(await p.$eval('[data-plgp="world"]',b=>b.getAttribute('aria-pressed'))==='true'&&await p.isVisible('.plg-pick'),tag+' the group stays picked (and shown) for the next one');
 // change a group in the sheet; no group
 await p.click(`[data-pldw="p6"]`);await p.waitForTimeout(400);
 const sh=await txt(p,'#pld');ok(/Group/i.test(sh)&&/No group/.test(sh)&&/Work and study/.test(sh)&&await p.$eval('#pld [data-pg=""]',b=>b.getAttribute('aria-pressed'))==='true',tag+' day sheet has a Group section');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s65/sheet-${tag}.png`});
 const small=await p.evaluate(()=>[...document.querySelectorAll('#pld button')].filter(b=>b.offsetHeight<44).length);ok(small===0,tag+' sheet buttons are 44 px');
 await p.click('#pld [data-pg="me"]');await p.waitForTimeout(400);L=await pl(p);
 ok(L.p6.c==='me'&&L.p6.u>'2026-11-01',tag+' moved to Me (u updated so it syncs)');
 await p.click(`[data-pldw="p6"]`);await p.waitForTimeout(400);await p.click('#pld [data-pg=""]');await p.waitForTimeout(400);L=await pl(p);
 ok(!('c' in L.p6),tag+' No group clears it');
 // the day still works from the same sheet
 await p.click(`[data-pldw="p3"]`);await p.waitForTimeout(400);await p.click('#pld [data-dw="7"]');await p.waitForTimeout(400);L=await pl(p);
 ok(L.p3.dw===7&&L.p3.c==='friends',tag+' picking a day keeps the group');
 // filtering away the last of a group falls back to All
 await p.click('[data-plgf="church"]');await p.waitForTimeout(300);await p.click('[data-pla="p4"]');await p.waitForTimeout(200);await p.click('.plc form button');await p.waitForTimeout(900);
 f=await txt(p,'.plg-filt');ok(/All · 6/.test(f)&&!/Church/.test(f)&&await p.$eval('[data-plgf=""]',b=>b.getAttribute('aria-pressed'))==='true',tag+' answering the last church prayer goes back to All: '+f);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}

// motion on: filtered cards ease in one after another; the add form alone doesn't animate
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference'});await journal(p);
 ok(!(await p.$('.pl-list.plg-in')),'no animation on first open');
 await p.click('[data-plgf="family"]');await p.waitForTimeout(60);
 const a=await p.evaluate(()=>{const c=document.querySelectorAll('.pl-list.plg-in .plc');return {n:c.length,an:getComputedStyle(c[1]).animationName,d:getComputedStyle(c[1]).animationDelay}});
 ok(a.n===2&&a.an==='plgin'&&a.d==='0.045s','cards ease in, the second a little later: '+JSON.stringify(a));
 ok(!errs.length,'motion: no errors '+errs.join('|'));await ctx.close()}

// no groups at all: no filter row, picker still offered; old prayers (no c) still work; Today card unchanged
{const st={...ST,pl:{q1:{t:'Old prayer',at:'2026-10-01T08:00:00Z',u:'2026-10-01T08:00:00Z',dw:5}}};
 const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st});
 ok(/Old prayer/.test(await txt(p,'#pltCard')),'Friday: Today still shows the Friday prayer');
 await journal(p);ok(!(await p.$('.plg-filt'))&&await p.$('.plg-pick')&&!(await p.isVisible('.plg-pick'))&&!(await p.$('.plg-tag')),'no groups: no filter row, picker shown, no tag');
 ok(/Pray through my list · 1/.test(await txt(p,'#plPray')),'button unchanged without a filter');
 await p.screenshot({path:`${__dirname}/s65/empty-groups-390-light.png`});
 ok(!errs.length,'no groups: no errors '+errs.join('|'));await ctx.close()}

// accuracy: the quoted verses in the app's own words match the BSB; 14 new questions
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const html=await (await p.request.get(base)).text();
 ok(html.includes('The prayer of a righteous man has great power to prevail.')&&!html.includes('as it is working'),'James 5:16 is the BSB wording');
 ok(html.includes('I will lie down and sleep in peace, for You alone, O LORD, make me dwell in safety.'),'Psalm 4:8 is the BSB wording');
 ok(!html.includes('Be still, and know')&&html.includes('Be still and know that I am God'),'Psalm 46:10 is the BSB wording');
 ok(html.includes('Jesus is the Christ, the Son of God, and that by believing'),'John 20:31 is the BSB wording');
 const bank=await p.evaluate(async()=>{const F=await loadFun();const nw=F.q.slice(552,566);const o={};for(const c of ['DEU','EZR','MIC','2CO','1JN','1TH'])o[c]=(await bqPool(c)).length;
   return {n:F.q.length,refs:nw.map(q=>q.ref),ok:nw.every(q=>q.q&&q.a.length===4&&new Set(q.a).size===4&&q.ref&&q.c&&q.l),o}});
 ok(bank.n>=566&&bank.ok&&Object.values(bank.o).every(n=>n>=4),'14 new questions; Deuteronomy, Ezra, Micah, 2 Corinthians, 1 John and 1 Thessalonians get a book quiz: '+JSON.stringify(bank.o));
 // each new question's right answer is in its verse (BSB), in the app's words
 const B=b=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${b}.json`,'utf8'));
 const key={'DEU.6.5':'all your heart','EZR.7.10':'to practice it, and to teach','EZR.3.11':'loving devotion to Israel endures forever','MIC.4.3':'plowshares','MIC.7.19':'depths of the sea','2CO.5.17':'new creation','2CO.12.9':'My grace is sufficient for you','2CO.9.7':'cheerful giver','1JN.1.9':'faithful and just to forgive','1JN.4.19':'He first loved us','1JN.4.18':'drives out fear','1TH.5.18':'in every circumstance','1TH.4.16':'the dead in Christ','1TH.1.1':'Silvanus, and Timothy'};
 const miss=bank.refs.filter(r=>{const [bk,c,v]=r.split('.');return !(B(bk)[+c-1][+v-1]||'').includes(key[r])});
 ok(bank.refs.length===14&&!miss.length,'every new answer is in its BSB verse '+miss);
 ok(!errs.length,'accuracy: no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
