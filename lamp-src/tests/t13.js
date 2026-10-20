const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const fs=require('fs');fs.mkdirSync('s8',{recursive:true});
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs});await ctx.addInitScript(()=>localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}})));
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('requestfailed',r=>errs.push('fail '+r.url()));p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});
const log=[];
await p.goto(base);await p.waitForTimeout(2000);
// reader for plan day, then who's who
await p.click('#openReader');await p.waitForTimeout(1800);
await p.evaluate(()=>document.querySelector('#rEnd').scrollIntoView());await p.waitForTimeout(800);
log.push('who:'+await p.evaluate(()=>document.querySelectorAll('#rWho .chip').length));
await p.screenshot({path:`s8/end-${w}.png`});
await p.click('#rWho .chip');await p.waitForTimeout(800);await p.screenshot({path:`s8/person-${w}.png`});
const fam=await p.$('.pcard .fam button');if(fam){await fam.click();await p.waitForTimeout(600);log.push('fam:'+await p.textContent('.pcard h2'))}
await p.keyboard.press('Escape');await p.waitForTimeout(300);
const plc=await p.$('#rWho .chip.pl');if(plc){await plc.click();await p.waitForTimeout(700);await p.screenshot({path:`s8/place-${w}.png`});await p.keyboard.press('Escape')}
// links
await p.evaluate(()=>{document.querySelector('#rScroll').scrollTop=0});await p.click('#scr .v[data-vn="3"]');await p.waitForTimeout(400);await p.screenshot({path:`s8/vbar-${w}.png`});
await p.click('#vLinks');await p.waitForTimeout(2000);await p.screenshot({path:`s8/links-${w}.png`});
log.push('links:'+await p.evaluate(()=>document.querySelectorAll('#xl button').length));
await p.click('#xl button');await p.waitForTimeout(1500);
log.push('after link:'+await p.textContent('.rbar .rt')+' back='+await p.evaluate(()=>!!document.querySelector('#rBack'))+' tr='+await p.evaluate(()=>R.tr));
await p.screenshot({path:`s8/jumped-${w}.png`});
// translation switch
await p.click('#rFont');await p.waitForTimeout(400);await p.screenshot({path:`s8/aa-${w}.png`});
await p.click('[data-rt="KJV"]');await p.waitForTimeout(1200);log.push('kjv:'+await p.evaluate(()=>R.tr+' '+document.querySelector('#scr .v').textContent.slice(0,40)));
await p.click('#rBack');await p.waitForTimeout(1200);log.push('back:'+await p.textContent('.rbar .rt')+' '+await p.evaluate(()=>R.tr));
// next chapter
await p.evaluate(()=>document.querySelector('#rEnd').scrollIntoView());await p.click('#rNext');await p.waitForTimeout(1200);log.push('next:'+await p.textContent('.rbar .rt'));
await p.keyboard.press('Escape');await p.waitForTimeout(600);
// search browse + reference
await p.keyboard.press('/');await p.waitForTimeout(500);await p.screenshot({path:`s8/search-${w}.png`});
await p.click('#sBrowse');await p.waitForTimeout(400);await p.screenshot({path:`s8/books-${w}.png`});
await p.click('[data-bk="ISA"]');await p.waitForTimeout(400);await p.screenshot({path:`s8/chaps-${w}.png`});
await p.click('[data-ch="53"]');await p.waitForTimeout(1600);log.push('isa:'+await p.textContent('.rbar .rt'));await p.screenshot({path:`s8/isa-${w}.png`});
await p.keyboard.press('Escape');await p.waitForTimeout(600);
await p.keyboard.press('/');await p.waitForTimeout(300);await p.fill('#srchQ','1 john 4:8');await p.waitForTimeout(900);
log.push('ref:'+await p.evaluate(()=>document.querySelector('[data-jump]')?.textContent));
await p.click('[data-jump]');await p.waitForTimeout(1500);log.push('jump:'+await p.textContent('.rbar .rt')+' sel='+await p.evaluate(()=>R.sel));
await p.click('#vSave');await p.waitForTimeout(300);await p.keyboard.press('Escape');await p.waitForTimeout(500);
await p.evaluate(()=>setView('journal'));await p.waitForTimeout(800);
log.push('saved:'+await p.evaluate(()=>JSON.stringify(Object.values(state.saved).filter(Boolean).map(v=>v.ref+'|'+v.tr+'|'+v.text.slice(0,30)))));
log.push('sw:'+await p.evaluate(()=>document.documentElement.scrollWidth));
console.log(w,log.join('\n  '),'\nERR',errs.join('|'));await ctx.close()}
await b.close()})();
