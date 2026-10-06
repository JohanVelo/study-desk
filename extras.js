/* =====================================================================
   Study Desk extras (v5): quiz questions from notes, maths, Word import,
   calendar reminders, formatted notes, sketches, charts, Anki export,
   laptop AI drafts and phone ↔ laptop sync.
   Every library is loaded only when it is first needed.
   Shares the app's globals (S, nodes, subjects, notesOf, summaryOf, …).
   ===================================================================== */
"use strict";
const loadCss = href => { if (document.querySelector(`link[href="${href}"]`)) return; const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); };
const saveBlob = (name, blob) => { try { const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); return true; } catch (e) { return false; } };
const seeded = seed => { let x = parseInt(hash(seed), 36) || 1; return () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648; };
const shuffleWith = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- 1. practice questions made from your notes (compromise, MIT) ----------
   Two kinds, both checked against the notes so nothing is invented:
   "which term matches this description" (from definitions) and fill-the-gap
   multiple choice, where the wrong answers are other terms, names or numbers
   from the same subject. */
let aqKey = "", aqTimer = null, AQ = [];
function scheduleAutoQuestions() { clearTimeout(aqTimer); aqTimer = setTimeout(buildAutoQuestions, 400); }
async function buildAutoQuestions() {
  if (!notesReady) { scheduleAutoQuestions(); return; }
  const ids = leafIds.filter(id => notesOf(id));
  const key = ids.map(id => id + ":" + notesOf(id).length).join("|");
  if (key === aqKey) return; aqKey = key;
  const fresh = [];
  if (ids.length) {
    try { await loadScript("vendor/x/compromise.js"); } catch (e) { }
    const nlpOk = typeof nlp === "function";
    /* term pools at three distances: this topic, its chapter, the whole subject.
       Wrong answers come from the closest pool first, so they are plausible. */
    const esc_ = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const info = {};
    ids.forEach(id => {
      const sm = summaryOf(id); if (!sm) return;
      const people = new Set();
      if (nlpOk) nlp(sm.bullets.join(" ")).people().out("array").forEach(x => { x = x.replace(/[.,;:'’]+$|'s$/g, "").trim(); if (x.split(" ").length <= 3 && x.length > 3 && /^[A-Z]/.test(x)) people.add(x); });
      info[id] = { sm, terms: new Set([...(sm.terms || []), ...(sm.defs || []).map(d => d.term)]), defs: (sm.defs || []).map(d => ({ ...d, id })), people };
    });
    const near = (id, key) => {
      const ch = chapterOf(id), sub = nodes[id].subject, lists = [[], [], []];
      Object.keys(info).forEach(o => { const k = o === id ? 0 : chapterOf(o) === ch ? 1 : nodes[o].subject === sub ? 2 : -1; if (k >= 0) lists[k].push(...info[o][key]); });
      return lists;
    };
    const isPerson = (t, id) => info[id].people.has(t) || /^[A-Z][a-z]+(?: [A-Z]\.?)*(?: [A-Z][a-z'-]+)+$/.test(t);
    /* wrong answers: same kind as the answer, not already in the sentence, closest pool first, in the answer's letter case */
    const pickWrong = (answer, lists, sentence, rnd, person) => {
      const lc = answer.toLowerCase(), sl = sentence.toLowerCase(), out = [], seen = new Set([lc]);
      for (const L of lists) for (const c of shuffleWith([...new Set(L)], rnd)) {
        const cl = c.toLowerCase();
        if (out.length >= 3 || seen.has(cl) || sl.includes(cl) || cl.includes(lc) || lc.includes(cl)) continue;
        if (!!person !== /^[A-Z][a-z]+ [A-Z]/.test(c)) continue;
        if (Math.abs(c.split(" ").length - answer.split(" ").length) > 2) continue;
        if (!/\s/.test(c) && nlpOk && nlp(c).has("(#Verb|#Adverb|#Adjective)") && !nlp(c).has("#Noun")) continue;
        seen.add(cl); out.push(/^[A-Z]{2}/.test(c) ? c : /^[a-z]/.test(answer) ? c[0].toLowerCase() + c.slice(1) : c[0].toUpperCase() + c.slice(1));
      }
      return out;
    };
    ids.forEach(id => {
      const I = info[id]; if (!I || I.sm.source !== "auto") return;
      const sm = I.sm, rnd = seeded(id + key.length), out = [];
      const add = (q, answer, wrong, e, kind) => {
        if (wrong.length < 2) return;
        const o = shuffleWith([answer, ...wrong.slice(0, 3)], seeded(id + q));
        out.push({ id: "aq:" + hash(id + "|" + q), node: id, subject: nodes[id].subject, level: kind === "def" ? "easy" : "medium", q, o, a: o.indexOf(answer), e, auto: true });
      };
      /* (a) description → term */
      shuffleWith(I.defs, rnd).slice(0, 2).forEach(d => {
        const lists = near(id, "terms");
        const wrong = pickWrong(d.term, [[...near(id, "defs")[0].map(x => x.term), ...lists[0]], lists[1], lists[2]], d.def, rnd, false);
        add(`Which term matches this description? “${d.def.replace(/[.]$/, "")}”`, d.term, wrong, `${d.term}: ${d.def}. (From your notes.)`, "def");
      });
      /* (b) fill the gap in a key sentence: a key term, a person or a year */
      const bullets = shuffleWith((sm.sections || []).flatMap(s => s.items).filter(x => !x.def && x.t.length > 40 && x.t.length < 260), rnd);
      for (const b of bullets) {
        if (out.length >= 4) break;
        const t = b.t; let answer = null, wrong = [];
        const term = [...I.terms].filter(x => x.length > 3 && new RegExp(`\\b${esc_(x)}\\b`, "i").test(t)).sort((a, b) => b.length - a.length)[0];
        const person = [...I.people].find(x => t.includes(x));
        const year = t.match(/\b(1[5-9]\d\d|20[0-4]\d)\b/);
        if (person) { answer = person; wrong = pickWrong(person, near(id, "people").map((L, k) => k === 2 ? L : L), t, rnd, true); }
        if ((!answer || wrong.length < 2) && term && !isPerson(term, id)) { answer = t.match(new RegExp(`\\b${esc_(term)}\\b`, "i"))[0]; wrong = pickWrong(answer, near(id, "terms"), t, rnd, false); }
        if ((!answer || wrong.length < 2) && year) { const y = +year[1]; answer = year[1]; wrong = shuffleWith([y - 10, y + 7, y - 25, y + 15, y - 3].filter(v => v > 1400 && v < 2100 && String(v) !== answer).map(String), rnd).slice(0, 3); }
        if (!answer || wrong.length < 2) continue;
        const q = t.replace(answer, "＿＿＿＿");
        if (q === t || out.some(x => x.e.startsWith(t))) continue;
        add(`Fill the gap: ${q}`, answer, wrong, `${t} (From your notes.)`, "gap");
      }
      fresh.push(...out);
    });
  }
  const before = QS.length; AQ = fresh;
  QS = QS.filter(q => !q.auto).concat(fresh);
  if (QS.length !== before) { const v = stack[stack.length - 1].v; if (["practice", "topic"].includes(v) && !$(".scrim")) rerender(); }
}

/* ---------- 2. maths: $x^2$, $$…$$ and \( … \) in notes, cards and summaries (Temml, MIT) ---------- */
const MATH_RE = /\$\$([^$]+?)\$\$|\$(?=[^\s$\d])([^$\n]{1,200}?)(?<=\S)\$(?!\d)|\\\((.+?)\\\)|\\\[(.+?)\\\]/g;
let mathBusy = false;
async function mathify(root) {
  if (!root || mathBusy) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; if (!p || p.closest("textarea,input,script,style,code,pre,.math,svg,[contenteditable]")) return NodeFilter.FILTER_REJECT; MATH_RE.lastIndex = 0; return MATH_RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  const hits = []; while (walker.nextNode()) hits.push(walker.currentNode);
  if (!hits.length) return;
  mathBusy = true;
  try {
    await loadScript("vendor/x/temml.min.js"); loadCss("vendor/x/Temml-Local.css");
    hits.forEach(node => {
      if (!node.parentNode) return;
      const text = node.nodeValue, frag = document.createDocumentFragment(); let last = 0;
      text.replace(MATH_RE, (m, d1, i1, i2, d2, at) => {
        frag.appendChild(document.createTextNode(text.slice(last, at)));
        const span = document.createElement("span"); span.className = "math";
        try { temml.render(d1 || d2 || i1 || i2, span, { displayMode: !!(d1 || d2), throwOnError: true }); span.setAttribute("aria-label", d1 || d2 || i1 || i2); }
        catch (e) { span.textContent = m; span.className = ""; }
        frag.appendChild(span); last = at + m.length; return m;
      });
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  } catch (e) { console.error(e); }
  mathBusy = false;
}

/* ---------- 3. Word documents (.docx) → contents list and notes (mammoth.js, BSD-2) ---------- */
async function docxToOutline(buf, name) {
  await loadScript("vendor/x/mammoth.min.js");
  const r = await mammoth.convertToHtml({ arrayBuffer: buf });
  const doc = new DOMParser().parseFromString(r.value, "text/html");
  const blocks = [];
  doc.body.querySelectorAll("h1,h2,h3,h4,p,li,table").forEach(el => {
    if (el.tagName === "P" && el.closest("li,table")) return;
    if (el.tagName === "LI" && el.closest("table")) return;
    if (el.tagName === "TABLE") { el.querySelectorAll("tr").forEach(tr => { const cells = [...tr.children].map(c => c.textContent.trim()).filter(Boolean); if (cells.length) blocks.push({ k: "p", t: "- " + cells.join(" | ") }); }); return; }
    const t = el.textContent.replace(/\s+/g, " ").trim(); if (!t) return;
    if (/^H[1-4]$/.test(el.tagName)) blocks.push({ k: "h", lvl: +el.tagName[1], t });
    else blocks.push({ k: "p", t: el.tagName === "LI" ? "- " + t : t });
  });
  /* Word files often use bold paragraphs instead of heading styles: treat short bold-only paragraphs as headings */
  if (!blocks.some(b => b.k === "h")) doc.body.querySelectorAll("p").forEach(p => { const s = p.querySelector("strong"); if (s && s.textContent.trim() === p.textContent.trim() && p.textContent.length < 90) { const b = blocks.find(x => x.t === p.textContent.replace(/\s+/g, " ").trim()); if (b) { b.k = "h"; b.lvl = 2; } } });
  const lv = [...new Set(blocks.filter(b => b.k === "h").map(b => b.lvl))].sort();
  const deck = stripNum(name.replace(/\.docx$/i, "").replace(/[_-]+/g, " ")) || "Document";
  const topics = []; let chapter = null, cur = null;
  const L1 = lv.length >= 2 ? lv[0] : null, L2 = lv.length >= 2 ? lv[1] : lv[0];
  blocks.forEach(b => {
    if (b.k === "h" && b.lvl === L1) { chapter = stripNum(b.t) || b.t; cur = null; return; }
    if (b.k === "h" && b.lvl === L2) { cur = { ch: chapter || deck, title: stripNum(b.t) || b.t, lines: [`## ${b.t}`] }; topics.push(cur); return; }
    if (!cur) { cur = { ch: chapter || deck, title: chapter || deck, lines: [] }; topics.push(cur); }
    cur.lines.push(b.k === "h" ? `## ${b.t}` : b.t);
  });
  const real = topics.filter(t => t.lines.join(" ").replace(/#/g, "").trim().length > 20);
  if (!real.length) return { text: "", note: "That Word file has no text that could be read." };
  const chs = [...new Set(real.map(t => t.ch))], lines = [];
  chs.forEach((c, ci) => { const ts = real.map((t, i) => ({ t, i })).filter(x => x.t.ch === c); lines.push(`${ci + 1} ${c} ${ts[0].i + 1}-${ts[ts.length - 1].i + 1}`); ts.forEach((x, k) => lines.push(`${ci + 1}.${k + 1} ${x.t.title} ${x.i + 1}-${x.i + 1}`)); });
  lastImport = { kind: "pptx", slides: real.map(t => t.lines.join("\n")) };
  return { text: lines.join("\n"), note: `Read ${real.length} section${real.length > 1 ? "s" : ""} from ${name}. Section numbers are used as page numbers.` };
}

/* ---------- 4. calendar reminders (.ics) and the app-icon badge ---------- */
const icsEsc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const icsDate = k => k.replace(/-/g, "");
const icsDT = (k, mins) => `${icsDate(k)}T${String(Math.floor(mins / 60)).padStart(2, "0")}${String(mins % 60).padStart(2, "0")}00`;
const icsFold = l => { const out = []; while (l.length > 73) { out.push(l.slice(0, 73)); l = " " + l.slice(73); } out.push(l); return out.join("\r\n"); };
function buildICS(kind) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), ev = [];
  if (kind === "exams" || kind === "all") DSUBJ.forEach(s => {
    const k = examKey(s.id); if (!k || k < todayKey()) return;
    ev.push(["BEGIN:VEVENT", `UID:exam-${s.id}-${k}@study-desk`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${icsDate(k)}`, `DTEND;VALUE=DATE:${icsDate(addDays(k, 1))}`, `SUMMARY:${icsEsc(s.name + " exam")}`, `DESCRIPTION:${icsEsc("From Study Desk. Good luck!")}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(s.name + " exam in one week")}`, "TRIGGER:-P6DT15H", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(s.name + " exam tomorrow")}`, "TRIGGER:-PT15H", "END:VALARM", "END:VEVENT"]);
  });
  if (kind === "study" || kind === "all") S.tasks.filter(t => !t.done && t.date >= todayKey() && t.date <= addDays(todayKey(), 13) && nodes[t.node]).forEach(t => {
    const n = nodes[t.node], label = t.type === "mock" ? `${subjects[t.subject].name} mock test` : `${TYPES[t.type].label}: ${n.title}`;
    ev.push(["BEGIN:VEVENT", `UID:${t.id}-${t.date}@study-desk`, `DTSTAMP:${now}`, `DTSTART:${icsDT(t.date, t.start)}`, `DTEND:${icsDT(t.date, Math.min(t.start + t.dur, 1439))}`, `SUMMARY:${icsEsc(label)}`, `DESCRIPTION:${icsEsc(`${subjects[t.subject].name} · pages ${n.p1}–${n.p2}. Open Study Desk to start the timer.`)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(label)}`, "TRIGGER:-PT10M", "END:VALARM", "END:VEVENT"]);
  });
  return { n: ev.length, text: ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Study Desk//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Study Desk", ...ev.flat(), "END:VCALENDAR"].map(icsFold).join("\r\n") };
}
let badgeLast = -1;
function updateBadge() {
  if (!("setAppBadge" in navigator) || typeof dueCards !== "function" || !S) return;
  const n = dueCards().length; if (n === badgeLast) return; badgeLast = n;
  (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => { });
}

/* ---------- 5. formatted notes (marked, MIT + DOMPurify, Apache-2.0/MPL-2.0) ---------- */
async function mdToHtml(text) {
  await Promise.all([loadScript("vendor/x/marked.umd.js"), loadScript("vendor/x/purify.min.js")]);
  /* keep maths away from the markdown parser, so _ and * inside formulas survive */
  const keep = []; const safe = String(text).replace(MATH_RE, m => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  const html = marked.parse(safe, { breaks: true, gfm: true }).replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i].replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]));
  return DOMPurify.sanitize(html, { FORBID_TAGS: ["style", "form", "input", "img"], FORBID_ATTR: ["style"] });
}
async function hydrateMarkdown(root) {
  const els = [...root.querySelectorAll("[data-md]:not([data-md-done])")]; if (!els.length) return;
  for (const el of els) { el.setAttribute("data-md-done", "1"); const src = el.dataset.md === "preview" ? ($("#notes-text")?.value || "") : notesOf(el.dataset.md); el.innerHTML = src.trim() ? await mdToHtml(src) : `<p class="muted">Nothing to show yet.</p>`; }
}
function mdWrap(ta, before, after = before, ph = "") {
  const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
  ta.setRangeText(before + sel + after, s, e, "select"); ta.focus();
  if (!ta.value.slice(s, e).length) ta.setSelectionRange(s + before.length, s + before.length + sel.length);
}
function mdLine(ta, prefix) {
  const s = ta.selectionStart, start = ta.value.lastIndexOf("\n", s - 1) + 1;
  ta.setRangeText(prefix, start, start, "end"); ta.focus();
}

/* ---------- 6. sketches with an Apple Pencil, finger or mouse (perfect-freehand, MIT) ---------- */
let SK = null, SKETCHES = [];
async function loadSketches() { try { SKETCHES = (await IDB.all("sketch") || []).sort((a, b) => b.added - a.added); } catch (e) { SKETCHES = []; } }
const SK_COLS = [["var(--ink)", "Ink"], ["var(--pen)", "Blue"], ["oklch(58% 0.19 25)", "Red"], ["oklch(86% 0.17 108 / .55)", "Highlighter"]];
const skSvg = (sk, cls = "") => `<svg class="${cls}" viewBox="0 0 ${sk.w} ${sk.h}" role="img" aria-label="Sketch">${sk.paths.map(p => `<path d="${p.d}" fill="${p.c}"/>`).join("")}</svg>`;
function openSketch(node, id) {
  const ex = id ? SKETCHES.find(s => s.id === id) : null;
  SK = { id: ex ? ex.id : newId("sk"), node, w: 800, h: 560, paths: ex ? ex.paths.slice() : [], undo: [], col: 0, size: 6, cur: null, title: ex ? ex.title || "" : "" };
  openSheet("Sketch", `${sheetHead(nodes[node].title, ex ? "Edit sketch" : "New sketch")}
    <div class="stack form">
      <div class="sk-tools" role="toolbar" aria-label="Pen">${SK_COLS.map(([c, l], i) => `<button class="sk-col ${i === 0 ? "on" : ""}" data-action="sk-col" data-i="${i}" style="--c:${c}" aria-label="${l}" aria-pressed="${i === 0}"></button>`).join("")}
        <span class="sk-sep"></span>${[3, 6, 12].map(s => `<button class="sk-size ${s === 6 ? "on" : ""}" data-action="sk-size" data-s="${s}" aria-label="${s === 3 ? "Thin" : s === 6 ? "Medium" : "Thick"}" aria-pressed="${s === 6}"><i style="--s:${s}px"></i></button>`).join("")}
        <span class="grow"></span><button class="icon-btn sm" data-action="sk-undo" aria-label="Undo">${ico("back")}</button><button class="icon-btn sm" data-action="sk-clear" aria-label="Clear">${ico("x")}</button></div>
      <div class="sk-pad"><svg id="skPad" viewBox="0 0 ${SK.w} ${SK.h}" aria-label="Drawing area"><g id="skPaths">${SK.paths.map(p => `<path d="${p.d}" fill="${p.c}"/>`).join("")}</g><path id="skLive"/></svg></div>
      <label class="fld"><span>Label (optional)</span><input id="sk-title" maxlength="80" value="${esc(SK.title)}" placeholder="e.g. Neuron diagram"></label>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="sk-save">${ico("check")}Save sketch</button>${ex ? `<button class="btn btn-line btn-sm" data-action="sk-del" data-id="${ex.id}">Delete</button>` : ""}</div>
    </div>`);
  loadScript("vendor/x/perfect-freehand.js").then(bindSketch).catch(() => toast("The drawing tool couldn't load. Check your connection once, then it works offline."));
}
function bindSketch() {
  const pad = $("#skPad"); if (!pad) return;
  const pt = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * SK.w, (e.clientY - r.top) / r.height * SK.h, e.pressure || .5]; };
  const live = $("#skLive"), opts = () => ({ size: SK.size * (SK.col === 3 ? 3 : 1), thinning: SK.col === 3 ? 0 : .6, smoothing: .55, streamline: .45, simulatePressure: true });
  const toD = pts => { const s = PerfectFreehand.getStroke(pts, opts()); if (!s.length) return ""; return "M" + s.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z"; };
  pad.addEventListener("pointerdown", e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); SK.cur = [pt(e)]; live.setAttribute("fill", SK_COLS[SK.col][0]); });
  pad.addEventListener("pointermove", e => { if (!SK.cur) return; (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(ev => SK.cur.push(pt(ev))); live.setAttribute("d", toD(SK.cur)); });
  const end = () => { if (!SK.cur) return; const d = toD(SK.cur); SK.cur = null; live.setAttribute("d", ""); if (!d) return; SK.paths.push({ d, c: SK_COLS[SK.col][0] }); SK.undo = []; drawSkPaths(); };
  pad.addEventListener("pointerup", end); pad.addEventListener("pointercancel", end);
}
function drawSkPaths() { const g = $("#skPaths"); if (g) g.innerHTML = SK.paths.map(p => `<path d="${p.d}" fill="${p.c}"/>`).join(""); }

/* ---------- 7. charts on the Progress page (uPlot, MIT) ---------- */
function progressCharts() {
  if (!S) return "";
  return `<section class="section"><div class="sec-head"><h2>Memory and study time</h2></div>
    <div class="charts">
      <figure class="card chart-card"><figcaption><b>Flashcards due</b><span class="tiny muted">next 14 days</span></figcaption><div class="chart" data-chart="due" role="img" aria-label="Flashcards due per day for the next 14 days"></div></figure>
      <figure class="card chart-card"><figcaption><b>Recall</b><span class="tiny muted">% of flashcards remembered, last 30 days</span></figcaption><div class="chart" data-chart="recall" role="img" aria-label="Share of flashcards remembered per day"></div></figure>
      <figure class="card chart-card"><figcaption><b>Study time</b><span class="tiny muted">minutes per day, last 30 days</span></figcaption><div class="chart" data-chart="mins" role="img" aria-label="Minutes studied per day"></div></figure>
    </div></section>`;
}
function chartData(kind) {
  const t = todayKey(), day = k => Math.floor(parseKey(k).getTime() / 1000);
  if (kind === "due") {
    const days = Array.from({ length: 14 }, (_, i) => addDays(t, i)), cnt = days.map(() => 0);
    (S.cards || []).forEach(c => { if (!nodes[c.node]) return; if (!c.s) { cnt[0]++; return; } const k = c.due ? c.due.slice(0, 10) : t; const i = k <= t ? 0 : days.indexOf(k); if (i >= 0) cnt[i]++; });
    return [days.map(day), cnt];
  }
  const days = Array.from({ length: 30 }, (_, i) => addDays(t, i - 29));
  if (kind === "recall") return [days.map(day), days.map(d => { const L = S.log.filter(e => e.t === "card" && e.d === d); return L.length ? Math.round(100 * L.filter(e => e.g > 1).length / L.length) : null; })];
  return [days.map(day), days.map(d => S.log.filter(e => e.d === d && (e.t === "task" || e.t === "listen")).reduce((a, e) => a + (e.m || 0), 0))];
}
async function hydrateCharts(root) {
  const els = [...root.querySelectorAll("[data-chart]:not([data-chart-done])")]; if (!els.length) return;
  els.forEach(el => el.setAttribute("data-chart-done", "1"));
  try { await loadScript("vendor/x/uPlot.iife.min.js"); if (typeof uPlot !== "function") throw new Error("no uPlot"); }
  catch (e) { console.error(e); els.forEach(el => { el.innerHTML = `<p class="tiny muted">Charts need the internet once to load. They work offline after that.</p>`; el.removeAttribute("data-chart-done"); }); return; }
  loadCss("vendor/x/uPlot.min.css");
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  const ink = v("--muted") || "#888", grid = v("--line") || "#ddd", pen = v("--pen") || "#36c", ok = v("--ok") || "#2a7";
  els.forEach(el => {
    const kind = el.dataset.chart, data = chartData(kind), w = Math.max(240, el.clientWidth), h = 150;
    const bars = uPlot.paths.bars({ size: [.6, 18], radius: .3 });
    const axis = { stroke: ink, grid: { stroke: grid, width: 1 }, ticks: { show: false }, font: `12px ${v("--f-body") || "sans-serif"}` };
    const opts = { width: w, height: h, legend: { show: false }, cursor: { y: false, points: { size: 7 } }, padding: [8, 4, 0, 0],
      scales: { x: { time: true }, y: kind === "recall" ? { range: [0, 100] } : { range: (u, mn, mx) => [0, Math.max(kind === "mins" ? 30 : 5, mx)] } },
      axes: [{ ...axis, values: (u, ts) => ts.map(x => new Date(x * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })), space: 60 }, { ...axis, size: 36, values: (u, ts) => ts.map(x => kind === "recall" ? x + "%" : x) }],
      series: [{}, kind === "recall" ? { stroke: ok, width: 2.5, spanGaps: true, points: { size: 5, fill: ok }, fill: ok.replace(")", " / .12)") } : { stroke: pen, fill: pen.replace(")", " / .85)"), paths: bars, points: { show: false } }] };
    el.innerHTML = ""; const u = new uPlot(opts, data, el);
    new ResizeObserver(() => { const nw = Math.max(240, el.clientWidth); if (Math.abs(nw - u.width) > 2) u.setSize({ width: nw, height: h }); }).observe(el);
  });
}

/* ---------- 8. export flashcards to Anki (anki-apkg-export, MIT; sql.js, MIT) ---------- */
async function exportAnki() {
  const cards = (S.cards || []).filter(c => nodes[c.node]);
  if (!cards.length) { toast("No flashcards yet. Cards appear once you start a topic that has notes."); return; }
  toast("Making the Anki deck…");
  try {
    await loadScript("vendor/x/anki-export.js");
    const AE = AnkiExportLib.default || AnkiExportLib, base = new URL("vendor/x/", document.baseURI).href;
    const deck = await Promise.race([AE.create("Study Desk", { locateFile: f => base + f }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 30000))]);
    try {
      cards.forEach(c => { const n = nodes[c.node], subj = subjects[n.subject].name; deck.addCard(esc(c.f).replace(/＿＿＿＿/g, "_____"), `${esc(c.b)}<br><br><small>${esc(subj)} · ${esc(n.num)} ${esc(n.title)}</small>`, { tags: [subj.replace(/\s+/g, "_"), "study-desk"] }); });
      const blob = await deck.save({ type: "blob" });
      saveBlob(`study-desk-${todayKey()}.apkg`, blob) ? toast(`Saved ${cards.length} cards. Open the file with Anki or AnkiMobile to import them.`) : toast("Saving files isn't allowed here.");
    } finally { deck.close(); }
  } catch (e) { console.error(e); toast("Couldn't make the Anki deck on this device."); }
}

/* ---------- 9. laptop AI drafts (Chrome's built-in Prompt API; nothing is uploaded) ---------- */
const aiApi = () => (typeof LanguageModel !== "undefined" ? "prompt" : typeof Summarizer !== "undefined" ? "sum" : null);
async function aiReady() { const k = aiApi(); if (!k) return "no"; try { const a = await (k === "prompt" ? LanguageModel : Summarizer).availability(); return a; } catch (e) { return "no"; } }
async function aiExplain(id, out) {
  const n = nodes[id], notes = notesOf(id).slice(0, 12000);
  if (!notes.trim()) { out.innerHTML = `<p class="muted">Add notes to this topic first. The AI only uses your notes.</p>`; return; }
  out.innerHTML = `<p class="muted">Writing… (the first time, Chrome may download its AI model)</p>`;
  try {
    let text = "";
    if (aiApi() === "prompt") {
      const s = await LanguageModel.create({ initialPrompts: [{ role: "system", content: "You are a careful university tutor. Use ONLY the student's notes. If the notes don't cover something, say so. Plain British English, short paragraphs, no markdown headings." }] });
      text = await s.prompt(`Topic: ${n.title}\n\nMy notes:\n${notes}\n\nExplain this topic simply in about 150 words, then give 3 likely exam questions.`); s.destroy && s.destroy();
    } else {
      const s = await Summarizer.create({ type: "key-points", format: "plain-text", length: "medium", sharedContext: `University notes on ${n.title}` });
      text = await s.summarize(notes); s.destroy && s.destroy();
    }
    out.innerHTML = `<div class="ai-draft"><p class="ai-tag">${ico("spark")}AI draft · check it against your notes</p>${esc(text).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
  } catch (e) { console.error(e); out.innerHTML = `<p class="muted">Chrome's AI isn't available right now. It needs Chrome on a laptop with enough free space.</p>`; }
}

/* ---------- 10. sync phone ↔ laptop over an encrypted peer-to-peer link (Trystero, MIT) ---------- */
const SY = { room: null, code: "", peers: 0, state: "idle", incoming: null, send: null };
const SY_WORDS = "apple river cloud tiger maple orbit lemon piano coral ember frost hazel ivory jungle koala lunar mango north olive pearl quartz robin solar tulip violet willow yarrow zebra amber blaze cedar delta".split(" ");
function syncCode() { const r = crypto.getRandomValues(new Uint32Array(3)); return [SY_WORDS[r[0] % SY_WORDS.length], SY_WORDS[r[1] % SY_WORDS.length], String(r[2] % 90 + 10)].join("-"); }
async function syncJoin(code) {
  code = code.trim().toLowerCase().replace(/\s+/g, "-"); if (!/^[a-z]+-[a-z]+-\d\d$/.test(code)) { toast("Type the code exactly as it shows on the other device, like maple-river-42."); return; }
  syncLeave(); SY.code = code; SY.state = "waiting"; drawSyncCard();
  try {
    await loadScript("vendor/x/trystero.js");
    const room = Trystero.joinRoom({ appId: "study-desk-jj-v1", password: "sd:" + code }, "pair-" + code);
    SY.room = room;
    const backup = room.makeAction("backup"), hello = room.makeAction("hello");
    SY.send = data => backup.send(data);
    room.onPeerJoin = pid => { SY.peers++; SY.state = "connected"; hello.send({ name: deviceName(), v: APP_VERSION }, { target: pid }); drawSyncCard(); };
    room.onPeerLeave = () => { SY.peers = Math.max(0, SY.peers - 1); if (!SY.peers) SY.state = "waiting"; drawSyncCard(); };
    hello.onMessage = h => { SY.other = h && h.name ? String(h.name).slice(0, 40) : "the other device"; drawSyncCard(); };
    backup.onMessage = data => { if (typeof data !== "string" || data.length > 30e6) return; SY.incoming = data; drawSyncCard(); toast("Study data arrived from " + (SY.other || "the other device") + "."); };
  } catch (e) { console.error(e); SY.state = "error"; drawSyncCard(); }
}
function syncLeave() { try { SY.room && SY.room.leave(); } catch (e) { } Object.assign(SY, { room: null, peers: 0, state: "idle", incoming: null, send: null, other: null }); }
const deviceName = () => /iPhone/.test(navigator.userAgent) ? "iPhone" : /iPad/.test(navigator.userAgent) ? "iPad" : /Android/.test(navigator.userAgent) ? "Android phone" : /Mac/.test(navigator.userAgent) ? "Mac" : /Windows/.test(navigator.userAgent) ? "Windows laptop" : "laptop";
function syncCardHTML() {
  const st = SY.state;
  if (st === "idle") return `<p class="small muted">Copy your study data between phone and laptop. The devices connect directly with an encrypted link, nothing is stored online. Both need Study Desk open at the same time.</p>
    <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-action="sync-new">${ico("loop")}Show a pairing code</button><button class="btn btn-line" data-action="sync-enter">Enter a code</button></div>`;
  if (st === "enter") return `<label class="fld"><span>Code from the other device</span><input id="sync-code" placeholder="e.g. maple-river-42" autocomplete="off" autocapitalize="none" spellcheck="false"></label><div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="sync-join">Connect</button><button class="btn btn-line btn-sm" data-action="sync-cancel">Cancel</button></div>`;
  if (st === "error") return `<p class="small">Couldn't start the link. Check the internet connection and try again.</p><button class="btn btn-line btn-sm" data-action="sync-cancel">Close</button>`;
  const head = `<div class="sync-code"><span class="tiny muted">Pairing code</span><b class="mono">${esc(SY.code)}</b></div>`;
  if (st === "waiting") return `${head}<p class="small"><span class="pulse-dot"></span>Waiting for the other device. On it, open Settings → Sync and choose <b>Enter a code</b>.</p><button class="btn btn-line btn-sm" data-action="sync-cancel">Stop</button>`;
  return `${head}<p class="small"><span class="pulse-dot on"></span>Connected to ${esc(SY.other || "the other device")}.</p>
    ${SY.incoming ? `<div class="banner">${ico("download")}<div>Study data from ${esc(SY.other || "the other device")} is ready. Using it replaces the data on this device (you can undo straight after). <button data-action="sync-apply">Use it on this device</button></div></div>` : ""}
    <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="sync-send">${ico("upload")}Send this device's data</button><button class="btn btn-line btn-sm" data-action="sync-cancel">Disconnect</button></div>
    <p class="tiny muted">Send from the device you used most recently. Recordings stay on each device because of their size.</p>`;
}
function drawSyncCard() { const el = $("#syncCard"); if (el) el.innerHTML = syncCardHTML(); }

/* ---------- settings, topic page and progress additions ---------- */
function settingsExtras() {
  const ai = aiApi();
  return `<section class="card stack"><h2 class="h3">Sync phone and laptop</h2><div id="syncCard" class="stack" style="gap:12px">${syncCardHTML()}</div></section>
    <section class="card stack"><h2 class="h3">Reminders</h2>
      <p class="small muted">Add your exams and the next two weeks of study sessions to your phone's or laptop's calendar. The calendar app then reminds you, even when Study Desk is closed.</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-action="ics" data-kind="exams">${ico("exams")}Add exams to my calendar</button><button class="btn btn-line" data-action="ics" data-kind="study">${ico("timer")}Add study sessions</button></div>
      <p class="tiny muted">${"setAppBadge" in navigator ? "The app icon also shows how many flashcards are due." : "On a phone, install Study Desk to also see due flashcards on the app icon."} If the plan changes a lot, add the sessions again.</p></section>
    <section class="card stack"><h2 class="h3">Podcast voice</h2><div id="voiceCard" class="stack" style="gap:10px">${typeof voiceCardHTML === "function" ? voiceCardHTML() : ""}</div></section>
    <section class="card stack"><h2 class="h3">Flashcards in Anki</h2><p class="small muted">Save all your flashcards as an Anki deck (.apkg) to use them in Anki, AnkiDroid or AnkiMobile.</p><button class="btn btn-line btn-auto" data-action="anki">${ico("download")}Export to Anki</button></section>
    ${ai ? `<section class="card stack"><h2 class="h3">AI drafts on this laptop</h2><p class="small muted">This browser has built-in AI. On topic pages you can ask it for a plain explanation of your notes. It runs on this computer and is clearly marked as a draft.</p></section>` : ""}`;
}
function topicExtras(id) {
  const notes = notesOf(id), sks = SKETCHES.filter(s => s.node === id);
  return `${notes ? `<details class="card notes-view"><summary><span class="h3">Your notes</span><span class="tiny muted">${Math.max(1, Math.round(notes.split(/\s+/).length / 200))} min read</span></summary><div class="md" data-md="${id}"><p class="muted">Loading…</p></div></details>` : ""}
    <section class="card stack" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">Sketches</h2><span class="tiny muted">${sks.length || ""}</span></div>
      ${sks.length ? `<div class="sk-grid">${sks.map(s => `<button class="sk-thumb" data-action="sk-open" data-id="${s.id}" data-node="${id}" aria-label="Open sketch ${esc(s.title || "")}">${skSvg(s)}${s.title ? `<span class="tiny">${esc(s.title)}</span>` : ""}</button>`).join("")}</div>` : `<p class="small muted">Draw a diagram, a mind map or a quick memory aid. Works with a finger, mouse or Apple Pencil.</p>`}
      <button class="btn btn-line btn-sm" data-action="sk-open" data-node="${id}" style="align-self:flex-start">${ico("pencil")}New sketch</button></section>
    ${aiApi() && notes ? `<section class="card stack" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">AI explanation</h2><span class="tiny muted">on this laptop</span></div><div id="aiOut"><p class="small muted">Ask the browser's built-in AI to explain your notes in plain words and suggest exam questions.</p></div><button class="btn btn-soft btn-sm" data-action="ai-explain" data-id="${id}" style="align-self:flex-start">${ico("spark")}Write an AI draft</button></section>` : ""}`;
}

/* ---------- actions ---------- */
const X_ACTS = new Set(["ics", "anki", "ai-explain", "sk-open", "sk-col", "sk-size", "sk-undo", "sk-clear", "sk-save", "sk-del", "sync-new", "sync-enter", "sync-join", "sync-cancel", "sync-send", "sync-apply", "md-b", "md-i", "md-h", "md-li", "md-math", "md-preview"]);
async function xAction(act, a) {
  const id = a.dataset.id;
  switch (act) {
    case "ics": { const r = buildICS(a.dataset.kind); if (!r.n) { toast(a.dataset.kind === "exams" ? "No upcoming exam dates yet. Add them under My subjects." : "No study sessions planned for the next two weeks."); return; } saveBlob(`study-desk-${a.dataset.kind}.ics`, new Blob([r.text], { type: "text/calendar" })) ? toast(`${r.n} event${r.n > 1 ? "s" : ""} ready. Open the file to add ${r.n > 1 ? "them" : "it"} to your calendar.`) : toast("Saving files isn't allowed here."); return; }
    case "anki": exportAnki(); return;
    case "ai-explain": aiExplain(id, $("#aiOut")); return;
    case "sk-open": openSketch(a.dataset.node || (SKETCHES.find(s => s.id === id) || {}).node, id); return;
    case "sk-col": SK.col = +a.dataset.i; $$(".sk-col").forEach((b, i) => { b.classList.toggle("on", i === SK.col); b.setAttribute("aria-pressed", i === SK.col); }); return;
    case "sk-size": SK.size = +a.dataset.s; $$(".sk-size").forEach(b => { const on = +b.dataset.s === SK.size; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); return;
    case "sk-undo": if (SK.paths.length) SK.undo.push(SK.paths.pop()); drawSkPaths(); return;
    case "sk-clear": if (!SK.paths.length) return; SK.undo = SK.paths.slice(); SK.paths = []; drawSkPaths(); toast("Cleared.", { label: "Undo", fn: () => { SK.paths = SK.undo; drawSkPaths(); } }); return;
    case "sk-save": {
      if (!SK.paths.length) { toast("Draw something first."); return; }
      const ex = SKETCHES.find(s => s.id === SK.id), rec = { id: SK.id, node: SK.node, w: SK.w, h: SK.h, paths: SK.paths, title: ($("#sk-title")?.value || "").trim().slice(0, 80), added: ex ? ex.added : Date.now() };
      await IDB.put("sketch", rec); await loadSketches(); closeSheet(); rerender(); toast("Sketch saved."); return;
    }
    case "sk-del": if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to delete"; return; } await IDB.del("sketch", id); await loadSketches(); closeSheet(); rerender(); toast("Sketch deleted."); return;
    case "sync-new": SY.state = "waiting"; syncJoin(syncCode()); return;
    case "sync-enter": SY.state = "enter"; drawSyncCard(); setTimeout(() => $("#sync-code")?.focus(), 50); return;
    case "sync-join": syncJoin($("#sync-code")?.value || ""); return;
    case "sync-cancel": syncLeave(); drawSyncCard(); return;
    case "sync-send": { if (!SY.send || !SY.peers) { toast("Not connected yet."); return; } const txt = exportText(); a.disabled = true; try { await SY.send(txt); toast("Sent. Choose “Use it on this device” on the other device."); } catch (e) { toast("Sending failed. Try again."); } a.disabled = false; return; }
    case "sync-apply": { const txt = SY.incoming; SY.incoming = null; if (txt) doImport(txt); drawSyncCard(); return; }
    case "md-b": mdWrap($("#notes-text"), "**", "**", "bold text"); return;
    case "md-i": mdWrap($("#notes-text"), "*", "*", "italic text"); return;
    case "md-h": mdLine($("#notes-text"), "## "); return;
    case "md-li": mdLine($("#notes-text"), "- "); return;
    case "md-math": mdWrap($("#notes-text"), "$", "$", "x^2"); return;
    case "md-preview": { const pv = $("#notes-preview"), ta = $("#notes-text"); if (!pv || !ta) return; const on = pv.hidden; pv.hidden = !on; ta.hidden = on; a.textContent = on ? "Edit" : "Preview"; a.setAttribute("aria-pressed", on); if (on) { pv.removeAttribute("data-md-done"); hydrateMarkdown(pv.parentElement); } return; }
  }
}

/* ---------- after every screen change: maths, formatted notes, charts, badge ---------- */
let xRaf = 0;
function afterPaint() { cancelAnimationFrame(xRaf); xRaf = requestAnimationFrame(async () => { await hydrateMarkdown(document.body); hydrateCharts(document.body); mathify(document.body); updateBadge(); }); }
new MutationObserver(muts => { if (muts.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !n.closest?.(".math")))) afterPaint(); }).observe(document.body, { childList: true, subtree: true });

/* notes changes rebuild the questions */
const _saveNotesX = saveNotes;
saveNotes = async function (id, text) { await _saveNotesX(id, text); scheduleAutoQuestions(); };
(async function xBoot() { await loadSketches(); const wait = () => notesReady ? (scheduleAutoQuestions(), (stack && ["topic"].includes(stack[stack.length - 1].v) && rerender())) : setTimeout(wait, 300); wait(); })();
