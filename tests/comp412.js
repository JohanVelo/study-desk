const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 const states = [...new Set(fs.readdirSync('shots412').map(f => f.replace(/^(phone|laptop)-(light|dark)-/, '').replace('.png', '')))];
 fs.mkdirSync('shots412/c', { recursive: true });
 for (const dev of ['phone', 'laptop']) for (const st of states) {
  const imgs = ['light', 'dark'].map(s => `shots412/${dev}-${s}-${st}.png`).filter(f => fs.existsSync(f));
  await p.setViewportSize({ width: 800, height: 600 });
  await p.setContent(`<body style="margin:0;background:#777;display:flex;gap:10px;align-items:flex-start;padding:5px">${imgs.map(f => `<img style="width:${dev==='phone'?390:1440*0.6}px" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`).join('')}</body>`);
  await p.waitForFunction(() => [...document.images].every(i => i.complete));
  const { w, h } = await p.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
  await p.setViewportSize({ width: w, height: Math.min(h, 1800) });
  await p.screenshot({ path: `shots412/c/${dev}-${st}.png`, fullPage: true });
 }
 await b.close(); })();
