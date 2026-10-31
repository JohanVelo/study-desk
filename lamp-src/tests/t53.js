// v38: group challenge (one shared goal of reading days), numbers count up, Acts "When" fixed
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',when:'Thursdays at 7 pm',at:now});
  for(const id of ['u_a','u_b','u_c'])S.set('gm/'+id,{joined:'2026-01-02',seen:now})};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}));window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null}});
  if(o.mock!==false){await ctx.addInitScript(MOCK);await ctx.addInitScript(SEED)}
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const DAY=n=>`(()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+(${n}));return hereDay(d)})()`;
// started 10 days ago; Sarah read 5 days in it (plus 2 before it started), me 2, Pieter 0
const FILL=goal=>`(()=>{const day=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return hereDay(d)};
  G.meta={...G.meta,ch:{t:'Advent run',goal:${goal},from:day(-10),to:day(9)}};
  G.people.u_a.rd=Object.fromEntries([-12,-11,-9,-6,-3,-1,0].map(n=>[day(n),true]));G.people[myKey()]={...G.people[myKey()],rd:{[day(-2)]:true,[day(0)]:true}};
  setView('group')})()`;
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 await p.evaluate(()=>setView('group'));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!document.querySelector('#gChal')?.children.length),tag+' no challenge: nothing shown');
 // leader starts one
 await p.evaluate(()=>openLeader());await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!!document.querySelector('#scrim #chGo')),tag+' Leader tools offer a challenge');
 if(w===390&&cs==='light'){await p.evaluate(()=>document.querySelector('#scrim .chf').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s53/leader-${tag}.png`})}
 await p.fill('#chGoal','3');await p.click('#chGo');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>/between 5 and 2,000/.test(document.querySelector('#toast').textContent)&&!!document.querySelector('#scrim')),tag+' too small a goal is refused');
 await p.fill('#chGoal','60');await p.evaluate(d=>{const i=document.querySelector('#chTo');i.value=d},await p.evaluate(DAY(70)));await p.click('#chGo');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>/next 60 days/.test(document.querySelector('#toast').textContent)),tag+' end date too far is refused');
 await p.evaluate(d=>{document.querySelector('#chTo').value=d},await p.evaluate(DAY(20)));await p.fill('#chT','Advent run');await p.click('#chGo');await p.waitForTimeout(900);
 const st=await p.evaluate(()=>({ch:window.__mock.store.get('group/meta')?.ch,sheet:!!document.querySelector('#scrim'),card:document.querySelector('#gChal .chal')?.innerText.replace(/\n/g,' | ')}));
 ok(st.ch&&st.ch.goal===60&&st.ch.t==='Advent run'&&st.ch.from===await p.evaluate(()=>hereDay()),tag+' saved for the group: '+JSON.stringify(st.ch));
 ok(!st.sheet&&/Advent run/.test(st.card)&&/0 of 60 reading days/.test(st.card)&&/21 days left/.test(st.card)&&/about 3 a day/.test(st.card),tag+' card appears: '+st.card);
 // progress
 await p.evaluate(FILL(60));await p.waitForTimeout(700);
 const c=await p.evaluate(()=>({t:document.querySelector('#gChal .chal')?.innerText.replace(/\n/g,' | '),v:document.querySelector('#gChal [role=progressbar]').getAttribute('aria-valuenow'),vt:document.querySelector('#gChal [role=progressbar]').getAttribute('aria-valuetext'),w:document.querySelector('#gChal .chal-bar i').style.getPropertyValue('--p')}));
 ok(/7 of 60 reading days/.test(c.t)&&c.v==='7'&&c.w==='11.7%',tag+' counts only days inside the challenge: '+c.t);
 ok(/You've added 2 days/.test(c.t)&&/10 days left/.test(c.t)&&/about 6 a day/.test(c.t),tag+' my share and pace shown');
 ok(c.vt==='7 of 60 reading days',tag+' progress bar is spoken');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 await p.evaluate(()=>document.querySelector('#gChal').scrollIntoView({block:'center'}));await p.waitForTimeout(300);await p.screenshot({path:`${__dirname}/s53/chal-${tag}.png`});
 ok(/Group challenge: 7 of 60 reading days\./.test(await p.evaluate(()=>recapText())),tag+' weekly recap mentions it');
 // done
 await p.evaluate(FILL(7));await p.waitForTimeout(800);
 const d=await p.evaluate(()=>({won:!!document.querySelector('#gChal .chal.won'),t:document.querySelector('#gChal .chal').innerText,flag:Object.keys(localStorage).some(k=>/^lamp-chal-won-/.test(k))}));
 ok(d.won&&/You did it together/.test(d.t)&&/Done/.test(d.t)&&d.flag,tag+' reaching the goal celebrates once');
 await p.evaluate(()=>document.querySelector('#gChal').scrollIntoView({block:'center'}));await p.waitForTimeout(300);await p.screenshot({path:`${__dirname}/s53/won-${tag}.png`});
 // ended / gone
 await p.evaluate(`(()=>{const day=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return hereDay(d)};G.meta={...G.meta,ch:{goal:60,from:day(-20),to:day(-2)}};setView('group')})()`);await p.waitForTimeout(600);
 ok(/It ended on/.test(await p.evaluate(()=>document.querySelector('#gChal').innerText))&&/Together you reached/.test(await p.evaluate(()=>document.querySelector('#gChal').innerText)),tag+' ended: shows the result for a week');
 await p.evaluate(`(()=>{const day=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return hereDay(d)};G.meta={...G.meta,ch:{goal:60,from:day(-30),to:day(-8)}};setView('group')})()`);await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!document.querySelector('#gChal').children.length),tag+' a week after the end it goes away');
 // end it now
 await p.evaluate(FILL(60));await p.waitForTimeout(300);await p.evaluate(()=>openLeader());await p.waitForTimeout(600);
 ok(/Running now: Advent run\. 7 of 60 reading days/.test(await p.evaluate(()=>document.querySelector('#scrim .chf').innerText)),tag+' leader sees it running');
 await p.click('#chEnd');ok(/Tap again/.test(await p.textContent('#chEnd')),tag+' ending asks twice');await p.click('#chEnd');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>window.__mock.store.get('group/meta').ch===null&&!document.querySelector('#gChal').children.length),tag+' ended for everyone');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// signed out of the group: nothing
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',mock:false});await p.evaluate(()=>{G.meta={ch:{goal:10,from:hereDay(),to:hereDay()}};setView('group');openLeader()});await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!document.querySelector('#gChal')?.children.length&&!document.querySelector('#scrim .chf')),'not in a group: no challenge card or field');ok(!errs.length,'signed out: no page errors '+errs.join('|'));await ctx.close()}
// count up with motion on
{const {ctx,p}=await open({w:390,h:844,cs:'light',rm:'no-preference'});await p.evaluate(FILL(60));await p.waitForTimeout(250);
 const mid=+(await p.evaluate(()=>document.querySelector('#gChal .chal-n b').textContent));await p.waitForTimeout(1300);const end=+(await p.evaluate(()=>document.querySelector('#gChal .chal-n b').textContent));
 ok(mid<7&&end===7,'number counts up to 7 (was '+mid+')');
 const t=await p.evaluate(()=>BOOKINFO.ACT[2]);ok(/^Covers about AD 30 to 62; probably written/.test(t),'Acts says what it covers and when it was probably written');await ctx.close()}
console.log(log.join('\n'));await b.close();console.log(fails?'FAILED':'ALL PASS');process.exit(fails?1:0)})();
