const {chromium}=require('playwright');const JSZip=require(__dirname + '/../vendor/jszip.min.js');const fs=require('fs');
const F=__dirname+'/fixtures/';
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 let h='<style>h1{page-break-before:always}</style>';
 [['Chapter 1: Foundations of sociology',[['1.1 What is sociology',['Sociological imagination','Founders']],['1.2 Research in sociology',['Surveys','Interviews']]]],['Chapter 2: Socialisation',[['2.1 Agents of socialisation',['Family','Peers','Media']]]]].forEach(([c,hs])=>{h+=`<h1>${c}</h1><p>text</p>`;hs.forEach(([x,ss])=>{h+=`<h2>${x}</h2><p>body</p>`;ss.forEach(s=>h+=`<h3>${s}</h3><p>more body text</p><div style="height:500px"></div>`)})});
 await p.setContent(h); await p.pdf({path:F+'bookmarks.pdf',outline:true,tagged:true});
 const toc=`<h2>Contents</h2><pre style="font:14px serif">1 Introduction to economics ........ 1
1.1 Scarcity and choice ........ 3
1.2 Opportunity cost ........ 9
2 Supply and demand ........ 21
2.1 Demand curves ........ 22
2.2 Supply curves ........ 30
2.3 Market equilibrium ........ 38</pre>`;
 await p.setContent(toc); await p.pdf({path:F+'toc.pdf'});
 await p.setContent('<div style="height:2000px"><p>Just some prose without structure at all.</p></div>'); await p.pdf({path:F+'plain.pdf'});
 await b.close();
 // pptx
 const z=new JSZip(); const slide=(t,body)=>`<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="1" name="t"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="2" name="b"/><p:cNvSpPr/><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${body}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
 ['Lecture 4: Attachment theory','Bowlby','Ainsworth Strange Situation','Ainsworth Strange Situation (cont.)','Critiques'].forEach((t,i)=>z.file(`ppt/slides/slide${i+1}.xml`,slide(t,'bullet '+i)));
 z.file('[Content_Types].xml','<Types/>');
 fs.writeFileSync(F+'Week 4 - Attachment.pptx',await z.generateAsync({type:'nodebuffer'}));
 console.log(fs.readdirSync(F));
})();
