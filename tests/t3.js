const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
 for (const mode of ['legacy','corrupt','garbage']){
 const ctx=await b.newContext(); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await ctx.addInitScript(m=>{ if(sessionStorage.getItem('seeded'))return; sessionStorage.setItem('seeded',1); localStorage.clear();
   if(m==='legacy') localStorage.setItem('studydesk.proto.v1',JSON.stringify({v:1,anchor:'2026-10-05',status:{'psy-3-2-3':3,'psy-1-1-1':5},attempts:{'psy-4-2-2':{a:10,c:4}},tasks:[{id:'t1',date:'2026-10-05',node:'psy-3-2-3',type:'learn',dur:30,start:540}],recent:[],changes:[],seq:2}));
   if(m==='corrupt'){ localStorage.setItem('studydesk.v2','{oops'); localStorage.setItem('studydesk.v2.bak',JSON.stringify({schema:2,app:'study-desk',anchor:'2026-10-04',status:{'psy/research-methods/variables/confounding-variables':4},attempts:{},mistakes:{},tasks:[],recent:[],changes:[],seq:0,settings:{}}));}
   if(m==='garbage') localStorage.setItem('studydesk.v2',JSON.stringify({schema:2,anchor:'nope',status:{'psy/research-methods/variables/confounding-variables':99,'bogus':2},attempts:{'x':{a:1,c:5}},tasks:[{id:'t9',date:'bad'},{id:'t3',date:'2026-10-06',node:'psy/research-methods/variables/confounding-variables',type:'learn',dur:30,start:540}],settings:{days:[],blocks:'x',maxPerDay:99,theme:'pink'}}));
 }, mode);
 await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
 console.log(mode, JSON.stringify(await p.evaluate(()=>({conf:S.status['psy/research-methods/variables/confounding-variables'],emp:S.status['psy/psychology-as-a-science/what-makes-psychology-scientific/empiricism'],dof:S.attempts['psy/statistics/inferential-statistics/degrees-of-freedom'],restoredFrom,repairs,legacy:localStorage.getItem('studydesk.proto.v1'),tasks:S.tasks.length,settings:S.settings,anchor:S.anchor}))), errs);
 await ctx.close();}
 await b.close();})();
