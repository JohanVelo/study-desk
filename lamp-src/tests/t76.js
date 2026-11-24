// v61: Advent calendar (25 readings, wreath on Today)
// accuracy: the prophets summaries
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s76',{recursive:true});
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
const shot=async(p,n)=>{await p.waitForTimeout(400);await p.screenshot({path:`${__dirname}/s76/${n}.png`})};
const BSBv=(b,c,v)=>BSB(b)[c-1][v-1];
const D=(m,d)=>`2026-${m}-${String(d).padStart(2,'0')}T07:00:00+02:00`;

// 1. accuracy: each Advent reading exists in the BSB, its line matches the passage, dates and candles are right
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const A=await p.evaluate(()=>ADV);ok(A.length===25,'25 readings, one for each day 1 to 25 December');
 const BK={'Isaiah':'ISA','Micah':'MIC','Jeremiah':'JER','Genesis':'GEN','2 Samuel':'2SA','Malachi':'MAL','Luke':'LUK','Matthew':'MAT','John':'JHN','Philippians':'PHP'};
 const need={0:['ISA',9,2,'great light'],1:['ISA',11,1,'stump of jesse'],2:['ISA',7,14,'immanuel'],3:['MIC',5,2,'ruler over israel'],4:['ISA',40,3,'prepare the way for the lord'],5:['JER',23,5,'righteous branch'],6:['GEN',3,15,'crush your head'],7:['GEN',12,3,'all the families of the earth will be blessed'],8:['2SA',7,16,'endure forever'],9:['MAL',3,1,'prepare the way before me'],10:['LUK',1,13,'john'],11:['LUK',1,31,'the name jesus'],12:['LUK',1,41,'baby leaped'],13:['LUK',1,46,'my soul magnifies the lord'],14:['MAT',1,20,'do not be afraid'],15:['LUK',1,63,'his name is john'],16:['LUK',1,68,'visited and redeemed his people'],17:['JHN',1,14,'the word became flesh and made his dwelling among us'],18:['MAT',1,1,'son of david, the son of abraham'],19:['PHP',2,7,'emptied himself, taking the form of a servant'],20:['ISA',9,6,'wonderful counselor, mighty god, everlasting father, prince of peace'],21:['JHN',3,16,'for god so loved the world that he gave his one and only son'],22:['LUK',2,7,'manger'],23:['LUK',2,10,'good news of great joy'],24:['LUK',2,19,'treasured up all these things']};
 const bad=[];A.forEach(([ref,lbl,line],i)=>{const [b,c,v]=ref.split('.');const m=lbl.match(/^(.+) (\d+):(\d+)(?:–(\d+))?$/);if(!m||BK[m[1]]!==b||+m[2]!==+c||+m[3]!==+v)bad.push(i+' ref/label '+ref+' '+lbl);
  const last=m&&m[4]?+m[4]:+v;try{if(!BSB(b)[c-1][last-1])bad.push(i+' no verse '+lbl)}catch(e){bad.push(i+' missing '+lbl)}
  const [nb,nc,nv,ph]=need[i];if(nb!==b||nv<+v||nv>last||+nc!==+c)bad.push(i+' key verse outside '+lbl);if(!BSBv(nb,nc,nv).toLowerCase().replace(/[’]/g,"'").includes(ph))bad.push(i+' BSB lacks "'+ph+'"')});
 ok(!bad.length,'Advent: every reading is a real BSB passage and its line is in its words '+bad.join(' / '));
 const s=await p.evaluate(()=>[2025,2026,2027,2028,2029,2030].map(y=>advSun(y).toISOString().slice(0,10)));
 ok(JSON.stringify(s)===JSON.stringify(['2025-11-29','2026-11-28','2027-11-27','2028-12-02','2029-12-01','2030-11-30'].map(()=>0).map((_,i)=>s[i]))&&await p.evaluate(()=>[2025,2026,2027,2028,2029,2030].map(y=>advSun(y)).map(d=>d.getDay()+':'+d.getMonth()+':'+d.getDate()).join())==='0:10:30,0:10:29,0:10:28,0:11:3,0:11:2,0:11:1','Advent Sunday is the fourth Sunday before Christmas (30 Nov 2025, 29 Nov 2026, 3 Dec 2028)');
 const L=await p.evaluate(()=>['2026-11-21','2026-11-22','2026-11-28','2026-11-29','2026-12-05','2026-12-06','2026-12-13','2026-12-20','2026-12-24','2026-12-25','2026-12-26','2026-07-01'].map(k=>{const a=advInfo(new Date(k+'T09:00'));return a?a.lit+'/'+a.day:'-'}).join());
 ok(L==='-,0/0,0/0,1/0,1/5,2/6,3/13,4/20,4/24,5/25,-,-','card from a week before, candles each Sunday, all five on Christmas Day, gone after '+L);
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 2. Today card on 4 sizes, and the calendar
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=`${w}-${cs}`,dev=w<800?'phone':'desk';
 // before Advent
 {const {ctx,p,errs}=await open({w,h,cs,now:D(11,23)});const t=await txt(p,'#advCard');
  ok(/Advent begins on Sunday 29 November/.test(t)&&/See the calendar/.test(t),tag+' a week before: says when Advent begins '+t.slice(0,90));
  ok(await p.evaluate(()=>document.querySelector('#advCard svg').getAttribute('aria-label'))==='Advent wreath: 0 of 4 candles lit',tag+' wreath unlit and labelled');
  await p.evaluate(()=>document.querySelector('#advCard').scrollIntoView({block:'center'}));await shot(p,`${dev}-${cs}-1-before`);
  let ax=await axe(p,'#advCard');ok(!ax.length,tag+' axe: card before Advent '+ax);
  await p.click('#advCard [data-adv]');await p.waitForSelector('.advsheet');
  const lk=await p.evaluate(()=>[...document.querySelectorAll('[data-advd]')].filter(b=>b.getAttribute('aria-disabled')).length);ok(lk===25,tag+' every door shut until 1 December ('+lk+')');
  await p.click('[data-advd="4"]',{force:true});await p.waitForTimeout(300);ok(/opens on 5 December/i.test(await txt(p,'.toast')),tag+' a shut door says when it opens');
  if(w===390&&cs==='light')await shot(p,'phone-light-2-calendar-before');
  ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}
 // 7 December
 {const {ctx,p,errs}=await open({w,h,cs,now:D(12,7)});const t=await txt(p,'#advCard');
  ok(/7 December · peace/i.test(t)&&/crush the serpent/.test(t)&&/Read Genesis 3:8–15/.test(t),tag+' 7 December: Genesis 3, second candle week '+t.slice(0,120));
  ok(await p.evaluate(()=>document.querySelector('#advCard svg').getAttribute('aria-label'))==='Advent wreath: 2 of 4 candles lit',tag+' two candles lit');
  const bs=await p.evaluate(()=>[...document.querySelectorAll('#advCard .btn')].map(b=>{const r=b.getBoundingClientRect();return[r.height,r.right<=innerWidth+1]}));ok(bs.length===3&&bs.every(([hh,inn])=>hh>=44&&inn),tag+' three 44 px buttons that fit '+JSON.stringify(bs));
  await p.evaluate(()=>document.querySelector('#advCard').scrollIntoView({block:'center'}));await shot(p,`${dev}-${cs}-3-today`);
  let ax=await axe(p,'#advCard');ok(!ax.length,tag+' axe: card in Advent '+ax);
  await p.click('#advCard [data-advk="6"]');await p.waitForTimeout(250);
  const st=await p.evaluate(()=>state.settings.tp.adv2026);ok(st&&st.d&&st.d[6],tag+' Mark as read saves day 7 (and it syncs with settings)');
  ok(/Read$/.test((await txt(p,'#advCard [data-advk="6"]')).trim())&&await p.evaluate(()=>document.activeElement?.dataset?.advk==='6'),tag+' button now says Read, focus stays on it');
  ok(/1 of 25/.test(await txt(p,'#advCard [data-adv]')),tag+' card counts 1 of 25');
  await p.click('#advCard [data-adv]');await p.waitForSelector('.advsheet');
  const g=await p.evaluate(()=>{const B=[...document.querySelectorAll('[data-advd]')];return{open:B.filter(b=>!b.getAttribute('aria-disabled')).length,dn:B.filter(b=>b.classList.contains('dn')).map(b=>b.dataset.advd),now:document.querySelector('.adv-d.now')?.dataset.advd,lit:[...document.querySelectorAll('.adv-sun li.on b')].map(b=>b.textContent).join()}});
  ok(g.open===7&&g.dn.join()==='6'&&g.now==='6'&&g.lit==='Hope,Peace',tag+' calendar: 7 doors open, today ringed, day 7 ticked, hope and peace lit '+JSON.stringify(g));
  await p.click('[data-advd="2"]');await p.waitForTimeout(250);ok(/Isaiah 7:10–14/.test(await txt(p,'.adv-pick'))&&await p.evaluate(()=>document.activeElement?.dataset?.advd==='2'),tag+' an earlier door shows its reading, focus stays');
  if(dev==='phone'||cs==='dark'){await shot(p,`${dev}-${cs}-4-calendar`)}
  ax=await axe(p,'.advsheet');ok(!ax.length,tag+' axe: calendar '+ax);
  await p.click('.advsheet [data-advk="2"]');await p.waitForTimeout(250);ok((await p.evaluate(()=>Object.keys(state.settings.tp.adv2026.d).sort().join()))==='2,6',tag+' marking in the calendar saves too');
  ok(/2 of 25/i.test(await txt(p,'.advsheet .kick'))&&/2 of 25/.test(await txt(p,'#advCard [data-adv]')),tag+' sheet and Today card both update');
  if(w===390&&cs==='light'){await p.click('.advsheet [data-advr="2"]');await p.waitForTimeout(1500);const r=await p.evaluate(()=>({reader:!!document.querySelector('.reader'),t:document.querySelector('.reader')?.innerText.slice(0,200)}));ok(r.reader&&/Isaiah 7/.test(r.t),tag+' Read it opens Isaiah 7 in the reader '+JSON.stringify(r).slice(0,120))}
  ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}
}
// Christmas Day and after
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:D(12,25)});const t=await txt(p,'#advCard');ok(/Christmas Day/i.test(t)&&/Luke 2:15–20/.test(t),'Christmas Day: Luke 2:15–20 '+t.slice(0,80));
 ok(await p.evaluate(()=>document.querySelector('#advCard svg').getAttribute('aria-label'))==='Advent wreath: all five candles lit','Christmas Day: all five candles');
 await p.evaluate(()=>document.querySelector('#advCard').scrollIntoView({block:'center'}));await shot(p,'phone-light-5-christmas');
 await p.click('#advCard [data-advr="24"]');await p.waitForTimeout(1500);ok(await p.evaluate(()=>state.settings.tp.adv2026?.d?.[24]&&/Luke 2/.test(document.querySelector('.reader')?.innerText||'')),'reading it from Today marks it read and opens Luke 2');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:D(12,26)});ok(!(await p.$('#advCard')),'26 December: the card has gone');ok(!errs.length,'no page errors');await ctx.close()}

// 3. feel: drag a sheet down to close it (phone touch); a short pull springs back; laptops unaffected
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',now:D(12,7)});const cdp=await ctx.newCDPSession(p);
 const drag=async(y0,y1,steps,ms)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:y0}]});for(let i=1;i<=steps;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:y0+(y1-y0)*i/steps}]});await p.waitForTimeout(ms)}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};
 await p.click('#advCard [data-adv]');await p.waitForSelector('.advsheet');await p.waitForTimeout(600);
 const top=await p.evaluate(()=>document.querySelector('#scrim>.sheet').getBoundingClientRect().top);
 await drag(top+20,top+60,6,30);await p.waitForTimeout(500);
 ok(await p.$('#scrim')&&await p.evaluate(()=>document.querySelector('#scrim>.sheet').style.transform===''),'a short slow pull springs back');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:top+20}]});for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:top+20+i*30}]});await p.waitForTimeout(40)}
 const mid=await p.evaluate(()=>document.querySelector('#scrim>.sheet').style.transform);ok(/translateY\(1[0-9]{2}/.test(mid),'the sheet follows the finger ('+mid+')');
 await shot(p,'phone-light-6-drag');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);
 ok(!(await p.$('#scrim'))&&await p.evaluate(()=>document.activeElement?.matches?.('[data-adv]')),'a long pull closes it and focus goes back to the button');
 await p.click('#advCard [data-adv]');await p.waitForSelector('.advsheet');await p.evaluate(()=>{const s=document.querySelector('#scrim>.sheet');s.scrollTop=200});await p.waitForTimeout(200);
 await drag(top+300,top+600,6,30);await p.waitForTimeout(400);ok(!!(await p.$('#scrim')),'a sheet scrolled down does not close on a downward swipe (it scrolls)');
 await p.evaluate(()=>document.querySelector('#scrim').remove());
 await p.evaluate(()=>{jTab='pray';setView('journal')});await p.waitForTimeout(600);await p.click('#plPray').catch(()=>{});await p.waitForTimeout(200);
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light',now:D(12,7)});await p.click('#advCard [data-adv]');await p.waitForSelector('.advsheet');
 await p.mouse.move(720,200);await p.mouse.down();await p.mouse.move(720,600,{steps:8});await p.mouse.up();await p.waitForTimeout(300);ok(!!(await p.$('#scrim')),'laptop: mouse drags do not close sheets');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);ok(!(await p.$('#scrim')),'laptop: Escape still closes');ok(!errs.length,'no page errors');await ctx.close()}

// 4. prophets' summaries: the words they lean on are in the BSB
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});const S=await p.evaluate(()=>Object.fromEntries('ISA JER LAM EZK HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL'.split(' ').map(k=>[k,BOOKINFO[k][0]])));
 const C=[['ISA','Holy One of Israel','ISA',1,4,'holy one of israel'],['ISA','coming king','ISA',32,1,'a king will reign'],['JER','weeps','JER',9,1,'weep day and night'],['JER','new covenant','JER',31,31,'new covenant'],['LAM','mercies','LAM',3,22,'his mercies never fail'],['EZK','priest','EZK',1,3,'ezekiel the priest'],['EZK','glory leave the temple','EZK',10,18,'moved away from the threshold of the temple'],['EZK','new heart','EZK',36,26,'a new heart'],['EZK',"God's return",'EZK',43,2,'glory of the god of israel coming'],
  ['HOS','unfaithful wife','HOS',1,2,'take a prostitute as your wife'],['JOL','locust','JOL',1,4,'locust'],['JOL','pour out his Spirit','JOL',2,28,'pour out my spirit'],['AMO','shepherd','AMO',1,1,'sheepherders'],['OBA','gloating','OBA',1,12,'gloat'],['JON','great fish','JON',1,17,'great fish'],['JON','angry','JON',4,1,'angry'],['MIC','Bethlehem','MIC',5,2,'bethlehem'],['NAM','Nineveh','NAM',1,1,'nineveh'],['HAB','live by faith','HAB',2,4,'the righteous will live by faith'],['ZEP','singing','ZEP',3,17,'singing'],['HAG','temple','HAG',1,8,'build the house'],['ZEC','donkey','ZEC',9,9,'humble and riding on a donkey'],['MAL','return to me','MAL',3,7,'return to me'],['MAL','messenger','MAL',3,1,'my messenger']];
 const bad=C.filter(([b,w,vb,c,v,ph])=>!S[b].toLowerCase().includes(w.toLowerCase())||!BSBv(vb,c,v).toLowerCase().includes(ph)).map(x=>x.slice(0,2).join(':'));
 ok(!bad.length,"Prophets' summaries: 24 claims each found in their BSB verse "+bad.join(' / '));
 ok(!errs.length,'no page errors');await ctx.close()}

await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
