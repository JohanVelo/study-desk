// v49: Where is it? (a seventh daily puzzle: find five Bible places on the map, scored by km off, like MapTap),
// finished puzzle tiles pop and the progress bar grows; 40 places checked against the BSB verse that names them
const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');const AXE=fs.readFileSync(__dirname+'/axe/node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
process.on('unhandledRejection',e=>{console.log(log.join('\n'));console.log('CRASH '+e.message);process.exit(1)});
fs.mkdirSync(__dirname+'/s64',{recursive:true});
const NOW='2026-11-12T09:00:00+02:00';
const T=d=>`2026-${d}T08:00:00+02:00`;
const ST={done:{1:T('10-20'),2:T('10-21'),3:T('10-22')},settings:{onboarded:true,welcomed:true,intro:false,hsTip:1}};
const open=async(o)=>{const ctx=await b.newContext({viewport:{width:o.w,height:o.h},colorScheme:o.cs,hasTouch:o.w<800,reducedMotion:o.rm||'reduce',locale:'en-GB',timezoneId:'Africa/Johannesburg',serviceWorkers:'block'});
  await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
  await ctx.addInitScript(t=>{const D=Date,off=t-D.now();class FD extends D{constructor(...a){if(!a.length)super(D.now()+off);else super(...a)}static now(){return D.now()+off}};window.Date=FD},new Date(o.now||NOW).getTime());
  await ctx.addInitScript(st=>{if(!localStorage.getItem('lamp-state-v1'))localStorage.setItem('lamp-state-v1',JSON.stringify(st))},ST);
  await ctx.addInitScript(MOCK);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(1800);return {ctx,p,errs}};
// screen point of a lat/lon on the game map
const scr=(p,lat,lon)=>p.evaluate(([la,lo])=>{const s=document.querySelector('#whSvg');const [x,y]=px(la,lo);const pt=s.createSVGPoint();pt.x=x;pt.y=y;const q=pt.matrixTransform(s.getScreenCTM());return [q.x,q.y]},[lat,lon]);
const txt=(p,sel)=>p.evaluate(s=>document.querySelector(s)?.innerText.replace(/\n/g,' | ')||'',sel);

// 1. the data: every place's verse names it (BSB), coordinates inside the map, no repeats
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});
 const W=await p.evaluate(()=>({w:WPL,m:MAP}));
 let bad=[];for(const x of W.w){const [bk,c,v]=x[3].split('.');const B=JSON.parse(fs.readFileSync(`${__dirname}/../../lamp/bib/BSB/${bk}.json`,'utf8'));const t=B[+c-1][+v-1]||'';
  const want=x[0]==='Jerusalem'?'Zion':x[0].replace(/^Mount /,'');if(!t.includes(want))bad.push(x[0]+': '+t.slice(0,60))}
 ok(W.w.length===40&&!bad.length,'40 places, each named in its BSB verse '+bad.join(' / '));
 const out=W.w.filter(x=>{const lo=x[2],la=x[1];return la>W.m.lat0||la<W.m.lat0-W.m.h/W.m.k||lo<W.m.lon0||lo>W.m.lon0+W.m.w/W.m.kx});
 ok(!out.length,'every place sits inside the map '+out.map(x=>x[0]));
 ok(new Set(W.w.map(x=>x[0])).size===40,'no place twice');
 const days=await p.evaluate(()=>{const D=Date;const seen=new Set();const today=whToday().map(x=>x[0]);
   const same=JSON.stringify(today)===JSON.stringify(whToday().map(x=>x[0]));
   for(let i=0;i<8;i++)whToday(funDay()+i).forEach(x=>seen.add(x[0]));
   return {same,n:seen.size,today}});
 ok(days.same&&days.n===40,'same five for everyone all day; 8 days go through all 40 places: '+days.n+' '+days.today);
 ok(await p.evaluate(()=>Math.round(whKm(31.778,35.235,32.702,35.297)))===103,'distance maths: Jerusalem to Nazareth is about 103 km');
 ok(await p.evaluate(()=>[whPts(2),whPts(3),whPts(13),whPts(43),whPts(90)].join())==='100,100,75,0,0','points: 100 within 3 km, down to 0 at 43 km');
 ok(!errs.length,'data: no errors '+errs.join('|'));await ctx.close()}

// 2. play it on phone and laptop, light and dark
for(const [w,h,cs] of [[390,844,'light'],[1440,900,'dark'],[390,844,'dark'],[1440,900,'light']]){const tag=w+'-'+cs;
 const {ctx,p,errs}=await open({w,h,cs});
 // the tile: 7 puzzles, Where is it? spans the whole row
 const tile=await p.evaluate(()=>{const g=document.querySelector('[data-fresh] .dgrid');const t=g?.querySelector('.d-where');return {n:g?.querySelectorAll('.dtile').length,full:t&&Math.abs(t.offsetWidth-g.clientWidth)<2,t:t?.innerText.replace(/\n/g,' | '),h:t?.offsetHeight}});
 ok(tile.n===7&&tile.full&&/Where is it\?/.test(tile.t)&&/New/i.test(tile.t)&&/Find five Bible places/.test(tile.t)&&tile.h>=44,tag+' New today has 7 puzzles; the map one spans the row: '+JSON.stringify(tile));
 if(cs==='light'||w===1440){await p.evaluate(()=>document.querySelector('[data-fresh] .d-where').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`${__dirname}/s64/tile-${tag}.png`})}
 await p.click('[data-fresh] .d-where');await p.waitForTimeout(500);
 const P=await p.evaluate(()=>whToday());
 let hd=await txt(p,'#fun');
 ok(/Place 1 of 5/i.test(hd)&&hd.includes(P[0][0])&&hd.includes(P[0][4])&&await p.$eval('#whGo',b=>b.disabled),tag+' asks for the first place; Drop it here waits for a pin');
 // map fits on screen with the button
 const fit=await p.evaluate(()=>{const s=document.querySelector('#whSvg').getBoundingClientRect(),g=document.querySelector('#whGo').getBoundingClientRect();return {w:s.width,h:s.height,bot:g.bottom,vh:innerHeight,vw:innerWidth,r:s.right}});
 ok(fit.w>200&&fit.r<=fit.vw&&fit.h>250&&fit.bot<=fit.vh,tag+' map is a good size '+JSON.stringify(fit));
 // round 1: tap right on it
 let [x,y]=await scr(p,P[0][1],P[0][2]);await p.mouse.click(x,y);await p.waitForTimeout(150);
 ok(!(await p.$eval('#whGo',b=>b.disabled))&&await p.$('#whMine .wpin'),tag+' tap drops a pin');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s64/pin-${tag}.png`});
 await p.click('#whGo');await p.waitForTimeout(250);
 let r=await txt(p,'.wh-res');
 ok(/Under 1 km away|^1 km away/.test(r)&&/100 points/.test(r)&&/spot on/.test(r)&&/Read/.test(await p.$eval('[data-whread]',b=>b.getAttribute('aria-label'))),tag+' spot on: '+r);
 ok(await p.$('.wtrue')&&await p.$('.wline'),tag+' shows the real spot and a line from your pin');
 if(cs==='light'||w===1440)await p.screenshot({path:`${__dirname}/s64/reveal-${tag}.png`});
 const ax=await p.evaluate(AXE+';(async()=>{document.documentElement.lang="en";const x=await axe.run(document.querySelector("#scrim"),{resultTypes:["violations"]});return x.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>v.id+":"+v.nodes.length)})()');
 ok(!ax.length,tag+' axe: reveal clean '+ax);
 const st1=await p.evaluate(()=>JSON.parse(localStorage.getItem(dKey('where'))));
 ok(st1.g.length===1&&st1.g[0].p===100&&st1.show===true&&!st1.done,tag+' saved after round 1');
 await p.click('#whNext');await p.waitForTimeout(200);
 hd=await txt(p,'#fun');ok(/Place 2 of 5 · 100 points/i.test(hd)&&hd.includes(P[1][0]),tag+' next place: '+hd.slice(0,80));
 // round 2: keyboard only (Enter puts a pin in the middle, arrows move it, Enter drops it)
 await p.focus('#whSvg');await p.keyboard.press('Enter');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowUp');
 const k=await p.evaluate(()=>{const g=document.querySelector('#whMine circle');return [+g.getAttribute('cx'),+g.getAttribute('cy')+17]});
 ok(Math.abs(k[0]-(234+28))<.2&&Math.abs(k[1]-(345-14))<.2,tag+' arrow keys move the pin '+k);
 await p.keyboard.press('Enter');await p.waitForTimeout(250);
 const want=await p.evaluate(([x,y,la,lo])=>{const [a,o]=whLL(x,y);return Math.round(whKm(a,o,la,lo))},[k[0],k[1],P[1][1],P[1][2]]);
 r=await txt(p,'.wh-res');ok(r.includes(want+' km away')||(want<1&&/Under 1/.test(r)),tag+' keyboard guess is scored by distance ('+want+' km): '+r);
 ok(await p.evaluate(()=>document.activeElement?.id)==='whNext',tag+' focus moves to Next place');
 // reopening mid-game keeps the reveal
 await p.evaluate(()=>{closeTop();});await p.waitForTimeout(400);await p.evaluate(()=>openPlay('where'));await p.waitForTimeout(400);
 hd=await txt(p,'#fun');ok(/Place 2 of 5/i.test(hd)&&/km away|Under 1 km/.test(hd),tag+' closing and reopening keeps your place');
 // rounds 3–5: far away in the sea (top left)
 for(let i=2;i<5;i++){await p.click('#whNext');await p.waitForTimeout(150);const s=await p.$eval('#whSvg',e=>{const r=e.getBoundingClientRect();return [r.left+12,r.top+40]});await p.mouse.click(s[0],s[1]);await p.click('#whGo');await p.waitForTimeout(150)}
 ok(/See your score/.test(await txt(p,'#whNext')),tag+' last reveal says See your score');
 await p.click('#whNext');await p.waitForTimeout(400);
 const end=await p.evaluate(()=>{const st=JSON.parse(localStorage.getItem(dKey('where')));return {li:document.querySelectorAll('.wh-sum li').length,t:document.querySelector('#fun').innerText,tot:st.g.reduce((a,g)=>a+g.p,0),done:st.done,trues:document.querySelectorAll('.wtrue').length,lines:document.querySelectorAll('.wline').length,dd:dDone('where'),endp:document.querySelector('.fun-end p')?.innerText}});
 ok(end.done&&end.dd&&end.li===5&&end.trues===5&&end.lines===5&&end.t.includes(end.tot+' of 500'),tag+' score screen: all five on the map with lines, total '+end.tot);
 ok(/of 500/.test(end.endp)&&/Share/.test(end.t),tag+' ends with Share: '+end.endp);
 if(cs==='light'||w===1440){await p.evaluate(()=>document.querySelector('.fun').scrollTop=0);await p.screenshot({path:`${__dirname}/s64/score-${tag}.png`})}
 // the share text has a square per place, no names or places given away
 const share=await p.evaluate(()=>{let t='';navigator.share=x=>{t=x.text;return Promise.resolve()};document.querySelector('#funShare').click();return t});
 ok(/^Lamp · Where is it\?, day \d+: \d+\/500\n(🟩|🟨|🟧|⬜){5}$/u.test(share),tag+' share text: '+JSON.stringify(share));
 // feel: the tile behind pops (class) and says done
 const t2=await p.evaluate(()=>{const t=document.querySelector('[data-fresh] .d-where');return {c:t.className,t:t.innerText}});
 ok(/justdone/.test(t2.c)&&/Done today/.test(t2.t)&&/done/.test(t2.c),tag+' finished tile is marked and pops: '+t2.c);
 ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}

// 3. the progress bar grows from where it was (motion on), and a repaint with nothing new doesn't pop again
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light',rm:'no-preference'});
 const r=await p.evaluate(async()=>{paintFresh();const el=document.querySelector('[data-fresh] .dbar i');const before=el.style.width;
   localStorage.setItem(dKey('where'),JSON.stringify({g:[],done:true}));paintFresh();const bar=document.querySelector('[data-fresh] .dbar i');const at0=bar.style.width;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const at1=bar.style.width;const pop=!!document.querySelector('[data-fresh] .d-where.justdone');
   paintFresh();const again=!!document.querySelector('[data-fresh] .justdone');return {before,at0,at1,pop,again}});
 ok(r.before==='0%'&&r.at0==='0%'&&/^14\.28/.test(r.at1)&&r.pop&&!r.again,'bar grows from 0% to one seventh; only the newly finished tile pops, once: '+JSON.stringify(r));
 ok(!errs.length,'motion: no errors '+errs.join('|'));await ctx.close()}

// 4. works with no signal (no download needed) and the old six still open
{const {ctx,p,errs}=await open({w:390,h:844,cs:'light'});await ctx.setOffline(true);
 await p.evaluate(()=>openPlay('where'));await p.waitForTimeout(300);
 ok(/Place 1 of 5/i.test(await txt(p,'#fun')),'offline: the map game still works');
 await p.evaluate(()=>closeTop());await p.waitForTimeout(300);await ctx.setOffline(false);
 for(const g of ['word','order']){await p.evaluate(g=>openPlay(g),g);await p.waitForTimeout(900);ok((await txt(p,'#fun')).length>20,g+' still opens');await p.evaluate(()=>closeTop());await p.waitForTimeout(300)}
 ok(!errs.length,'offline: no errors '+errs.join('|'));await ctx.close()}
console.log(log.join('\n'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0)})();
