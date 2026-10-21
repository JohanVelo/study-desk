// v24: week strip, calm finish (chime + settle), milestone moment and share card, sounds setting, drop cap
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://127.0.0.1:8765/lamp.html';const out=__dirname+'/s24';
const log=[];let fails=0;const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const sizes=(process.env.SIZES||'390x844x light,390x844x dark,1440x900x light,1440x900x dark').split(',').map(x=>x.split('x'));
for(const [w,h,cs] of sizes){
const ctx=await b.newContext({viewport:{width:+w,height:+h},colorScheme:cs.trim(),hasTouch:+w<800});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t;r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html'}})});
await ctx.addInitScript(()=>{if(sessionStorage.k)return;sessionStorage.k=1;const d={};for(let i=1;i<=6;i++)d[i]=new Date(Date.now()-(7-i)*864e5).toISOString();
  localStorage.setItem('lamp-state-v1',JSON.stringify({done:d,notes:{},saved:{},settings:{welcomed:true,onboarded:true,intro:false,hsTip:true,allOpen:true}}))});
await ctx.addInitScript(()=>{window.__notes=[];const O=window.OscillatorNode&&OscillatorNode.prototype.start;if(O)OscillatorNode.prototype.start=function(...a){window.__notes.push(this.frequency.value);return O.apply(this,a)}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errs.push('console '+m.text())});
const tag=`${w}-${cs.trim()}`;const shot=n=>p.screenshot({path:`${out}/${n}-${tag}.png`});
await p.goto(base);await p.waitForTimeout(2500);
ok(await p.$$eval('.wks-d li',x=>x.length)===7,tag+' seven days in the strip');
ok(/6/.test(await p.textContent('.wks-fl b')),tag+' streak 6');
ok(/days this week/.test(await p.textContent('.wks-sub'))&&/% of the path/.test(await p.textContent('.wks-sub')),tag+' strip text');
const box=await p.$eval('.dayhead',e=>{const r=e.getBoundingClientRect(),s=e.querySelector('.wks').getBoundingClientRect();return [r.right,s.right,s.left,r.left]});ok(box[1]<=box[0]+1&&box[2]>=box[3]-1,tag+' strip fits '+box);
await shot('today');
await p.click('#markDone');await p.waitForTimeout(1600);
ok(await p.$('#msm')!==null,tag+' 7th chapter opens milestone');
ok(/7/.test(await p.textContent('#msmN'))&&/A whole week/.test(await p.textContent('#msm')),tag+' milestone text');
ok(await p.evaluate(()=>window.__notes.length>=8),tag+' chime played '+await p.evaluate(()=>window.__notes.length));
await shot('milestone');
const dl=p.waitForEvent('download',{timeout:5000}).catch(()=>null);await p.click('#msmShare');const d=await dl;ok(!!d,tag+' share card made');
if(d&&w==='390'&&cs.trim()==='dark')await d.saveAs(out+'/card.png');
await p.click('#msmGo');await p.waitForTimeout(400);ok(await p.$('#msm')===null,tag+' milestone closes');
ok(await p.evaluate(()=>!!state.settings.ms?.d7),tag+' milestone remembered');
ok(await p.$eval('.wks-d li.now',e=>e.classList.contains('on')),tag+' today filled in');
await shot('after');
// sounds setting
await p.evaluate(()=>openSettings());await p.waitForTimeout(500);await p.click('[data-snd="0"]');ok(await p.evaluate(()=>state.settings.sound===false),tag+' silent');
await p.evaluate(()=>{window.__notes=[];chime()});ok(await p.evaluate(()=>window.__notes.length===0),tag+' silent means no chime');
await p.evaluate(()=>$('#scrim')?.remove());
// reader drop cap
await p.evaluate(()=>openReader(8,false));await p.waitForTimeout(1800);await shot('reader');
ok(!errs.length,tag+' no errors '+errs.join('|'));await ctx.close()}
await b.close();console.log(log.join('\n'));console.log(fails?fails+' FAILED':'ALL PASS')})();
