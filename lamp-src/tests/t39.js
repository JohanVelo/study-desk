// axe-core on the new screens: Today's step (each step open), review, How's Lamp, group Play, reader with bottom bar, settings
const {chromium}=require(process.env.PW);const fs=require('fs');
const AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js',{paths:[__dirname,__dirname+'/axe']}),'utf8');const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
for(const [w,cs] of [[390,'light'],[390,'dark'],[1440,'light'],[1440,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:w<800?844:900},colorScheme:cs,hasTouch:w<800,reducedMotion:'reduce'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Lamp</title>'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html','content-language':'en'}})});
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{if(sessionStorage.k)return;sessionStorage.k=1;const d={};for(let i=1;i<=8;i++)d[i]=new Date(Date.now()-(10-i)*864e5).toISOString();
  localStorage.setItem('lamp-state-v1',JSON.stringify({done:d,notes:{},saved:{"JHN.3.16":{ref:"John 3:16",text:"For God so loved the world.",m:3,s:7,d:5,lr:'2026-10-01',due:'2026-10-08'}},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}));
  const S=window.__mock.store;S.set('group/meta',{week:'w7',name:'Thursday group'});S.set('gm/u_a',{name:'Sarah',joined:'2026-01-01',pr:{p1:{t:'Pray for my exams',at:new Date().toISOString()}}})});
const p=await ctx.newPage();await p.goto(base);await p.waitForTimeout(2500);await p.addScriptTag({content:AXE});
const run=async(name,sel)=>{const r=await p.evaluate(async s=>{document.documentElement.lang='en';const x=await axe.run(s?document.querySelector(s):document,{resultTypes:['violations']});return x.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+': '+v.nodes.slice(0,3).map(n=>n.target.join(' ')).join(' | '))},sel||null);
  ok(!r.length,`${w}-${cs} ${name} ${r.join(' ;; ')}`)};
for(const i of [0,1,2,3]){await p.evaluate(i=>stepOpenAt(i),i);await p.waitForTimeout(200);await run('today step '+(i+1),'#view')}
await p.evaluate(()=>{stepOpenAt(2)});await p.click('#rvShow');await run('review graded','#tstep');
await p.evaluate(()=>{document.querySelector('#tMore').open=true});await run('more about this chapter','.tside');
await p.evaluate(()=>setView('group'));await p.waitForTimeout(800);await p.click('.gtabs [data-gt="games"]');await p.waitForTimeout(400);await run('group play','#view');
await p.evaluate(()=>setView('today'));await p.waitForTimeout(500);await p.evaluate(()=>openReader(curDay(),false));await p.waitForTimeout(2000);await run('reader','.reader');
await p.evaluate(()=>closeReader());await p.evaluate(()=>openSettings());await p.waitForTimeout(500);await run('settings','#scrim');
await ctx.close()}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
