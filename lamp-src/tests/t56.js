// v41: search your journal, the reader offers to pick up where you stopped, 4 more hymns
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s56',{recursive:true});
const T=d=>`2026-${d}T08:00:00+02:00`;
const FULL={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},
  notes:{1:{what:'Jesus walks by the Sea of Galilee and calls the fishermen.',stands:'They left their nets at once.',at:T('10-20')},2:{what:'A café in Nazareth? No, a synagogue in Capernaum.',shows:'He teaches with authority.',at:T('10-21')},3:{what:'<img src=x onerror="window.__xss=1"> healing at evening',at:T('10-22')}},
  qt:{'2026-10-25':{ref:'Psalm 46:10',word:'still',note:'Peace came when I stopped rushing.',at:T('10-25')}},
  ex:{'2026-10-26':{q0:'Grateful for Megan and the group',at:T('10-26'),u:T('10-26')}},
  saved:{'MRK.1.17':{ref:'Mark 1:17',text:'“Come, follow Me,” Jesus said, “and I will make you fishers of men.”',tr:'BSB',day:1,v:17,at:T('10-20')}},
  pl:{p1:{t:"Megan's exams next week",at:T('10-24'),u:T('10-24')},p2:{t:'Rain for the farms in the Free State',at:T('10-02'),ans:T('10-28'),u:T('10-28')}},
  settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const EMPTY={done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||FULL);
  await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const res=p=>p.evaluate(()=>({n:document.querySelector('.js-n')?.textContent||'',items:[...document.querySelectorAll('.js-it')].map(x=>x.querySelector('.js-k').textContent+' | '+x.querySelector('b').textContent),marks:[...document.querySelectorAll('.js-it mark')].map(m=>m.textContent),seg:!!document.querySelector('.seg')&&getComputedStyle(document.querySelector('.seg')).display!=='none'}));
const type=async(p,q)=>{await p.fill('#jq',q);await p.waitForTimeout(350)};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});await p.evaluate(()=>setView('journal'));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!!document.querySelector('#jq')&&document.querySelector('#jq').getBoundingClientRect().height>=44),tag+' search box shows, 44 px or taller');
 await type(p,'galilee');let r=await res(p);
 ok(/1 result for “galilee”/.test(r.n)&&r.items.length===1&&/^Note \| Mark 1/.test(r.items[0])&&r.marks.includes('Galilee')&&!r.seg,tag+' a word finds the note, highlighted, tabs hidden: '+JSON.stringify(r));
 if(cs==='light'||w===1440){await p.screenshot({path:`${__dirname}/s56/search-${tag}.png`})}
 await type(p,'fishers');r=await res(p);ok(r.items.length===1&&/^Verse \| Mark 1:17/.test(r.items[0]),tag+' finds a saved verse');
 await type(p,'MEGAN');r=await res(p);ok(r.items.length===2&&r.items.some(x=>/^Prayer/.test(x))&&r.items.some(x=>/^Examen/.test(x)),tag+' any case; finds the prayer and the Examen: '+r.items.join(' / '));
 await type(p,'megan exams');r=await res(p);ok(r.items.length===1&&/^Prayer/.test(r.items[0]),tag+' two words must both match');
 await type(p,'cafe');r=await res(p);ok(r.items.length===1&&r.marks.includes('café'),tag+' accents ignored: cafe finds café');
 await type(p,'peace');r=await res(p);ok(r.items.length===1&&/^Quiet time \| Psalm 46:10/.test(r.items[0]),tag+' finds a quiet-time note');
 await type(p,'rain');r=await res(p);ok(r.items.length===1&&/^Answered prayer \| Answered 28 Oct 2026/.test(r.items[0]),tag+' answered prayers say when: '+r.items[0]);
 await type(p,'img');r=await res(p);ok(r.items.length===1&&await p.evaluate(()=>!document.querySelector('#jRes img')&&!window.__xss),tag+' typed text is shown as text, never run');
 await type(p,'zebra');r=await res(p);ok(/Nothing in your journal matches/.test(r.n)&&!r.items.length,tag+' no match: says so with a tip');
 if(w===390&&cs==='light')await p.screenshot({path:`${__dirname}/s56/nomatch-${tag}.png`});
 // clear button and Escape
 await p.click('#jqX');await p.waitForTimeout(200);r=await res(p);ok(r.seg&&!r.items.length&&await p.evaluate(()=>document.activeElement.id==='jq'),tag+' clear brings the journal back and keeps focus in the box');
 await type(p,'galilee');await p.press('#jq','Escape');await p.waitForTimeout(200);ok((await res(p)).seg&&await p.evaluate(()=>document.querySelector('#jq').value===''),tag+' Escape clears');
 if(w===1440){await p.evaluate(()=>document.activeElement.blur());await p.keyboard.press('/');await p.waitForTimeout(100);ok(await p.evaluate(()=>document.activeElement.id==='jq'),tag+' keyboard: / jumps to the search box')}
 // survives a re-render
 await type(p,'nets');await p.evaluate(()=>render());await p.waitForTimeout(400);r=await res(p);ok(r.items.length===1&&await p.evaluate(()=>document.querySelector('#jq').value==='nets'),tag+' search is kept when the screen redraws');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 // results open the right place
 await type(p,'farms');await p.click('.js-it');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>jTab==='pray'&&!!document.querySelector('[data-pl="p2"]')&&document.querySelector('#jq').value===''),tag+' a prayer result opens the Prayers tab at that prayer');
 await type(p,'fishers');await p.click('.js-it');await p.waitForTimeout(1600);
 ok(await p.evaluate(()=>!!document.querySelector('.reader')&&/Mark 1/.test(document.querySelector('.reader .rt').textContent)&&R.sel===17),tag+' a verse result opens the reader at that verse');
 await p.evaluate(()=>closeReader());await p.waitForTimeout(500);await p.evaluate(()=>setView('journal'));await p.waitForTimeout(400);
 await type(p,'authority');await p.click('.js-it');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>view==='today'&&state.selected===2),tag+' a note result opens that day');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// nearly empty journal: no search box
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:EMPTY});await p.evaluate(()=>setView('journal'));await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!document.querySelector('#jq')),'empty journal: no search box yet');ok(!errs.length,'no errors (empty)');await ctx.close()}
// ---- reader: pick up where you stopped ----
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=w+'-'+cs;const {ctx,p,errs}=await open({w,h,cs});
 await p.evaluate(()=>openReader(1,false));await p.waitForTimeout(1600);
 ok(await p.evaluate(()=>!document.querySelector('#rRes')),tag+' first visit: nothing offered');
 await p.evaluate(()=>{const v=document.querySelector('#scr .v[data-vn="21"]');v.scrollIntoView({block:'start'});document.querySelector('#rScroll').scrollBy(0,-95)});await p.waitForTimeout(900);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-rpos')||'{}')['MRK.1']);
 ok(saved&&saved.v>=19&&saved.v<=22,tag+' scrolling stops: the verse is remembered '+JSON.stringify(saved));
 await p.evaluate(()=>closeReader());await p.waitForTimeout(500);await p.evaluate(()=>openReader(1,false));await p.waitForTimeout(1600);
 const pill=await p.evaluate(()=>{const e=document.querySelector('#rRes');if(!e)return null;const r=e.getBoundingClientRect();return {t:e.innerText,h:document.querySelector('#rResGo').getBoundingClientRect().height,x:r.left>=0&&r.right<=innerWidth,b:r.bottom<=innerHeight,dock:(()=>{const d=document.querySelector('.rdock');if(!d||getComputedStyle(d).display==='none')return true;return r.bottom<=d.getBoundingClientRect().top})()}});
 ok(pill&&new RegExp(`Pick up at verse ${saved&&saved.v}`).test(pill.t)&&pill.h>=44&&pill.x&&pill.b&&pill.dock,tag+' reopening offers to pick up: '+JSON.stringify(pill));
 await p.screenshot({path:`${__dirname}/s56/resume-${tag}.png`});
 await p.click('#rResGo');await p.waitForTimeout(700);
 const pos=await p.evaluate(v=>{const e=document.querySelector(`#scr .v[data-vn="${v}"]`).getBoundingClientRect(),s=document.querySelector('#rScroll').getBoundingClientRect();return {top:Math.round(e.top-s.top),gone:!document.querySelector('#rRes')}},saved.v);
 ok(pos.gone&&pos.top>=-5&&pos.top<200,tag+' tap: jumps to that verse and the offer goes '+JSON.stringify(pos));
 // jump-to-verse opens never show it
 await p.evaluate(()=>closeReader());await p.waitForTimeout(400);await p.evaluate(()=>openReader(1,false,5));await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!document.querySelector('#rRes')),tag+' opening at a chosen verse: no offer');
 // X forgets it
 await p.evaluate(()=>closeReader());await p.waitForTimeout(400);await p.evaluate(()=>{localStorage.setItem('lamp-rpos',JSON.stringify({'MRK.1':{v:30,at:Date.now()}}));openReader(1,false)});await p.waitForTimeout(1500);
 await p.click('#rResX');await p.waitForTimeout(400);ok(await p.evaluate(()=>!document.querySelector('#rRes')&&!JSON.parse(localStorage.getItem('lamp-rpos')||'{}')['MRK.1']),tag+' Start from the top forgets the place');
 // finishing the chapter forgets it too
 await p.evaluate(()=>{localStorage.setItem('lamp-rpos',JSON.stringify({'MRK.1':{v:30,at:Date.now()}}));const s=document.querySelector('#rScroll');s.scrollTop=s.scrollHeight});await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!JSON.parse(localStorage.getItem('lamp-rpos')||'{}')['MRK.1']),tag+' reaching the end forgets the place');
 // old places expire
 await p.evaluate(()=>closeReader());await p.waitForTimeout(400);await p.evaluate(()=>{localStorage.setItem('lamp-rpos',JSON.stringify({'MRK.1':{v:30,at:Date.now()-30*864e5}}));openReader(1,false)});await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!document.querySelector('#rRes')),tag+' a place older than 3 weeks is not offered');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// broken storage
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>{localStorage.setItem('lamp-rpos','[1,2');openReader(1,false)});await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!document.querySelector('#rRes')&&rposAll()&&typeof rposAll()==='object'),'broken saved places are ignored');ok(!errs.length,'no errors (broken storage)');
 // hymns
 const hy=await p.evaluate(()=>({n:HYMNS.length,t:HYMNS.slice(-4).map(h=>h[0]),ok:HYMNS.every(h=>h.length===5&&h[4].every(([r,l])=>/^[1-3A-Z]{3}\.\d+\.\d+$/.test(r)&&l))}));
 ok(hy.n===16&&hy.ok&&['Crown Him with Many Crowns',"All Hail the Power of Jesus' Name",'Just As I Am','O Worship the King'].every(t=>hy.t.includes(t)),'16 hymns, the 4 new ones well formed: '+hy.t.join(', '));
 await p.evaluate(()=>{const i=HYMNS.findIndex(h=>h[0]==='O Worship the King');const real=HYMNS.slice();HYMNS.length=0;HYMNS.push(real[i]);openHymn()});await p.waitForTimeout(500);
 ok(/Ancient of Days/.test(await p.evaluate(()=>document.querySelector('#scrim').innerText)),'a new hymn opens in the Hymn of the week sheet');await p.screenshot({path:`${__dirname}/s56/hymn-390-light.png`});
 await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
