// v42: say the week's key verse by heart (hidden a step at a time; the group sees who knows it), toasts stay up long enough to read, minor-prophet dates
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
let AXE=null;try{AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8')}catch(e){}
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
fs.mkdirSync(__dirname+'/s57',{recursive:true});
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',when:'Thursdays at 7 pm',at:now});
  for(const id of ['u_a','u_b','u_c'])S.set('gm/'+id,{joined:'2026-01-02',seen:now})};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}))});
  if(o.mock!==false){await ctx.addInitScript(MOCK);await ctx.addInitScript(SEED)}
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
const verse=p=>p.evaluate(()=>{const q=document.querySelector('.hrt-v');const hw=[...q.querySelectorAll('.hw')];return {txt:q.textContent,hidden:hw.length,first:hw.filter(x=>x.textContent.length===1).length,blank:hw.filter(x=>!x.textContent).length,words:q.textContent.split(/\s+/).filter(Boolean).length,lab:document.querySelector('.hrt-lab').textContent,next:document.querySelector('#hrtNext').textContent.trim(),back:!!document.querySelector('#hrtBack')}});
const toStudy=async p=>{await p.evaluate(()=>{setView('group')});await p.waitForTimeout(700);await p.evaluate(()=>{if(G.sub!=='study')gGo('study',document.querySelector('.gtabs [data-gt="study"]'))});await p.waitForTimeout(700)};
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});await toStudy(p);
 // another member already knows it
 await p.evaluate(()=>{G.people.u_a.ck={[WK().id]:{kv:true}};paintStudy()});
 const btn=await p.evaluate(()=>{const b=document.querySelector('#gKvHeart');if(!b)return null;const r=b.getBoundingClientRect();return {t:b.textContent.trim(),h:r.height,whos:document.querySelector('#gw-kv').textContent}});
 ok(btn&&btn.t==='Say it by heart'&&btn.h>=44&&/1 know it by heart/.test(btn.whos),tag+' key verse card offers Say it by heart (44 px) and shows who knows it: '+JSON.stringify(btn));
 if(cs==='light'||w===1440){await p.evaluate(()=>document.querySelector('.gkv').scrollIntoView({block:'center'}));await p.waitForTimeout(250);await p.screenshot({path:`${__dirname}/s57/card-${tag}.png`})}
 await p.click('#gKvHeart');await p.waitForTimeout(900);
 let v=await verse(p);
 ok(v.hidden===0&&/Step 1 of 4/.test(v.lab)&&v.next==='Hide more'&&!v.back&&v.words>5,tag+' step 1: the whole verse to read: '+JSON.stringify(v));
 ok(await p.evaluate(()=>window.LAMP_BUSY()),tag+' silent updates wait while practising');
 const full=v.txt.trim().split(/\s+/);
 await p.click('#hrtNext');await p.waitForTimeout(250);v=await verse(p);
 ok(v.hidden>=Math.floor(full.length/2)-1&&v.hidden<=Math.ceil(full.length/2)&&v.blank===v.hidden&&v.back&&/Step 2 of 4/.test(v.lab),tag+' step 2: every other word is a gap: '+v.hidden+' of '+full.length);
 if(w===390&&cs==='light')await p.screenshot({path:`${__dirname}/s57/step2-${tag}.png`});
 await p.click('#hrtNext');await p.waitForTimeout(250);v=await verse(p);
 ok(v.first===v.hidden&&v.hidden>=full.length-1&&/Step 3 of 4/.test(v.lab),tag+' step 3: only first letters: '+v.txt);
 const lets=await p.evaluate(()=>[...document.querySelectorAll('.hrt-v .hw')].map(x=>x.dataset.hw[0]===x.textContent).every(Boolean));ok(lets,tag+' first letters match the hidden words');
 await p.screenshot({path:`${__dirname}/s57/step3-${tag}.png`});
 await p.click('#hrtNext');await p.waitForTimeout(250);v=await verse(p);
 ok(v.blank===v.hidden&&v.hidden>=full.length-1&&/I can say it/.test(v.next)&&/Step 4 of 4/.test(v.lab),tag+' step 4: all hidden, button says I can say it');
 const punct=await p.evaluate(()=>/[,.;:!?]/.test(document.querySelector('.hrt-v').textContent));ok(punct,tag+' punctuation stays to help the rhythm');
 // peek
 await p.click('.hrt-v .hw >> nth=0');await p.waitForTimeout(150);
 ok(await p.evaluate(()=>{const x=document.querySelector('.hrt-v .hw');return x.classList.contains('peek')&&x.textContent===x.dataset.hw&&x.textContent.length>0}),tag+' tapping a gap shows that word');
 if(w===390&&cs==='light')await p.screenshot({path:`${__dirname}/s57/step4-${tag}.png`});
 // show more, and dots jump
 await p.click('#hrtBack');await p.waitForTimeout(200);ok(/Step 3 of 4/.test((await verse(p)).lab),tag+' Show more steps back');
 await p.click('[data-hl="0"]');await p.waitForTimeout(200);ok(/Step 1 of 4/.test((await verse(p)).lab)&&await p.evaluate(()=>[...document.querySelectorAll('.hrt-dot')].every(d=>d.getBoundingClientRect().height>=44)),tag+' step dots jump and are 44 px');
 await p.click('[data-hl="3"]');await p.waitForTimeout(200);
 if(AXE&&w===390&&cs==='dark'){await p.addScriptTag({content:AXE});const vio=await p.evaluate(async()=>{document.documentElement.lang='en';const x=await axe.run(document.querySelector('#scrim'),{resultTypes:['violations']});return x.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+': '+v.nodes.slice(0,3).map(n=>n.target.join(' ')).join(' | '))});ok(!vio.length,tag+' axe: no serious issues in the sheet '+vio.join(' / '))}
 await p.click('#hrtNext');await p.waitForTimeout(500);
 const d=await p.evaluate(()=>({h:document.querySelector('.hrt-done h3')?.textContent,p:document.querySelector('.hrt-done p')?.textContent,kv:G.people[myKey()].ck?.[WK().id]?.kv,q:gQ?.ck?.[WK().id]?.kv}));
 ok(d.h==='You know it by heart'&&/You and 1 other person/.test(d.p)&&d.kv===true,tag+' I can say it: marked for the group: '+JSON.stringify(d));
 await p.screenshot({path:`${__dirname}/s57/done-${tag}.png`});
 await p.waitForTimeout(900);ok(await p.evaluate(()=>window.__mock.store.get('gm/'+myKey())?.ck?.[WK().id]?.kv===true),tag+' saved to my group record');
 await p.click('#hrtOk');await p.waitForTimeout(500);
 const after=await p.evaluate(()=>({t:document.querySelector('#gKvHeart').textContent.trim(),w:document.querySelector('#gw-kv').textContent,sheet:!!document.querySelector('#scrim')}));
 ok(after.t==='You know it by heart'&&/2 know it by heart/.test(after.w)&&!after.sheet,tag+' card now says so: '+JSON.stringify(after));
 // undo
 await p.click('#gKvHeart');await p.waitForTimeout(800);await p.click('[data-hl="3"]');await p.waitForTimeout(200);await p.click('#hrtNext');await p.waitForTimeout(300);await p.click('#hrtUndo');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>G.people[myKey()].ck[WK().id].kv===false&&/1 know it by heart/.test(document.querySelector('#gw-kv').textContent)&&!document.querySelector('#scrim')),tag+' Undo takes it back');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no sideways scroll');
 ok(!errs.length,tag+' no page errors '+errs.join('|'));await ctx.close()}
// keyboard on a laptop
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light'});await toStudy(p);
 await p.focus('#gKvHeart');await p.keyboard.press('Enter');await p.waitForTimeout(900);
 ok(await p.evaluate(()=>document.activeElement.id==='hrtNext'),'keyboard: focus lands on Hide more');
 for(let i=0;i<3;i++){await p.keyboard.press('Enter');await p.waitForTimeout(200)}
 ok(await p.evaluate(()=>/Step 4/.test(document.querySelector('.hrt-lab').textContent)&&document.activeElement.id==='hrtNext'),'keyboard: Enter steps through to the end');
 await p.keyboard.press('Escape');await p.waitForTimeout(500);ok(await p.evaluate(()=>!document.querySelector('#scrim')),'Escape closes');
 ok(!errs.length,'keyboard: no errors '+errs.join('|'));await ctx.close()}
// not in a group
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',mock:false});await toStudy(p);
 const has=await p.evaluate(()=>!!document.querySelector('#gKvHeart'));
 if(has){await p.click('#gKvHeart');await p.waitForTimeout(900);await p.click('[data-hl="3"]');await p.waitForTimeout(200);await p.click('#hrtNext');await p.waitForTimeout(400);
  ok(/Well done/.test(await p.evaluate(()=>document.querySelector('.hrt-done p')?.textContent||'')),'not in a group: still works, no group wording')}
 else ok(true,'not in a group: study tab not shown');
 ok(!errs.length,'signed out: no errors '+errs.join('|'));await ctx.close()}
// motion on: no errors, words ease in
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference'});await toStudy(p);await p.click('#gKvHeart');await p.waitForTimeout(900);await p.click('#hrtNext');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.hrt-v .hw')).animationName==='hwIn'),'motion on: gaps ease in');ok(!errs.length,'motion: no errors '+errs.join('|'));await ctx.close()}
// toasts and dates
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const t=await p.evaluate(()=>({s:toastMs('Saved'),m:toastMs('Saved. Practise it in Journal → Memorise'),l:toastMs('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one')}));
 ok(t.s===2600&&t.m>2600&&t.m<4000&&t.l===7000,'toasts: short ones 2.6 s, longer ones get time to read, at most 7 s: '+JSON.stringify(t));
 await p.evaluate(()=>toast('This is a longer message that needs a little more time to read'));await p.waitForTimeout(3000);
 ok(await p.evaluate(()=>document.querySelector('#toast').classList.contains('show')),'a long toast is still showing after 3 s');
 const bi=await p.evaluate(()=>({hos:BOOKINFO.HOS[2],amo:BOOKINFO.AMO[2],mic:BOOKINFO.MIC[2],oba:BOOKINFO.OBA[2],hab:BOOKINFO.HAB[2],zep:BOOKINFO.ZEP[2],hag:BOOKINFO.HAG[2],mal:BOOKINFO.MAL[2]}));
 ok(/Jeroboam II/.test(bi.hos)&&/earthquake \(1:1\)/.test(bi.amo)&&/Jotham, Ahaz and Hezekiah \(1:1\)/.test(bi.mic)&&/verses 11 to 14/.test(bi.oba)&&/Chaldeans.*\(1:6\)/.test(bi.hab)&&/640 to 609/.test(bi.zep)&&/second year of King Darius/.test(bi.hag)&&/governor \(1:8\)/.test(bi.mal),'minor-prophet dates cite their verses: '+JSON.stringify(bi));
 ok(!errs.length,'no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
