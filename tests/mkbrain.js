const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 560 } });
 await p.setContent(`<body style="margin:0;background:#fbfaf6;font:600 26px Georgia,serif;color:#222">
 <svg width="800" height="560" viewBox="0 0 800 560"><path d="M210 300 C 170 170 300 90 420 110 C 560 90 660 170 640 280 C 650 340 600 380 540 380 C 520 420 470 430 430 410 C 380 440 300 420 290 380 C 240 380 215 345 210 300 Z" fill="#f4c9c4" stroke="#a5534b" stroke-width="5"/>
 <path d="M420 112 C 400 190 440 230 410 300 M300 230 C 360 260 470 250 560 220 M330 330 C 380 300 470 320 520 350" fill="none" stroke="#a5534b" stroke-width="4"/>
 <ellipse cx="560" cy="400" rx="70" ry="42" fill="#e8b0a8" stroke="#a5534b" stroke-width="5"/>
 <g stroke="#333" stroke-width="2"><line x1="210" y1="65" x2="300" y2="190"/><line x1="660" y1="70" x2="520" y2="170"/><line x1="200" y1="480" x2="320" y2="350"/><line x1="660" y1="480" x2="580" y2="420"/></g>
 <text x="30" y="60">Frontal lobe</text><text x="560" y="60">Parietal lobe</text><text x="30" y="500">Temporal lobe</text><text x="590" y="500">Cerebellum</text></svg></body>`);
 await p.screenshot({ path: 'fixtures/brain.png' }); await b.close(); })();
