/* Study Desk v4.10: learn a topic step by step
   A topic's summary is cut into short pieces: read a few points, see the diagrams and examples
   that go with them, then answer one quick check before moving on. Everything comes from the
   person's own notes, so nothing is invented. Checks you miss come back at the end. */

const LN_CHUNK = 4;
P.steps = P.steps || '<path d="M3 20h5v-5h5v-5h5V5h3"/>';
P.image = P.image || '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>';
let LN = null;

function learnSteps(id) {
  const sm = summaryOf(id); if (!sm) return [];
  const secs = (sm.sections || asSections(sm.bullets)).filter(s => s.items && s.items.length);
  const title = nodes[id].title, figs = typeof figsOf === "function" ? figsOf(id).slice(0, 40) : [], placed = new Set();
  const exs = (sm.examples || []).slice(), terms = [...(sm.terms || [])].sort((a, b) => b.length - a.length);
  const steps = [{ k: "intro", heads: secs.map(s => s.h).filter(Boolean), terms: (sm.terms || []).slice(0, 8) }];
  const figKey = f => { const m = (f.cap || "").match(typeof FIG_CAP !== "undefined" ? FIG_CAP : /^$/); return m ? m[0].replace(/[.:\-–]\s*$/, "").trim() : ""; };
  secs.forEach((sc, si) => {
    const h = sc.h || title, parts = [];
    for (let i = 0; i < sc.items.length; i += LN_CHUNK) parts.push(sc.items.slice(i, i + LN_CHUNK));
    /* never leave a lonely last point on its own card */
    if (parts.length > 1 && parts[parts.length - 1].length === 1) parts[parts.length - 2].push(parts.pop()[0]);
    parts.forEach((items, j) => steps.push({ k: "read", h, part: parts.length > 1 ? `${j + 1} of ${parts.length}` : "", items }));
    const text = sc.items.map(x => x.t).join(" ");
    figs.forEach(f => { const key = figKey(f); if (!placed.has(f.id) && key && new RegExp("\\b" + key.replace(/\./g, "\\.").replace(/\s+/g, "\\s*") + "\\b(?![.\\d])", "i").test(text)) { placed.add(f.id); steps.push({ k: "fig", h, f }); } });
    const mine = exs.filter(x => x.h && x.h === sc.h); if (mine.length) { mine.forEach(x => exs.splice(exs.indexOf(x), 1)); steps.push({ k: "ex", h, items: mine.slice(0, 3) }); }
    const q = learnCheck(sc, h, terms, si); if (q) steps.push({ k: "check", h, ...q });
  });
  if (exs.length) steps.push({ k: "ex", h: "More examples", items: exs.slice(0, 3) });
  figs.filter(f => !placed.has(f.id)).slice(0, 8).forEach(f => steps.push({ k: "fig", h: title, f }));
  steps.push({ k: "done" });
  return steps;
}
/* one quick check per part: a definition, a missing key word, or "what were the main points" */
function learnCheck(sc, h, terms, si) {
  const d = sc.items.find(x => x.def && x.def.term && x.def.def);
  if (d) return { q: `What does “${d.def.term}” mean?`, a: d.def.def.replace(/[.]?$/, "."), how: "definition" };
  for (const x of sc.items) {
    if (x.t.length < 40 || x.t.length > 280) continue;
    const t = terms.find(w => w.length > 3 && new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(x.t));
    if (!t) continue;
    const m = x.t.match(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
    return { q: `Fill the gap: ${x.t.replace(m[0], "＿＿＿＿")}`, a: m[0], full: x.t, how: "gap" };
  }
  if (sc.items.length >= 2) return { q: `Without looking: what are the main points of “${h}”?`, a: "", list: sc.items.slice(0, 5).map(x => x.t), how: "recall" };
  return null;
}

function learnStart(id, only) {
  const all = learnSteps(id); if (all.length < 3) { toast("Add notes to this topic first, then it can be learned step by step."); return false; }
  let steps = all;
  if (only && only.size) { const keep = new Set(); all.forEach((s, i) => { if (s.k === "check" && only.has(s.q)) { for (let j = i - 1; j >= 0 && all[j].k !== "check" && all[j].k !== "intro"; j--) keep.add(j); keep.add(i); } }); steps = [all[0], ...all.filter((s, i) => keep.has(i)), all[all.length - 1]]; }
  LN = { id, steps, i: 0, shown: false, got: 0, asked: 0, miss: new Set(), dir: 1, again: !!only, t0: Date.now() };
  return true;
}
const lnMins = steps => Math.max(2, Math.round(steps.reduce((a, s) => a + (s.k === "read" ? s.items.reduce((b, x) => b + x.t.split(/\s+/).length, 0) / 180 * 60 + 8 : s.k === "check" ? 25 : s.k === "fig" ? 20 : s.k === "ex" ? 20 : 0), 0) / 60));

V.learn = id => {
  const n = nodes[id]; if (!n) return V.exams();
  if (!LN || LN.id !== id) { if (!learnStart(id)) { LN = null; return V.topic(id); } }
  const steps = LN.steps, s = steps[LN.i], last = steps.length - 1;
  const seg = steps.length <= 32
    ? `<div class="ln-seg" aria-hidden="true">${steps.map((x, i) => `<i class="${i < LN.i ? "on" : i === LN.i ? "cur" : ""} ${x.k === "check" ? "q" : ""}"></i>`).join("")}</div>`
    : `<div class="ln-bar" aria-hidden="true"><i style="transform:scaleX(${LN.i / last})"></i></div>`;
  return `<div class="stack ln" style="gap:16px">
    <header class="ln-top"><div class="row"><span class="eyebrow grow">${esc(n.num)} · Step by step</span><span class="tiny muted mono" aria-live="polite">${LN.i < last ? `Step ${LN.i + 1} of ${last}` : "Finished"}</span></div>${seg}</header>
    <article class="card ln-card ln-k-${s.k}" data-dir="${LN.dir}" aria-labelledby="ln-h">${learnStepHTML(s, n)}</article>
    ${learnNav(s)}
  </div>`;
};
function learnStepHTML(s, n) {
  const li = x => { let t = esc(x.t); if (x.def && x.def.term) { const k = esc(x.def.term), i = t.toLowerCase().indexOf(k.toLowerCase()); if (i >= 0 && i < 160) t = t.slice(0, i) + `<b>${t.slice(i, i + k.length)}</b>` + t.slice(i + k.length); } const tag = x.kinds?.includes("formula") ? `<span class="ktag f">Formula</span>` : x.kinds?.includes("exam") ? `<span class="ktag e">Exam</span>` : ""; return `<li${x.kinds?.includes("formula") ? ' class="fx"' : ""}>${t}${tag}</li>`; };
  switch (s.k) {
    case "intro": return `<div class="ln-kind">${ico("book")}Start here</div><h1 id="ln-h" class="ln-h">${esc(n.title)}</h1>
      <p class="muted">${LN.again ? `Going over the ${LN.missWas} part${LN.missWas === 1 ? "" : "s"} you weren't sure of.` : `${LN.steps.filter(x => x.k === "read").length} short parts, each followed by a quick check. About ${lnMins(LN.steps)} min.`}</p>
      ${s.heads.length > 1 ? `<ol class="ln-map">${s.heads.slice(0, 12).map(h => `<li>${esc(h)}</li>`).join("")}${s.heads.length > 12 ? `<li class="muted">and ${s.heads.length - 12} more</li>` : ""}</ol>` : ""}
      ${s.terms.length ? `<div><p class="tiny muted" style="margin:0 0 8px">Words you'll meet</p><div class="terms">${s.terms.map(t => `<span>${esc(t)}</span>`).join("")}</div></div>` : ""}`;
    case "read": return `<div class="ln-kind">${ico("notes")}Read${s.part ? ` · part ${s.part}` : ""}</div><h2 id="ln-h" class="ln-h">${esc(s.h)}</h2><ul class="bul ln-pts">${s.items.map(li).join("")}</ul>`;
    case "ex": return `<div class="ln-kind">${ico("bulb")}Example${s.items.length > 1 ? "s" : ""}</div><h2 id="ln-h" class="ln-h">${esc(s.h)}</h2><ul class="bul ln-pts">${s.items.map(x => `<li>${esc(x.t)}</li>`).join("")}</ul><p class="tiny muted">From your notes.</p>`;
    case "fig": { const f = s.f, says = typeof figSays === "function" ? figSays(f).slice(0, 3) : [];
      return `<div class="ln-kind">${ico("image")}Diagram</div><h2 id="ln-h" class="ln-h">${esc(f.cap || "Picture on page " + f.p)}</h2>
      <button class="ln-fig" data-action="fig-open" data-id="${f.id}" aria-label="Open this picture larger"><span class="fig-img" style="aspect-ratio:${f.w}/${f.h}"><img alt="${esc(f.cap || "")}" data-fig="${f.id}"></span></button>
      ${says.length ? `<div><p class="tiny muted" style="margin:0 0 6px">What your book says about it</p><ul class="bul ln-pts">${says.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : `<p class="small muted">Look at how the parts connect, then say out loud what it shows before you move on.</p>`}`; }
    case "check": return `<div class="ln-kind q">${ico("pencil")}Quick check</div><h2 id="ln-h" class="ln-h ln-q">${esc(s.q)}</h2>
      ${LN.shown ? `<div class="ln-ans" role="status">${s.how === "recall" ? `<ul class="bul ln-pts">${s.list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="ln-a">${esc(s.a)}</p>${s.full ? `<p class="small muted">${esc(s.full)}</p>` : ""}`}</div>`
        : `<p class="small muted">${s.how === "recall" ? "Say or write them down, then check." : "Answer in your head, then check."}</p>`}`;
    case "done": { const pct_ = LN.asked ? Math.round(100 * LN.got / LN.asked) : 100, mins = Math.max(1, Math.round((Date.now() - LN.t0) / 60000));
      return `<div class="ln-kind ok">${ico("check")}Done</div><h1 id="ln-h" class="ln-h">You worked through ${esc(n.title)}</h1>
      <div class="ln-score"><div><b class="mono">${LN.got}/${LN.asked}</b><span>checks right</span></div><div><b class="mono">${mins}</b><span>min</span></div><div><b class="mono">${pct_}%</b><span>sure of it</span></div></div>
      <p class="muted">${LN.miss.size ? `${LN.miss.size} part${LN.miss.size === 1 ? "" : "s"} still need${LN.miss.size === 1 ? "s" : ""} work. Go over ${LN.miss.size === 1 ? "it" : "them"} now, or turn ${LN.miss.size === 1 ? "it" : "them"} into flashcards so ${LN.miss.size === 1 ? "it comes" : "they come"} back at the right time.` : "You knew every check. Practice questions or a blurt check will lock it in."}</p>`; }
  }
  return "";
}
function learnNav(s) {
  const first = LN.i === 0, back = first ? "" : `<button class="btn btn-line" data-action="ln-prev">${ico("left")}Back</button>`;
  if (s.k === "check" && !LN.shown) return `<div class="ln-nav">${back}<button class="btn btn-pen grow" data-action="ln-show" id="ln-go">Show answer</button></div>`;
  if (s.k === "check") return `<div class="ln-nav ln-grade"><button class="btn btn-line grow" data-action="ln-grade" data-g="0">Not yet</button><button class="btn btn-pen grow" data-action="ln-grade" data-g="1" id="ln-go">I knew it</button></div>`;
  if (s.k === "done") return `<div class="ln-nav ln-end">${LN.miss.size ? `<button class="btn btn-pen" data-action="ln-again" id="ln-go">Go over the ${LN.miss.size} again</button><button class="btn btn-soft" data-action="ln-cards">${ico("cards")}Make ${LN.miss.size} flashcard${LN.miss.size === 1 ? "" : "s"}</button>` : `<button class="btn btn-pen" data-action="practise" data-id="${LN.id}" id="ln-go">${ico("pencil")}Practise questions</button>`}<button class="btn btn-line" data-action="ln-exit">Back to the topic</button></div>`;
  return `<div class="ln-nav">${back}<button class="btn btn-pen grow" data-action="ln-next" id="ln-go">${first ? "Start" : "Next"}${ico("chev")}</button></div>`;
}
function learnMove(d) {
  if (!LN) return; const to = clamp(LN.i + d, 0, LN.steps.length - 1); if (to === LN.i) return;
  LN.i = to; LN.dir = d; LN.shown = false;
  if (LN.steps[to].k === "done" && !LN.logged) { LN.logged = true; logEvent({ t: "task", n: LN.id, m: Math.max(1, Math.round((Date.now() - LN.t0) / 60000)), learn: true }); if (st(LN.id) < 1) setStatus(LN.id, 1, "Learned step by step"); else save(); }
  rerender(); window.scrollTo({ top: 0 }); setTimeout(() => $("#ln-go")?.focus({ preventScroll: true }), 30);
}
const L_ACTS = new Set(["ln-start", "ln-next", "ln-prev", "ln-show", "ln-grade", "ln-again", "ln-cards", "ln-exit"]);
function lAction(act, a) {
  switch (act) {
    case "ln-start": if (learnStart(a.dataset.id)) go("learn:" + a.dataset.id); return;
    case "ln-next": learnMove(1); return;
    case "ln-prev": learnMove(-1); return;
    case "ln-show": LN.shown = true; rerender(); setTimeout(() => $("#ln-go")?.focus({ preventScroll: true }), 30); return;
    case "ln-grade": { const s = LN.steps[LN.i]; if (!s.graded) { s.graded = true; LN.asked++; if (+a.dataset.g) LN.got++; else LN.miss.add(s.q); } else if (+a.dataset.g) LN.miss.delete(s.q); else LN.miss.add(s.q); typeof buzz === "function" && buzz(+a.dataset.g ? 12 : [8, 30, 8]); learnMove(1); return; }
    case "ln-again": { const id = LN.id, miss = new Set(LN.miss); learnStart(id, miss); LN.missWas = miss.size; rerender(); window.scrollTo({ top: 0 }); return; }
    case "ln-cards": {
      const made = LN.steps.filter(s => s.k === "check" && LN.miss.has(s.q)); if (!S.cards) S.cards = [];
      made.forEach(s => { const b = s.how === "recall" ? s.list.join("\n") : s.full ? `${s.a}\n\n${s.full}` : s.a; if (!S.cards.some(c => c.node === LN.id && c.f === s.q)) S.cards.push({ id: newId("c"), node: LN.id, f: s.q.slice(0, 1000), b: b.slice(0, 2000), kind: "own", due: null, s: null, added: todayKey() }); });
      save(); LN.miss = new Set(); rerender(); toast(`${made.length} flashcard${made.length === 1 ? "" : "s"} added. They show up in your next review.`); return;
    }
    case "ln-exit": { const id = LN.id; LN = null; back(); if (stack[stack.length - 1].v !== "topic") go("topic:" + id); return; }
  }
}
document.addEventListener("keydown", e => {
  if (stack[stack.length - 1].v !== "learn" || !LN || e.target.closest("input,textarea,select") || $(".scrim") || e.metaKey || e.ctrlKey || e.altKey) return;
  const s = LN.steps[LN.i];
  if (e.key === "ArrowRight" && s.k !== "check" && s.k !== "done") { e.preventDefault(); learnMove(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); learnMove(-1); }
  else if (e.key === " " && s.k === "check" && !LN.shown) { e.preventDefault(); lAction("ln-show", { dataset: {} }); }
  else if (s.k === "check" && LN.shown && (e.key === "1" || e.key === "2")) { e.preventDefault(); lAction("ln-grade", { dataset: { g: e.key === "2" ? "1" : "0" } }); }
});

/* a wide tile at the top of each topic that has notes */
const _studyTilesL = studyTiles;
studyTiles = function (id) {
  const h = _studyTilesL(id); if (!h || !summaryOf(id)) return h;
  const steps = learnSteps(id), parts = steps.filter(s => s.k === "read").length, checks = steps.filter(s => s.k === "check").length, figs = steps.filter(s => s.k === "fig").length;
  if (!parts) return h;
  const tile = `<button class="st-tile st-learn" data-action="ln-start" data-id="${id}"><span class="st-ic">${ico("steps")}</span><span class="st-t"><b>Learn it step by step</b><span>${parts} part${parts === 1 ? "" : "s"} · ${checks} check${checks === 1 ? "" : "s"}${figs ? ` · ${figs} diagram${figs === 1 ? "" : "s"}` : ""} · ${lnMins(steps)} min</span></span>${ico("chev", 'class="caret"')}</button>`;
  return h.replace('<div class="st-grid">', tile + '<div class="st-grid">');
};
