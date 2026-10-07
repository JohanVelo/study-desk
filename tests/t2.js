const {chromium}=require('playwright');
const SH=__dirname + '/shots/';
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:'light',hasTouch:true});
 const p=await ctx.newPage(); const errs=[];
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_CERT|ERR_TUNNEL|net::/.test(m.text()))errs.push(m.text())});
 // legacy migration seed
 await p.goto('http://localhost:8765/index.html');
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('studydesk.proto.v1',JSON.stringify({v:1,anchor:'2026-10-05',status:{'psy-3-2-3':3,'psy-1-1-1':5},attempts:{'psy-4-2-2':{a:10,c:4}},mistakes:{},tasks:[],recent:[],changes:[],seq:0}));});
 await p.reload(); await p.waitForTimeout(1500);
 const mig=await p.evaluate(()=>({conf:S.status['psy/research-methods/variables/confounding-variables'],emp:S.status['psy/psychology-as-a-science/what-makes-psychology-scientific/empiricism'],legacyGone:localStorage.getItem('studydesk.proto.v1')===null,tasks:S.tasks.length,issues:dataIssues}));
 console.log('migration',JSON.stringify(mig));
 await p.evaluate(()=>{localStorage.clear()}); await p.reload(); await p.waitForTimeout(1600);
 await p.screenshot({path:SH+'today.png',fullPage:true});
 console.log('sw', await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!r}));
 console.log('scrollW', await p.evaluate(()=>document.documentElement.scrollWidth));
 // toggle + miss + undo
 await p.click('.task [data-action=toggle] >> nth=1'); await p.waitForTimeout(1200);
 const before=await p.evaluate(()=>tasksOn(todayKey()).length);
 await p.click('.task [data-action=miss] >> nth=0'); await p.waitForTimeout(1200);
 const after=await p.evaluate(()=>tasksOn(todayKey()).length);
 await p.screenshot({path:SH+'after-miss.png'});
 await p.click('.toast-act'); await p.waitForTimeout(900);
 console.log('miss',before,after,'undo->',await p.evaluate(()=>tasksOn(todayKey()).length));
 // drill down
 await p.click('#tabs .tab >> nth=1'); await p.waitForTimeout(900);
 await p.click('.exam >> nth=0'); await p.waitForTimeout(900);
 await p.click('.chapter >> nth=2'); await p.waitForTimeout(900);
 await p.click('.sub >> nth=4'); await p.waitForTimeout(900);
 await p.screenshot({path:SH+'topic.png',fullPage:true});
 await p.click('[data-action=step]'); await p.waitForTimeout(900);
 console.log('crumbs', await p.evaluate(()=>document.querySelector('.crumbs').innerText.replace(/\n/g,' ')));
 await p.click('[data-action=dunno]'); await p.waitForTimeout(800);
 await p.click('.mode >> nth=2'); await p.waitForTimeout(400); await p.screenshot({path:SH+'sheet.png'});
 // drag to close
 const box=await p.locator('.sheet-head').boundingBox();
 await p.mouse.move(box.x+30,box.y+10); await p.mouse.down(); await p.mouse.move(box.x+30,box.y+250,{steps:8}); await p.mouse.up(); await p.waitForTimeout(700);
 console.log('sheet closed', await p.evaluate(()=>!document.querySelector('.scrim')));
 await p.click('[data-action=practise]'); await p.waitForTimeout(900);
 await p.click('.opt >> nth=2'); await p.waitForTimeout(700); await p.screenshot({path:SH+'practice.png',fullPage:true});
 await p.click('[data-action=nextq]'); await p.waitForTimeout(500);
 // calendar
 await p.evaluate(()=>go('calendar')); await p.waitForTimeout(900);
 await p.click('[data-action=month][data-d="1"]'); await p.waitForTimeout(500); await p.click('[data-action=month][data-d="-1"]'); await p.waitForTimeout(500);
 await p.screenshot({path:SH+'calendar.png',fullPage:true});
 await p.click('#tabs .tab >> nth=4'); await p.waitForTimeout(900); await p.screenshot({path:SH+'progress.png',fullPage:true});
 // settings
 await p.click('.topbar .gear').catch(()=>{}); 
 await p.click('#tabs .tab >> nth=0'); await p.waitForTimeout(700); await p.click('.topbar .gear'); await p.waitForTimeout(900);
 await p.click('.daypick .chip >> nth=5'); await p.waitForTimeout(400); // toggle Sat off
 await p.fill('#bs0','08:00'); await p.dispatchEvent('#bs0','change'); await p.waitForTimeout(400);
 console.log('settings', await p.evaluate(()=>JSON.stringify(S.settings)), 'firstStart', await p.evaluate(()=>{const t=S.tasks.filter(t=>t.date>todayKey()&&!t.done).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start)[0];return t&&fmtT(t.start)}));
 await p.click('[data-action=setopt][data-v=dark]'); await p.waitForTimeout(400);
 await p.screenshot({path:SH+'settings-dark.png',fullPage:true});
 await p.click('[data-action=setopt][data-v=system]');
 // export/import roundtrip
 const txt=await p.evaluate(()=>exportText());
 await p.evaluate(()=>{S.status[leafIds[0]]=0;});
 await p.evaluate(t=>{const e=document.querySelector('#importText');e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}))},txt); await p.click('[data-action=importpaste]'); await p.waitForTimeout(500);
 console.log('import', await p.evaluate(()=>importMsg&&importMsg.text));
 await p.fill('#importText','{"bad":1'); await p.click('[data-action=importpaste]'); await p.waitForTimeout(300);
 console.log('bad import', await p.evaluate(()=>importMsg&&importMsg.text));
 // corrupt storage -> backup restore
 await p.evaluate(()=>{save(true);localStorage.setItem('studydesk.v2.bak',localStorage.getItem('studydesk.v2'));localStorage.setItem('studydesk.v2','{corrupt');});
 await p.reload(); await p.waitForTimeout(1200);
 console.log('restoredFrom', await p.evaluate(()=>restoredFrom), 'banner', await p.evaluate(()=>!!document.querySelector('.banner')));
 // offline
 await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
 console.log('offline render', await p.evaluate(()=>document.querySelector('#heroTitle')?.innerText));
 await ctx.setOffline(false);
 console.log('errors',errs);
 // dark + desktop screenshots
 for (const [w,h,cs,n] of [[390,844,'dark','m-dark'],[1440,900,'light','desk']]){
   const c2=await b.newContext({viewport:{width:w,height:h},colorScheme:cs}); const q=await c2.newPage();
   q.on('pageerror',e=>errs.push('PAGEERR2 '+e.message));
   await q.goto('http://localhost:8765/index.html'); await q.waitForTimeout(2200); await q.screenshot({path:SH+n+'.png',fullPage:true});
   console.log(n,'scrollW',await q.evaluate(()=>document.documentElement.scrollWidth)); await c2.close();
 }
 console.log('errors final',errs);
 await b.close();
})();
