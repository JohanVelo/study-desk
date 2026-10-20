/* ================= Group: state & sync ================= */
const ME={id:null,name:"",first:"",owner:false};
const G={db:null,user:null,ref:null,on:false,ro:false,people:{},meta:{},ice:{},live:null,lv:{},prof:{},wk:null,sub:"study",game:null,test:null};
const GLS="lamp-group-v1";
try{const g0=JSON.parse(localStorage.getItem(GLS)||"null");if(g0)G.people.me=g0}catch(e){}
const myKey=()=>G.id||"me";
const mine=()=>G.people[myKey()]||{};
const curWk=()=>G.meta.week||"w7";
const WK=id=>SERIES.weeks.find(w=>w.id===(id||G.wk||curWk()))||SERIES.weeks[6];
const wkIdx=id=>SERIES.weeks.findIndex(w=>w.id===id);
let gQ={},gT=null;
function gWrite(patch,now){
  G.people[myKey()]=deepMerge(mine(),patch);
  if(!G.ref){try{localStorage.setItem(GLS,JSON.stringify(G.people.me||{}))}catch(e){};return}
  gQ=deepMerge(gQ,patch);clearTimeout(gT);gT=setTimeout(gFlush,now?0:700);
}
async function gFlush(){
  if(!G.ref||!Object.keys(gQ).length)return;const body=gQ;gQ={};
  try{await G.ref.update(body)}
  catch(e){try{const s=await G.ref.get();if(!s.exists)await G.ref.set({joined:new Date().toISOString(),...body});else throw e}
    catch(e2){if(!G.ro){G.ro=true;toast("You can look around, but your answers can't be saved to the group yet.");gPaint()}}}
}
async function groupConnect(db,user){
  try{
    G.db=db;G.user=user;
    const me=await user.me();ME.id=me.id;ME.name=me.name||"";ME.first=(me.name||"").split(" ")[0];ME.owner=!!me.isOwner;
    if(!me.id){paintName();return}
    G.id=me.id;G.ref=db.collection("gm").doc(me.id);
    const cw=await user.can("data.write");if(cw===false)G.ro=true;
    const local=G.people.me;delete G.people.me;
    db.collection("gm").onSnapshot(snap=>{const o={};snap.docs.forEach(d=>o[d.id]=d.data());if(Object.keys(gQ).length&&o[G.id])o[G.id]=deepMerge(o[G.id],gQ);G.people=o;gNames();gPaint()},()=>{});
    db.doc("group/meta").onSnapshot(d=>{G.meta=d.exists?d.data():{};gPaint()},()=>{});
    db.doc("group/ice").onSnapshot(d=>{G.ice=d.exists?d.data():{};gPaint("ice")},()=>{});
    db.doc("live/game").onSnapshot(d=>{const was=G.live?.ph;G.live=d.exists?d.data():null;liveSync(was)},()=>{});
    db.collection("lv").onSnapshot(snap=>{const o={};snap.docs.forEach(d=>o[d.id]=d.data());G.lv=o;liveSync()},()=>{});
    G.on=true;
    if(!G.ro){const s=await G.ref.get();const now=new Date().toISOString();
      if(!s.exists)await G.ref.set({joined:now,seen:now,...(local||{})});
      else{const last=Date.parse(s.data().seen||0);if(Date.now()-last>36e5)await G.ref.update({seen:now})}}
    paintName();gPaint();
  }catch(e){console.warn("group",e)}
}
function paintName(){if(view==="today"&&!$(".reader"))render()}
async function gNames(){
  if(!G.user)return;const ids=Object.keys(G.people);if(!ids.length)return;
  try{const ps=await G.user.profiles(ids);let ch=false;for(const id of ids){if(!G.prof[id]||G.prof[id].name!==ps[id].name){ch=true}G.prof[id]=ps[id]}if(ch)gPaint()}catch(e){}
}
const pname=id=>id===myKey()?(ME.first?"You":"You"):(G.prof[id]?.name||"Group member");
const pfirst=id=>id===myKey()?"You":((G.prof[id]?.name||"").split(" ")[0]||"Someone");
function face(id,cls=""){const p=G.prof[id];const nm=id===myKey()?(ME.name||"You"):(p?.name||"?");
  return p?.avatarUrl?`<img class="face ${cls}" src="${esc(p.avatarUrl)}" alt="" title="${esc(nm)}">`:`<span class="face ${cls}" style="--fc:${esc(p?.color||"var(--accent)")}" title="${esc(nm)}">${esc((nm[0]||"?").toUpperCase())}</span>`}
const members=()=>Object.keys(G.people).sort((a,b)=>String(G.people[a].joined||"").localeCompare(String(G.people[b].joined||"")));
function ago(iso){const s=(Date.now()-Date.parse(iso))/1e3;if(!isFinite(s))return"";if(s<60)return"just now";if(s<3600)return Math.floor(s/60)+" min ago";if(s<86400)return Math.floor(s/3600)+" h ago";const d=Math.floor(s/86400);return d<7?d+" d ago":new Date(iso).toLocaleDateString(undefined,{day:"numeric",month:"short"})}
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function seeded(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296}}
const isoWeek=()=>{const d=new Date();const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));return Math.ceil(((t-new Date(Date.UTC(t.getUTCFullYear(),0,1)))/864e5+1)/7)};
function kvText(w){return loadBook("BSB","MAT").then(b=>(b?.[w.kv[0]-1]?.[w.kv[1]-1]||"").replace(/^[“‘"]+|[”’"]+$/g,"").replace(/[“”‘’]/g,m=>m))}
const wkPass=w=>({book:"MAT",ch:w.c,day:0,title:""});
function openWeekPassage(w){openPassage(passFor("MAT",w.c),false,w.vs,{range:[w.vs,w.ve]})}

/* ================= Group: view ================= */
const GTABS=[["study","Study"],["ice","Icebreakers"],["games","Games"],["test","Test"],["prayer","Prayer"],["topics","Topics"]];
function vGroup(){
  if(!G.wk)G.wk=curWk();
  const w=WK();const n=wkIdx(w.id)+1;const isCur=w.id===curWk();
  return `<div class="ghero" style="--wk:${n}">
    <div class="ghero-top"><div class="kicker">${esc(G.meta.name||"Our Bible study")}${G.meta.when?` · ${esc(G.meta.when)}`:""}</div>
      <div class="gfaces" id="gFaces"></div></div>
    <div class="gseries">${esc(SERIES.title)} · week ${n} of ${SERIES.weeks.length}${isCur?` <span class="chip gold">This week</span>`:""}</div>
    <h1>${esc(w.title)}</h1>
    <p class="gref">${esc(w.ref)}</p>
    <div class="gbtns"><button class="btn primary" id="gRead">${I.open}Read ${esc(w.ref)}</button>${ME.owner||!G.on?`<button class="btn ghost" id="gLead">${I.gear}Leader</button>`:""}<button class="btn ghost" id="gPeople">${I.group}People</button></div>
    <div class="gweeks" role="group" aria-label="Weeks">${SERIES.weeks.map((x,i)=>`<button data-wk="${x.id}" aria-pressed="${x.id===w.id}" class="${x.id===curWk()?"cur":""}" title="${esc(x.title)}">${i+1}</button>`).join("")}</div>
  </div>
  <div id="gLive"></div>
  ${G.ro&&G.on?`<div class="gnote">${I.spark}<span>You can read everything here, but saving to the group needs JJ to give you edit access. Your own reading plan still saves.</span></div>`:""}
  ${!G.on?`<div class="gnote">${I.spark}<span>Group features (shared answers, prayer, live games) switch on when you open Lamp inside Claude. For now everything saves on this device.</span></div>`:""}
  <nav class="gtabs" role="tablist" aria-label="Group sections">${GTABS.map(([k,l])=>`<button role="tab" data-gt="${k}" aria-selected="${G.sub===k}">${l}</button>`).join("")}<span class="gtab-ind" id="gTabInd"></span></nav>
  <div id="gBody" class="gbody"></div>`;
}
after.group=()=>{
  $("#gRead").onclick=()=>openWeekPassage(WK());
  $("#gLead")?.addEventListener("click",openLeader);
  $("#gPeople").onclick=openPeople;
  document.querySelectorAll("[data-wk]").forEach(b=>b.onclick=()=>{G.wk=b.dataset.wk;G.game=null;render()});
  document.querySelectorAll("[data-gt]").forEach(b=>b.onclick=()=>{G.sub=b.dataset.gt;G.game=null;G.test=null;document.querySelectorAll("[data-gt]").forEach(x=>x.setAttribute("aria-selected",x===b));gTabInd();gBody(true);b.scrollIntoView({inline:"center",block:"nearest",behavior:reduced()?"auto":"smooth"})});
  requestAnimationFrame(gTabInd);gBody();gFaces();liveBanner();
};
function gTabInd(){const b=$(`[data-gt="${G.sub}"]`),i=$("#gTabInd");if(b&&i){i.style.width=b.offsetWidth+"px";i.style.transform=`translateX(${b.offsetLeft}px)`}}
addEventListener("resize",()=>requestAnimationFrame(gTabInd));
function gFaces(){const el=$("#gFaces");if(!el)return;const ids=members();const sh=ids.slice(-6).reverse();
  el.innerHTML=ids.length?`${sh.map(id=>face(id)).join("")}<span>${ids.length} ${ids.length===1?"member":"members"}</span>`:""}
function gBody(anim){
  const el=$("#gBody");if(!el)return;
  el.innerHTML=({study:gStudy,ice:gIce,games:gGames,test:gTest,prayer:gPrayer,topics:gTopics})[G.sub]();
  ({study:wStudy,ice:wIce,games:wGames,test:wTest,prayer:wPrayer,topics:wTopics})[G.sub]();
  if(anim&&!reduced())el.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"none"}],{duration:320,easing:"cubic-bezier(.16,1,.3,1)"});
}
/* repaint only the live slots, never the inputs someone may be typing in */
function gPaint(part){
  if(view==="today"&&$("#gTeaser"))$("#gTeaser").outerHTML=groupTeaser();
  if(view!=="group")return;
  gFaces();liveBanner();
  if(G.game||G.test)return;
  if(G.sub==="study")paintStudy();
  else if(G.sub==="prayer")paintPrayer();
  else if(G.sub==="topics")paintTopics();
  else if(G.sub==="games")paintBoard();
  else if(G.sub==="test")paintTestBoard();
  else if(G.sub==="ice"&&part==="ice")gBody();
}

/* ---------- Study ---------- */
function gStudy(){
  const w=WK();const a=mine().ans?.[w.id]||{};const ck=mine().ck?.[w.id]||{};
  return `<section class="card gcard">
    <div class="kicker">The passage in a nutshell</div><p class="glead">${esc(w.sum)}</p>
    <details class="gbg"><summary>${I.spark}Background that helps</summary><p>${esc(w.bg)}</p></details>
    <div class="gcheck"><button class="tick ${ck.read?"on":""}" data-ck="read">${I.check}<span>I've read it</span></button><span class="whos" id="gw-read"></span></div>
  </section>
  <section class="card gkv"><div class="kicker">Key verse · Matthew ${w.kv[0]}:${w.kv[1]}</div><blockquote id="gKv">…</blockquote><div class="gkv-btns"><button class="btn sm ghost" id="gKvSave">${I.bookmark}Save to my journal</button><button class="btn sm ghost" id="gKvGame">${I.spark}Practise it as a game</button></div></section>
  <section class="gqs"><div class="ghead2"><h2>Discussion</h2><p class="muted">Three kinds of questions: what it shows about God, about us, and how to live it. Your answers are shared with the group.</p></div>
  ${w.qs.map(([k,q],i)=>`<article class="card gq" data-qi="${i}"><div class="gq-k k-${k.toLowerCase()}">${k==="God"?"About God":k==="Us"?"About us":"Live it"}</div><h3>${esc(q)}</h3>
    <textarea class="ganswer" data-qa="${i}" rows="2" placeholder="Your thoughts…" ${G.ro?"disabled":""}>${esc(a["q"+i]||"")}</textarea>
    <div class="gq-foot"><span class="saved" id="gs-${i}"></span><button class="linkbtn" data-others="${i}" aria-expanded="false"></button></div>
    <div class="others" id="go-${i}" hidden></div></article>`).join("")}</section>
  <section class="grid2">
    <article class="card gtry"><div class="kicker">Try this week</div><p>${esc(w.tryit)}</p><div class="gcheck"><button class="tick ${ck.tried?"on":""}" data-ck="tried">${I.check}<span>I did it</span></button><span class="whos" id="gw-tried"></span></div></article>
    <article class="card gpray"><div class="kicker">Pray together</div><p>${esc(w.pray)}</p><button class="btn sm ghost" data-gt-go="prayer">Open the prayer wall</button></article>
  </section>`;
}
function wStudy(){
  const w=WK();
  kvText(w).then(t=>{const el=$("#gKv");if(el)el.textContent=t||w.ref});
  $("#gKvSave").onclick=async()=>{const t=await kvText(w);const key=`MAT.${w.kv[0]}.${w.kv[1]}`;if(state.saved[key]){toast("Already in your journal");return}const it={ref:`Matthew ${w.kv[0]}:${w.kv[1]}`,text:t,tr:"BSB",day:0,v:w.kv[1],at:new Date().toISOString()};state.saved[key]=it;queue({saved:{[key]:it}});burst($("#gKvSave"),12);toast("Saved. Practise it in Journal → Memorize")};
  $("#gKvGame").onclick=()=>{G.sub="games";document.querySelectorAll("[data-gt]").forEach(x=>x.setAttribute("aria-selected",x.dataset.gt==="games"));gTabInd();startGame("verse")};
  document.querySelectorAll("[data-gt-go]").forEach(b=>b.onclick=()=>$(`[data-gt="${b.dataset.gtGo}"]`).click());
  document.querySelectorAll("[data-ck]").forEach(b=>b.onclick=()=>{if(G.ro&&G.on){toast("Saving to the group isn't available for you yet");return}const k=b.dataset.ck;const on=!b.classList.contains("on");b.classList.toggle("on",on);if(on){burst(b,10);buzz(10)}gWrite({ck:{[w.id]:{[k]:on}}},1);paintStudy()});
  document.querySelectorAll("[data-qa]").forEach(t=>{const i=t.dataset.qa;const fit=()=>{t.style.height="auto";t.style.height=Math.min(320,t.scrollHeight+2)+"px"};fit();
    t.oninput=()=>{fit();$("#gs-"+i).textContent="Saving…";clearTimeout(t._t);t._t=setTimeout(()=>{gWrite({ans:{[w.id]:{["q"+i]:t.value.trim()?t.value:null}}});$("#gs-"+i).textContent=G.ref?"Saved":"Saved on this device";setTimeout(()=>{const s=$("#gs-"+i);if(s)s.textContent=""},1800)},500)}});
  document.querySelectorAll("[data-others]").forEach(b=>b.onclick=()=>{const o=$("#go-"+b.dataset.others);const open=o.hidden;o.hidden=!open;b.setAttribute("aria-expanded",open);paintStudy();if(open&&!reduced())o.animate([{opacity:0,transform:"translateY(-4px)"},{opacity:1,transform:"none"}],{duration:240})});
  paintStudy();
}
function paintStudy(){
  const w=WK();const ids=members();
  ["read","tried"].forEach(k=>{const el=$("#gw-"+k);if(!el)return;const who=ids.filter(id=>G.people[id].ck?.[w.id]?.[k]);el.innerHTML=who.length?`${who.slice(0,7).map(id=>face(id,"sm")).join("")}<small>${who.length===1&&who[0]===myKey()?"Just you so far":who.length+" in the group"}</small>`:""});
  w.qs.forEach((_,i)=>{const others=ids.filter(id=>id!==myKey()&&G.people[id].ans?.[w.id]?.["q"+i]);const b=$(`[data-others="${i}"]`);if(!b)return;
    b.textContent=others.length?`${others.length} ${others.length===1?"answer":"answers"} from the group`:(G.on?"No one else has answered yet":"");b.disabled=!others.length;
    const o=$("#go-"+i);if(o&&!o.hidden)o.innerHTML=others.map(id=>`<div class="oans">${face(id,"sm")}<div><b>${esc(pname(id))}</b><p>${esc(G.people[id].ans[w.id]["q"+i])}</p></div></div>`).join("")});
}

/* ---------- Icebreakers ---------- */
let iceI=0;
function iceList(){
  const w=WK();const r=seeded(isoWeek()*97+wkIdx(w.id)*13+7);const deck=ICE.slice().sort(()=>r()-.5).slice(0,4);
  return [...(G.ice?.[w.id]||[]),...w.ice,...deck].filter((x,i,a)=>x&&a.indexOf(x)===i);
}
function gIce(){
  const L=iceList();iceI=Math.min(iceI,L.length-1);
  return `<section class="icewrap">
    <div class="icecard" id="iceCard" tabindex="0" aria-live="polite"><div class="ice-n" id="iceN">${iceI+1} / ${L.length}</div><p id="iceQ">${esc(L[iceI])}</p><div class="ice-hint">Swipe or tap the arrows</div></div>
    <div class="icebtns"><button class="icon-btn" id="icePrev" aria-label="Previous icebreaker">${I.left}</button><button class="btn ghost" id="iceShuf">${I.spark}Surprise me</button><button class="btn ghost" id="iceGen">${I.ask}Make new ones</button><button class="icon-btn" id="iceNext" aria-label="Next icebreaker">${I.right}</button></div>
    <p class="muted icefoot">A fresh set every week, matched to the passage. Tip from small-group leaders: share it a couple of days before you meet so people come ready.</p>
  </section>
  <section class="card wheelcard"><div class="ghead2"><h2>Who goes first?</h2><p class="muted">Spin to pick who answers the icebreaker.</p></div>
    <div class="wheel-row"><div class="wheel" id="wheel"><svg viewBox="-110 -110 220 220" id="wheelSvg"></svg><i class="wheel-pin"></i><button class="wheel-hub" id="spin">Spin</button></div>
    <div class="wheel-side"><div class="wnames" id="wNames"></div><form id="wAdd" class="wadd"><input id="wIn" placeholder="Add a name" maxlength="20" aria-label="Add a name to the wheel"><button class="btn sm ghost">Add</button></form><div class="wres" id="wRes" aria-live="polite"></div></div></div>
  </section>`;
}
let wheelExtra=null,wheelOff=new Set(),wheelRot=0;
function wheelNames(){if(!wheelExtra){try{wheelExtra=JSON.parse(localStorage.getItem("lamp-wheel")||"[]")}catch(e){wheelExtra=[]}}
  const ids=members().map(id=>id===myKey()?(ME.first||"Me"):pfirst(id));return [...new Set([...ids,...wheelExtra])].filter(n=>!wheelOff.has(n))}
function drawWheel(){const N=wheelNames();const svg=$("#wheelSvg");if(!svg)return;const cols=["var(--c1)","var(--c2)","var(--c3)","var(--c4)","var(--bronze,var(--gold))","var(--accent)"];
  if(N.length<2){svg.innerHTML=`<circle r="104" fill="var(--sunk)"/><text text-anchor="middle" y="-40" class="wtxt" style="fill:var(--muted)">Add names</text>`;}
  else svg.innerHTML=N.map((n,i)=>{const a0=i/N.length*Math.PI*2-Math.PI/2,a1=(i+1)/N.length*Math.PI*2-Math.PI/2,am=(a0+a1)/2;const big=a1-a0>Math.PI?1:0;
    return `<path d="M0 0L${104*Math.cos(a0)} ${104*Math.sin(a0)}A104 104 0 ${big} 1 ${104*Math.cos(a1)} ${104*Math.sin(a1)}Z" fill="${cols[i%cols.length]}" opacity="${.55+.45*((i%2))}"/><text transform="rotate(${am*180/Math.PI}) translate(62 0)" text-anchor="middle" dominant-baseline="middle" class="wtxt">${esc(n.length>11?n.slice(0,10)+"…":n)}</text>`}).join("")+`<circle r="104" fill="none" stroke="var(--line)" stroke-width="2"/>`;
  svg.style.transform=`rotate(${wheelRot}deg)`;
  $("#wNames").innerHTML=[...new Set([...members().map(id=>id===myKey()?(ME.first||"Me"):pfirst(id)),...wheelExtra])].map(n=>`<button class="wn ${wheelOff.has(n)?"off":""}" data-wn="${esc(n)}" title="Tap to include or leave out">${esc(n)}</button>`).join("");
  document.querySelectorAll("[data-wn]").forEach(b=>b.onclick=()=>{const n=b.dataset.wn;wheelOff.has(n)?wheelOff.delete(n):wheelOff.add(n);drawWheel()});
}
function wIce(){
  const L=iceList();const show=(d)=>{iceI=(iceI+d+L.length)%L.length;const c=$("#iceCard");const go=()=>{$("#iceQ").textContent=L[iceI];$("#iceN").textContent=`${iceI+1} / ${L.length}`};
    if(reduced()||!c.animate){go();return}c.animate([{transform:"none",opacity:1},{transform:`translateX(${-d*40}px) rotate(${-d*4}deg)`,opacity:0}],{duration:160,easing:"ease-in"}).onfinish=()=>{go();c.animate([{transform:`translateX(${d*40}px) rotate(${d*4}deg)`,opacity:0},{transform:"none",opacity:1}],{duration:320,easing:"cubic-bezier(.16,1,.3,1)"})}};
  $("#icePrev").onclick=()=>show(-1);$("#iceNext").onclick=()=>show(1);
  $("#iceShuf").onclick=()=>{const c=$("#iceCard");const q=ICE[Math.floor(Math.random()*ICE.length)];$("#iceQ").textContent=q;$("#iceN").textContent="Surprise";if(!reduced())c.animate([{transform:"rotateY(0)"},{transform:"rotateY(180deg)",offset:.5},{transform:"rotateY(360deg)"}],{duration:600,easing:"cubic-bezier(.16,1,.3,1)"});buzz(8)};
  let sx=null;const c=$("#iceCard");c.addEventListener("pointerdown",e=>sx=e.clientX);c.addEventListener("pointerup",e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>40)show(dx<0?1:-1)});
  c.addEventListener("keydown",e=>{if(e.key==="ArrowRight")show(1);if(e.key==="ArrowLeft")show(-1)});
  $("#iceGen").onclick=genIce;
  drawWheel();
  $("#wAdd").onsubmit=e=>{e.preventDefault();const v=$("#wIn").value.trim();if(!v)return;wheelExtra=[...wheelExtra,v].slice(-20);try{localStorage.setItem("lamp-wheel",JSON.stringify(wheelExtra))}catch(e){};$("#wIn").value="";drawWheel()};
  $("#spin").onclick=()=>{const N=wheelNames();if(N.length<2){toast("Add at least two names");return}
    const pick=Math.floor(Math.random()*N.length);const seg=360/N.length;const target=360-(pick*seg+seg/2);
    wheelRot=wheelRot-(wheelRot%360)+360*5+target;const svg=$("#wheelSvg");svg.style.transition=reduced()?"none":"transform 4.2s cubic-bezier(.12,.75,.1,1)";svg.style.transform=`rotate(${wheelRot}deg)`;
    $("#wRes").textContent="";$("#spin").disabled=true;
    setTimeout(()=>{$("#spin").disabled=false;$("#wRes").innerHTML=`<b>${esc(N[pick])}</b> goes first!`;burst($("#wheel"),24);buzz(30)},reduced()?50:4300)};
}
async function genIce(){
  const sample=await getSample();const w=WK();
  if(!sample){toast("New icebreakers are made by Claude, so open Lamp inside Claude to use this.");return}
  const b=$("#iceGen");b.disabled=true;b.innerHTML=`<span class="thinking"><i></i><i></i><i></i></span> Thinking…`;
  try{
    const r=await sample.json(`Write 5 fresh icebreaker questions for an adult church small group about to study ${w.ref} ("${w.title}": ${w.sum}). Mix: 3 light and fun, easy for anyone to answer, no wrong answers, not too personal; 2 that gently lead into the passage's theme without needing Bible knowledge. Each under 110 characters, warm, plain English, no numbering. Avoid these: ${iceList().slice(0,8).join(" | ")}. Reply as JSON: {"ice":["...", "..."]}`,{modelTier:"quick"});
    const L=(r?.ice||r||[]).filter(x=>typeof x==="string"&&x.length<160).slice(0,5);
    if(!L.length)throw 0;
    const cur=G.ice?.[w.id]||[];const next=[...L,...cur].slice(0,15);G.ice={...G.ice,[w.id]:next};
    if(G.db&&!G.ro){try{const ref=G.db.doc("group/ice");await ref.set({...G.ice})}catch(e){}}
    iceI=0;gBody();toast(G.db&&!G.ro?"5 new icebreakers, shared with the group":"5 new icebreakers");
  }catch(e){toast(e?.code?errMsg(e):"Couldn't make new ones just now. Try again.");b.disabled=false;b.innerHTML=`${I.ask}Make new ones`}
}

/* ---------- Games ---------- */
const GAMES=[["match","Memory match","Flip cards to pair each phrase with its ending.","🃏"],["verse","Verse builder","Rebuild this week's key verse, word by word.","🧩"],["quiz","Quick quiz","Eight questions against the clock, with a speed bonus.","⚡"],["live","Play together","A live quiz on everyone's phone, with a scoreboard.","🎉"]];
function gGames(){
  if(G.game)return `<div id="gGame" class="gamebox"></div>`;
  const w=WK();const sc=mine().sc?.[w.id]||{};
  return `<section class="gamegrid">${GAMES.map(([k,t,d,e])=>`<button class="gamecard g-${k}" data-game="${k}"><span class="gemoji" aria-hidden="true">${e}</span><b>${t}</b><span>${d}</span>${k!=="live"&&sc[k]?`<em>Your best: ${sc[k]}</em>`:k==="live"&&G.live&&G.live.ph!=="end"?`<em class="hot">Game on now</em>`:""}</button>`).join("")}</section>
  <section class="card"><div class="ghead2"><h2>This week's leaderboard</h2><p class="muted">Best score in each game for ${esc(w.ref)}, added up.</p></div><div id="gBoard" class="board"></div></section>`;
}
function wGames(){if(G.game){runGame();return}document.querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>startGame(b.dataset.game));paintBoard()}
function paintBoard(){const el=$("#gBoard");if(!el)return;const w=WK();
  const rows=members().map(id=>{const s=G.people[id].sc?.[w.id]||{};return[id,(s.match||0)+(s.verse||0)+(s.quiz||0)+(s.live||0),s]}).filter(r=>r[1]>0).sort((a,b)=>b[1]-a[1]);
  el.innerHTML=rows.length?rows.map(([id,t,s],i)=>`<div class="brow ${id===myKey()?"me":""}"><span class="rank">${i<3?["🥇","🥈","🥉"][i]:i+1}</span>${face(id,"sm")}<b>${esc(pname(id))}</b><span class="bparts">${["match","verse","quiz","live"].filter(k=>s[k]).map(k=>`${GAMES.find(g=>g[0]===k)[3]} ${s[k]}`).join(" · ")}</span><strong>${t}</strong></div>`).join(""):`<p class="muted">No scores yet this week. Be the first!</p>`}
function startGame(k){G.game={k};if(G.sub!=="games"){G.sub="games"}gBody(true);$("#gBody")?.scrollIntoView({block:"start",behavior:reduced()?"auto":"smooth"})}
function endGame(){G.game=null;gBody(true)}
function saveScore(k,pts){const w=WK();const prev=mine().sc?.[w.id]?.[k]||0;if(pts>prev){gWrite({sc:{[w.id]:{[k]:pts}}},1);return true}return false}
function gameShell(title,inner){return `<div class="ghd"><button class="btn sm ghost" id="gBack">${I.left}Games</button><b>${title}</b><span class="gstat" id="gStat"></span></div>${inner}`}
function runGame(){const k=G.game.k;({match:gmMatch,verse:gmVerse,quiz:gmQuiz,live:gmLive})[k]();$("#gBack")?.addEventListener("click",()=>{if(k==="live")liveLeave();endGame()})}
function finishCard(title,pts,best,again){
  $("#gGame").innerHTML=gameShell(title,`<div class="gdone"><div class="gscore">${pts}</div><p>${best?"New personal best!":"points"}</p><div class="gbtns"><button class="btn primary" id="gAgain">Play again</button><button class="btn ghost" id="gHome">All games</button></div></div>`);
  burst($(".gscore"),30);buzz(40);$("#gAgain").onclick=again;$("#gHome").onclick=endGame;$("#gBack").onclick=endGame;
}
function gmMatch(){
  const w=WK();const cards=shuffle(w.pairs.flatMap(([a,b],i)=>[{t:a,p:i,s:0},{t:b,p:i,s:1}]));
  let open=[],got=0,moves=0,t0=0,lock=false,tick=null;
  $("#gGame").innerHTML=gameShell("Memory match",`<p class="muted gintro">Match each phrase from ${esc(w.ref)} with the words that complete it.</p><div class="mgrid">${cards.map((c,i)=>`<button class="mcard" data-mi="${i}" aria-label="Hidden card"><span class="mf mf-back">${I.logo}</span><span class="mf mf-front ${c.s?"end":""}">${esc(c.t)}</span></button>`).join("")}</div>`);
  const stat=()=>{$("#gStat").textContent=`${moves} moves · ${t0?Math.floor((Date.now()-t0)/1e3):0}s`};stat();
  document.querySelectorAll("[data-mi]").forEach(b=>b.onclick=()=>{
    if(lock||b.classList.contains("up"))return;if(!t0){t0=Date.now();tick=setInterval(()=>{if(!$("#gStat")){clearInterval(tick);return}stat()},1000)}
    b.classList.add("up");b.setAttribute("aria-label",cards[b.dataset.mi].t);open.push(b);buzz(5);
    if(open.length===2){moves++;stat();const [x,y]=open.map(e=>cards[e.dataset.mi]);
      if(x.p===y.p){open.forEach(e=>e.classList.add("got"));burst(open[1],8);open=[];got++;
        if(got===w.pairs.length){clearInterval(tick);const secs=Math.round((Date.now()-t0)/1e3);const pts=Math.max(100,1000-Math.max(0,moves-6)*40-secs*4);setTimeout(()=>finishCard("Memory match",pts,saveScore("match",pts),gmMatch),700)}}
      else{lock=true;setTimeout(()=>{open.forEach(e=>{e.classList.remove("up");e.setAttribute("aria-label","Hidden card")});open=[];lock=false},900)}}
  });
}
async function gmVerse(){
  const w=WK();$("#gGame").innerHTML=gameShell("Verse builder",`<div class="skel">${"<i></i>".repeat(3)}</div>`);
  const t=(await kvText(w))||"";if(!$("#gGame"))return;
  const words=t.split(/\s+/).filter(Boolean);let i=0,miss=0,t0=Date.now();
  const pool=shuffle(words.map((x,k)=>({x,k})));
  $("#gGame").innerHTML=gameShell("Verse builder",`<p class="muted gintro">Tap the words in order to rebuild Matthew ${w.kv[0]}:${w.kv[1]}.</p><div class="vbuild" id="vBuilt" aria-live="polite"></div><div class="vpool">${pool.map(o=>`<button class="vw" data-vk="${o.k}">${esc(o.x)}</button>`).join("")}</div><button class="linkbtn" id="vHint">Show me the next word</button>`);
  const stat=()=>{$("#gStat").textContent=`${i}/${words.length} · ${miss} slips`};stat();
  const place=(b)=>{$("#vBuilt").insertAdjacentHTML("beforeend",`<span>${esc(words[i])}</span>`);b.classList.add("used");b.disabled=true;i++;stat();
    if(i===words.length){const secs=Math.round((Date.now()-t0)/1e3);const pts=Math.max(100,1000-miss*60-secs*5);setTimeout(()=>finishCard("Verse builder",pts,saveScore("verse",pts),gmVerse),600)}};
  document.querySelectorAll("[data-vk]").forEach(b=>b.onclick=()=>{const k=+b.dataset.vk;
    if(words[k]===words[i]){if(k!==i){const real=$(`[data-vk="${i}"]`);if(real&&!real.disabled){place(real);return}}place(b);buzz(5)}
    else{miss++;stat();buzz([20,40,20]);if(!reduced())b.animate([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}],{duration:260})}});
  $("#vHint").onclick=()=>{const real=[...document.querySelectorAll("[data-vk]")].find(b=>!b.disabled&&words[+b.dataset.vk]===words[i]);if(real){miss++;real.classList.add("hint");setTimeout(()=>real.classList.remove("hint"),900)}};
}
function quizPool(){const w=WK();const idx=wkIdx(w.id);const own=w.quiz.map(q=>[...q,w.ref]);
  const rest=shuffle(SERIES.weeks.filter((x,i)=>i!==idx&&i<=Math.max(idx,wkIdx(curWk()))).flatMap(x=>x.quiz.map(q=>[...q,x.ref]))).slice(0,4);
  return shuffle([...own,...rest]).map(([q,o,r])=>{const opts=shuffle(o.map((t,k)=>({t,ok:k===0})));return{q,o:opts.map(x=>x.t),c:opts.findIndex(x=>x.ok),r}})}
function gmQuiz(){
  const Q=quizPool();let i=0,pts=0,streak=0,timer=null,t0=0;
  const draw=()=>{const q=Q[i];t0=Date.now();
    $("#gGame").innerHTML=gameShell("Quick quiz",`<div class="qbar"><i id="qT"></i></div><div class="qcard"><div class="kicker">Question ${i+1} of ${Q.length} · ${esc(q.r)}</div><h3>${esc(q.q)}</h3><div class="qopts">${q.o.map((t,k)=>`<button class="qo q${k}" data-qo="${k}">${esc(t)}</button>`).join("")}</div></div>`);
    $("#gStat").textContent=`${pts} pts${streak>1?` · 🔥${streak}`:""}`;$("#gBack").onclick=()=>{clearInterval(timer);endGame()};
    const T=$("#qT");timer=setInterval(()=>{const f=1-(Date.now()-t0)/15000;if(!$("#qT")){clearInterval(timer);return}T.style.width=Math.max(0,f*100)+"%";if(f<=0){clearInterval(timer);answer(-1)}},100);
    document.querySelectorAll("[data-qo]").forEach(b=>b.onclick=()=>{clearInterval(timer);answer(+b.dataset.qo)});};
  const answer=k=>{const q=Q[i];const ok=k===q.c;document.querySelectorAll("[data-qo]").forEach(b=>{b.disabled=true;const n=+b.dataset.qo;b.classList.toggle("right",n===q.c);b.classList.toggle("wrong",n===k&&!ok)});
    if(ok){streak++;const gain=Math.round(100+100*Math.max(0,1-(Date.now()-t0)/15000))+(streak>2?25:0);pts+=gain;burst($(`[data-qo="${k}"]`),10);buzz(10)}else{streak=0;buzz([30,40,30])}
    $("#gStat").textContent=`${pts} pts${streak>1?` · 🔥${streak}`:""}`;
    setTimeout(()=>{i++;if(i<Q.length)draw();else finishCard("Quick quiz",pts,saveScore("quiz",pts),gmQuiz)},ok?900:1600)};
  draw();
}

/* ---------- Live quiz (everyone's phone) ---------- */
let liveSeen=null;
function liveBanner(){const el=$("#gLive");if(!el)return;const L=G.live;
  if(!L||L.ph==="end"||Date.now()-(L.at||0)>3*36e5||(G.game&&G.game.k==="live")){el.innerHTML="";return}
  el.innerHTML=`<button class="livebar" id="liveJoin"><span class="pulse"></span><b>${L.ph==="lobby"?"A live quiz is about to start":"A live quiz is happening now"}</b><span>Hosted by ${esc(pfirst(L.host))} · tap to join</span></button>`;
  $("#liveJoin").onclick=()=>{G.sub="games";render();startGame("live")};
}
function liveSync(was){gPaint();if(G.game?.k==="live"&&$("#gGame"))gmLive()}
const LIVE_T=20000;
function liveQs(){return quizPool().slice(0,8).map(q=>[q.q,q.o,q.c,q.r])}
async function liveHost(){
  if(!G.db||G.ro){toast("Live games need Lamp open inside Claude with edit access.");return}
  const g={id:Math.random().toString(36).slice(2,9),host:G.id,at:Date.now(),ph:"lobby",i:0,qs:liveQs(),wk:WK().id};
  try{await G.db.doc("live/game").set(g);G.live=g;await liveJoin();gmLive()}catch(e){toast("Couldn't start a game. Check you have edit access.")}
}
async function liveJoin(){if(!G.db||!G.live)return;const me=G.lv[G.id];if(me?.g===G.live.id)return;const d={g:G.live.id,a:{},at:Date.now()};G.lv={...G.lv,[G.id]:d};try{await G.db.collection("lv").doc(G.id).set(d)}catch(e){}}
function liveLeave(){}
async function liveSet(p){if(!G.db||!G.live)return;const g={...G.live,...p};G.live=g;try{await G.db.doc("live/game").update(p)}catch(e){toast("That didn't go through. Try again.")}gmLive()}
function liveScores(){const L=G.live;const out={};for(const [id,d] of Object.entries(G.lv)){if(d.g!==L.id)continue;let s=0;for(const [k,a] of Object.entries(d.a||{})){const q=L.qs[+k];if(q&&a.c===q[2])s+=Math.round(500+500*Math.max(0,1-(a.ms||LIVE_T)/LIVE_T))}out[id]=s}return out}
let liveTick=null,liveShownAt={};
function gmLive(){
  const box=$("#gGame");if(!box)return;const L=G.live;const host=L&&(L.host===G.id||(ME.owner&&L.host!==G.id&&false));
  clearInterval(liveTick);
  if(!G.on){box.innerHTML=gameShell("Play together",`<div class="gdone"><p>Live games connect everyone's phones, so they work when Lamp is open inside Claude.</p></div>`);return}
  if(!L||L.ph==="end"&&Date.now()-(L.at||0)>6e5||Date.now()-(L.at||0)>3*36e5){
    box.innerHTML=gameShell("Play together",`<div class="live-intro"><div class="gemoji big">🎉</div><h3>Host a live quiz</h3><p>Everyone opens Lamp, goes to Group → Games, and joins. Questions appear on every phone at once, and the fastest right answers score the most.</p><button class="btn primary" id="lvHost">Start a game for ${esc(WK().ref)}</button></div>`);
    $("#lvHost").onclick=liveHost;$("#gBack").onclick=endGame;return}
  const joined=Object.entries(G.lv).filter(([,d])=>d.g===L.id).map(([id])=>id);
  if(!joined.includes(G.id)&&L.ph!=="end"){liveJoin()}
  const sc=liveScores();const board=joined.slice().sort((a,b)=>(sc[b]||0)-(sc[a]||0));
  const boardHTML=(n)=>`<div class="lboard">${board.slice(0,n).map((id,i)=>`<div class="brow ${id===G.id?"me":""}" style="--i:${i}"><span class="rank">${i<3?["🥇","🥈","🥉"][i]:i+1}</span>${face(id,"sm")}<b>${esc(pname(id))}</b><strong>${sc[id]||0}</strong></div>`).join("")}</div>`;
  if(L.ph==="lobby"){
    box.innerHTML=gameShell("Play together",`<div class="live-lobby"><div class="kicker">Waiting for players</div><h3>${joined.length} joined</h3><div class="lfaces">${joined.map(id=>`<span class="lf">${face(id)}<small>${esc(pfirst(id))}</small></span>`).join("")}</div>${host?`<button class="btn primary" id="lvStart" ${joined.length<1?"disabled":""}>Start the quiz</button><p class="muted">You're the host. Start when everyone is in.</p>`:`<p class="muted">${esc(pfirst(L.host))} will start the quiz soon. Keep this screen open.</p>`}</div>`);
    $("#lvStart")?.addEventListener("click",()=>liveSet({ph:"q",i:0,qAt:Date.now()}));$("#gBack").onclick=endGame;return}
  if(L.ph==="q"){
    const q=L.qs[L.i];const my=G.lv[G.id]?.a?.[L.i];const key=L.id+":"+L.i;if(!liveShownAt[key])liveShownAt[key]=Date.now();
    const answered=joined.filter(id=>G.lv[id]?.a?.[L.i]).length;
    box.innerHTML=gameShell("Play together",`<div class="qbar"><i id="qT"></i></div><div class="qcard live"><div class="kicker">Question ${L.i+1} of ${L.qs.length} · ${answered}/${joined.length} answered</div><h3>${esc(q[0])}</h3><div class="qopts">${q[1].map((t,k)=>`<button class="qo q${k} ${my&&my.c===k?"picked":""}" data-lo="${k}" ${my?"disabled":""}>${esc(t)}</button>`).join("")}</div>${my?`<p class="muted lwait">Locked in. Waiting for the others…</p>`:""}${host?`<div class="hostbar"><button class="btn primary" id="lvRev">Show the answer</button></div>`:""}</div>`);
    $("#gStat").textContent=`${sc[G.id]||0} pts`;$("#gBack").onclick=endGame;
    const T=$("#qT");const t0=liveShownAt[key];const upd=()=>{const f=1-(Date.now()-t0)/LIVE_T;if(!$("#qT")){clearInterval(liveTick);return}T.style.width=Math.max(0,f*100)+"%";if(f<=0){clearInterval(liveTick);document.querySelectorAll("[data-lo]").forEach(b=>b.disabled=true);if(host&&G.live.ph==="q"&&G.live.i===L.i)liveSet({ph:"rev"})}};upd();liveTick=setInterval(upd,120);
    document.querySelectorAll("[data-lo]").forEach(b=>b.onclick=async()=>{const c=+b.dataset.lo;const ms=Date.now()-t0;b.classList.add("picked");document.querySelectorAll("[data-lo]").forEach(x=>x.disabled=true);buzz(10);
      const d=G.lv[G.id]||{g:L.id,a:{}};const nd={...d,a:{...(d.a||{}),[L.i]:{c,ms}}};G.lv={...G.lv,[G.id]:nd};try{await G.db.collection("lv").doc(G.id).update({a:{[L.i]:{c,ms}}})}catch(e){try{await G.db.collection("lv").doc(G.id).set(nd)}catch(e2){}}
      if(host&&joined.every(id=>G.lv[id]?.a?.[L.i]))setTimeout(()=>{if(G.live.ph==="q"&&G.live.i===L.i)liveSet({ph:"rev"})},600);gmLive()});
    $("#lvRev")?.addEventListener("click",()=>liveSet({ph:"rev"}));
    if(host&&answered>=joined.length&&joined.length)setTimeout(()=>{if(G.live.ph==="q"&&G.live.i===L.i)liveSet({ph:"rev"})},900);
    return}
  if(L.ph==="rev"){
    const q=L.qs[L.i];const counts=q[1].map((_,k)=>joined.filter(id=>G.lv[id]?.a?.[L.i]?.c===k).length);const mx=Math.max(1,...counts);const my=G.lv[G.id]?.a?.[L.i];const ok=my&&my.c===q[2];
    box.innerHTML=gameShell("Play together",`<div class="qcard live"><div class="kicker">Question ${L.i+1} of ${L.qs.length}</div><h3>${esc(q[0])}</h3>
      <div class="lres ${ok?"ok":"no"}">${ok?"Correct!":my?"Not this time":"No answer"}</div>
      <div class="lbars">${q[1].map((t,k)=>`<div class="lbar ${k===q[2]?"right":""}"><span>${esc(t)}</span><i style="--w:${counts[k]/mx*100}%"></i><b>${counts[k]}</b></div>`).join("")}</div>
      <p class="muted">${esc(q[3]||"")}</p>${boardHTML(5)}
      ${host?`<div class="hostbar"><button class="btn primary" id="lvNext">${L.i+1<L.qs.length?"Next question":"See the winners"}</button></div>`:""}</div>`);
    if(ok&&!liveShownAt["b"+L.id+L.i]){liveShownAt["b"+L.id+L.i]=1;burst($(".lres"),16);buzz(20)}
    $("#gStat").textContent=`${sc[G.id]||0} pts`;$("#gBack").onclick=endGame;
    $("#lvNext")?.addEventListener("click",()=>L.i+1<L.qs.length?liveSet({ph:"q",i:L.i+1,qAt:Date.now()}):liveSet({ph:"end"}));return}
  if(L.ph==="end"){
    const top=board.slice(0,3);
    box.innerHTML=gameShell("Play together",`<div class="podium">${[1,0,2].filter(i=>top[i]).map(i=>`<div class="pod p${i}">${face(top[i])}<b>${esc(pfirst(top[i]))}</b><span>${sc[top[i]]||0}</span><i>${i+1}</i></div>`).join("")}</div>${boardHTML(20)}<div class="gbtns center">${host||!G.live?`<button class="btn primary" id="lvHost">New game</button>`:""}<button class="btn ghost" id="gHome">All games</button></div>`);
    if(!liveShownAt["end"+L.id]){liveShownAt["end"+L.id]=1;setTimeout(()=>burst($(".podium"),40),300);if(sc[G.id])saveScore("live",sc[G.id])}
    $("#lvHost")?.addEventListener("click",liveHost);$("#gHome").onclick=endGame;$("#gBack").onclick=endGame;return}
}

/* ---------- Bible test (hard, context based) ---------- */
let TESTS=null;function loadTests(){if(!TESTS)TESTS=fetch("tests.json").then(r=>{if(!r.ok)throw 0;return r.json()}).catch(()=>{TESTS=null;return null});return TESTS}
function myTests(){return {...(state.tests||{}),...(mine().tests||{})}}
function gTest(){
  if(G.test)return `<div id="gGame" class="gamebox testbox"></div>`;
  return `<section class="card thero"><div class="kicker">Test your knowledge</div><h2>How well do you really know it?</h2><p>These are deliberately hard. Most answers depend on who is speaking, what happened just before, or the Old Testament story behind a verse. Stuck? Tap <b>Read the context</b>, read the passage, then answer. You'll learn far more than you'd guess.</p></section>
  <section class="tgrid2" id="tSets"><div class="skel">${"<i></i>".repeat(4)}</div></section>
  <section class="card tmake"><div class="ghead2"><h2>Test me on any chapter</h2><p class="muted">Claude writes fresh, hard questions on the passage you choose.</p></div><form id="tMake" class="tmakef"><input id="tRef" placeholder="e.g. John 4, Ruth 1, Acts 2" aria-label="Chapter to be tested on"><button class="btn primary">Make a test</button></form></section>
  <section class="card"><div class="ghead2"><h2>Test champions</h2><p class="muted">Total of everyone's best scores across the tests.</p></div><div id="tBoard" class="board"></div></section>`;
}
async function wTest(){
  if(G.test){runTest();return}
  paintTestBoard();
  $("#tMake").onsubmit=e=>{e.preventDefault();makeTest($("#tRef").value)};
  const T=await loadTests();const box=$("#tSets");if(!box)return;
  if(!T){box.innerHTML=`<p class="muted">The tests couldn't load. Check your connection and try again.</p>`;return}
  const my=myTests();
  box.innerHTML=T.map(t=>{const b=my[t.id];return `<button class="tset" data-ts="${t.id}"><span class="tico">${esc(t.title.split(/\s+/).map(x=>x[0]).join("").slice(0,2))}</span><b>${esc(t.title)}</b><small>${esc(t.ref)} · ${t.qs.length} questions</small>${b?`<span class="tbest" style="--p:${b.best/t.qs.length*100}%"><i></i>${b.best}/${t.qs.length}</span>`:`<span class="tnew">Not tried yet</span>`}</button>`}).join("");
  box.querySelectorAll("[data-ts]").forEach(b=>b.onclick=()=>{const t=T.find(x=>x.id===b.dataset.ts);G.test={t,i:0,right:0,log:[]};gBody(true);$("#gBody").scrollIntoView({block:"start",behavior:reduced()?"auto":"smooth"})});
}
function paintTestBoard(){const el=$("#tBoard");if(!el)return;
  const rows=members().map(id=>{const t=G.people[id].tests||{};return[id,Object.values(t).reduce((s,x)=>s+(x?.best||0),0),Object.keys(t).length]}).filter(r=>r[1]>0).sort((a,b)=>b[1]-a[1]);
  el.innerHTML=rows.length?rows.map(([id,s,n],i)=>`<div class="brow ${id===myKey()?"me":""}"><span class="rank">${i<3?["🥇","🥈","🥉"][i]:i+1}</span>${face(id,"sm")}<b>${esc(pname(id))}</b><span class="bparts">${n} test${n>1?"s":""}</span><strong>${s}</strong></div>`).join(""):`<p class="muted">Nobody has finished a test yet.</p>`}
function runTest(){
  const T=G.test;const t=T.t;const box=$("#gGame");if(!box)return;
  if(T.i>=t.qs.length){
    const pct=Math.round(T.right/t.qs.length*100);const prev=myTests()[t.id]?.best||0;const best=T.right>prev;
    if(best&&!t.gen){const v={best:T.right,at:new Date().toISOString()};state.tests={...(state.tests||{}),[t.id]:v};lsWrite();gWrite({tests:{[t.id]:v}},1)}
    box.innerHTML=gameShell(esc(t.title),`<div class="gdone"><div class="tring" style="--p:${pct}%"><span>${T.right}<small>/${t.qs.length}</small></span></div><h3>${pct>=90?"Outstanding":pct>=70?"Really good":pct>=50?"Solid start":"Keep reading, it'll come"}</h3><p class="muted">${best&&!t.gen?"New personal best. ":""}Review what you missed below, then read those passages.</p><div class="gbtns center"><button class="btn primary" id="tAgain">Try again</button><button class="btn ghost" id="tHome">All tests</button></div></div>
      <div class="treview">${T.log.map(([q,ok,ans])=>`<div class="trv ${ok?"ok":""}"><b>${ok?"✓":"✗"} ${esc(q.q)}</b><p>${esc(q.o[0])}. ${esc(q.why)}</p><button class="linkbtn" data-tr="${esc(q.r)}">${I.open}Read ${esc(refLabel(q.r))}</button></div>`).join("")}</div>`);
    if(pct>=70)burst($(".tring"),30);
    $("#tAgain").onclick=()=>{G.test={t,i:0,right:0,log:[]};runTest()};$("#tHome").onclick=()=>{G.test=null;gBody(true)};$("#gBack").onclick=()=>{G.test=null;gBody(true)};
    box.querySelectorAll("[data-tr]").forEach(b=>b.onclick=()=>openRef(b.dataset.tr));return}
  const q=t.qs[T.i];if(!q._o){const o=shuffle(q.o.map((x,k)=>({x,ok:k===0})));q._o=o.map(z=>z.x);q._c=o.findIndex(z=>z.ok)}
  box.innerHTML=gameShell(esc(t.title),`<div class="tprog">${t.qs.map((_,k)=>`<i class="${k<T.i?(T.log[k][1]?"ok":"no"):k===T.i?"cur":""}"></i>`).join("")}</div>
    <div class="qcard test"><div class="kicker">Question ${T.i+1} of ${t.qs.length}</div><h3>${esc(q.q)}</h3>
    <div class="qopts tall">${q._o.map((x,k)=>`<button class="qo q${k}" data-to="${k}">${esc(x)}</button>`).join("")}</div>
    <div class="tfoot"><button class="linkbtn" id="tCtx">${I.open}Read the context (${esc(refLabel(q.r))})</button></div><div class="twhy" id="tWhy" hidden></div></div>`);
  $("#gStat").textContent=`${T.right} right`;$("#gBack").onclick=()=>{G.test=null;gBody(true)};
  $("#tCtx").onclick=()=>openRef(q.r);
  box.querySelectorAll("[data-to]").forEach(b=>b.onclick=()=>{const k=+b.dataset.to;const ok=k===q._c;
    box.querySelectorAll("[data-to]").forEach(x=>{x.disabled=true;const n=+x.dataset.to;x.classList.toggle("right",n===q._c);x.classList.toggle("wrong",n===k&&!ok)});
    if(ok){T.right++;burst(b,10);buzz(10)}else buzz([30,40,30]);T.log.push([q,ok,k]);
    const why=$("#tWhy");why.hidden=false;why.innerHTML=`<b>${ok?"Right.":"The answer: "+esc(q.o[0])+"."}</b> ${esc(q.why)}<div class="gbtns"><button class="btn primary sm" id="tNext">${T.i+1<t.qs.length?"Next question":"See my score"}</button></div>`;
    if(!reduced())why.animate([{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:280});
    $("#gStat").textContent=`${T.right} right`;$("#tNext").onclick=()=>{T.i++;runTest();$("#gBody").scrollIntoView({block:"start",behavior:reduced()?"auto":"smooth"})};$("#tNext").focus({preventScroll:true})});
}
const refLabel=r=>{const [b,c,v]=String(r).split(".");return `${bookName(b)} ${c}${v?":"+v:""}`};
function openRef(r){const [b,c,v]=String(r).split(".");if(!BCODES.includes(b))return;openPassage(passFor(b,+c),false,+v||0)}
async function makeTest(raw){
  const ref=parseRef(raw||"");if(!ref){toast("Type a chapter like John 4 or Ruth 1");return}
  const sample=await getSample();if(!sample){toast("Custom tests are written by Claude, so open Lamp inside Claude to use this.");return}
  const name=`${bookName(ref.b)} ${ref.c}`;const btn=$("#tMake button");btn.disabled=true;btn.innerHTML=`<span class="thinking"><i></i><i></i><i></i></span> Writing…`;
  try{
    const bk=await loadBook("BSB",ref.b);const text=(bk?.[ref.c-1]||[]).map((t,i)=>`${i+1} ${t}`).join("\n").slice(0,14000);
    const r=await sample.json(`You write hard Bible comprehension questions for an adult small group. Passage: ${name} (Berean Standard Bible text below). Write 8 multiple-choice questions that can only be answered by reading the chapter carefully and understanding its context: who speaks to whom, why something happens, what came just before, the Old Testament background behind a line, the meaning of a key word or custom. No trick questions, no verse-number trivia, nothing scholars dispute. Every fact must come from the text below or be common, uncontested background. For each: "q" (question), "o" (4 options; the FIRST is correct; similar length, plausible, under 60 characters), "why" (one or two sentences explaining the answer with its context), "v" (the verse number where the answer is found).\nReply as JSON: {"qs":[{"q":"","o":["","","",""],"why":"","v":1}]}\n\n${text}`,{modelTier:"default"});
    const qs=(r?.qs||[]).filter(q=>q&&q.q&&Array.isArray(q.o)&&q.o.length===4).map(q=>({q:String(q.q),o:q.o.map(String),why:String(q.why||""),r:`${ref.b}.${ref.c}.${+q.v||1}`}));
    if(qs.length<4)throw 0;
    G.test={t:{id:"gen-"+ref.b+ref.c,title:name,ref:name,qs,gen:true},i:0,right:0,log:[]};gBody(true);
  }catch(e){toast(e?.code?errMsg(e):"Couldn't write that test just now. Try again.");btn.disabled=false;btn.textContent="Make a test"}
}

/* ---------- Prayer wall ---------- */
function gPrayer(){
  return `<section class="card prform"><div class="ghead2"><h2>Prayer wall</h2><p class="muted">Share what you'd like prayer for. Tap 🙏 when you've prayed for someone, so they know.</p></div>
    <form id="prF"><textarea id="prT" rows="2" maxlength="600" placeholder="What can we pray for?" ${G.ro?"disabled":""}></textarea>
    <div class="prrow"><label class="prhide"><input type="checkbox" id="prAnon"> Hide my name</label><button class="btn primary sm" ${G.ro?"disabled":""}>Share</button></div></form></section>
  <section id="prList" class="prlist"></section>`;
}
function wPrayer(){
  const f=$("#prF");const ta=$("#prT");ta.oninput=()=>{ta.style.height="auto";ta.style.height=Math.min(240,ta.scrollHeight+2)+"px"};
  f.onsubmit=e=>{e.preventDefault();const t=ta.value.trim();if(!t)return;const id="p"+Date.now().toString(36);gWrite({pr:{[id]:{t,at:new Date().toISOString(),anon:$("#prAnon").checked||null}}},1);ta.value="";ta.style.height="";$("#prAnon").checked=false;paintPrayer();burst(f.querySelector("button"),12);toast("Shared with the group")};
  paintPrayer();
}
function paintPrayer(){
  const el=$("#prList");if(!el)return;const all=[];
  for(const id of members())for(const [k,p] of Object.entries(G.people[id].pr||{}))if(p&&p.t)all.push({id,k,...p});
  all.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const prayCount=key=>members().filter(id=>G.people[id].praying?.[key]).length;
  const card=p=>{const key=p.id+":"+p.k;const mineP=p.id===myKey();const n=prayCount(key);const me=!!mine().praying?.[key];
    return `<article class="prcard ${p.ans?"ans":""}">${p.anon&&!mineP?`<span class="face sm anon">?</span>`:face(p.id,"sm")}<div class="prb"><div class="prmeta"><b>${p.anon&&!mineP?"Someone in the group":esc(pname(p.id))}${p.anon&&mineP?" (name hidden)":""}</b><span>${ago(p.at)}</span>${p.ans?`<span class="chip ok">Answered</span>`:""}</div><p>${esc(p.t)}</p>
      <div class="pract"><button class="praybtn ${me?"on":""}" data-pray="${esc(key)}" aria-pressed="${me}">🙏 ${me?"Praying":"I'll pray"}${n?` · ${n}`:""}</button>${mineP?`<button class="linkbtn" data-pans="${p.k}">${p.ans?"Mark as still praying":"Mark answered"}</button><button class="linkbtn danger" data-pdel="${p.k}">Remove</button>`:""}</div></div></article>`};
  const open=all.filter(p=>!p.ans),done=all.filter(p=>p.ans);
  el.innerHTML=(open.length?open.map(card).join(""):`<p class="muted empty">No requests yet. Be the first to share one.</p>`)+(done.length?`<h3 class="prh">Answered prayers</h3>`+done.map(card).join(""):"");
  el.querySelectorAll("[data-pray]").forEach(b=>b.onclick=()=>{if(G.ro&&G.on)return toast("Saving to the group isn't available for you yet");const k=b.dataset.pray;const on=!mine().praying?.[k];gWrite({praying:{[k]:on||null}},1);if(on){burst(b,10);buzz(10)}paintPrayer()});
  el.querySelectorAll("[data-pans]").forEach(b=>b.onclick=()=>{const k=b.dataset.pans;const on=!mine().pr?.[k]?.ans;gWrite({pr:{[k]:{ans:on||null}}},1);if(on){burst(b,30);toast("Praise God! Marked as answered")}paintPrayer()});
  el.querySelectorAll("[data-pdel]").forEach(b=>b.onclick=()=>{if(b.dataset.sure){gWrite({pr:{[b.dataset.pdel]:null}},1);paintPrayer()}else{b.dataset.sure=1;b.textContent="Tap again to remove"}});
}

/* ---------- Topics ---------- */
function gTopics(){
  return `<section class="card"><div class="ghead2"><h2>What should we study next?</h2><p class="muted">Vote for as many as you like. Leaders can see what the group is keen on.</p></div><div id="tpList" class="tplist"></div></section>
  <section class="card"><div class="ghead2"><h2>Suggest a topic</h2></div><form id="tpF" class="tmakef"><input id="tpT" maxlength="80" placeholder="A book, theme or question" ${G.ro?"disabled":""}><button class="btn primary" ${G.ro?"disabled":""}>Suggest</button></form></section>`;
}
function wTopics(){$("#tpF").onsubmit=e=>{e.preventDefault();const t=$("#tpT").value.trim();if(!t)return;const id="i"+Date.now().toString(36);gWrite({ideas:{[id]:{t,at:new Date().toISOString()}},votes:{[myKey()+":"+id]:true}},1);$("#tpT").value="";paintTopics();toast("Added to the list")};paintTopics()}
function paintTopics(){
  const el=$("#tpList");if(!el)return;const ids=members();
  const ideas=[];for(const id of ids)for(const [k,v] of Object.entries(G.people[id].ideas||{}))if(v&&v.t)ideas.push({id:id+":"+k,t:v.t,r:"Suggested by "+pfirst(id),w:0,why:"",by:id});
  const list=[...TOPICS.map(t=>({...t})),...ideas];
  const votes=k=>ids.filter(id=>G.people[id].votes?.[k]);
  list.forEach(t=>t.v=votes(t.id).length);
  const sorted=[list[0],...list.slice(1).sort((a,b)=>b.v-a.v)];
  el.innerHTML=sorted.map(t=>{const vs=votes(t.id);const me=!!mine().votes?.[t.id];return `<article class="tp ${t.now?"now":""}"><div class="tpb"><div class="tpt"><b>${esc(t.t)}</b>${t.now?`<span class="chip gold">Studying now</span>`:""}</div><small>${esc(t.r)}${t.w?` · about ${t.w} weeks`:""}</small>${t.why?`<p>${esc(t.why)}</p>`:""}${vs.length?`<div class="whos">${vs.slice(0,6).map(id=>face(id,"sm")).join("")}</div>`:""}</div>${t.now?"":`<button class="vote ${me?"on":""}" data-vote="${esc(t.id)}" aria-pressed="${me}"><span>▲</span><b>${t.v}</b></button>`}</article>`}).join("");
  el.querySelectorAll("[data-vote]").forEach(b=>b.onclick=()=>{if(G.ro&&G.on)return toast("Saving to the group isn't available for you yet");const k=b.dataset.vote;const on=!mine().votes?.[k];gWrite({votes:{[k]:on||null}},1);if(on){burst(b,8);buzz(8)}paintTopics()});
}

/* ---------- People & leader ---------- */
function openPeople(){
  const w=WK();const ids=members();
  const row=id=>{const p=G.people[id];const a=Object.values(p.ans?.[w.id]||{}).filter(Boolean).length;const ck=p.ck?.[w.id]||{};const sc=p.sc?.[w.id]||{};
    return `<div class="prow">${face(id)}<div><b>${esc(pname(id))}${id===myKey()?" (you)":""}</b><small>${p.joined?"Joined "+ago(p.joined):""}${p.seen?` · active ${ago(p.seen)}`:""}</small><div class="pchips">${ck.read?`<span class="chip">Read it</span>`:""}${a?`<span class="chip">${a} answer${a>1?"s":""}</span>`:""}${ck.tried?`<span class="chip">Tried it</span>`:""}${Object.keys(sc).length?`<span class="chip">${Object.keys(sc).length} game${Object.keys(sc).length>1?"s":""}</span>`:""}</div></div></div>`};
  openSheet(`<div class="pcard"><div class="kick">${esc(G.meta.name||"Our Bible study")}</div><h2>${ids.length} ${ids.length===1?"member":"members"}</h2><p class="muted">This week: ${esc(w.ref)}</p><div class="plist">${ids.map(row).join("")||`<p class="muted">Members appear here once they open Lamp.</p>`}</div></div>`,"People");
}
function openLeader(){
  const m=G.meta;
  openSheet(`<div class="pcard"><div class="kick">Leader tools</div><h2>Run the group</h2>
    <div class="field"><span>This week's study</span><select id="ldWk" class="search">${SERIES.weeks.map((w,i)=>`<option value="${w.id}" ${w.id===curWk()?"selected":""}>Week ${i+1} · ${esc(w.ref)} · ${esc(w.title)}</option>`).join("")}</select></div>
    <div class="field"><span>Group name</span><input id="ldName" class="search" maxlength="40" value="${esc(m.name||"")}" placeholder="Our Bible study"></div>
    <div class="field"><span>When you meet</span><input id="ldWhen" class="search" maxlength="40" value="${esc(m.when||"")}" placeholder="Thursdays at 7 pm"></div>
    <div class="row-end"><button class="btn primary" id="ldSave">Save for everyone</button></div>
    <div class="field"><span>How to invite people</span><ol class="howto"><li>Open Lamp in Claude and tap <b>Share</b> at the top of the page.</li><li>Add each person by email and give them <b>edit</b> access, so their answers, prayers and scores can save.</li><li>Each person signs in to Claude once (a free account works). After that Lamp remembers them on that device.</li></ol></div></div>`,"Leader tools");
  $("#ldSave").onclick=async()=>{const d={week:$("#ldWk").value,name:$("#ldName").value.trim(),when:$("#ldWhen").value.trim()};
    if(!G.db){G.meta={...G.meta,...d};G.wk=d.week;$("#scrim")?.remove();render();toast("Saved on this device");return}
    try{await G.db.doc("group/meta").set({...G.meta,...d});G.meta={...G.meta,...d};G.wk=d.week;$("#scrim")?.remove();render();toast("Saved for the whole group")}catch(e){toast("Only the group's leader can change this.")}};
}

/* ---------- Today teaser ---------- */
function groupTeaser(){
  const w=WK(curWk());const L=G.live&&G.live.ph!=="end"&&Date.now()-(G.live.at||0)<3*36e5;const n=members().length;
  return `<button class="card gteaser" id="gTeaser" data-v="group"><div class="gt-l"><div class="kicker">${L?"Live quiz on now":"This week in your group"}</div><b>${esc(w.title)}</b><span>${esc(w.ref)}${n>1?` · ${n} members`:""}</span></div><span class="gt-r">${L?`<span class="pulse"></span>Join`:"Open"}${I.right}</span></button>`;
}
