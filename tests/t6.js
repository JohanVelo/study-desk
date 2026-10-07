const {chromium}=require('playwright');
const SH=__dirname + '/shots/v31-';
(async()=>{
 const b=await chromium.launch();
 for (const [w,h,scheme] of [[390,844,'light'],[1440,900,'dark']]) {
 const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme,hasTouch:w<500,acceptDownloads:true});
 const p=await ctx.newPage(); const errs=[];
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_CERT|ERR_TUNNEL|net::/.test(m.text()))errs.push(m.text())});
 await p.goto(`http://localhost:${process.env.SD_PORT||8765}/index.html`); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
 const tag=w+scheme;
 // perf: cold-ish load timing
 const perf=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd)}});
 console.log(tag,'perf',JSON.stringify(perf));
 await p.screenshot({path:SH+tag+'-today.png'});
 // focus timer
 await p.click('.upnext [data-action=focus]'); await p.waitForTimeout(900);
 await p.screenshot({path:SH+tag+'-focus.png'});
 const t1=await p.textContent('#fTime'); await p.waitForTimeout(1300); const t2=await p.textContent('#fTime');
 console.log('timer ticks',t1,'->',t2);
 await p.click('[data-f=pause]'); await p.waitForTimeout(1200); const t3=await p.textContent('#fTime'); await p.waitForTimeout(1100); console.log('paused holds',t3===await p.textContent('#fTime'));
 await p.click('[data-f=pause]'); await p.click('[data-f=min]'); await p.waitForTimeout(600);
 console.log('resume btn',(await p.textContent('.upnext [data-action=focus]')).trim());
 await p.reload(); await p.waitForTimeout(1200); console.log('survives reload',(await p.textContent('.upnext [data-action=focus]')).trim());
 // fast-forward to end
 await p.evaluate(()=>{F.end=Date.now()+1200;focusSave();}); await p.click('.upnext [data-action=focus]'); await p.waitForTimeout(2200);
 console.log('done state',await p.textContent('#fState'));
 const before=await p.evaluate(()=>tasksOn(todayKey()).filter(x=>x.done).length);
 await p.click('[data-f=finish]'); await p.waitForTimeout(1500);
 console.log('finish marks done',before,'->',await p.evaluate(()=>tasksOn(todayKey()).filter(x=>x.done).length),'focus cleared',await p.evaluate(()=>F===null&&!localStorage.getItem('studydesk.focus')));
 // search
 await p.click('[data-action=search]'); await p.waitForTimeout(600);
 await p.fill('#srch','vari'); await p.waitForTimeout(300);
 await p.screenshot({path:SH+tag+'-search.png'});
 console.log('search hits',await p.$$eval('#srchRes .item',x=>x.length));
 await p.fill('#srch','zzzz'); await p.waitForTimeout(200); console.log('no hits msg',await p.textContent('#srchRes'));
 await p.fill('#srch','confound'); await p.waitForTimeout(200); await p.click('#srchRes .item >> nth=0'); await p.waitForTimeout(900);
 console.log('went to',await p.evaluate(()=>stack[stack.length-1]),'sheet gone',!await p.$('.scrim'));
 if (w>500){ await p.keyboard.press('/'); await p.waitForTimeout(500); console.log('slash opens search',!!await p.$('#srch')); await p.keyboard.press('Escape'); await p.waitForTimeout(500);}
 // backup includes notes, restore notes
 await p.evaluate(async()=>{await saveNotes(leafIds[0],'Backup note test about empiricism.');});
 const txt=await p.evaluate(()=>exportText());
 console.log('export has notes',JSON.parse(txt).notes && Object.keys(JSON.parse(txt).notes).length);
 await p.evaluate(async()=>{await saveNotes(leafIds[0],'');});
 await p.evaluate(t=>doImport(t),txt); await p.waitForTimeout(600);
 console.log('notes restored',await p.evaluate(()=>NOTES[leafIds[0]]));
 // backup reminder
 await p.evaluate(()=>{META.first=Date.now()-20*864e5;META.last=0;metaSave();S.contentEdited=true;go('today');}); await p.waitForTimeout(900);
 console.log('backup banner',!!await p.$('[data-action=bak-later]'));
 await p.click('[data-action=bak-later]'); await p.waitForTimeout(500); console.log('snoozed',!await p.$('[data-action=bak-later]'));
 // multi-tab sync
 const p2=await ctx.newPage(); await p2.goto(`http://localhost:${process.env.SD_PORT||8765}/index.html`); await p2.waitForTimeout(1200);
 await p2.evaluate(()=>{S.settings.maxPerDay=4;save(true);}); await p.waitForTimeout(600);
 console.log('tab sync',await p.evaluate(()=>S.settings.maxPerDay)); await p2.close();
 // error net
 await p.evaluate(()=>setTimeout(()=>{throw new Error('boom test')},0)); await p.waitForTimeout(400);
 console.log('error toast',await p.evaluate(()=>document.querySelector('.toast')?.innerText||''));
 console.log(tag,'ERRORS',errs.filter(e=>!/boom test/.test(e)));
 await ctx.close(); }
 await b.close();
})();
