/* Study Desk v4.7: easier to use
   1. Each topic opens with one clear set of ways to study it.
   2. Settings gets a "jump to" row, so the long page is easy to get around.
   3. Help that explains a feature in one line wherever it is first used. */

/* ---------- 1. study tiles at the top of a topic ---------- */
function studyTiles(id) {
  const n = nodes[id]; if (!n || !n.leaf) return "";
  const cs = (S.cards || []).filter(c => c.node === id), due = cs.filter(c => !c.s || Date.parse(c.due) <= Date.now()).length;
  const qn = QS.filter(q => q.node === id).length, hasNotes = !!notesOf(id) || !!summaryOf(id);
  const b = typeof booksOf === "function" ? booksOf(n.subject)[0] : null;
  const t = (act, icon, label, hint, extra = "", primary = false) => `<button class="st-tile${primary ? " st-main" : ""}" ${act} ${extra}><span class="st-ic">${ico(icon)}</span><span class="st-t"><b>${label}</b><span>${hint}</span></span></button>`;
  const tiles = [
    b && n.p1 ? t(`data-go="read:${b.id}:${pageIndexOf(b, n.p1)}"`, "book", "Read", `Pages ${n.p1}–${n.p2} in the textbook`)
      : t(`data-action="notes" data-id="${id}"`, "notes", hasNotes ? "Notes" : "Add notes", hasNotes ? "Read or edit them" : "Paste, type or snap a page"),
    cs.length ? t(`data-action="fc-topic" data-id="${id}"`, "cards", "Flashcards", due ? `${due} to review now` : `${cs.length} card${cs.length > 1 ? "s" : ""}, none due`, "", due > 0)
      : t(`data-action="fc-new" data-id="${id}"`, "cards", "Flashcards", hasNotes ? "Made from notes once you start" : "Write your first card"),
    t(`data-action="practise" data-id="${id}"`, "pencil", "Practise", qn ? `${qn} question${qn > 1 ? "s" : ""} from your notes` : "Questions for this subject", "", !due && qn > 0),
    t(`data-action="blurt" data-id="${id}"`, "bulb", "Blurt check", "Write what you remember"),
    t(`data-action="tb-open" data-id="${id}"`, "mic", "Teach it back", "Explain it out loud"),
    t(`data-action="ep-play" data-kind="topic" data-id="${id}"`, "headphones", "Listen", "Summary read aloud")
  ];
  return `<section class="st-wrap" aria-label="Ways to study this topic"><h2 class="sr">Study this topic</h2><div class="st-grid">${tiles.join("")}</div></section>`;
}
const _vTopicE = V.topic;
V.topic = id => {
  const h = _vTopicE(id), n = nodes[id]; if (!n || !n.leaf) return h;
  return h.replace(/<\/header>/, m0 => m0 + studyTiles(id));
};

/* ---------- 2. settings: jump to a section ---------- */
/* long pages get a row of shortcuts to their main parts */
const JUMPS = {
  settings: [["Study days", "Plan"], ["Appearance", "Look"], ["Sync phone and laptop", "Sync"], ["Backup and restore", "Backup"], ["Podcast voice", "Voices"], ["Reminders", "Reminders"], ["Help", "Help"]],
  progress: [["Last 14 days", "Week"], ["Focus next", "Focus"], ["Study rhythm", "Streak"], ["Memory and study time", "Memory"], ["By subject and chapter", "Chapters"], ["My weak areas", "Weak spots"]]
};
function settingsJump(view = "settings") {
  const v = $(`.view[data-view="${view}"]`), list = JUMPS[view]; if (!v || !list || $(".set-jump", v)) return;
  const found = [];
  $$("h2", v).forEach(h => { const t = h.textContent.trim(), j = list.find(x => x[0] === t); if (!j || found.includes(j)) return; const card = h.closest(".card,section") || h; card.id = "set-" + j[1].toLowerCase().replace(/\s+/g, "-"); found.push(j); });
  if (found.length < 3) return;
  const order = list.filter(j => found.includes(j));
  $("header.subhead", v)?.insertAdjacentHTML("afterend", `<nav class="set-jump" aria-label="Jump to a setting">${order.map(([, l]) => { const k = "set-" + l.toLowerCase().replace(/\s+/g, "-"); return `<a href="#${k}" data-jump="${k}">${l}</a>`; }).join("")}</nav>`);
}
document.addEventListener("click", e => {
  const a = e.target.closest?.("[data-jump]"); if (!a) return; e.preventDefault();
  const el = document.getElementById(a.dataset.jump); if (!el) return;
  const j = $(".set-jump"), off = j ? (parseFloat(getComputedStyle(j).top) || 0) + j.offsetHeight + 12 : 76, top = el.getBoundingClientRect().top + scrollY - off; window.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  el.classList.remove("set-flash"); void el.offsetWidth; el.classList.add("set-flash");
});

/* ---------- 3. one-line tips the first time a screen is seen ---------- */
const TIPS = {
  topic: "Tip: pick any tile to study this topic. Progress moves up the ladder as you practise and revise.",
  practice: "Tip: wrong answers go to Mistakes to review, and those topics move up your plan.",
  read: null
};
const tipSeen = k => { try { return JSON.parse(localStorage.getItem("studydesk.tips") || "{}")[k]; } catch (e) { return true; } };
const tipDone = k => { try { const o = JSON.parse(localStorage.getItem("studydesk.tips") || "{}"); o[k] = 1; localStorage.setItem("studydesk.tips", JSON.stringify(o)); } catch (e) { } };
function showTip(v) {
  const txt = TIPS[v]; if (!txt || tipSeen(v) || $(".ez-tip")) return;
  const anchor = v === "topic" ? $(".st-wrap") : $(".view header.subhead"); if (!anchor) return;
  anchor.insertAdjacentHTML("afterend", `<div class="ez-tip" role="note">${ico("info")}<span>${esc(txt)}</span><button class="icon-btn sm" data-action="tip-x" data-k="${v}" aria-label="Got it">${ico("x")}</button></div>`);
}
const E_ACTS = new Set(["tip-x"]);
function eAction(act, a) { if (act === "tip-x") { tipDone(a.dataset.k); a.closest(".ez-tip")?.remove(); } }

const _renderE = render;
render = function (fresh) {
  _renderE(fresh);
  const v = stack[stack.length - 1].v;
  if (JUMPS[v]) settingsJump(v);
  showTip(v);
};
/* the shortcut for the part on screen is marked as you scroll */
let jumpRaf = 0;
addEventListener("scroll", () => {
  const j = $(".set-jump"); if (!j) return;
  cancelAnimationFrame(jumpRaf);
  jumpRaf = requestAnimationFrame(() => {
    const off = (parseFloat(getComputedStyle(j).top) || 0) + j.offsetHeight + 40; let cur = null;
    $$("a[data-jump]", j).forEach(a => { const el = document.getElementById(a.dataset.jump); if (el && el.getBoundingClientRect().top <= off) cur = a; });
    $$("a[data-jump]", j).forEach(a => { if (a === cur) { if (a.getAttribute("aria-current") !== "true") { a.setAttribute("aria-current", "true"); a.scrollIntoView({ block: "nearest", inline: "nearest" }); } } else a.removeAttribute("aria-current"); });
  });
}, { passive: true });

/* ---------- 4. catch up: earlier sessions that weren't ticked, handled in one tap ---------- */
function passedToday() {
  const t = todayKey(), nowM = new Date().getHours() * 60 + new Date().getMinutes();
  return tasksOn(t).filter(x => !x.done && x.start + x.dur <= nowM);
}
const _vTodayE = V.today;
V.today = () => {
  const h = _vTodayE(), ps = passedToday(); if (ps.length < 2) return h;
  const mins = ps.reduce((a, x) => a + x.dur, 0);
  const box = `<section class="catchup" aria-label="Earlier sessions"><div class="cu-top"><span class="cu-n">${ps.length}</span><div class="grow"><b>${ps.length} earlier sessions aren't ticked off</b><span class="tiny muted">${fmtMins(mins)} planned before now. Did you do them?</span></div></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-action="cu-done">${ico("check")}I did them</button><button class="btn btn-line btn-sm" data-action="cu-move">${ico("shift")}Move them to later</button></div></section>`;
  const d = h.indexOf('<div class="dash">'), k = d < 0 ? -1 : h.indexOf('<section class="section"><div class="sec-head"><h2>', d);
  return k < 0 ? h : h.slice(0, k) + box + h.slice(k);
};
E_ACTS.add("cu-done"); E_ACTS.add("cu-move");
const _eAction = eAction;
eAction = function (act, a) {
  if (act === "cu-done") {
    const ps = passedToday(); if (!ps.length) return; snapshot();
    ps.forEach(t => { t.done = true; t.prev = st(t.node); if (t.type !== "mock") { const ns = { learn: 1, recall: 2, practice: 3, calc: 3, revision: 4 }[t.type]; if (ns > st(t.node)) S.status[t.node] = ns; } S.recent.unshift({ id: t.node, text: TYPES[t.type].label, when: todayKey() }); logEvent({ t: "task", n: t.node, m: t.dur, tid: t.id }); });
    S.recent = S.recent.slice(0, 20); save(); flipRerender(); buzz(10);
    toast(`${ps.length} sessions ticked off.`, { label: "Undo", fn: undo }); return;
  }
  if (act === "cu-move") {
    const ps = passedToday(); if (!ps.length) return; snapshot();
    ps.forEach(t => missTask(t)); save(); flipRerender();
    toast(`${ps.length} sessions moved to later in your plan.`, { label: "Undo", fn: undo }); return;
  }
  return _eAction(act, a);
};

/* =====================================================================
   Study Desk v4.9: quicker everyday use
   5. swipe a session on the phone plan: right = done, left = move to later
   6. a small buzz when something is ticked off (phones that allow it)
   7. home-screen shortcuts (?do=next|cards|search|add)
   8. a quick add button on Today
   9. recent searches
   ===================================================================== */
const fireAct = (act, data = {}) => { const b = document.createElement("button"); b.hidden = true; b.dataset.action = act; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); };

/* ---------- 5. swipe ---------- */
const SW = { row: null, x0: 0, y0: 0, dx: 0, on: false, dead: false, eat: false };
document.addEventListener("pointerdown", e => {
  if (e.pointerType !== "touch" || e.button) return;
  const row = e.target.closest?.(".plan .task"); if (!row || row.classList.contains("done") || e.target.closest(".check")) return;
  Object.assign(SW, { row, x0: e.clientX, y0: e.clientY, dx: 0, on: false, dead: false });
}, { passive: true });
document.addEventListener("pointermove", e => {
  const r = SW.row; if (!r || SW.dead) return;
  const dx = e.clientX - SW.x0, dy = e.clientY - SW.y0;
  if (!SW.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { SW.dead = true; return; }
    if (Math.abs(dx) < 14) return;
    SW.on = true; r.classList.add("swiping");
    r.insertAdjacentHTML("afterbegin", `<span class="sw-bg" aria-hidden="true"><span class="sw-l">${ico("check")}Done</span><span class="sw-r">${ico("shift")}Later</span></span>`);
  }
  const w = r.offsetWidth, lim = w * .6;
  SW.dx = Math.max(-lim, Math.min(lim, dx));
  const far = Math.abs(SW.dx) > Math.min(110, w * .3);
  r.style.setProperty("--sx", SW.dx + "px");
  r.classList.toggle("sw-right", SW.dx > 0); r.classList.toggle("sw-left", SW.dx < 0);
  if (far !== r.classList.contains("sw-far")) { r.classList.toggle("sw-far", far); if (far) buzz(8); }
}, { passive: true });
const swEnd = () => {
  const r = SW.row; SW.row = null; if (!r || !SW.on) return;
  const eat = () => { SW.eat = true; setTimeout(() => SW.eat = false, 350); };
  const far = r.classList.contains("sw-far"), dx = SW.dx;
  const reset = () => { r.classList.remove("swiping", "sw-right", "sw-left", "sw-far"); r.style.removeProperty("--sx"); r.querySelector(".sw-bg")?.remove(); };
  if (!far) { eat(); r.classList.add("sw-back"); r.style.setProperty("--sx", "0px"); setTimeout(() => { r.classList.remove("sw-back"); reset(); }, 260); return; }
  const id = r.querySelector(".check")?.dataset.id; if (!id) { reset(); return; }
  if (dx > 0) r.querySelector(".check").click();
  else { const t = S.tasks.find(x => x.id === id); if (!t) return reset(); snapshot(); const msg = missTask(t); save(); flipRerender(); toast(msg, { label: "Undo", fn: undo }); }
  eat();
};
document.addEventListener("pointerup", swEnd); document.addEventListener("pointercancel", swEnd);
/* a swipe never also opens the topic underneath it */
document.addEventListener("click", e => { if (SW.eat && e.target.closest?.(".plan .task")) { e.preventDefault(); e.stopPropagation(); } }, true);

/* ---------- 6. buzz on tick ---------- */
document.addEventListener("click", e => {
  const c = e.target.closest?.('[data-action="toggle"]'); if (!c) return;
  const t = S.tasks.find(x => x.id === c.dataset.id); if (t && !t.done) buzz([12, 40, 18]);
}, true);

/* ---------- 7. home-screen shortcuts ---------- */
function runShortcut(what) {
  if (what === "search") { openSearch(); return; }
  if (what === "add") { if (DSUBJ.length) openQuickAdd(); else go("import"); return; }
  if (what === "cards") { if (typeof cardsDueCount === "function" && cardsDueCount()) fireAct("fc-start"); else { go("practice"); toast("No flashcards are due right now."); } return; }
  if (what === "next") {
    const nowM = new Date().getHours() * 60 + new Date().getMinutes(), left = tasksOn(todayKey()).filter(x => !x.done);
    const next = left.find(x => x.start + x.dur > nowM) || left[0];
    if (next) focusStart(next.id); else toast(DSUBJ.length ? "Nothing left on today's plan." : "Add a subject first, then your plan appears here.");
  }
}
const _bootE = boot;
boot = function () {
  _bootE();
  try {
    const u = new URL(location.href), what = u.searchParams.get("do"); if (!what) return;
    u.searchParams.delete("do"); history.replaceState(null, "", u.pathname + u.search + u.hash);
    setTimeout(() => runShortcut(what), 120);
  } catch (e) { }
};

/* ---------- 8. quick add ---------- */
function qaDefault() {
  const left = tasksOn(todayKey()).filter(x => !x.done && x.type !== "mock");
  const id = left[0]?.node || S.recent.find(r => nodes[r.id]?.leaf)?.id || leafIds[0];
  return nodes[id]?.leaf ? id : leafIds[0];
}
function openQuickAdd(pick) {
  const cur = pick && nodes[pick]?.leaf ? pick : qaDefault();
  const opts = DSUBJ.map(s => { const ids = leafIds.filter(id => nodes[id].subject === s.id); return ids.length ? `<optgroup label="${esc(s.name)}">${ids.map(id => `<option value="${id}" ${id === cur ? "selected" : ""}>${esc(nodes[id].num ? nodes[id].num + " " : "")}${esc(nodes[id].title)}</option>`).join("")}</optgroup>` : ""; }).join("");
  const tile = (act, icon, label, hint) => `<button class="qa-tile" data-action="${act}"><span class="st-ic">${ico(icon)}</span><span class="st-t"><b>${label}</b><span>${hint}</span></span></button>`;
  openSheet("Add something", `${sheetHead("Quick add", "Add something")}<div class="stack" style="gap:14px">
    ${leafIds.length ? `<label class="fld"><span>For this topic</span><select id="qa-topic">${opts}</select></label>
    <div class="qa-grid">${tile("qa-card", "cards", "Flashcard", "A question and its answer")}${tile("qa-notes", "notes", "Notes", "Paste, type or snap a page")}${typeof openSketch === "function" ? tile("qa-sketch", "pencil", "Sketch", "Draw a diagram") : ""}</div>` : ""}
    <div class="qa-more"><span class="tiny muted">Or add more to study</span><div class="row" style="flex-wrap:wrap"><button class="btn btn-line btn-sm" data-action="qa-import">${ico("upload")}Import a file</button><button class="btn btn-line btn-sm" data-action="qa-subject">${ico("plus")}New subject</button></div></div></div>`);
}
const qaTopic = () => ($("#qa-topic") || {}).value || qaDefault();
["qa-open", "qa-card", "qa-notes", "qa-sketch", "qa-import", "qa-subject", "rs-use", "rs-clear"].forEach(k => E_ACTS.add(k));
const _eActionQ = eAction;
eAction = function (act, a) {
  switch (act) {
    case "qa-open": openQuickAdd(); return;
    case "qa-card": { const id = qaTopic(); closeSheet(true); openCardSheet(id); return; }
    case "qa-notes": { const id = qaTopic(); closeSheet(true); openNotesSheet(id); return; }
    case "qa-sketch": { const id = qaTopic(); closeSheet(true); openSketch(id); return; }
    case "qa-import": closeSheet(true); go("import"); return;
    case "qa-subject": closeSheet(true); go("editsubj:new"); return;
    case "rs-use": { const i = $("#srch"); if (!i) return; i.value = a.dataset.q; i.dispatchEvent(new Event("input", { bubbles: true })); i.focus({ preventScroll: true }); return; }
    case "rs-clear": rsSave([]); drawSearch(($("#srch") || {}).value || ""); return;
  }
  return _eActionQ(act, a);
};
/* on Today the top bar gets an Add button next to search, where it never covers a session */
const _renderQ = render;
render = function (fresh) {
  _renderQ(fresh);
  if (!(stack.length === 1 && stack[0].v === "today" && DSUBJ.length)) return;
  $(".topbar .srch")?.insertAdjacentHTML("beforebegin", `<button class="qa-btn" data-action="qa-open" aria-label="Add a flashcard, notes or a subject">${ico("plus")}<span>Add</span></button>`);
};

/* ---------- 9. recent searches ---------- */
const RS_KEY = "studydesk.recentq";
const rsGet = () => { try { const a = JSON.parse(localStorage.getItem(RS_KEY) || "[]"); return Array.isArray(a) ? a.filter(x => typeof x === "string").slice(0, 6) : []; } catch (e) { return []; } };
const rsSave = a => { try { localStorage.setItem(RS_KEY, JSON.stringify(a.slice(0, 6))); } catch (e) { } };
const rsAdd = q => { q = q.trim(); if (q.length < 2) return; rsSave([q, ...rsGet().filter(x => x.toLowerCase() !== q.toLowerCase())]); };
const _drawSearchR = drawSearch;
drawSearch = function (raw) {
  _drawSearchR(raw);
  const el = $("#srchRes"); if (!el || raw.trim()) return;
  const rs = rsGet(); if (!rs.length) return;
  el.insertAdjacentHTML("afterbegin", `<div class="rs"><div class="rs-head"><span class="tiny muted">Recent searches</span><button class="link tiny" data-action="rs-clear">Clear</button></div><div class="rs-list">${rs.map(q => `<button class="chip" data-action="rs-use" data-q="${esc(q)}">${ico("search")}${esc(q)}</button>`).join("")}</div></div>`);
};
/* a search counts once something from it is opened */
document.addEventListener("click", e => { if (e.target.closest?.("#srchRes [data-sgo], #srchMeaning [data-sgo]")) rsAdd(($("#srch") || {}).value || ""); }, true);
