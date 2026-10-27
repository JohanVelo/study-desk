// v33: an installed app that cached an old bib/people.json in the long-lived data cache gets the new one after the update.
const {chromium}=require(process.env.PW);
(async()=>{const b=await chromium.launch();const base='http://localhost:8767/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const ctx=await b.newContext({serviceWorkers:'allow'});const p=await ctx.newPage();
await p.goto(base+'manifest.webmanifest');
// what an older version left behind: stale people/places in lamp-data-v1, next to Bible text that must survive
await p.evaluate(async()=>{const c=await caches.open('lamp-data-v1');for(const n of ['people','places'])await c.put(new URL('bib/'+n+'.json',location.href).href,new Response('{"old":true}',{headers:{'content-type':'application/json'}}));await c.put(new URL('bib/BSB/GEN.json',location.href).href,new Response('["kept"]'))});
await p.goto(base);await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:20000}).catch(()=>{});await p.waitForTimeout(1500);
const st=await p.evaluate(async()=>{const c=await caches.open('lamp-data-v1');const ks=(await c.keys()).map(r=>new URL(r.url).pathname);
  const pe=await (await fetch('bib/people.json')).json();const v=(await caches.keys()).find(k=>k!=='lamp-data-v1');await new Promise(r=>setTimeout(r,500));
  const inV=!!(await (await caches.open(v)).match('bib/people.json'));const inD=!!(await c.match('bib/people.json'));return {ks,old:!!pe.old,rows:(pe.pl||[]).length,inV,inD}});
ok(!st.ks.some(k=>/people|places/.test(k)),'stale people/places removed from the data cache: '+st.ks.join(','));
ok(st.ks.some(k=>/BSB\/GEN/.test(k)),'saved Bible text kept');
ok(!st.old&&st.rows>3000,'fresh people.json served ('+st.rows+' people)');
ok(st.inV&&!st.inD,'people.json now cached per build');
await b.close();console.log(fails?'FAILED':'ALL PASS');process.exit(fails?1:0)})();
