// Fixtures for PDFs that real textbooks look like but the old importer missed.
const {chromium}=require('playwright');const fs=require('fs');const F=__dirname+'/fixtures/';
const para='Cells are the basic unit of life. Every living thing is made of one or more cells, and each cell carries out the processes that keep it alive. ';
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 // 1. contents page with dot leaders glued to the page number, upper-case title, chapters bold but same size as body
 const toc=`<div style="font:12px serif"><p style="text-align:center">CONTENTS</p>`+
  [['Chapter 1 Cells',5],['1.1 Cell structure',6],['1.2 Cell membranes',11],['Chapter 2 Genetics',20],['2.1 DNA',21],['2.2 Inheritance',27],['Chapter 3 Evolution',35],['3.1 Natural selection',36]]
  .map(([t,n])=>`<div style="display:flex"><span>${t}</span><span style="flex:1;overflow:hidden;white-space:nowrap">${'.'.repeat(200)}</span><span>${n}</span></div>`).join('')+
  `</div><div style="page-break-before:always;font:12px serif">`+Array.from({length:6},(_,k)=>`<p><b>Section ${k+1} heading</b></p><p>${para.repeat(8)}</p>`).join('')+`</div>`;
 await p.setContent(toc); await p.pdf({path:F+'leaders.pdf',format:'A4',margin:{top:'2cm',bottom:'2cm',left:'2cm',right:'2cm'}});
 // 2. headings only in bold, same size as the body, no contents page, no bookmarks
 const bold=`<div style="font:12px serif">`+['Cells','Cell membranes','Genetics','DNA replication','Evolution','Natural selection'].map(t=>`<div style="page-break-before:always"><p><b>${t}</b></p><p>${para.repeat(10)}</p></div>`).join('')+`</div>`;
 await p.setContent(bold); await p.pdf({path:F+'boldheads.pdf',format:'A4',margin:{top:'2cm',bottom:'2cm',left:'2cm',right:'2cm'}});
 // 3. scanned book: every page is only a picture of text (no text layer): a cover, the contents page, then 3 chapters
 const shots=[], pg=(h)=>`<div style="font:24px Georgia,serif;padding:70px;background:#fff;color:#111;height:1123px;box-sizing:border-box">${h}</div>`;
 const body='Cells are the basic unit of life. Every living thing is made of one or more cells, and each cell carries out the processes that keep it alive. ';
 const pagesH=[pg('<h1 style="margin-top:300px;font-size:54px">Biology for first years</h1>'),
  pg('<h1>Contents</h1>'+[['1 Cells',3],['2 Genetics',4],['3 Evolution',5]].map(([t,n])=>`<p style="display:flex"><span>${t}</span><span style="flex:1;overflow:hidden;white-space:nowrap">${'.'.repeat(120)}</span><span>${n}</span></p>`).join('')),
  pg('<h1>1 Cells</h1><p>'+body.repeat(5)+'</p>'),pg('<h1>2 Genetics</h1><p>Genes are made of DNA. Every chromosome carries many genes, and genes are passed from parents to children. '.repeat(4)+'</p>'),pg('<h1>3 Evolution</h1><p>Natural selection means that living things best suited to their environment survive and have more offspring. '.repeat(4)+'</p>')];
 for(const html of pagesH){const q=await b.newPage({viewport:{width:794,height:1123},deviceScaleFactor:2.5});await q.setContent(html);shots.push((await q.screenshot()).toString('base64'));await q.close();}
 await p.setContent('<style>@page{margin:0}body{margin:0}</style>'+shots.map(s=>`<img style="width:210mm;height:296mm;page-break-after:always;display:block" src="data:image/png;base64,${s}">`).join(''));
 await p.pdf({path:F+'scanned.pdf',format:'A4',printBackground:true});
 await b.close(); console.log('made leaders.pdf boldheads.pdf scanned.pdf');
})();
