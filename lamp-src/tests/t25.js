const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';fs.mkdirSync(__dirname+'/s12',{recursive:true});
const sizes=process.argv[2]==='quick'?[[390,844,'light']]:[[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark'],[768,1024,'dark']];
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [w,h,cs] of sizes){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs,hasTouch:w<800});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}));localStorage.setItem('lamp-seen',JSON.stringify({study:'2000-01-01',prayer:'2000-01-01'}))});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{const S=window.__mock.store;const now=new Date(Date.now()-3*864e5).toISOString();const d=new Date();const today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const lw=new Date(Date.now()-7*864e5);const last=`${lw.getFullYear()}-${String(lw.getMonth()+1).padStart(2,"0")}-${String(lw.getDate()).padStart(2,"0")}`;
  const days=["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"];
  S.set('group/meta',{week:'w7',name:'Thursday group',when:days[d.getDay()]+' at 7 pm'});
  S.set('gm/u_a',{joined:now,seen:now,ans:{w7:{q0:'That he is close and personal, not distant. Jesus invites us to call him Father.',q2:'Forgive us… is the hardest for me this week.'}},aat:{w7:{q0:now,q2:now}},ck:{w7:{read:true}},pr:{p1:{t:'Please pray for my mom, she has surgery on Friday.',at:now}},here:{[today]:true,[last]:true},re:{'u_b:w7:q0':'💡'}});
  S.set('gm/u_b',{joined:now,seen:now,ans:{w7:{q0:'He already knows what we need, so prayer is about relationship.'}},aat:{w7:{q0:now}},pr:{p2:{t:'Wisdom for a job decision.',at:now,anon:true}},here:{[last]:true}});
  S.set('gm/u_c',{joined:now,seen:now,here:{[today]:true}});
});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
const tag=`${w}-${cs}`;const shot=n=>p.screenshot({path:`${__dirname}/s12/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(1800);
ok(await p.evaluate(()=>!!document.querySelector('#tabBtns [data-v="group"].hasnew,#navBtns [data-v="group"].hasnew')),tag+' group tab shows a new dot');
await shot('today');
await p.click('#gTeaser');await p.waitForTimeout(1300);
ok(await p.evaluate(()=>document.querySelector('[data-gt="study"] .gdot')?.textContent==='3'),tag+' study tab shows 3 new');
ok(await p.evaluate(()=>document.querySelector('[data-gt="prayer"] .gdot')?.textContent==='2'),tag+' prayer tab shows 2 new');
await shot('group');
// check in
ok((await p.textContent('#gHereRow')).includes('2 here today'),tag+' 2 here today');
await p.click('#gHere');await p.waitForTimeout(600);
ok(await p.evaluate(()=>!!__mock.store.get('gm/u_me')?.here),tag+' check-in saved');
ok((await p.textContent('#gHereRow')).includes('3 here today')&&(await p.textContent('#gHereRow')).includes('2 weeks in a row'),tag+' 3 here + streak 2: '+(await p.textContent('#gHereRow')).replace(/\s+/g,' '));
await p.evaluate(()=>scrollTo(0,0));await shot('group-here');
// reactions
await p.click('[data-others="0"]');await p.waitForTimeout(500);
await p.click('#go-0 .oans:first-child [data-e="❤️"]');await p.waitForTimeout(500);
ok(await p.evaluate(()=>Object.values(__mock.store.get('gm/u_me')?.re||{}).includes('❤️')),tag+' reaction saved');
ok(await p.evaluate(()=>document.querySelector('#go-0 .rbtn.on')?.textContent.includes('1')),tag+' reaction shown');
await p.evaluate(()=>document.querySelector('#go-0').scrollIntoView({block:'center'}));await p.waitForTimeout(300);await shot('reacts');
await p.waitForTimeout(2800);
ok(await p.evaluate(()=>!document.querySelector('[data-gt="study"] .gdot')),tag+' study dot clears after looking');
// meeting mode
await p.evaluate(()=>scrollTo(0,0));await p.click('#gMeet');await p.waitForTimeout(700);
ok(await p.evaluate(()=>!!document.querySelector('#meet .qr path')),tag+' meeting QR drawn');
await shot('meet-welcome');
for(let i=0;i<12;i++){const k=await p.evaluate(()=>meetSlides()[M.i][0]);
  if(k==='read'){await p.waitForTimeout(700);ok(await p.evaluate(()=>document.querySelectorAll('.mv').length>3),tag+' passage verses shown')}
  if(k==='q0'){await p.click('#mAns');await p.waitForTimeout(500);ok(await p.evaluate(()=>document.querySelectorAll('.ms-ans article').length===2),tag+' answers shown on q0')}
  await p.waitForTimeout(500);await shot('meet-'+k);
  const fin=await p.evaluate(()=>M.i===meetSlides().length-1);await p.click('#mNext');await p.waitForTimeout(450);if(fin)break}
ok(!(await p.$('#meet')),tag+' meeting closes after Finish');
// overflow check
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),tag+' no sideways scroll');
ok(!errs.length,tag+' no errors '+errs.join(' | '));
await ctx.close();
}
console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS');await b.close();})();
