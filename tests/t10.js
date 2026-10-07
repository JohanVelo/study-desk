// t10: the 12 upgrades of v4.2
const { chromium } = require('playwright');
const fs = require('fs');
const MOCK_VOICE = `self.onmessage=e=>{const{id,op,text}=e.data;if(op==="load"){let n=0;const t=setInterval(()=>{n+=25;self.postMessage({op:"progress",loaded:n,total:100});if(n>=100){clearInterval(t);self.postMessage({id,ok:true});}},40);return;}
const sr=22050,len=Math.round(sr*Math.min(1.2,0.02*text.length)),b=new ArrayBuffer(44+len*2),v=new DataView(b);const W=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};W(0,"RIFF");v.setUint32(4,36+len*2,true);W(8,"WAVE");W(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);W(36,"data");v.setUint32(40,len*2,true);for(let i=0;i<len;i++)v.setInt16(44+i*2,Math.sin(i/8)*3000,true);
self.postMessage({id,ok:true,blob:new Blob([b],{type:"audio/wav"})});};`;
const MOCK_STT = `let k=0;self.onmessage=e=>{const{id,op,audio}=e.data;if(op==="load"){self.postMessage({op:"progress",loaded:50,total:100});setTimeout(()=>self.postMessage({id,ok:true}),50);return;}k++;setTimeout(()=>self.postMessage({id,ok:true,text:"Part "+k+" lasted "+(audio.length/16000).toFixed(0)+" seconds. Working memory holds information briefly."}),30);};`;
(async () => {
 const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errs = [];
 const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, locale: 'en-GB', serviceWorkers: 'block' });
 await ctx.addInitScript(() => { window.LanguageModel = { availability: async () => 'available', create: async () => ({ prompt: async (t) => 'Working memory is a short-term store.\n\nExam questions:\n1. What is working memory?', destroy() { } }) }; });
 await ctx.route('**/voice-worker.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK_VOICE }));
 await ctx.route('**/stt-worker.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK_STT }));
 const p = await ctx.newPage();
 p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
 const ok = (c, m) => console.log(c ? 'PASS' : 'FAIL', m);
 const leaf = await p.evaluate(() => leafIds[0]);
 const NOTES = `## Memory stores
Working memory is the system that holds information for a few seconds while we use it. Its capacity is about four chunks, according to Nelson Cowan in 2001.
The phonological loop is the part of working memory that stores sounds and words. The visuospatial sketchpad is the part that holds images and spatial layouts.
## Forgetting
Decay theory is the idea that memory traces fade with time. Retroactive interference is when new learning disrupts older memories. Hermann Ebbinghaus measured the forgetting curve in 1885.
Proactive interference is when older memories disrupt new learning. **Retrieval cues** help recall, and the formula $R = e^{-t/S}$ describes retention.`;
 await p.evaluate(async ([id, t]) => { await saveNotes(id, t); }, [leaf, NOTES]); await p.waitForTimeout(1800);
 // 1 auto questions
 const aq = await p.evaluate(id => QS.filter(q => q.auto && q.node === id).map(q => ({ q: q.q, o: q.o, a: q.a })), leaf);
 console.log(JSON.stringify(aq, null, 1));
 ok(aq.length >= 2, 'auto questions made: ' + aq.length);
 ok(aq.every(q => q.a >= 0 && q.o.length >= 3 && new Set(q.o).size === q.o.length), 'answers valid, options unique');

 // 2 maths + formatted notes on topic page
 await p.evaluate(id => go('topic:' + id), leaf); await p.waitForTimeout(800);
 await p.click('.notes-view > summary'); await p.waitForTimeout(1500);
 ok(await p.locator('.notes-view .md strong').count() > 0, 'formatted notes show bold');
 ok(await p.locator('.notes-view .math math').count() > 0, 'formula rendered as maths');
 ok(await p.locator('.md h2').count() >= 2, 'notes headings rendered');
 // 3 AI section (mocked LanguageModel)
 ok(await p.locator('[data-action=ai-explain]').count() === 1, 'AI explanation button shown when built-in AI exists');
 await p.click('[data-action=ai-explain]'); await p.waitForSelector('.ai-draft', { timeout: 5000 }).catch(() => { });
 ok(await p.locator('.ai-draft .ai-tag').count() === 1, 'AI draft is labelled');
 // 4 markdown toolbar + preview
 await p.click(`[data-action=notes][data-id="${leaf}"]`); await p.waitForTimeout(500);
 await p.evaluate(() => { const t = $('#notes-text'); t.setSelectionRange(0, 0); });
 await p.click('[data-action=md-b]'); 
 const v = await p.evaluate(() => $('#notes-text').value.slice(0, 20)); ok(v.startsWith('**bold text**'), 'bold button inserts markdown');
 await p.click('[data-action=md-preview]'); await p.waitForTimeout(900);
 ok(await p.locator('#notes-preview strong').count() > 0 && await p.locator('#notes-text').isHidden(), 'preview shows formatted text');
 await p.click('[data-action=md-preview]'); ok(await p.locator('#notes-text').isVisible(), 'back to editing');
 await p.evaluate(() => closeSheet()); await p.waitForTimeout(400);
 // 5 sketch
 await p.click(`[data-action=sk-open][data-node="${leaf}"]`); await p.waitForTimeout(900);
 const box = await p.locator('#skPad').boundingBox();
 await p.mouse.move(box.x + 40, box.y + 40); await p.mouse.down(); for (let i = 0; i < 20; i++) await p.mouse.move(box.x + 40 + i * 12, box.y + 40 + Math.sin(i / 3) * 30); await p.mouse.up();
 await p.click('[data-action=sk-col][data-i="1"]');
 await p.mouse.move(box.x + 60, box.y + 150); await p.mouse.down(); for (let i = 0; i < 15; i++) await p.mouse.move(box.x + 60 + i * 10, box.y + 150 + i * 4); await p.mouse.up();
 ok(await p.locator('#skPaths path').count() === 2, 'two strokes drawn');
 await p.click('[data-action=sk-undo]'); ok(await p.locator('#skPaths path').count() === 1, 'undo removes a stroke');
 await p.fill('#sk-title', 'Memory model'); await p.click('[data-action=sk-save]'); await p.waitForTimeout(700);
 ok(await p.locator('.sk-thumb').count() === 1, 'sketch saved and shown on topic');
 // 6 charts
 await p.evaluate(() => { const t = todayKey(); for (let i = 0; i < 9; i++) { S.log.push({ d: addDays(t, -i), t: 'task', m: 20 + i * 5 }); S.log.push({ d: addDays(t, -i), t: 'card', g: i % 3 ? 3 : 1 }); } go('progress'); }); await p.waitForTimeout(1500);
 ok(await p.locator('.chart canvas').count() === 3, 'three progress charts drawn');
 // 7 settings: ics + anki + voice + sync card
 await p.evaluate(() => go('settings')); await p.waitForTimeout(700);
 const ics = await p.evaluate(() => buildICS('all'));
 ok(ics.n > 0 && ics.text.includes('BEGIN:VEVENT') && ics.text.split('\r\n').every(l => l.length <= 75), 'calendar file valid (' + ics.n + ' events)');
 let [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-action=ics][data-kind=exams]')]); ok(/\.ics$/.test(dl.suggestedFilename()), 'calendar download ' + dl.suggestedFilename());
 [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('[data-action=anki]')]);
 const ap = await dl.path(); const sz = fs.statSync(ap).size; ok(/\.apkg$/.test(dl.suggestedFilename()) && sz > 2000, 'Anki deck saved, ' + sz + ' bytes');
 fs.copyFileSync(ap, 'out-deck.apkg');
 // 8 natural voice (mock worker)
 await p.click('[data-action=nv-pick][data-v="en_GB-alba-medium"]'); await p.waitForSelector('[data-action=nv-sample]', { timeout: 5000 }).catch(() => { });
 ok(await p.evaluate(() => NV.on()), 'voice downloaded and switched on');
 await p.evaluate(id => { const ep = episodeFor('topic', id); playEpisode(ep); }, leaf); await p.waitForTimeout(4000);
 const pi = await p.evaluate(() => ({ i: P_.i, playing: P_.playing, src: !!NV.audio.src }));
 ok(pi.i >= 2, 'podcast advances with natural voice (segment ' + pi.i + ')');
 await p.evaluate(() => playerStop());
 // 9 docx
 await p.evaluate(() => go('import:psy')); await p.waitForTimeout(500);
 await p.setInputFiles('#imp-file', 'sumtest/biopsych.docx'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 15000 });
 const qp = await p.evaluate(() => qpText); console.log(qp);
 ok(/The Neuron/.test(qp) && /Limbic System/.test(qp), 'Word headings become topics');
 await p.click('[data-action=imp-mode][data-m=append]').catch(() => { }); await p.click('[data-action=imp-apply]'); await p.waitForTimeout(2000);
 const syn = await p.evaluate(() => { const id = leafIds.find(i => nodes[i].title === 'Synapses'); return id ? notesOf(id) : ''; });
 ok(/Reuptake/.test(syn) && !/amygdala/.test(syn), 'Word section text goes to the right topic');
 // 10 recording to text (mock worker)
 await p.evaluate(() => go('listen')); await p.waitForTimeout(500);
 await p.setInputFiles('#rec-file', 'sumtest/lecture.wav'); await p.waitForTimeout(800);
 await p.click('[data-action=rec-more]'); await p.waitForTimeout(500);
 await p.click('[data-action=stt-go]'); await p.waitForFunction(() => !STT.busy, null, { timeout: 30000 });
 await p.waitForTimeout(500);
 const tr = await p.evaluate(() => RECS[0].transcript); console.log('transcript:', tr.slice(0, 200));
 ok(/Part 1/.test(tr) && /Part 3/.test(tr), 'recording split into parts and transcribed');
 ok(await p.locator('.scrim .sum-sec, .scrim .sum, .scrim h3').count() > 0, 'summary shown after transcript');
 console.log('ERRORS', errs); await b.close();
})();
