const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';fs.mkdirSync('s10',{recursive:true});
const sizes=process.argv[2]==='quick'?[[390,844,'light']]:[[390,844,'light'],[1440,900,'dark'],[768,1024,'dark']];
for(const [w,h,cs] of sizes){
const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:cs});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{1:new Date().toISOString()},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{const S=window.__mock.store;const now=new Date(Date.now()-3*864e5).toISOString();
  S.set('group/meta',{week:'w7',at:new Date().toISOString(),name:'Thursday group',when:'Thursdays at 7 pm'});
  S.set('gm/u_a',{joined:now,seen:now,ans:{w7:{q0:'That he is close and personal, not distant. Jesus invites us to call him Father.',q2:'Forgive us… is the hardest for me this week.'}},ck:{w7:{read:true,tried:true}},sc:{w7:{match:820,quiz:1240}},pr:{p1:{t:'Please pray for my mom, she has surgery on Friday.',at:now}},votes:{'james':true},tests:{som:{best:9}}});
  S.set('gm/u_b',{joined:now,seen:now,ans:{w7:{q0:'He already knows what we need, so prayer is about relationship.'}},ck:{w7:{read:true}},sc:{w7:{verse:900}},pr:{p2:{t:'Wisdom for a job decision.',at:now,anon:true},p3:{t:'Thank you for healing my back!',at:now,ans:true}},praying:{'u_a:p1':true},ideas:{i1:{t:'Women of the Bible',at:now}},votes:{'u_b:i1':true,'james':true}});
  S.set('gm/u_c',{joined:now,seen:now,ck:{w7:{read:true}},votes:{'parables':true}});
});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
const log=[];const shot=n=>p.screenshot({path:`s10/${n}-${w}.png`});
await p.goto(base);await p.waitForTimeout(1800);
await shot('today');
await p.evaluate(()=>setView('group'));await p.waitForTimeout(1200);await shot('group');
// study
await p.fill('[data-qa="1"]','Because he loves us and wants us to talk with him.');await p.waitForTimeout(1600);
log.push('ans saved: '+await p.evaluate(()=>JSON.stringify(__mock.store.get('gm/u_me')?.ans)));
await p.click('[data-others="0"]');await p.waitForTimeout(400);
await p.click('[data-ck="read"]');await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('.gqs').scrollIntoView());await p.waitForTimeout(300);await shot('study-qs');
// icebreakers
await p.click('.gtabs [data-gt="games"]');await p.waitForTimeout(300);await p.click('[data-gt="ice"]');await p.waitForTimeout(600);await shot('ice');
await p.click('#iceNext');await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector('.wheelcard').scrollIntoView());await p.click('#spin');await p.waitForTimeout(4600);await shot('wheel');
log.push('wheel: '+await p.textContent('#wRes'));
// games
await p.click('[data-gt="games"]');await p.waitForTimeout(600);await shot('games');
await p.click('[data-game="match"]');await p.waitForTimeout(500);await shot('match');
await p.waitForSelector('.mcard');const pairs=await p.evaluate(()=>window.__mp);
for(const [a,c] of pairs){const ids=await p.evaluate(([a,c])=>[...document.querySelectorAll('.mcard')].map((b,i)=>[i,b.querySelector('.mf-front').textContent]).filter(x=>x[1]===a||x[1]===c).map(x=>x[0]),[a,c]);
 for(const i of ids){await p.click(`[data-mi="${i}"]`);await p.waitForTimeout(150)}await p.waitForTimeout(450)}
await p.waitForTimeout(1200);await shot('match-done');log.push('match: '+await p.textContent('.gscore').catch(()=>'none'));
await p.click('#gHome');await p.waitForTimeout(400);
await p.click('[data-game="verse"]');await p.waitForTimeout(1500);await shot('verse');
const words=await p.evaluate(()=>[...document.querySelectorAll('[data-vk]')].sort((a,b)=>a.dataset.vk-b.dataset.vk).map(b=>b.dataset.vk));
for(const k of words){await p.click(`[data-vk="${k}"]`).catch(()=>{});await p.waitForTimeout(60)}
await p.waitForTimeout(1200);log.push('verse: '+await p.textContent('.gscore').catch(()=>'none'));
await p.click('#gHome');await p.waitForTimeout(400);
await p.click('[data-game="quiz"]');await p.waitForTimeout(600);await shot('quiz');
for(let i=0;i<8;i++){const c=await p.evaluate(()=>1);await p.click('[data-qo]').catch(()=>{});await p.waitForTimeout(1800)}
log.push('quiz: '+await p.textContent('.gscore').catch(()=>'none'));
await p.click('#gHome');await p.waitForTimeout(500);
log.push('board: '+await p.evaluate(()=>document.querySelectorAll('#gBoard .brow').length));
// live game: me hosts, u_a & u_b join via store
await p.click('[data-game="live"]');await p.waitForTimeout(500);await p.click('#lvHost');await p.waitForTimeout(500);
await p.evaluate(()=>{const g=__mock.store.get('live/game');__mock.store.set('lv/u_a',{g:g.id,a:{}});__mock.store.set('lv/u_b',{g:g.id,a:{}});__mock.fire()});await p.waitForTimeout(400);await shot('live-lobby');
await p.click('#lvStart');await p.waitForTimeout(600);await shot('live-q');
const L=await p.evaluate(()=>G.live);
await p.evaluate((c)=>{const S=__mock.store;S.set('lv/u_a',{...S.get('lv/u_a'),a:{0:{c,ms:3000}}});S.set('lv/u_b',{...S.get('lv/u_b'),a:{0:{c:(c+1)%4,ms:5000}}});__mock.fire()},L.qs[0][2]);await p.waitForTimeout(300);
await p.click(`[data-lo="${L.qs[0][2]}"]`);await p.waitForTimeout(1800);await shot('live-rev');
for(let i=1;i<L.qs.length;i++){await p.click('#lvNext');await p.waitForTimeout(300);await p.click('#lvRev').catch(()=>{});await p.waitForTimeout(300)}
await p.click('#lvNext');await p.waitForTimeout(900);await shot('live-end');log.push('live end: '+await p.evaluate(()=>G.live.ph+' '+document.querySelectorAll('.pod').length));
await p.click('#gHome');await p.waitForTimeout(400);
// test
await p.click('[data-gt="test"]');await p.waitForTimeout(1200);await shot('test');
await p.click('[data-ts="som"]');await p.waitForTimeout(500);await shot('test-q');
for(let i=0;i<12;i++){await p.click('[data-to="0"]');await p.waitForTimeout(200);if(i===0)await shot('test-why');await p.click('#tNext');await p.waitForTimeout(150)}
await p.waitForTimeout(600);await shot('test-done');log.push('test: '+await p.textContent('.tring span').catch(()=>'none'));
await p.click('[data-tr]');await p.waitForTimeout(1500);log.push('ctx reader: '+await p.textContent('.rbar .rt').catch(()=>'none'));await p.keyboard.press('Escape');await p.waitForTimeout(200);await p.keyboard.press('Escape');await p.waitForTimeout(600);
await p.click('#tHome');await p.waitForTimeout(800);
// prayer
await p.click('[data-gt="prayer"]');await p.waitForTimeout(500);
await p.fill('#prT','Pray for our group to grow closer.');await p.click('#prF button');await p.waitForTimeout(600);
await p.click('[data-pray="u_a:p1"]');await p.waitForTimeout(500);await shot('prayer');
log.push('prayer count: '+await p.evaluate(()=>document.querySelectorAll('.prcard').length));
// topics
await p.click('[data-gt="topics"]');await p.waitForTimeout(500);await p.click('[data-vote="ruth"]');await p.fill('#tpT','Revelation');await p.click('#tpF button');await p.waitForTimeout(500);await shot('topics');
// leader & people
await p.evaluate(()=>scrollTo(0,0));await p.click('#gPeople');await p.waitForTimeout(600);await shot('people');await p.keyboard.press('Escape');
await p.click('#gLead');await p.waitForTimeout(500);await shot('leader');await p.selectOption('#ldWk','w8');await p.click('#ldSave');await p.waitForTimeout(700);
log.push('meta: '+await p.evaluate(()=>JSON.stringify(__mock.store.get('group/meta'))));
await p.click('#gRead');await p.waitForTimeout(1500);await shot('reader-range');log.push('range: '+await p.evaluate(()=>document.querySelectorAll('#scr .v.rng').length));
await p.keyboard.press('Escape');await p.waitForTimeout(500);
log.push('sw: '+await p.evaluate(()=>document.documentElement.scrollWidth));
console.log(w,cs,'\n  '+log.join('\n  '),'\n  ERR',errs.join(' | ')||'none');await ctx.close()}
await b.close()})();
