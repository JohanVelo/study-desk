const {chromium,devices}=require(process.env.PW);const fs=require('fs');
const FAKE=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
(async()=>{const b=await chromium.launch();fs.mkdirSync('shots',{recursive:true});
const cs=process.argv[2]||'light';
const ctx=await b.newContext({...devices['iPhone 13'],colorScheme:cs});
await ctx.route('**/supabase.js',r=>r.fulfill({body:FAKE,contentType:'application/javascript'}));
await ctx.route('**/index.html',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace('window.LAMP_CONFIG={};','window.LAMP_CONFIG={"url":"https://x.supabase.co","key":"k"};');r.fulfill({response:res,body:t})});
await ctx.addInitScript(()=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
const log=[];const errs=[];
const open=async(n)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(n+': '+e.message));await p.goto('http://127.0.0.1:8767/index.html');await p.waitForTimeout(900);return p};
const A=await open('A');await A.screenshot({path:`shots/gate-join-${cs}.png`});
await A.fill('#gName','JJ');await A.fill('#gEmail','jj@example.com');await A.fill('#gPass','secret1');await A.fill('#gCode','grace7');
await A.click('#gGo');await A.waitForTimeout(2000);
log.push('A in: '+await A.evaluate(()=>LAMP_APP.signedIn+' '+LAMP_APP.name+' gate:'+!!document.querySelector('#gate')));
await A.evaluate(()=>setView('group'));await A.waitForTimeout(800);
log.push('A leader btn: '+!!(await A.$('#gLead'))+' members: '+await A.evaluate(()=>members().length));
await A.evaluate(()=>localStorage.removeItem('lamp-known'));const B=await open('B');
await B.fill('#gName','Sarah');await B.fill('#gEmail','sarah@example.com');await B.fill('#gPass','secret2');await B.fill('#gCode','WRONG');await B.click('#gGo');await B.waitForTimeout(700);
log.push('B wrong code: '+await B.textContent('#gErr'));await B.screenshot({path:`shots/gate-code-${cs}.png`});
await B.fill('#gCode','GRACE7');await B.click('#gGo');await B.waitForTimeout(2000);
log.push('B in: '+await B.evaluate(()=>LAMP_APP.signedIn+' '+LAMP_APP.name));
await B.evaluate(()=>setView('group'));await B.waitForTimeout(800);
log.push('B leader btn: '+!!(await B.$('#gLead')));
// A answers, B sees it
await A.fill('[data-qa="0"]','He is a Father who hears in secret.');await A.waitForTimeout(2500);
await B.waitForTimeout(800);
log.push('B sees JJ answer: '+await B.evaluate(()=>JSON.stringify(G.people[Object.keys(G.people).find(k=>k!==G.id)]?.ans)));
log.push('A members now: '+await A.evaluate(()=>members().length+' '+JSON.stringify(Object.keys(G.prof||{}).length)));
// prayer from B shows on A
await B.click('[data-gt="prayer"]');await B.waitForTimeout(400);await B.fill('#prT','Pray for my exams');await B.click('#prF button');await B.waitForTimeout(1500);
await A.click('[data-gt="prayer"]');await A.waitForTimeout(800);log.push('A prayer cards: '+await A.evaluate(()=>[...document.querySelectorAll('.prcard')].map(c=>c.textContent.slice(0,40)).join(' || ')));
// leader changes week -> B follows
await A.evaluate(()=>scrollTo(0,0));await A.click('#gLead');await A.waitForTimeout(500);
log.push('A code shown: '+await A.textContent('#ldCode').catch(()=>'none'));
await A.evaluate(()=>document.querySelector('#ldMsg').scrollIntoView());await A.screenshot({path:`shots/leader-${cs}.png`});
await A.selectOption('#ldWk','w8');await A.click('#ldSave');await A.waitForTimeout(1500);
log.push('B week: '+await B.evaluate(()=>curWk()+' '+WK().id));
// live quiz: A hosts, B joins
await A.click('[data-gt="games"]');await A.waitForTimeout(400);await A.click('[data-game="live"]');await A.waitForTimeout(400);await A.click('#lvHost');await A.waitForTimeout(1500);
log.push('B sees live: '+await B.evaluate(()=>G.live?.ph));
await B.click('[data-gt="games"]');await B.waitForTimeout(500);await B.screenshot({path:`shots/B-live-banner-${cs}.png`});
await B.click('#liveJoin');await B.waitForTimeout(1200);
log.push('A lobby players: '+await A.evaluate(()=>Object.keys(G.lv).length));
await A.click('#lvStart');await A.waitForTimeout(1500);
log.push('B phase: '+await B.evaluate(()=>G.live?.ph+' q'+G.live?.i));await B.screenshot({path:`shots/B-live-q-${cs}.png`});
// settings account + sign out + sign in
await B.evaluate(()=>openSettings());await B.waitForTimeout(400);await B.screenshot({path:`shots/settings-${cs}.png`});
await B.click('#acOut');await B.click('#acOut2');await B.waitForTimeout(1500);
log.push('B after sign out gate: '+await B.evaluate(()=>document.querySelector('#gate h1')?.textContent));
await B.click('[data-to="signin"]').catch(()=>{});await B.waitForTimeout(400);
await B.fill('#gEmail','sarah@example.com');await B.fill('#gPass','bad');await B.click('#gGo');await B.waitForTimeout(600);log.push('bad pw: '+await B.textContent('#gErr'));
await B.fill('#gPass','secret2');await B.click('#gGo');await B.waitForTimeout(2000);log.push('B back: '+await B.evaluate(()=>LAMP_APP.signedIn+' '+state.settings.onboarded));
// look around without account
const C=await ctx.newPage();await C.addInitScript(()=>sessionStorage.clear());await C.goto('http://127.0.0.1:8767/index.html');await C.waitForTimeout(900);
await C.click('#gPeek');await C.waitForTimeout(1000);await C.evaluate(()=>setView('group'));await C.waitForTimeout(600);await C.screenshot({path:`shots/peek-${cs}.png`});
log.push('peek: signedIn='+await C.evaluate(()=>LAMP_APP.signedIn)+' note='+await C.evaluate(()=>document.querySelector('.gnote')?.textContent.slice(0,60)));
log.push('tabs: '+await A.evaluate(()=>[...document.querySelectorAll('.tabbar button')].map(b=>b.textContent).join(',')));
log.push('sw A '+await A.evaluate(()=>document.documentElement.scrollWidth));
console.log(cs+'\n  '+log.join('\n  ')+'\n  ERR '+(errs.join(' | ')||'none'));await b.close()})();
