// fixtures/machines.docx and fixtures/machines.pptx: notes with real equation-editor maths (Office Math, OMML),
// the way Word and PowerPoint save it: fractions, subscripts, powers, square roots, functions, sums and a matrix.
const JSZip = require(__dirname + '/../vendor/jszip.min.js'); const fs = require('fs');
const r = t => `<m:r><m:t>${t}</m:t></m:r>`, e = x => `<m:e>${x}</m:e>`;
const sub = (a, b) => `<m:sSub>${e(a)}<m:sub>${b}</m:sub></m:sSub>`, sup = (a, b) => `<m:sSup>${e(a)}<m:sup>${b}</m:sup></m:sSup>`;
const frac = (a, b) => `<m:f><m:num>${a}</m:num><m:den>${b}</m:den></m:f>`, sqrt = a => `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/>${e(a)}</m:rad>`;
const func = (f, a) => `<m:func><m:fName>${r(f)}</m:fName>${e(a)}</m:func>`, paren = a => `<m:d>${e(a)}</m:d>`;
const sum = (lo, hi, a) => `<m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub>${lo}</m:sub><m:sup>${hi}</m:sup>${e(a)}</m:nary>`;
const matrix = rows => `<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr>${e(`<m:m>${rows.map(rw => `<m:mr>${rw.map(c => e(r(c))).join('')}</m:mr>`).join('')}</m:m>`)}</m:d>`;
const EQ = {
  emf: sub(r('E'), r('1')) + r('=4.44') + r('f') + sub(r('N'), r('1')) + sub(r('Φ'), r('m')),
  ratio: frac(sub(r('V'), r('1')), sub(r('V'), r('2'))) + r('=') + frac(sub(r('N'), r('1')), sub(r('N'), r('2'))),
  ns: sub(r('n'), r('s')) + r('=') + frac(r('120') + r('f'), r('P')),
  slip: r('s=') + frac(sub(r('n'), r('s')) + r('−') + sub(r('n'), r('r')), sub(r('n'), r('s'))),
  power: r('P=') + sqrt(r('3')) + sub(r('V'), r('L')) + sub(r('I'), r('L')) + func('cos', r('φ')),
  cu: sub(r('P'), r('cu')) + r('=') + sup(r('I'), r('2')) + r('R'),
  total: sub(r('P'), r('total')) + r('=') + sum(r('k=1'), r('n'), sub(r('P'), r('k'))),
  imp: r('Z=') + matrix([['R', 'X'], ['−X', 'R']]) + paren(r('a+b'))
};
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
const wp = (t, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const wInline = (before, eq, after) => `<w:p><w:r><w:t xml:space="preserve">${before}</w:t></w:r><m:oMath>${eq}</m:oMath><w:r><w:t xml:space="preserve">${after}</w:t></w:r></w:p>`;
const wDisplay = eq => `<w:p><m:oMathPara><m:oMath>${eq}</m:oMath></m:oMathPara></w:p>`;
const body = [
  wp('Transformers', 'Heading1'), wp('The EMF equation', 'Heading2'),
  wInline('The RMS EMF in the primary winding is ', EQ.emf, ', where the peak flux is in webers.'),
  wp('The voltage ratio equals the turns ratio:'), wDisplay(EQ.ratio),
  wp('Copper losses', 'Heading2'), wInline('Copper loss grows with the square of the current, ', EQ.cu, ', so it changes with the load.'),
  wp('The total loss adds every part:'), wDisplay(EQ.total),
  wp('Induction motors', 'Heading1'), wp('Speed and slip', 'Heading2'),
  wp('The synchronous speed is:'), wDisplay(EQ.ns), wp('The slip of the rotor is:'), wDisplay(EQ.slip),
  wp('Three-phase power', 'Heading2'), wp('The input power of a balanced load is:'), wDisplay(EQ.power),
  wp('An impedance matrix looks like this:'), wDisplay(EQ.imp)
].join('');
const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style></w:styles>`;
(async () => {
  const d = new JSZip();
  d.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  d.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  d.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  d.file('word/styles.xml', styles);
  d.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}</w:body></w:document>`);
  fs.writeFileSync(__dirname + '/fixtures/machines.docx', await d.generateAsync({ type: 'nodebuffer' }));
  // PowerPoint: one slide per formula group, maths inside <a14:m> in an mc:AlternateContent, with a picture fallback
  const P = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"';
  const sp = (type, inner) => `<p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr><p:ph type="${type}"/></p:nvPr></p:nvSpPr><p:txBody>${inner}</p:txBody></p:sp>`;
  const ap = t => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`, amath = (t, eq, para) => `<a:p>${t ? `<a:r><a:t>${t}</a:t></a:r>` : ''}<a14:m>${para ? `<m:oMathPara><m:oMath>${eq}</m:oMath></m:oMathPara>` : `<m:oMath>${eq}</m:oMath>`}</a14:m></a:p>`;
  const slide = (title, paras) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${P}><p:cSld><p:spTree>${sp('title', ap(title))}<mc:AlternateContent><mc:Choice Requires="a14">${sp('body', paras)}</mc:Choice><mc:Fallback><p:sp><p:nvSpPr><p:cNvPr id="3" name="pic"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:txBody><a:p><a:r><a:t></a:t></a:r></a:p></p:txBody></p:sp></mc:Fallback></mc:AlternateContent></p:spTree></p:cSld></p:sld>`;
  const s = new JSZip();
  s.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  s.file('ppt/slides/slide1.xml', slide('The EMF equation', amath('The primary EMF is ', EQ.emf) + ap('It depends on the frequency and the flux.') + amath('', EQ.ratio, true)));
  s.file('ppt/slides/slide2.xml', slide('Speed and slip', amath('', EQ.ns, true) + amath('', EQ.slip, true) + ap('A 4-pole motor on 50 Hz runs near 1500 rpm.')));
  fs.writeFileSync(__dirname + '/fixtures/machines.pptx', await s.generateAsync({ type: 'nodebuffer' }));
  console.log('ok');
})();
