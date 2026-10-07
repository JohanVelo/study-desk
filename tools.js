/* =====================================================================
   Study Desk 4 — study tools
   Flashcards with spaced repetition (ts-fsrs, MIT), blurt check (free recall),
   snap a page (Tesseract.js OCR, Apache-2.0), mind maps, fuzzy search (MiniSearch, MIT).
   Everything runs on the device. Big libraries load only when first used.
   Shares the app's globals (S, nodes, subjects, save, render, toast, …).
   ===================================================================== */

const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  return loaded[src] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => { delete loaded[src]; rej(new Error("Couldn't load " + src + ". Check your connection and try again.")); };
    document.head.appendChild(s);
  });
}
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ---------- flashcards ---------- */
const NEW_PER_DAY = 20, AUTO_PER_TOPIC = 10;
let FS = null;
async function fsrsReady() {
  if (FS) return FS;
  await loadScript("vendor/fsrs.umd.js");
  FS = FSRS.fsrs(FSRS.generatorParameters({ enable_fuzz: true, request_retention: 0.9, maximum_interval: 365 }));
  return FS;
}
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const nowISO = () => new Date().toISOString();

/* Auto cards come from the topic's summary: key terms become fill-in-the-gap cards,
   and the topic itself becomes an "explain it" card. Cards appear once a topic is started. */
function autoCardsFor(id) {
  const n = nodes[id], sm = summaryOf(id), out = [];
  if (!sm || !sm.bullets.length) return out;
  const used = new Set(), done = new Set();
  /* definitions from the notes become "What is …?" cards */
  for (const d of sm.defs || []) {
    if (out.length >= AUTO_PER_TOPIC - 1) break;
    if (d.def.length < 8 || d.def.length > 320) continue;
    out.push({ k: id + ":def:" + hash(d.term.toLowerCase()), f: `What does “${d.term}” mean?`, b: d.def, hint: n.title });
    done.add(d.term.toLowerCase());
  }
  for (const t of sm.terms) {
    if (done.has(t.toLowerCase())) continue;
    if (out.length >= AUTO_PER_TOPIC - 1) break;
    const re = new RegExp(`\\b(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w{0,3})\\b`, "i");
    const b = sm.bullets.find(x => re.test(x) && !used.has(x)); if (!b) continue;
    used.add(b);
    const word = b.match(re)[1];
    out.push({ k: id + ":" + hash(b + word), f: b.replace(re, "＿＿＿＿"), b: word, hint: n.title });
  }
  out.push({ k: id + ":explain", f: `Explain “${n.title}” in your own words.`, b: sm.bullets.slice(0, 3).join(" "), hint: subjects[n.subject].name });
  return out;
}
function ensureCards() {
  if (!S.cards) S.cards = [];
  const have = new Set(S.cards.map(c => c.k).filter(Boolean)), gone = new Set(S.cardsGone || []);
  let added = 0;
  for (const id of leafIds) {
    if (st(id) < 1) continue;
    for (const c of autoCardsFor(id)) {
      if (have.has(c.k) || gone.has(c.k)) continue;
      S.cards.push({ id: newId("c"), node: id, f: c.f, b: c.b, kind: "auto", k: c.k, due: null, s: null, added: todayKey() });
      have.add(c.k); added++;
    }
  }
  if (added) save();
  return added;
}
function newDoneToday() { const t = todayKey(); return S.log.filter(e => e.t === "card" && e.d === t && e.nw).length; }
function dueCards(limitNew = true) {
  const now = Date.now(), cards = S.cards || [];
  const due = cards.filter(c => c.s && c.due && Date.parse(c.due) <= now).sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
  const fresh = cards.filter(c => !c.s && nodes[c.node]);
  const room = limitNew ? Math.max(0, NEW_PER_DAY - newDoneToday()) : fresh.length;
  return [...due, ...fresh.slice(0, room)];
}
function cardsDueCount() { try { return dueCards().length; } catch (e) { return 0; } }

let R = null; // review session
async function startReview(node) {
  try { await fsrsReady(); } catch (e) { toast(e.message); return; }
  ensureCards();
  let list = dueCards();
  if (node) { const ids = new Set(leavesUnder(node)); list = (S.cards || []).filter(c => ids.has(c.node)).sort((a, b) => (a.due ? Date.parse(a.due) : 0) - (b.due ? Date.parse(b.due) : 0)); }
  if (!list.length) { toast(node ? "No cards for this topic yet. Add one, or add notes to get cards automatically." : "Nothing due. Your next cards come back later."); return; }
  R = { ids: list.slice(0, 60).map(c => c.id), i: 0, shown: false, right: 0, done: 0, again: 0, start: Date.now(), node: node || null };
  go("review");
}
const ivl = (card, now) => {
  const ms = Date.parse(card.due) - now; const m = Math.round(ms / 60000);
  if (m < 60) return Math.max(1, m) + "m"; const h = Math.round(m / 60); if (h < 24) return h + "h";
  const d = Math.round(h / 24); if (d < 31) return d + "d"; const mo = Math.round(d / 30); return mo < 12 ? mo + "mo" : Math.round(d / 365) + "y";
};
const toFS = c => c.s ? { ...c.s, due: new Date(c.due), last_review: c.s.last_review ? new Date(c.s.last_review) : undefined } : FSRS.createEmptyCard(new Date());
function gradeCard(g) {
  if (!R || !FS) return;
  const c = (S.cards || []).find(x => x.id === R.ids[R.i]); if (!c) { R.i++; return rerender(); }
  const wasNew = !c.s, now = new Date();
  const rec = FS.next(toFS(c), now, g).card;
  c.s = { stability: rec.stability, difficulty: rec.difficulty, elapsed_days: rec.elapsed_days, scheduled_days: rec.scheduled_days, reps: rec.reps, lapses: rec.lapses, learning_steps: rec.learning_steps, state: rec.state, last_review: now.toISOString() };
  c.due = rec.due.toISOString();
  logEvent({ t: "card", n: c.node, g, nw: wasNew ? 1 : 0 });
  R.done++; if (g >= 3) R.right++; if (g === 1) { R.again++; if (R.ids.filter(x => x === c.id).length < 3) R.ids.push(c.id); }
  // a correct recall counts as active recall for the topic
  if (g >= 3 && st(c.node) === 1) setStatus(c.node, 2, "Recalled with flashcards");
  save(); buzz(8);
  R.i++; R.shown = false;
  const el = $(".fcard"); if (FX.on && el) { gsap.to(el, { x: g === 1 ? -60 : 60, opacity: 0, duration: .18, ease: "power2.in", onComplete: () => { rerender(); const n = $(".fcard"); if (n) gsap.from(n, { y: 18, opacity: 0, duration: .32, ease: "expo.out" }); } }); }
  else rerender();
  if (R.i >= R.ids.length) setTimeout(() => FX.party(), 200);
}
V.review = () => {
  if (!R) return `<div class="card empty">No review running. <button class="link" data-go="practice">Back to Review</button></div>`;
  const total = R.ids.length;
  if (R.i >= total) {
    const mins = Math.max(1, Math.round((Date.now() - R.start) / 60000)), next = (S.cards || []).filter(c => c.due).sort((a, b) => Date.parse(a.due) - Date.parse(b.due)).find(c => Date.parse(c.due) > Date.now());
    return `<div class="stack review-done" style="gap:18px"><header class="subhead"><div class="eyebrow">Flashcards</div><h1>Review done</h1></header>
      <div class="tiles"><div class="tile"><b data-count="${R.done}">${R.done}</b><span>cards reviewed</span></div><div class="tile"><b>${R.done ? Math.round(R.right / R.done * 100) : 0}%</b><span>remembered</span></div><div class="tile"><b>${mins}</b><span>minute${mins > 1 ? "s" : ""}</span></div>${next ? `<div class="tile"><b>${ivl(next, Date.now())}</b><span>until the next card</span></div>` : `<div class="tile"><b>0</b><span>cards waiting</span></div>`}</div>
      <p class="muted">Cards you forgot come back sooner, and cards you knew come back later. That spacing is what makes it stick.</p>
      <div class="row"><button class="btn btn-pen" data-go="practice">Back to Review</button><button class="btn btn-line" data-go="today">Today</button></div></div>`;
  }
  const c = (S.cards || []).find(x => x.id === R.ids[R.i]);
  if (!c || !nodes[c.node]) { R.i++; return V.review(); }
  const n = nodes[c.node], now = Date.now();
  let prev = null; try { prev = FS && FS.repeat(toFS(c), new Date(now)); } catch (e) { }
  const g = (k, label, cls) => `<button class="grade ${cls}" data-action="fc-grade" data-g="${k}"><b>${label}</b><span class="mono">${prev ? ivl(prev[k].card.due ? { due: prev[k].card.due.toISOString() } : c, now) : ""}</span></button>`;
  return `<div class="stack review" style="gap:16px">
    <div class="rv-top"><button class="icon-btn" data-action="fc-quit" aria-label="End review">${ico("x")}</button><div class="rv-bar" role="progressbar" aria-label="Review progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${R.i}"><i style="transform:scaleX(${R.i / total})"></i></div><span class="mono small">${R.i + 1}/${total}</span></div>
    <div class="fcard ${R.shown ? "flip" : ""}" style="--pc:${subjColor(n.subject)}">
      <div class="fc-in">
        ${c.kind === "pic" && typeof picView === "function" ? `<button class="fc-face fc-front fc-pic" data-action="fc-show" aria-label="Show answer"><span class="fc-meta">${esc(subjects[n.subject].name)} · ${esc(n.title)} · picture card</span><span class="fc-q small">${esc(c.f)}</span>${picView(c, false)}<span class="fc-tap">${TAP} to show the answer</span></button>
        <div class="fc-face fc-back fc-pic" aria-live="polite"><span class="fc-meta">Answer</span>${c.b !== "Check the picture" ? `<span class="fc-a">${esc(c.b)}</span>` : ""}${picView(c, true)}</div>`
        : `<button class="fc-face fc-front" data-action="fc-show" aria-label="Show answer"><span class="fc-meta">${esc(subjects[n.subject].name)} · ${esc(n.title)}${c.kind === "own" ? " · your card" : ""}</span><span class="fc-q">${esc(c.f)}</span><span class="fc-tap">${TAP} to show the answer</span></button>
        <div class="fc-face fc-back" aria-live="polite"><span class="fc-meta">Answer</span><span class="fc-a">${esc(c.b)}</span><span class="fc-q small">${esc(c.f)}</span></div>`}
      </div>
    </div>
    ${R.shown ? `<div class="grades" role="group" aria-label="How well did you remember?">${g(1, "Forgot", "g1")}${g(2, "Hard", "g2")}${g(3, "Good", "g3")}${g(4, "Easy", "g4")}</div><p class="tiny muted center">Be honest. The schedule adapts to you. Keys 1 to 4 work on a laptop.</p>`
      : `<button class="btn btn-pen big-btn" data-action="fc-show">Show answer</button><p class="tiny muted center">Try to answer in your head first. Space bar shows the answer.</p>`}
  </div>`;
};

function openCardSheet(node, cid) {
  const c = cid ? (S.cards || []).find(x => x.id === cid) : null, n = nodes[node];
  openSheet("Flashcard", `${sheetHead(subjects[n.subject].name + " · " + n.title, c ? "Edit flashcard" : "New flashcard")}
    <div class="stack form">
      <label class="fld"><span>Question (front)</span><textarea id="fc-f" rows="3" placeholder="e.g. What is a confounding variable?">${esc(c ? c.f : "")}</textarea></label>
      <label class="fld"><span>Answer (back)</span><textarea id="fc-b" rows="3" placeholder="e.g. A third variable that affects both the IV and the DV">${esc(c ? c.b : "")}</textarea></label>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="fc-save" data-node="${node}" data-id="${c ? c.id : ""}">${c ? "Save card" : "Add card"}</button>${c ? `<button class="btn btn-line btn-sm" data-action="fc-del" data-id="${c.id}">Delete card</button>` : ""}</div></div>`);
}
function cardsSection(id) {
  if (st(id) >= 1) ensureCards();
  const cs = (S.cards || []).filter(c => c.node === id), due = cs.filter(c => !c.s || Date.parse(c.due) <= Date.now()).length;
  return `<section class="card stack" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">Flashcards</h2><span class="tiny muted">${cs.length} card${cs.length === 1 ? "" : "s"}${due ? ` · ${due} due` : ""}</span></div>
    ${cs.length ? `<div class="fc-list">${cs.slice(0, 8).map(c => c.kind === "pic" ? `<button class="fc-row" data-action="pc-edit" data-pic="${c.pic}" data-node="${id}"><span class="grow">${ico("image", 'class="fc-ri"')}${esc(c.b !== "Check the picture" ? c.b : "Hidden label")}</span><span class="tiny muted">picture</span></button>` : `<button class="fc-row" data-action="fc-edit" data-id="${c.id}" data-node="${id}"><span class="grow">${esc(c.f)}</span><span class="tiny muted">${c.kind === "own" ? "yours" : "auto"}</span></button>`).join("")}${cs.length > 8 ? `<p class="tiny muted">and ${cs.length - 8} more</p>` : ""}</div>`
      : `<p class="small muted">${st(id) < 1 ? "Cards are made from your notes once you start this topic." : "Add notes to get cards automatically, or write your own."}</p>`}
    <div class="row" style="flex-wrap:wrap"><button class="btn btn-line btn-sm" data-action="fc-new" data-id="${id}">+ Add a card</button>${typeof openPicSheet === "function" ? `<button class="btn btn-line btn-sm" data-action="pc-new" data-id="${id}">${ico("image")}Picture card</button>` : ""}</div></section>`;
}

/* ---------- blurt check: write everything you remember, then see what you missed ---------- */
const stem = w => w.replace(/(ing|ed|es|s|ly|al|ion|ions|ity)$/, "").slice(0, 7);
function blurtGrade(text, id) {
  const sm = summaryOf(id); if (!sm) return null;
  const said = new Set(words(text).map(stem));
  const ideas = sm.bullets.map(b => {
    const ws = [...new Set(words(b).filter(w => w.length > 3).map(stem))];
    const hit = ws.filter(w => said.has(w)).length;
    return { b, ok: ws.length ? hit / ws.length >= .34 : false };
  });
  const terms = sm.terms.map(t => ({ t, ok: said.has(stem(t)) }));
  const total = ideas.length + terms.length, got = ideas.filter(x => x.ok).length + terms.filter(x => x.ok).length;
  return { ideas, terms, score: total ? got / total : 0 };
}
function openBlurt(id, result) {
  const n = nodes[id], sm = summaryOf(id);
  if (!sm) { openSheet("Blurt check", `${sheetHead(n.title, "Blurt check")}<div class="stack form"><p class="muted">A blurt check compares what you remember with this topic's notes. Add notes first (type, paste, import a PDF or snap a page), then try again.</p><button class="btn btn-pen" data-action="notes" data-id="${id}">${ico("notes")}Add notes</button></div>`); return; }
  openSheet("Blurt check", `${sheetHead(subjects[n.subject].name + " · " + n.num, "Blurt check: " + n.title)}
    <div class="stack form">
      ${result ? `<div class="blurt-score" style="--p:${result.score}"><b>${Math.round(result.score * 100)}%</b><span>${result.score >= .7 ? "Great recall. This topic is sticking." : result.score >= .4 ? "Good start. Read the missed ideas, then try again tomorrow." : "Lots to review. Read the missed ideas below, then blurt again later."}</span></div>
        <ul class="blurt-list">${result.ideas.map(x => `<li class="${x.ok ? "ok" : "gap"}">${ico(x.ok ? "check" : "x")}<span>${esc(x.b)}</span></li>`).join("")}</ul>
        ${result.terms.length ? `<div class="terms">${result.terms.map(x => `<span class="${x.ok ? "" : "gap"}">${x.ok ? "✓ " : ""}${esc(x.t)}</span>`).join("")}</div>` : ""}
        <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-action="blurt" data-id="${id}">Try again</button><button class="btn btn-line" data-x="close">Done</button></div>`
      : `<p class="small muted">Close your notes. Write down everything you remember about this topic: key ideas, terms, examples. Don't worry about spelling or order. Then tap Check.</p>
        <label class="sr" for="blurt-text">What you remember</label><textarea id="blurt-text" rows="9" class="notes-ta" placeholder="Everything I remember about ${esc(n.title)}…"></textarea>
        <div class="row"><button class="btn btn-pen" data-action="blurt-check" data-id="${id}">${ico("check")}Check what I remembered</button></div>`}
    </div>`);
}

/* ---------- snap a page: photo → text, read on this device ---------- */
let ocrWorker = null, ocrBusy = false;
async function ocrImages(files, onProgress) {
  await loadScript("vendor/ocr/tesseract.min.js");
  if (!ocrWorker) {
    onProgress && onProgress("Getting the text reader ready (first time only)…", 0);
    ocrWorker = await Tesseract.createWorker("eng", 1, {
      workerPath: new URL("vendor/ocr/worker.min.js", location.href).href,
      corePath: new URL("vendor/ocr/core", location.href).href,
      langPath: new URL("vendor/ocr/lang", location.href).href,
      gzip: true, cacheMethod: "write",
      logger: m => { if (m.status === "recognizing text" && onProgress) onProgress(curLabel, m.progress); }
    });
  }
  let out = [], curLabel = "";
  for (let i = 0; i < files.length; i++) {
    curLabel = files.length > 1 ? `Reading page ${i + 1} of ${files.length}…` : "Reading the page…";
    onProgress && onProgress(curLabel, 0);
    const { data } = await ocrWorker.recognize(files[i]);
    out.push(cleanOcr(data.text || ""));
  }
  return out.filter(Boolean).join("\n\n");
}
function cleanOcr(t) {
  return t.replace(/-\n(\w)/g, "$1").replace(/([^\n.!?:])\n(?=[a-z(])/g, "$1 ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
async function snapToNotes(files) {
  if (ocrBusy) return; ocrBusy = true;
  const st_ = $("#ocr-status"), ta = $("#notes-text");
  const show = (label, p) => { if (st_) st_.innerHTML = `<span class="spin" aria-hidden="true"></span><span>${esc(label)}${p ? ` ${Math.round(p * 100)}%` : ""}</span>`; };
  try {
    const text = await ocrImages([...files], show);
    if (!text.trim()) { if (st_) st_.innerHTML = `${ico("info")}<span>Couldn't find any text. Try a sharper, well-lit photo taken straight on.</span>`; return; }
    if (ta) { ta.value = (ta.value.trim() ? ta.value.trim() + "\n\n" : "") + text; ta.scrollTop = ta.scrollHeight; }
    if (st_) st_.innerHTML = `${ico("check")}<span>Added ${text.split(/\s+/).length} words. Check them, then tap Save notes.</span>`;
  } catch (e) {
    console.error(e);
    if (st_) st_.innerHTML = `${ico("info")}<span>Couldn't read that photo. ${esc(e && e.message && /load/i.test(e.message) ? e.message : "Try again, or paste the text instead.")}</span>`;
  } finally { ocrBusy = false; const inp = $("#ocr-file"); if (inp) inp.value = ""; }
}

/* ---------- mind map of a subject ---------- */
// phones: a vertical branch (outline) that fits the screen, no sideways scrolling
function mapTall(sid) {
  const s = subjects[sid], rows = [], rowH = 40, ind = 22, pad = 14;
  const walk = (id, depth) => { rows.push({ id, depth }); (nodes[id].kids || []).forEach(k => walk(k, depth + 1)); };
  s.chapterIds.forEach(c => walk(c, 1));
  const W = Math.max(280, Math.min(innerWidth - 56, 640)), H = pad * 2 + (rows.length + 1) * rowH;
  const pos = { [sid]: { x: pad + 6, y: pad + rowH / 2 } };
  rows.forEach((r, i) => pos[r.id] = { x: pad + 6 + r.depth * ind, y: pad + rowH / 2 + (i + 1) * rowH });
  const par = {}; rows.forEach(r => (nodes[r.id].kids || []).forEach(k => par[k] = r.id)); s.chapterIds.forEach(c => par[c] = sid);
  const col = id => { const n = nodes[id]; return n.leaf ? (st(id) ? STATUS_COL[st(id)] : "var(--line)") : subjColor(sid); };
  let links = "";
  rows.forEach((r, k) => { const a = pos[par[r.id]], b = pos[r.id]; links += `<path class="mm-l" style="--k:${k}" d="M${a.x} ${a.y + 8} V${b.y - 10} Q${a.x} ${b.y} ${a.x + 10} ${b.y} H${b.x - 7}"/>`; });
  const nodesSvg = rows.map(r => { const n = nodes[r.id], p = pos[r.id], max = Math.max(12, Math.floor((W - p.x - 18) / (r.depth === 1 ? 8.2 : 7.3))), raw = (r.depth === 1 ? n.num + " " : "") + n.title, t = raw.length > max ? raw.slice(0, max - 1) + "…" : raw;
    return `<a class="mm-n d${r.depth}" href="#" data-go="${r.depth === 1 ? "chapter:" : "topic:"}${r.id}" style="--d:${Math.min(r.depth, 3)}"><title>${esc(n.num + " " + n.title)} (${n.leaf ? STATUS[st(r.id)] : pct(progress(r.id)) + "% done"})</title><rect class="mm-hit" x="${p.x - 10}" y="${p.y - rowH / 2}" width="${W - p.x + 8}" height="${rowH}"/><circle cx="${p.x}" cy="${p.y}" r="${r.depth === 1 ? 6 : 4.5}" style="fill:${col(r.id)}" stroke="var(--surface)" stroke-width="2"/><text x="${p.x + 12}" y="${p.y + 4.5}">${esc(t)}</text></a>`; }).join("");
  return `<svg class="mm mm-tall" viewBox="0 0 ${W} ${H}" width="100%" role="group" aria-label="Mind map of ${esc(s.name)}">${links}<g class="mm-root"><rect x="${pos[sid].x - 10}" y="${pos[sid].y - 16}" rx="12" width="${Math.min(W - 8, 9 * s.name.length + 34)}" height="32" style="fill:${subjColor(sid)}"/><text x="${pos[sid].x + 6}" y="${pos[sid].y + 5}" fill="var(--surface)">${esc(s.name)}</text></g>${nodesSvg}</svg>`;
}
V.map = sid => {
  const s = subjects[sid]; if (!s) return V.exams();
  const tall = matchMedia("(max-width: 699px)").matches;
  if (tall) return `<div class="stack" style="gap:16px">
    <header class="subhead"><div class="eyebrow">${esc(s.name)} · mind map</div><h1>Everything in ${esc(s.name)}</h1><p class="small muted">Dots show each topic's stage. ${TAP} any line to open it.</p></header>
    <div class="card mm-wrap">${mapTall(sid)}</div>
    <div class="legend">${STATUS.map((x, i) => `<span><i style="--c:${i === 0 ? "var(--line)" : STATUS_COL[i]}"></i>${x}</span>`).join("")}</div></div>`;
  const rowH = 34, pad = 16, rows = [];
  /* columns are as wide as their longest label, so titles aren't cut short */
  const lenAt = d => Math.max(10, ...Object.values(nodes).filter(n => n.subject === sid && n.depth === d - 1).map(n => Math.min(44, (d === 1 ? n.num.length + 1 : 0) + n.title.length)));
  const colW = [0, 190, Math.max(200, Math.round(7.6 * lenAt(1) + 60)), Math.max(220, Math.round(7.2 * lenAt(2) + 60))];
  let y = 0;
  const place = (id, depth) => {
    const n = nodes[id], kids = n.kids || [];
    if (!kids.length) { const r = { id, depth, y: y++ }; rows.push(r); return r.y; }
    const ys = kids.map(k => place(k, depth + 1));
    const r = { id, depth, y: (ys[0] + ys[ys.length - 1]) / 2 }; rows.push(r); return r.y;
  };
  const cy = s.chapterIds.map(c => place(c, 1));
  const rootY = cy.length ? (cy[0] + cy[cy.length - 1]) / 2 : 0;
  const X = d => pad + colW.slice(0, d + 1).reduce((a, b) => a + b, 0), Y = v => pad + 14 + v * rowH;
  const H = Y(Math.max(y - 1, 0)) + 30, maxD = Math.max(1, ...rows.map(r => r.depth)), W = X(maxD) + 260;
  const pos = { [sid]: { x: X(0), y: Y(rootY) } }; rows.forEach(r => pos[r.id] = { x: X(r.depth), y: Y(r.y) });
  const link = (a, b, k) => { const mx = (a.x + b.x) / 2 + 30; return `<path class="mm-l" style="--k:${k}" d="M${a.x + 8} ${a.y} C ${mx} ${a.y}, ${mx - 40} ${b.y}, ${b.x - 6} ${b.y}"/>`; };
  let links = "", k = 0;
  s.chapterIds.forEach(c => { links += link({ x: pos[sid].x + 120, y: pos[sid].y }, pos[c], k++); });
  rows.forEach(r => (nodes[r.id].kids || []).forEach(kid => { links += link({ x: pos[r.id].x + Math.min(colW[r.depth + 1] - 40, 7.2 * nodes[r.id].title.length + 34), y: pos[r.id].y }, pos[kid], k++); }));
  const col = id => { const n = nodes[id]; return n.leaf ? (st(id) ? STATUS_COL[st(id)] : "var(--line)") : subjColor(sid); };
  const label = (t, max) => t.length > max ? t.slice(0, max - 1) + "…" : t;
  const nodesSvg = rows.map(r => { const n = nodes[r.id], p = pos[r.id], max = 44;
    return `<a class="mm-n d${r.depth}" href="#" data-go="${r.depth === 1 ? "chapter:" : "topic:"}${r.id}" style="--d:${r.depth}"><title>${esc(n.num + " " + n.title)} (${n.leaf ? STATUS[st(r.id)] : pct(progress(r.id)) + "% done"})</title><rect class="mm-hit" x="${p.x - 8}" y="${p.y - 17}" width="${Math.min(colW[Math.min(r.depth + 1, 3)] || 250, 7.4 * label((r.depth === 1 ? n.num + " " : "") + n.title, max).length + 26)}" height="34"/><circle cx="${p.x}" cy="${p.y}" r="${r.depth === 1 ? 6 : 4.5}" style="fill:${col(r.id)}" stroke="var(--surface)" stroke-width="2"/><text x="${p.x + 10}" y="${p.y + 4}">${esc(label((r.depth === 1 ? n.num + " " : "") + n.title, max))}</text></a>`; }).join("");
  return `<div class="stack" style="gap:16px">
    <header class="subhead"><div class="eyebrow">${esc(s.name)} · mind map</div><h1>Everything in ${esc(s.name)}</h1><p class="small muted">Dots show each topic's stage. ${TAP} any branch to open it.</p></header>
    <div class="card mm-wrap"><svg class="mm" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Mind map of ${esc(s.name)}">
      ${links}<g class="mm-root"><rect x="${pos[sid].x - 6}" y="${pos[sid].y - 17}" rx="12" width="${Math.min(170, 9 * s.name.length + 30)}" height="34" style="fill:${subjColor(sid)}"/><text x="${pos[sid].x + 8}" y="${pos[sid].y + 5}" fill="var(--surface)">${esc(label(s.name, 16))}</text></g>${nodesSvg}</svg></div>
    <div class="legend">${STATUS.map((x, i) => `<span><i style="--c:${i === 0 ? "var(--line)" : STATUS_COL[i]}"></i>${x}</span>`).join("")}</div>
  </div>`;
};

/* ---------- fuzzy search (MiniSearch), falls back to the simple search ---------- */
let MS = null, msKey = "";
async function searchIndex() {
  const key = Object.keys(nodes).length + ":" + Object.values(NOTES).reduce((a, t) => a + t.length, 0) + ":" + DSUBJ.length;
  if (MS && msKey === key) return MS;
  await loadScript("vendor/minisearch.umd.js");
  MS = new MiniSearch({ fields: ["title", "notes", "subject", "terms"], storeFields: ["go", "title", "sub", "sid", "kind"], searchOptions: { boost: { title: 4, terms: 3, subject: 2 }, prefix: true, fuzzy: .2 } });
  const docs = DSUBJ.map(s => ({ id: "s:" + s.id, go: "subject:" + s.id, title: s.name, notes: "", subject: s.name, sub: "Subject", sid: s.id, kind: "s" }));
  Object.values(nodes).forEach(n => docs.push({ id: "n:" + n.id, go: (n.depth === 0 ? "chapter:" : "topic:") + n.id, title: n.title, notes: notesOf(n.id).slice(0, 20000), terms: (() => { const sm = n.leaf ? summaryOf(n.id) : null; return sm ? [...(sm.terms || []), ...(sm.defs || []).map(d => d.term)].join(" ") : ""; })(), subject: subjects[n.subject].name, sub: `${subjects[n.subject].name} · ${n.num}${n.p1 ? ` · pp ${n.p1}–${n.p2}` : ""}`, sid: n.subject, kind: "n" }));
  MS.addAll(docs); msKey = key; return MS;
}
async function fuzzySearch(q) {
  try {
    const ms = await searchIndex();
    return ms.search(q).slice(0, 40).map(r => ({ go: r.go, title: r.title, sub: r.sub + (r.match && !Object.values(r.match).flat().includes("title") && Object.values(r.match).flat().includes("notes") ? " · found in your notes" : ""), sid: r.sid }));
  } catch (e) { return null; }
}

/* ---------- actions ---------- */
const TOOL_ACTS = new Set(["fc-start", "fc-topic", "fc-show", "fc-grade", "fc-quit", "fc-new", "fc-edit", "fc-save", "fc-del", "blurt", "blurt-check", "map"]);
function toolAction(act, a) {
  const id = a.dataset.id;
  switch (act) {
    case "fc-start": startReview(); return true;
    case "fc-topic": startReview(id); return true;
    case "fc-show": if (!R) return true; R.shown = true; rerender(); const fc = $(".fcard"); if (fc && FX.on) { fc.classList.remove("flip"); requestAnimationFrame(() => fc.classList.add("flip")); } setTimeout(() => $(".grade.g3")?.focus({ preventScroll: true }), 50); return true;
    case "fc-grade": gradeCard(+a.dataset.g); return true;
    case "fc-quit": R = R ? { ...R, i: R.ids.length } : null; if (R && !R.done) { R = null; go("practice"); } else rerender(); return true;
    case "fc-new": openCardSheet(id); return true;
    case "fc-edit": openCardSheet(a.dataset.node, id); return true;
    case "fc-save": {
      const f = ($("#fc-f")?.value || "").trim().slice(0, 1000), b = ($("#fc-b")?.value || "").trim().slice(0, 2000);
      if (!f || !b) { toast("Write both a question and an answer."); return true; }
      if (!S.cards) S.cards = [];
      if (id) { const c = S.cards.find(x => x.id === id); if (c) { c.f = f; c.b = b; if (c.kind === "auto") { c.kind = "own"; } } }
      else S.cards.push({ id: newId("c"), node: a.dataset.node, f, b, kind: "own", due: null, s: null, added: todayKey() });
      save(); closeSheet(); rerender(); toast(id ? "Card saved." : "Card added. It shows up in your next review."); return true;
    }
    case "fc-del": {
      const c = (S.cards || []).find(x => x.id === id); if (!c) return true;
      S.cards = S.cards.filter(x => x.id !== id); if (c.k) { S.cardsGone = [...(S.cardsGone || []), c.k].slice(-3000); }
      save(); closeSheet(); rerender(); toast("Card deleted."); return true;
    }
    case "blurt": openBlurt(id); return true;
    case "blurt-check": {
      const txt = $("#blurt-text")?.value || "";
      if (words(txt).length < 3) { toast("Write a few things you remember first."); return true; }
      const r = blurtGrade(txt, id); if (!r) return true;
      logEvent({ t: "blurt", n: id, sc: Math.round(r.score * 100) });
      if (r.score >= .6 && st(id) === 1) setStatus(id, 2, "Explained from memory");
      save(); openBlurt(id, r); buzz(10);
      if (r.score >= .7) setTimeout(() => FX.burst($(".blurt-score"), 30, 70), 120);
      return true;
    }
  }
  return false;
}
document.addEventListener("keydown", e => {
  if (stack[stack.length - 1].v !== "review" || !R || R.i >= R.ids.length || e.target.closest("input,textarea") || $(".scrim")) return;
  if (e.key === " " && !R.shown) { e.preventDefault(); toolAction("fc-show", { dataset: {} }); }
  else if (R.shown && /^[1-4]$/.test(e.key)) { e.preventDefault(); gradeCard(+e.key); }
});
document.addEventListener("change", e => {
  if (e.target.id === "ocr-file" && e.target.files && e.target.files.length) snapToNotes(e.target.files);
});
