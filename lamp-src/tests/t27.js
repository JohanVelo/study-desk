const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';fs.mkdirSync(__dirname+'/s13',{recursive:true});
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
  S.set('gm/u_a',{joined:now,seen:now,ans:{w7:{q0:'That he is close and personal, not distant. Jesus invites us to call him Father.',q2:'Forgive us… is the hardest for me this week.'}},aat:{w7:{q0:now,q2:now}},ck:{w7:{read:true}},pr:{p1:{t:'Please pray for my mom, she has surgery on Friday.',at:now}},here:{[today]:true,[last]:true},re:{'u_b:w7:q0':'💡'},rp:{'u_me:w7:q1':{r1:{t:'Love this, thank you!',at:new Date().toISOString()}}}});
  S.set('gm/u_b',{joined:now,seen:now,ans:{w7:{q0:'He already knows what we need, so prayer is about relationship.'}},aat:{w7:{q0:now}},pr:{p2:{t:'Wisdom for a job decision.',at:now,anon:true}},here:{[last]:true}});
  S.set('gm/u_c',{joined:now,seen:now,here:{[today]:true}});S.set('gm/u_me',{joined:now,seen:now,ans:{w7:{q1:'Because he loves us.'}}});
});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
const tag=`${w}-${cs}`;const shot=n=>p.screenshot({path:`${__dirname}/s13/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(1800);
// verse picture from verse of the day
await p.waitForSelector('#votdPic',{timeout:8000});await p.click('#votdPic');
await p.waitForFunction(()=>document.querySelector('#picImg')?.src?.startsWith('blob:'),null,{timeout:8000});await p.waitForTimeout(300);
ok(true,tag+' votd picture drawn');await shot('pic-night');
await p.click('[data-pst="dawn"]');await p.waitForTimeout(900);await shot('pic-dawn');
await p.click('[data-pst="art"]');await p.waitForTimeout(1500);await shot('pic-art');
const sz=await p.evaluate(()=>picBlob?.size||0);ok(sz>20000&&sz<1500000,tag+' picture png size '+sz);
await p.click('#shX');
// reminders
await p.click('#gear1, #gear2').catch(async()=>{await p.evaluate(()=>openSettings())});await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('#remRead').scrollIntoView({block:'center'}));await shot('settings-rem');
await p.click('#remRead');await p.waitForTimeout(500);await shot('rem-read');
const g=await p.evaluate(()=>gcal(remEvent('read','07:30')));ok(g.includes('RRULE%3AFREQ%3DDAILY')&&g.includes('T073000'),tag+' daily google link');
const ic=await p.evaluate(()=>ics(remEvent('meet')));ok(/RRULE:FREQ=WEEKLY/.test(ic)&&/T190000/.test(ic),tag+' weekly ics at 19:00');
await p.click('#shX');await p.waitForTimeout(200);
// group: replies
await p.click('#gTeaser');await p.waitForTimeout(1300);
ok((await p.textContent('#gm-1')).includes('Love this'),tag+' reply to my answer shown');
ok(await p.evaluate(()=>document.querySelector('[data-gt="study"] .gdot')?.textContent==='4'),tag+' study new count includes reply: '+await p.evaluate(()=>document.querySelector('[data-gt="study"] .gdot')?.textContent));
await p.click('[data-others="0"]');await p.waitForTimeout(400);
await p.click('#go-0 .oans:first-child [data-rpo]');await p.waitForTimeout(300);
await p.fill('#go-0 .oans:first-child .rpin','So true, Sarah.');
// a snapshot arriving while typing must not wipe the text
await p.evaluate(()=>{__mock.store.set('gm/u_c',{...__mock.store.get('gm/u_c'),seen:new Date().toISOString()})});await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.querySelector('#go-0 .rpin')?.value==='So true, Sarah.'),tag+' typing survives live update');
await shot('reply-typing');
await p.press('#go-0 .rpin','Enter');await p.waitForTimeout(800);
ok(await p.evaluate(()=>JSON.stringify(__mock.store.get('gm/u_me').rp||{}).includes('So true')),tag+' reply saved');
ok((await p.textContent('#go-0')).includes('So true'),tag+' reply shown');
await p.evaluate(()=>document.querySelector('#go-0').scrollIntoView({block:'center'}));await p.waitForTimeout(300);await shot('replies');
// prayer encouragement
await p.click('[data-gt="prayer"]');await p.waitForTimeout(600);
await p.click('#prList [data-rpo]');await p.waitForTimeout(300);await p.fill('#prList .rpin','Praying for her tonight.');await p.press('#prList .rpin','Enter');await p.waitForTimeout(700);
ok((await p.textContent('#prList')).includes('Praying for her tonight'),tag+' prayer reply shown');await shot('prayer-replies');
// key verse picture
await p.click('[data-gt="study"]');await p.waitForTimeout(500);await p.click('#gKvPic');await p.waitForFunction(()=>document.querySelector('#picImg')?.src?.startsWith('blob:'),null,{timeout:8000});await p.waitForTimeout(300);await shot('pic-kv');await p.click('#shX');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),tag+' no sideways scroll');
ok(!errs.length,tag+' no errors '+errs.join(' | '));
await ctx.close();
}
console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS');await b.close();})();
