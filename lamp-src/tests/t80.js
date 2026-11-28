// v65: three more Verse match decks (promises, Psalms, words of Jesus), each ref checked in the BSB
// feel: a matched pair glides together and glows; accuracy: Psalms and Lamentations labels
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s80',{recursive:true});
const NOW='2026-11-23T07:00:00+02:00';
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  S.set('gm/u_me',{joined:'2026-01-01',seen:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,rd:{'2026-11-16':true,'2026-11-17':true,'2026-11-19':true},cz:{u_me:{k:0,at:'2026-11-18T16:00:00Z'},u_b:{k:3,at:now}}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,rd:{'2026-11-16':true},cz:{u_me:{k:5,at:'2026-11-19T05:00:00Z'}}});
  S.set('gm/u_c',{joined:'2026-01-04',seen:now,cz:{u_me:{k:2,at:'2026-11-10T06:00:00Z'}}})};
const ST={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(o.now||NOW).getTime());
  if(o.block)await ctx.route('**/bib/**',r=>r.abort());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base+(o.hash||''));await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);
const shot=async(p,n)=>{await p.waitForTimeout(400);await p.screenshot({path:`${__dirname}/s80/${n}.png`})};
const toMemo=async p=>{await p.evaluate(()=>{jTab='memo';setView('journal')});await p.waitForTimeout(700)};
const pairs=(p,deck)=>p.evaluate(async deck=>{const T=[...document.querySelectorAll('.vm-tile')].map(b=>({j:b.dataset.j,r:b.classList.contains('vm-r'),t:b.textContent.replace(/^(Place|Verse): /,'')}));
  const D=await vmDeck(deck);return T.filter(x=>x.r).map(x=>{const d=D.find(d=>d.ref===x.t);const v=T.find(y=>!y.r&&y.t===vmSnip(d.text));return [x.j,v&&v.j]})},deck);
const solve=async(p,deck)=>{const P=await pairs(p,deck);for(const [a,v] of P){await p.click(`.vm-tile[data-j="${a}"]`);await p.click(`.vm-tile[data-j="${v}"]`);await p.waitForTimeout(80)}return P};
// 1. accuracy
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',seed:()=>{}});
 const D=await p.evaluate(()=>Object.fromEntries(Object.entries(VM_DECKS).map(([k,v])=>[k,[v[0],v[1].map(r=>[r,vmRef(r)])]])));
 const KEY={'ISA.41.10':'I am with you','DEU.31.6':'He will never leave you nor forsake you','JHN.14.27':'My peace I give to you','PHP.4.19':'will supply all your needs','ROM.8.1':'no condemnation','1CO.10.13':'God is faithful','JAS.1.5':'it will be given to him','2CO.12.9':'My grace is sufficient for you','ISA.43.2':'I will be with you','PSA.34.18':'near to the brokenhearted','MAT.7.7':'it will be given to you','JHN.10.28':'they will never perish','1PE.5.7':'He cares for you','REV.21.4':'wipe away every tear','ISA.26.3':'perfect peace',
  'PSA.1.1':'Blessed is the man','PSA.16.11':'the path of life','PSA.19.14':'my Rock and my Redeemer','PSA.27.14':'Wait patiently for the LORD','PSA.34.8':'Taste and see that the LORD is good','PSA.37.4':'the desires of your heart','PSA.51.10':'Create in me a clean heart','PSA.62.8':'Trust in Him at all times','PSA.90.12':'number our days','PSA.91.1':'shelter of the Most High','PSA.100.4':'Enter His gates with thanksgiving','PSA.103.2':'Bless the LORD, O my soul','PSA.118.24':'This is the day that the LORD has made','PSA.121.2':'My help comes from the LORD','PSA.139.14':'fearfully and wonderfully made','PSA.150.6':'Let everything that has breath praise the LORD',
  'MAT.5.9':'Blessed are the peacemakers','MAT.5.44':'love your enemies','MAT.6.21':'where your treasure is','MAT.7.12':'do to others as you would have them do to you','MAT.22.39':'Love your neighbor as yourself','MAT.16.24':'take up his cross','MRK.10.45':'to serve, and to give His life','LUK.19.10':'to seek and to save the lost','JHN.10.10':'I have come that they may have life','JHN.10.11':'I am the good shepherd','JHN.11.25':'I am the resurrection and the life','JHN.13.34':'Love one another','JHN.15.5':'I am the vine','JHN.16.33':'I have overcome the world'};
 const NM={ISA:'Isaiah',DEU:'Deuteronomy',JHN:'John',PHP:'Philippians',ROM:'Romans','1CO':'1 Corinthians',JAS:'James','2CO':'2 Corinthians',PSA:'Psalm',MAT:'Matthew','1PE':'1 Peter',REV:'Revelation',MRK:'Mark',LUK:'Luke'};
 const all=[];for(const k of ['prom','psa','jes']){const [t,L]=D[k];const bad=[];for(const [r,ref] of L){const [b,c,v]=r.split('.');const tx=BSB(b)[c-1]?.[v-1]||'';if(!KEY[r]||!tx.includes(KEY[r]))bad.push(r+' lacks '+KEY[r]);if(ref!==`${NM[b]} ${c}:${v}`)bad.push(r+' named '+ref);if(/^(A Psalm|For the choirmaster|Of David|A song)/i.test(tx))bad.push(r+' has a psalm title');all.push(r)}
  ok(L.length>=12&&!bad.length,`${t}: ${L.length} verses, each says what it should in the BSB `+bad.join(' / '))}
 const fam=D.fam[1].map(x=>x[0]);ok(new Set(all).size===all.length&&!all.some(r=>fam.includes(r)),'no verse is in two decks');
 ok(D.jes[1].every(([r])=>{const [b,c,v]=r.split('.');return ['MAT','MRK','LUK','JHN'].includes(b)}),'words of Jesus all come from the Gospels');
 const sn=await p.evaluate(()=>Object.values(VM_DECKS).flatMap(d=>d[1]).length);ok(sn===75,'75 verses in the four decks: '+sn);
 const L=await p.evaluate(()=>({PSA:BOOKINFO.PSA[3],LAM:BOOKINFO.LAM[3]}));const V=(b,c,v)=>BSB(b)[c-1][v-1];
 const lb=[['PSA',23,'The LORD is my shepherd',V('PSA',23,1)],['PSA',51,'Have mercy on me',V('PSA',51,1)],['PSA',103,'Bless the LORD',V('PSA',103,1)],['PSA',139,'You have searched me',V('PSA',139,1)],['LAM',1,'How lonely lies the city',V('LAM',1,1)],['LAM',3,'New every morning',V('LAM',3,23)]];
 for(const [b,c,l,v] of lb){const x=L[b].find(y=>y[0]===c);ok(x&&x[1]===l&&v.toLowerCase().includes(l.toLowerCase()),`${b} ${c} label "${l}" is in the BSB text`)}
 ok(/Moses \(Psalm 90\)/.test(await p.evaluate(()=>BOOKINFO.PSA[2]))&&/Moses/.test(V('PSA',90,1))&&/Babylon/.test(V('PSA',137,1)),'Psalms dates: Psalm 90 is a prayer of Moses, Psalm 137 by the rivers of Babylon');
 ok(['Asaph','sons of Korah','Solomon'].every(n=>[V('PSA',50,1),V('PSA',42,1),V('PSA',72,1),V('PSA',127,1)].some(t=>t.includes(n))),'Psalms authors named in their titles (Asaph 50, sons of Korah 42, Solomon 72 and 127)');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}
// 2. the card and each deck, phone and laptop, light and dark
for(const o of [{w:390,h:844,cs:'light',t:'phone-light',d:'prom'},{w:390,h:844,cs:'dark',t:'phone-dark',d:'psa'},{w:1440,h:900,cs:'light',t:'desk-light',d:'jes'},{w:1440,h:900,cs:'dark',t:'desk-dark',d:'psa'}]){
 const {ctx,p,errs}=await open({...o,seed:()=>{}});await toMemo(p);
 const c=await txt(p,'.vm-card');ok(/More decks/.test(c)&&/God's promises/.test(c)&&/Psalms/.test(c)&&/Words of Jesus/.test(c),o.t+': card offers three more decks');
 ok(await p.$$eval('.vm-more .btn',x=>x.every(b=>b.getBoundingClientRect().height>=44)),o.t+': deck buttons are 44 px tall');
 ok(!(await axe(p,'.vm-card')).length,o.t+': axe clean on the card');
 await p.$eval('.vm-card',e=>e.scrollIntoView({block:'center'}));await shot(p,o.t+'-1-card');
 await p.click(`[data-vm="${o.d}"]`);await p.waitForSelector('.vm-tile',{timeout:15000});await p.waitForTimeout(300);
 const h=await txt(p,'.vm-h');const T={prom:"God's promises",psa:'Psalms',jes:'Words of Jesus'}[o.d];ok(h===T,o.t+': game titled '+h);
 ok(await p.$$eval('.vm-tile',x=>x.length)===12,o.t+': 12 tiles');
 const refs=await p.$$eval('.vm-tile.vm-r',x=>x.map(e=>e.textContent.replace(/^Place: /,'')));ok(o.d!=='psa'||refs.every(r=>/^Psalm \d+:\d+$/.test(r)),o.t+': psalm places read "Psalm N:V" '+refs.join(', '));
 ok(!(await axe(p,'#vm')).length,o.t+': axe clean in the game');
 const P=await pairs(p,o.d);await p.click(`.vm-tile[data-j="${P[0][0]}"]`);await p.click(`.vm-tile[data-j="${P[0][1]}"]`);await p.waitForTimeout(150);
 if(o.t==='phone-dark'||o.t==='desk-light'){await p.click(`.vm-tile[data-j="${P[1][0]}"]`);await shot(p,o.t+'-2-game')}
 const P2=await pairs(p,o.d);for(const [a,v] of P2.slice(1)){if(!(await p.$(`.vm-tile[data-j="${a}"]:not([disabled])`)))continue;if(await p.$eval(`.vm-tile[data-j="${a}"]`,e=>e.getAttribute('aria-pressed')==='true')){await p.click(`.vm-tile[data-j="${v}"]`)}else{await p.click(`.vm-tile[data-j="${a}"]`);await p.click(`.vm-tile[data-j="${v}"]`)}await p.waitForTimeout(80)}
 await p.waitForSelector('.vm-res',{timeout:5000});const r=await txt(p,'#vm');ok(/all six found/i.test(r)&&r.includes(T),o.t+': finished: '+r.slice(0,80));
 const best=await p.evaluate(d=>JSON.parse(localStorage.getItem('lamp-vm')||'{}')[d],o.d);ok(best>0,o.t+': best time kept for '+o.d+' = '+best);
 ok(await p.$$eval('[data-vms]',x=>x.length)===6,o.t+': every verse can be saved to memorise');
 if(o.d==='prom'){await p.click('[data-vms]');await p.waitForTimeout(300);const n=await p.evaluate(()=>Object.keys(state.saved).length);ok(n===1&&/In your verses/.test(await txt(p,'.vm-list li')),'save to memorise works for a promise')}
 ok(!(await axe(p,'#vm')).length,o.t+': axe clean on the result');if(o.t==='desk-light'||o.t==='phone-light')await shot(p,o.t+'-3-end');
 await p.click('#vmDone');await p.waitForTimeout(600);ok(new RegExp(T+'[ |]+\\d').test(await txt(p,'.vm-more')),o.t+': the deck button shows the best time '+await txt(p,'.vm-more'));
 ok(!errs.length,o.t+': no errors '+errs.join(' / '));await ctx.close()}
// 3. feel: matched tiles glide together with a glow (motion on), nothing extra with reduced motion
for(const rm of ['no-preference','reduce']){const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm,seed:()=>{}});await toMemo(p);await p.click('[data-vm="jes"]');await p.waitForSelector('.vm-tile');await p.waitForTimeout(rm==='reduce'?200:900);
 const P=await pairs(p,'jes');await p.click(`.vm-tile[data-j="${P[0][0]}"]`);await p.click(`.vm-tile[data-j="${P[0][1]}"]`);await p.waitForTimeout(120);
 const g=await p.evaluate(j=>({glow:!!document.querySelector('.vm-glow'),tr:document.querySelector(`.vm-tile[data-j="${j}"]`).getAnimations().map(a=>a.effect.getKeyframes().map(k=>k.transform).join('|')).join(';')}),P[0][0]);
 if(rm==='reduce')ok(!g.glow&&!/translate/.test(g.tr),'reduced motion: the pair just fades');else ok(g.glow&&/translate\(/.test(g.tr),'motion on: the pair glides together with a glow '+g.tr.slice(0,80));
 await p.waitForTimeout(900);ok(!(await p.$('.vm-glow')),rm+': the glow cleans up after itself');
 ok(await p.$eval(`.vm-tile[data-j="${P[0][0]}"]`,e=>e.classList.contains('vm-gone')&&e.disabled),rm+': the matched tile is gone and disabled');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}
// 4. offline first time: a clear message
{const {ctx,p}=await open({w:390,h:844,cs:'light',block:1,seed:()=>{}});await toMemo(p);await p.click('[data-vm="psa"]');await p.waitForTimeout(1500);
 ok(/need a signal/.test(await txt(p,'.toast')||'')&&!(await p.$('#vm')),'offline: says the verses need a signal');await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAIL`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
