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
