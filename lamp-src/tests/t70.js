// v55: Verse match (like Quizlet's Match) in Journal > Memorise: six places and six verses, tap the pairs against the clock,
// your verses or 30 well-known ones; memorise steps hide words one by one; accuracy: famous refs and the gospels' book labels
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s70',{recursive:true});
const NOW='2026-11-19T09:00:00+02:00';
const BSB=c=>JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${c}.json`,'utf8'));
const SEED=()=>{const S=window.__mock.store,now=new Date().toISOString();S.set('group/meta',{week:'w7',name:'Thursday group',auto:false,leader:'u_me',at:now});
  S.set('gm/u_me',{joined:'2026-01-01',seen:now});
  S.set('gm/u_a',{joined:'2026-01-02',seen:now,rd:{'2026-11-16':true,'2026-11-17':true,'2026-11-19':true},cz:{u_me:{k:0,at:'2026-11-18T16:00:00Z'},u_b:{k:3,at:now}}});
  S.set('gm/u_b',{joined:'2026-01-03',seen:now,rd:{'2026-11-16':true},cz:{u_me:{k:5,at:'2026-11-19T05:00:00Z'}}});
  S.set('gm/u_c',{joined:'2026-01-04',seen:now,cz:{u_me:{k:2,at:'2026-11-10T06:00:00Z'}}})};
const ST={done:{1:'2026-11-17T08:00:00+02:00'},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(NOW).getTime());
  if(o.block)await ctx.route('**/bib/**',r=>r.abort());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},o.st||ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);



const SV=(k,ref,text)=>({[k]:{ref,text,tr:'BSB',day:null,v:+k.split('.')[2],at:'2026-11-10T08:00:00Z'}});
const ST5={...ST,saved:{...SV('PSA.23.1','Psalm 23:1','The LORD is my shepherd; I shall not want.'),...SV('JHN.11.35','John 11:35','Jesus wept.'),...SV('MAT.5.9','Matthew 5:9','Blessed are the peacemakers, for they will be called sons of God.'),...SV('PHP.4.4','Philippians 4:4','Rejoice in the Lord always. I will say it again: Rejoice!'),...SV('1TH.5.17','1 Thessalonians 5:17','Pray without ceasing.')}};
const toMemo=async p=>{await p.evaluate(()=>{jTab='memo';setView('journal')});await p.waitForTimeout(700)};
const pairs=p=>p.evaluate(async()=>{const T=[...document.querySelectorAll('.vm-tile')].map(b=>({j:b.dataset.j,r:b.classList.contains('vm-r'),t:b.textContent.replace(/^(Place|Verse): /,'')}));
  const deck=await vmDeck(document.querySelector('.vm-h').textContent==='Your verses'?'mine':'fam');
  return T.filter(x=>x.r).map(x=>{const d=deck.find(d=>d.ref===x.t);const v=T.find(y=>!y.r&&y.t===vmSnip(d.text));return [x.j,v&&v.j]})});
const shot=async(p,n)=>{await p.waitForTimeout(350);await p.screenshot({path:`${__dirname}/s70/${n}.png`})};

// 1. accuracy: the 30 well-known verses are the famous ones (key words checked in the BSB), labels match the text
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const F=await p.evaluate(()=>VM_FAM.map(k=>[k,vmRef(k)]));
 const KEY={'JHN.3.16':'so loved the world','PSA.23.1':'my shepherd','GEN.1.1':'In the beginning God created','PRO.3.5':'Trust in the LORD with all your heart','PHP.4.13':'I can do all things through Christ','ROM.8.28':'works all things together for the good','JER.29.11':'I know the plans I have for you','ISA.40.31':'wings like eagles','MAT.11.28':'weary and burdened','JHN.14.6':'the way and the truth and the life','ROM.3.23':'all have sinned','ROM.6.23':'wages of sin is death','EPH.2.8':'by grace you have been saved','2TI.3.16':'God-breathed','HEB.11.1':'faith is the assurance','JOS.1.9':'strong and courageous','PSA.119.105':'lamp to my feet','MAT.28.19':'make disciples of all nations','1CO.13.4':'Love is patient','GAL.5.22':'fruit of the Spirit','PHP.4.6':'Be anxious for nothing','1JN.1.9':'If we confess our sins','JHN.1.1':'the Word was God','ROM.12.2':'renewing of your mind','MIC.6.8':'act justly','LAM.3.22':'His mercies never fail','PSA.46.10':'Be still and know','2CO.5.17':'new creation','MAT.6.33':'seek first the kingdom','ISA.53.5':'pierced for our transgressions'};
 const NM={JHN:'John',PSA:'Psalm',GEN:'Genesis',PRO:'Proverbs',PHP:'Philippians',ROM:'Romans',JER:'Jeremiah',ISA:'Isaiah',MAT:'Matthew',EPH:'Ephesians','2TI':'2 Timothy',HEB:'Hebrews',JOS:'Joshua','1CO':'1 Corinthians',GAL:'Galatians','1JN':'1 John',MIC:'Micah',LAM:'Lamentations','2CO':'2 Corinthians'};
 const bad=[];for(const [k,ref] of F){const [b,c,v]=k.split('.');const t=BSB(b)[c-1]?.[v-1]||'';if(!KEY[k]||!t.includes(KEY[k]))bad.push(k+' lacks '+KEY[k]);if(ref!==`${NM[b]} ${c}:${v}`)bad.push(k+' named '+ref)}
 ok(F.length===30&&new Set(F.map(f=>f[0])).size===30&&!bad.length,'all 30 well-known verses are the right ones and correctly named (BSB) '+bad.join(' / '));
 const sn=await p.evaluate(()=>[vmSnip('A Psalm of David. The LORD is my shepherd; I shall not want.'),vmSnip('one two three four five six seven eight, nine ten'),vmSnip('Jesus wept.')]);
 ok(sn[0]==='The LORD is my shepherd; I shall not want.'&&sn[1]==='one two three four five six seven eight\u2026'&&sn[2]==='Jesus wept.','snippets drop psalm titles and cut long verses after eight words '+JSON.stringify(sn));
 const G=await p.evaluate(()=>['MAT','MRK','LUK','JHN'].map(k=>BOOKINFO[k][3]));
 const GV={'MRK.16':['He has risen!',BSB('MRK')[15][5]],'MRK.8':['Who do you say I am?',BSB('MRK')[7][28]],'JHN.3':['You must be born again',BSB('JHN')[2][6]],'JHN.1':['The Word became flesh',BSB('JHN')[0][13]]};
 const gb=Object.entries(GV).filter(([k,[l,v]])=>{const [b,c]=k.split('.');const L=G[['MAT','MRK','LUK','JHN'].indexOf(b)].find(x=>x[0]===+c);return !L||L[1]!==l||!v.includes(l)});
 ok(!gb.length,'gospel chapter labels that quote the text use the BSB words (Mark 16: He has risen!) '+gb.map(x=>x[0]).join(','));
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 2. no saved verses: the card offers the well-known deck; play it on phone and laptop, light and dark
for(const o of [{w:390,h:844,cs:'light',t:'phone-light'},{w:390,h:844,cs:'dark',t:'phone-dark'},{w:1440,h:900,cs:'light',t:'desk-light'},{w:1440,h:900,cs:'dark',t:'desk-dark'}]){
 const {ctx,p,errs}=await open(o);await toMemo(p);
 const c=await txt(p,'.vm-card');ok(/Verse match/i.test(c)&&/Well-known verses/.test(c)&&!/Your verses/.test(c)&&/Save 4 more verses/.test(c),o.t+': empty Memorise shows Verse match with the well-known deck '+c);
 if(o.t==='phone-light'||o.t==='desk-dark'){await p.$eval('.vm-card',e=>e.scrollIntoView({block:'center'}));await shot(p,o.t+'-1-card')}
 const a0=await axe(p,'.vm-card');ok(!a0.length,o.t+': axe clean on the card '+JSON.stringify(a0));
 await p.click('[data-vm="fam"]');await p.waitForSelector('.vm-tile',{timeout:15000});await p.waitForTimeout(400);
 const n=await p.evaluate(()=>[document.querySelectorAll('.vm-tile.vm-r').length,document.querySelectorAll('.vm-tile.vm-v').length]);
 ok(n[0]===6&&n[1]===6,o.t+': six places and six verses');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),o.t+': nothing spills sideways');
 const clip=await p.evaluate(()=>[...document.querySelectorAll('.vm-tile')].filter(b=>b.scrollHeight>b.clientHeight+2).length);ok(!clip,o.t+': no tile text is cut off');
 await shot(p,o.t+'-2-board');
 const a1=await axe(p,'#vm');ok(!a1.length,o.t+': axe clean on the board '+JSON.stringify(a1));
 const PR=await pairs(p);ok(PR.length===6&&PR.every(x=>x[1]!=null),o.t+': every place has its verse on the board');
 // a wrong pair first
 await p.click(`.vm-tile[data-j="${PR[0][0]}"]`);ok(await p.$eval(`.vm-tile[data-j="${PR[0][0]}"]`,b=>b.getAttribute('aria-pressed'))==='true',o.t+': a tapped tile shows as picked');
 await p.click(`.vm-tile[data-j="${PR[1][1]}"]`);await p.waitForTimeout(120);
 ok(await p.$$eval('.vm-no',x=>x.length)===2&&/One second added/.test(await txt(p,'#vmL')),o.t+': a wrong pair shakes red and says one second was added');
 await p.waitForTimeout(500);
 // two places in a row just swap the pick
 await p.click(`.vm-tile[data-j="${PR[0][0]}"]`);await p.click(`.vm-tile[data-j="${PR[1][0]}"]`);
 ok(await p.$$eval('.vm-tile[aria-pressed="true"]',x=>x.length)===1,o.t+': tapping another place moves the pick');
 await p.click(`.vm-tile[data-j="${PR[1][1]}"]`);await p.waitForTimeout(500);
 ok(await p.$$eval('.vm-tile.vm-gone',x=>x.length)===2&&/5 pairs to go/.test(await txt(p,'#vmS')),o.t+': a right pair clears away');
 for(const [r,v] of PR.filter((_,i)=>i!==1)){await p.click(`.vm-tile[data-j="${r}"]`);await p.click(`.vm-tile[data-j="${v}"]`);await p.waitForTimeout(80)}
 await p.waitForSelector('.vm-res',{timeout:5000});await p.waitForTimeout(300);
 const res=await txt(p,'#vm');const t=await p.evaluate(()=>parseFloat(document.querySelector('.vm-big').textContent));
 ok(t>=1&&/includes 1 second for wrong pairs/.test(res)&&/first time/.test(res),o.t+': the result shows the time with the penalty ('+t+' s)');
 ok(Math.abs(await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-vm')).fam)-t)<0.05,o.t+': best time kept on this device');
 ok((await p.$$('.vm-list li')).length===6&&(await p.$$('[data-vms]')).length===6,o.t+': all six verses listed in full, each can be saved');
 await shot(p,o.t+'-3-result');
 const a2=await axe(p,'#vm');ok(!a2.length,o.t+': axe clean on the result '+JSON.stringify(a2));
 const k=await p.$eval('[data-vms]',b=>b.dataset.vms);await p.click(`[data-vms="${k}"]`);await p.waitForTimeout(300);
 const sv=await p.evaluate(k=>state.saved[k],k);ok(sv&&sv.text.length>10&&sv.tr==='BSB'&&!(await p.$(`[data-vms="${k}"]`)),o.t+': Save to memorise keeps it ('+k+')');
 await p.click('#vmDone');await p.waitForTimeout(700);
 ok(!(await p.$('#vm'))&&(await p.$$('.memo-pick button')).length===1,o.t+': Done closes and the saved verse is ready in Memorise');
 ok(new RegExp('best '+t.toFixed(1)+' s').test(await txt(p,'.vm-card')),o.t+': the card shows the best time');
 ok(!errs.length,o.t+': no errors '+errs.join(' / '));await ctx.close()}

// 3. with saved verses: Your verses deck, played with the keyboard; Read opens the passage
{const {ctx,p,errs}=await open({w:1440,h:900,cs:'light',st:ST5});await toMemo(p);
 const c=await txt(p,'.vm-card');ok(/Your verses/.test(c)&&/Well-known verses/.test(c)&&!/Save \d more/.test(c),'with five saved verses both decks are offered');
 ok(await p.$eval('[data-vm="mine"]',b=>b.classList.contains('primary')),'Your verses is the main button');
 await p.focus('[data-vm="mine"]');await p.keyboard.press('Enter');await p.waitForSelector('.vm-tile',{timeout:15000});await p.waitForTimeout(400);
 ok((await p.$$('.vm-tile')).length===10,'five saved verses make five pairs');
 const PR=await pairs(p);for(const [r,v] of PR){await p.focus(`.vm-tile[data-j="${r}"]`);await p.keyboard.press('Enter');await p.focus(`.vm-tile[data-j="${v}"]`);await p.keyboard.press('Space');await p.waitForTimeout(60)}
 await p.waitForSelector('.vm-res',{timeout:5000});const r=await txt(p,'#vm');ok(/No wrong pairs/.test(r)&&!(await p.$('[data-vms]')),'keyboard play finishes; own verses have no Save button');
 ok(await p.evaluate(()=>document.activeElement.id)==='vmDone','focus lands on Done');
 await p.click('[data-vmr]');await p.waitForTimeout(1200);ok(!(await p.$('#vm'))&&!!(await p.$('.reader')),'Read opens the passage');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 4. offline the first time: a clear message
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',block:1});await toMemo(p);
 await p.click('[data-vm="fam"]');await p.waitForTimeout(1200);
 ok(!(await p.$('#vm'))&&/need a signal/.test(await txt(p,'#toast')),'offline: a toast explains, no empty game');
 await ctx.close()}

// 5. feel: memorise steps tuck the words away one by one (motion on), and not at all with reduced motion
for(const rm of ['no-preference','reduce']){const {ctx,p,errs}=await open({w:390,h:844,cs:'light',st:ST5,rm});await toMemo(p);
 await p.evaluate(()=>{memoKey='MAT.5.9';render()});await p.waitForTimeout(300);
 await p.click('#mNext');await p.waitForTimeout(60);
 const a=await p.evaluate(()=>[...document.querySelectorAll('#memoBody .mw')].map(b=>b.getAnimations().length?b.getAnimations()[0].effect.getTiming().delay:-1));
 if(rm==='reduce')ok(a.length>0&&a.every(d=>d===-1),'reduced motion: words hide at once');
 else ok(a.length>2&&a.every(d=>d>=0)&&a[a.length-1]>a[0],'motion on: hidden words tuck away one after another '+a.join(','));
 if(rm!=='reduce'){await shot(p,'memo-step2');
   await p.click('#memoBody .mw');ok(await p.$eval('#memoBody .mw.shown',b=>b.disabled),'a peeked word opens and stays open');
   await p.click('#mNext');await p.click('#mNext');await p.waitForTimeout(500);await p.click('#mShow');await p.waitForTimeout(80);
   ok(await p.evaluate(()=>document.querySelectorAll('#memoBody .mrv').length===12&&document.querySelector('#memoBody').innerText.includes('Blessed are the peacemakers')),'Show me brings the verse back word by word');}
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

console.log(log.join('\n'));console.log(fails?`FAILED ${fails}`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
