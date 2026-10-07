/* =====================================================================
   Study Desk 4.4 — round two of open-source upgrades
   1. Search by meaning (all-MiniLM-L6-v2 via transformers.js, Apache-2.0): finds passages in your
      own notes that mean the same thing, even with different words. Shows your exact words only.
   2. Picture cards (image occlusion): cover labels on a diagram, each box becomes a flashcard.
   3. Practice exam: timed questions under exam conditions, marked at the end.
   4. Focus sounds: rain, brown noise or waves, made on the device (Web Audio), no download.
   5. Study rhythm: a heatmap of study days with your streak, on Progress.
   6. Pair by QR code: show a code on one device, scan it with the other (lean-qr, qr-scanner; MIT).
   7. A short guided tour for first-timers (driver.js, MIT).
   Shares the app's globals (S, nodes, subjects, save, render, toast, …).
   ===================================================================== */

Object.assign(P, {
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  wave: '<path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  meaning: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
});
const lsGet = k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { } };
const fmtMS = s => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- 1. search by meaning ---------- */
const SM = { on: lsGet("studydesk.smart") === "on", state: "", pct: 0, err: "", w: null, vecs: new Map(), ready: false, building: null, t: 0 };
function smWorker() { if (!SM.w) SM.w = new Worker("embed-worker.js", { type: "module" }); return SM.w; }
async function smEmbed(texts) { const r = await workerCall(smWorker(), { op: "embed", texts }); return r.vecs; }
/* notes are split into short passages of one to three sentences, so a hit points at the exact place */
function passagesOf(id) {
  const txt = notesOf(id); if (!txt || txt.length < 40) return [];
  const sents = txt.replace(/^#+\s*/gm, "").split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 12);
  const out = []; let cur = "";
  for (const s of sents) { if (cur && (cur + " " + s).length > 300) { out.push(cur); cur = s; } else cur = cur ? cur + " " + s : s; }
  if (cur) out.push(cur);
  return out.slice(0, 80).map(t => ({ k: hash(id + "|" + t), node: id, text: t }));
}
async function smBuild(onProgress) {
  if (SM.building) return SM.building;
  SM.building = (async () => {
    if (!SM.vecs.size) { try { for (const r of (await IDB.all("vec") || [])) SM.vecs.set(r.id, r); } catch (e) { } }
    const all = leafIds.flatMap(passagesOf), need = all.filter(p => !SM.vecs.has(p.k));
    for (let i = 0; i < need.length; i += 16) {
      const batch = need.slice(i, i + 16), vs = await smEmbed(batch.map(p => p.text));
      for (let j = 0; j < batch.length; j++) { const r = { id: batch[j].k, node: batch[j].node, text: batch[j].text, v: vs[j] }; SM.vecs.set(r.id, r); IDB.put("vec", r).catch(() => { }); }
      onProgress && onProgress((i + batch.length) / need.length);
    }
    const live = new Set(all.map(p => p.k)); SM.live = live; SM.ready = true;
  })().finally(() => { SM.building = null; });
  return SM.building;
}
async function smSearch(q) {
  await smBuild();
  const [qv] = await smEmbed([q]);
  const hits = [];
  for (const r of SM.vecs.values()) { if (!SM.live.has(r.id) || !nodes[r.node]) continue; let d = 0; for (let i = 0; i < qv.length; i++) d += qv[i] * r.v[i]; if (d > .3) hits.push({ ...r, score: d }); }
  hits.sort((a, b) => b.score - a.score);
  const per = {}, out = [];
  for (const h of hits) { if ((per[h.node] = (per[h.node] || 0) + 1) > 2) continue; out.push(h); if (out.length >= 6) break; }
  return out;
}
const _drawSearch = drawSearch;
drawSearch = function (raw) {
  _drawSearch(raw);
  const res = $("#srchRes"); if (!res) return;
  let box = $("#srchMeaning"); if (!box) { box = document.createElement("div"); box.id = "srchMeaning"; box.className = "stack"; box.style.gap = "8px"; }
  const q = raw.trim(); clearTimeout(SM.t);
  /* a question ("why do we forget") is better answered by meaning, so those passages go first */
  const question = SM.on && q.split(/\s+/).length >= 3; box.classList.toggle("first", question); question ? res.before(box) : res.after(box);
  if (q.length < 4 || !leafIds.some(id => notesOf(id))) { box.innerHTML = ""; return; }
  if (!SM.on) { box.innerHTML = `<p class="tiny muted sm-hint">${ico("meaning")}<span>Notes use different words? Turn on <button class="link" data-action="sm-settings">search by meaning</button>.</span></p>`; return; }
  box.innerHTML = `<div class="sm-head"><b>By meaning</b><span class="tiny muted">exact passages from your notes</span></div><p class="small muted sm-wait"><span class="spin" aria-hidden="true"></span>Looking through your notes…</p>`;
  SM.t = setTimeout(async () => {
    try {
      const hits = await smSearch(q); if (($("#srch") || {}).value !== raw) return;
      box.innerHTML = `<div class="sm-head"><b>By meaning</b><span class="tiny muted">exact passages from your notes</span></div>` + (hits.length ? hits.map(h => { const n = nodes[h.node]; return `<button class="sm-hit" data-sgo="topic:${h.node}" style="--pc:${subjColor(n.subject)}"><span class="sm-where">${esc(subjects[n.subject].name)} · ${esc(n.title)}</span><span class="sm-text">“${esc(h.text)}”</span></button>`; }).join("") : `<p class="small muted">Nothing in your notes is close to that.</p>`);
    } catch (e) { console.error(e); box.innerHTML = `<p class="small muted">Search by meaning isn't available right now. ${esc(/fetch|network|load/i.test(e.message) ? "Check the internet connection the first time it's used." : "")}</p>`; }
  }, 350);
};
function smCardHTML() {
  if (SM.state === "loading") return `<div class="dl"><div class="dl-top"><span class="small">Getting search by meaning ready…</span><span class="tiny mono" id="smPct">${Math.round(SM.pct * 100)}%</span></div><div class="dlbar"><i id="smBar" style="width:${Math.round(SM.pct * 100)}%"></i></div></div>`;
  if (SM.on) return `<p class="small"><span class="pulse-dot on"></span>On. Search (the magnifier) also shows passages from your notes that mean the same thing, in your own words.</p><button class="btn btn-line btn-sm" data-action="sm-off">Turn off and remove the download</button>`;
  return `<p class="small muted">Finds notes by meaning, not just matching words. Search “why we forget” and it finds “decay theory says memory traces fade”. It only shows your own words, never made-up text. One-time download of about 23 MB, then it works offline.</p>
    ${SM.err ? `<p class="small warn-t" role="alert">${esc(SM.err)}</p>` : ""}<button class="btn btn-soft" data-action="sm-on">${ico("meaning")}Turn on search by meaning</button>`;
}
function drawSmCard() { const el = $("#smCard"); if (el) el.innerHTML = smCardHTML(); }

/* ---------- 2. picture cards (image occlusion) ---------- */
let PICS = {}; // id -> data URL (kept in memory so backups and sync can include them)
(async () => { try { for (const r of (await IDB.all("pics") || [])) PICS[r.id] = r.data; } catch (e) { } })();
let PE = null; // picture editor state
const same = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) < 1e-3);
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file), k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/jpeg", .84), w: c.width, h: c.height };
}
function picView(c, reveal) {
  const label = c.b && c.b !== "Check the picture" ? c.b : "";
  return `<span class="oc-view"><img src="${PICS[c.pic] || ""}" alt="${esc(label ? "Diagram: " + label : "Diagram")}">${(c.boxes || [c.box]).map(b => { const t = same(b, c.box); return `<i class="oc-m ${t ? "t" : ""} ${t && reveal ? "open" : ""}" style="left:${b[0] * 100}%;top:${b[1] * 100}%;width:${b[2] * 100}%;height:${b[3] * 100}%">${t && !reveal ? "?" : ""}</i>`; }).join("")}</span>`;
}
function openPicSheet(node, picId) {
  PE = { node, pic: picId && PICS[picId] ? { id: picId, data: PICS[picId] } : null, boxes: [], sel: -1 };
  if (PE.pic) PE.boxes = (S.cards || []).filter(c => c.kind === "pic" && c.pic === picId).map(c => ({ r: c.box.slice(), label: c.b === "Check the picture" ? "" : c.b }));
  drawPicSheet();
}
function picEditorHTML() {
  const n = nodes[PE.node];
  if (!PE.pic) return `${sheetHead(subjects[n.subject].name + " · " + n.title, "New picture card")}
    <div class="stack form"><p class="small muted">Use a diagram, a labelled figure or a photo of a slide. Then draw boxes over the labels you want to learn. Each box becomes its own flashcard.</p>
      <label class="drop-big oc-pick" for="oc-file"><span class="drop-ic">${ico("image")}</span><b>Choose a picture</b><span class="tiny muted">A photo, a screenshot or a saved image</span></label>
      <input type="file" id="oc-file" class="sr" accept="image/*"><p class="small" id="oc-msg" role="status"></p></div>`;
  const b = PE.boxes[PE.sel];
  return `${sheetHead(subjects[n.subject].name + " · " + n.title, "Picture card")}
    <div class="stack form" style="gap:12px">
      <p class="small muted">${PE.boxes.length ? "Drag to add more boxes. Tap a box to name it or remove it." : "Drag across each label you want to hide."}</p>
      <div class="oc-stage" id="ocStage"><img src="${PE.pic.data}" alt="Your picture" draggable="false">${PE.boxes.map((x, i) => `<i class="oc-b ${i === PE.sel ? "sel" : ""}" data-i="${i}" style="left:${x.r[0] * 100}%;top:${x.r[1] * 100}%;width:${x.r[2] * 100}%;height:${x.r[3] * 100}%"><span>${i + 1}</span></i>`).join("")}</div>
      ${b ? `<div class="oc-edit"><label class="fld grow"><span>Box ${PE.sel + 1}: what's underneath? (optional)</span><input id="oc-label" value="${esc(b.label)}" maxlength="120" placeholder="e.g. Hippocampus" autocomplete="off"></label><button class="btn btn-line btn-sm" data-action="oc-del">${ico("trash")}Remove box</button></div>` : ""}
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="oc-save" ${PE.boxes.length ? "" : "disabled"}>${ico("check")}${PE.boxes.length ? `Save ${PE.boxes.length} card${PE.boxes.length === 1 ? "" : "s"}` : "Save cards"}</button><button class="btn btn-line" data-action="oc-new">Use another picture</button></div>
      <p class="tiny muted">Pictures stay on this device and are included in backups and sync.</p></div>`;
}
function drawPicSheet() { const sh = $(".sheet .sheet-body") || null; if (sh && $("#ocWrap")) { $("#ocWrap").innerHTML = picEditorHTML(); return; } openSheet("Picture card", `<div id="ocWrap">${picEditorHTML()}</div>`); }
function picLabelSync() { const i = $("#oc-label"); if (i && PE && PE.boxes[PE.sel]) PE.boxes[PE.sel].label = i.value.trim(); }
document.addEventListener("pointerdown", e => {
  const stage = e.target.closest("#ocStage"); if (!stage || !PE) return;
  const hit = e.target.closest(".oc-b");
  picLabelSync();
  if (hit) { PE.sel = +hit.dataset.i; drawPicSheet(); setTimeout(() => $("#oc-label")?.focus({ preventScroll: true }), 30); return; }
  e.preventDefault();
  const r = stage.getBoundingClientRect(), x0 = (e.clientX - r.left) / r.width, y0 = (e.clientY - r.top) / r.height;
  const el = document.createElement("i"); el.className = "oc-b drawing"; stage.appendChild(el);
  let box = [x0, y0, 0, 0];
  const move = ev => {
    const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
    box = [Math.min(x0, x), Math.min(y0, y), Math.abs(x - x0), Math.abs(y - y0)];
    Object.assign(el.style, { left: box[0] * 100 + "%", top: box[1] * 100 + "%", width: box[2] * 100 + "%", height: box[3] * 100 + "%" });
  };
  const up = () => {
    removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
    if (box[2] * r.width > 14 && box[3] * r.height > 10) { PE.boxes.push({ r: box.map(v => Math.round(v * 1e4) / 1e4), label: "" }); PE.sel = PE.boxes.length - 1; buzz(6); }
    drawPicSheet();
  };
  addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
});
async function picSave() {
  picLabelSync();
  if (!PE || !PE.pic || !PE.boxes.length) return;
  const id = PE.pic.id || newId("p");
  if (!PE.pic.id) { await IDB.put("pics", { id, data: PE.pic.data, node: PE.node, added: Date.now() }); PICS[id] = PE.pic.data; PE.pic.id = id; }
  const old = (S.cards || []).filter(c => c.kind === "pic" && c.pic === id), boxes = PE.boxes.map(b => b.r);
  S.cards = (S.cards || []).filter(c => !(c.kind === "pic" && c.pic === id && !boxes.some(b => same(b, c.box))));
  PE.boxes.forEach((b, i) => {
    const f = b.label ? "Name the hidden label" : "What is under the box?", back = b.label || "Check the picture";
    const c = old.find(x => same(x.box, b.r));
    if (c) Object.assign(c, { f, b: back, boxes }); else S.cards.push({ id: newId("c"), node: PE.node, kind: "pic", pic: id, box: b.r, boxes, f, b: back, due: null, s: null, added: todayKey() });
  });
  const n = PE.boxes.length; PE = null; save(); closeSheet(); rerender(); toast(`${n} picture card${n === 1 ? "" : "s"} saved. They show up in your next review.`);
}
const _exportObj = exportObj;
exportObj = function () { const o = _exportObj(); const used = new Set((S.cards || []).filter(c => c.kind === "pic").map(c => c.pic)); o.pics = Object.fromEntries(Object.entries(PICS).filter(([k]) => used.has(k))); return o; };
const _doImport = doImport;
doImport = function (txt) {
  try { const o = JSON.parse(txt); if (o && o.pics && typeof o.pics === "object") for (const [id, data] of Object.entries(o.pics)) if (typeof data === "string" && data.startsWith("data:image/") && data.length < 8e6) { PICS[id] = data; IDB.put("pics", { id, data, added: Date.now() }).catch(() => { }); } } catch (e) { }
  return _doImport(txt);
};

/* ---------- 3. practice exam ---------- */
const EXKEY = "studydesk.exam";
let EX = (() => { try { const o = JSON.parse(lsGet(EXKEY) || "null"); return o && Array.isArray(o.qs) ? o : null; } catch (e) { return null; } })();
let EXSET = { subj: "all", n: 20, timed: true }, exTick = 0;
const exSave = () => lsSet(EXKEY, EX ? JSON.stringify(EX) : "");
const exPool = subj => QS.filter(q => nodes[q.node] && (subj === "all" || q.subject === subj));
const exQ = id => (EX && EX.snap && EX.snap[id]) || QS.find(q => q.id === id);
const exLeft = () => !EX || !EX.end ? null : Math.max(0, Math.round((EX.end - Date.now()) / 1000));
function exStart() {
  const pool = exPool(EXSET.subj); if (pool.length < 3) { toast("Not enough practice questions yet. Add notes to more topics first."); return; }
  /* spread the questions across chapters, and include questions you got wrong before */
  const missed = new Set(Object.values(S.mistakes).flatMap(m => m.qs)), byCh = {};
  shuffle(pool.slice()).sort((a, b) => (missed.has(b.id) ? 1 : 0) - (missed.has(a.id) ? 1 : 0)).forEach(q => { const ch = rootOf(q.node); (byCh[ch] = byCh[ch] || []).push(q); });
  const lists = shuffle(Object.values(byCh)), pick = [], n = Math.min(EXSET.n, pool.length);
  while (pick.length < n) for (const l of lists) { if (l.length && pick.length < n) pick.push(l.shift()); }
  const secs = Math.round(n * 75);
  const order = shuffle(pick); EX = { qs: order.map(q => q.id), snap: Object.fromEntries(order.map(q => [q.id, { id: q.id, q: q.q, o: q.o, a: q.a, e: q.e || "", node: q.node, subject: q.subject }])), picks: {}, i: 0, start: Date.now(), end: EXSET.timed ? Date.now() + secs * 1000 : 0, secs: EXSET.timed ? secs : 0, subj: EXSET.subj, done: false };
  exSave(); go("exam"); exTimer();
}
const rootOf = id => { let n = nodes[id]; while (n && n.parent) n = nodes[n.parent]; return n ? n.id : id; };
function exTimer() {
  clearInterval(exTick); if (!EX || EX.done || !EX.end) return;
  exTick = setInterval(() => {
    if (!EX || EX.done) { clearInterval(exTick); return; }
    const left = exLeft(), el = $("#exTime"); if (el) { el.textContent = fmtMS(left); el.parentElement.classList.toggle("low", left <= 60); }
    if (left <= 0) { clearInterval(exTick); exFinish(true); }
  }, 1000);
}
function exFinish(timeUp) {
  if (!EX || EX.done) return;
  const qs = EX.qs.map(exQ).filter(q => q && nodes[q.node]);
  let right = 0;
  for (const q of qs) {
    const i = EX.picks[q.id], ok = i === q.a; if (ok) right++;
    logEvent({ t: "q", n: q.node, ok });
    const h = S.attempts[q.node] || (S.attempts[q.node] = { a: 0, c: 0 }); h.a++; if (ok) h.c++;
    if (!ok) { const m = S.mistakes[q.node] || (S.mistakes[q.node] = { n: 0, qs: [] }); m.n++; if (!m.qs.includes(q.id)) m.qs.push(q.id); }
    else { const m = S.mistakes[q.node]; if (m && m.qs.includes(q.id)) { m.n = Math.max(0, m.n - 1); m.qs = m.qs.filter(x => x !== q.id); } }
    if (st(q.node) === 2 && h.a >= 2) setStatus(q.node, 3, "Practised");
  }
  EX.done = true; EX.right = right; EX.total = qs.length; EX.used = Math.round((Date.now() - EX.start) / 1000); EX.timeUp = !!timeUp;
  save(); exSave(); clearInterval(exTick);
  if (stack[stack.length - 1].v === "exam") { render(false); window.scrollTo({ top: 0 }); if (right / Math.max(1, qs.length) >= .8) setTimeout(() => FX.party(), 250); }
  if (timeUp) toast("Time's up. Your exam has been marked.");
}
V.exam = () => {
  if (EX && EX.done) return exResults();
  if (EX) return exRunning();
  const counts = { all: exPool("all").length }; DSUBJ.forEach(s => counts[s.id] = exPool(s.id).length);
  if (EXSET.subj !== "all" && !subjects[EXSET.subj]) EXSET.subj = "all";
  const have = counts[EXSET.subj], n = Math.min(EXSET.n, have), chip = (k, v, lab, dis) => `<button class="chip" aria-pressed="${EXSET[k] === v}" data-action="ex-set" data-k="${k}" data-v="${v}" ${dis ? "disabled" : ""}>${lab}</button>`;
  return `<div class="stack" style="gap:18px">
    <header class="subhead"><div class="eyebrow">Review</div><h1>Practice exam</h1><p class="muted">Like the real thing: a timer, no answers shown until you hand in, then a full breakdown by chapter.</p></header>
    ${counts.all < 3 ? `<div class="card empty" style="text-align:left">Practice exams use the questions made from your notes. <button class="link" data-go="import">Import a file</button> or add notes to a few topics first.</div>` : `
    <section class="card stack form ex-setup">
      <div class="stack" style="gap:8px"><span class="flabel">Subject</span><div class="filters" role="group" aria-label="Subject">${chip("subj", "all", `All subjects <span class="tiny muted">${counts.all}</span>`)}${DSUBJ.map(s => chip("subj", s.id, `${esc(s.name)} <span class="tiny muted">${counts[s.id]}</span>`, counts[s.id] < 3)).join("")}</div></div>
      <div class="stack" style="gap:8px"><span class="flabel">Questions</span><div class="filters" role="group" aria-label="Number of questions">${[10, 20, 30, 50].map(k => chip("n", k, String(k), k > have && k !== 10)).join("")}</div></div>
      <div class="stack" style="gap:8px"><span class="flabel">Timer</span><div class="filters" role="group" aria-label="Timer">${chip("timed", true, `Timed, ${Math.round(n * 75 / 60)} min`)}${chip("timed", false, "No time limit")}</div></div>
      <div class="ex-sum">${ico("clip")}<span><b>${n} question${n === 1 ? "" : "s"}</b> from ${EXSET.subj === "all" ? "all subjects" : esc(subjects[EXSET.subj].name)}, spread across chapters, with ones you got wrong before mixed in.</span></div>
      <button class="btn btn-pen btn-auto" data-action="ex-start">${ico("play")}Start the exam</button></section>`}
  </div>`;
};
function exRunning() {
  const q = exQ(EX.qs[EX.i]); if (!q || !nodes[q.node]) { EX.i = 0; return `<div class="card empty">This exam's questions changed. <button class="link" data-action="ex-quit">Start a new one</button></div>`; }
  const n = nodes[q.node], left = exLeft(), answered = EX.qs.filter(id => EX.picks[id] !== undefined).length, pick = EX.picks[q.id];
  return `<div class="stack ex-run" style="gap:16px">
    <div class="ex-top"><button class="icon-btn" data-action="ex-quit" aria-label="Leave the exam">${ico("x")}</button>
      <div class="grow"><div class="rv-bar" role="progressbar" aria-label="Questions answered" aria-valuemin="0" aria-valuemax="${EX.qs.length}" aria-valuenow="${answered}"><i style="transform:scaleX(${answered / EX.qs.length})"></i></div><span class="tiny muted">${answered} of ${EX.qs.length} answered</span></div>
      ${left !== null ? `<span class="ex-clock ${left <= 60 ? "low" : ""}" role="timer" aria-label="Time left">${ico("timer")}<b id="exTime" class="mono">${fmtMS(left)}</b></span>` : ""}</div>
    <div class="qcard"><div class="qmeta"><span class="mono">Question ${EX.i + 1}</span><span>·</span><span style="color:${subjColor(q.subject)};font-weight:700">${esc(subjects[q.subject].name)}</span></div>
      <p class="qtext">${esc(q.q)}</p>
      <div class="opts" role="radiogroup" aria-label="Answers">${q.o.map((o, i) => `<button class="opt ${pick === i ? "picked" : ""}" role="radio" aria-checked="${pick === i}" data-action="ex-pick" data-i="${i}"><span class="l">${"ABCDEF"[i]}</span><span>${esc(o)}</span></button>`).join("")}</div></div>
    <div class="row ex-nav"><button class="btn btn-line" data-action="ex-go" data-d="-1" ${EX.i ? "" : "disabled"}>Previous</button><span class="grow"></span>${EX.i < EX.qs.length - 1 ? `<button class="btn btn-pen" data-action="ex-go" data-d="1">Next</button>` : `<button class="btn btn-pen" data-action="ex-hand">${ico("flag")}Hand in</button>`}</div>
    <nav class="ex-dots" aria-label="Jump to a question">${EX.qs.map((id, i) => `<button class="${EX.picks[id] !== undefined ? "on" : ""} ${i === EX.i ? "cur" : ""}" data-action="ex-jump" data-i="${i}" aria-label="Question ${i + 1}${EX.picks[id] !== undefined ? ", answered" : ""}">${i + 1}</button>`).join("")}</nav>
    ${EX.i < EX.qs.length - 1 ? `<button class="link small" data-action="ex-hand" style="align-self:center">Hand in now</button>` : ""}
  </div>`;
}
function exResults() {
  const qs = EX.qs.map(exQ).filter(q => q && nodes[q.node]), pc = Math.round(EX.right / Math.max(1, EX.total) * 100);
  const ch = {}; qs.forEach(q => { const c = rootOf(q.node), r = ch[c] || (ch[c] = { a: 0, c: 0 }); r.a++; if (EX.picks[q.id] === q.a) r.c++; });
  const wrong = qs.filter(q => EX.picks[q.id] !== q.a);
  const verdict = pc >= 80 ? "Exam-ready on these topics." : pc >= 60 ? "A solid pass. Focus on the chapters marked below." : pc >= 40 ? "Getting there. Review the missed questions, then try again in a few days." : "Lots to review. Start with the weakest chapter below.";
  return `<div class="stack ex-res" style="gap:18px">
    <header class="subhead"><div class="eyebrow">Practice exam${EX.timeUp ? " · time ran out" : ""}</div><h1>${pc}%</h1><p class="muted">${verdict}</p></header>
    <div class="tiles"><div class="tile"><b>${EX.right}/${EX.total}</b><span>correct</span></div><div class="tile"><b>${fmtMS(EX.used)}</b><span>time used</span></div><div class="tile"><b>${EX.total - EX.right}</b><span>to review</span></div></div>
    <section class="card stack" style="gap:12px"><h2 class="h3">By chapter</h2>${Object.entries(ch).sort((a, b) => a[1].c / a[1].a - b[1].c / b[1].a).map(([cid, r]) => { const p = r.c / r.a, n = nodes[cid]; return `<button class="ex-ch" data-go="chapter:${cid}"><span class="grow"><span class="small"><b>${esc(n ? n.title : "Chapter")}</b></span><span class="tiny muted">${n ? esc(subjects[n.subject].name) + " · " : ""}${r.c} of ${r.a} right</span></span><b class="mono small">${Math.round(p * 100)}%</b><span class="ex-bar" style="--p:${p};--c:${p >= .8 ? "var(--ok)" : p >= .5 ? "var(--p-medium)" : "var(--bad)"}"><i></i></span></button>`; }).join("")}</section>
    ${wrong.length ? `<section class="section"><div class="sec-head"><h2>Questions to review</h2><span class="tiny muted">added to your mistakes list</span></div><div class="stack" style="gap:10px">${wrong.map(q => { const p = EX.picks[q.id]; return `<div class="card stack ex-miss" style="gap:8px"><p class="small"><b>${esc(q.q)}</b></p>${p !== undefined ? `<p class="small ex-was">${ico("x")}<span>You answered: ${esc(q.o[p])}</span></p>` : `<p class="small ex-was">${ico("x")}<span>Not answered</span></p>`}<p class="small ex-ok">${ico("check")}<span>${esc(q.o[q.a])}</span></p>${q.e ? `<p class="tiny muted">${esc(q.e)}</p>` : ""}<button class="link small" data-go="topic:${q.node}" style="align-self:flex-start">Open ${esc(nodes[q.node].title)}</button></div>`; }).join("")}</div></section>` : ""}
    <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="ex-again">${ico("loop")}Take another exam</button><button class="btn btn-line" data-action="ex-close">Back to Review</button></div>
  </div>`;
}
const _practice = V.practice;
V.practice = () => {
  const html = _practice(), n = QS.length;
  const card = n >= 3 ? `<button class="ex-cta card" data-go="exam"><span class="ex-ic">${ico("clip")}</span><span class="grow"><b>${EX && !EX.done ? "Continue your practice exam" : "Practice exam"}</b><span class="small muted">${EX && !EX.done ? `${EX.qs.filter(id => EX.picks[id] !== undefined).length} of ${EX.qs.length} answered${EX.end ? `, ${fmtMS(exLeft())} left` : ""}` : "Timed questions under exam conditions, marked at the end"}</span></span>${ico("chev", 'class="chev"')}</button>` : "";
  return html.replace('<h2 class="sec-title">Practice questions</h2>', card + '$&');
};

/* ---------- 4. focus sounds, made on the device ---------- */
const SND = { kind: lsGet("studydesk.sound"), ctx: null, src: null, gain: null, lfo: null, playing: "" };
const SOUNDS = [["", "Silence"], ["rain", "Rain"], ["brown", "Brown noise"], ["waves", "Waves"]];
function sndStart() {
  sndStop(); if (!SND.kind) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = SND.ctx || (SND.ctx = new C()); ctx.resume && ctx.resume();
    const len = ctx.sampleRate * 6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (SND.kind === "rain") { d[i] = w * .5 + (Math.random() < .0009 ? (Math.random() * 2 - 1) * 1.6 : 0); }
        else { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
      }
      /* fade the loop's ends together so there is no click when it repeats */
      const f = Math.floor(ctx.sampleRate * .3); for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[len - f + i] * (1 - k); }
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.loopEnd = (len - Math.floor(ctx.sampleRate * .3)) / ctx.sampleRate;
    const filt = ctx.createBiquadFilter(), gain = ctx.createGain();
    if (SND.kind === "rain") { filt.type = "bandpass"; filt.frequency.value = 1400; filt.Q.value = .4; gain.gain.value = .18; }
    else if (SND.kind === "brown") { filt.type = "lowpass"; filt.frequency.value = 1200; gain.gain.value = .5; }
    else { filt.type = "lowpass"; filt.frequency.value = 700; gain.gain.value = .35; const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .09; lg.gain.value = .25; lfo.connect(lg).connect(gain.gain); lfo.start(); SND.lfo = lfo; }
    src.connect(filt).connect(gain).connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(SND.kind === "rain" ? .18 : SND.kind === "brown" ? .5 : .35, ctx.currentTime + 1.2);
    src.start(); SND.src = src; SND.gain = gain; SND.playing = SND.kind;
  } catch (e) { console.error(e); }
}
function sndStop() {
  try { if (SND.gain && SND.ctx) { const g = SND.gain, s = SND.src, l = SND.lfo; g.gain.cancelScheduledValues(SND.ctx.currentTime); g.gain.setTargetAtTime(0, SND.ctx.currentTime, .15); setTimeout(() => { try { s.stop(); l && l.stop(); } catch (e) { } }, 700); } } catch (e) { }
  SND.src = SND.gain = SND.lfo = null; SND.playing = "";
}
const sndShould = () => !!(SND.kind && F && !F.paused && !F.done);
setInterval(() => { if (SND.playing && !sndShould()) sndStop(); }, 800);
const _focusHTML = focusHTML;
focusHTML = function () {
  const t = S.tasks.find(x => x.id === F.tid);
  let html = _focusHTML();
  const sounds = `<div class="snd" role="radiogroup" aria-label="Focus sound">${SOUNDS.map(([k, l]) => `<button class="chip" role="radio" aria-checked="${SND.kind === k}" data-action="snd" data-k="${k}">${l}</button>`).join("")}</div>`;
  const mock = t && t.type === "mock" && QS.some(q => q.subject === t.subject) ? `<button class="btn btn-soft btn-sm" data-action="ex-mock" data-s="${t.subject}" style="align-self:center">${ico("clip")}Do it as a timed practice exam</button>` : "";
  return html.replace('<div class="row" style="justify-content:center;flex-wrap:wrap">', mock + sounds + "$&");
};
const _focusStart = focusStart;
focusStart = function (tid) { _focusStart(tid); if (sndShould()) sndStart(); };
const _focusAction = focusAction;
focusAction = function (k) { _focusAction(k); if (sndShould() && !SND.playing) sndStart(); else if (!sndShould()) sndStop(); };
document.addEventListener("click", e => { const b = e.target.closest(".focus [data-action=snd]"); if (!b) return; e.stopPropagation(); SND.kind = b.dataset.k; lsSet("studydesk.sound", SND.kind); $$(".snd .chip").forEach(c => c.setAttribute("aria-checked", c === b)); sndShould() ? sndStart() : sndStop(); }, true);

/* ---------- 5. study rhythm heatmap ---------- */
function dayMinutes() {
  const m = {};
  for (const e of S.log) { const v = e.t === "task" ? (e.m || 0) : e.t === "q" ? 1 : e.t === "card" ? .5 : e.t === "blurt" ? 5 : e.t === "listen" ? (e.m || 5) : 0; if (v) m[e.d] = (m[e.d] || 0) + v; }
  return m;
}
function streaks(m) {
  const t = todayKey(); let cur = 0, d = m[t] ? t : addDays(t, -1);
  while (m[d]) { cur++; d = addDays(d, -1); }
  const days = Object.keys(m).sort(); let best = 0, run = 0, prev = null;
  for (const k of days) { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return { cur, best };
}
function rhythmCard() {
  const m = dayMinutes(), t = todayKey(), weeks = 18, start0 = parseKey(t); start0.setDate(start0.getDate() - ((start0.getDay() + 6) % 7) - (weeks - 1) * 7);
  const start = keyOf(start0), { cur, best } = streaks(m), last30 = Array.from({ length: 30 }, (_, i) => addDays(t, -i)).filter(k => m[k]).length;
  const lvl = v => !v ? 0 : v < 15 ? 1 : v < 40 ? 2 : v < 80 ? 3 : 4;
  let cells = "", months = "";
  for (let w = 0; w < weeks; w++) {
    const wk = addDays(start, w * 7); if (w === 0 || wk.slice(5, 7) !== addDays(wk, -7).slice(5, 7)) months += `<span style="grid-column:${w + 1}">${fmtD(wk, { month: "short" })}</span>`;
    for (let d = 0; d < 7; d++) { const k = addDays(start, w * 7 + d); if (k > t) { cells += `<i class="hm-x" style="grid-column:${w + 1};grid-row:${d + 1}"></i>`; continue; } const v = Math.round(m[k] || 0); cells += `<i class="l${lvl(v)}${k === t ? " today" : ""}" style="grid-column:${w + 1};grid-row:${d + 1}" title="${fmtD(k, { weekday: "short", day: "numeric", month: "short" })}: ${v ? `about ${v} min` : "no study"}"></i>`; }
  }
  return `<section class="card stack rhythm" style="gap:14px"><div class="sec-head"><h2 class="h3">Study rhythm</h2><span class="tiny muted">last ${weeks} weeks</span></div>
    <div class="rh-stats"><div><b class="mono">${cur}</b><span>day${cur === 1 ? "" : "s"} in a row${cur && !m[t] ? ", study today to keep it" : ""}</span></div><div><b class="mono">${best}</b><span>best streak</span></div><div><b class="mono">${last30}</b><span>study days in the last 30</span></div></div>
    <div class="hm-wrap" role="img" aria-label="Study days over the last ${weeks} weeks. Current streak ${cur} days, best ${best}."><div class="hm-days" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div><div class="hm-grid-wrap"><div class="hm-months" aria-hidden="true" style="--w:${weeks}">${months}</div><div class="hm" style="--w:${weeks}">${cells}</div></div></div>
    <div class="hm-legend tiny muted" aria-hidden="true">Less<i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i>More</div>
    <p class="tiny muted">Counts focus sessions, questions, flashcards, blurt checks and listening.</p></section>`;
}
const _progressCharts = typeof progressCharts === "function" ? progressCharts : () => "";
progressCharts = () => rhythmCard() + _progressCharts();

/* ---------- 6. pair by QR code ---------- */
const pairURL = code => location.origin + location.pathname + "#pair=" + encodeURIComponent(code);
async function qrSVG(text) {
  const { generate } = await import("./vendor/x/lean-qr.mjs");
  const c = generate(text), n = c.size, q = 2; let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (c.get(x, y)) d += `M${x + q} ${y + q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges" role="img" aria-label="QR code for pairing"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}
const _syncCardHTML = syncCardHTML;
syncCardHTML = function () {
  let html = _syncCardHTML();
  if (SY.state === "waiting" && SY.code) {
    html = html.replace(/Waiting for the other device\. On it, open Settings → Sync and choose <b>Enter a code<\/b>\./, "Waiting for the other device. On it, open Settings → Sync and choose <b>Scan a code</b>, or type the code.");
    html = `<div class="qr-box" id="syncQR" aria-live="polite"><span class="spin" aria-hidden="true"></span></div>` + html;
    const code = SY.code; setTimeout(() => qrSVG(pairURL(code)).then(s => { const el = $("#syncQR"); if (el && SY.code === code) el.innerHTML = s; }).catch(() => { const el = $("#syncQR"); if (el) el.remove(); }), 0);
  }
  if (SY.state === "idle" || !SY.state) html = html.replace('data-action="sync-enter">Enter a code</button>', `data-action="sync-scan">${ico("camera")}Scan a code</button><button class="btn btn-line" data-action="sync-enter">Type a code</button>`);
  return html;
};
let scanner = null;
async function openScanner() {
  openSheet("Scan a code", `${sheetHead("Sync phone and laptop", "Scan the pairing code")}<div class="stack" style="gap:12px"><p class="small muted">On the other device, open Settings → Sync and choose Show a pairing code. Point this camera at the square code.</p><div class="scan-box"><video id="scanVid" playsinline muted></video><span class="scan-frame" aria-hidden="true"></span></div><p class="small" id="scanMsg" role="status"><span class="spin" aria-hidden="true"></span>Starting the camera…</p><button class="btn btn-line btn-sm" data-action="sync-type" style="align-self:flex-start">Type the code instead</button></div>`);
  try {
    await loadScript("vendor/x/qr-scanner.umd.min.js");
    const v = $("#scanVid"); if (!v) return;
    scanner = new QrScanner(v, r => {
      const txt = (r && r.data) || "", m = txt.match(/#pair=([\w-]+)/) || txt.match(/^([a-z]+-[a-z]+-\d{2})$/);
      if (!m) { const s = $("#scanMsg"); if (s) s.textContent = "That isn't a Study Desk pairing code. Try again."; return; }
      stopScanner(); closeSheet(); buzz(15); syncJoin(decodeURIComponent(m[1])); go("settings"); setTimeout(() => $("#syncCard")?.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    }, { preferredCamera: "environment", highlightScanRegion: false, returnDetailedScanResult: true });
    await scanner.start(); const s = $("#scanMsg"); if (s) s.textContent = "Looking for a code…";
  } catch (e) { console.error(e); stopScanner(); $(".scan-box")?.remove(); const s = $("#scanMsg"); if (s) s.textContent = /permission|denied|NotAllowed/i.test(String(e && (e.name || e.message || e))) ? "Camera access was blocked. Allow the camera for Study Desk, or type the code instead." : "The camera couldn't start here. Type the code instead."; }
}
function stopScanner() { try { scanner && (scanner.stop(), scanner.destroy()); } catch (e) { } scanner = null; }
new MutationObserver(() => { if (scanner && !$("#scanVid")) stopScanner(); }).observe(document.getElementById("layer"), { childList: true, subtree: true });
function pairFromHash() {
  const m = location.hash.match(/#pair=([\w-]+)/); if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  const code = decodeURIComponent(m[1]);
  const go_ = () => { if (!notesReady) { setTimeout(go_, 300); return; } go("settings"); syncJoin(code); setTimeout(() => $("#syncCard")?.scrollIntoView({ block: "center", behavior: "smooth" }), 400); };
  go_();
}
addEventListener("hashchange", pairFromHash);

/* ---------- 7. guided tour ---------- */
const vis = sel => [...document.querySelectorAll(sel)].find(el => { const r = el.getBoundingClientRect(); return r.width && r.height && getComputedStyle(el).visibility !== "hidden"; });
async function startTour() {
  if (stack.length > 1 || stack[0].v !== "today") { stack = [{ v: "today" }]; render(true); await new Promise(r => setTimeout(r, 350)); }
  window.scrollTo({ top: 0 });
  try { await loadScript("vendor/x/driver.js"); } catch (e) { toast(e.message); return; }
  if (!document.querySelector('link[href$="driver.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "vendor/x/driver.css"; document.head.appendChild(l); }
  const imp = vis('.main [data-go="import"]');
  const steps = [
    { popover: { title: "Welcome to Study Desk", description: "A quick look around. Everything you add stays on this device." } },
    imp ? { element: imp, popover: { title: "Start here", description: "Import a PDF, PowerPoint or Word file. Study Desk finds the chapters and turns the text into notes, summaries and flashcards." } }
      : { element: vis('.tab[data-go="exams"]'), popover: { title: "Your subjects", description: "Exam countdowns, chapters and the Import button for new files." } },
    { element: vis('.tab[data-go="today"]'), popover: { title: "Today", description: "What to study today, with a focus timer. The plan updates as you go." } },
    { element: vis('.tab[data-go="listen"]'), popover: { title: "Listen", description: "Your notes as podcasts, and your lecture recordings." } },
    { element: vis('.tab[data-go="practice"]'), popover: { title: "Review", description: "Flashcards, practice questions and timed practice exams." } },
    { element: vis('.tab[data-go="progress"]'), popover: { title: "Progress", description: "How far you are, your weak areas and your study streak." } },
    { element: vis(".srch"), popover: { title: "Search", description: "Find any topic or anything in your notes." } },
    { element: vis('.gear, .tab[data-go="settings"]'), popover: { title: "Settings", description: "Sync phone and laptop, calendar reminders, voices and backups. You can replay this tour there." } }
  ].filter(s => !("element" in s) || s.element);
  const d = window.driver.js.driver({ showProgress: true, progressText: "{{current}} of {{total}}", nextBtnText: "Next", prevBtnText: "Back", doneBtnText: "Done", popoverClass: "sd-tour", stagePadding: 6, stageRadius: 14, animate: FX.on, smoothScroll: true, allowClose: true, steps, onDestroyed: () => lsSet("studydesk.tour", "done") });
  d.drive();
}
function maybeTour() {
  if (lsGet("studydesk.tour") || navigator.webdriver) return;
  const tryIt = () => { if (!notesReady || $(".scrim") || $(".focus-scrim") || stack[stack.length - 1].v !== "today") return; startTour(); };
  setTimeout(tryIt, 1400);
}

/* ---------- settings, actions, boot ---------- */
const _settingsExtras = settingsExtras;
settingsExtras = () => `<section class="card stack"><h2 class="h3">Search by meaning</h2><div id="smCard" class="stack" style="gap:12px">${smCardHTML()}</div></section>`
  + _settingsExtras()
  + `<section class="card stack"><h2 class="h3">Help</h2><p class="small muted">A 20-second tour of where everything is.</p><button class="btn btn-line btn-auto" data-action="tour">Show me around</button></section>`;
const M_ACTS = new Set(["sm-on", "sm-off", "sm-settings", "pc-new", "pc-edit", "oc-new", "oc-del", "oc-save", "ex-set", "ex-start", "ex-pick", "ex-go", "ex-jump", "ex-hand", "ex-quit", "ex-again", "ex-close", "ex-mock", "sync-scan", "sync-type", "tour"]);
async function mAction(act, a) {
  switch (act) {
    case "sm-settings": closeSheet(); go("settings"); setTimeout(() => $("#smCard")?.scrollIntoView({ block: "center", behavior: "smooth" }), 300); return;
    case "sm-on": {
      SM.state = "loading"; SM.pct = 0; SM.err = ""; drawSmCard();
      try {
        await workerCall(smWorker(), { op: "load" }, d => { SM.pct = d.total ? d.loaded / d.total * .8 : SM.pct; const b = $("#smBar"), t = $("#smPct"); if (b) b.style.width = Math.round(SM.pct * 100) + "%"; if (t) t.textContent = Math.round(SM.pct * 100) + "%"; });
        await smBuild(p => { SM.pct = .8 + p * .2; const b = $("#smBar"), t = $("#smPct"); if (b) b.style.width = Math.round(SM.pct * 100) + "%"; if (t) t.textContent = Math.round(SM.pct * 100) + "%"; });
        SM.on = true; lsSet("studydesk.smart", "on"); SM.state = ""; drawSmCard(); toast("Search by meaning is on.");
      } catch (e) { console.error(e); SM.state = ""; SM.err = "The download didn't finish. Check the internet connection and try again."; drawSmCard(); }
      return;
    }
    case "sm-off": {
      SM.on = false; lsSet("studydesk.smart", ""); SM.vecs.clear(); SM.ready = false; try { SM.w && SM.w.terminate(); } catch (e) { } SM.w = null;
      try { for (const r of (await IDB.all("vec") || [])) await IDB.del("vec", r.id); } catch (e) { }
      try { for (const k of await caches.keys()) if (k === "transformers-cache") { const c = await caches.open(k); for (const r of await c.keys()) if (/all-MiniLM/i.test(r.url)) await c.delete(r); } } catch (e) { }
      drawSmCard(); toast("Search by meaning is off, and its download was removed."); return;
    }
    case "pc-new": openPicSheet(a.dataset.id); return;
    case "pc-edit": openPicSheet(a.dataset.node, a.dataset.pic); return;
    case "oc-new": if (PE) { PE.pic = null; PE.boxes = []; PE.sel = -1; drawPicSheet(); } return;
    case "oc-del": if (PE && PE.sel >= 0) { PE.boxes.splice(PE.sel, 1); PE.sel = -1; drawPicSheet(); } return;
    case "oc-save": picSave(); return;
    case "ex-set": { const k = a.dataset.k, v = a.dataset.v; EXSET[k] = k === "n" ? +v : k === "timed" ? v === "true" : v; if (k === "subj") EXSET.n = Math.min(EXSET.n, Math.max(10, exPool(v).length)) || 10; render(false); return; }
    case "ex-start": exStart(); return;
    case "ex-pick": { const id = EX.qs[EX.i]; EX.picks[id] = +a.dataset.i; exSave(); buzz(5); render(false); return; }
    case "ex-go": EX.i = Math.max(0, Math.min(EX.qs.length - 1, EX.i + +a.dataset.d)); exSave(); render(false); window.scrollTo({ top: 0 }); return;
    case "ex-jump": EX.i = +a.dataset.i; exSave(); render(false); return;
    case "ex-hand": {
      const left = EX.qs.filter(id => EX.picks[id] === undefined).length;
      if (left && !a.dataset.confirm) { a.dataset.confirm = "1"; a.innerHTML = `${ico("flag")}${left} unanswered. ${TAP} again to hand in`; return; }
      exFinish(false); return;
    }
    case "ex-quit": {
      if (EX && !EX.done && !a.dataset.confirm && EX.qs.some(id => EX.picks[id] !== undefined)) { a.dataset.confirm = "1"; toast("Leave the exam? Your answers so far won't be marked.", { label: "Leave", fn: () => { EX = null; exSave(); clearInterval(exTick); go("practice"); } }); return; }
      EX = null; exSave(); clearInterval(exTick); stack = [{ v: "practice" }]; render(true); return;
    }
    case "ex-again": EX = null; exSave(); render(false); window.scrollTo({ top: 0 }); return;
    case "ex-close": EX = null; exSave(); stack = [{ v: "practice" }]; render(true); return;
    case "ex-mock": { EXSET.subj = a.dataset.s; EXSET.timed = true; EX = null; focusAction("min"); go("exam"); return; }
    case "sync-scan": openScanner(); return;
    case "sync-type": stopScanner(); closeSheet(); if (stack[stack.length - 1].v !== "settings") go("settings"); setTimeout(() => { SY.state = "enter"; drawSyncCard(); const c = $("#syncCard"); c?.scrollIntoView({ block: "center" }); $("#sync-code")?.focus({ preventScroll: true }); }, 250); return;
    case "tour": startTour(); return;
  }
}
document.addEventListener("change", async e => {
  if (e.target.id !== "oc-file" || !e.target.files || !e.target.files[0] || !PE) return;
  const msg = $("#oc-msg"); if (msg) msg.innerHTML = `<span class="spin" aria-hidden="true"></span>Opening the picture…`;
  try { PE.pic = await shrinkImage(e.target.files[0]); PE.boxes = []; PE.sel = -1; drawPicSheet(); }
  catch (err) { console.error(err); if (msg) msg.textContent = "Couldn't open that picture. Try a JPEG or PNG."; }
});
document.addEventListener("input", e => { if (e.target.id === "oc-label") picLabelSync(); });
(function mBoot() {
  const w = () => { if (!notesReady) { setTimeout(w, 300); return; } if (EX && !EX.done) exTimer(); if (EX && !EX.done && exLeft() === 0) exFinish(true); pairFromHash(); maybeTour(); };
  w();
})();
