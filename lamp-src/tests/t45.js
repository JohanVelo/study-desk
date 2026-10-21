// v27: always something new: fresh questions never repeat early, six daily puzzles, New today, field scenery
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
await ctx.addInitScript(()=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}}))});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1500);
ok(await p.$('.fieldhero .mdw svg'),'Today shows the field scene');
ok((await p.$$('.fresh .dtile')).length===6,'New today card has 6 daily puzzles');
// fresh questions: two rounds share nothing
const r=await p.evaluate(async()=>{const a=await freshQs(10);markSeen(a.map(q=>q.id));const b=await freshQs(10);markSeen(b.map(q=>q.id));return {a:a.map(q=>q.id),b:b.map(q=>q.id),valid:[...a,...b].every(q=>q.o.length===4&&q.c>=0&&q.c<4&&new Set(q.o).size===4)}});
ok(r.a.length===10&&r.b.length===10,'freshQs gives 10 questions');
ok(r.a.filter(x=>r.b.includes(x)).length===0,'second round repeats none of the first');
ok(r.valid,'every question has 4 different options and one right answer');
// bank checks
const bk=await p.evaluate(async()=>{const F=await loadFun();return {q:F.q.length,who:F.who.length,conn:F.conn.length,w:F.words.every(x=>/^[A-Z]{5}$/.test(x.w)),dup:F.q.every(x=>new Set(x.a).size===4)}});
ok(bk.q>=400&&bk.who>=60&&bk.conn>=40,'question bank is big');ok(bk.w,'daily words are 5 letters');ok(bk.dup,'bank answers are distinct');
// daily puzzles are the same for everyone today and change tomorrow
const d=await p.evaluate(()=>{const f=k=>shufR([1,2,3,4,5,6,7,8,9],rngFor(k)).join();return [f('five-'+funDay()),f('five-'+funDay()),f('five-'+(funDay()+1))]});
ok(d[0]===d[1]&&d[0]!==d[2],'daily seed is stable today and new tomorrow');
// Lamp word: play to the end
await p.evaluate(()=>openPlay('word'));await p.waitForTimeout(800);
const ans=await p.evaluate(async()=>{const F=await loadFun();const o=shufR(F.words,rngFor('words-v1'));return o[funDay()%o.length].w});
for(const k of ans)await p.keyboard.press(k);await p.keyboard.press('Enter');await p.waitForTimeout(1500);
ok(await p.$$eval('.wrow .wg',e=>e.length)===5,'Lamp word: right word turns all green');
ok(await p.$('.fun-end'),'Lamp word: shows the finish with Share');
await p.evaluate(()=>document.querySelector('#scrim')?.remove());
// each other game opens without errors
for(const g of ['five','pic','conn','who','order']){await p.evaluate(g=>openPlay(g),g);await p.waitForTimeout(700);ok(await p.$('#fun .fun-hd'),`${g} opens`);await p.evaluate(()=>document.querySelector('#scrim')?.remove())}
// In order: tap in the right order finishes it
await p.evaluate(()=>openPlay('order'));await p.waitForTimeout(600);
const n=await p.$$eval('[data-ok]',e=>e.length);for(let k=0;k<n;k++){await p.click(`[data-ok="${k}"]`);await p.waitForTimeout(150)}
ok(await p.$('#fun .fun-end'),'In order finishes when tapped in order');await p.evaluate(()=>document.querySelector('#scrim')?.remove());
await p.evaluate(()=>render());await p.waitForTimeout(500);
ok((await p.$$('.fresh .dtile.done')).length===2,'two puzzles show as done');
// church season
const ss=await p.evaluate(()=>[season(new Date(2026,11,10)).k,season(new Date(2026,11,26)).k,season(new Date(2027,2,10)).k,season(new Date(2027,2,25)).k,season(new Date(2027,3,1)).k,season(new Date(2026,6,1)).k]);
ok(ss.join()==='advent,christmas,lent,holyweek,easter,ordinary','church seasons: '+ss.join());
// group quick quiz uses the fresh pool
await p.evaluate(()=>{setView('group');G.sub='games';render();startGame('quiz')});await p.waitForTimeout(2500);
ok(await p.$('#gGame .qcard'),'group quick quiz runs');
await p.evaluate(()=>{setView('learn')});await p.waitForTimeout(800);ok(await p.$('#fresh:not([hidden]) .dtile'),'Learn opens on New today');
ok(!errs.length,'no page errors '+errs.join(' | '));
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'all passed');await b.close();process.exit(fails?1:0)})();
