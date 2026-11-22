// v59: Keep a copy of your journal (one page to save, print or send), Android home-screen shortcuts and #read;
// accuracy: History books labels (Joshua to Esther)
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s74',{recursive:true});
const NOW='2026-11-22T09:00:00+02:00';
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
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base+(o.hash||''));await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);





const shot=async(p,n)=>{await p.waitForTimeout(350);await p.screenshot({path:`${__dirname}/s74/${n}.png`})};
const BAD='<img src=x onerror="window.__xss=1">';
const STJ={...ST,
 notes:{1:{what:'God made everything good.',shows:'He is a maker who delights.',stands:'Line one\nLine two',at:'2026-11-17T08:30:00+02:00'}},
 qt:{'2026-11-18':{word:'Still',note:'Breathe first.',ref:'Psalm 46:10',at:'2026-11-18T06:00:00+02:00'}},
 vn:{'PSA.23.1':{ref:'Psalm 23:1',t:'Not alone. '+BAD,q:'The LORD is my shepherd; I shall not want.',at:'2026-11-15T19:00:00Z',u:'2026-11-15T19:00:00Z'}},
 saved:{'JHN.3.16':{ref:'John 3:16',text:'For God so loved the world…',tr:'BSB',at:'2026-11-10T10:00:00Z'}},
 sn:{s1:{d:'2026-11-16',ref:'Luke 15',t:'The lost son',who:'Pastor Ben',body:'The father runs.',act:'Call my brother',at:'2026-11-16T10:00:00Z',u:'2026-11-16T10:00:00Z'}},
 pl:{q1:{t:'Peace for my exams',at:'2026-08-05T08:00:00Z',u:'2026-08-05T08:00:00Z'},q2:{t:'A job for Sam',at:'2026-01-03T08:00:00Z',ans:'2026-11-12T08:00:00Z',an:'He starts Monday',u:'2026-11-12T08:00:00Z'}},
 ex:{'2026-11-20':{q0:'Sunshine',q3:'Courage',at:'2026-11-20T20:00:00+02:00'}}};

// 1. accuracy: History labels
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const BI=await p.evaluate(()=>Object.fromEntries('JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST'.split(' ').map(k=>[k,BOOKINFO[k]])));
 const Q={'JOS.1':['Be strong and courageous','be strong and courageous'],'JOS.24':['As for me and my house','as for me and my house'],'JDG.21':['Everyone did what was right in his own eyes','everyone did what was right in his own eyes'],'RUT.1':['Wherever you go, I will go','wherever you go, i will go'],
   '1SA.17':['David and Goliath','goliath'],'1KI.19':['A still, small voice','a still, small voice'],'2CH.7':['If my people humble themselves','my people who are called by my name humble themselves'],'EST.4':['For such a time as this','for such a time as this'],'NEH.6':['The wall finished','completed in fifty-two days']};
 const bad=[];for(const [k,[l,ph]] of Object.entries(Q)){const [b,c]=k.split('.');const L=BI[b][3].find(x=>x[0]===+c);if(!L||L[1]!==l)bad.push(k+' label '+(L&&L[1]));if(!BSB(b)[c-1].join(' ').toLowerCase().replace(/’/g,"'").includes(ph))bad.push(k+' text lacks '+ph)}
 ok(!bad.length,'History: 9 chapter labels match the BSB text of their chapter '+bad.join(' / '));
 ok(/52 days/.test(BI.NEH[0])&&BSB('NEH')[5][14].includes('fifty-two days'),'Nehemiah: 52 days, like 6:15');
 ok(/King David's grandfather/.test(BI.RUT[0])&&/father of Jesse, the father of David/.test(BSB('RUT')[3][16]),'Ruth: Obed is David\'s grandfather, like 4:17');
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 2. Keep a copy, 4 sizes
for(const [w,h,cs] of [[390,844,'light'],[390,844,'dark'],[1440,900,'light'],[1440,900,'dark']]){const tag=`${w}-${cs}`,dev=w<800?'phone':'desk';
 const {ctx,p,errs}=await open({w,h,cs,st:STJ});
 await p.evaluate(()=>setView('journal'));await p.waitForTimeout(700);
 const hb=await p.evaluate(()=>{const b=document.querySelector('.jhead [data-jx]'),h=document.querySelector('.jhead h1');if(!b)return null;const r=b.getBoundingClientRect(),q=h.getBoundingClientRect();return {t:b.textContent,h:r.height,overlap:!(r.right<=q.left||r.left>=q.right||r.bottom<=q.top||r.top>=q.bottom)}});
 ok(hb&&/Keep a copy/.test(hb.t)&&hb.h>=44&&!hb.overlap,tag+' Journal title has Keep a copy, 44 px, not over the title '+JSON.stringify(hb));
 if(w===390&&cs==='light')await shot(p,'phone-light-0-journal');
 await p.click('.jhead [data-jx]');await p.waitForSelector('#jxSave');
 const k=await p.evaluate(()=>[...document.querySelectorAll('[data-jxk]')].map(b=>b.dataset.jxk+':'+b.querySelector('b').textContent+':'+b.getAttribute('aria-pressed')));
 ok(k.join()==='notes:1:true,qt:1:true,vn:1:true,saved:1:true,sn:1:true,pl:2:true,ex:1:true',tag+' 7 kinds with counts, all ticked '+k.join());
 ok(/8 entries/.test(await txt(p,'.jx-n')),tag+' says 8 entries');
 await shot(p,`${dev}-${cs}-1-sheet`);
 const ax=await axe(p,'#jx');ok(!ax.length,tag+' axe: sheet '+ax);
 if(w===390&&cs==='light'){
  await p.click('[data-jxk="pl"]');ok(/6 entries/.test(await txt(p,'.jx-n'))&&(await p.$eval('[data-jxk="pl"]',b=>b.getAttribute('aria-pressed')))==='false',tag+' unticking Prayers takes 2 off');
  ok(await p.evaluate(()=>document.activeElement?.dataset?.jxk==='pl'),tag+' focus stays on the tapped row');
  await p.click('[data-jxr="3"]');await p.click('[data-jxk="pl"]');ok(/6 entries/.test(await txt(p,'.jx-n')),tag+' Last 3 months leaves out the two older prayers '+(await txt(p,'.jx-n')));await p.click('[data-jxk="pl"]');
  for(const x of ['notes','qt','vn','saved','sn','ex'])await p.click(`[data-jxk="${x}"]`);
  ok(/Nothing picked/.test(await txt(p,'.jx-n'))&&await p.$eval('#jxSave',b=>b.disabled),tag+' nothing picked: Save is off');
  await shot(p,'phone-light-2-none');
  for(const x of ['notes','qt','vn','saved','sn','ex','pl'])await p.click(`[data-jxk="${x}"]`);await p.click('[data-jxr="all"]');
 }
 const dl=p.waitForEvent('download',{timeout:8000});await p.click('#jxSave');const d=await dl;
 const html=fs.readFileSync(await d.path(),'utf8');
 ok(d.suggestedFilename()==='lamp-journal-2026-11-22.html',tag+' file name '+d.suggestedFilename());
 if(w===390&&cs==='light'){
  ok(/<h1>What I've written<\/h1>/.test(html)&&/Everything so far · 8 entries/.test(html),tag+' page has a cover with the range and count');
  const secs=[...html.matchAll(/<h2>([^<]+) <span>(\d+)<\/span>/g)].map(m=>m[1]+'='+m[2]);
  ok(secs.join()==='Notes on your readings=1,Quiet times=1,Notes on verses=1,Saved verses=1,Sermon notes=1,Prayers=2,Evening Examens=1',tag+' sections '+secs.join());
  ok(!html.includes('<img src=x')&&html.includes('&lt;img src=x'),tag+' what you wrote is shown as text, never run');
  ok(html.includes('Line one<br>Line two'),tag+' line breaks kept');
  ok(html.indexOf('A job for Sam')<html.indexOf('Peace for my exams')&&/Answered 12 November 2026/.test(html)&&html.includes('He starts Monday'),tag+' prayers oldest first, answered one with its answer');
  ok(html.includes('What are you thankful for today?')&&html.includes('Sunshine')&&!html.includes('Is there anything to put right?'),tag+' Examen shows only answered questions');
  ok(/One thing to live out<\/b><p>Call my brother/.test(html)&&html.includes('Luke 15 · Pastor Ben'),tag+' sermon notes in full');
  // the file itself looks right
  const pg=await ctx.newPage();await pg.setContent(html);await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>!window.__xss&&document.querySelectorAll('article').length===8&&document.documentElement.scrollWidth<=390),'the saved page: 8 entries, nothing runs, no sideways scroll');
  await pg.screenshot({path:`${__dirname}/s74/file-phone.png`});await pg.setViewportSize({width:1440,height:900});await pg.screenshot({path:`${__dirname}/s74/file-desk.png`,fullPage:false});
  const ax2=await pg.evaluate(AXE+`;(async()=>{const x=await axe.run(document,{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id)})()`);ok(!ax2.length,'the saved page: axe clean '+ax2);await pg.close();
 }
 await p.waitForTimeout(300);ok(/Journal saved/.test(await txt(p,'#toast')),tag+' toast says it was saved');
 ok(!errs.length,tag+' no page errors '+errs.join(' | '));await ctx.close()}

// 3. empty journal: no button; Settings entry; nothing written yet
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await p.evaluate(()=>setView('journal'));await p.waitForTimeout(600);
 ok(!(await p.$('.jhead [data-jx]')),'empty journal: no Keep a copy button');
 await p.evaluate(()=>{const b=[...document.querySelectorAll('[data-jx]')];return b.length});
 await p.evaluate(()=>openSettings?openSettings():setView('settings'));await p.waitForTimeout(700);
 const sb=await p.$('.field [data-jx]');ok(!!sb,'Settings has Your journal · Keep a copy');
 if(sb){await sb.click();await p.waitForSelector('#jx');ok(/Nothing written yet/.test(await txt(p,'#jx')),'with nothing written it says so')}
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}

// 4. #read opens today's chapter; shortcuts in the installed app's manifest
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',hash:'#read'});await p.waitForTimeout(800);
 const r=await p.evaluate(()=>({open:!!document.querySelector('.reader'),h:location.hash,title:document.querySelector('.reader .rhead')?.innerText.replace(/\n/g,' ')||'',want:refName(PLAN[nextDay()-1])}));
 ok(r.open&&r.h===''&&r.title.toLowerCase().includes(r.want.toLowerCase()),'#read opens the next chapter and clears the address '+JSON.stringify(r));
 ok(!errs.length,'no page errors '+errs.join(' | '));await ctx.close()}
{const m=await (await fetch('http://127.0.0.1:8767/manifest.webmanifest')).json();
 ok(Array.isArray(m.shortcuts)&&m.shortcuts.map(s=>s.url).join()==='./#read,./#pray,./#journal,./#group'&&m.shortcuts.every(s=>s.name&&s.short_name&&s.icons?.length),'installed app: 4 home-screen shortcuts '+JSON.stringify(m.shortcuts?.map(s=>s.short_name)))}

await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
