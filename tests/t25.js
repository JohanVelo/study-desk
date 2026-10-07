// t25: optional online AI (Claude) with a pretend API: key setup, explain a topic from its textbook pages, explain a diagram, errors, save to notes, flashcards
const { chromium } = require('playwright'); const fs = require('fs');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-expose-headers': '*' };
const ANSWER = `## In plain words
The brain has four lobes, each with its own main jobs (p. 1).

## Key ideas
- The **frontal lobe** plans and decides (p. 1).
- The **occipital lobe** handles seeing (p. 1).
- Damage to one lobe changes the jobs it does (p. 2).

## Diagrams and tables
**Figure 2.1** shows the four lobes from the side. Front is on the left, so the frontal lobe is the large area at the left (p. 1).

## Worked examples
1. Someone hit on the back of the head may see flashes of light, because that is where the occipital lobe sits (my example).

## Common mistakes
- Mixing up the parietal and temporal lobes.

## Check yourself
Q: Which lobe plans and decides?
A: The frontal lobe (p. 1).
Q: Where is the occipital lobe?
A: At the back of the brain, and it handles seeing.
Q: What happens when one lobe is damaged?
A: The jobs that lobe does change (p. 2).`;
const sse = text => { const ev = (t, d) => `event: ${t}\ndata: ${JSON.stringify(d)}\n\n`; const parts = text.match(/[\s\S]{1,120}/g);
  return ev('message_start', { type: 'message_start', message: { id: 'msg_t25', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 9000, output_tokens: 1 } } })
    + ev('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
    + parts.map(t => ev('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })).join('')
    + ev('content_block_stop', { type: 'content_block_stop', index: 0 })
    + ev('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1400 } })
    + ev('message_stop', { type: 'message_stop' }); };
(async () => { const b = await chromium.launch(); const errs = []; let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', m); };
 fs.mkdirSync('shots412', { recursive: true });
 for (const [dev, vp, scheme] of [['phone', { width: 390, height: 844 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark'], ['laptop', { width: 1440, height: 900 }, 'light'], ['laptop', { width: 1440, height: 900 }, 'dark']]) {
 const main = dev === 'phone' && scheme === 'light';
 const ctx = await b.newContext({ locale: 'en-GB', serviceWorkers: 'block', viewport: vp, deviceScaleFactor: dev === 'phone' ? 2 : 1, colorScheme: scheme, reducedMotion: 'reduce', isMobile: dev === 'phone', hasTouch: dev === 'phone' });
 const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AuthenticationError|401/.test(m.text())) errs.push(m.text()); });
 const shot = n => p.screenshot({ path: `shots412/${dev}-${scheme}-${n}.png` });
 const reqs = []; let delay = 0;
 await p.route('https://api.anthropic.com/**', async r => {
   const q = r.request(); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
   const key = q.headers()['x-api-key'], url = q.url();
   reqs.push({ url, key, body: q.postData() ? JSON.parse(q.postData()) : null, headers: q.headers() });
   if (!/^sk-ant-good/.test(key)) return r.fulfill({ status: 401, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
   if (/\/v1\/models\//.test(url)) return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'model', id: 'claude-opus-5-5', display_name: 'Claude', created_at: '2026-01-01T00:00:00Z' }) });
   if (delay) await new Promise(res => setTimeout(res, delay));
   return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream' }, body: sse(ANSWER) });
 });
 await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
 await p.evaluate(() => { localStorage.setItem('studydesk.tips', '{"topic":1,"practice":1,"settings":1}'); localStorage.setItem('studydesk.tour', '1'); go('import'); }); await p.waitForTimeout(300);
 await p.fill('#imp-name', 'Psychology'); await p.click('[data-action=imp-new]'); await p.waitForTimeout(300);
 await p.setInputFiles('#imp-file', __dirname + '/fixtures/figures-book.pdf'); await p.waitForSelector('[data-action=imp-apply]', { timeout: 30000 });
 await p.click('[data-action=imp-apply]'); await p.waitForFunction(() => IMP.done && !IMP.done.saving, null, { timeout: 30000 });
 const id = await p.evaluate(() => FIGS.find(f => /2\.1/.test(f.cap))?.node);
 const sid = await p.evaluate(id => nodes[id].subject, id); await p.evaluate(sid => go('subject:' + sid), sid); await p.waitForTimeout(500);
 await p.setInputFiles('#rd-file', __dirname + '/fixtures/figures-book.pdf'); await p.waitForFunction(() => BOOKS.length === 1, null, { timeout: 20000 });
 await p.evaluate(id => go('topic:' + id), id); await p.waitForTimeout(600);
 if (main) ok(!(await p.$('[data-action=ai-topic]')), 'no key: no Explain with Claude button, and nothing is sent');
 // settings: a wrong key, then a good one
 await p.evaluate(() => go('settings')); await p.waitForTimeout(500);
 await p.locator('.ai-set').scrollIntoViewIfNeeded(); await shot('ai-settings');
 await p.fill('#ai-key', 'hello'); await p.click('[data-action=ai-keysave]'); await p.waitForTimeout(200);
 if (main) ok(/starts with sk-ant-/.test(await p.textContent('#aiSetMsg')), 'a key that is clearly wrong is caught before anything is sent');
 await p.fill('#ai-key', 'sk-ant-bad-0000000000000000000000000000'); await p.click('[data-action=ai-keysave]'); await p.waitForFunction(() => /wasn't accepted/.test($('#aiSetMsg')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
 if (main) { ok(/wasn't accepted/.test(await p.textContent('#aiSetMsg')), 'a rejected key gets a plain-words message'); ok(await p.evaluate(() => !localStorage.getItem('studydesk.aikey')), 'a rejected key is not kept'); }
 await p.locator('.ai-set').scrollIntoViewIfNeeded(); await shot('ai-settings-bad');
 await p.fill('#ai-key', 'sk-ant-good-1234567890abcdefghijklmnopWXYZ'); await p.click('[data-action=ai-keysave]');
 await p.waitForSelector('.ai-set [data-action=ai-forget]', { timeout: 15000 });
 if (main) { ok(/WXYZ/.test(await p.textContent('.ai-set')) && !/1234567890abc/.test(await p.textContent('.ai-set')), 'connected: only the last 4 characters of the key are shown'); ok(await p.locator('.set-jump a', { hasText: 'AI' }).count() === 1, 'Settings shortcut row has AI'); }
 await p.locator('.ai-set').scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await shot('ai-settings-on');
 // topic: explain from the textbook pages
 await p.evaluate(id => go('topic:' + id), id); await p.waitForTimeout(800);
 await p.locator('.ai-card').scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await shot('ai-topic-card');
 const cardTxt = await p.textContent('.ai-card');
 if (main) ok(/textbook as they are printed/.test(cardTxt) && /cents/.test(cardTxt), 'the topic offers Explain with Claude, says what is sent and the cost: ' + cardTxt.replace(/\s+/g, ' ').slice(0, 160));
 delay = 1500; const n0 = reqs.length;
 await p.click('[data-action=ai-topic]'); await p.waitForTimeout(700); await shot('ai-wait');
 await p.waitForSelector('.ai-meta', { timeout: 20000 }); delay = 0; await p.waitForTimeout(300);
 const req = reqs.slice(n0).find(r => /\/v1\/messages/.test(r.url));
 if (main) {
   const body = req.body, imgs = body.messages[0].content.filter(c => c.type === 'image');
   ok(body.model === 'claude-opus-5-5' && body.stream === true && body.thinking?.type === 'adaptive' && body.max_tokens === 16000, 'streams to Claude with adaptive thinking');
   ok(body.fallbacks === 'default' && /server-side-fallback-2026-07-01/.test(req.headers['anthropic-beta'] || ''), 'server-side fallbacks are on');
   ok(imgs.length >= 1 && imgs.every(i => i.source.media_type === 'image/jpeg' && i.source.data.length > 1000), imgs.length + ' textbook pages sent as pictures');
   ok(req.headers['anthropic-dangerous-direct-browser-access'] === 'true', 'the key goes straight from the browser to Anthropic');
   ok(/(p\. 42)|cite the page/i.test(body.system), 'Claude is told to stick to the book and cite pages');
 }
 const out = await p.textContent('.sheet');
 if (main) { ok(/frontal lobe/.test(out) && await p.locator('.sheet .ai-out h2').count() >= 4, 'the answer shows as formatted headings'); ok(await p.locator('.ai-q').count() === 3, 'Check yourself questions become 3 show/hide questions'); ok(/Check it against your book/.test(out) && /cent/.test(out), 'marked as written by Claude, with its cost'); }
 await shot('ai-answer');
 await p.click('.ai-q summary'); await p.waitForTimeout(200); await p.locator('.ai-qa').scrollIntoViewIfNeeded(); await shot('ai-answer-qa');
 const c0 = await p.evaluate(() => S.cards.length);
 await p.click('[data-action=ai-cards]'); await p.waitForTimeout(300);
 if (main) ok(await p.evaluate(() => S.cards.length) - c0 === 3, 'Make flashcards adds the 3 questions');
 await p.evaluate(() => closeSheet(true)); const n1 = reqs.length;
 await p.locator('.ai-card').scrollIntoViewIfNeeded(); await shot('ai-topic-saved');
 if (main) ok(/saved on this device/.test(await p.textContent('.view .ai-card')), 'the topic card now says the explanation is saved');
 await p.click('.view .ai-card [data-action=ai-topic]:not([data-again])'); await p.waitForSelector('.ai-meta', { timeout: 5000 });
 if (main) ok(reqs.length === n1, 'opening it again uses the saved answer: nothing is sent or charged');
 await p.evaluate(() => closeSheet(true)); await p.waitForTimeout(300);
 // diagram
 await p.locator('.fig-th').first().scrollIntoViewIfNeeded(); await p.click('.fig-th'); await p.waitForSelector('[data-action=ai-fig]', { timeout: 5000 });
 await p.locator('.sheet .ai-card').scrollIntoViewIfNeeded(); await shot('ai-fig-offer');
 const n2 = reqs.length; await p.click('[data-action=ai-fig]'); await p.waitForSelector('.sheet .ai-card .ai-meta', { timeout: 20000 });
 const fr = reqs.slice(n2).find(r => /\/v1\/messages/.test(r.url));
 if (main) { const c = fr.body.messages[0].content; ok(c[0].type === 'image' && /^image\//.test(c[0].source.media_type) && /Caption/.test(c[1].text), 'the diagram is sent with its caption'); }
 await p.locator('.sheet .ai-card').scrollIntoViewIfNeeded(); await shot('ai-fig-answer');
 await p.evaluate(() => closeSheet(true)); await p.waitForTimeout(200);
 // remove the key
 await p.evaluate(() => go('settings')); await p.waitForTimeout(400); await p.locator('.ai-set').scrollIntoViewIfNeeded();
 await p.click('[data-action=ai-forget]'); await p.click('[data-action=ai-forget]'); await p.waitForTimeout(400);
 if (main) ok(await p.evaluate(() => !localStorage.getItem('studydesk.aikey')) && await p.locator('#ai-key').count() === 1, 'Remove the key deletes it from this device');
 await ctx.close(); }
 // the key belongs to one profile only
 { const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
   await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
   await p.evaluate(() => { localStorage.setItem('studydesk.aikey', 'sk-ant-good-megan-000000000000000000000000'); const id = PROFILES.add('Shasti'); PROFILES.rename('p0', 'Megan'); localStorage.setItem('studydesk.profiles', JSON.stringify({ list: PROFILES.list, cur: id })); });
   await p.reload(); await p.waitForTimeout(1000);
   ok(await p.evaluate(() => !aiOn()), "Megan's key isn't used in Shasti's profile"); await ctx.close(); }
 console.log(errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); })();
