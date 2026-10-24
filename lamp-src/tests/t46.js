// v32: fixes from the adversarial review stay fixed
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
await ctx.addInitScript(()=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1,exAny:true}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1500);
// Escape closes a puzzle opened from Learn (the Big story tab once shared an id with the story overlay)
await p.evaluate(()=>setView('learn'));await p.waitForTimeout(800);
const t=await p.$('[data-play="word"]');await t.focus();await p.keyboard.press('Enter');await p.waitForTimeout(900);
await p.keyboard.press('Escape');await p.waitForTimeout(700);
ok(!(await p.$('#scrim')),'Escape closes Lamp word on the Learn page');
ok(await p.evaluate(()=>!!document.querySelector('.lsec#story')),'Big story tab is still there');
ok(await p.evaluate(()=>document.activeElement?.dataset?.play==='word'),'focus goes back to the puzzle tile');
// Lamp word: no phantom guess from an earlier opening, nonsense words refused
await p.evaluate(()=>localStorage.removeItem(dKey('word')));
await p.evaluate(()=>openPlay('word'));await p.waitForTimeout(900);await p.keyboard.press('A');await p.keyboard.press('B');await p.click('#shX');await p.waitForTimeout(500);
await p.evaluate(()=>openPlay('word'));await p.waitForTimeout(900);for(const k of 'CDE')await p.keyboard.press(k);await p.keyboard.press('Enter');await p.waitForTimeout(400);
ok(!(await p.evaluate(()=>localStorage.getItem(dKey('word')))),'no phantom guess after reopening');
for(const k of 'AB')await p.keyboard.press('Backspace');for(const k of 'QXZJV')await p.keyboard.press(k);await p.keyboard.press('Enter');await p.waitForTimeout(400);
ok(!(await p.evaluate(()=>localStorage.getItem(dKey('word')))),'QXZJV is not accepted');
ok(/word list/.test(await p.textContent('#toast')),'says the word is not in the list');
await p.click('#shX');await p.waitForTimeout(500);
// Examen: closing straight after typing keeps the words
await p.evaluate(()=>openExamen());await p.waitForTimeout(500);await p.type('#exA','Thankful',{delay:5});await p.click('#shX');await p.waitForTimeout(900);
ok(await p.evaluate(()=>state.ex[hereDay()]?.q0==='Thankful'),'Examen keeps text typed just before closing');
// a verse that does not exist
await p.evaluate(()=>{const s=parseRef('John 3:99');openPassage(passFor(s.b,s.c),false,s.v)});await p.waitForTimeout(1500);
ok(!(await p.$('#vbar')),'John 3:99 does not open a save bar');ok(/no verse 99/.test(await p.textContent('#toast')),'says John 3 has no verse 99');
await p.evaluate(()=>closeTop());await p.waitForTimeout(500);
// dates
ok(await p.evaluate(()=>funDay(new Date(2026,2,30))-funDay(new Date(2026,2,29))===1&&funDay(new Date(2026,9,26))-funDay(new Date(2026,9,25))===1),'puzzle day counts each calendar day once');
ok(await p.evaluate(()=>/@\d{4}-\d\d-\d\d$/.test(rsvpKey())&&new Date(rsvpKey().split('@')[1]+'T12:00').getDay()===1),'RSVP week key is a Monday');
ok(errs.length===0,'no page errors '+errs.join(' | '));
await b.close();console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'all passed');process.exit(fails?1:0)})();
