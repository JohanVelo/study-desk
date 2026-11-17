// v54: Find the places, a map quiz on the Abraham and Paul journey maps (six stops, pin by tap or keys, scored by km);
// tab changes move focus to the new screen's heading and set the page title; accuracy: journey-map notes quote the BSB word for word
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('FAIL CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s69',{recursive:true});
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
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},ST);
  await ctx.addInitScript(MOCK);await ctx.addInitScript(o.seed||SEED);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(2000);return {ctx,p,errs}};
const txt=(p,s)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',s);
const axe=(p,sel)=>p.evaluate(AXE+`;(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector(${JSON.stringify(sel)}),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.map(n=>n.target+" "+n.failureSummary.slice(-90)).join(";"))})()`);
const store=(p,k)=>p.evaluate(k=>window.__mock.store.get(k),k);


const NB={'Genesis':'GEN','Acts':'ACT','Romans':'ROM'};
// 1. accuracy: each stop's name is in the chapter its note cites, and every quote in the notes is the BSB's own words
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const M=await p.evaluate(()=>MQ_MAPS.map(id=>[id,FIGS[id].map.stops.map(s=>[s[0],(FIGS[id].notes||{})[s[5]]])]));
 const norm=x=>x.replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').toLowerCase();
 const bad=[],badQ=[];let nq=0;
 for(const [id,stops] of M)for(const [name,n] of stops){
   if(!n||!n[2]||!n[2].length){bad.push(id+' '+name+' has no reference');continue}
   const txt=norm(n[2].map(([l,bk,ch])=>{const B=BSB(bk);const m=l.match(/(\d+)\s*[–-]\s*(\d+)(?!:)/);const last=m&&!l.includes(':')?+m[2]:ch;const out=[];for(let c=ch;c<=last;c++)out.push(B[c-1].join(' '));return out.join(' ')}).join(' '));
   const key=name==='Fair Havens'?'fair havens':name==='Salamis'?'salamis':name.split(' ').pop().toLowerCase();
   if(!txt.includes(key))bad.push(id+' '+name+' not in '+n[2].map(r=>r[0]).join(', '));
   for(const m of n[1].matchAll(/(?:^|[\s:(])'([^']{12,}?)'(?=[\s.,)]|$)/g)){nq++;for(const part of m[1].split('…').map(s=>norm(s).replace(/^[\s,.;:]+|[\s,.;:!?]+$/g,'')).filter(s=>s.length>3))if(!txt.includes(part))badQ.push(name+': '+part)}}
 ok(M[0][1].length===7&&M[1][1].length===25&&!bad.length,'all 32 quiz places are named in the chapter their note cites (BSB) '+bad.join(' / '));
 ok(nq>=3&&!badQ.length,`all ${nq} quotes in the journey notes are the BSB's own words `+badQ.join(' / '));
 const harran=await p.evaluate(()=>[FIGS.abraham.map.stops[1][0],FIGS.abraham.notes.harran[0],FIGS.abraham.notes.harran[1]]);
 ok(harran[0]==='Haran'&&harran[1]==='Haran'&&/Leave your country/.test(harran[2])&&/usually spelled Harran/.test(harran[2]),'Haran uses the BSB spelling, with the modern spelling noted');
 const pts=await p.evaluate(()=>[mqPts(0,200),mqPts(12,200),mqPts(13,400),mqPts(100,200),mqPts(180,200),mqPts(500,200)]);
 ok(pts[0]===100&&pts[1]===100&&pts[2]===100&&pts[3]>0&&pts[3]<100&&pts[4]===0&&pts[5]===0,'scoring: 100 close in, falling to 0 far away '+pts.join(','));
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

const shot=async(p,n)=>{await p.waitForTimeout(350);await p.screenshot({path:`${__dirname}/s69/${n}.png`})};
const trueAt=(p)=>p.evaluate(()=>{const id=window.__mqId;const h=document.querySelector('#mq h3').textContent.replace(/^Where is /,'').replace(/\?$/,'');const f=FIGS[id],m=GEO[f.map.id],st=f.map.stops.find(s=>s[0]===h);const [x,y]=GPx(m,st[1],st[2]);const svg=document.querySelector('#mqSvg'),pt=svg.createSVGPoint();pt.x=x;pt.y=y;const q=pt.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y,name:h}});
// 2. play a round on phone, light: open from the figure viewer, tap the true spot, use the keyboard, see the summary
for(const o of [{w:390,h:844,cs:'light',t:'phone-light'},{w:390,h:844,cs:'dark',t:'phone-dark'},{w:1440,h:900,cs:'light',t:'desk-light'},{w:1440,h:900,cs:'dark',t:'desk-dark'}]){
 const {ctx,p,errs}=await open(o);
 await p.evaluate(()=>{window.__mqId='paul';openFig('paul')});await p.waitForSelector('#fgQuiz',{timeout:15000});await p.waitForTimeout(600);
 const btn=await p.$('#fgQuiz');ok(!!btn&&/Find the places/.test(await btn.innerText()),o.t+': the Paul map has a Find the places button');
 if(o.t==='phone-light'||o.t==='desk-dark')await shot(p,o.t+'-1-figure');
 await btn.click();await p.waitForSelector('#mqSvg',{timeout:15000});await p.waitForTimeout(400);
 ok(!(await p.$('.figv'))&&!!(await p.$('#mq')),o.t+': the quiz opens in a sheet and the figure closes');
 const q1=await txt(p,'#mq');ok(/Where is .+\?/.test(q1)&&/Place 1 of 6/i.test(q1)&&/Acts|Romans/.test(q1),o.t+': first question names the place and its passage '+q1);
 ok(await p.$eval('#mqGo',b=>b.disabled),o.t+': Drop it here waits for a pin');
 ok((await p.$$('#mq .wh-dots i')).length===6,o.t+': six progress dots');
 const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(ov,o.t+': nothing spills sideways');
 await shot(p,o.t+'-2-question');
 const a=await axe(p,'#mq');ok(!a.length,o.t+': axe clean on the question '+JSON.stringify(a));
 // place 1: tap the exact spot
 const t=await trueAt(p);await p.mouse.click(t.x,t.y);await p.waitForTimeout(250);
 ok(!(await p.$eval('#mqGo',b=>b.disabled)),o.t+': a tap drops a pin');
 await p.click('#mqGo');await p.waitForTimeout(500);
 const r1=await txt(p,'#mq');ok(/100 points/.test(r1)&&/spot on/.test(r1)&&new RegExp(t.name).test(r1),o.t+': the exact spot scores 100 ('+t.name+')');
 ok(!!(await p.$('#mq .wtrue'))&&!!(await p.$('#mq .wline'))&&!!(await p.$('#mq .mq-note')),o.t+': the result shows the true spot, the line and the note');
 ok(!!(await p.$('#mq [data-mqread]')),o.t+': the result offers the passage to read');
 await shot(p,o.t+'-3-result');
 const a2=await axe(p,'#mq');ok(!a2.length,o.t+': axe clean on the result '+JSON.stringify(a2));
 // places 2 to 6 with the keyboard: arrows then Enter to drop, Enter to guess
 for(let k=2;k<=6;k++){await p.click('#mqNext');await p.waitForTimeout(300);
   await p.focus('#mqSvg');await p.keyboard.press('Enter');await p.keyboard.press('ArrowRight');await p.keyboard.press('Shift+ArrowDown');await p.waitForTimeout(120);
   await p.keyboard.press('Enter');await p.waitForTimeout(300);}
 const r6=await txt(p,'#mq');ok(/Place 6 of 6/i.test(r6)&&/See your score/.test(r6),o.t+': keyboard play reaches place 6 '+r6);
 await p.click('#mqNext');await p.waitForTimeout(600);
 const sum=await txt(p,'#mq');const lis=(await p.$$('#mq .wh-sum li')).length;
 const score=await p.evaluate(()=>+(document.querySelector('#mq .fun-hd p, #mq .fun-hd span, #mq .fun-hd')?.innerText.match(/(\d+) of 600/i)||[])[1]);
 ok(lis===6&&/of 600/i.test(sum)&&score>=100,o.t+': the summary lists all six with a score ('+score+')');
 ok((await p.$$('#mq .wtrue.wh-old')).length===6,o.t+': all six true spots numbered on the summary map');
 const best=await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp-mq')||'{}').paul);ok(best===score,o.t+': best score is kept on this device');
 await shot(p,o.t+'-4-summary');
 const a3=await axe(p,'#mq');ok(!a3.length,o.t+': axe clean on the summary '+JSON.stringify(a3));
 await p.click('#mqDone');await p.waitForTimeout(500);ok(!(await p.$('#mq')),o.t+': Done closes it');
 await p.evaluate(()=>openFig('paul'));await p.waitForSelector('#fgQuiz',{timeout:15000});
 ok(new RegExp('best '+score+' of 600').test(await p.$eval('#fgQuiz',b=>b.innerText)),o.t+': the figure button shows the best score');
 await p.evaluate(()=>closeFig(true));
 ok(!errs.length,o.t+': no errors '+errs.join(' / '));await ctx.close()}

// 3. Read opens the passage; Abraham works too; Play again gives a new round
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await p.evaluate(()=>{window.__mqId='abraham';openMapQuiz('abraham')});await p.waitForSelector('#mqSvg',{timeout:15000});await p.waitForTimeout(400);
 const t=await trueAt(p);ok(['Ur','Haran','Damascus','Shechem','Bethel','Hebron','Egypt'].includes(t.name),'Abraham quiz asks about one of his stops ('+t.name+')');
 const bb=await p.$eval('#mqSvg',e=>{const r=e.getBoundingClientRect();return {cx:r.x+r.width/2,cy:r.y+r.height/2}});await p.mouse.click(t.x+(bb.cx>t.x?60:-60),t.y+(bb.cy>t.y?40:-40));await p.waitForTimeout(150);await p.click('#mqGo');await p.waitForTimeout(500);
 const r=await txt(p,'#mq');ok(/km away/.test(r)&&!/spot on/.test(r),'a pin further off shows the distance');
 const lbl=await p.$eval('#mq [data-mqread]',b=>b.innerText);await p.click('#mq [data-mqread]');await p.waitForTimeout(1200);
 const rd=await p.evaluate(()=>document.querySelector('.reader, #reader, [class*=read]')?.innerText.slice(0,200)||document.body.innerText.slice(0,300));
 ok(!(await p.$('#mq'))&&/Genesis/.test(rd),'Read opens the passage ('+lbl+')');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 4. offline first time: a clear message, no blank sheet
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await ctx.route('**/geo.json',r=>r.abort());await p.evaluate(()=>{GEO=null});
 await p.evaluate(()=>openMapQuiz('paul'));await p.waitForTimeout(800);
 ok(!(await p.$('#mq'))&&/needs a signal/.test(await txt(p,'#toast')),'offline the first time: a toast explains, no empty sheet');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 5. Where is it? end screen links to the journey quizzes
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 await p.evaluate(()=>{const P=whToday();dSet('where',{g:P.map(()=>({x:10,y:10,km:20,p:60})),done:true})});
 await p.evaluate(()=>openPlay('where'));await p.waitForTimeout(1200);
 const more=await p.$$('#fun [data-mqgo]');ok(more.length===2,'Where is it? end screen offers the two journey quizzes');
 await shot(p,'where-end-more');
 await more[1].click();await p.waitForSelector('#mqSvg',{timeout:15000});ok(!!(await p.$('#mq'))&&/Paul/.test(await txt(p,'#mq')),'the Paul button starts the Paul quiz');
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

// 6. feel: a tab change from the tab bar or sidebar moves focus to the new heading and names the page
for(const o of [{w:390,h:844,cs:'light',bar:'#tabbar'},{w:1440,h:900,cs:'dark',bar:'#nav'}]){
 const {ctx,p,errs}=await open(o);
 ok(await p.title()==='Lamp Bible Path','Today keeps the plain title');
 await p.focus(`${o.bar} button[data-v="learn"]`);await p.keyboard.press('Enter');await p.waitForTimeout(900);
 const f=await p.evaluate(()=>({tag:document.activeElement.tagName,inView:!!document.activeElement.closest('#view'),t:document.title}));
 ok(f.tag==='H1'&&f.inView&&f.t==='Learn · Lamp Bible Path',o.bar+': Enter on Learn moves focus to its heading and sets the title '+JSON.stringify(f));
 await p.focus(`${o.bar} button[data-v="journal"]`);await p.keyboard.press('Enter');await p.waitForTimeout(900);
 const g=await p.evaluate(()=>({tag:document.activeElement.tagName,t:document.title,txt:document.activeElement.innerText}));
 ok(g.tag==='H1'&&g.t==='Journal · Lamp Bible Path',o.bar+': and again on Journal '+JSON.stringify(g));
 if(o.w>800){await p.keyboard.press('Tab');const nt=await p.evaluate(()=>!!document.activeElement.closest('#view'));ok(nt,'Tab from the heading goes on into the screen')}
 await shot(p,'focus-'+(o.w<800?'phone':'desk'));
 await p.evaluate(()=>setView('today'));await p.waitForTimeout(700);
 const h=await p.evaluate(()=>({t:document.title,a:document.activeElement.tagName}));ok(h.t==='Lamp Bible Path'&&h.a!=='H1','a change not from the nav leaves focus alone '+JSON.stringify(h));
 ok(!errs.length,'no errors '+errs.join(' / '));await ctx.close()}

console.log(log.join('\n'));console.log(fails?`FAILED ${fails}`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
