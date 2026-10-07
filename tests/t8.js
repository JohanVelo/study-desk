// v4 functional test: flashcards, persistence, backup round-trip, blurt, OCR offline, fuzzy search, mind map
const {chromium}=require('playwright');
const ok=(n,c,x='')=>console.log((c?'PASS ':'FAIL ')+n,x);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|net::/.test(m.text()))errs.push(m.text())});
p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});
await p.goto('http://localhost:8765/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
// flashcards
await p.evaluate(()=>go('practice'));await p.waitForTimeout(400);
const due=await p.evaluate(()=>{ensureCards();return cardsDueCount()});ok('cards auto-made',due>0,due);
await p.click('[data-action=fc-start]');await p.waitForTimeout(800);
ok('review open',await p.locator('.fcard').count()===1);
await p.keyboard.press('Space');await p.waitForTimeout(400);
ok('answer shown',await p.locator('.fcard.flip').count()===1);
ok('4 grades with intervals',(await p.locator('.grade .mono').allInnerTexts()).filter(Boolean).length===4,(await p.locator('.grade .mono').allInnerTexts()).join(','));
await p.keyboard.press('3');await p.waitForTimeout(600);
const after=await p.evaluate(()=>{const c=S.cards.find(c=>c.s);return c&&{due:c.due,reps:c.s.reps,st:st(c.node)}});
ok('graded card scheduled',after&&Date.parse(after.due)>Date.now(),JSON.stringify(after));
for(let i=0;i<4;i++){await p.click('[data-action=fc-show] >> nth=0');await p.waitForTimeout(250);await p.click('.grade.g1');await p.waitForTimeout(450);}
ok('forgot cards requeued',await p.evaluate(()=>R.ids.length>R.done));
// persistence + sanitize after reload
const n1=await p.evaluate(()=>S.cards.filter(c=>c.s).length);
await p.reload();await p.waitForTimeout(1500);
const n2=await p.evaluate(()=>S.cards.filter(c=>c.s).length);ok('reviews survive reload',n1>0&&n1===n2,n1+'/'+n2);
// own card add + delete
await p.evaluate(()=>{const id=leafIds.find(id=>st(id)>=1);go('topic:'+id)});await p.waitForTimeout(500);
ok('topic shows cards section',await p.locator('.fc-list, [data-action=fc-new]').count()>0);
// backup round trip
const rt=await p.evaluate(async()=>{const t=exportText();const r=importText(t);return {cards:(r.state||r).cards?.length,orig:S.cards.length}});
ok('backup keeps cards',rt.cards===rt.orig,JSON.stringify(rt));
// blurt
const bl=await p.evaluate(()=>{const id=leafIds.find(id=>summaryOf(id));const sm=summaryOf(id);const good=blurtGrade(sm.bullets.join(' ')+' '+sm.terms.join(' '),id);const bad=blurtGrade('no idea really',id);return [good.score,bad.score]});
ok('blurt scores full recall high, none low',bl[0]>.9&&bl[1]<.2,bl.join(' / '));
await p.evaluate(()=>openBlurt(leafIds.find(id=>summaryOf(id))));await p.waitForTimeout(400);
await p.fill('#blurt-text','empiricism observation evidence');await p.click('[data-action=blurt-check]');await p.waitForTimeout(400);
ok('blurt result shown',await p.locator('.blurt-score').count()===1);
// fuzzy search typo
await p.evaluate(()=>{closeSheet(true);openSearch()});await p.fill('#srch','empricism');await p.waitForTimeout(1200);
const hits=await p.locator('#layer [data-sgo]').count();ok('fuzzy search finds typo',hits>0,hits);
await p.evaluate(()=>closeSheet(true));
// mind map navigation
await p.evaluate(()=>go('map:'+DSUBJ[0].id));await p.waitForTimeout(600);
const nn=await p.locator('.mm-n').count();await p.locator('.mm-n.d2').first().click();await p.waitForTimeout(500);
ok('mind map opens topic',nn>10&&await p.evaluate(()=>stack[stack.length-1].v==='topic'),nn);
// OCR offline
await ctx.setOffline(true);
const id=await p.evaluate(()=>leafIds[5]);await p.evaluate(id=>openNotesSheet(id),id);await p.waitForTimeout(500);
const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=260;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1000,260);x.fillStyle='#111';x.font='44px serif';x.fillText('Operant conditioning shapes',30,90);x.fillText('behaviour through reinforcement.',30,170);return c.toDataURL('image/png').split(',')[1]});
await p.setInputFiles('#ocr-file',{name:'page.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
await p.waitForFunction(()=>/Added|Couldn/.test(document.querySelector('#ocr-status')?.innerText||''),null,{timeout:120000}).catch(()=>{});
const txt=await p.inputValue('#notes-text');ok('photo to text (offline)',/conditioning/i.test(txt)&&/reinforcement/i.test(txt),JSON.stringify(txt.slice(-80)));
await ctx.setOffline(false);
console.log('ERRORS',errs);await b.close();})();
