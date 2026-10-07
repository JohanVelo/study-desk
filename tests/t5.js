const {chromium}=require('playwright');
const SH=__dirname + '/shots/v3-';
const FX=__dirname + '/fixtures/';
const mockTTS=()=>{const spoken=[];window.__spoken=spoken;const fake={speaking:false,pending:false,paused:false,getVoices:()=>[{name:'Test Voice',lang:'en-GB'},{name:'Other',lang:'en-US'}],speak(u){spoken.push(u.text);setTimeout(()=>u.onend&&u.onend(),250)},cancel(){},pause(){},resume(){},onvoiceschanged:null};Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true});window.SpeechSynthesisUtterance=function(t){this.text=t};};
(async()=>{
 const b=await chromium.launch();
 for (const [w,h,scheme] of [[390,844,'light'],[1440,900,'dark']]) {
 const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme,hasTouch:w<500});
 await ctx.addInitScript(mockTTS);
 const p=await ctx.newPage(); const errs=[];
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_CERT|ERR_TUNNEL|net::/.test(m.text()))errs.push(m.text())});
 await p.goto(`http://localhost:${process.env.SD_PORT||8765}/index.html`); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1800);
 const tag=w+scheme;
 await p.screenshot({path:SH+tag+'-today.png',fullPage:true});
 console.log(tag,'scrollW',await p.evaluate(()=>document.documentElement.scrollWidth));
 // Up next: Done
 const left0=await p.evaluate(()=>tasksOn(todayKey()).filter(x=>!x.done).length);
 await p.click('.upnext [data-action=toggle]'); await p.waitForTimeout(1200);
 const left1=await p.evaluate(()=>tasksOn(todayKey()).filter(x=>!x.done).length);
 console.log('done',left0,'->',left1,'log',await p.evaluate(()=>S.log.length));
 // Not today
 await p.click('.upnext [data-action=miss]'); await p.waitForTimeout(1200);
 console.log('miss ->',await p.evaluate(()=>tasksOn(todayKey()).filter(x=>!x.done).length));
 // Listen from up next
 if (await p.$('.upnext [data-action=ep-play]')) { await p.click('.upnext [data-action=ep-play]'); await p.waitForTimeout(800);
   console.log('opened',await p.evaluate(()=>stack[stack.length-1].v),'spoken',await p.evaluate(()=>window.__spoken.length)); await p.click('[data-action=back], .crumbs button >> nth=0').catch(()=>{}); await p.evaluate(()=>go('today')); await p.waitForTimeout(900); console.log('mini player on today',!!await p.$('#player .pl-main')); }
 // week strip
 await p.click('.wd >> nth=3'); await p.waitForTimeout(900); console.log('cal-open view',await p.evaluate(()=>stack[stack.length-1].v));
 // Listen tab
 await p.evaluate(()=>go('listen')); await p.waitForTimeout(1500);
 await p.screenshot({path:SH+tag+'-listen.png',fullPage:true});
 await p.click('.ep.big'); await p.waitForTimeout(1200);
 await p.screenshot({path:SH+tag+'-episode.png',fullPage:true});
 console.log('episode lines',await p.$$eval('.tline',x=>x.length),'cur',await p.$$eval('.tline.cur',x=>x.length));
 await p.click('[data-action=pl-rate][data-r="1.25"]'); await p.click('.tline >> nth=4'); await p.waitForTimeout(300);
 await p.click('#ep-play'); await p.waitForTimeout(200); console.log('paused',await p.evaluate(()=>!P_.playing));
 await p.click('[data-action=pl-stop]'); await p.waitForTimeout(400); console.log('player gone',!await p.$('#player .pl-main'));
 // recordings
 await p.evaluate(()=>go('listen')); await p.waitForTimeout(1200);
 await p.setInputFiles('#rec-file',FX+'Lecture 3.wav'); await p.waitForTimeout(1500);
 console.log('recs',await p.$$eval('.rec',x=>x.length));
 if (await p.$('[data-action=rec-play]')) { await p.click('[data-action=rec-play]'); await p.waitForTimeout(1500); console.log('rec playing',await p.evaluate(()=>RP.el&&!RP.el.paused&&RP.el.currentTime>0));
   await p.click('[data-action=rec-play]'); await p.click('[data-action=rec-more]'); await p.waitForTimeout(700); await p.screenshot({path:SH+tag+'-recsheet.png'});
   const ta=await p.$('.sheet textarea'); if (ta) { await ta.fill('Attachment theory says infants form bonds with caregivers. Secure attachment predicts later wellbeing. Ainsworth used the Strange Situation to classify attachment styles. Insecure attachment comes in avoidant and resistant forms.'); }
   await p.click('[data-action=rec-save]'); await p.waitForTimeout(900); await p.screenshot({path:SH+tag+'-recsum.png'}); console.log('rec summary bullets',await p.$$eval('.sheet .bul li',x=>x.length)); await p.keyboard.press('Escape'); await p.waitForTimeout(600); }
 // topic summary + notes
 const leaf=await p.evaluate(()=>Object.keys(nodes).find(k=>nodes[k].leaf!==false&&!nodes[k].children?.length&&k.startsWith('psy/')));
 await p.evaluate(v=>go('topic:'+v),leaf); await p.waitForTimeout(1200);
 await p.screenshot({path:SH+tag+'-topic.png',fullPage:true});
 if (await p.$('[data-action=notes]')) { await p.click('[data-action=notes]'); await p.waitForTimeout(600); await p.fill('.sheet textarea','My own notes. Validity is about measuring what you claim to measure. Reliability is about consistency over time. Both matter for good research design.'); await p.click('[data-action=notes-save]'); await p.waitForTimeout(800); await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.screenshot({path:SH+tag+'-topic-notes.png',fullPage:true});
   console.log('notes saved',await p.evaluate(id=>!!NOTES[id],leaf)); }
 // subject summary
 await p.evaluate(()=>go('summary:psy')); await p.waitForTimeout(1500);
 await p.screenshot({path:SH+tag+'-summary.png',fullPage:true});
 console.log('summary topics',await p.$$eval('.sumtopic',x=>x.length),'bullets',await p.$$eval('.bul li',x=>x.length));
 // progress / week
 await p.evaluate(()=>go('progress')); await p.waitForTimeout(1800);
 await p.screenshot({path:SH+tag+'-progress.png',fullPage:true});
 console.log('tiles',await p.$$eval('.tile b',x=>x.map(e=>e.textContent).join('|')),'bars',await p.$$eval('.bar',x=>x.length));
 await p.click('.week-hero [data-action=ep-play]'); await p.waitForTimeout(500); console.log('week ep',await p.evaluate(()=>P_.ep&&P_.ep.title));
 // offline reload after SW
 await p.waitForTimeout(800); await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500); console.log('offline ok',!!await p.$('.week-hero, .upnext, .hero'));
 await ctx.setOffline(false);
 for (const v of ['exams','practice','calendar','settings','subject:psy']) { await p.evaluate(v=>go(v),v); await p.waitForTimeout(700); const sw=await p.evaluate(()=>document.documentElement.scrollWidth); if (sw>w) console.log('OVERFLOW',v,sw); }
 console.log(tag,'ERRORS',errs);
 await ctx.close(); }
 await b.close();
})();
