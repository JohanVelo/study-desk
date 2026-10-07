// makes fixtures/memory-textbook.pdf: an 8-page textbook chapter with real headings and definitions
const { chromium } = require('playwright');
const secs = [
 ['h1','4 Memory'],
 ['p','Memory is the process by which we encode, store and retrieve information. Psychologists have built several models to explain how this works, and each model makes predictions that can be tested in experiments.'],
 ['h2','4.1 The multi-store model'],
 ['p','The multi-store model describes memory as three separate stores: sensory memory, short-term memory and long-term memory. Information passes from one store to the next through attention and rehearsal.'],
 ['p','Sensory memory is a very brief store that holds an exact copy of what the senses take in. Iconic memory holds visual images for less than a second, while echoic memory holds sounds for around two seconds.'],
 ['p','Short-term memory is a limited-capacity store that holds about seven items for up to thirty seconds without rehearsal. Miller argued that chunking lets us hold more information by grouping items into meaningful units.'],
 ['break'],
 ['h2','4.2 Working memory'],
 ['p','Working memory is a limited-capacity system that holds and manipulates information while we carry out a task. Baddeley and Hitch proposed it in 1974 to replace the single short-term store.'],
 ['p','The central executive directs attention and coordinates the other parts. The phonological loop holds spoken and written material, and the visuospatial sketchpad holds visual and spatial information.'],
 ['p','The episodic buffer was added in 2000. It links information across the other components and connects working memory to long-term memory.'],
 ['break'],
 ['h2','4.3 Forgetting'],
 ['p','Interference occurs when two sets of information become confused in memory. Proactive interference happens when older learning disrupts new learning, and retroactive interference happens when new learning disrupts older memories.'],
 ['p','Retrieval failure is forgetting caused by the absence of cues that were present when the memory was formed. The encoding specificity principle states that a cue helps recall when it was present at encoding.'],
 ['break'],
 ['h2','4.4 Eyewitness testimony'],
 ['p','Leading questions are questions that suggest a particular answer. Loftus and Palmer showed that the verb used in a question changed how fast participants thought the cars were travelling.'],
 ['p','Anxiety can reduce the accuracy of eyewitness testimony, although some studies found that real witnesses to violent crime remembered details accurately months later.'],
 ['p','The cognitive interview is a police technique that uses four memory strategies: report everything, reinstate the context, reverse the order and change the perspective.'],
];
const html = `<style>@page{size:A4;margin:22mm 20mm}body{font:11.5pt/1.55 Georgia,serif;color:#111}h1{font:700 26pt/1.2 Helvetica,Arial,sans-serif;margin:0 0 14pt}h2{font:700 16pt/1.25 Helvetica,Arial,sans-serif;margin:18pt 0 8pt}p{margin:0 0 9pt;text-align:justify}.b{break-after:page}</style>` +
 secs.map(([t, x]) => t === 'break' ? '<div class="b"></div>' : `<${t}>${x}</${t}>`).join('') + Array.from({length:4},(_,k)=>`<div class="b"></div><h2>Practice ${k+1}</h2>`+'<p>Explain how the models above account for everyday memory, with examples from your own studying. Evaluate each model using research evidence.</p>'.repeat(6)).join('');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setContent(html); await p.pdf({ path: __dirname + '/fixtures/memory-textbook.pdf', format: 'A4', displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:9px;width:100%;text-align:center"><span class="pageNumber"></span></div>', margin: { top: '22mm', bottom: '22mm', left: '20mm', right: '20mm' } }); await b.close(); console.log('ok'); })();
