// Makes the files t9, t10, t13 and t14 import (they were never committed): node mksumtest.js
// sumtest/memory.pptx · sumtest/methods.pdf · sumtest/biopsych.docx · sumtest/lecture.wav · sumtest/today.png
const { chromium } = require('playwright'); const JSZip = require(__dirname + '/../vendor/jszip.min.js'); const fs = require('fs');
const D = __dirname + '/sumtest/', S = D; fs.mkdirSync(D, { recursive: true });
const x = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  // 1. PowerPoint: a lecture on memory, a title and bullets on each slide
  const z = new JSZip(), A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
  const slide = (t, bullets) => `<?xml version="1.0"?><p:sld ${A}><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="1" name="t"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${x(t)}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="2" name="b"/><p:cNvSpPr/><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr><p:txBody>${bullets.map(b => `<a:p><a:r><a:t>${x(b)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  const slides = [
    ['The multi-store model', ['Sensory memory holds information from the senses for less than a second.', 'Short-term memory holds about seven items for around eighteen seconds without rehearsal.', 'Long-term memory has an unlimited capacity and can last a lifetime.', 'Rehearsal moves information from short-term memory into long-term memory.']],
    ['The working memory model', ['Baddeley and Hitch proposed the working memory model in 1974.', 'Central executive: the part of working memory that directs attention and controls the other parts.', 'Phonological loop: the part of working memory that holds speech sounds and words for about two seconds.', 'The Phonological loop has an articulatory process that repeats words silently, like an inner voice.', 'Visuospatial sketchpad: the part of working memory that holds pictures and the layout of places.', 'Episodic buffer: a store added in 2000 that links working memory to long-term memory.']],
    ['Forgetting', ['Interference theory says that other memories get in the way of the one we want.', 'Proactive interference is when old learning disrupts new learning.', 'Retroactive interference is when new learning disrupts old learning.', 'Retrieval failure happens when the cues present at learning are missing at recall.']],
  ];
  slides.forEach(([t, b], i) => z.file(`ppt/slides/slide${i + 1}.xml`, slide(t, b)));
  z.file('[Content_Types].xml', '<Types/>');
  fs.writeFileSync(D + 'memory.pptx', await z.generateAsync({ type: 'nodebuffer' }));

  const b = await chromium.launch(); const p = await b.newPage();
  // 2. PDF: a methods chapter with real headings in a bigger font
  const sec = (h, ps) => `<h2 style="font-size:20px">${h}</h2>${ps.map(t => `<p>${t}</p>`).join('')}`;
  await p.setContent(`<div style="font:12px Georgia,serif;line-height:1.5"><h1 style="font-size:28px">Research methods</h1>` +
    sec('Experiments', ['An experiment is a method in which the researcher changes one variable and measures its effect on another.', 'The independent variable is the variable the researcher changes. The dependent variable is the variable the researcher measures.', 'Laboratory experiments take place in controlled conditions, so they have high internal validity.']) +
    sec('Confounding variables', ['Confounding variables are variables other than the independent variable that change along with it and affect the dependent variable.', 'Confounding variables make it impossible to know what caused a change in the results.', 'Random allocation of participants to conditions reduces the effect of confounding variables.']) +
    sec('Sampling', ['A sample is the group of people who take part in a study, chosen from the target population.', 'Random sampling means every member of the target population has an equal chance of being chosen.', 'Opportunity sampling uses whoever is available at the time, which is quick but may be biased.']) + `</div>`);
  await p.pdf({ path: D + 'methods.pdf', format: 'A4', margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' } });

  // 3. screenshot used as the picture-card image
  const q = await b.newPage({ viewport: { width: 390, height: 844 } });
  await q.setContent('<body style="margin:0;font:16px system-ui;background:#f7f3ea"><h1 style="padding:24px">What should I study today?</h1><p style="padding:0 24px">Import a textbook chapter to get started.</p></body>');
  await q.screenshot({ path: S + 'today.png' }); await b.close();

  // 4. Word: Heading 1 / Heading 2 sections with body text under each
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const para = (t, st) => `<w:p>${st ? `<w:pPr><w:pStyle w:val="${st}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${x(t)}</w:t></w:r></w:p>`;
  const body = [
    para('Biopsychology', 'Heading1'),
    para('The Neuron', 'Heading2'), para('A neuron is a nerve cell that carries electrical and chemical messages. Sensory neurons carry messages from the senses to the brain, and motor neurons carry messages to the muscles.'),
    para('Synapses', 'Heading2'), para('A synapse is the small gap between two neurons. Neurotransmitters cross the synapse and bind to receptors on the next neuron. Reuptake is when the first neuron takes the neurotransmitter back in, which ends the signal.'),
    para('Limbic System', 'Heading2'), para('The limbic system is a group of brain structures involved in emotion and memory. The amygdala links emotions to memories, and the hippocampus helps form new long-term memories.'),
  ].join('');
  const dz = new JSZip();
  dz.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  dz.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  dz.file('word/_rels/document.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  dz.file('word/styles.xml', `<?xml version="1.0"?><w:styles ${W}><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style></w:styles>`);
  dz.file('word/document.xml', `<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`);
  fs.writeFileSync(D + 'biopsych.docx', await dz.generateAsync({ type: 'nodebuffer' }));

  // 5. a 70-second lecture recording (tone bursts with quiet gaps, 16 kHz mono), long enough to split into 3 parts
  const sr = 16000, n = sr * 70, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const t = i / sr, on = (t % 4) < 3.2; buf.writeInt16LE(on ? Math.round(6000 * Math.sin(2 * Math.PI * 220 * t)) : 0, 44 + i * 2); }
  fs.writeFileSync(D + 'lecture.wav', buf);
  console.log('made', fs.readdirSync(D).join(', '), '');
})();
