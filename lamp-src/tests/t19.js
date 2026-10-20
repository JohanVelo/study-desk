const {chromium}=require(process.env.PW);const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock.js','utf8');
(async()=>{const b=await chromium.launch();
for(const [w,cs] of [[390,'light'],[390,'dark'],[1440,'dark']]){
const ctx=await b.newContext({viewport:{width:w,height:844},colorScheme:cs});
await ctx.route('**/lamp.html',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace('<head>','<head><meta charset="utf-8">');r.fulfill({response:res,body:t,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}})});
await ctx.addInitScript(()=>{localStorage.setItem('lamp-state-v1',JSON.stringify({done:{},notes:{},saved:{},settings:{onboarded:true,welcomed:true,intro:false}}))});
await ctx.addInitScript(MOCK);
await ctx.addInitScript(()=>{__mock.store.set('group/meta',{week:'w7',name:'Bible study group',at:new Date(Date.now()-8*864e5).toISOString()})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8765/lamp.html');await p.waitForTimeout(2500);
const log=[];
log.push('votd today: '+await p.evaluate(()=>document.querySelector('#votd cite')?.textContent));
// force a day whose verse is outside the reading plan
const ok=await p.evaluate(async()=>{const out=[];const off=new Date().getTimezoneOffset()*6e4;const real=Date.now;
 for(const target of [VOTD.findIndex(k=>{const[b,c]=k.split('.');return !dayOf(b,+c)}),VOTD.findIndex(k=>{const[b,c]=k.split('.');return dayOf(b,+c)})]){
  const base=Math.floor((real()-off)/864e5);const n=base+((target-base%VOTD.length)+VOTD.length)%VOTD.length;
  Date.now=()=>n*864e5+off+36e5;render();await new Promise(r=>setTimeout(r,900));
  out.push(VOTD[target]+' => '+(document.querySelector('#votd cite')?.textContent)+' | '+(document.querySelector('#votd blockquote')?.textContent||'').slice(0,40))}
 Date.now=real;render();return out});
log.push(...ok);
await p.screenshot({path:`s11/votd-${w}-${cs}.png`});
await p.click('#votdRead');await p.waitForTimeout(1200);log.push('read: '+await p.textContent('.rbar .rt').catch(()=>'?'));await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.waitForTimeout(500);
await p.evaluate(()=>setView('group'));await p.waitForTimeout(1000);
log.push('auto week (8 days on): '+await p.evaluate(()=>curWk()+' showing '+WK().id));
await p.evaluate(()=>{__mock.store.set('group/meta',{week:'w7',auto:false,at:new Date(Date.now()-8*864e5).toISOString()});__mock.fire()});await p.waitForTimeout(600);
log.push('auto off: '+await p.evaluate(()=>curWk()+' showing '+WK().id));
await p.evaluate(()=>{__mock.store.set('group/meta',{week:'w11',at:new Date(Date.now()-30*864e5).toISOString()});__mock.fire()});await p.waitForTimeout(600);
log.push('end of series: '+await p.evaluate(()=>curWk()));
await p.click('#gLead');await p.waitForTimeout(500);await p.screenshot({path:`s11/leader-${w}-${cs}.png`});
await p.uncheck('#ldAuto');await p.selectOption('#ldWk','w8');await p.click('#ldSave');await p.waitForTimeout(600);
log.push('saved meta: '+await p.evaluate(()=>{const m=__mock.store.get('group/meta');return m.week+' auto='+m.auto+' at='+!!m.at}));
console.log(w,cs,'\n  '+log.join('\n  '),'\n  ERR',errs.join('|')||'none');await ctx.close()}
await b.close()})();
