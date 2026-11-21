// fixtures/machines.pdf: electrical machines notes the way lecturers make them. Equations are typeset with MathML
// (Chromium lays them out like Word's equation editor or LaTeX: math-italic letters, stacked fractions, real
// subscripts and powers, square roots), plus prose with <sub>/<sup> variables and Greek letters.
const { chromium } = require('playwright');
const M = s => `<math display="block">${s}</math>`, m = s => `<math>${s}</math>`;
const v = s => `<mi>${s}</mi>`, n = s => `<mn>${s}</mn>`, o = s => `<mo>${s}</mo>`;
const sub = (a, b) => `<msub>${a}${b}</msub>`, frac = (a, b) => `<mfrac><mrow>${a}</mrow><mrow>${b}</mrow></mfrac>`;
const P = t => `<p>${t}</p>`;
const html = `<style>@page{size:A4;margin:22mm 20mm}body{font:11pt/1.6 Georgia,serif}h1{font:700 24pt Helvetica,Arial;margin:0 0 12pt}h2{font:700 15pt Helvetica,Arial;margin:16pt 0 6pt}math[display=block]{margin:10pt 0;font-size:13pt}.b{break-after:page}</style>
<h1>3 Transformers</h1>
<h2>3.1 The EMF equation</h2>
${P(`When an alternating flux links a winding, an EMF is induced in it. The peak flux in the core is Φ<sub>m</sub> and the supply frequency is <i>f</i>. The RMS EMF induced in the primary winding of N<sub>1</sub> turns is:`)}
${M(`${sub(v('E'), n(1))}${o('=')}${n('4.44')}${v('f')}${sub(v('N'), n(1))}${sub(v('Φ'), v('m'))}`)}
${P(`In the same way the secondary EMF is E<sub>2</sub> = 4.44 f N<sub>2</sub> Φ<sub>m</sub>. Dividing the two gives the turns ratio:`)}
${M(`${frac(sub(v('E'), n(1)), sub(v('E'), n(2)))}${o('=')}${frac(sub(v('N'), n(1)), sub(v('N'), n(2)))}${o('=')}${frac(sub(v('I'), n(2)), sub(v('I'), n(1)))}${o('=')}${v('a')}`)}
${P(`The core flux density is B<sub>m</sub> = Φ<sub>m</sub> / A, measured in tesla, where A is the core area in m<sup>2</sup>.`)}
<h2>3.2 Losses and efficiency</h2>
${P(`Copper losses grow with the square of the load current, P<sub>cu</sub> = I<sup>2</sup>R, while core losses stay almost constant. The efficiency is:`)}
${M(`${v('η')}${o('=')}${frac(sub(v('P'), v('out')), `${sub(v('P'), v('out'))}${o('+')}${sub(v('P'), v('core'))}${o('+')}${sub(v('P'), v('cu'))}`)}${o('×')}${n('100')}${o('%')}`)}
${P(`Maximum efficiency occurs when the copper loss equals the core loss.`)}<div class="b"></div>
<h1>4 Induction motors</h1>
<h2>4.1 Synchronous speed and slip</h2>
${P(`The stator field rotates at the synchronous speed, which depends on the supply frequency and the number of poles P:`)}
${M(`${sub(v('n'), v('s'))}${o('=')}${frac(`${n('120')}${v('f')}`, v('P'))}`)}
${P(`The rotor always turns a little slower than the field. The slip is:`)}
${M(`${v('s')}${o('=')}${frac(`${sub(v('n'), v('s'))}${o('−')}${sub(v('n'), v('r'))}`, sub(v('n'), v('s')))}`)}
${P(`For example, a 4-pole motor on a 50 Hz supply has n<sub>s</sub> = 1500 rpm.`)}
<h2>4.2 Power in a three-phase supply</h2>
${P(`The input power to a balanced three-phase load is:`)}
${M(`${v('P')}${o('=')}<msqrt>${n('3')}</msqrt>${sub(v('V'), v('L'))}${sub(v('I'), v('L'))}${v('cos')}${v('φ')}`)}
${P(`The torque developed is T = P / ω, where ω = 2πn / 60 is the angular speed in rad/s. The reactance of an inductor is X<sub>L</sub> = 2πfL.`)}`;
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setContent(html); await p.waitForTimeout(300);
  await p.pdf({ path: __dirname + '/fixtures/machines.pdf', format: 'A4', displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:9px;width:100%;text-align:center"><span class="pageNumber"></span></div>', margin: { top: '22mm', bottom: '22mm', left: '20mm', right: '20mm' } });
  await b.close(); console.log('ok'); })();
