/* Study Desk — app logic
   Sections: 1 utils · 2 model · 3 store · 4 priority & progress · 5 scheduler · 6 icons
             7 UI pieces · 8 views · 9 motion · 10 router & actions · 11 install & offline · 12 boot */
"use strict";
/* "Tap" on touch screens, "Click" with a mouse or trackpad */
const TAP = (window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) ? "Click" : "Tap";
const APP_VERSION = "4.13.0";

/* =====================================================================
   1. UTILS
   ===================================================================== */
const pad = n => String(n).padStart(2, "0");
const keyOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parseKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const diffDays = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 864e5);
const todayKey = () => keyOf(new Date());
const fmtT = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
const parseT = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const fmtD = (k, o = { weekday: "short", day: "numeric", month: "short" }) => parseKey(k).toLocaleDateString("en-GB", o);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = s => String(s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* =====================================================================
   2. MODEL — study content lives in S.content (editable in the app, seeded from data.js)
   ---------------------------------------------------------------------
   Content shape (object form):
     { from, subjects:[{id,name,code,course,hue,exam:"YYYY-MM-DD",examTime,venue,
                         chapters:[{id,title,p1,p2,diff,calc,status?,kids:[…same…]}]}],
       questions:[{id,node,level,q,o:[…],a,e,own?}], explain:{nodeId:{simple,uni,exam,example}} }
   ===================================================================== */
const DATA = window.STUDY_DATA || null;
const STATUS = ["Not started", "Learning", "Understood", "Practised", "Revised", "Mastered"];
const STATUS_COL = ["var(--line)", "var(--p-medium)", "var(--p-high)", "var(--pen)", "var(--p-done)", "var(--ok)"];
const DIFF = ["", "Easy", "Medium", "Difficult"];
const LEVELS = { easy: "Easy", medium: "Medium", hard: "Difficult", exam: "Exam-style" };
const TYPES = {
  learn: { label: "Learn", icon: "book" }, recall: { label: "Active recall", icon: "bulb" }, practice: { label: "Practice questions", icon: "pencil" },
  revision: { label: "Revision", icon: "loop" }, calc: { label: "Calculations", icon: "sigma" }, mock: { label: "Mock test", icon: "clip" }
};
const HUES = [24, 55, 200, 150, 265, 320, 95, 0];
let nodes = {}, subjects = {}, leavesBySubject = {}, byTitle = {}, dataIssues = [], DSUBJ = [], leafIds = [], QS = [];
const issue = (where, msg) => dataIssues.push({ where, msg });
const newId = p => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);

/* data.js uses compact arrays; convert to the editable object form once */
function convertData(D, anchor) {
  const seeds = {}, titleToId = {}, legacy = {};
  const out = { from: D.contentVersion || "data", subjects: [], questions: [], explain: {}, notes: {} };
  (D.subjects || []).forEach((s, si) => {
    if (!s || !s.id) return;
    const cs = { id: s.id, name: s.name || "Subject", code: s.code || "", course: s.course || "", hue: typeof s.hue === "number" ? s.hue : HUES[si % HUES.length],
      exam: s.exam && DATE_RE.test(s.exam) ? s.exam : addDays(anchor, Number.isInteger(s.examInDays) ? s.examInDays : 30), examTime: s.examTime || "", venue: s.venue || "", chapters: [] };
    const walk = (raw, parentId, num, seen) => {
      if (!Array.isArray(raw) || typeof raw[0] !== "string") return null;
      const [title, p1, p2, diff, rest, extra] = raw;
      let sl = slug(title), k = 2; while (seen.has(sl)) sl = slug(title) + "-" + (k++); seen.add(sl);
      const n = { id: parentId + "/" + sl, title, p1: +p1 || 0, p2: +p2 || +p1 || 0, diff: isInt(diff, 1, 3) ? diff : 2, calc: !!(extra && extra.calc), kids: [] };
      legacy[s.id + "-" + num.replace(/\./g, "-")] = n.id;
      if (Array.isArray(rest)) { const sn = new Set(); rest.forEach((r, i) => { const c = walk(r, n.id, num + "." + (i + 1), sn); if (c) n.kids.push(c); }); }
      if (!n.kids.length) { seeds[n.id] = isInt(rest, 0, 5) ? rest : 0; if (!titleToId[title]) titleToId[title] = n.id; }
      return n;
    };
    const seen = new Set();
    (s.chapters || []).forEach((c, i) => { const n = walk(c, s.id, String(i + 1), seen); if (n) cs.chapters.push(n); });
    out.subjects.push(cs);
  });
  (D.questions || []).forEach((q, i) => { const node = titleToId[q.topic]; if (node) out.questions.push({ id: "q" + i + "-" + slug(q.topic).slice(0, 24), node, level: q.level, q: q.q, o: q.o, a: q.a, e: q.e || "" }); else issue("data.js question " + (i + 1), "Topic “" + q.topic + "” doesn't match any subheading title."); });
  Object.entries(D.explain || {}).forEach(([t, e]) => { if (titleToId[t]) out.explain[titleToId[t]] = e; });
  out.notes = {}; Object.entries(D.notes || {}).forEach(([t, txt]) => { if (titleToId[t] && typeof txt === "string") out.notes[titleToId[t]] = txt; });
  Object.entries(D.summaries || {}).forEach(([t, sm]) => { const id = titleToId[t]; if (id) out.explain[id] = { ...(out.explain[id] || {}), summary: sm }; });
  const history = {}, mistakes = {};
  Object.entries(D.history || {}).forEach(([t, h]) => { if (titleToId[t] && h && isInt(h.a, 0, 1e4) && isInt(h.c, 0, h.a)) history[titleToId[t]] = { a: h.a, c: h.c }; });
  Object.entries(D.mistakes || {}).forEach(([t, n]) => { const id = titleToId[t]; if (id && isInt(n, 1, 999)) mistakes[id] = { n, qs: out.questions.filter(q => q.node === id).map(q => q.id).slice(0, n) }; });
  return { content: out, seeds, history, mistakes, legacy };
}

/* Repairs content so the rest of the app can trust it */
function cleanContent(c) {
  let fixes = 0;
  const out = { from: typeof c?.from === "string" ? c.from : "", subjects: [], questions: [], explain: {}, notes: {} };
  const ids = new Set();
  const cleanNode = (n, depth) => {
    if (!n || typeof n.title !== "string" || !n.title.trim() || depth > 6) { fixes++; return null; }
    let id = typeof n.id === "string" && n.id && !ids.has(n.id) ? n.id : (fixes++, newId("n")); ids.add(id);
    const p1 = isInt(n.p1, 0, 1e5) ? n.p1 : (fixes++, 0), p2 = isInt(n.p2, 0, 1e5) && n.p2 >= p1 ? n.p2 : (fixes++, p1);
    const o = { id, title: n.title.trim().slice(0, 160), p1, p2, diff: isInt(n.diff, 1, 3) ? n.diff : (fixes++, 2), calc: !!n.calc, kids: [] };
    (Array.isArray(n.kids) ? n.kids : []).forEach(k => { const x = cleanNode(k, depth + 1); if (x) o.kids.push(x); });
    return o;
  };
  (Array.isArray(c?.subjects) ? c.subjects : []).forEach((s, i) => {
    if (!s || typeof s.name !== "string" || !s.name.trim()) { fixes++; return; }
    const id = typeof s.id === "string" && s.id && !ids.has(s.id) ? s.id : (fixes++, newId("s")); ids.add(id);
    out.subjects.push({ id, name: s.name.trim().slice(0, 80), code: String(s.code || "").slice(0, 30), course: String(s.course || "").slice(0, 120), hue: typeof s.hue === "number" ? s.hue : HUES[i % HUES.length],
      exam: DATE_RE.test(s.exam || "") ? s.exam : (fixes++, addDays(todayKey(), 30)), examTime: parseT(s.examTime) !== null ? s.examTime : "", venue: String(s.venue || "").slice(0, 80),
      chapters: (Array.isArray(s.chapters) ? s.chapters : []).map(n => cleanNode(n, 0)).filter(Boolean) });
  });
  const qids = new Set();
  (Array.isArray(c?.questions) ? c.questions : []).forEach(q => {
    if (!q || !ids.has(q.node) || typeof q.q !== "string" || !Array.isArray(q.o) || q.o.length < 2 || !isInt(q.a, 0, q.o.length - 1)) { fixes++; return; }
    const id = typeof q.id === "string" && !qids.has(q.id) ? q.id : newId("q"); qids.add(id);
    out.questions.push({ id, node: q.node, level: LEVELS[q.level] ? q.level : "medium", q: q.q.slice(0, 600), o: q.o.map(x => String(x).slice(0, 300)), a: q.a, e: String(q.e || "").slice(0, 1200), own: !!q.own });
  });
  Object.entries(c?.explain || {}).forEach(([k, e]) => { if (ids.has(k) && e && typeof e === "object") out.explain[k] = { simple: String(e.simple || ""), uni: String(e.uni || ""), exam: String(e.exam || ""), example: String(e.example || ""), ...(e.summary ? { summary: Array.isArray(e.summary) ? e.summary.map(String) : String(e.summary) } : {}) }; });
  out.notes = {}; Object.entries(c?.notes || {}).forEach(([k, t]) => { if (ids.has(k) && typeof t === "string") out.notes[k] = t.slice(0, 3000000); });
  return { content: out, fixes };
}

/* Builds the lookup tables every screen uses. Called again after every edit. */
function buildModel() {
  nodes = {}; subjects = {}; leavesBySubject = {}; byTitle = {}; dataIssues = [];
  const C = S.content;
  if (DATA === null) issue("data.js", "The data file didn't load. Your own subjects still work.");
  C.subjects.forEach(raw => {
    const s = { ...raw, raw, chapterIds: [] }; subjects[s.id] = s; leavesBySubject[s.id] = [];
    const walk = (r, parent, depth, idx) => {
      const num = parent ? parent.num + "." + (idx + 1) : String(idx + 1);
      const n = { id: r.id, raw: r, title: r.title, p1: r.p1, p2: r.p2, diff: r.diff, calc: r.calc, num, depth, subject: s.id, parent: parent ? parent.id : null, kids: [] };
      nodes[n.id] = n;
      const where = s.name + " " + num + " " + r.title;
      if (parent && (r.p1 < parent.p1 || r.p2 > parent.p2) && !(r.p1 === 0 && r.p2 === 0)) issue(where, `Pages ${r.p1}–${r.p2} fall outside ${parent.title} (${parent.p1}–${parent.p2}).`);
      if (r.p1 === 0 && r.p2 === 0) issue(where, "Has no page numbers yet.");
      r.kids.forEach((k, i) => n.kids.push(walk(k, n, depth + 1, i).id));
      n.leaf = !n.kids.length;
      if (n.leaf) { leavesBySubject[s.id].push(n); if (!byTitle[r.title]) byTitle[r.title] = n; }
      return n;
    };
    raw.chapters.forEach((c, i) => s.chapterIds.push(walk(c, null, 0, i).id));
    if (!leavesBySubject[s.id].length) issue(s.name, "Has no topics yet. Add chapters under My subjects.");
  });
  DSUBJ = C.subjects.map(s => subjects[s.id]);
  leafIds = Object.values(nodes).filter(n => n.leaf).map(n => n.id);
  QS = C.questions.filter(q => nodes[q.node]).map(q => ({ ...q, subject: nodes[q.node].subject })).concat(typeof AQ !== "undefined" ? AQ.filter(q => nodes[q.node]) : []);
}
const pagesOf = n => Math.max(1, n.p2 - n.p1 + 1);
const chapterOf = id => { let n = nodes[id]; while (n && n.parent) n = nodes[n.parent]; return n; };
function findRaw(id) {
  for (const s of S.content.subjects) {
    const stack = [{ list: s.chapters, parent: null }];
    while (stack.length) { const { list, parent } = stack.pop(); for (let i = 0; i < list.length; i++) { if (list[i].id === id) return { node: list[i], list, index: i, parent, subject: s }; stack.push({ list: list[i].kids, parent: list[i] }); } }
  }
  return null;
}

/* =====================================================================
   3. STORE — versioned, validated, backed up
   ===================================================================== */
const SCHEMA_NOW = 3;
const KEY = "studydesk.v2", BAK = "studydesk.v2.bak", LEGACY = "studydesk.proto.v1";
const DEFAULT_SETTINGS = { days: [1, 2, 3, 4, 5, 6], blocks: [[540, 720], [840, 1020]], maxPerDay: 6, theme: "system", motion: "full", text: "normal" };
let S, saveTimer = null, saveFailed = false, repairs = 0, restoredFrom = null, lastDay = null, contentNotice = null;
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
function save(now) {
  clearTimeout(saveTimer);
  const write = () => { const ok = ls.set(KEY, JSON.stringify(S)); if (!ok && !saveFailed) { saveFailed = true; toast("Couldn't save on this device. Your browser may be in private mode or out of space."); } if (ok) saveFailed = false; };
  if (now) write(); else saveTimer = setTimeout(write, 150);
}
addEventListener("pagehide", () => S && save(true));
document.addEventListener("visibilitychange", () => { if (!S) return; if (document.visibilityState === "hidden") save(true); else dayCheck(); });

const examKey = sid => subjects[sid].exam;
const daysLeft = sid => diffDays(examKey(sid), todayKey());
const st = id => S.status[id] ?? 0;
const acc = id => { const h = S.attempts[id]; return h && h.a ? h.c / h.a : null; };

function blankState(anchor = todayKey()) {
  const conv = DATA ? convertData(DATA, anchor) : { content: { from: "", subjects: [], questions: [], explain: {}, notes: {} }, seeds: {}, history: {}, mistakes: {} };
  return { schema: SCHEMA_NOW, app: "study-desk", anchor, content: conv.content, contentEdited: false, status: { ...conv.seeds }, attempts: conv.history, mistakes: conv.mistakes,
    tasks: [], recent: [], changes: [], log: [], cards: [], cardsGone: [], seq: 0, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) };
}
function fresh() {
  S = blankState(); buildModel();
  const t = S.anchor, y = addDays(t, -1);
  const a = byTitle["Central tendency"], b = byTitle["Confounding variables"];
  if (a && b) {
    S.tasks.push(mkTask(y, a.id, "recall", 25, { done: true, start: 540 }), mkTask(y, b.id, "learn", 30, { start: 575 }));
    const r = [["Central tendency", "Active recall", -1], ["Experimental designs", "Revised", -2], ["Informed consent", "Revised", -2], ["Cultural anthropology", "Revised", -3]];
    S.recent = r.filter(x => byTitle[x[0]]).map(x => ({ id: byTitle[x[0]].id, text: x[1], when: addDays(t, x[2]) }));
  }
  generate(t);
  if (leafIds.length) seedLog();
  save(true);
}
function mkTask(date, node, type, dur, extra = {}) { return { id: "t" + (S.seq++), date, node, subject: nodes[node].subject, type, dur, start: 0, done: false, ...extra }; }

/* Older saves are upgraded step by step: v1 prototype → 2 (title-path ids) → 3 (content stored in the save) */
function migrate(o) {
  if (!o || typeof o !== "object") return null;
  if (o.v === 1 && !o.schema) {
    const legacy = DATA ? convertData(DATA, o.anchor || todayKey()).legacy : {};
    const map = id => legacy[id] || null;
    const remapObj = src => { const out = {}; Object.entries(src || {}).forEach(([k, v]) => { const n = map(k); if (n) out[n] = v; }); return out; };
    o = { schema: 2, app: "study-desk", anchor: o.anchor, status: remapObj(o.status), attempts: remapObj(o.attempts),
      mistakes: Object.fromEntries(Object.entries(remapObj(o.mistakes)).map(([k, m]) => [k, { n: m.n, qs: [] }])),
      tasks: (o.tasks || []).map(t => ({ ...t, node: map(t.node) })).filter(t => t.node),
      recent: (o.recent || []).map(r => ({ ...r, id: map(r.id) })).filter(r => r.id),
      changes: (o.changes || []).map(c => ({ when: c.when, text: c.text })), seq: o.seq || 0 };
  }
  if (o.schema === 2) {
    const anchor = DATE_RE.test(o.anchor || "") ? o.anchor : todayKey();
    o = { ...o, schema: 3, content: blankState(anchor).content, contentEdited: false };
  }
  if (o.schema !== SCHEMA_NOW) return null;
  return o;
}
/* Repairs anything out of shape instead of crashing. Counts what it fixed. */
function sanitize(o) {
  let fixes = 0; const fix = () => fixes++;
  const out = { schema: SCHEMA_NOW, app: "study-desk" };
  out.anchor = typeof o.anchor === "string" && DATE_RE.test(o.anchor) ? o.anchor : (fix(), todayKey());
  const cc = cleanContent(o.content); out.content = cc.content; fixes += cc.fixes; out.contentEdited = !!o.contentEdited;
  const prevS = S; S = out; buildModel(); S = prevS;
  out.status = {};
  Object.entries(o.status || {}).forEach(([k, v]) => { if (nodes[k] && nodes[k].leaf && isInt(v, 0, 5)) out.status[k] = v; else fix(); });
  out.attempts = {};
  Object.entries(o.attempts || {}).forEach(([k, v]) => { if (nodes[k] && v && isInt(v.a, 0, 1e5) && isInt(v.c, 0, v.a)) out.attempts[k] = { a: v.a, c: v.c }; else fix(); });
  out.mistakes = {};
  const qIds = new Set(out.content.questions.map(q => q.id));
  Object.entries(o.mistakes || {}).forEach(([k, v]) => { if (nodes[k] && v && isInt(v.n, 0, 1e5)) out.mistakes[k] = { n: v.n, qs: (Array.isArray(v.qs) ? v.qs : []).filter(q => qIds.has(q)) }; else fix(); });
  const seen = new Set(); let maxSeq = 0;
  out.tasks = (Array.isArray(o.tasks) ? o.tasks : []).filter(t => {
    const ok = t && typeof t.id === "string" && !seen.has(t.id) && DATE_RE.test(t.date) && nodes[t.node] && TYPES[t.type] && isInt(t.dur, 5, 600) && isInt(t.start, 0, 1440);
    if (!ok) { fix(); return false; }
    seen.add(t.id); t.subject = nodes[t.node].subject; t.done = !!t.done; maxSeq = Math.max(maxSeq, parseInt(t.id.slice(1)) || 0); return true;
  });
  out.seq = Math.max(isInt(o.seq, 0, 1e9) ? o.seq : 0, maxSeq + 1);
  out.recent = (Array.isArray(o.recent) ? o.recent : []).filter(r => r && nodes[r.id] && DATE_RE.test(r.when)).slice(0, 20);
  out.changes = (Array.isArray(o.changes) ? o.changes : []).filter(c => c && typeof c.text === "string" && DATE_RE.test(c.when)).slice(0, 30);
  out.log = (Array.isArray(o.log) ? o.log : []).filter(e => e && DATE_RE.test(e.d) && ["task", "q", "step", "listen", "card", "blurt"].includes(e.t) && (!e.n || nodes[e.n])).slice(-20000);
  const cardSeen = new Set();
  out.cards = (Array.isArray(o.cards) ? o.cards : []).filter(c => {
    const ok = c && typeof c.id === "string" && !cardSeen.has(c.id) && nodes[c.node] && nodes[c.node].leaf && typeof c.f === "string" && typeof c.b === "string" && c.f.length <= 4000 && c.b.length <= 6000
      && (c.due === null || c.due === undefined || !isNaN(Date.parse(c.due))) && (!c.s || (typeof c.s === "object" && isFinite(c.s.stability) && isFinite(c.s.difficulty) && isInt(c.s.state, 0, 3)));
    if (!ok) { fix(); return false; }
    cardSeen.add(c.id); c.kind = c.kind === "own" ? "own" : c.kind === "pic" && typeof c.pic === "string" && Array.isArray(c.box) && c.box.length === 4 && c.box.every(Number.isFinite) ? "pic" : "auto"; if (c.kind === "pic" && !(Array.isArray(c.boxes) && c.boxes.every(b => Array.isArray(b) && b.length === 4))) c.boxes = [c.box]; if (!c.s) { c.s = null; c.due = null; } else if (!c.due) { c.s = null; } return true;
  }).slice(-20000);
  out.cardsGone = (Array.isArray(o.cardsGone) ? o.cardsGone : []).filter(k => typeof k === "string").slice(-20000);
  const st0 = o.settings || {}, d = DEFAULT_SETTINGS;
  out.settings = {
    days: Array.isArray(st0.days) && st0.days.length && st0.days.every(x => isInt(x, 0, 6)) ? [...new Set(st0.days)].sort() : (fix(), d.days.slice()),
    blocks: Array.isArray(st0.blocks) && st0.blocks.length && st0.blocks.every(b => Array.isArray(b) && isInt(b[0], 0, 1439) && isInt(b[1], 1, 1440) && b[1] - b[0] >= 30) ? st0.blocks.map(b => [b[0], b[1]]).sort((a, b) => a[0] - b[0]) : (fix(), d.blocks.map(b => b.slice())),
    maxPerDay: isInt(st0.maxPerDay, 2, 10) ? st0.maxPerDay : (fix(), d.maxPerDay),
    theme: ["system", "light", "dark"].includes(st0.theme) ? st0.theme : (fix(), "system"),
    motion: ["full", "reduced"].includes(st0.motion) ? st0.motion : (fix(), "full"),
    text: st0.text === "large" ? "large" : "normal"
  };
  return { state: out, fixes };
}
function loadState() {
  const tryParse = raw => { if (!raw) return null; try { return migrate(JSON.parse(raw)); } catch (e) { return null; } };
  const main = ls.get(KEY);
  let o = tryParse(main), src = "main";
  if (!o && main) { o = tryParse(ls.get(BAK)); src = "backup"; }
  if (!o) { o = tryParse(ls.get(LEGACY)); src = o ? "legacy" : null; }
  if (!o) return false;
  const r = sanitize(o);
  S = r.state; repairs = r.fixes; restoredFrom = src === "main" ? null : src;
  buildModel();
  if (main && src === "main") ls.set(BAK, main);
  if (src === "legacy") ls.del(LEGACY);
  return true;
}
/* Drops progress and sessions that point at deleted topics, then re-plans. */
function afterContentChange(replan = true) {
  S.contentEdited = true;
  buildModel();
  Object.keys(S.status).forEach(k => { if (!nodes[k] || !nodes[k].leaf) delete S.status[k]; });
  Object.keys(S.attempts).forEach(k => { if (!nodes[k]) delete S.attempts[k]; });
  Object.keys(S.mistakes).forEach(k => { if (!nodes[k]) delete S.mistakes[k]; });
  const qIds = new Set(S.content.questions.map(q => q.id));
  Object.values(S.mistakes).forEach(m => m.qs = m.qs.filter(q => qIds.has(q)));
  S.tasks = S.tasks.filter(t => nodes[t.node]);
  S.tasks.forEach(t => t.subject = nodes[t.node].subject);
  S.recent = S.recent.filter(r => nodes[r.id]);
  if (replan) generate(todayKey());
  save();
}
/* A newer data.js (e.g. Megan's real syllabus pushed by Claude) replaces the content, keeping progress for topics that still exist */
function loadDataFile() {
  const conv = convertData(DATA, todayKey());
  S.content = cleanContent(conv.content).content;
  Object.entries(conv.seeds).forEach(([k, v]) => { if (S.status[k] === undefined) S.status[k] = v; });
  afterContentChange(true);
  S.contentEdited = false; save();
}
/* Everyone starts from a clean slate. Installs that still hold the old sample subjects lose them,
   but a subject the person added, or a sample subject they changed, is kept with all its work. */
const SAMPLE_SUBJ = { psy: "Psychology", ant: "Anthropology", swk: "Social Work" };
const SAMPLE_TITLES = new Set("17ztlut orsoik 1ryj67r 1ovx05k 5ouqcn 6ot7wn 1v82enl cia5pu 1q0jeuw u8yekz 1ai3bs2 1yrtbbz 9ggipe id2buv 5wmc92 qr3wtb m95pi8 1yu88dd 1p4h2xq orqrik gsj3zp 1gpr0yg 1g73fjo 1ppjhpd xffuop 1d5dur4 kd1wpe 1mylvoo 8c7esl 1mt9a3l 4l1fm5 1vxdnln o0br7d 5ih6je 167u1ix pqvlp3 2ltls1 syq7an 1f0zpox s18k4z ibricp l9x1f1 jxhrc0 1pkcuxs 1pvos7l do1byg e8dp96 1expro2 60diqf 7s9ddc tgfox7 1pp2jsc 13t00zf 1jn18ul 1c0hfvc 1685d3s m39voo 1db01ww 1elg5wu rix82e 1lf97j4 7z9nlp eobksy yb1oxm c0zxz2 127q8pb 13n1afq r9mxfi y6s7yv ni4hd 2ggtvu ovxtil 18t7qmj oiujh9 1oq9tuq 1tcpw7f 1tzzt8e jx302h w0ehi3 tdkp89 nvpt9w yjue12 1ix6pne hrwakn hlng7f 1q4hp0y 3ut71j hbzyaz 1jl6pa3".split(" "));
let cleanNotice = 0, cleanPending = false;
/* runs once the on-device notes and sketches are loaded, so a sample topic someone wrote notes in is never removed */
async function cleanSlate() {
  cleanPending = false;
  if (!(S.content.from || "").startsWith("sample")) return;
  let sketched = new Set(); try { sketched = new Set((await IDB.all("sketch") || []).map(x => x.node)); } catch (e) { }
  const own = id => NOTES[id] || sketched.has(id) || S.content.questions.some(q => q.own && q.node === id) || S.cards.some(c => c.kind === "own" && c.node === id);
  const h = t => { let x = 5381; for (let i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) | 0; return (x >>> 0).toString(36); };
  const titles = l => l.flatMap(n => [n.title, ...titles(n.kids || [])]);
  const ids = l => l.flatMap(n => [n.id, ...ids(n.kids || [])]);
  const isSample = s => SAMPLE_SUBJ[s.id] === s.name && titles(s.chapters).every(t => SAMPLE_TITLES.has(h(t))) && !ids(s.chapters).some(own);
  const before = S.content.subjects.length;
  S.content.subjects = S.content.subjects.filter(s => !isSample(s));
  cleanNotice = before - S.content.subjects.length;
  S.content.from = "own";
  buildModel();
  S.content.questions = S.content.questions.filter(q => nodes[q.node]);
  ["notes", "explain"].forEach(k => Object.keys(S.content[k]).forEach(id => { if (!nodes[id]) delete S.content[k][id]; }));
  S.log = S.log.filter(e => !e.n || nodes[e.n]);
  S.cards = S.cards.filter(c => nodes[c.node]);
  if (!S.content.subjects.length) S.changes = [];
  afterContentChange(true);
  S.contentEdited = S.content.subjects.length > 0; save(true);
  stack = [{ v: stack[0].v }]; render(true);
  if (cleanNotice) toast(S.content.subjects.length ? "The sample subjects are gone. Everything you added is still here." : "Study Desk now starts empty, ready for your own subjects.");
}
function checkDataFile() {
  if (DATA && Array.isArray(DATA.subjects) && !DATA.subjects.length) { cleanPending = (S.content.from || "").startsWith("sample"); return; }
  if (!DATA || !DATA.contentVersion || DATA.contentVersion === S.content.from) return;
  if (!S.contentEdited) { loadDataFile(); contentNotice = { auto: true }; }
  else contentNotice = { auto: false };
}

/* ---------- backup / restore ---------- */
/* one object, stringified once and compact, so backups of very big books stay quick */
function exportObj() { return { app: "study-desk", schema: SCHEMA_NOW, version: APP_VERSION, exportedAt: new Date().toISOString(), state: S, notes: NOTES }; }
function exportText() { return JSON.stringify(exportObj()); }
/* the same backup built in pieces, one topic's notes at a time, so a very big library never freezes the screen */
async function exportParts() {
  const { notes, ...rest } = exportObj(), head = JSON.stringify(rest), ks = Object.keys(notes || {}), parts = [head.slice(0, -1) + ',"notes":{'];
  let t = performance.now();
  for (let i = 0; i < ks.length; i++) {
    parts.push((i ? "," : "") + JSON.stringify(ks[i]) + ":" + JSON.stringify(notes[ks[i]]));
    if (performance.now() - t > 30) { await new Promise(r => setTimeout(r, 0)); t = performance.now(); }
  }
  parts.push("}}"); return parts;
}
function importText(txt) {
  let o; try { o = JSON.parse(txt); } catch (e) { return { error: "That isn't a Study Desk backup. Check you copied the whole file." }; }
  const raw = o && o.app === "study-desk" && o.state ? o.state : o;
  const m = migrate(raw);
  if (!m) return { error: "This backup is from a version of Study Desk this app can't read." };
  const r = sanitize(m);
  r.notes = o && o.notes && typeof o.notes === "object" && !Array.isArray(o.notes) ? o.notes : null;
  return r;
}

/* ---------- undo (one step) ---------- */
let undoSnap = null;
const snapshot = () => { undoSnap = JSON.stringify(S); };
function undo() { if (!undoSnap) return; S = JSON.parse(undoSnap); undoSnap = null; buildModel(); save(); flipRerender(); toast("Undone."); }

/* =====================================================================
   4. PRIORITY & PROGRESS
   score = exam closeness + difficulty + amount left + weakness + not practised/revised
   ===================================================================== */
function scoreParts(id, dateK, s = st(id)) {
  const n = nodes[id], days = diffDays(examKey(n.subject), dateK);
  if (s >= 5) return { total: -1, parts: [], level: "done" };
  const parts = [];
  const urg = days <= 7 ? 4 : days <= 14 ? 3 : days <= 21 ? 2 : 1;
  parts.push([days < 0 ? "Exam has passed" : "Exam in " + days + " day" + (days === 1 ? "" : "s"), days < 0 ? 0 : urg]);
  parts.push([DIFF[n.diff] + " topic", n.diff - 1]);
  parts.push([Math.round((5 - s) / 5 * 100) + "% of the work still to do", +((5 - s) / 5 * 3).toFixed(1)]);
  const a = acc(id);
  if (a !== null && a < .6) parts.push(["Weak in practice (" + Math.round(a * 100) + "% correct)", 2]);
  if (s < 3) parts.push(["Not practised yet", .5]); else if (s < 4) parts.push(["Not revised yet", .5]);
  const total = +parts.reduce((t, p) => t + p[1], 0).toFixed(1);
  return { total, parts, level: lvlOf(total) };
}
const lvlOf = t => t >= 9 ? "urgent" : t >= 7 ? "high" : t >= 5 ? "medium" : "low";
const PR = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low", done: "Completed" };
const PRC = { urgent: "var(--p-urgent)", high: "var(--p-high)", medium: "var(--p-medium)", low: "var(--p-low)", done: "var(--p-done)" };
function leavesUnder(id) { if (subjects[id]) return leavesBySubject[id].map(n => n.id); const n = nodes[id]; return n.leaf ? [id] : n.kids.flatMap(leavesUnder); }
function aggLevel(id) { const ls_ = leavesUnder(id).map(l => scoreParts(l, todayKey())); if (!ls_.length || ls_.every(x => x.level === "done")) return "done"; return lvlOf(Math.max(...ls_.map(x => x.total))); }
const prOf = id => nodes[id].leaf ? scoreParts(id, todayKey()).level : aggLevel(id);
function subjLevel(sid) { const d = daysLeft(sid), p = progress(sid); if (d < 0 || p >= .999) return "done"; if (d <= 10 && p < .8) return "urgent"; if (d <= 16) return "high"; return "medium"; }
function progress(id, fn = s => s / 5) {
  const ls_ = id ? leavesUnder(id) : leafIds; let w = 0, t = 0;
  ls_.forEach(l => { const p = pagesOf(nodes[l]); w += p; t += p * fn(st(l)); });
  return w ? t / w : 0;
}
const contentPct = id => progress(id, s => s >= 2 ? 1 : s === 1 ? .4 : 0);
const practisedPct = id => progress(id, s => s >= 3 ? 1 : 0);
const revisedPct = id => progress(id, s => s >= 4 ? 1 : 0);
const pct = x => Math.round(x * 100);
function weakList() {
  const out = [];
  leafIds.forEach(id => {
    const a = acc(id), m = S.mistakes[id]?.n || 0, h = S.attempts[id];
    if (st(id) >= 5) return;
    if ((a !== null && a < .6) || m >= 2) {
      const sev = (a !== null && a < .5) || m >= 3 ? "urgent" : "high";
      const why = a !== null ? `Answered ${h.c}/${h.a} practice questions correctly` + (m ? ` · ${m} mistake${m > 1 ? "s" : ""} to review` : "") : `${m} incorrect answers`;
      out.push({ id, sev, why, a: a ?? 1 });
    }
  });
  return out.sort((x, y) => x.sev === y.sev ? x.a - y.a : x.sev === "urgent" ? -1 : 1);
}

/* =====================================================================
   5. SCHEDULER — turns the syllabus into dated, timed study sessions
   ===================================================================== */
const BREAK = 10;
const isStudyDay = k => S.settings.days.includes(parseKey(k).getDay());
const blocks = () => S.settings.blocks.map(b => b.slice());
const eveningBlock = () => { const end = Math.max(...S.settings.blocks.map(b => b[1])); const s = Math.max(end + 60, 1110); return s + 60 <= 1380 ? [s, Math.min(s + 180, 1380)] : null; };
const nextStep = (s, calc) => s <= 1 ? "learn" : s === 2 ? (calc ? "calc" : "practice") : s === 3 ? "revision" : "recall";
const durFor = (type, n) => type === "learn" ? clamp(Math.round(pagesOf(n) * 4 / 5) * 5, 20, 50) : { recall: 20, practice: 30, calc: 35, revision: 25, mock: 90 }[type];
const stepAfter = { learn: 2, practice: 3, calc: 3, revision: 4, recall: 5, mock: 0 };

function generate(fromK) {
  S.tasks = S.tasks.filter(t => t.done || t.date < fromK);
  const sim = { ...S.status };
  S.tasks.filter(t => !t.done && t.type !== "mock").forEach(t => { sim[t.node] = Math.max(sim[t.node] ?? 0, stepAfter[t.type]); });
  const horizon = Math.min(120, Math.max(0, ...DSUBJ.map(s => diffDays(examKey(s.id), fromK))));
  const perSubjCap = Math.max(2, Math.ceil(S.settings.maxPerDay * .67));
  for (let i = 0; i < horizon; i++) {
    const day = addDays(fromK, i);
    if (!isStudyDay(day)) continue;
    const bl = blocks(); let count = 0; const per = {};
    const place = dur => { const b = bl.find(b => b[1] - b[0] >= dur); if (!b) return null; const s = b[0]; b[0] += dur + BREAK; return s; };
    DSUBJ.forEach(s => {
      if (diffDays(examKey(s.id), day) === 2 && leavesBySubject[s.id].length) {
        const at = place(90); if (at !== null) { S.tasks.push(mkTask(day, leavesBySubject[s.id][0].id, "mock", 90, { pinned: true, mockOf: s.id, start: at, ord: at })); count++; }
      }
    });
    const cands = leafIds.filter(id => diffDays(examKey(nodes[id].subject), day) > 0 && (sim[id] ?? 0) < 5)
      .map(id => ({ id, sc: scoreParts(id, day, sim[id] ?? 0).total })).sort((a, b) => b.sc - a.sc);
    for (const c of cands) {
      if (count >= S.settings.maxPerDay) break;
      const n = nodes[c.id]; if ((per[n.subject] || 0) >= perSubjCap) continue;
      const type = nextStep(sim[c.id] ?? 0, n.calc), dur = durFor(type, n), at = place(dur);
      if (at === null) continue;
      S.tasks.push(mkTask(day, c.id, type, dur, { start: at, ord: at }));
      count++; per[n.subject] = (per[n.subject] || 0) + 1; sim[c.id] = Math.max(sim[c.id] ?? 0, stepAfter[type]);
    }
  }
}
const tasksOn = k => S.tasks.filter(t => t.date === k).sort((a, b) => a.start - b.start);
const order = t => (t.pinned ? 0 : t.carried ? 1 : 2) * 1e6 + (t.ord ?? t.start);
function reflow(k, evening = false) {
  const ts = S.tasks.filter(t => t.date === k && !t.done).sort((a, b) => order(a) - order(b));
  const fixed = S.tasks.filter(t => t.date === k && t.done);
  const ev = evening ? eveningBlock() : null;
  const bl = (ev ? [...blocks(), ev] : blocks());
  fixed.forEach(f => bl.forEach(b => { if (f.start >= b[0] && f.start < b[1]) b[0] = Math.max(b[0], f.start + f.dur + BREAK); }));
  const over = [];
  ts.forEach(t => { const b = bl.find(b => b[1] - b[0] >= t.dur); if (!b) { over.push(t); return; } t.start = b[0]; t.ord = t.start; b[0] += t.dur + BREAK; });
  return over;
}
function nextStudyDay(k, sid) {
  for (let i = 1; i < 60; i++) { const d = addDays(k, i); if (diffDays(examKey(sid), d) <= 0) return null; if (isStudyDay(d)) return d; }
  return null;
}
function placeOn(t, day, notes, depth = 0) {
  t.date = day; t.carried = true; t.ord = -1;
  const over = reflow(day);
  over.forEach(o => {
    if (depth > 40) { notes.risk.push(o); return; }
    const nd = nextStudyDay(day, o.subject);
    if (nd) { notes.bumped.push(o); placeOn(o, nd, notes, depth + 1); }
    else { notes.risk.push(o); const still = reflow(day, true); still.forEach(x => { x.start = 1290; }); }
  });
}
function missTask(t) {
  const from = t.date < todayKey() ? addDays(todayKey(), -1) : t.date;
  const nd = nextStudyDay(from, t.subject);
  const notes = { bumped: [], risk: [] };
  if (!nd) { const last = addDays(examKey(t.subject), -1); t.date = last < todayKey() ? todayKey() : last; t.carried = true; notes.risk.push(t); reflow(t.date, true); }
  else placeOn(t, nd, notes);
  let text = `${nodes[t.node].title} (${subjects[t.subject].name}) moved to ${fmtD(t.date, { weekday: "long", day: "numeric", month: "short" })} at ${fmtT(t.start)}.`;
  if (notes.bumped.length) text += ` ${notes.bumped.length} lower-priority session${notes.bumped.length > 1 ? "s" : ""} shifted later to make room.`;
  if (notes.risk.length) text += ` Time is short before the exam, so an evening session was added.`;
  S.changes.unshift({ when: todayKey(), text });
  S.changes = S.changes.slice(0, 30);
  return text;
}
function rollOver() {
  const t = todayKey(); const late = S.tasks.filter(x => !x.done && x.date < t);
  late.forEach(x => {
    const was = x.date;
    if (diffDays(examKey(x.subject), t) <= 0) { S.tasks = S.tasks.filter(y => y !== x); return; }
    const target = isStudyDay(t) ? t : nextStudyDay(t, x.subject);
    if (!target) { S.tasks = S.tasks.filter(y => y !== x); return; }
    const notes = { bumped: [], risk: [] }; placeOn(x, target, notes);
    S.changes.unshift({ when: t, text: `${x.type === "mock" ? subjects[x.subject].name + " mock test" : nodes[x.node].title + " (" + subjects[x.subject].name + ")"} wasn't finished on ${fmtD(was, { weekday: "long" })}, so it moved to ${target === t ? "today" : fmtD(target, { weekday: "long" })} at ${fmtT(x.start)}.` });
  });
  S.changes = S.changes.slice(0, 30);
  return late.length;
}

/* =====================================================================
   6. ICONS
   ===================================================================== */
const P = {
  today: '<path d="M12 3v2M12 19v2M4.2 7l1.7 1M18.1 16l1.7 1M3 12h2M19 12h2M4.2 17l1.7-1M18.1 8l1.7-1"/><circle cx="12" cy="12" r="4"/>',
  exams: '<rect x="4" y="4" width="16" height="17" rx="2.5"/><path d="M8 2.5v3M16 2.5v3M4 9.5h16M9 14l2 2 4-4"/>',
  cal: '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4"/><path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01"/>',
  practice: '<path d="M14.5 4.5l5 5L9 20H4v-5z"/><path d="M12.5 6.5l5 5"/>',
  progress: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', chev: '<path d="M9 5l7 7-7 7"/>', left: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 006.5 23H20v-5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
  pencil: '<path d="M14.5 4.5l5 5L9 20H4v-5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  loop: '<path d="M20 11a8 8 0 00-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0014.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
  sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  shift: '<path d="M4 12h13M13 7l5 5-5 5"/><path d="M21 4v16"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2.5"/><path d="M7 3h11.5A2.5 2.5 0 0 1 21 5.5V17"/>',
  map: '<circle cx="5" cy="12" r="2.2"/><circle cx="19" cy="5" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M7.2 12H17M7 11c4-6 6-6 10-6M7 13c4 6 6 6 10 6"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
};
const ico = (k, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[k]}</svg>`;

/* =====================================================================
   7. UI PIECES
   ===================================================================== */
const subjColor = sid => `oklch(var(--sl) 0.15 ${subjects[sid].hue})`;
function seg(p, cls = "", color) { let h = ""; for (let i = 0; i < 10; i++) { const f = clamp(p * 10 - i, 0, 1); h += `<span>${f > 0 ? `<i style="width:${f * 100}%;--k:${i}"></i>` : ""}</span>`; } return `<div class="seg ${cls}" style="${color ? `--bar:${color}` : ""}" role="img" aria-label="${pct(p)}%">${h}</div>`; }
const progRow = (label, p, color, cls = "") => `<div class="prog"><div class="lab"><span>${label}</span><b data-num="${pct(p)}">${pct(p)}%</b></div>${seg(p, cls, color)}</div>`;
const prPill = lvl => `<span class="pill pr-${lvl}"><span class="dot"></span>${PR[lvl]}</span>`;
const diffTag = d => `<span class="diff"><b>${[1, 2, 3].map(i => `<i class="${i <= d ? "on" : ""}"></i>`).join("")}</b>${DIFF[d]}</span>`;
const pagesTag = n => `<span class="pages">pp ${n.p1}–${n.p2}</span>`;
function statusTag(s) { const icon = s >= 5 ? ico("check") : `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="var(--line)" stroke-width="2.4"/>${s > 0 ? `<circle cx="8" cy="8" r="6.2" fill="none" stroke="${STATUS_COL[s]}" stroke-width="2.4" stroke-dasharray="${s / 5 * 39} 39" transform="rotate(-90 8 8)"/>` : ""}</svg>`; return `<span class="status" style="color:${s >= 5 ? "var(--ok)" : "var(--ink-2)"}">${icon}${STATUS[s]}</span>`; }
const crumbTitle = id => { const n = nodes[id]; return n.depth === 0 ? "Ch " + n.num : n.num; };

function taskRow(t, opts = {}) {
  const n = nodes[t.node], s = subjects[t.subject], ty = TYPES[t.type];
  const lvl = t.done ? "done" : t.type === "mock" ? "high" : scoreParts(t.node, t.date).level;
  const title = t.type === "mock" ? `${s.name} mock exam` : n.title;
  const ch = chapterOf(t.node);
  const where = t.type === "mock" ? `Full paper · all chapters` : `Ch ${ch.num} ${esc(ch.title)} · ${n.num}`;
  const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const isNow = !t.done && t.date === todayKey() && nowM >= t.start && nowM < t.start + t.dur;
  const go = t.type === "mock" ? "subject:" + t.subject : "topic:" + t.node;
  return `<div class="task ${t.done ? "done" : ""} ${isNow ? "now" : ""}" data-flip-id="${t.id}" style="--pc:${PRC[lvl]}">
    <div class="time">${fmtT(t.start)}<small>${fmtT(t.start + t.dur)}</small>${opts.date ? `<small>${fmtD(t.date, { day: "numeric", month: "short" })}</small>` : ""}</div>
    <div class="body" role="link" tabindex="0" data-go="${go}">
      <span class="kind"><span class="k">${ico(ty.icon)}<span>${ty.label} · ${t.dur} min</span></span><span class="grow"></span>${prPill(lvl)}</span>
      <span class="title">${esc(title)}</span>
      <span class="meta"><span style="color:${subjColor(t.subject)};font-weight:700">${s.name}</span>${opts.compact ? "" : `<span>${where}</span>`}${t.type !== "mock" ? pagesTag(n) : ""}${t.carried && !t.done ? `<span class="carried">Moved here</span>` : ""}${isNow ? `<span class="carried nowtag">Now</span>` : ""}</span>
      ${!t.done && !opts.noMove && (t.date < todayKey() || (t.date === todayKey() && nowM >= t.start)) ? `<span class="acts"><span class="miss" role="button" tabindex="0" data-action="miss" data-id="${t.id}">${ico("shift")}I didn't get to this</span></span>` : ""}
    </div>
    <button class="check" role="checkbox" aria-checked="${t.done}" aria-label="Mark ${esc(title)} done" data-action="toggle" data-id="${t.id}"><span>${ico("check")}</span></button>
  </div>`;
}
function planList(ts, opts) {
  if (!ts.length) return `<div class="empty">No sessions planned.</div>`;
  let h = "", lunch = false; const firstEnd = S.settings.blocks[0][1];
  ts.forEach(t => { if (!opts?.compact && !lunch && S.settings.blocks.length > 1 && t.start >= firstEnd && ts[0].start < firstEnd) { h += `<div class="lunch">Break</div>`; lunch = true; } h += taskRow(t, opts); });
  return `<div class="plan">${h}</div>`;
}
function examCard(sid) {
  const s = subjects[sid], d = daysLeft(sid), lvl = subjLevel(sid), col = PRC[lvl];
  const total = clamp(Math.max(d, 14), 1, 30), gone = Math.max(0, total - d);
  let ticks = ""; for (let i = 0; i <= total; i++) ticks += `<i class="${i === total ? "exam-day" : i < gone ? "gone" : ""}"></i>`;
  const weak = weakList().filter(w => nodes[w.id].subject === sid).length;
  return `<button class="exam" data-go="subject:${sid}" style="--pc:${col};--pc-ink:${lvl === "urgent" ? "var(--p-urgent)" : "var(--ink)"}">
    <div class="top"><div><div class="subj">${esc(s.name)}</div><div class="code">${esc(s.code || "")}</div></div>${prPill(lvl)}</div>
    <div class="count"><b class="mono" ${d >= 0 ? `data-count="${d}"` : ""}>${d < 0 ? "Done" : d}</b><span>${d < 0 ? "exam finished" : d === 0 ? "Exam today" : d === 1 ? "day left" : "days left"}</span></div>
    <div class="ticks" aria-hidden="true">${ticks}</div>
    <div class="when">${fmtD(examKey(sid), { weekday: "long", day: "numeric", month: "long" })}${s.examTime ? " · " + esc(s.examTime) : ""}${s.venue ? " · " + esc(s.venue) : ""}</div>
    <div class="stats"><div><b>${pct(contentPct(sid))}%</b><span>content complete</span></div><div><b>${pct(revisedPct(sid))}%</b><span>revised</span></div><div><b>${weak}</b><span>weak topic${weak === 1 ? "" : "s"}</span></div></div>
  </button>`;
}
const topicItem = (id, sub) => { const n = nodes[id]; return `<button class="item" data-go="topic:${id}" style="--pc:${PRC[prOf(id)]}"><span class="mark"></span><span class="grow"><span class="t">${esc(n.title)}</span><br><span class="s">${sub}</span></span>${ico("chev", 'class="chev"')}</button>`; };

/* =====================================================================
   8. VIEWS
   ===================================================================== */
const V = {};
/* the Day Dial: today's study window as a ring, one arc per session */
function dayDial(ts, nowM) {
  if (!ts.length) return "";
  const b = S.settings.blocks, start = Math.min(b[0][0], ...ts.map(x => x.start)), end = Math.max(b[b.length - 1][1], ...ts.map(x => x.start + x.dur));
  const span = Math.max(60, end - start), R = 52, C = 64;
  const ang = m => -90 + 360 * clamp((m - start) / span, 0, 1);
  const pt = a => [C + R * Math.cos(a * Math.PI / 180), C + R * Math.sin(a * Math.PI / 180)];
  const arc = (a0, a1) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const live = ts.find(x => !x.done && nowM >= x.start && nowM < x.start + x.dur), nxt = ts.filter(x => !x.done).sort((x, y) => x.start - y.start).find(x => x.start >= nowM);
  const leftAll = ts.filter(x => !x.done).length;
  const centre = !leftAll ? `<b>Done</b><span>${ts.length}/${ts.length}</span>` : live ? `<b>${live.start + live.dur - nowM}m</b><span>left now</span>` : nxt ? (nxt.start - nowM <= 90 ? `<b>${nxt.start - nowM}m</b><span>until next</span>` : `<b>${fmtT(nxt.start)}</b><span>next up</span>`) : `<b>${leftAll}</b><span>to catch up</span>`;
  const arcs = ts.map((x, i) => { const a0 = ang(x.start) + 1.6, a1 = Math.max(a0 + 2, ang(x.start + x.dur) - 1.6); return `<path d="${arc(a0, a1)}" pathLength="1" class="dd-a ${x.done ? "done" : ""} ${x === live ? "live" : ""}" style="--c:${x.type === "mock" ? "var(--mock)" : subjColor(x.subject)};--k:${i}"/>`; }).join("");
  const inWin = nowM >= start && nowM <= end, [nx, ny] = pt(ang(nowM));
  const label = `Today's sessions: ${ts.filter(x => x.done).length} of ${ts.length} done.`;
  return `<div class="daydial" role="img" aria-label="${label}"><svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="${C}" cy="${C}" r="${R}" class="dd-track"/>${arcs}${inWin ? `<circle cx="${nx.toFixed(2)}" cy="${ny.toFixed(2)}" r="4.5" class="dd-now"/>` : ""}</svg><div class="dd-c">${centre}</div></div>`;
}
V.today = () => {
  const t = todayKey(), ts = tasksOn(t), left = ts.filter(x => !x.done), mins = left.reduce((a, x) => a + x.dur, 0);
  const upcoming = DSUBJ.filter(s => daysLeft(s.id) >= 0).sort((a, b) => daysLeft(a.id) - daysLeft(b.id));
  const dateLine = `<div class="date">${fmtD(t, { weekday: "long", day: "numeric", month: "long" })}${streak() > 1 ? ` · <span class="streak">${streak()}-day streak</span>` : ""}</div>`;
  if (!DSUBJ.length) return `<div class="stack" style="gap:24px"><header class="hero">${dateLine}<h1 id="heroTitle">What should I study <span class="hl">today?</span></h1>
      <p class="lede">Add your subjects and exam dates, and Study Desk will plan every day for you.</p></header>
      <div class="card stack"><h2 class="h3">Get started in three steps</h2><ol class="steps"><li>Name a subject and its exam date.</li><li>Import a textbook chapter, lecture slides or a Word document. Study Desk finds the chapters and turns the text into notes.</li><li>Come back here each day to see what to study.</li></ol>
        <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-go="import">${ico("upload")}Import your first file</button><button class="btn btn-line" data-go="editsubj:new">Add a subject by hand</button></div></div></div>`;
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const next = left.find(x => x.start + x.dur > nowM) || left[0];
  const rest = ts.filter(x => x !== next);
  const changes = S.changes.filter(c => c.when === t).slice(0, 5);
  const top = upcoming[0];
  const lede = !ts.length ? `Rest day. Nothing planned today.` : !left.length ? `<strong>All done for today.</strong> Nice work.` : `<strong>${left.length} session${left.length > 1 ? "s" : ""} · ${fmtMins(mins)}</strong> left${top ? `. ${esc(top.name)} exam in ${daysLeft(top.id)} day${daysLeft(top.id) === 1 ? "" : "s"}.` : "."}`;
  let hero = "";
  if (next) {
    const n = nodes[next.node], s = subjects[next.subject], ty = TYPES[next.type], isMock = next.type === "mock", ch = chapterOf(next.node);
    const lvl = isMock ? "high" : scoreParts(next.node, t).level, live = nowM >= next.start && nowM < next.start + next.dur;
    hero = `<section class="upnext" data-flip-id="${next.id}" style="--pc:${subjColor(next.subject)}">
      <div class="un-top"><span class="un-label">${live ? '<span class="live"></span>Now' : "Up next"} · ${fmtT(next.start)}–${fmtT(next.start + next.dur)}</span>${prPill(lvl)}</div>
      <button class="un-body" data-go="${isMock ? "subject:" + next.subject : "topic:" + next.node}">
        <span class="un-kind">${ico(ty.icon)}${ty.label} · ${next.dur} min</span>
        <span class="un-title">${esc(isMock ? s.name + " mock exam" : n.title)}</span>
        <span class="un-meta"><b style="color:${subjColor(next.subject)}">${esc(s.name)}</b>${isMock ? "" : ` · Ch ${ch.num} ${esc(ch.title)} · <span class="pages">pp ${n.p1}–${n.p2}</span>`}</span></button>
      <div class="un-acts"><button class="btn btn-pen" data-action="focus" data-id="${next.id}">${ico("timer")}${F && F.tid === next.id ? `Resume · <span class="mono">${fmtClock(Math.ceil(fLeft() / 1000))}</span>` : "Start"}</button><button class="btn btn-soft un-done" data-action="toggle" data-id="${next.id}" aria-label="Done">${ico("check")}<span>Done</span></button>${isMock ? "" : `<button class="btn btn-soft btn-icon" data-action="ep-play" data-kind="topic" data-id="${next.node}" aria-label="Listen to ${esc(n.title)}">${ico("headphones")}</button>`}<button class="btn btn-line btn-sm" data-action="miss" data-id="${next.id}">Not today</button></div>
    </section>`;
  } else if (ts.length) hero = `<section class="upnext done-card"><div class="un-title">Day complete</div><p class="muted">Every session on today's plan is done.</p><div class="un-acts"><button class="btn btn-soft" data-go="practice">${ico("pencil")}Practise a weak topic</button><button class="btn btn-line btn-sm" data-action="ep-play" data-kind="week">${ico("headphones")}Hear your week</button></div></section>`;
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i)), exams = {}; DSUBJ.forEach(s => exams[s.exam] = s);
  return `<div class="stack" style="gap:24px">
    <header class="hero">${dateLine}<h1 id="heroTitle">What should I study <span class="hl">today?</span></h1>
      <div class="hero-row">${dayDial(ts, nowM)}<div class="hero-stats">${!ts.length ? `<p class="lede">Rest day. Nothing planned today.</p>` : !left.length ? `<p class="lede"><strong>All done for today.</strong> Nice work.</p>` : `<div class="hs"><b>${left.length}</b><span>session${left.length > 1 ? "s" : ""} left</span></div><div class="hs"><b>${mins >= 60 ? Math.floor(mins / 60) + "h" + (mins % 60 ? " " + (mins % 60) + "m" : "") : mins + "m"}</b><span>of study</span></div>`}${top ? `<div class="hs"><b>${daysLeft(top.id)}d</b><span>to ${esc(top.name)}</span></div>` : ""}</div></div></header>
    ${restoredFrom ? `<div class="banner">${ico("shield")}<div>${restoredFrom === "legacy" ? "Your progress from the first prototype was carried over." : "Your saved data couldn't be read, so Study Desk restored it from the automatic backup."}</div></div>` : ""}
    <div class="dash">
      <div class="stack" style="gap:18px">${hero}
        ${(() => { const n = typeof cardsDueCount === "function" ? cardsDueCount() : 0; return n ? `<button class="card cards-due" data-action="fc-start"><span class="cd-ico" aria-hidden="true">${ico("cards")}</span><span class="grow"><b>${n} flashcard${n > 1 ? "s" : ""} due</b><span class="tiny muted">About ${Math.max(1, Math.round(n * 0.15))} min · keeps what you learned from fading</span></span>${ico("chev", 'class="chev"')}</button>` : ""; })()}
        ${rest.length ? `<section class="section"><div class="sec-head"><h2>${next ? "Rest of today" : "Today"}</h2><span class="tiny muted mono">${ts.filter(x => x.done).length}/${ts.length} done</span></div><div class="card plan-card">${planList(rest, { compact: true })}</div></section>` : ""}
        ${changes.length ? `<details class="chg"><summary>${ico("shift")}<span class="grow">Your plan changed today</span><span class="chg-n">${changes.length === 1 ? "1 update" : changes.length + " updates"}</span>${ico("chev", 'class="caret"')}</summary><ul>${changes.map(c => `<li>${esc(c.text)}</li>`).join("")}</ul></details>` : ""}
      </div>
      <div class="side stack" style="gap:18px">
        ${backupDue() ? `<div class="banner">${ico("shield")}<div class="grow">It's been a while since your last backup. Save one so your progress is safe if this device is lost.</div><button class="btn btn-soft btn-sm" data-action="export">Save backup</button><button class="icon-btn sm" data-action="bak-later" aria-label="Remind me later">${ico("x")}</button></div>` : ""}
        <section class="section"><div class="sec-head"><h2>This week</h2><button class="link" data-go="calendar">Calendar</button></div>
          <div class="weekstrip">${week.map(d => { const n = tasksOn(d).length, dn = tasksOn(d).filter(x => x.done).length, ex = exams[d]; return `<button class="wd ${d === t ? "today" : ""} ${ex ? "ex" : ""}" style="${ex ? `--pc:${subjColor(ex.id)}` : ""}" data-action="cal-open" data-k="${d}"><span class="wd-d">${parseKey(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</span><b>${parseKey(d).getDate()}</b><span class="wd-n">${ex ? "Exam" : n ? (d === t ? dn + "/" + n : n) : "–"}</span><span class="sr">, ${fmtD(d, { weekday: "long", day: "numeric" })}: ${ex ? ex.name + " exam" : n + " sessions"}</span></button>`; }).join("")}</div></section>
        <section class="section"><div class="sec-head"><h2>Exams</h2><button class="link" data-go="exams">All</button></div>
          <div class="minis">${upcoming.slice(0, 3).map(s => { const d = daysLeft(s.id), lvl = subjLevel(s.id); return `<button class="mini" data-go="subject:${s.id}" style="--pc:${PRC[lvl]}"><b data-count="${d}">${d}</b><span class="grow"><span class="t">${esc(s.name)}</span><span class="tiny muted">${d === 1 ? "day" : "days"} left · ${pct(progress(s.id))}% done</span></span></button>`; }).join("") || `<div class="card empty">No upcoming exams.</div>`}</div></section>
        <button class="card weekteaser" data-go="progress">${(() => { const w = weekStats(addDays(t, -6), t); return `<span class="grow"><b>Your week</b><span class="tiny muted">${w.sessions} sessions · ${fmtMins(w.mins)}${w.answered ? ` · ${pct(w.right / w.answered)}% right` : ""}</span></span>`; })()}${ico("chev", 'class="chev"')}</button>
      </div>
    </div>
  </div>`;
};

V.exams = () => `<div class="stack" style="gap:20px"><header class="subhead"><div class="eyebrow">${DSUBJ.length} subjects</div><h1>Exam countdown</h1><p class="muted">Counted from today's date. The closer the exam and the less prepared you are, the louder the card.</p>${DSUBJ.length ? `<div class="row" style="flex-wrap:wrap"><button class="btn btn-line btn-sm" data-go="edit">${ico("pencil")}Edit my subjects</button><button class="btn btn-line btn-sm" data-go="import">${ico("upload")}Import a file</button></div>` : ""}</header>
  ${DSUBJ.length ? "" : `<div class="card empty stack" style="align-items:flex-start;gap:12px;text-align:left"><p style="margin:0">No subjects yet. Import a file to add a subject with its chapters and notes, or add one by hand.</p><div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-go="import">${ico("upload")}Import a file</button><button class="btn btn-line" data-go="editsubj:new">Add by hand</button></div></div>`}
  <div class="exams grid">${DSUBJ.slice().sort((a, b) => daysLeft(a.id) - daysLeft(b.id)).map(s => examCard(s.id)).join("")}</div></div>`;

V.subject = sid => {
  const s = subjects[sid]; if (!s) return V.exams();
  const d = daysLeft(sid), lvl = subjLevel(sid);
  return `<div class="stack" style="gap:22px">
    <header class="subhead"><div class="eyebrow">${esc(s.code || "")}${s.course ? " · " + esc(s.course) : ""}</div><h1>${esc(s.name)}</h1>
      <div class="chips"><span class="countchip" style="--pc:${PRC[lvl]}"><b>${Math.max(d, 0)}</b> day${d === 1 ? "" : "s"} left</span><span class="small muted">${fmtD(examKey(sid), { weekday: "long", day: "numeric", month: "long" })}${s.examTime ? " · " + esc(s.examTime) : ""}${s.venue ? " · " + esc(s.venue) : ""}</span><button class="btn btn-line btn-sm" data-go="editsubj:${sid}">${ico("pencil")}Edit</button></div>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-go="summary:${sid}">${ico("notes")}Summary of everything</button>${s.chapterIds.length ? `<button class="btn btn-line btn-sm" data-go="map:${sid}">${ico("map")}Mind map</button>` : ""}${s.chapterIds.length ? `<button class="btn btn-line btn-sm" data-action="ep-play" data-kind="topic" data-id="${s.chapterIds[0]}">${ico("headphones")}Listen</button>` : ""}</div></header>
    ${!s.chapterIds.length ? `<div class="card empty">No chapters yet. <button class="link" data-go="import:${sid}">Import a file for this subject</button> or <button class="link" data-go="editsubj:${sid}">add chapters by hand</button>.</div>` : ""}
    <div class="card stack">${progRow("Overall progress", progress(sid), subjColor(sid), "lg")}
      <div class="stat3">${progRow("Content completed", contentPct(sid), "var(--p-high)")}${progRow("Practice completed", practisedPct(sid), "var(--pen)")}${progRow("Revision completed", revisedPct(sid), "var(--p-done)")}</div></div>
    <section class="section"><div class="sec-head"><h2>Chapters</h2><span class="tiny muted">${leavesBySubject[sid].length} topics tracked</span></div>
      <div class="list">${s.chapterIds.map(cid => { const c = nodes[cid], p = progress(cid), l = aggLevel(cid); return `<button class="chapter" data-go="chapter:${cid}" style="--pc:${subjColor(sid)}">
        <span class="num">${c.num}</span><span class="grow"><span class="t">${esc(c.title)}</span><span class="meta">${pagesTag(c)}${diffTag(c.diff)}${prPill(l)}</span>${seg(p, "", subjColor(sid))}</span><span class="pct">${pct(p)}%</span></button>`; }).join("")}</div></section>
  </div>`;
};
V.chapter = cid => {
  const c = nodes[cid]; if (!c) return V.exams();
  const s = subjects[c.subject];
  return `<div class="stack" style="gap:20px">
    <header class="subhead"><div class="eyebrow">${esc(s.name)} · Chapter ${c.num}</div><h1>${esc(c.title)}</h1>
      <div class="chips"><span class="bigpages">Pages ${c.p1}–${c.p2}</span>${diffTag(c.diff)}${prPill(aggLevel(cid))}</div></header>
    <div class="card">${progRow("Chapter progress", progress(cid), subjColor(c.subject), "lg")}</div>
    <p class="small muted">Every heading and subheading is tracked on its own. Progress rolls up from the subheadings.</p>
    ${c.leaf ? `<div class="list">${topicItem(cid, "Open this topic")}</div>` : c.kids.map(headingBlock).join("")}
  </div>`;
};
function headingBlock(hid) {
  const h = nodes[hid];
  return `<div class="heading"><button class="hrow" data-go="topic:${hid}"><span><span class="hnum">${h.num}</span><br><span class="ht">${esc(h.title)}</span><span class="meta">${pagesTag(h)}${h.leaf ? statusTag(st(hid)) : diffTag(h.diff)}${prPill(prOf(hid))}</span></span><span class="mono" style="font-weight:700">${pct(progress(hid))}%</span>${seg(progress(hid), "", subjColor(h.subject))}</button>
    ${h.kids.length ? `<div class="subs">${h.kids.map(k => { const n = nodes[k]; return `<button class="sub" data-go="topic:${k}"><span class="tree"></span><span class="grow"><span class="st"><small>${n.num}</small>${esc(n.title)}</span><span class="meta">${pagesTag(n)}${n.leaf ? statusTag(st(k)) : `<span class="tiny muted">${n.kids.length} parts · ${pct(progress(k))}%</span>`}</span></span>${prPill(prOf(k))}</button>`; }).join("")}</div>` : ""}</div>`;
}

V.topic = id => {
  const n = nodes[id]; if (!n) return V.exams();
  if (!n.leaf) return n.depth === 0 ? V.chapter(id) : headingView(id);
  const s = subjects[n.subject], cur = st(id), sp = scoreParts(id, todayKey()), a = acc(id), h = S.attempts[id], m = S.mistakes[id]?.n || 0;
  const qs = QS.filter(q => q.node === id);
  const ts = S.tasks.filter(t => t.node === id && t.type !== "mock" && t.date >= todayKey()).sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start).slice(0, 4);
  const canMaster = cur === 4 && a !== null && a >= .8 && h.a >= 3;
  let next = "";
  if (cur < 4) next = `<button class="btn btn-pen" data-action="step" data-id="${id}">${ico("check")}Mark as ${STATUS[cur + 1].toLowerCase()}</button>`;
  else if (cur === 4) next = `<button class="btn btn-pen" data-action="step" data-id="${id}" ${canMaster ? "" : "disabled"}>${ico("spark")}Mark as mastered</button>`;
  const lockMsg = cur === 4 && !canMaster ? `<div class="lock">${ico("lock")}<span>Mastered unlocks after revision <b>and</b> at least 80% on 3 or more practice questions. ${a === null ? "No practice answers yet." : `Right now: ${h.c}/${h.a} correct (${pct(a)}%).`}</span></div>`
    : cur < 4 ? `<div class="lock">${ico("info")}<span>Opening or reading a topic never marks it mastered. Each step needs real work: practice moves it to Practised, revision to Revised, and Mastered needs a strong practice score.</span></div>` : "";
  return `<div class="stack" style="gap:20px">
    <header class="subhead"><div class="eyebrow">${esc(s.name)} · ${n.num}</div><h1>${esc(n.title)}</h1>
      <div class="chips"><span class="bigpages">Pages ${n.p1}–${n.p2}</span>${diffTag(n.diff)}${prPill(sp.level)}<button class="btn btn-line btn-sm" data-action="node-edit" data-id="${id}">${ico("pencil")}Edit</button></div></header>
    <div class="two">
      <div class="stack">
        <section class="card stack" style="--ladder:${STATUS_COL[Math.max(cur, 1)]}"><div class="sec-head"><h2 style="font-size:18px">Where you are</h2>${statusTag(cur)}</div>
          <div class="ladder" aria-label="Stage: ${STATUS[cur]}">${STATUS.map((x, i) => `<div class="rung ${i <= cur && i > 0 ? "on" : ""} ${i === cur ? "cur" : ""}"><span class="b"></span>${x}</div>`).join("")}</div>
          <div class="row" style="flex-wrap:wrap">${next}${cur > 0 ? `<button class="btn btn-line btn-sm" data-action="stepdown" data-id="${id}">Undo a step</button>` : ""}</div>${lockMsg}</section>
        ${(() => { const sm = summaryOf(id); return `<section class="card stack" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">Summary</h2>${sm && sm.source === "auto" ? `<div class="segctl sm-mode" role="radiogroup" aria-label="How much detail"><button role="radio" aria-checked="${SUM_DETAIL}" data-action="sum-mode" data-v="detail">Every detail</button><button role="radio" aria-checked="${!SUM_DETAIL}" data-action="sum-mode" data-v="short">Short</button></div>` : `<span class="tiny muted">${sm ? (sm.source === "written" ? "Written for you" : "From the explanations") : ""}</span>`}</div>
          ${sm ? sumHTML(sm) : `<p class="small muted">${notesReady ? "No notes for this topic yet. Add notes, or import the chapter's PDF from My subjects." : "Loading notes…"}</p>`}
          <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-action="ep-play" data-kind="topic" data-id="${id}">${ico("headphones")}Listen</button><button class="btn btn-line btn-sm" data-action="notes" data-id="${id}">${ico("notes")}${notesOf(id) ? "Edit notes" : "Add notes"}</button></div></section>`; })()}
        ${typeof topicExtras === "function" ? topicExtras(id) : ""}
        <button class="btn btn-hl dunno" data-action="dunno" data-id="${id}"><span class="q">?</span>I don't understand this</button>
        <section class="section"><div class="sec-head"><h2 style="font-size:18px">Planned sessions</h2></div>
          <div class="card plan-card">${ts.length ? planList(ts, { date: true, compact: true }) : `<div class="empty">${cur >= 5 ? "Mastered. No more sessions needed." : "No upcoming sessions for this topic."}</div>`}</div></section>
      </div>
      <div class="stack">
        ${cardsSection(id)}
        <section class="card stack" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">Practice</h2>${a !== null ? `<span class="score">${h.c}/${h.a} correct</span>` : ""}</div>
          ${a !== null ? progRow("Accuracy", a, a < .6 ? "var(--p-urgent)" : a < .8 ? "var(--p-high)" : "var(--ok)") : `<p class="small muted">No answers yet.</p>`}
          ${m ? `<p class="small"><b style="color:var(--bad)">${m} mistake${m > 1 ? "s" : ""}</b> to review.</p>` : ""}
          <button class="btn ${qs.length ? "btn-soft" : "btn-line"}" data-action="practise" data-id="${id}">${ico("pencil")}${qs.length ? `Practise · ${qs.length} question${qs.length > 1 ? "s" : ""}` : `Practise ${esc(s.name)}`}</button>
          ${qs.filter(q => q.own).length ? `<div class="ownq">${qs.filter(q => q.own).map(q => `<div class="row"><span class="grow small">${esc(q.q)}</span><button class="oa" data-action="q-del" data-id="${q.id}" aria-label="Delete question">${ico("x")}</button></div>`).join("")}</div>` : ""}
          <button class="btn btn-line btn-sm" data-action="q-add" data-id="${id}" style="align-self:flex-start">+ Add your own question</button></section>
        <section class="card stack" style="gap:8px"><div class="sec-head"><h2 style="font-size:18px">Why ${PR[sp.level].toLowerCase()} priority</h2></div>
          ${sp.level === "done" ? `<p class="small muted">Mastered topics drop out of the plan.</p>` : `<div class="why">${sp.parts.map(p => `<div><span>${p[0]}</span><b>+${p[1]}</b></div>`).join("")}<div><span>Priority score</span><b>${sp.total}</b></div></div><p class="tiny muted">9+ urgent · 7+ high · 5+ medium · below 5 low</p>`}</section>
      </div>
    </div>
  </div>`;
};
function headingView(id) {
  const n = nodes[id], s = subjects[n.subject];
  return `<div class="stack" style="gap:20px"><header class="subhead"><div class="eyebrow">${esc(s.name)} · ${n.num}</div><h1>${esc(n.title)}</h1>
    <div class="chips"><span class="bigpages">Pages ${n.p1}–${n.p2}</span>${diffTag(n.diff)}${prPill(aggLevel(id))}</div></header>
    <div class="card">${progRow("Heading progress", progress(id), subjColor(n.subject), "lg")}</div>
    <section class="section"><div class="sec-head"><h2>Subheadings</h2></div>
    <div class="list">${n.kids.map(k => { const c = nodes[k]; return `<button class="item" data-go="topic:${k}" style="--pc:${PRC[prOf(k)]}"><span class="mark"></span><span class="grow"><span class="t">${c.num} ${esc(c.title)}</span><br><span class="s"><span class="pages">pp ${c.p1}–${c.p2}</span> · ${c.leaf ? STATUS[st(k)] : pct(progress(k)) + "%"} · ${DIFF[c.diff]}</span></span>${prPill(prOf(k))}</button>`; }).join("")}</div></section></div>`;
}

/* ---------- calendar ---------- */
let calMonth = null, calSel = null;
const TYPE_COL = { learn: "var(--pen)", recall: "var(--pen)", practice: "var(--p-high)", calc: "var(--p-high)", revision: "var(--p-done)", mock: "var(--mock)" };
V.calendar = () => {
  const t = todayKey(); calSel = calSel || t;
  const base = calMonth || t.slice(0, 7) + "-01"; calMonth = base;
  const first = parseKey(base), startOff = (first.getDay() + 6) % 7, dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const examDays = {}; DSUBJ.forEach(s => (examDays[examKey(s.id)] = examDays[examKey(s.id)] || []).push(s.id));
  let cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<div class="dow">${d}</div>`).join("");
  const cellsN = Math.ceil((startOff + dim) / 7) * 7;
  for (let i = 0; i < cellsN; i++) {
    const k = addDays(base, i - startOff), inM = k.slice(0, 7) === base.slice(0, 7), ts = tasksOn(k), ex = examDays[k];
    const types = [...new Set(ts.map(x => x.type === "recall" ? "learn" : x.type === "calc" ? "practice" : x.type))];
    cells += `<button class="day ${inM ? "" : "out"} ${k === t ? "today" : ""} ${k === calSel ? "sel" : ""} ${ex ? "examday" : ""}" style="${ex ? `--pc:${subjColor(ex[0])}` : ""}" data-action="pickday" data-k="${k}" aria-label="${ex ? parseKey(k).getDate() + " " + esc(subjects[ex[0]].name.slice(0, 4)) + " exam, " : ""}${fmtD(k, { weekday: "long", day: "numeric", month: "long" })}${ex ? ", " + ex.map(x => subjects[x].name).join(" and ") + " exam" : ""}${ts.length ? ", " + ts.length + " sessions" : ""}">
      <span>${parseKey(k).getDate()}</span>${ex ? ` <span class="ex">${esc(subjects[ex[0]].name.slice(0, 4))}<span class="exw"> exam</span></span>` : `<span class="dots">${types.map(ty => `<i style="--c:${TYPE_COL[ty]}"></i>`).join("")}</span>`}</button>`;
  }
  const sel = tasksOn(calSel), exSel = examDays[calSel];
  const mins = sel.reduce((a, x) => a + x.dur, 0);
  return `<div class="stack" style="gap:18px">
    <header class="subhead"><div class="eyebrow">Study schedule</div><h1>Calendar</h1></header>
    <div class="card stack">
      <div class="calhead"><button class="icon-btn" data-action="month" data-d="-1" aria-label="Previous month">${ico("left")}</button><h2>${first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2><button class="icon-btn" data-action="month" data-d="1" aria-label="Next month">${ico("chev")}</button></div>
      <div class="cal" id="calGrid">${cells}</div>
      <div class="legend"><span><i style="--c:var(--pen)"></i>Study</span><span><i style="--c:var(--p-high)"></i>Practice</span><span><i style="--c:var(--p-done)"></i>Revision</span><span><i style="--c:var(--mock)"></i>Mock test</span><span><i style="--c:var(--p-urgent)"></i>Exam</span></div>
    </div>
    <section class="section"><div class="sec-head"><h2>${fmtD(calSel, { weekday: "long", day: "numeric", month: "long" })}</h2>${sel.length ? `<span class="tiny muted mono">${sel.length} sessions · ${Math.floor(mins / 60)}h ${mins % 60}m</span>` : ""}</div>
      ${exSel ? exSel.map(x => `<div class="banner" style="background:var(--p-urgent-bg)">${ico("exams")}<div><b>${esc(subjects[x].name)} exam</b>${subjects[x].examTime ? " at " + esc(subjects[x].examTime) : ""}${subjects[x].venue ? ", " + esc(subjects[x].venue) : ""}.</div></div>`).join("") : ""}
      <div class="card plan-card">${sel.length ? planList(sel, { noMove: calSel < t }) : `<div class="empty">${exSel ? "Exam day. No study sessions planned." : isStudyDay(calSel) ? "No sessions planned." : "Rest day."}</div>`}</div></section>
    <button class="btn btn-line" data-action="replan">${ico("loop")}Rebuild my plan from today</button>
    <p class="tiny muted" style="margin-top:-8px">Re-ranks every remaining topic using your latest progress and practice scores.</p>
  </div>`;
};

/* ---------- practice ---------- */
let Q = { subj: "all", lvl: "all", topic: null, mode: "all", idx: 0, picked: null, right: 0, done: 0 };
function qPool() {
  if (Q.mode === "mistakes") { const ids = new Set(Object.values(S.mistakes).flatMap(m => m.qs)); return QS.filter(q => ids.has(q.id)); }
  return QS.filter(q => (Q.topic ? q.node === Q.topic : true) && (Q.subj === "all" || q.subject === Q.subj) && (Q.lvl === "all" || q.level === Q.lvl));
}
V.practice = () => {
  const pool = qPool(), q = pool.length ? pool[Q.idx % pool.length] : null;
  const mist = Object.entries(S.mistakes).filter(([, m]) => m.n > 0).sort((a, b) => b[1].n - a[1].n);
  const chip = (k, v, lab) => `<button class="chip" aria-pressed="${Q[k] === v}" data-action="qf" data-k="${k}" data-v="${v}">${lab}</button>`;
  let qh = `<div class="card empty">${!QS.length ? `No practice questions yet. They are made from your notes once you <button class="link" data-go="import">import a file</button>.` : Q.mode === "mistakes" ? "No questions left to review. Nice." : "No questions match these filters."}</div>`;
  if (q) {
    const n = nodes[q.node], ans = Q.picked;
    qh = `<div class="qcard" id="qcard">
      <div class="qmeta"><span style="color:${subjColor(q.subject)};font-weight:700">${esc(subjects[q.subject].name)}</span><span>·</span><button data-go="topic:${q.node}" style="text-decoration:underline;text-underline-offset:3px">${esc(n.title)}</button><span class="pill pr-${q.level === "exam" ? "urgent" : q.level === "hard" ? "high" : q.level === "medium" ? "medium" : "low"}">${LEVELS[q.level]}</span><span class="grow"></span><span class="score" id="qscore">${(Q.idx % pool.length) + 1} / ${pool.length}</span></div>
      <p class="qtext">${esc(q.q)}</p>
      <div class="opts">${q.o.map((o, i) => { let c = "", r = ""; if (ans !== null) { if (i === q.a) { c = "right"; r = `<span class="res" style="color:var(--ok)">Correct answer</span>`; } else if (i === ans) { c = "wrong"; r = `<span class="res" style="color:var(--bad)">Your answer</span>`; } else c = "fade"; } return `<button class="opt ${c}" data-action="answer" data-i="${i}" ${ans !== null ? "disabled" : ""}><span class="l">${"ABCDEFG"[i]}</span><span>${esc(o)}</span>${r}</button>`; }).join("")}</div>
      ${ans !== null ? `<div class="verdict ${ans === q.a ? "ok" : "no"}"><h3>${ico(ans === q.a ? "check" : "x")}${ans === q.a ? "Correct" : "Incorrect"}</h3><p>${esc(q.e || "")}</p></div>
        <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="nextq">Next question</button><button class="btn btn-line" data-go="topic:${q.node}">Open topic</button></div>` : ""}
    </div>`;
  }
  const added = typeof ensureCards === "function" ? ensureCards() : 0, due = typeof dueCards === "function" ? dueCards() : [], allCards = (S.cards || []).length;
  const blurtable = leafIds.filter(id => st(id) === 1 && summaryOf(id)).slice(0, 3);
  const reviewHero = `<section class="rv-hero">
      <div class="rv-stack" aria-hidden="true"><i></i><i></i><i>${due.length}</i></div>
      <div class="grow stack" style="gap:6px"><div class="eyebrow">Flashcards</div><h2>${due.length ? `${due.length} card${due.length > 1 ? "s" : ""} to review` : allCards ? "All caught up" : "No cards yet"}</h2>
        <p class="small">${due.length ? `About ${Math.max(1, Math.round(due.length * 0.15))} min. Cards come back just before you'd forget them.` : allCards ? "Nothing due right now. Cards return on the day you're about to forget them." : "Cards are made from your notes once you start a topic. You can also write your own on any topic."}</p>
        ${due.length ? `<button class="btn btn-hl" data-action="fc-start" style="align-self:flex-start">${ico("cards")}Start review</button>` : ""}</div></section>
    ${blurtable.length ? `<section class="section"><div class="sec-head"><h2>Blurt check</h2><span class="tiny muted">Explain it without notes</span></div><div class="list">${blurtable.map(id => `<button class="item" data-action="blurt" data-id="${id}" style="--pc:${subjColor(nodes[id].subject)}"><span class="mark"></span><span class="grow"><span class="t">${esc(nodes[id].title)}</span><br><span class="s">${esc(subjects[nodes[id].subject].name)} · write what you remember, see what you missed</span></span>${ico("chev", 'class="chev"')}</button>`).join("")}</div></section>` : ""}
    <h2 class="sec-title">Practice questions</h2>`;
  return `<div class="stack" style="gap:18px">
    <header class="subhead"><div class="eyebrow">Test yourself</div><h1>Review</h1>${Q.done && DSUBJ.length ? `<p class="small muted">This session: <b class="mono" style="color:var(--ink)">${Q.right}/${Q.done}</b> correct. Every answer updates the topic's accuracy and weak areas.</p>` : `<p class="small muted">Answers feed straight into topic progress, weak areas and your mistakes list.</p>`}</header>
    ${reviewHero}
    ${Q.topic ? `<div class="banner">${ico("pencil")}<div>Showing questions for <b>${esc(nodes[Q.topic].title)}</b>. <button data-action="qf" data-k="topic" data-v="">Show all topics</button></div></div>` : ""}
    <div class="filters" role="group" aria-label="Question set">${chip("mode", "all", "All questions")}${chip("mode", "mistakes", "Mistakes to review")}</div>
    ${Q.mode === "all" && !Q.topic ? `<details class="qfilt" ${Q.subj !== "all" || Q.lvl !== "all" ? "open" : ""}><summary><span class="qf-ic">${ico("contents")}</span><span class="grow"><b>Filter</b><span class="tiny muted">${Q.subj === "all" ? "All subjects" : esc(subjects[Q.subj]?.name || "")} · ${Q.lvl === "all" ? "any level" : esc(LEVELS[Q.lvl] || "").toLowerCase()}</span></span>${ico("chev", 'class="chev"')}</summary>
      <div class="qf-body"><span class="tiny muted">Subject</span><div class="filters" role="group" aria-label="Subject">${chip("subj", "all", "All subjects")}${DSUBJ.map(s => chip("subj", s.id, esc(s.name))).join("")}</div>
      <span class="tiny muted">Level</span><div class="filters" role="group" aria-label="Difficulty">${chip("lvl", "all", "Any level")}${Object.entries(LEVELS).map(([k, v]) => chip("lvl", k, v)).join("")}</div></div></details>` : ""}
    ${qh}
    ${Q.mode === "mistakes" ? "" : `<section class="section"><div class="sec-head"><h2>Mistakes to review</h2></div>
      <div class="list">${mist.length ? mist.map(([id, m]) => topicItem(id, `${esc(subjects[nodes[id].subject].name)} · ${m.n} incorrect answer${m.n > 1 ? "s" : ""}`)).join("") : `<div class="empty">No mistakes to review. Wrong answers will show up here.</div>`}</div>
      <p class="tiny muted">Topics with repeated mistakes get a higher priority in your plan.</p></section>`}
  </div>`;
};

/* ---------- progress ---------- */
V.progress = () => {
  const counts = [0, 0, 0, 0, 0, 0]; leafIds.forEach(id => counts[st(id)]++);
  return `<div class="stack" style="gap:22px">
    <header class="subhead"><div class="eyebrow">${leafIds.length} topics tracked</div><h1>Progress</h1></header>
    ${weekView()}
    ${typeof progressCharts === "function" ? progressCharts() : ""}
    <h2 style="font-size:20px;margin-top:8px">All topics</h2>
    <div class="card stack">${progRow("Overall", progress(), "var(--pen)", "lg")}
      <div class="dist" role="img" aria-label="Topics by stage">${counts.map((c, i) => c ? `<i style="flex:${c};--c:${i === 0 ? "var(--sunken)" : STATUS_COL[i]}"></i>` : "").join("")}</div>
      <div class="legend">${STATUS.map((x, i) => `<span><i style="--c:${i === 0 ? "var(--line)" : STATUS_COL[i]}"></i>${x} <b class="mono">${counts[i]}</b></span>`).join("")}</div>
      <p class="tiny muted">Progress comes from each subheading's stage, weighted by its number of pages, then rolls up to heading, chapter, subject and overall.</p></div>
    <section class="section"><div class="sec-head"><h2>By subject and chapter</h2></div>
      <div class="tree-prog">${DSUBJ.length ? "" : `<p class="small muted card">No subjects yet. <button class="link" data-go="import">Import a file</button> to see progress for each chapter.</p>`}${DSUBJ.map((s, si) => `<details class="subj card" ${si === 0 ? "open" : ""}><summary class="stack" style="gap:8px"><div class="row">${ico("chev", 'class="caret"')}<span class="grow" style="font-family:var(--f-display);font-weight:650;font-size:18px">${esc(s.name)}</span><b class="mono">${pct(progress(s.id))}%</b></div>${seg(progress(s.id), "lg", subjColor(s.id))}</summary>
        <div class="lvl1" style="margin-top:14px">${s.chapterIds.map(cid => { const c = nodes[cid]; return `<div class="stack" style="gap:10px"><button data-go="chapter:${cid}" style="text-align:left">${progRow(`Chapter ${c.num}: ${esc(c.title)}`, progress(cid), subjColor(s.id))}</button>
          ${leavesBySubject[s.id].length > 150 ? "" : `<div class="lvl2">${c.kids.map(h => `<button data-go="topic:${h}" style="text-align:left">${progRow(`<span class="small">${nodes[h].num} ${esc(nodes[h].title)}</span>`, progress(h), "var(--ink-2)")}</button>`).join("")}</div>`}</div>`; }).join("")}</div></details>`).join("")}</div></section>
    <div class="dash">
      <section class="section"><div class="sec-head"><h2>My weak areas</h2></div><div class="list">${weakList().map(w => `<button class="item" data-go="topic:${w.id}" style="--pc:${PRC[w.sev]}"><span class="mark"></span><span class="grow"><span class="t">${esc(nodes[w.id].title)}</span><br><span class="s">${esc(subjects[nodes[w.id].subject].name)} · ${w.why}</span></span>${ico("chev", 'class="chev"')}</button>`).join("") || `<div class="empty">No weak areas right now.</div>`}</div></section>
      <section class="section"><div class="sec-head"><h2>Recently completed</h2></div><div class="list">${S.recent.length ? S.recent.slice(0, 5).map(r => `<button class="item" data-go="topic:${r.id}" style="--pc:var(--ok)"><span class="mark"></span><span class="grow"><span class="t">${esc(nodes[r.id].title)}</span><br><span class="s">${esc(r.text)} · ${r.when === todayKey() ? "Today" : fmtD(r.when, { weekday: "long" })}</span></span>${ico("chev", 'class="chev"')}</button>`).join("") : `<div class="empty">Finished sessions will show up here.</div>`}</div></section>
      <section class="section"><div class="sec-head"><h2>The revision ladder</h2></div><div class="card stack" style="gap:10px">
        ${[["Not started", "Nothing done yet."], ["Learning", "You have started reading it or done a Learn session."], ["Understood", "You can explain it without notes (after active recall)."], ["Practised", "You have answered questions on it."], ["Revised", "You came back to it after a gap."], ["Mastered", "Revised and 80%+ on practice questions. Opening a topic never does this."]].map((x, i) => `<div class="row" style="align-items:flex-start"><span style="width:12px;height:12px;border-radius:4px;margin-top:5px;flex:none;background:${i === 0 ? "var(--line)" : STATUS_COL[i]}"></span><span class="small"><b>${x[0]}.</b> ${x[1]}</span></div>`).join("")}</div></section>
    </div>
  </div>`;
};

/* ---------- settings ---------- */
let importMsg = null;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const platform = () => { const u = navigator.userAgent; if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return "ios"; if (/Android/.test(u)) return "android"; if (/Macintosh/.test(u) && /Safari/.test(u) && !/Chrome|Edg/.test(u)) return "macsafari"; return "desktop"; };
V.settings = () => {
  const s = S.settings, dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], order7 = [1, 2, 3, 4, 5, 6, 0];
  const seg3 = (k, opts) => `<div class="segctl" role="radiogroup">${opts.map(([v, l]) => `<button role="radio" aria-checked="${s[k] === v}" data-action="setopt" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
  const used = (() => { try { return ((ls.get(KEY) || "").length / 1024).toFixed(1) + " KB"; } catch (e) { return "unknown"; } })();
  const plat = platform();
  const steps = {
    ios: ["Open this page in <b>Safari</b>.", "Tap the <b>Share</b> button (square with an arrow).", "Scroll down and tap <b>Add to Home Screen</b>.", "Tap <b>Add</b>. Study Desk now opens like an app."],
    android: ["Open this page in <b>Chrome</b>.", "Tap <b>Install app</b> below, or the ⋮ menu → <b>Install app</b>.", "Confirm. Study Desk appears in your app drawer."],
    macsafari: ["In Safari, open the <b>File</b> menu.", "Choose <b>Add to Dock</b>.", "Click <b>Add</b>. Study Desk opens in its own window."],
    desktop: ["Open this page in <b>Chrome</b> or <b>Edge</b>.", "Click <b>Install app</b> below, or the install icon at the right of the address bar.", "Study Desk opens in its own window and gets a Start menu / Dock icon."]
  }[plat];
  return `<div class="stack" style="gap:22px">
    <header class="subhead"><div class="eyebrow">Study Desk ${APP_VERSION}</div><h1>Settings</h1></header>
    <section class="card stack"><h2 class="h3">My subjects</h2><p class="small muted">${DSUBJ.length} subject${DSUBJ.length === 1 ? "" : "s"}, ${leafIds.length} topics. Add subjects, chapters and page numbers, or import them from a PDF, PowerPoint or Word file.</p><div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-go="edit">${ico("pencil")}Edit my subjects</button><button class="btn btn-line" data-go="import">${ico("upload")}Import a file</button></div></section>
    <section class="card stack"><h2 class="h3">Study days</h2>
      <div class="daypick">${order7.map(d => `<button class="chip" aria-pressed="${s.days.includes(d)}" data-action="day" data-d="${d}">${dn[d]}</button>`).join("")}</div>
      <h2 class="h3">Study times</h2>
      <div class="times">${s.blocks.map((b, i) => `<div class="timerow"><span class="small tr-l">${i === 0 ? "Morning" : i === 1 ? "Afternoon" : "Block " + (i + 1)}</span><label class="sr" for="bs${i}">Start</label><input type="time" id="bs${i}" value="${fmtT(b[0])}" data-block="${i}" data-edge="0"><span class="muted">to</span><label class="sr" for="be${i}">End</label><input type="time" id="be${i}" value="${fmtT(b[1])}" data-block="${i}" data-edge="1"></div>`).join("")}</div>
      <div class="row"><span class="small grow">Most sessions per day</span><div class="stepper"><button class="icon-btn sm" data-action="perday" data-d="-1" aria-label="Fewer">−</button><b class="mono" id="perday">${s.maxPerDay}</b><button class="icon-btn sm" data-action="perday" data-d="1" aria-label="More">+</button></div></div>
      <p class="tiny muted">Changes rebuild your plan from today. Finished sessions are kept.</p></section>
    <section class="card stack"><h2 class="h3">Appearance</h2>
      <div class="row" style="flex-wrap:wrap"><span class="small grow">Theme</span>${seg3("theme", [["system", "Auto"], ["light", "Light"], ["dark", "Dark"]])}</div>
      <div class="row" style="flex-wrap:wrap"><span class="small grow">Text size</span>${seg3("text", [["normal", "Standard"], ["large", "Larger"]])}</div>
      <div class="row" style="flex-wrap:wrap"><span class="small grow">Animations</span>${seg3("motion", [["full", "Full"], ["reduced", "Calm"]])}</div></section>
    <section class="card stack" id="install"><h2 class="h3">Install on phone or laptop</h2>
      ${isStandalone() ? `<div class="lock" style="background:color-mix(in oklab,var(--ok) 12%,var(--surface))">${ico("check")}<span>Study Desk is installed and works offline.</span></div>` : `
      ${deferredInstall ? `<button class="btn btn-pen" data-action="install">${ico("download")}Install app</button>` : ""}
      <ol class="steps">${steps.map(x => `<li>${x}</li>`).join("")}</ol>
      <p class="tiny muted">${ico("phone", 'style="width:14px;height:14px;vertical-align:-2px"')} Phone and ${ico("laptop", 'style="width:14px;height:14px;vertical-align:-2px"')} laptop each keep their own progress. Use Sync below to copy it between them.</p>`}</section>
    ${typeof settingsExtras === "function" ? settingsExtras() : ""}
    <section class="card stack"><h2 class="h3">Backup and restore</h2>
      <p class="small muted">Your progress is saved on this device automatically, with a safety copy from your last visit. Make a backup before clearing your browser or switching devices.</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-action="export">${ico("download")}Save backup file</button><button class="btn btn-line" data-action="copybak">${ico("copy")}Copy backup</button></div>
      <div class="row" style="flex-wrap:wrap"><label class="btn btn-line" for="importFile">${ico("upload")}Restore from file</label><input type="file" id="importFile" accept="application/json,.json" class="sr"></div>
      <label class="small" for="importText">Or paste a backup</label><textarea id="importText" rows="3" placeholder='{"app":"study-desk", …}'></textarea>
      <div class="row"><button class="btn btn-line btn-sm" data-action="importpaste">Restore pasted backup</button></div>
      ${importMsg ? `<div class="lock" role="status">${ico(importMsg.ok ? "check" : "info")}<span>${esc(importMsg.text)}</span></div>` : ""}</section>
    <section class="card stack"><h2 class="h3">Data check</h2>
      ${dataIssues.length ? `<div class="lock">${ico("info")}<span>${dataIssues.length} thing${dataIssues.length > 1 ? "s" : ""} to fix in the study data:</span></div><ul class="issues">${dataIssues.slice(0, 30).map(i => `<li><b>${esc(i.where)}</b>: ${esc(i.msg)}</li>`).join("")}</ul>` : `<div class="lock" style="background:color-mix(in oklab,var(--ok) 12%,var(--surface))">${ico("shield")}<span>All study data checks out: ${DSUBJ.length} subject${DSUBJ.length === 1 ? "" : "s"}, ${Object.keys(nodes).length} chapters, headings and topics, ${QS.length} question${QS.length === 1 ? "" : "s"}.</span></div>`}
      ${repairs ? `<p class="tiny muted">${repairs} saved item${repairs > 1 ? "s were" : " was"} out of shape and repaired on start-up.</p>` : ""}
      <p class="tiny muted mono">Saved data ${used} · format v${SCHEMA_NOW} · ${navigator.serviceWorker && navigator.serviceWorker.controller ? "offline ready" : "online only"}</p></section>
    <section class="card stack"><h2 class="h3">Start again</h2>
      <p class="small muted">Erase every subject, note, recording, sketch and all progress on this device. Save a backup first if you might want any of it back.</p>
      <button class="btn btn-line btn-auto danger" data-action="reset">Erase everything on this device</button></section>
  </div>`;
};

/* =====================================================================
   8b. MY SUBJECTS — add and edit subjects, chapters, headings, pages and questions in the app
   ===================================================================== */
let editHue = null, qpPreview = null, qpText = "";

/* Quick paste: turns a typed or copied contents list into chapters, headings and subheadings.
   Understands  "3.2 Variables 83-89 hard",  "Chapter 3: Research methods (pp. 75–102)",
   "Variables ........ 83"  and indentation or bullets when there are no numbers. */
function parseOutline(text) {
  const warnings = [], roots = [], stack = []; let count = 0;
  const indentStack = [];
  text.split(/\r?\n/).forEach((line, li) => {
    if (!line.trim()) return;
    const ws = (line.match(/^[\t ]*/)[0] || "").replace(/\t/g, "    ").length;
    let t = line.trim().replace(/^[-*•·▪◦‣]+\s*/, "");
    let isChapter = /^(chapter|ch\.?|unit|part|module)\s+/i.test(t);
    t = t.replace(/^(chapter|ch\.?|unit|part|module|section)\s+/i, "");
    const nm = /^(\d+(?:\.\d+)*)\.?(?=[\s:)\-–—.]|$)/.exec(t);
    let num = null; if (nm) { num = nm[1]; t = t.slice(nm[0].length); }
    t = t.replace(/^[\s:)\-–—.]+/, "");
    let diff = 2; const dm = /[\s,(\-–]*\b(easy|medium|med|hard|difficult|tough)\)?\s*$/i.exec(t);
    if (dm) { diff = /easy/i.test(dm[1]) ? 1 : /med/i.test(dm[1]) ? 2 : 3; t = t.slice(0, dm.index); }
    let p1 = null, p2 = null;
    const pr = /[\s,(]*(?:pages?|pp?\.?)?\s*(\d{1,5})\s*(?:-|–|—|to)\s*(\d{1,5})\s*\)?\s*$/i.exec(t);
    if (pr) { p1 = +pr[1]; p2 = +pr[2]; t = t.slice(0, pr.index); }
    else { const ps = /(?:[\s.·…_]{2,}|[\s,(]*(?:pages?|pp?\.?)\s*|\s+)(\d{1,5})\s*\)?\s*$/i.exec(t); if (ps) { p1 = +ps[1]; t = t.slice(0, ps.index); } }
    const title = t.replace(/[\s.·…_:,\-–—]+$/, "").trim();
    if (!title) { warnings.push(`Line ${li + 1} has no title, so it was skipped.`); return; }
    if (p1 !== null && p2 !== null && p2 < p1) { warnings.push(`“${title}”: the last page is before the first, so they were swapped.`); [p1, p2] = [p2, p1]; }
    let depth;
    if (num) depth = isChapter ? 0 : num.split(".").length - 1;
    else if (isChapter) depth = 0;
    else if (!indentStack.length) depth = 0;
    else { const prev = indentStack[indentStack.length - 1]; if (ws > prev.ws) depth = prev.depth + 1; else { const m = [...indentStack].reverse().find(h => h.ws <= ws); depth = m ? m.depth : 0; } }
    depth = Math.min(depth, 3);
    if (depth > stack.length) { warnings.push(`“${title}” skips a level, so it was placed one level up.`); depth = stack.length; }
    stack.length = depth;
    const n = { id: newId("n"), title: title.slice(0, 160), p1, p2, diff, calc: false, kids: [] };
    (depth === 0 ? roots : stack[depth - 1].kids).push(n); stack.push(n); count++; indentStack.push({ ws, depth });
  });
  /* fill in missing pages: a leaf ends where the next one starts; a heading spans its parts */
  const fillLeaves = (list, parentEnd) => list.forEach((n, i) => {
    if (n.kids.length) fillLeaves(n.kids, n.p2 ?? (list[i + 1]?.p1 != null ? list[i + 1].p1 - 1 : parentEnd));
    else if (n.p1 != null && n.p2 == null) { const nx = list[i + 1]?.p1; n.p2 = nx != null && nx - 1 >= n.p1 ? nx - 1 : (parentEnd != null && parentEnd >= n.p1 ? parentEnd : n.p1); }
  });
  const span = n => { n.kids.forEach(span); if (n.kids.length) { const a = n.kids.map(k => k.p1).filter(x => x != null), b = n.kids.map(k => k.p2).filter(x => x != null); if (n.p1 == null && a.length) n.p1 = Math.min(...a); if (n.p2 == null && b.length) n.p2 = Math.max(...b); } };
  const finish = (n, parent) => { if (n.p1 == null) { n.p1 = parent?.p1 ?? 0; warnings.push(`“${n.title}” has no page numbers, so it uses ${parent ? "the pages of the line above it" : "page 0"}. Add pages to fix this.`); } if (n.p2 == null || n.p2 < n.p1) n.p2 = n.p1; n.kids.forEach(k => finish(k, n)); };
  fillLeaves(roots, null); roots.forEach(span); roots.forEach(n => finish(n, null));
  return { roots, warnings, count };
}

function outlineRows(list, sid, depth = 0, prefix = "") {
  return list.map((n, i) => {
    const num = prefix ? prefix + "." + (i + 1) : String(i + 1);
    const leaf = !n.kids.length;
    return `<div class="orow" style="--d:${depth}">
      <button class="otitle" data-action="node-edit" data-id="${n.id}"><span class="onum">${num}</span><span class="grow"><span class="ot">${esc(n.title)}</span><span class="om"><span class="pages">pp ${n.p1}–${n.p2}</span>${DIFF[n.diff]}${leaf ? " · " + STATUS[st(n.id)] : ` · ${n.kids.length} part${n.kids.length > 1 ? "s" : ""}`}</span></span></button>
      <span class="oacts">
        <button class="oa" data-action="node-move" data-id="${n.id}" data-d="-1" aria-label="Move ${esc(n.title)} up" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="oa" data-action="node-move" data-id="${n.id}" data-d="1" aria-label="Move ${esc(n.title)} down" ${i === list.length - 1 ? "disabled" : ""}>↓</button>
        ${depth < 3 ? `<button class="oa" data-action="node-add" data-sid="${sid}" data-parent="${n.id}" aria-label="Add a part inside ${esc(n.title)}">+</button>` : ""}
      </span></div>${n.kids.length ? outlineRows(n.kids, sid, depth + 1, num) : ""}`;
  }).join("");
}
function previewRows(list, depth = 0, prefix = "", start = 0) {
  return list.map((n, i) => { const num = prefix ? prefix + "." + (i + 1) : String(start + i + 1); return `<div class="prow" style="--d:${depth}"><span class="onum">${num}</span><span class="grow"><span class="pt">${esc(n.title)}</span><span class="pm"><span class="pages">pp ${n.p1}–${n.p2}</span><span class="tiny muted">${DIFF[n.diff]}</span></span></span></div>` + previewRows(n.kids, depth + 1, num, 0); }).join("");
}

V.edit = () => {
  return `<div class="stack" style="gap:20px">
    <header class="subhead"><div class="eyebrow">Your study content</div><h1>My subjects</h1><p class="muted">Add your subjects, exam dates, chapters and page numbers. The plan updates as you go.</p></header>
    ${contentNotice && !contentNotice.auto ? `<div class="banner">${ico("download")}<div>New study content has been prepared for you. Loading it replaces the subjects below but keeps progress on topics that still exist. <button data-action="content-load">Load new content</button></div></div>` : ""}
    <div class="list">${DSUBJ.length ? DSUBJ.map(s => `<button class="item" data-go="editsubj:${s.id}" style="--pc:${subjColor(s.id)}"><span class="mark"></span><span class="grow"><span class="t">${esc(s.name)}</span><br><span class="s">Exam ${fmtD(s.exam, { day: "numeric", month: "short", year: "numeric" })} · ${s.chapterIds.length} chapter${s.chapterIds.length === 1 ? "" : "s"} · ${leavesBySubject[s.id].length} topics</span></span>${ico("chev", 'class="chev"')}</button>`).join("") : `<div class="empty">No subjects yet. The quickest start is to import a textbook chapter, lecture slides or notes.</div>`}</div>
    <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-go="import">${ico("upload")}Import from a file</button><button class="btn btn-line" data-go="editsubj:new">${ico("plus")}Add a subject by hand</button></div>
    ${DSUBJ.length ? `<button class="btn btn-line btn-sm" data-action="content-clear" style="align-self:flex-start">Remove all subjects</button>` : ""}
  </div>`;
};
V.editsubj = sid => {
  const isNew = sid === "new", s = isNew ? null : subjects[sid];
  if (!isNew && !s) return V.edit();
  const hue = editHue ?? (s ? s.hue : HUES[DSUBJ.length % HUES.length]);
  const raw = s ? s.raw : null;
  return `<div class="stack" style="gap:20px">
    <header class="subhead"><div class="eyebrow">${isNew ? "New subject" : "Edit subject"}</div><h1>${isNew ? "Add a subject" : esc(s.name)}</h1></header>
    <section class="card stack form">
      <label class="fld"><span>Subject name</span><input id="sf-name" value="${esc(raw?.name || "")}" placeholder="e.g. Psychology" maxlength="80" autocomplete="off"></label>
      <div class="frow"><label class="fld"><span>Code (optional)</span><input id="sf-code" value="${esc(raw?.code || "")}" placeholder="PSY 210" maxlength="30"></label>
        <label class="fld"><span>Exam date</span><input id="sf-exam" type="date" value="${raw?.exam || addDays(todayKey(), 30)}"></label></div>
      <div class="frow"><label class="fld"><span>Exam time (optional)</span><input id="sf-time" type="time" value="${raw?.examTime || ""}"></label>
        <label class="fld"><span>Venue (optional)</span><input id="sf-venue" value="${esc(raw?.venue || "")}" placeholder="Exam Hall B" maxlength="80"></label></div>
      <label class="fld"><span>Course name (optional)</span><input id="sf-course" value="${esc(raw?.course || "")}" placeholder="Research Methods in Psychology" maxlength="120"></label>
      <div class="fld"><span>Colour</span><div class="hues" role="radiogroup" aria-label="Colour">${HUES.map(h => `<button role="radio" aria-checked="${h === hue}" aria-label="Colour ${h}" data-action="hue" data-h="${h}" style="--h:oklch(58% 0.15 ${h})"></button>`).join("")}</div></div>
      <p class="ferr" id="sf-err" role="alert"></p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="subj-save" data-id="${sid}">${isNew ? "Add subject" : "Save changes"}</button>${!isNew ? `<button class="btn btn-line btn-sm" data-action="subj-del" data-id="${sid}">Delete subject</button>` : ""}</div>
    </section>
    ${isNew ? `<p class="small muted">After you add the subject you can add its chapters, headings and page numbers.</p>` : `
    <section class="section"><div class="sec-head"><h2>Chapters and topics</h2><span class="tiny muted">${leavesBySubject[sid].length} topics</span></div>
      <div class="card outline">${raw.chapters.length ? outlineRows(raw.chapters, sid) : `<div class="empty">No chapters yet. Add one, or paste the contents list below.</div>`}</div>
      <button class="btn btn-soft" data-action="node-add" data-sid="${sid}" data-parent="">+ Add a chapter</button>
      <p class="tiny muted">${TAP} a line to edit it. Use + to add a heading or subheading inside it.</p></section>
    <section class="card imp-cta"><span class="imp-ic">${ico("file")}</span><div class="grow"><h2 class="h3">Import chapters and notes</h2><p class="small muted">From a PDF, PowerPoint or Word file, or a list you type.</p></div><button class="btn btn-soft" data-go="import:${sid}">Import</button></section>
`}
  </div>`;
};

/* ---------- import: subject → file → check → done ---------- */
let IMP = { sid: null, done: null, mode: "append", typed: false };
const IMP_ACCEPT = ".pdf,.pptx,.docx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
function impCounts(roots) { let ch = roots.length, leaves = 0; const w = l => l.forEach(n => n.kids.length ? w(n.kids) : leaves++); w(roots); return { ch, leaves }; }
V.import = () => {
  const s = IMP.sid ? subjects[IMP.sid] : null; if (IMP.sid && !s) IMP.sid = null;
  const step = IMP.done ? 4 : !s ? 1 : !qpPreview || !qpPreview.count ? 2 : 3;
  const names = ["Subject", "File", "Check"];
  const stepper = `<ol class="wiz" aria-label="Import steps">${names.map((n, i) => { const k = i + 1, state = step > k ? "done" : step === k ? "now" : ""; return `<li class="${state}" ${state === "now" ? 'aria-current="step"' : ""}><span class="wiz-n">${state === "done" ? ico("check") : k}</span><span>${n}</span></li>`; }).join("")}</ol>`;
  const head = `<header class="subhead"><div class="eyebrow">${step > 3 ? "Done" : `Step ${step} of 3`}</div><h1>Add your study material</h1><p class="muted">Turn a textbook chapter, lecture slides or your notes into chapters, topics and notes. Files are read on this device and never uploaded.</p></header>`;
  let body = "";
  if (step === 1) {
    body = `<section class="card stack form"><h2 class="h3">Which subject is this for?</h2>
      ${DSUBJ.length ? `<div class="pick" role="radiogroup" aria-label="Subject">${DSUBJ.map(x => `<button class="pick-row" role="radio" aria-checked="false" data-action="imp-subj" data-id="${x.id}" style="--pc:${subjColor(x.id)}"><span class="mark"></span><span class="grow"><b>${esc(x.name)}</b><span class="tiny muted">${leavesBySubject[x.id].length ? `${leavesBySubject[x.id].length} topics so far` : "No chapters yet"} · exam ${fmtD(x.exam, { day: "numeric", month: "short" })}</span></span>${ico("chev", 'class="chev"')}</button>`).join("")}</div>
      <div class="or"><span>or a new subject</span></div>` : `<p class="small muted">Start with the subject's name and exam date. You can add the code, time and venue later.</p>`}
      <div class="frow"><label class="fld"><span>Subject name</span><input id="imp-name" placeholder="e.g. Psychology" maxlength="80" autocomplete="off"></label>
        <label class="fld"><span>Exam date</span><input id="imp-exam" type="date" value="${addDays(todayKey(), 30)}"></label></div>
      <p class="ferr" id="imp-err" role="alert"></p>
      <button class="btn ${DSUBJ.length ? "btn-line" : "btn-pen"} btn-auto" data-action="imp-new">${ico("plus")}Create it and continue</button></section>`;
  } else if (step === 2) {
    const busy = importBusy?.reading;
    body = `<div class="for-chip"><span class="mark" style="--pc:${subjColor(s.id)}"></span><span>For <b>${esc(s.name)}</b></span><button class="linkish" data-action="imp-change">Change</button></div>
      <section class="card drop-big ${busy ? "busy" : ""}" id="dropzone" data-sid="${s.id}">
        ${busy ? impProgHTML()
        : `<span class="drop-ic">${ico("upload")}</span><h2 class="h3">Choose a file</h2><p class="small muted">A textbook chapter, lecture slides or your own notes.<br><span style="white-space:nowrap">PDF, PowerPoint (.pptx)</span> or <span style="white-space:nowrap">Word (.docx).</span></p>
          <label class="btn btn-pen" for="imp-file">${ico("file")}Choose a file</label><input type="file" id="imp-file" class="sr" accept="${IMP_ACCEPT}" data-sid="${s.id}">
          <p class="tiny muted drop-hint">or drag it onto this box</p>`}
        ${importBusy?.error ? (importBusy.scanned ? `<div class="lock scan-note" role="status">${ico("camera")}<span>${esc(importBusy.error)}</span></div>${ocrOfferHTML()}` : `<div class="lock bad" role="alert">${ico("info")}<span>${esc(importBusy.error)}</span></div>`) : ""}
      </section>
      <section class="card stack" style="gap:10px"><h2 class="h3">What happens next</h2>
        <ol class="steps small"><li>Study Desk finds the chapters, headings and page or slide numbers.</li><li>You check the list before anything is added.</li><li>The text under each heading becomes that topic's notes, with a summary, flashcards and practice questions.</li></ol></section>
      <details class="card typed" ${IMP.typed || importBusy?.error ? "open" : ""}><summary><span class="h3">No file? Type the chapters instead</span></summary>
        <div class="stack" style="gap:10px;padding:0 18px 18px">
          <p class="small muted">One line each: number, title and pages. Add easy, medium or hard if you like. The number sets the level: 3 is a chapter, 3.1 a heading, 3.1.1 a topic.</p>${importBusy?.keep ? `<p class="small">${ico("file")} Your PDF stays attached: the pages you give each topic become its notes.</p>` : ""}
          <label class="sr" for="qp-text">Chapters list</label>
          <textarea id="qp-text" rows="6" placeholder="3 Research methods 75-102&#10;3.1 Research designs 75-82&#10;3.1.1 Experimental designs 76-78 easy&#10;3.1.2 Correlational designs 79-82 hard">${esc(qpText)}</textarea>
          ${qpPreview && !qpPreview.count ? `<div class="lock bad" role="alert">${ico("info")}<span>Nothing could be read from that list. Start each line with a number, like 1 or 1.2.</span></div>` : ""}
          <button class="btn btn-line btn-auto" data-action="imp-typed" data-id="${s.id}">Read my list</button></div></details>`;
  } else if (step === 3) {
    const c = impCounts(qpPreview.roots), has = s.chapterIds.length;
    body = `<div class="for-chip"><span class="mark" style="--pc:${subjColor(s.id)}"></span><span>For <b>${esc(s.name)}</b></span><button class="linkish" data-action="imp-change">Change</button></div>
      <section class="card stack">
        <div class="found">${ico("check")}<div><b>Found ${c.ch} chapter${c.ch === 1 ? "" : "s"} and ${c.leaves} topic${c.leaves === 1 ? "" : "s"}</b>${importBusy?.note ? `<span class="tiny muted">${esc(importBusy.note)}</span>` : `<span class="tiny muted">From the list you typed.</span>`}</div></div>
        <p class="small muted">Check the list. Edit names and pages later under My subjects.</p>
        <div class="preview">${previewRows(qpPreview.roots, 0, "", has)}</div>
        ${qpPreview.warnings.length ? `<details class="warn-list"><summary class="small">${qpPreview.warnings.length} line${qpPreview.warnings.length > 1 ? "s" : ""} skipped</summary><ul class="issues">${qpPreview.warnings.slice(0, 12).map(w => `<li>${esc(w)}</li>`).join("")}</ul></details>` : ""}
        ${has ? `<div class="fld"><span>${esc(s.name)} already has ${has} chapter${has > 1 ? "s" : ""}</span><div class="segctl" role="radiogroup"><button role="radio" aria-checked="${IMP.mode !== "replace"}" data-action="imp-mode" data-m="append">Add after them</button><button role="radio" aria-checked="${IMP.mode === "replace"}" data-action="imp-mode" data-m="replace">Replace them</button></div></div>` : ""}
        <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="imp-apply">${ico("check")}Add ${c.leaves} topic${c.leaves === 1 ? "" : "s"}</button><button class="btn btn-line" data-action="imp-reset">Use a different file</button></div>
      </section>`;
  } else {
    const d = IMP.done;
    body = `<section class="card done-card stack">
      <span class="done-ic">${ico("check")}</span>
      <h2>${esc(s ? s.name : "Your subject")} is ready</h2>
      <p class="muted">${d.leaves} topic${d.leaves === 1 ? "" : "s"} ${d.mode === "replace" ? "now make up the subject" : "added"}, and your plan is updated.</p>
      <div class="lock" role="status">${d.saving ? impSaveHTML() : d.saved ? `${ico("notes")}<span>Notes saved for ${d.saved} topic${d.saved === 1 ? "" : "s"}. Their summaries, flashcards and practice questions are ready.</span>` : `${ico("info")}<span>No text came with this list, so add notes to a topic when you want a summary, flashcards and questions.</span>`}</div>
      <div class="row" style="flex-wrap:wrap;justify-content:center"><button class="btn btn-pen" data-go="subject:${IMP.sid}">Open ${esc(s ? s.name : "subject")}</button><button class="btn btn-line" data-action="imp-again">Import another file</button></div></section>`;
  }
  return `<div class="stack imp" style="gap:18px">${head}${stepper}${body}</div>`;
};
async function importAction(act, a) {
  switch (act) {
    case "imp-subj": IMP.sid = a.dataset.id; importBusy = null; render(false); return true;
    case "imp-new": {
      const name = val("imp-name"), exam = val("imp-exam");
      if (!name) { showErr("imp-err", "Give the subject a name."); $("#imp-name")?.focus(); return true; }
      if (!DATE_RE.test(exam)) { showErr("imp-err", "Choose the exam date."); return true; }
      if (DSUBJ.some(x => x.name.toLowerCase() === name.toLowerCase())) { showErr("imp-err", `You already have ${name}. Choose it above instead.`); return true; }
      snapshot();
      const sub = { id: newId("s"), hue: HUES[DSUBJ.length % HUES.length], chapters: [], name: name.slice(0, 80), code: "", course: "", exam, examTime: "", venue: "" };
      S.content.subjects.push(sub); afterContentChange(true); IMP.sid = sub.id; render(false); toast(`${sub.name} added.`); return true;
    }
    case "imp-change": if (IMP_OCR) IMP_OCR.stop = true; IMP.sid = null; qpPreview = null; importBusy = null; lastImport = null; render(false); return true;
    case "imp-typed": { const keep = importBusy?.keep && lastImport && !IMP_OCR; qpText = $("#qp-text")?.value || ""; IMP.typed = true; qpPreview = parseOutline(qpText); if (!keep) lastImport = null; importBusy = keep ? { note: "From the list you typed. The pages of your PDF become each topic's notes." } : null; render(false); return true; }
    case "imp-ocr": ocrContents(); return true;
    case "imp-ocr-stop": if (IMP_OCR) IMP_OCR.stop = true; return true;
    case "imp-mode": IMP.mode = a.dataset.m; $$('[data-action="imp-mode"]').forEach(b => b.setAttribute("aria-checked", b === a)); return true;
    case "imp-cancel": if (IMP_OCR) IMP_OCR.stop = true; importBusy = null; lastImport = null; impEnd(); render(false); toast("Import cancelled."); return true;
    case "imp-reset": if (IMP_OCR) IMP_OCR.stop = true; qpPreview = null; qpText = ""; importBusy = null; lastImport = null; IMP.typed = false; render(false); return true;
    case "imp-again": IMP.done = null; qpPreview = null; qpText = ""; importBusy = null; lastImport = null; IMP.typed = false; IMP.mode = "append"; render(false); return true;
    case "imp-apply": {
      if (!qpPreview || !qpPreview.count) return true;
      const raw = S.content.subjects.find(x => x.id === IMP.sid); if (!raw) return true;
      snapshot();
      const roots = qpPreview.roots, c = impCounts(roots), mode = raw.chapters.length && IMP.mode === "replace" ? "replace" : "append";
      if (mode === "replace") raw.chapters = roots; else raw.chapters.push(...roots);
      qpPreview = null; qpText = ""; afterContentChange(true);
      IMP_SAVE = null; IMP.done = { leaves: c.leaves, mode, saving: !!lastImport, saved: 0 }; render(false); window.scrollTo({ top: 0 });
      if (lastImport) { const n = await storeImportText(roots, true); IMP.done.saving = false; IMP.done.saved = n; lastImport = null; if (stack[stack.length - 1].v === "import") rerender(); }
      return true;
    }
  }
  return false;
}

/* ---------- generic bottom sheet ---------- */
function openSheet(label, inner) {
  $$(".scrim").forEach(s => s.remove());
  $("#layer").insertAdjacentHTML("beforeend", `<div class="scrim" data-x="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">${inner}</div></div>`);
  const sh = $(".sheet");
  if (FX.on) { sh.style.animation = "none"; gsap.from(sh, { y: 120, opacity: 0, duration: .5, ease: "expo.out" }); }
  dragToClose(sh);
  setTimeout(() => sh.querySelector("input,textarea,select")?.focus({ preventScroll: true }), 60);
}
const sheetHead = (eyebrow, title) => `<div class="sheet-head"><div class="grab"></div><div class="row"><div class="grow"><div class="tiny muted mono">${esc(eyebrow).replace(/(\d)–(\d)/g, "$1\u2060–\u2060$2")}</div><h2>${esc(title)}</h2></div><button class="icon-btn" data-x="close" aria-label="Close">${ico("x")}</button></div></div>`;
function openNodeSheet(opts) {
  const ex = opts.id ? findRaw(opts.id) : null, n = ex ? ex.node : null;
  const sid = ex ? ex.subject.id : opts.sid, parent = ex ? ex.parent : (opts.parent ? findRaw(opts.parent)?.node : null);
  const leaf = !n || !n.kids.length;
  const kind = !parent ? "chapter" : (parent && findRaw(parent.id)?.parent ? "subheading" : "heading");
  const title = n ? "Edit " + kind : "Add a " + kind;
  const p1d = n ? n.p1 : (parent ? (parent.kids.length ? parent.kids[parent.kids.length - 1].p2 + 1 : parent.p1) : "");
  openSheet(title, `${sheetHead(subjects[sid].name + (parent ? " · in " + parent.title : ""), title)}
    <div class="stack form">
      <label class="fld"><span>Title</span><input id="nf-title" value="${esc(n?.title || "")}" maxlength="160" placeholder="e.g. Research methods" autocomplete="off"></label>
      <div class="frow"><label class="fld"><span>First page</span><input id="nf-p1" type="number" inputmode="numeric" min="0" value="${p1d}"></label><label class="fld"><span>Last page</span><input id="nf-p2" type="number" inputmode="numeric" min="0" value="${n ? n.p2 : ""}"></label></div>
      <div class="frow"><label class="fld"><span>Difficulty</span><select id="nf-diff">${[1, 2, 3].map(d => `<option value="${d}" ${(n ? n.diff : 2) === d ? "selected" : ""}>${DIFF[d]}</option>`).join("")}</select></label>
        ${leaf ? `<label class="fld"><span>Where you are</span><select id="nf-status">${STATUS.slice(0, 5).map((x, i) => `<option value="${i}" ${(n ? st(n.id) : 0) === i ? "selected" : ""}>${x}</option>`).join("")}${n && st(n.id) === 5 ? `<option value="5" selected>Mastered</option>` : ""}</select></label>` : ""}</div>
      <label class="check-row"><input type="checkbox" id="nf-calc" ${n?.calc ? "checked" : ""}> Has calculations (plans calculation practice instead of plain questions)</label>
      ${leaf && !n ? "" : !leaf ? `<p class="tiny muted">Progress for this ${kind} comes from its ${n.kids.length} parts.</p>` : ""}
      <p class="ferr" id="nf-err" role="alert"></p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="node-save" data-id="${n ? n.id : ""}" data-sid="${sid}" data-parent="${parent ? parent.id : ""}">${n ? "Save" : "Add"}</button>
        ${n ? `<button class="btn btn-line btn-sm" data-action="node-del" data-id="${n.id}">Delete${n.kids.length ? " with its parts" : ""}</button>` : ""}
        ${n && kind !== "subheading" ? `<button class="btn btn-line btn-sm" data-action="node-add" data-sid="${sid}" data-parent="${n.id}">+ Add a part inside</button>` : ""}</div>
    </div>`);
}
function openQuestionSheet(nodeId) {
  const n = nodes[nodeId];
  openSheet("Add a question", `${sheetHead(subjects[n.subject].name + " · " + n.title, "Add a practice question")}
    <div class="stack form">
      <label class="fld"><span>Question</span><textarea id="qf-q" rows="3" maxlength="600" placeholder="Type the question"></textarea></label>
      <div class="fld"><span>Answers (tick the correct one)</span>
        ${[0, 1, 2, 3].map(i => `<div class="ansrow"><input type="radio" name="qf-a" id="qf-a${i}" value="${i}" ${i === 0 ? "checked" : ""} aria-label="Answer ${"ABCD"[i]} is correct"><label class="l" for="qf-a${i}">${"ABCD"[i]}</label><input id="qf-o${i}" maxlength="300" placeholder="${i < 2 ? "Answer " + "ABCD"[i] : "Answer " + "ABCD"[i] + " (optional)"}" aria-label="Answer ${"ABCD"[i]}"></div>`).join("")}</div>
      <label class="fld"><span>Level</span><select id="qf-level">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${k === "medium" ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label class="fld"><span>Explanation shown after answering (optional)</span><textarea id="qf-e" rows="2" maxlength="1200" placeholder="Why the correct answer is right"></textarea></label>
      <p class="ferr" id="qf-err" role="alert"></p>
      <div class="row"><button class="btn btn-pen" data-action="q-save" data-id="${nodeId}">Save question</button></div>
    </div>`);
}
const val = id => ($("#" + id)?.value ?? "").trim();
const showErr = (id, msg) => { const el = $("#" + id); if (el) { el.textContent = msg; if (FX.on) gsap.fromTo(el, { x: -6 }, { x: 0, duration: .4, ease: "elastic.out(1,.4)" }); } };

/* returns true when the action was an editor action */
function editorAction(act, a) {
  const id = a.dataset.id;
  switch (act) {
    case "hue": editHue = +a.dataset.h; $$(".hues button").forEach(b => b.setAttribute("aria-checked", b === a)); return true;
    case "subj-save": {
      const name = val("sf-name"), exam = val("sf-exam"), time = val("sf-time");
      if (!name) { showErr("sf-err", "Give the subject a name."); return true; }
      if (!DATE_RE.test(exam)) { showErr("sf-err", "Choose the exam date."); return true; }
      if (time && parseT(time) === null) { showErr("sf-err", "The exam time should look like 09:00."); return true; }
      snapshot();
      const fields = { name: name.slice(0, 80), code: val("sf-code").slice(0, 30), course: val("sf-course").slice(0, 120), exam, examTime: time, venue: val("sf-venue").slice(0, 80) };
      if (id === "new") {
        const s = { id: newId("s"), hue: editHue ?? HUES[DSUBJ.length % HUES.length], chapters: [], ...fields };
        S.content.subjects.push(s); editHue = null; afterContentChange(true);
        stack[stack.length - 1] = { v: "editsubj", a: s.id }; render(true); toast(`${s.name} added. Now add its chapters.`);
      } else {
        const raw = S.content.subjects.find(s => s.id === id); Object.assign(raw, fields); if (editHue !== null) raw.hue = editHue; editHue = null;
        afterContentChange(true); rerender(); toast("Subject saved. Plan updated.", { label: "Undo", fn: undo });
      }
      return true;
    }
    case "subj-del":
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to delete it and its progress"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Delete subject"; } }, 3500); return true; }
      snapshot(); S.content.subjects = S.content.subjects.filter(s => s.id !== id); afterContentChange(true);
      stack.pop(); if (!stack.length) stack = [{ v: "today" }]; render(true); toast("Subject deleted.", { label: "Undo", fn: undo }); return true;
    case "node-add": closeSheet(true); openNodeSheet({ sid: a.dataset.sid, parent: a.dataset.parent || null }); return true;
    case "node-edit": openNodeSheet({ id }); return true;
    case "node-save": {
      const title = val("nf-title"), p1s = val("nf-p1"), p2s = val("nf-p2");
      if (!title) { showErr("nf-err", "Give it a title."); return true; }
      const p1 = p1s === "" ? 0 : Number(p1s), p2 = p2s === "" ? p1 : Number(p2s);
      if (!isInt(p1, 0, 1e5) || !isInt(p2, 0, 1e5)) { showErr("nf-err", "Pages should be whole numbers."); return true; }
      if (p2 < p1) { showErr("nf-err", "The last page can't be before the first page."); return true; }
      snapshot();
      const fields = { title: title.slice(0, 160), p1, p2, diff: +val("nf-diff") || 2, calc: !!$("#nf-calc")?.checked };
      let nodeId = id;
      if (id) Object.assign(findRaw(id).node, fields);
      else {
        const n = { id: newId("n"), ...fields, kids: [] }; nodeId = n.id;
        const parent = a.dataset.parent ? findRaw(a.dataset.parent)?.node : null;
        if (parent) { if (!parent.kids.length) { delete S.status[parent.id]; } parent.kids.push(n); if (parent.p2 < p2) parent.p2 = p2; if (parent.p1 > p1 && p1) parent.p1 = p1; }
        else S.content.subjects.find(s => s.id === a.dataset.sid).chapters.push(n);
      }
      const stEl = $("#nf-status"); if (stEl) S.status[nodeId] = clamp(+stEl.value, 0, 5);
      afterContentChange(true); closeSheet(); rerender(); toast(id ? "Saved." : `${fields.title} added.`, { label: "Undo", fn: undo });
      return true;
    }
    case "node-del": {
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to delete"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Delete"; } }, 3500); return true; }
      const f = findRaw(id); if (!f) return true;
      snapshot(); f.list.splice(f.index, 1); afterContentChange(true); closeSheet(); rerender(); toast(`${f.node.title} deleted.`, { label: "Undo", fn: undo }); return true;
    }
    case "node-move": {
      const f = findRaw(id), j = f.index + +a.dataset.d; if (j < 0 || j >= f.list.length) return true;
      [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]];
      const y = window.scrollY; afterContentChange(false); render(false); window.scrollTo({ top: y }); return true;
    }
    case "qp-preview": qpText = $("#qp-text")?.value || ""; qpPreview = parseOutline(qpText); lastImport = null; rerender(); return true;
    case "qp-apply": {
      if (!qpPreview || !qpPreview.count) return true;
      snapshot();
      const raw = S.content.subjects.find(s => s.id === id);
      if (a.dataset.mode === "replace") raw.chapters = qpPreview.roots; else raw.chapters.push(...qpPreview.roots);
      const n = qpPreview.count, roots = qpPreview.roots; qpPreview = null; qpText = "";
      afterContentChange(true); storeImportText(roots); rerender(); toast(`${n} chapters, headings and topics added. Plan updated.`, { label: "Undo", fn: undo }); return true;
    }
    case "q-add": openQuestionSheet(id); return true;
    case "q-save": {
      const q = val("qf-q"), opts = [0, 1, 2, 3].map(i => val("qf-o" + i)), ans = +($("input[name=qf-a]:checked")?.value ?? 0);
      if (!q) { showErr("qf-err", "Type the question."); return true; }
      const filled = opts.map((o, i) => ({ o, i })).filter(x => x.o);
      if (filled.length < 2) { showErr("qf-err", "Add at least two answers."); return true; }
      if (!opts[ans]) { showErr("qf-err", "Tick an answer that has text in it."); return true; }
      snapshot();
      S.content.questions.push({ id: newId("u"), node: id, level: val("qf-level") || "medium", q, o: filled.map(x => x.o), a: filled.findIndex(x => x.i === ans), e: val("qf-e"), own: true });
      afterContentChange(false); closeSheet(); rerender(); toast("Question added.", { label: "Undo", fn: undo }); return true;
    }
    case "q-del": snapshot(); S.content.questions = S.content.questions.filter(q => q.id !== id); afterContentChange(false); rerender(); toast("Question deleted.", { label: "Undo", fn: undo }); return true;
    case "content-clear":
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.dataset.label = a.textContent; a.textContent = TAP + " again to remove them all"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = a.dataset.label; } }, 3500); return true; }
      snapshot(); S.content = { from: "own", subjects: [], questions: [], explain: {}, notes: {} }; S.status = {}; S.attempts = {}; S.mistakes = {}; S.tasks = []; S.recent = []; S.changes = [];
      afterContentChange(true); rerender(); toast("All subjects removed. Add your own below.", { label: "Undo", fn: undo }); return true;
    case "content-load":
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to replace your subjects"; return true; }
      snapshot(); loadDataFile(); contentNotice = null; rerender(); toast("New study content loaded.", { label: "Undo", fn: undo }); return true;
  }
  return false;
}

/* ---------- import a contents list from a PDF or PowerPoint (read on this device, nothing is uploaded) ---------- */
let importBusy = null, lastImport = null;
/* ---------- import progress: what is happening, how far along, and how long it has taken ---------- */
let IMPP = null, impRun = 0, impTimer = 0, impRaf = 0, IMP_SAVE = null;
const IMP_STAGES = { pdf: "the pages", docx: "the document", pptx: "the slides" };
function impStart(name, size, ext) {
  IMPP = { name, size, ext, stage: 0, done: 0, total: 0, t0: Date.now(), run: ++impRun };
  keepAwake(true); /* the phone stays awake while a big book is read */
  clearInterval(impTimer); impTimer = setInterval(impDraw, 1000); return impRun;
}
const impLive = run => !!IMPP && IMPP.run === run && !!importBusy?.reading;
function impEnd() { clearInterval(impTimer); IMPP = null; if (!F) keepAwake(false); }
/* "about 3 min left", from how fast the pages are going so far */
function impLeft(done, total, since) {
  if (done < 25 || !total || done >= total) return "";
  const secs = (Date.now() - since) / 1000 / done * (total - done);
  return secs < 50 ? "less than a minute left" : secs < 90 ? "about a minute left" : secs < 3600 ? `about ${Math.round(secs / 60)} min left` : `about ${Math.floor(secs / 3600)} h ${Math.round(secs % 3600 / 60)} min left`;
}
function impProg(patch) { if (!IMPP) return; Object.assign(IMPP, patch); impDraw(); }
function impTick() { if (!IMPP || IMPP.stage !== 1 || !IMPP.total || IMPP.sampling) return; IMPP.done = Math.min(IMPP.total, IMPP.done + 1); if (!impRaf) impRaf = requestAnimationFrame(() => { impRaf = 0; impDraw(); }); }
function impPct() {
  const p = IMPP; if (!p) return 0;
  return p.stage >= 2 ? 96 : p.stage === 1 ? (p.total ? Math.round(8 + 84 * p.done / p.total) : null) : 4;
}
const impClock = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
function impInner() {
  const p = IMPP; if (!p) return "";
  const pct = impPct(), secs = (Date.now() - p.t0) / 1000, what = IMP_STAGES[p.ext] || "the file";
  const steps = [
    p.stage > 0 ? "Opened the file" : "Opening the file",
    p.via === "bookmarks" ? "Used the PDF's bookmarks" : (p.stage > 1 ? "Read " : "Reading ") + what + (p.ext === "pdf" && p.total && p.stage === 1 ? ` · page ${Math.max(1, p.done).toLocaleString("en-GB")} of ${p.total.toLocaleString("en-GB")}` : p.ext === "pdf" && p.stage > 1 && p.pages ? ` · ${p.pages} page${p.pages === 1 ? "" : "s"}` : ""),
    p.stage > 2 ? "Found the chapters and headings" : "Finding chapters and headings"
  ];
  const left = p.stage === 1 ? impLeft(p.done, p.total, p.t0p || p.t0) : "";
  const hint = left ? `${left[0].toUpperCase() + left.slice(1)}. Keep this screen open; the phone stays awake.` : secs < 12 ? "Keep this screen open while it works." : secs < 60 ? "Still working. Big files can take a minute or two." : "Still going. Long textbooks can take a few minutes, and it hasn't stopped.";
  return `<div class="impp-file"><span class="impp-ic">${ico("file")}</span><span class="grow"><b>${esc(p.name)}</b><span class="tiny muted">${typeof fmtSize === "function" && p.size ? fmtSize(p.size) : ""}</span></span><b class="impp-pct mono">${pct === null ? "" : pct + "%"}</b></div>
    <div class="impp-bar ${pct === null ? "indet" : ""}" aria-hidden="true"><i style="width:${pct === null ? 35 : pct}%"></i></div>
    <ol class="impp-steps">${steps.map((t, k) => `<li class="${k < p.stage ? "ok" : k === p.stage ? "now" : ""}"><span class="impp-dot">${k < p.stage ? ico("check") : ""}</span><span>${esc(t)}</span></li>`).join("")}</ol>
    <p class="tiny muted impp-foot"><span>${hint}</span><span class="mono" aria-label="Time so far">${impClock(Date.now() - p.t0)}</span></p>`;
}
function impProgHTML() {
  return `<div class="impp" id="impProg">${impInner()}</div><p class="sr" role="status" id="impSay">Reading ${esc(IMPP?.name || "your file")}</p>
    <button class="btn btn-line btn-sm" data-action="imp-cancel">Cancel</button>`;
}
function impDraw() {
  const el = $("#impProg"); if (!el || !IMPP) return;
  el.innerHTML = impInner();
  const say = $("#impSay"), msg = ["Opening the file", "Reading " + (IMP_STAGES[IMPP.ext] || "the file"), "Finding chapters and headings"][Math.min(IMPP.stage, 2)];
  if (say && say.textContent !== msg) say.textContent = msg;
}
function impSaveHTML() {
  const s = IMP_SAVE, pct = s && s.n ? Math.round(100 * (s.i - 1) / s.n) : 0;
  return `<div class="grow impp-save" id="impSave"><span class="row" style="gap:8px"><span class="spin" aria-hidden="true"></span><span class="grow">Saving the text of each topic as notes${s && s.n ? ` · <b class="mono">${s.i.toLocaleString("en-GB")} of ${s.n.toLocaleString("en-GB")}</b>` : "…"}</span></span>${s && s.n && impLeft(s.i, s.n, s.t0) ? `<span class="tiny muted">${impLeft(s.i, s.n, s.t0)[0].toUpperCase() + impLeft(s.i, s.n, s.t0).slice(1)}. You can use the rest of the app meanwhile.</span>` : ""}<span class="impp-bar" aria-hidden="true"><i style="width:${pct}%"></i></span></div>`;
}
function impSaveStep(i, n) { if (!IMP_SAVE || i < IMP_SAVE.i) { IMP_SAVE = { i, n, t0: Date.now() }; keepAwake(true); } else Object.assign(IMP_SAVE, { i, n }); if (i >= n && !F) setTimeout(() => keepAwake(false), 2000); const el = $("#impSave"); if (el) el.outerHTML = impSaveHTML(); }

/* huge books: let pdf.js drop each page once its text is read, and clear its caches every few hundred pages, so memory stays flat */
let pdfReads = 0;
function pdfRelease(doc, pg) { try { pg.cleanup(); } catch (e) { } if (++pdfReads % 300 === 0) { try { Promise.resolve(doc.cleanup()).catch(() => { }); } catch (e) { } } }
async function pdfPageLines(doc, i) {
  impTick();
  const pg = await doc.getPage(i), tc = await pg.getTextContent(), rows = [];
  pdfRelease(doc, pg);
  tc.items.forEach(it => { if (!it.str || !it.str.trim()) return; const y = Math.round(it.transform[5]), x = it.transform[4]; let r = rows.find(r => Math.abs(r.y - y) <= 3); if (!r) rows.push(r = { y, parts: [] }); r.parts.push({ x, s: it.str }); });
  return rows.sort((a, b) => b.y - a.y).map(r => r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(" ").replace(/\s+/g, " ").trim());
}
/* Read a PDF page as lines with their font size and position, so headings, headers and footers can be told apart */
async function pdfPageItems(doc, i) {
  impTick();
  const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent(), rows = [];
  pdfRelease(doc, pg);
  tc.items.forEach(it => {
    if (!it.str || !it.str.trim()) return;
    const y = Math.round(it.transform[5]), x = it.transform[4], size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
    let r = rows.find(r => Math.abs(r.y - y) <= Math.max(2, size * .3)); if (!r) rows.push(r = { y, parts: [], size: 0, chars: 0, fonts: {} });
    r.parts.push({ x, s: it.str }); r.size = Math.max(r.size, size); r.chars += it.str.length; r.fonts[it.fontName] = (r.fonts[it.fontName] || 0) + it.str.length;
  });
  /* font: the font nearly all of the line is in (a bold key term inside a sentence doesn't count) */
  const mainFont = r => { const [f, c] = Object.entries(r.fonts).sort((a, b) => b[1] - a[1])[0] || []; return c >= r.chars * .9 ? f : ""; };
  const lines = rows.sort((a, b) => b.y - a.y).map(r => ({ s: r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(" ").replace(/\s+/g, " ").trim(), size: r.size, chars: r.chars, font: mainFont(r), rel: 1 - r.y / (vp.height || 842) })).filter(l => l.s);
  return lines;
}
const PAGE_NUM = /^(page|p\.|pg\.?)?\s*[-–]?\s*\d{1,4}\s*[-–]?(\s*(of|\/)\s*\d{1,4})?$/i;
const hfKey = s => s.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
/* lines that repeat at the top or bottom of most pages (running headers, footers, copyright lines) */
async function pdfRepeats(imp) {
  if (imp.repeats) return imp.repeats;
  const n = imp.doc.numPages, pick = [...new Set(Array.from({ length: Math.min(16, n) }, (_, k) => 1 + Math.floor(k * n / Math.min(16, n))))];
  const seen = new Map();
  for (const i of pick) { const ls = await pdfPageItems(imp.doc, i); new Set(ls.filter(l => l.rel < .09 || l.rel > .91).map(l => hfKey(l.s))).forEach(k => seen.set(k, (seen.get(k) || 0) + 1)); }
  imp.repeats = new Set([...seen].filter(([, c]) => pick.length >= 3 && c >= Math.max(2, pick.length * .4)).map(([k]) => k));
  return imp.repeats;
}
/* turn PDF pages into clean notes: "## " before headings, no page numbers, headers or footers */
function pagesToNotes(pages, repeats) {
  const sizes = []; pages.flat().forEach(l => { for (let k = 0; k < Math.min(l.chars, 200); k += 10) sizes.push(l.size); });
  sizes.sort((a, b) => a - b); const body = sizes[Math.floor(sizes.length / 2)] || 10;
  const out = [];
  pages.forEach(ls => {
    ls.forEach(l => {
      const edge = l.rel < .09 || l.rel > .91;
      if (PAGE_NUM.test(l.s) || (edge && repeats.has(hfKey(l.s)))) return;
      const head = l.size >= body * 1.18 && l.s.length < 100 && /[a-z]{2}/i.test(l.s) && !/[.,;]$/.test(l.s);
      if (head) { const last = out[out.length - 1]; if (last && last.h && last.t.length + l.s.length < 110) last.t += " " + l.s; else out.push({ h: true, t: l.s }); }
      else out.push({ h: false, t: l.s });
    });
  });
  return out.map(x => x.h ? `\n## ${x.t.replace(/^#+\s*/, "")}` : x.t).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
/* After an import is added, keep each topic's own pages or slides as its notes, for summaries and podcasts */
async function storeImportText(roots, quiet) {
  const imp = lastImport; if (!imp) return 0;
  const leaves = []; const walk = l => l.forEach(n => n.kids.length ? walk(n.kids) : leaves.push(n)); walk(roots);
  let saved = 0, pagesRead = 0;
  const repeats = imp.kind === "pdf" ? (imp.scanned ? new Set() : await pdfRepeats(imp)) : null;
  for (const n of leaves) {
    impSaveStep(leaves.indexOf(n) + 1, leaves.length);
    let text = "";
    if (imp.kind === "pdf") {
      const idx = p => { if (imp.labels) { const k = imp.labels.indexOf(String(p)); if (k >= 0) return k + 1; } return p; };
      const pages = [];
      for (let p = n.p1; p <= n.p2; p++) { const i = idx(p); if (i < 1 || i > imp.doc.numPages) continue; const items = imp.scanned ? await ocrPageItems(imp, i) : await pdfPageItems(imp.doc, i); pages.push(items); pagesRead++; if (!imp.scanned && typeof pdfFigures === "function") await pdfFigures(imp, i, items, n.id, p); }
      text = pagesToNotes(pages, repeats);
      /* topics that share a page: start at this topic's heading and stop at the next topic's heading */
      const lines = text.split("\n"), norm = t => stripNum(t.replace(/^#+\s*/, "")).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const me = norm(n.title), nextT = leaves[leaves.indexOf(n) + 1] ? norm(leaves[leaves.indexOf(n) + 1].title) : null;
      const a = lines.findIndex(l => /^##\s/.test(l) && norm(l) === me);
      const b = nextT ? lines.findIndex((l, i) => i > Math.max(a, -1) && /^##\s/.test(l) && norm(l) === nextT) : -1;
      if (a >= 0 || b > 0) text = lines.slice(Math.max(a, 0), b > 0 ? b : lines.length).join("\n");
    } else if (imp.kind === "pptx") { const parts = []; for (let p = n.p1; p <= n.p2; p++) if (imp.slides[p - 1]) parts.push(imp.slides[p - 1]); text = parts.join("\n\n"); }
    if (text.trim().length > 60 && nodes[n.id]) { await saveNotes(n.id, text.trim()); saved++; }
  }
  sumCache.clear();
  if (saved && !quiet) { toast(`Saved the text of ${saved} topic${saved > 1 ? "s" : ""}. Summaries, flashcards and podcasts are ready.`); if (["editsubj", "topic", "summary", "listen"].includes(stack[stack.length - 1].v)) rerender(); }
  return saved;
}
const stripNum = t => t.replace(/\s+/g, " ").trim().replace(/^(chapter|ch\.?|unit|part|module|section|lecture|week)\s*\d+(\.\d+)*\s*[.:)\-–—]?\s*/i, "").replace(/^\d+(\.\d+)*\s*[.:)\-–—]?\s+/, "").trim();
/* contents lines: dot leaders ("Cells ........ 5", "Cells....5") become one space */
const tocTidy = l => l.replace(/\s*(?:[.·…_\-–]\s*){4,}/g, " ").replace(/\s+/g, " ").trim();
const tocLike = l => /\S.*\s(\d{1,4})$/.test(l) && /[a-z]{3}/i.test(l) && l.length < 160;
const isContentsTitle = l => /^((table of|brief|detailed|full) )?contents( at a glance)?$/i.test(l) || /^(tableof)?contents$/i.test(l.replace(/\s/g, ""));
/* one topic for every few pages, for books with no structure Study Desk can find */
function splitByPages(name, pages, pageNo) {
  const deck = stripNum(String(name || "").replace(/\.pdf$/i, "").replace(/[_-]+/g, " ")).replace(/^\p{Ll}/u, c => c.toUpperCase()) || "Imported PDF", per = pages <= 12 ? pages : pages <= 60 ? 5 : pages <= 400 ? 10 : 20, parts = [];
  for (let a = 0; a < pages; a += per) { const p1 = pageNo(a), p2 = pageNo(Math.min(pages, a + per) - 1); parts.push(`1.${parts.length + 1} Pages ${p1} to ${p2} ${p1}-${p2}`); }
  return { text: [`1 ${deck} ${pageNo(0)}-${pageNo(pages - 1)}`, ...parts].join("\n"), parts: parts.length, per };
}
/* ---------- scanned PDFs: read the pictures of the pages on this device (Tesseract, in tools.js) ---------- */
let IMP_OCR = null;
async function ocrPageText(imp, i, toc) {
  imp.ocr = imp.ocr || new Map(); const key = (toc ? "c" : "p") + i;
  if (imp.ocr.has(key)) return imp.ocr.get(key);
  const doc = imp.doc, pg = await doc.getPage(i), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(3, 1700 / v1.width) });
  const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
  const cx = cv.getContext("2d", { willReadFrequently: !!toc }); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height);
  await pg.render({ canvasContext: cx, viewport: vp }).promise; pdfRelease(doc, pg);
  if (toc) dropSpecks(cx, cv.width, cv.height);
  const blob = await new Promise(r => cv.toBlob(r, "image/png")); cv.width = cv.height = 0;
  const text = blob ? await ocrImages([blob], null, toc ? "6" : null) : "";
  if (imp.ocr.size > 60) imp.ocr.delete(imp.ocr.keys().next().value);
  imp.ocr.set(key, text); return text;
}
/* text recognition can't read dot leaders ("Cells ........ 3"): it turns them into letters and loses the page number.
   Wipe every speck much smaller than a letter (the letter size is the ink-weighted middle height), then read line by line. */
function dropSpecks(cx, W, H) {
  const im = cx.getImageData(0, 0, W, H), d = im.data, N = W * H, ink = new Uint8Array(N);
  for (let i = 0; i < N; i++) ink[i] = d[4 * i] * 299 + d[4 * i + 1] * 587 + d[4 * i + 2] * 114 < 150000 ? 1 : 0;
  const lab = new Int32Array(N), st = new Int32Array(N), comps = [null]; let L = 0;
  for (let i = 0; i < N; i++) {
    if (!ink[i] || lab[i]) continue;
    lab[i] = ++L; let sp = 0, x0 = W, x1 = 0, y0 = H, y1 = 0, n = 0; st[sp++] = i;
    while (sp) {
      const j = st[--sp], x = j % W, y = (j - x) / W; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = yy * W + xx; if (ink[k] && !lab[k]) { lab[k] = L; st[sp++] = k; } }
    }
    comps.push({ w: x1 - x0 + 1, h: y1 - y0 + 1, n });
  }
  const real = comps.filter(c => c && c.n > 12).sort((a, b) => a.h - b.h), tot = real.reduce((t, c) => t + c.n, 0);
  let acc = 0, letter = 20; for (const c of real) { acc += c.n; if (acc >= tot / 2) { letter = c.h; break; } }
  const kill = new Uint8Array(L + 1); for (let l = 1; l <= L; l++) if (comps[l].h <= letter * .38 && comps[l].w <= letter * .38) kill[l] = 1;
  for (let i = 0; i < N; i++) if (lab[i] && kill[lab[i]]) d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = 255;
  cx.putImageData(im, 0, 0);
}
/* the same shape as pdfPageItems, so a scanned page's text becomes notes the usual way */
async function ocrPageItems(imp, i) { return (await ocrPageText(imp, i)).split("\n").map(t => t.trim()).filter(Boolean).map(t => ({ s: t, size: 10, chars: t.length, font: "", rel: .5 })); }
function ocrOfferHTML() {
  const o = IMP_OCR;
  if (o) return `<div class="lock" role="status" id="impOcr"><span class="spin" aria-hidden="true"></span><span>${esc(o.say)}</span></div><button class="btn btn-line btn-sm" data-action="imp-ocr-stop">Stop</button>`;
  return `<button class="btn btn-pen" data-action="imp-ocr">${ico("camera")}Read the pictures</button><p class="tiny muted ocr-offer">Finds the contents page first, which takes about a minute. When you add the topics, their pages are read too, a few seconds a page. Nothing leaves this device.</p>`;
}
async function ocrContents() {
  const imp = lastImport; if (!imp || imp.kind !== "pdf" || IMP_OCR) return;
  const doc = imp.doc, max = Math.min(doc.numPages, 30), pageNo = i => i + 1;
  IMP_OCR = { say: "Getting the text reader ready…" }; keepAwake(true); rerender();
  const say = t => { if (!IMP_OCR) return; IMP_OCR.say = t; const el = $("#impOcr span:last-child"); if (el) el.textContent = t; };
  let start = -1; const collected = [];
  try {
    for (let i = 1; i <= max && !IMP_OCR.stop; i++) {
      say(start > 0 ? `Reading the contents page ${i}…` : `Looking for the contents page: page ${i} of the first ${max}…`);
      const ls = (await ocrPageText(imp, i, true)).split("\n").map(tocTidy).filter(Boolean);
      if (start < 0 && ls.some(isContentsTitle)) start = i;
      if (start > 0) { const good = ls.filter(tocLike); if (i > start && good.length < 3) break; collected.push(...good); }
    }
  } catch (e) {
    console.error(e); IMP_OCR = null; keepAwake(false);
    importBusy = { ...importBusy, scanned: false, error: "Couldn't read the pictures on this device. Type the contents list below instead: the PDF stays attached, so its pages still become notes." };
    if (stack[stack.length - 1].v === "import") rerender(); return;
  }
  const stopped = IMP_OCR.stop; IMP_OCR = null; keepAwake(false);
  if (stopped || lastImport !== imp) { if (stack[stack.length - 1].v === "import") rerender(); return; }
  if (collected.length >= 3) {
    qpText = collected.slice(0, 6000).join("\n");
    importBusy = { note: `Read the contents page (page ${start} of the PDF) from the pictures. Reading pictures can get a letter or a number wrong, so check the list.` };
  } else {
    const sp = splitByPages(imp.name, doc.numPages, pageNo); qpText = sp.text;
    importBusy = { note: `No contents page in the first ${max} pages, so the book was split into ${sp.parts} part${sp.parts === 1 ? "" : "s"}${sp.parts > 1 ? ` of about ${sp.per} pages` : ""}. Rename them later, or type the contents list instead.` };
  }
  qpPreview = parseOutline(qpText);
  if (stack[stack.length - 1].v === "import") rerender();
}
/* does any of these pages paint a picture (scanned books are one picture per page) */
async function pdfHasPictures(doc, idxs) {
  const O = window.pdfjsLib.OPS, pic = new Set([O.paintImageXObject, O.paintInlineImageXObject, O.paintImageMaskXObject, O.paintImageXObjectRepeat].filter(x => x != null));
  for (const i of idxs) { try { const pg = await doc.getPage(i), ops = await pg.getOperatorList(); pdfRelease(doc, pg); if (ops.fnArray.some(f => pic.has(f))) return true; } catch (e) { } }
  return false;
}
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  const base = new URL("vendor/", document.baseURI).href;
  const lib = await import(base + "pdf.min.mjs");
  lib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
  window.pdfjsLib = lib; return lib;
}
async function pdfToOutline(buf, name = "") {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: buf, isEvalSupported: false }).promise;
  impProg({ stage: 1, done: 0, total: doc.numPages, pages: doc.numPages });
  let labels = null; try { labels = await doc.getPageLabels(); } catch (e) { }
  lastImport = { kind: "pdf", doc, labels, name };
  const pageNo = i => { const l = labels && labels[i]; return l && /^\d+$/.test(l) ? +l : i + 1; };
  const outline = await doc.getOutline().catch(() => null);
  if (outline && outline.length) {
    const lines = []; let count = 0;
    const resolve = async it => { try { let d = it.dest; if (typeof d === "string") d = await doc.getDestination(d); if (Array.isArray(d) && d[0]) { const idx = typeof d[0] === "number" ? d[0] : await doc.getPageIndex(d[0]); return pageNo(idx); } } catch (e) { } return null; };
    const walk = async (items, prefix, depth) => { for (let i = 0; i < items.length && count < 6000; i++) { const it = items[i], num = prefix ? prefix + "." + (i + 1) : String(i + 1), p = await resolve(it), t = stripNum(it.title || ""); if (!t) continue; count++; lines.push(`${num} ${t}${p != null ? " " + p : ""}`); if (depth < 3 && it.items && it.items.length) await walk(it.items, num, depth + 1); } };
    await walk(outline, "", 0);
    if (lines.length) { impProg({ stage: 2, via: "bookmarks" }); }
    if (lines.length) return { text: lines.join("\n"), note: `Read ${count} bookmarks from the PDF. Page numbers come from the PDF, so check they match your book.` };
  }
  /* no bookmarks: look for a contents page and read its lines */
  const pageLines = i => pdfPageLines(doc, i);
  const max = Math.min(doc.numPages, 60);
  let start = -1, collected = [];
  for (let i = 1; i <= max; i++) {
    const ls = (await pageLines(i)).map(tocTidy);
    if (start < 0 && ls.some(isContentsTitle)) start = i;
    if (start > 0) { const good = ls.filter(tocLike); if (i > start && good.length < 3) break; collected.push(...good); }
  }
  if (!collected.length) for (let i = 1; i <= max; i++) { const good = (await pageLines(i)).map(tocTidy).filter(l => tocLike(l) && /^(\d+(\.\d+)*|chapter|unit)\b/i.test(l)); if (good.length >= 4) collected.push(...good); }
  if (collected.length) return { text: collected.slice(0, 6000).join("\n"), note: start > 0 ? `Read the contents page (page ${start} of the PDF). Check the levels and page numbers before adding.` : "This PDF has no bookmarks or contents page, so these lines were picked from numbered headings. Check them carefully." };
  /* no contents page either: use the headings (lines in a bigger font) as topics */
  /* two passes so any size of book works: the body font size from a sample of pages, then every page once, keeping only the headings */
  const heads = [], fheads = [], sizes = [], fonts = {}, pages = doc.numPages, step = Math.max(1, Math.floor(pages / 240));
  let sampled = 0, sampledChars = 0;
  if (IMPP) IMPP.sampling = true;
  const bare = [];
  for (let i = 1; i <= pages; i += step) { sampled++; let c = 0; (await pdfPageItems(doc, i)).forEach(l => { c += l.chars; sampledChars += l.chars; fonts[l.font] = (fonts[l.font] || 0) + l.chars; for (let k = 0; k < Math.min(l.chars, 200); k += 10) sizes.push(l.size); }); if (c < 25) bare.push(i); }
  /* a scan: pictures of the pages with (almost) no text in them */
  if (sampledChars < sampled * 25 && await pdfHasPictures(doc, bare.slice(0, 3))) { if (IMPP) IMPP.sampling = false; lastImport.scanned = true; return { text: "", scanned: true, note: "This PDF is made of pictures of the pages (a scan), so there's no text in it to read yet. Study Desk can read the pictures for you, on this device." }; }
  sizes.sort((a, b) => a - b); const body = sizes[Math.floor(sizes.length / 2)] || 10;
  const bodyFont = Object.entries(fonts).sort((a, b) => b[1] - a[1])[0][0];
  const rareFont = f => f && f !== bodyFont && (fonts[f] || 0) < sampledChars * .12;
  const notCaption = s => !/^(figure|fig\.|table|source|photo|image|note|see)\b/i.test(s);
  if (IMPP) { IMPP.sampling = false; IMPP.done = 0; IMPP.t0p = Date.now(); }
  for (let k = 0; k < pages; k++) (await pdfPageItems(doc, k + 1)).forEach(l => {
    /* the same size as the text but in a font of its own (bold headings) */
    if (rareFont(l.font) && l.s.length >= 3 && l.s.length < 90 && /[a-z]{3}/i.test(l.s) && !/[.,;:]$/.test(l.s) && !PAGE_NUM.test(l.s) && notCaption(l.s)) { const prev = fheads[fheads.length - 1]; if (prev && prev.y === k && prev.last && prev.font === l.font) prev.t += " " + l.s; else fheads.push({ t: l.s, p: pageNo(k), y: k, last: true, size: l.size, font: l.font }); } else { const prev = fheads[fheads.length - 1]; if (prev) prev.last = false; }
    if (l.size >= body * 1.18 && l.s.length >= 3 && l.s.length < 90 && /[a-z]{3}/i.test(l.s) && !/[.,;]$/.test(l.s) && !PAGE_NUM.test(l.s) && l.rel > .06 && l.rel < .94) { const prev = heads[heads.length - 1]; if (prev && prev.p === pageNo(k) && prev.y === k && prev.last && Math.abs(prev.size - l.size) < .5) prev.t += " " + l.s; else heads.push({ t: l.s, p: pageNo(k), y: k, last: true, size: l.size }); } else { const prev = heads[heads.length - 1]; if (prev) prev.last = false; } });
  let viaFont = false;
  if (heads.length < 2) {
    /* lines repeated on many pages are running headers, not headings */
    const seen = {}; fheads.forEach(h => seen[h.t.toLowerCase()] = (seen[h.t.toLowerCase()] || 0) + 1);
    const real = fheads.filter(h => seen[h.t.toLowerCase()] <= Math.max(2, pages * .1));
    if (real.length >= 2) { heads.length = 0; heads.push(...real); viaFont = true; }
  }
  if (heads.length >= 2 && heads.length <= 40000) {
    const deck = stripNum(name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ")).replace(/^\p{Ll}/u, c => c.toUpperCase()) || "Imported PDF", last = pageNo(pages - 1);
    const endOf = k => k + 1 < heads.length ? Math.max(heads[k].p, heads[k + 1].p) : last; /* shares the next heading's page; the text is split at the heading */
    /* big books: the largest heading size is the chapter, smaller ones are its sections */
    const top = Math.max(...heads.map(h => Math.round(h.size * 2) / 2)), isTop = h => Math.round(h.size * 2) / 2 >= top - .5;
    const nTop = heads.filter(isTop).length, lines = [];
    if (nTop >= 2 && nTop < heads.length && heads.length > 12) {
      let c = 0, k2 = 0, chStart = -1;
      const chEnd = from => { for (let m = from + 1; m < heads.length; m++) if (isTop(heads[m])) return Math.max(heads[from].p, heads[m].p - 1); return last; };
      if (!isTop(heads[0])) { c = 1; lines.push(`1 ${deck} ${heads[0].p}-${Math.max(heads[0].p, (heads.find(isTop) || { p: last }).p - 1)}`); }
      heads.forEach((h, k) => {
        if (isTop(h)) { c++; k2 = 0; chStart = k; lines.push(`${c} ${stripNum(h.t) || h.t} ${h.p}-${chEnd(k)}`); }
        else { k2++; lines.push(`${c}.${k2} ${stripNum(h.t) || h.t} ${h.p}-${endOf(k)}`); }
      });
      /* a chapter with no sections of its own stays one topic */
      return { text: lines.join("\n"), note: `This PDF has no bookmarks or contents page, so ${c} chapters and ${heads.length - nTop} sections were picked from the headings in ${pages} pages. Check them before adding.` };
    }
    lines.push(`1 ${deck} ${heads[0].p}-${last}`); heads.forEach((h, k) => lines.push(`1.${k + 1} ${stripNum(h.t) || h.t} ${h.p}-${endOf(k)}`));
    return { text: lines.join("\n"), note: `This PDF has no bookmarks or contents page, so ${heads.length} ${viaFont ? "bold " : ""}headings were picked from the text. Check them before adding.` };
  }
  /* text but no structure at all: split it into parts of a few pages, so it can still be studied */
  const sp = splitByPages(name, pages, pageNo);
  return { text: sp.text, note: sp.parts > 1 ? `This PDF has no bookmarks, contents page or headings, so it was split into ${sp.parts} parts of about ${sp.per} pages. Rename them later under My subjects, or type the contents list instead.` : "This PDF has no bookmarks, contents page or headings, so it was kept as one topic. Type the contents list instead if you want it split up." };
}
/* PowerPoint: slides in the order the deck shows them, with titles, bullet levels, tables and speaker notes */
async function pptxToOutline(buf, name) {
  if (!window.JSZip) throw new Error("zip");
  const zip = await JSZip.loadAsync(buf);
  const xml = async f => { const z = zip.file(f); return z ? new DOMParser().parseFromString(await z.async("string"), "application/xml") : null; };
  const all = (el, tag) => el ? [...el.getElementsByTagNameNS("*", tag)] : [];
  const rels = async f => { const d = await xml(f); const m = {}; all(d, "Relationship").forEach(r => m[r.getAttribute("Id")] = { t: r.getAttribute("Target"), type: r.getAttribute("Type") || "" }); return m; };
  const resolve = (base, t) => { if (t.startsWith("/")) return t.slice(1); const parts = base.split("/").slice(0, -1); t.split("/").forEach(x => x === ".." ? parts.pop() : x !== "." && parts.push(x)); return parts.join("/"); };
  /* true slide order comes from presentation.xml, not from the file names */
  let files = [];
  try {
    const pres = await xml("ppt/presentation.xml"), pr = await rels("ppt/_rels/presentation.xml.rels");
    files = all(pres, "sldId").map(el => { const id = el.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || el.getAttribute("r:id"); return pr[id] && resolve("ppt/presentation.xml", pr[id].t); }).filter(f => f && zip.file(f));
  } catch (e) { }
  if (!files.length) files = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => +a.match(/(\d+)\.xml$/)[1] - +b.match(/(\d+)\.xml$/)[1]);
  const phType = sp => (all(sp, "ph")[0]?.getAttribute("type")) || (all(sp, "ph").length ? "body" : "");
  const paras = el => all(el, "p").filter(p => p.namespaceURI && /drawingml/.test(p.namespaceURI)).map(p => {
    const t = [...p.childNodes].map(c => c.localName === "r" || c.localName === "fld" ? all(c, "t").map(x => x.textContent).join("") : c.localName === "br" ? " " : "").join("").replace(/\s+/g, " ").trim();
    const lvl = +(all(p, "pPr")[0]?.getAttribute("lvl") || 0);
    return { t, lvl };
  }).filter(x => x.t);
  const titles = [], slideText = [];
  for (let i = 0; i < files.length; i++) {
    const d = await xml(files[i]); if (!d) continue;
    const shapes = all(d, "sp");
    const titleSp = shapes.filter(sp => /^(title|ctrTitle)$/.test(phType(sp)));
    let t = titleSp.flatMap(paras).map(x => x.t).join(" ").trim();
    const body = [];
    shapes.forEach(sp => {
      const ty = phType(sp); if (/^(title|ctrTitle|sldNum|dt|ftr|hdr)$/.test(ty)) return;
      const ps = paras(sp); if (!ps.length) return;
      if (!t && ty === "subTitle") { body.push(...ps.map(x => x.t)); return; }
      ps.forEach(x => body.push(`${"  ".repeat(Math.min(x.lvl, 3))}- ${x.t}`));
    });
    /* tables: each row becomes "First cell – Column: value; Column: value" so it reads as a fact */
    all(d, "tbl").forEach(tb => {
      const rows = all(tb, "tr").map(tr => all(tr, "tc").map(tc => paras(tc).map(x => x.t).join(" ")));
      const head = rows.length > 1 && rows[0].every(c => c && c.length < 40) ? rows.shift() : null;
      rows.forEach(r => { if (!r.some(Boolean)) return; body.push(`- ${head && r.length > 1 ? `${r[0]} – ${r.slice(1).map((c, k) => c ? `${head[k + 1] ? head[k + 1].replace(/[?:]$/, "") + ": " : ""}${c}` : "").filter(Boolean).join("; ")}` : r.filter(Boolean).join(" | ")}`); });
    });
    if (!t) t = (body[0] || "").replace(/^\s*-\s*/, "");
    /* speaker notes often hold what the lecturer actually said */
    let notes = [];
    try {
      const sr = await rels(files[i].replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels"));
      const nr = Object.values(sr).find(r => /notesSlide$/.test(r.type));
      if (nr) { const nd = await xml(resolve(files[i], nr.t)); notes = all(nd, "sp").filter(sp => phType(sp) === "body").flatMap(paras).map(x => x.t).filter(x => !/^\d+$/.test(x)); }
    } catch (e) { }
    const clean = stripNum(t) || `Slide ${i + 1}`;
    titles.push(clean);
    slideText.push([`## ${clean}`, ...body, ...(notes.length ? ["Notes:", ...notes] : [])].join("\n"));
  }
  if (!titles.length) return { text: "", note: "No slides found in that file." };
  lastImport = { kind: "pptx", slides: slideText };
  const deck = stripNum(name.replace(/\.pptx$/i, "").replace(/[_-]+/g, " ")).replace(/^\p{Ll}/u, c => c.toUpperCase()) || "Slides";
  const lines = [`1 ${deck} 1-${titles.length}`]; let k = 0;
  for (let i = 0; i < titles.length; i++) { let j = i; while (j + 1 < titles.length && titles[j + 1].replace(/\s*\(cont.*\)$/i, "") === titles[i]) j++; k++; lines.push(`1.${k} ${titles[i]} ${i + 1}-${j + 1}`); i = j; }
  const withNotes = slideText.filter(x => x.includes("\nNotes:")).length;
  return { text: lines.join("\n"), note: `Read ${titles.length} slides from ${name}${withNotes ? `, including speaker notes on ${withNotes}` : ""}. Slide numbers are used as page numbers.` };
}
async function importFile(file, sid) {
  if (!file) return;
  const name = file.name || "file", ext = (name.match(/\.(\w+)$/) || [])[1]?.toLowerCase();
  if (file.size > 2e9) { importBusy = { error: "That file is over 2 GB, which is more than a browser can open. Try a smaller copy of the PDF, or split it into parts." }; rerender(); return; }
  if (ext === "ppt") { importBusy = { error: "Old .ppt files can't be read. Open it in PowerPoint and save it as .pptx first." }; rerender(); return; }
  if (ext === "doc") { importBusy = { error: "Old .doc files can't be read. Open it in Word and save it as .docx first." }; rerender(); return; }
  if (!["pdf", "pptx", "docx"].includes(ext)) { importBusy = { error: `${name} isn't a file Study Desk can read. Choose a PDF, a PowerPoint (.pptx) or a Word (.docx) file, or type the chapters below.` }; rerender(); return; }
  const run = impStart(name, file.size, ext);
  importBusy = { reading: name }; rerender();
  $("#dropzone")?.scrollIntoView({ block: "center", behavior: "instant" });
  try {
    const buf = await file.arrayBuffer();
    if (ext !== "pdf") impProg({ stage: 1 });
    const r = ext === "pdf" ? await pdfToOutline(buf, name) : ext === "docx" ? await docxToOutline(buf, name) : await pptxToOutline(buf, name);
    if (!impLive(run)) return;
    impProg({ stage: 2 }); await new Promise(res => setTimeout(res, 350));
    if (!impLive(run)) return;
    importBusy = r.text ? { note: r.note } : { error: r.note, scanned: !!r.scanned, keep: lastImport?.kind === "pdf" };
    if (r.text) { qpText = r.text; qpPreview = parseOutline(qpText); }
  } catch (e) {
    console.error(e); if (!impLive(run)) return;
    importBusy = { error: /password/i.test(String(e && e.message)) ? "That PDF is password-protected. Remove the password and try again." : `Couldn't read ${name}. It may be damaged or scanned as images only.` };
  }
  impEnd();
  const top = stack[stack.length - 1];
  if ((top.v === "editsubj" && top.a === sid) || top.v === "import") rerender();
}

/* =====================================================================
   8c. NOTES, SUMMARIES, ACTIVITY, LISTEN
   ===================================================================== */

/* ---------- on-device file store (IndexedDB): topic notes from imports, and audio recordings ---------- */
const IDB = (() => {
  let dbp = null, mem = { notes: new Map(), audio: new Map(), sketch: new Map(), pics: new Map(), vec: new Map(), books: new Map(), marks: new Map(), figs: new Map(), aq: new Map(), ai: new Map() }, ok = true;
  const open = () => dbp || (dbp = new Promise((res) => {
    try {
      const r = indexedDB.open("studydesk", 7);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains("notes")) d.createObjectStore("notes", { keyPath: "id" }); if (!d.objectStoreNames.contains("audio")) d.createObjectStore("audio", { keyPath: "id" }); if (!d.objectStoreNames.contains("sketch")) d.createObjectStore("sketch", { keyPath: "id" }); for (const k of ["pics", "vec", "books", "marks", "figs", "aq", "ai"]) if (!d.objectStoreNames.contains(k)) d.createObjectStore(k, { keyPath: "id" }); };
      /* another open tab with an older version closes its copy (below), so the upgrade only waits a moment */
      let waited = null;
      r.onsuccess = () => { clearTimeout(waited); const d = r.result; d.onversionchange = () => { d.close(); dbp = null; }; res(d); }; r.onerror = () => { ok = false; res(null); };
      r.onblocked = () => { waited = setTimeout(() => { ok = false; res(null); }, 6000); };
    } catch (e) { ok = false; res(null); }
  }));
  const tx = async (store, mode, fn) => { const d = await open(); if (!d) return fn(null); return new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  return {
    get ok() { return ok; },
    put: (store, v) => tx(store, "readwrite", s => s ? s.put(v) : mem[store].set(v.id, v)),
    del: (store, k) => tx(store, "readwrite", s => s ? s.delete(k) : mem[store].delete(k)),
    get: (store, k) => tx(store, "readonly", s => s ? s.get(k) : { result: mem[store].get(k) }),
    all: (store) => tx(store, "readonly", s => s ? s.getAll() : { result: [...mem[store].values()] })
  };
})();
let NOTES = {}, notesReady = false, RECS = [];
async function loadLocalFiles() {
  try { (await IDB.all("notes") || []).forEach(n => { if (nodes[n.id]) NOTES[n.id] = n.text; }); } catch (e) { }
  try { RECS = (await IDB.all("audio") || []).map(r => ({ ...r, blob: undefined })).sort((a, b) => b.added - a.added); } catch (e) { }
  notesReady = true;
  if (cleanPending) { await cleanSlate(); return; }
  const v = stack[stack.length - 1].v; if (["topic", "summary", "listen", "progress"].includes(v)) rerender();
}
const notesOf = id => NOTES[id] || S.content.notes?.[id] || "";
async function saveNotes(id, text) { text = String(text || "").slice(0, 3000000); if (text.trim()) { NOTES[id] = text; await IDB.put("notes", { id, text }); } else { delete NOTES[id]; await IDB.del("notes", id); } }

/* ---------- activity log (feeds the weekly summary) ---------- */
function logEvent(e) { S.log.push({ d: todayKey(), ...e }); if (S.log.length > 20000) S.log = S.log.slice(-20000); }
function seedLog() {
  const t = todayKey(), L = [];
  const leaves = leafIds.filter(id => st(id) >= 2);
  [[-6, 3, 7], [-5, 4, 6], [-4, 2, 0], [-3, 5, 8], [-2, 4, 5], [-1, 2, 3], [-9, 3, 4], [-8, 4, 6], [-10, 2, 2]].forEach(([off, sessions, qs], k) => {
    const d = addDays(t, off);
    for (let i = 0; i < sessions; i++) L.push({ d, t: "task", n: leaves[(k * 3 + i) % leaves.length], m: [25, 30, 35, 40, 20][(k + i) % 5] });
    for (let i = 0; i < qs; i++) L.push({ d, t: "q", n: leaves[(k + i) % leaves.length], ok: (k + i) % 3 !== 0 });
    if (k % 2 === 0) L.push({ d, t: "step", n: leaves[k % leaves.length] });
  });
  S.log = L;
}
function weekStats(fromK, toK) {
  const ev = S.log.filter(e => e.d >= fromK && e.d <= toK);
  const tasks = ev.filter(e => e.t === "task"), qs = ev.filter(e => e.t === "q"), listens = ev.filter(e => e.t === "listen");
  const mins = tasks.reduce((a, e) => a + (e.m || 0), 0) + listens.reduce((a, e) => a + (e.m || 0), 0);
  const subj = {}; tasks.forEach(e => { const s = nodes[e.n]?.subject; if (s) subj[s] = (subj[s] || 0) + (e.m || 0); });
  const days = new Set(ev.map(e => e.d)).size;
  return { sessions: tasks.length, mins, answered: qs.length, right: qs.filter(e => e.ok).length, steps: ev.filter(e => e.t === "step").length, listens: listens.length, subj, days };
}
function streak() { let n = 0, d = todayKey(); const days = new Set(S.log.map(e => e.d)); if (!days.has(d)) d = addDays(d, -1); while (days.has(d)) { n++; d = addDays(d, -1); } return n; }
const fmtMins = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? " " + (m % 60) + " min" : ""}` : `${m} min`;

/* ---------- summaries: Claude-written when provided, otherwise picked from the notes on this device ---------- */
const STOP = new Set("a an and are as at be been being but by can could did do does each for from had has have how however if in into is it its may more most much must no not of on one only or other our out over so some such than that the their them then there these they this those through to too under up upon use used using very was we were what when where which while who why will with within without would you your also both between during etc example examples first however i.e e.g many often same second several since therefore thus usually".split(" "));
const words = s => (s.toLowerCase().match(/[a-z][a-z'’-]{2,}/g) || []).filter(w => !STOP.has(w));
/* The summary engine lives in summary.js: it covers every section, keeps definitions, formulas, numbers and
   exam cues, checks every key term is in a bullet, and reports what it covered. It only uses sentences from the notes. */
let SUM_DETAIL = (() => { try { return localStorage.getItem("studydesk.sumMode") !== "short"; } catch (e) { return true; } })();
function summarize(text, title = "", max, detail) { try { return window.SDSummary ? SDSummary.summarize(text, title, max ? { max } : { detail: detail === undefined ? false : detail }) : null; } catch (e) { console.error(e); return null; } }
const asSections = bullets => [{ h: "", items: bullets.map(t => ({ t, kinds: [], def: null })) }];
/* one renderer for every summary in the app (topic page, subject summary, recordings) */
function sumHTML(sm, opts = {}) {
  const li = x => {
    let t = esc(x.t);
    if (x.def && x.def.term) { const k = esc(x.def.term); const i = t.toLowerCase().indexOf(k.toLowerCase()); if (i >= 0 && i < 160) t = t.slice(0, i) + `<b>${t.slice(i, i + k.length)}</b>` + t.slice(i + k.length); }
    const tag = x.kinds?.includes("formula") ? `<span class="ktag f">Formula</span>` : x.kinds?.includes("exam") ? `<span class="ktag e">Exam</span>` : "";
    return `<li${x.kinds?.includes("formula") ? ' class="fx"' : ""}>${t}${tag}</li>`;
  };
  const secs = sm.sections || asSections(sm.bullets);
  const many = secs.length > 1;
  const body = secs.map(sc => `${many && sc.h ? `<h4 class="sumh">${esc(sc.h)}</h4>` : ""}<ul class="bul">${sc.items.map(li).join("")}</ul>`).join("");
  const terms = sm.terms && sm.terms.length ? `<div class="terms" aria-label="Key terms">${sm.terms.slice(0, 12).map(t => `<span>${esc(t)}</span>`).join("")}</div>` : "";
  const defs = sm.defs && sm.defs.length && !opts.noDefs ? `<details class="defs"><summary>Key definitions <span class="muted">(${sm.defs.length})</span></summary><dl>${sm.defs.map(d => `<div><dt>${esc(d.term)}</dt><dd>${esc(d.def)}</dd></div>`).join("")}</dl></details>` : "";
  const c = sm.coverage;
  let cov = "";
  if (c) {
    const secTxt = c.sections > 1 ? (c.sectionsCovered === c.sections ? `all ${c.sections} sections` : `${c.sectionsCovered} of ${c.sections} sections`) : "";
    const termTxt = c.terms ? (c.termsCovered === c.terms ? `all ${c.terms} key terms` : `${c.termsCovered} of ${c.terms} key terms`) : "";
    const what = [secTxt, termTxt].filter(Boolean).join(" and ");
    cov = `<p class="cov tiny">${ico("check")}<span>${what ? `Covers ${what}` : "Covers your notes"} · ${c.vocab}% of the important words.${c.vocab < 85 && c.missed.length ? ` Not in the summary: ${c.missed.map(esc).join(", ")}. Check your notes for these.` : ""}</span></p>`;
  }
  const ex = sm.examples && sm.examples.length && !opts.noEx ? `<details class="defs exs" ${opts.openEx ? "open" : ""}><summary>Examples from your notes <span class="muted">(${sm.examples.length})</span></summary><ul class="bul">${sm.examples.map(x => `<li>${esc(x.t)}${x.h ? `<span class="tiny muted ex-from">${esc(x.h)}</span>` : ""}</li>`).join("")}</ul></details>` : "";
  return body + terms + defs + ex + (opts.noCov ? "" : cov);
}
const sumCache = new Map();
/* a summary only if it is already made: lets big lists skip the work of summarising thousands of topics */
const summaryPeek = id => leafIds.length > 400 ? (sumCache.get(id + ":" + notesOf(id).length + (SUM_DETAIL ? ":d" : "")) || null) : summaryOf(id);
function summaryOf(id) {
  const e = S.content.explain[id];
  if (e && e.summary) { const bullets = Array.isArray(e.summary) ? e.summary : String(e.summary).split(/\n+/).filter(Boolean); return { bullets, sections: asSections(bullets), terms: [], defs: [], source: "written" }; }
  const n = notesOf(id), key = id + ":" + n.length + (SUM_DETAIL ? ":d" : "");
  if (sumCache.has(key)) return sumCache.get(key);
  let r = n ? summarize(n, nodes[id].title, undefined, SUM_DETAIL) : null;
  if (!r && e && (e.uni || e.simple)) { const bullets = [e.simple, e.uni, e.exam].filter(Boolean); r = { bullets, sections: asSections(bullets), terms: [], defs: [], source: "explain" }; }
  sumCache.set(key, r); return r;
}

/* ---------- Listen: podcast episodes spoken by the device voice ---------- */
const TTS = window.speechSynthesis || null;
const P_ = { ep: null, i: 0, playing: false, rate: 1, voice: null, timer: null, started: 0 };
try { const r = parseFloat(localStorage.getItem("studydesk.rate")); if (r) P_.rate = r; } catch (e) { }
function pickVoice() {
  if (!TTS) return null;
  const vs = TTS.getVoices().filter(v => /^en/i.test(v.lang));
  let pref = null; try { pref = localStorage.getItem("studydesk.voice"); } catch (e) { }
  return vs.find(v => v.name === pref) || vs.find(v => /natural|enhanced|premium|neural/i.test(v.name) && /GB|US|AU|ZA/.test(v.lang)) || vs.find(v => /Google UK English Female|Samantha|Karen|Daniel|Serena/i.test(v.name)) || vs.find(v => /en-(GB|ZA|AU)/i.test(v.lang)) || vs[0] || null;
}
if (TTS) { TTS.onvoiceschanged = () => { P_.voice = pickVoice(); }; P_.voice = pickVoice(); }
const chunk = t => { const out = []; String(t).replace(/\s+/g, " ").split(/(?<=[.!?;])\s+/).forEach(s => { while (s.length > 220) { const k = s.lastIndexOf(",", 220) > 80 ? s.lastIndexOf(",", 220) + 1 : s.lastIndexOf(" ", 220); out.push(s.slice(0, k).trim()); s = s.slice(k).trim(); } if (s) out.push(s); }); return out.reduce((m, s) => { if (m.length && m[m.length - 1].length < 14 && m[m.length - 1].length + s.length <= 240) m[m.length - 1] += " " + s; else m.push(s); return m; }, []); };
function buildEpisode(title, subtitle, leafList, opts = {}) {
  const segs = [], add = (text, kind = "body", extra = {}) => chunk(text).forEach(c => segs.push({ text: c, kind, ...extra }));
  const pause = ms => segs.push({ kind: "pause", ms, text: "" });
  add(opts.intro || `Welcome to Study Desk. This episode is ${title}. ${leafList.length} topic${leafList.length === 1 ? "" : "s"}.`, "intro");
  pause(600);
  leafList.forEach((id, k) => {
    const n = nodes[id]; if (!n) return;
    add(`${k === 0 ? "First" : k === leafList.length - 1 && k > 0 ? "Finally" : "Next"}: ${n.title}.`, "title", { node: id });
    pause(350);
    const sm = summaryOf(id);
    if (sm) {
      (sm.sections || asSections(sm.bullets)).forEach((sc, k) => { if (sc.h && (sm.sections.length > 1)) { if (k) pause(300); add(sc.h + ".", "title", { node: id }); } add(sc.items.map(x => x.t).join(" "), "body", { node: id }); });
      const kt = [...new Set([...(sm.defs || []).map(d => d.term), ...(sm.terms || [])].map(t => t.toLowerCase()))].slice(0, 8);
      if (kt.length > 2) { pause(400); add(`Key terms to remember: ${kt.slice(0, -1).join(", ")} and ${kt[kt.length - 1]}.`, "body", { node: id }); }
    }
    else add(`There are no notes for this topic yet. It covers pages ${n.p1} to ${n.p2}. Add notes or import the chapter to hear a summary here.`, "body", { node: id });
    const q = QS.find(q => q.node === id);
    if (q && opts.questions !== false) {
      pause(500);
      add(`Quick question. ${q.q}`, "q", { node: id });
      q.o.forEach((o, i) => add(`${"ABCD"[i]}: ${o}.`, "q", { node: id }));
      pause(3500);
      add(`The answer is ${"ABCD"[q.a]}: ${q.o[q.a]}. ${q.e || ""}`, "a", { node: id });
    }
    pause(700);
  });
  add(opts.outro || "That's the end of this episode. Well done for putting in the time.", "outro");
  const wordsN = segs.reduce((a, s) => a + (s.text ? s.text.split(" ").length : 0), 0);
  return { id: opts.id || newId("ep"), title, subtitle, segs, mins: Math.max(1, Math.round(wordsN / 155)), nodes: leafList };
}
function weekScript() {
  const t = todayKey(), w = weekStats(addDays(t, -6), t), prev = weekStats(addDays(t, -13), addDays(t, -7));
  const parts = [`Here is your study week.`];
  parts.push(w.sessions ? `In the last seven days you finished ${w.sessions} study sessions, about ${fmtMins(w.mins)} of focused work, on ${w.days} different days.` : `You haven't logged any study sessions in the last seven days yet.`);
  if (prev.mins) parts.push(w.mins >= prev.mins ? `That's more than the week before, when you did ${fmtMins(prev.mins)}.` : `That's a little less than the week before, when you did ${fmtMins(prev.mins)}.`);
  if (w.answered) parts.push(`You answered ${w.answered} practice questions and got ${w.right} right, which is ${pct(w.right / w.answered)} percent.`);
  const sk = streak(); if (sk > 1) parts.push(`You're on a ${sk} day study streak.`);
  DSUBJ.filter(s => daysLeft(s.id) >= 0).sort((a, b) => daysLeft(a.id) - daysLeft(b.id)).forEach(s => parts.push(`${s.name}: ${pct(progress(s.id))} percent done, exam in ${daysLeft(s.id)} days.`));
  const focus = leafIds.map(id => ({ id, ...scoreParts(id, t) })).filter(x => x.level !== "done").sort((a, b) => b.total - a.total).slice(0, 3);
  if (focus.length) parts.push(`Next, focus on ${focus.map(f => nodes[f.id].title).join(", ")}.`);
  parts.push("Keep going. Small sessions every day add up.");
  return parts.join(" ");
}
function episodeFor(kind, arg) {
  const t = todayKey();
  if (kind === "today") { const ids = [...new Set(tasksOn(t).filter(x => x.type !== "mock").map(x => x.node))]; return buildEpisode("Today's topics", fmtD(t, { weekday: "long", day: "numeric", month: "long" }), ids, { id: "today", intro: `Welcome to Study Desk. Here are today's ${ids.length} topics, so you can listen before you start.` }); }
  if (kind === "topic") { const n = nodes[arg]; const ids = leavesUnder(arg); return buildEpisode(n.title, subjects[n.subject].name + " · " + n.num, ids, { id: "topic:" + arg }); }
  if (kind === "week") { const segs = chunk(weekScript()).map(c => ({ text: c, kind: "body" })); return { id: "week", title: "Your week", subtitle: "A spoken summary of your work", segs, mins: Math.max(1, Math.round(segs.reduce((a, s) => a + s.text.split(" ").length, 0) / 155)), nodes: [] }; }
}
function speakNext() {
  clearTimeout(P_.timer);
  const ep = P_.ep; if (!ep || !P_.playing) return;
  if (P_.i >= ep.segs.length) { P_.playing = false; logEvent({ t: "listen", m: ep.mins }); save(); updatePlayer(); toast("Episode finished."); return; }
  const s = ep.segs[P_.i]; updatePlayer();
  if (s.kind === "pause") { P_.timer = setTimeout(() => { P_.i++; speakNext(); }, s.ms / P_.rate); return; }
  const myI = P_.i;
  if (typeof NV !== "undefined" && NV.on() && !NV.failed) {
    NV.prefetch(ep.segs, P_.i);
    NV.speak(s.text, P_.rate, () => { if (P_.playing && P_.i === myI) { P_.i++; speakNext(); } },
      () => { /* fall back to the device voice rather than stopping the episode */ if (P_.i !== myI || NV.failed) return; NV.failed = true; toast("The natural voice isn't ready, so this is the device voice. Connect to the internet once to finish the download."); if (P_.playing) speakNext(); });
    return;
  }
  const u = new SpeechSynthesisUtterance(s.text); u.rate = P_.rate; if (P_.voice) { u.voice = P_.voice; u.lang = P_.voice.lang; } else u.lang = "en-GB";
  u.onend = () => { if (P_.playing && P_.i === myI) { P_.i++; speakNext(); } };
  u.onerror = e => { if (e.error === "interrupted" || e.error === "canceled") return; P_.playing = false; updatePlayer(); };
  TTS.speak(u);
}
const stopSpeech = () => { TTS && TTS.cancel(); typeof NV !== "undefined" && NV.stop(); };
function playEpisode(ep, from = 0) {
  if (typeof NV !== "undefined" && NV.on()) NV.unlock();
  else if (!TTS) { toast("This browser can't read aloud. Try Chrome, Edge or Safari."); return; }
  RP.stop();
  stopSpeech(); P_.ep = ep; P_.i = from; P_.playing = true; P_.started = Date.now(); speakNext(); updatePlayer();
}
function playerToggle() { if (!P_.ep) return; if (P_.playing) { P_.playing = false; stopSpeech(); clearTimeout(P_.timer); } else { P_.playing = true; typeof NV !== "undefined" && NV.on() && NV.unlock(); speakNext(); } updatePlayer(); }
function playerSeek(d) { if (!P_.ep) return; let i = P_.i + d; const segs = P_.ep.segs; while (segs[i] && segs[i].kind === "pause") i += d > 0 ? 1 : -1; P_.i = clamp(i, 0, segs.length - 1); stopSpeech(); if (P_.playing) setTimeout(speakNext, 60); else updatePlayer(); }
function playerStop() { P_.playing = false; P_.ep = null; stopSpeech(); clearTimeout(P_.timer); updatePlayer(); }
function setRate(r) { P_.rate = r; try { localStorage.setItem("studydesk.rate", r); } catch (e) { } if (P_.playing) { stopSpeech(); setTimeout(speakNext, 60); } updatePlayer(); }

/* mini player bar (always visible while an episode is loaded) */
function updatePlayer() {
  let bar = $("#player");
  const ep = P_.ep;
  document.documentElement.classList.toggle("has-player", !!ep);
  if (!ep) { bar && bar.remove(); return; }
  if (!bar) { bar = document.createElement("div"); bar.id = "player"; bar.className = "player"; document.body.appendChild(bar); }
  const seg = ep.segs[Math.min(P_.i, ep.segs.length - 1)], prog = ep.segs.length ? P_.i / ep.segs.length : 0;
  bar.innerHTML = `<div class="pl-prog" style="transform:scaleX(${prog})"></div>
    <button class="pl-main" data-go="episode" aria-label="Open player"><span class="eq ${P_.playing ? "on" : ""}" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="grow"><b>${esc(ep.title)}</b><span class="tiny muted">${esc(seg && seg.text ? seg.text : ep.subtitle || "")}</span></span></button>
    <button class="pl-btn" data-action="pl-toggle" aria-label="${P_.playing ? "Pause" : "Play"}">${P_.playing ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'}</button>
    <button class="pl-btn" data-action="pl-stop" aria-label="Close player">${ico("x")}</button>`;
  if (stack[stack.length - 1].v === "episode") { const cur = $(`.tline[data-i="${P_.i}"]`); $$(".tline.cur").forEach(x => x !== cur && x.classList.remove("cur")); if (cur && !cur.classList.contains("cur")) { cur.classList.add("cur"); cur.scrollIntoView({ block: "center", behavior: FX.on ? "smooth" : "auto" }); } const pb = $("#ep-play"); if (pb) pb.innerHTML = P_.playing ? "Pause" : "Play"; }
}

/* ---------- recordings: lectures or podcasts she adds, kept on the device ---------- */
const RP = {
  el: null, cur: null, lastSave: 0,
  async play(id) {
    playerStop();
    const r = await IDB.get("audio", id); if (!r || !r.blob) { toast("Couldn't open that recording."); return; }
    if (this.el) { this.el.pause(); URL.revokeObjectURL(this.el.src); }
    const a = this.el = new Audio(URL.createObjectURL(r.blob)); this.cur = r;
    a.playbackRate = P_.rate; a.currentTime = r.pos || 0;
    a.ontimeupdate = () => { const now = Date.now(); if (now - this.lastSave > 4000) { this.lastSave = now; r.pos = a.currentTime; IDB.put("audio", r); const m = RECS.find(x => x.id === id); if (m) m.pos = a.currentTime; } const bar = $("#rec-prog-" + id); if (bar && a.duration) bar.style.transform = `scaleX(${a.currentTime / a.duration})`; const t = $("#rec-time-" + id); if (t) t.textContent = fmtClock(a.currentTime) + " / " + fmtClock(a.duration || 0); };
    a.onended = () => { r.pos = 0; IDB.put("audio", r); logEvent({ t: "listen", m: Math.round((a.duration || 0) / 60) }); save(); rerender(); };
    a.onloadedmetadata = () => { if (!r.dur) { r.dur = a.duration; IDB.put("audio", r); const m = RECS.find(x => x.id === id); if (m) m.dur = a.duration; } };
    try { await a.play(); } catch (e) { toast(TAP + " play again to start the recording."); }
    if ("mediaSession" in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: r.name, artist: "Study Desk", album: subjects[r.subject]?.name || "Recordings" }); }
    rerender();
  },
  toggle() { if (!this.el) return; this.el.paused ? this.el.play() : this.el.pause(); setTimeout(rerender, 50); },
  skip(s) { if (this.el) this.el.currentTime = clamp(this.el.currentTime + s, 0, this.el.duration || 1e9); },
  stop() { if (this.el) { this.el.pause(); } }
};
const fmtClock = s => { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + pad(s % 60); };
async function addRecording(file, sid) {
  if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|wav|aac|ogg|opus|webm)$/i.test(file.name)) { toast("Choose an audio file, like an MP3 or M4A."); return; }
  if (file.size > 300e6) { toast("That recording is over 300 MB. Try a shorter file."); return; }
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { }
  const r = { id: newId("a"), name: file.name.replace(/\.\w+$/, ""), subject: sid || "", size: file.size, added: Date.now(), pos: 0, dur: 0, transcript: "", blob: file };
  try { await IDB.put("audio", r); RECS.unshift({ ...r, blob: undefined }); toast("Recording added."); rerender(); }
  catch (e) { toast("Couldn't save that recording. Your device may be out of space."); }
}

/* ---------- views ---------- */
V.listen = () => {
  const t = todayKey(), todayIds = [...new Set(tasksOn(t).filter(x => x.type !== "mock").map(x => x.node))];
  const playing = id => P_.ep && P_.ep.id === id;
  const epCard = (id, title, sub, action, extra = "", big = false) => `<button class="ep ${big ? "big" : ""} ${playing(id) ? "on" : ""}" data-action="ep-play" data-kind="${action}" ${extra}><span class="ep-art" aria-hidden="true"><span class="eq ${playing(id) && P_.playing ? "on" : ""}"><i></i><i></i><i></i><i></i></span></span><span class="grow"><b>${esc(title)}</b><span class="tiny muted">${esc(sub)}</span></span><span class="ep-go">${playing(id) && P_.playing ? "Playing" : "Play"}</span></button>`;
  return `<div class="stack" style="gap:22px">
    <header class="subhead"><div class="eyebrow">Listen</div><h1>Study podcasts</h1><p class="muted">Episodes are made from your notes and read aloud by your device. Good for the bus, the gym or a walk.</p></header>
    ${!TTS ? `<div class="banner">${ico("info")}<div>This browser can't read aloud. Your recordings below still play.</div></div>` : ""}
    <section class="section">
      ${todayIds.length ? epCard("today", "Today's topics", `${todayIds.length} topics from today's plan`, "today", "", true) : ""}
      ${epCard("week", "Your week", "A spoken summary of your study week", "week")}
    </section>
    <section class="section"><div class="sec-head"><h2>By chapter</h2></div>
      ${DSUBJ.length ? DSUBJ.map(s => `<details class="card subj-ep" ${s === DSUBJ[0] ? "open" : ""}><summary class="row"><span class="mark" style="--pc:${subjColor(s.id)}"></span><b class="grow">${esc(s.name)}</b>${ico("chev", 'class="caret"')}</summary>
        <div class="stack" style="gap:8px;margin-top:10px">${s.chapterIds.map(cid => { const c = nodes[cid], n = leavesUnder(cid).length, withNotes = leavesUnder(cid).filter(hasSum).length; return epCard("topic:" + cid, `Ch ${c.num} · ${c.title}`, `${n} topics · ${withNotes ? withNotes + " with notes" : "no notes yet"}`, "topic", `data-id="${cid}"`); }).join("")}
        <button class="btn btn-line btn-sm" data-go="summary:${s.id}" style="align-self:flex-start">Read the ${esc(s.name)} summary</button></div></details>`).join("") : `<div class="card empty">Episodes appear here once you <button class="link" data-go="import">import a file</button> with your notes.</div>`}
    </section>
    <section class="section"><div class="sec-head"><h2>My recordings</h2></div>
      <div class="card stack" style="gap:10px">
        <p class="small muted">Add lecture recordings or podcast episodes. They stay on this device and remember where you stopped.</p>
        <div class="row" style="flex-wrap:wrap"><label class="btn btn-soft" for="rec-file">${ico("upload")}Add a recording</label><input type="file" id="rec-file" class="sr" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.opus">
        ${DSUBJ.length ? `<label class="sr" for="rec-subj">Subject</label><select id="rec-subj" class="mini-select"><option value="">No subject</option>${DSUBJ.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>` : ""}</div>
      </div>
      ${RECS.length ? `<div class="list">${RECS.map(r => { const on = RP.cur && RP.cur.id === r.id, paused = !RP.el || RP.el.paused; return `<div class="rec ${on ? "on" : ""}">
        <div class="row"><button class="pl-btn ${on && !paused ? "act" : ""}" data-action="rec-play" data-id="${r.id}" aria-label="${on && !paused ? "Pause" : "Play"} ${esc(r.name)}">${on && !paused ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'}</button>
          <span class="grow"><b>${esc(r.name)}</b><span class="tiny muted" id="rec-time-${r.id}">${r.subject && subjects[r.subject] ? esc(subjects[r.subject].name) + " · " : ""}${r.dur ? fmtClock(r.pos) + " / " + fmtClock(r.dur) : (r.size >= 1e6 ? (r.size / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(r.size / 1e3)) + " KB")}</span></span>
          ${on ? `<button class="oa" data-action="rec-skip" data-s="-15" aria-label="Back 15 seconds">−15</button><button class="oa" data-action="rec-skip" data-s="30" aria-label="Forward 30 seconds">+30</button>` : ""}
          <button class="oa" data-action="rec-more" data-id="${r.id}" aria-label="Summary and options">${ico("chev")}</button></div>
        <div class="rec-bar"><i id="rec-prog-${r.id}" style="transform:scaleX(${r.dur ? (r.pos || 0) / r.dur : 0})"></i></div></div>`; }).join("")}</div>` : ""}
    </section>
    <section class="card stack" style="gap:8px"><div class="row"><span class="small grow">Speed</span><div class="segctl">${[0.8, 1, 1.25, 1.5].map(r => `<button role="radio" aria-checked="${P_.rate === r}" data-action="pl-rate" data-r="${r}">${r}×</button>`).join("")}</div></div>
      ${TTS && TTS.getVoices().filter(v => /^en/i.test(v.lang)).length > 1 ? `<div class="row"><label class="small grow" for="voice-pick">Voice</label><select id="voice-pick" class="mini-select">${TTS.getVoices().filter(v => /^en/i.test(v.lang)).map(v => `<option ${P_.voice && P_.voice.name === v.name ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></div>` : ""}
      <p class="tiny muted">Tip: on iPhone, better voices are in Settings → Accessibility → Spoken Content → Voices.</p></section>
  </div>`;
};
V.episode = () => {
  const ep = P_.ep; if (!ep) return V.listen();
  return `<div class="stack" style="gap:18px">
    <header class="subhead"><div class="eyebrow">Now playing · about ${ep.mins} min</div><h1>${esc(ep.title)}</h1><p class="muted">${esc(ep.subtitle || "")}</p></header>
    <div class="card stack nowplay"><div class="wave ${P_.playing ? "on" : ""}" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--k:${i}"></i>`).join("")}</div>
      <div class="row" style="justify-content:center;gap:14px"><button class="icon-btn" data-action="pl-seek" data-d="-1" aria-label="Back">${ico("left")}</button><button class="btn btn-pen" id="ep-play" data-action="pl-toggle" style="min-width:120px">${P_.playing ? "Pause" : "Play"}</button><button class="icon-btn" data-action="pl-seek" data-d="1" aria-label="Forward">${ico("chev")}</button></div>
      <div class="row" style="justify-content:center"><div class="segctl">${[0.8, 1, 1.25, 1.5].map(r => `<button role="radio" aria-checked="${P_.rate === r}" data-action="pl-rate" data-r="${r}">${r}×</button>`).join("")}</div></div></div>
    <section class="section"><div class="sec-head"><h2>Transcript</h2><span class="tiny muted">${TAP} a line to jump there</span></div>
      <div class="card transcript">${ep.segs.map((s, i) => s.kind === "pause" ? "" : `<button class="tline k-${s.kind} ${i === P_.i ? "cur" : ""}" data-action="pl-jump" data-i="${i}">${esc(s.text)}</button>`).join("")}</div></section>
  </div>`;
};
V.summary = sid => {
  const s = subjects[sid]; if (!s) return V.listen();
  const leaves = leavesBySubject[sid], have = leaves.filter(l => hasSum(l.id)).length;
  return `<div class="stack" style="gap:20px">
    <header class="subhead"><div class="eyebrow">${esc(s.name)} · summary</div><h1>Everything in ${esc(s.name)}</h1>
      <p class="muted">${have} of ${leaves.length} topics have notes to summarise.${have < leaves.length ? " Import the textbook PDF or add notes to fill in the rest." : ""}</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen btn-sm" data-action="ep-play" data-kind="topic" data-id="${s.chapterIds[0] || ""}" ${s.chapterIds.length ? "" : "disabled"}>${ico("spark")}Listen from chapter 1</button></div></header>
    ${leaves.length <= SUM_LAZY ? s.chapterIds.map(cid => { const c = nodes[cid]; return `<section class="card stack sumch"><div class="sec-head"><h2 class="h3">Chapter ${c.num} · ${esc(c.title)}</h2><button class="link small" data-action="ep-play" data-kind="topic" data-id="${cid}">Listen</button></div>
      ${sumChHTML(cid)}</section>`; }).join("")
    /* big books: one folded card per chapter, summarised only when opened, so the page opens at once */
    : `<p class="small muted">${s.chapterIds.length} chapters. Open a chapter to read its summary.</p>` + s.chapterIds.map((cid, i) => { const c = nodes[cid], ls = leavesUnder(cid), w = ls.filter(hasSum).length; return `<details class="card sumch sumch-f" data-sumch="${cid}" ${i === 0 ? "open" : ""}><summary class="row"><span class="grow"><b class="h3">Chapter ${c.num} · ${esc(c.title)}</b><span class="tiny muted">${ls.length} topic${ls.length === 1 ? "" : "s"}${w < ls.length ? ` · ${w} with notes` : ""}</span></span>${ico("chev", 'class="caret"')}</summary><div class="sumch-in stack">${i === 0 ? `<p class="tiny muted">Summarising this chapter…</p>` : ""}</div></details>`; }).join("") + (setTimeout(sumFillOpen, 30), "")}
  </div>`;
};
const SUM_LAZY = 80, hasSum = id => !!(notesOf(id) || (S.content.explain[id] && (S.content.explain[id].summary || S.content.explain[id].uni || S.content.explain[id].simple)));
function sumChHTML(cid, listen) {
  return (listen ? `<button class="link small" data-action="ep-play" data-kind="topic" data-id="${cid}" style="align-self:flex-start">Listen to this chapter</button>` : "") +
    leavesUnder(cid).map(l => { const n = nodes[l], sm = summaryOf(l); return `<div class="sumtopic"><button class="sumt" data-go="topic:${l}"><span class="onum">${n.num}</span>${esc(n.title)}<span class="pages">pp ${n.p1}–${n.p2}</span></button>${sm ? sumHTML(sm, { noCov: true }) : `<p class="tiny muted">No notes yet.</p>`}</div>`; }).join("");
}
function sumFill(d) { const box = d.querySelector(".sumch-in"); if (!box || box.dataset.done) return; box.dataset.done = "1"; box.innerHTML = sumChHTML(d.dataset.sumch, true); typeof mathify === "function" && mathify(box); }
function sumFillOpen() { $$("details[data-sumch][open]").forEach(sumFill); }
document.addEventListener("toggle", e => { const d = e.target; if (d.matches && d.matches("details[data-sumch]") && d.open) sumFill(d); }, true);
function weekView() {
  const t = todayKey(), from = addDays(t, -6), w = weekStats(from, t), prev = weekStats(addDays(t, -13), addDays(t, -7)), sk = streak();
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)), perDay = days.map(d => S.log.filter(e => e.d === d && (e.t === "task" || e.t === "listen")).reduce((a, e) => a + (e.m || 0), 0)), mx = Math.max(30, ...perDay);
  const delta = prev.mins ? Math.round((w.mins - prev.mins) / prev.mins * 100) : null;
  const focus = leafIds.map(id => ({ id, ...scoreParts(id, t) })).filter(x => x.level !== "done").sort((a, b) => b.total - a.total).slice(0, 3);
  const ring = (p, col) => { const c = 2 * Math.PI * 26; return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--sunken)" stroke-width="7"/><circle class="ring-v" cx="32" cy="32" r="26" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" style="--c:${c};stroke:${col}" transform="rotate(-90 32 32)"/></svg>`; };
  return `<section class="week stack" style="gap:16px">
    <div class="week-hero"><div class="eyebrow mono">${fmtD(from, { day: "numeric", month: "short" })} – ${fmtD(t, { day: "numeric", month: "short" })}</div>
      <h2 class="week-h">${w.mins ? `You studied <b data-countmin="${w.mins}">${fmtMins(w.mins)}</b> this week` : "A fresh week starts now"}</h2>
      <p class="muted">${w.sessions} sessions on ${w.days} day${w.days === 1 ? "" : "s"}${delta !== null ? ` · ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)}% on last week` : ""}${sk > 1 ? ` · ${sk}-day streak` : ""}</p>
      <button class="btn btn-hl btn-sm" data-action="ep-play" data-kind="week" style="align-self:flex-start">${ico("spark")}Listen to your week</button></div>
    <div class="tiles">
      <div class="tile"><b data-count-up="${w.sessions}">${w.sessions}</b><span>sessions done</span></div>
      <div class="tile"><b data-count-up="${w.answered}">${w.answered}</b><span>questions answered${w.answered ? ` · ${pct(w.right / w.answered)}% right` : ""}</span></div>
      <div class="tile"><b data-count-up="${w.steps}">${w.steps}</b><span>topics moved up a stage</span></div>
      <div class="tile"><b data-count-up="${w.listens}">${w.listens}</b><span>episodes listened to</span></div>
    </div>
    <div class="card stack" style="gap:10px"><div class="sec-head"><h2 class="h3">Last 14 days</h2><span class="tiny muted">minutes studied</span></div>
      <div class="bars" role="img" aria-label="Minutes studied per day for the last 14 days">${days.map((d, i) => `<div class="bar ${d === t ? "today" : ""}"><i style="height:${Math.max(3, perDay[i] / mx * 100)}%;--k:${i}" title="${fmtD(d)}: ${perDay[i]} min"></i><span>${parseKey(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</span></div>`).join("")}</div></div>
    <div class="subj-rings">${DSUBJ.map(s => { const p = progress(s.id), m = w.subj[s.id] || 0, d = daysLeft(s.id); return `<button class="card sring" data-go="subject:${s.id}">${ring(p, subjColor(s.id))}<span class="grow"><b>${esc(s.name)}</b><span class="tiny muted">${pct(p)}% done · ${m ? fmtMins(m) + " this week" : "not studied this week"}</span><span class="tiny ${d >= 0 && d <= 10 ? "warn" : "muted"}">${d < 0 ? "Exam finished" : d === 0 ? "Exam today" : `Exam in ${d} day${d === 1 ? "" : "s"}`}</span></span></button>`; }).join("")}</div>
    ${focus.length ? `<div class="card stack" style="gap:6px"><h2 class="h3">Focus next</h2>${focus.map(f => `<button class="item" data-go="topic:${f.id}" style="--pc:${PRC[f.level]};padding-inline:0"><span class="mark"></span><span class="grow"><span class="t">${esc(nodes[f.id].title)}</span><br><span class="s">${esc(subjects[nodes[f.id].subject].name)} · ${f.parts[0][0]}</span></span>${ico("chev", 'class="chev"')}</button>`).join("")}</div>` : ""}
  </section>`;
}
function openNotesSheet(id) {
  const n = nodes[id];
  openSheet("Notes for " + n.title, `${sheetHead(subjects[n.subject].name + " · " + n.num, "Notes: " + n.title)}
    <div class="stack form"><p class="small muted">Paste or type notes for this topic. Summaries and podcast episodes are made from them. Kept on this device.</p>
      <div class="md-bar" role="toolbar" aria-label="Formatting"><button data-action="md-h" aria-label="Heading"><b>H</b></button><button data-action="md-b" aria-label="Bold"><b>B</b></button><button data-action="md-i" aria-label="Italic"><i>I</i></button><button data-action="md-li" aria-label="Bullet point">•</button><button data-action="md-math" aria-label="Formula">${ico("sigma")}</button><span class="grow"></span><button class="md-pv" data-action="md-preview" aria-pressed="false">Preview</button></div>
      <label class="sr" for="notes-text">Notes</label><textarea id="notes-text" rows="10" class="notes-ta" placeholder="Paste notes, a lecture transcript or textbook text here">${esc(notesOf(id))}</textarea><div id="notes-preview" class="md notes-pv" data-md="preview" hidden></div><p class="tiny muted" style="margin:-4px 0 0">Tip: start a line with ## for a heading, wrap words in **stars** for bold, and write formulas between $ signs, like $E = mc^2$.</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="notes-save" data-id="${id}">Save notes</button><label class="btn btn-soft" for="ocr-file">${ico("camera")}Snap a page</label><input type="file" id="ocr-file" class="sr" accept="image/*" capture="environment" multiple></div>
      <div class="lock ocr-status" id="ocr-status" role="status"><span class="tiny muted">Snap a page photographs printed text (a textbook or handout) and turns it into notes. It's read on this device.</span></div></div>`);
}
function openRecSheet(id) {
  const r = RECS.find(x => x.id === id); if (!r) return;
  const sm = r.transcript ? summarize(r.transcript, r.name) : null;
  openSheet(r.name, `${sheetHead("Recording", r.name)}
    <div class="stack form">
      ${sm ? `<div class="card stack" style="gap:8px;box-shadow:none;background:var(--sunken)"><h3 class="h3">Summary</h3>${sumHTML(sm)}<p class="tiny muted">Every line is taken from the transcript, nothing is made up.</p></div>` : ""}
      <label class="fld"><span>Transcript or notes</span><textarea id="rec-tr" rows="6" placeholder="Paste the episode's transcript or your notes to get a summary">${esc(r.transcript || "")}</textarea></label>
      <p class="tiny muted">Many podcasts publish a transcript you can paste here.</p>
      ${typeof sttHTML === "function" ? sttHTML(r) : ""}
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="rec-save" data-id="${id}">Save and summarise</button><button class="btn btn-line btn-sm" data-action="rec-del" data-id="${id}">Delete recording</button></div></div>`);
}
async function v3Action(act, a) {
  const id = a.dataset.id;
  switch (act) {
    case "ep-play": { const k = a.dataset.kind; if (k === "topic" && !nodes[id]) return true; const ep = episodeFor(k, id); if (!ep.segs.length) return true; playEpisode(ep); if (stack[stack.length - 1].v !== "episode") go("episode"); return true; }
    case "pl-toggle": playerToggle(); if (stack[stack.length - 1].v === "listen") rerender(); return true;
    case "pl-stop": playerStop(); if (["episode", "listen"].includes(stack[stack.length - 1].v)) rerender(); return true;
    case "pl-seek": playerSeek(+a.dataset.d); return true;
    case "pl-jump": P_.i = +a.dataset.i; stopSpeech(); if (!P_.playing) P_.playing = true; setTimeout(speakNext, 60); return true;
    case "pl-rate": setRate(+a.dataset.r); if (RP.el) RP.el.playbackRate = P_.rate; $$(`[data-action="pl-rate"]`).forEach(b => b.setAttribute("aria-checked", +b.dataset.r === P_.rate)); return true;
    case "rec-play": if (RP.cur && RP.cur.id === id) RP.toggle(); else await RP.play(id); return true;
    case "rec-skip": RP.skip(+a.dataset.s); return true;
    case "rec-more": openRecSheet(id); return true;
    case "rec-save": { const r = await IDB.get("audio", id); if (!r) return true; r.transcript = ($("#rec-tr")?.value || "").slice(0, 2000000); await IDB.put("audio", r); const m = RECS.find(x => x.id === id); if (m) m.transcript = r.transcript; openRecSheet(id); toast(r.transcript.trim() ? "Saved. Summary below." : "Saved."); return true; }
    case "rec-del": if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to delete"; return true; } if (RP.cur && RP.cur.id === id) { RP.stop(); RP.cur = null; } await IDB.del("audio", id); RECS = RECS.filter(x => x.id !== id); closeSheet(); rerender(); toast("Recording deleted."); return true;
    case "notes": openNotesSheet(id); return true;
    case "notes-save": await saveNotes(id, $("#notes-text")?.value || ""); closeSheet(); rerender(); toast("Notes saved. Summary, flashcards and podcast are updated."); return true;
  }
  return false;
}

const V3_ACTS = new Set(["ep-play","pl-toggle","pl-stop","pl-seek","pl-jump","pl-rate","rec-play","rec-skip","rec-more","rec-save","rec-del","notes","notes-save"]);

/* =====================================================================
   8d. FOCUS TIMER, SEARCH, BACKUP REMINDER, SAFETY NETS
   ===================================================================== */
const FKEY = "studydesk.focus", MKEY = "studydesk.meta";
let F = null, fTick = null, wakeLock = null;
let META = (() => { try { return JSON.parse(ls.get(MKEY) || "null") || {}; } catch (e) { return {}; } })();
if (!META.first) { META.first = Date.now(); }
function metaSave() { ls.set(MKEY, JSON.stringify(META)); }
metaSave();
function markBackup() { META.last = Date.now(); metaSave(); }
function backupDue() {
  const day = 864e5, since = Date.now() - Math.max(META.last || 0, META.first || 0, META.snooze || 0);
  const used = S.contentEdited || S.log.some(e => e.d >= addDays(todayKey(), -14) && !e.seed);
  return used && since > 14 * day;
}
const FOCUS_TIP = {
  learn: "Read actively. At the end, close the book and say the main idea out loud.",
  recall: "Close your notes. Write down everything you remember, then check what you missed.",
  practice: "Answer without notes first, then mark your answers.",
  calc: "Work each problem step by step, then check the answer.",
  revision: "Skim your notes, then test yourself on the key terms.",
  mock: "Exam conditions: no notes, no phone, keep to the time."
};
const fLeft = () => !F ? 0 : F.paused ? F.left : Math.max(0, F.end - Date.now());
function focusSave() { if (F) ls.set(FKEY, JSON.stringify(F)); else ls.del(FKEY); }
function focusLoad() {
  try { const o = JSON.parse(ls.get(FKEY) || "null"); if (o && o.tid && o.total > 0 && S.tasks.some(t => t.id === o.tid && !t.done)) F = o; else ls.del(FKEY); } catch (e) { ls.del(FKEY); }
}
function focusStart(tid) {
  const t = S.tasks.find(x => x.id === tid); if (!t || t.done) return;
  if (!F || F.tid !== tid) { const total = clamp(t.dur, 5, 240) * 60000; F = { tid, total, end: Date.now() + total, left: total, paused: false, done: false }; }
  focusSave(); openFocus();
}
async function keepAwake(on) {
  try {
    if (on && !wakeLock && "wakeLock" in navigator && document.visibilityState === "visible") { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); }
    if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { wakeLock = null; }
}
function chime() {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return; const c = new C();
    [0, .18, .36].forEach((d, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = [660, 880, 990][i]; g.gain.setValueAtTime(.0001, c.currentTime + d); g.gain.exponentialRampToValueAtTime(.18, c.currentTime + d + .02); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d + .5); o.connect(g).connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + .55); });
    setTimeout(() => c.close(), 1500);
  } catch (e) { }
  try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (e) { }
}
const FR = 88, FC = 2 * Math.PI * FR;
function focusHTML() {
  const t = S.tasks.find(x => x.id === F.tid), n = nodes[t.node], s = subjects[t.subject], isMock = t.type === "mock", left = fLeft();
  return `<div class="focus" role="dialog" aria-modal="true" aria-label="Focus session" style="--pc:${subjColor(t.subject)}">
    <div class="row"><span class="tiny mono muted grow">${esc(s.name)} · ${TYPES[t.type].label} · ${t.dur} min</span><button class="icon-btn" data-f="min" aria-label="Minimise timer">${ico("x")}</button></div>
    <h2 class="focus-title">${esc(isMock ? s.name + " mock exam" : n.title)}</h2>
    <p class="muted small">${!isMock && n.p1 ? `Pages ${n.p1}–${n.p2}. ` : ""}${FOCUS_TIP[t.type] || ""}</p>
    <div class="focus-ring ${F.paused ? "paused" : ""} ${F.done ? "over" : ""}"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="${FR}" class="fr-bg"/><circle cx="100" cy="100" r="${FR}" class="fr-fg" id="fRing" stroke-dasharray="${FC.toFixed(1)}" stroke-dashoffset="${(FC * (1 - left / F.total)).toFixed(1)}"/></svg>
      <div class="focus-time"><b id="fTime">${fmtClock(Math.ceil(left / 1000))}</b><span class="tiny muted" id="fState">${F.done ? "Time's up. Nice work." : F.paused ? "Paused" : "Focus"}</span></div></div>
    <div class="row" style="justify-content:center;flex-wrap:wrap">${F.done ? "" : `<button class="btn btn-line" data-f="pause">${F.paused ? "Resume" : "Pause"}</button>`}<button class="btn btn-pen" data-f="finish">${ico("check")}Finished, mark done</button></div>
    <button class="link small" data-f="stop" style="align-self:center">Stop without marking done</button></div>`;
}
function drawFocus(enter) {
  let sc = $(".focus-scrim");
  if (!sc) { sc = document.createElement("div"); sc.className = "focus-scrim"; $("#layer").appendChild(sc); }
  sc.innerHTML = focusHTML();
  if (enter && FX.on) gsap.from($(".focus", sc), { y: 40, scale: .97, opacity: 0, duration: .5, ease: "expo.out" });
}
function openFocus() {
  closeSheet(true); drawFocus(true); keepAwake(!F.paused && !F.done);
  clearInterval(fTick); fTick = setInterval(focusTickFn, 250); focusTickFn();
  setTimeout(() => $(".focus [data-f=pause], .focus [data-f=finish]")?.focus({ preventScroll: true }), 80);
}
function focusTickFn() {
  if (!F) { clearInterval(fTick); return; }
  const left = fLeft();
  if (!F.done && !F.paused && left <= 0) { F.done = true; F.left = 0; focusSave(); chime(); keepAwake(false); if ($(".focus-scrim")) drawFocus(false); else { toast("Focus time is up. " + TAP + " Resume on Today to finish."); rerenderIfToday(); } return; }
  const tEl = $("#fTime"); if (tEl) { tEl.textContent = fmtClock(Math.ceil(left / 1000)); const r = $("#fRing"); if (r) r.setAttribute("stroke-dashoffset", (FC * (1 - left / F.total)).toFixed(1)); }
  if (!$(".focus-scrim") && !F.done) { const b = $(`.upnext [data-action=focus] .mono`); if (b) b.textContent = fmtClock(Math.ceil(left / 1000)); }
}
function rerenderIfToday() { if (stack[stack.length - 1].v === "today") rerender(); }
function closeFocus() { const sc = $(".focus-scrim"); if (!sc) return; if (FX.on) gsap.to(sc, { opacity: 0, duration: .22, onComplete: () => sc.remove() }); else sc.remove(); }
function focusAction(k) {
  if (!F) { closeFocus(); return; }
  if (k === "pause") {
    if (F.paused) { F.end = Date.now() + F.left; F.paused = false; keepAwake(true); } else { F.left = fLeft(); F.paused = true; keepAwake(false); }
    focusSave(); drawFocus(false); return;
  }
  if (k === "min") { closeFocus(); keepAwake(false); rerenderIfToday(); return; }
  const tid = F.tid; F = null; focusSave(); clearInterval(fTick); keepAwake(false); closeFocus();
  if (k === "finish") {
    const t = S.tasks.find(x => x.id === tid); if (!t || t.done) { rerenderIfToday(); return; }
    const press = () => { const b = $(`[data-action=toggle][data-id="${tid}"]`); if (b) b.click(); };
    if (stack[stack.length - 1].v === "today" || stack[stack.length - 1].v === "calendar") press(); else { go("today"); setTimeout(press, 450); }
    return;
  }
  rerenderIfToday();
}
document.addEventListener("visibilitychange", () => { if (F && !F.paused && !F.done && $(".focus-scrim") && document.visibilityState === "visible") { keepAwake(true); focusTickFn(); } });

/* ---------- search: every subject, chapter, heading and subheading, plus your notes ---------- */
function openSearch() {
  openSheet("Search", `${sheetHead("Find anything", "Search")}<div class="stack" style="gap:10px"><label class="sr" for="srch">Search topics</label><input id="srch" type="search" placeholder="Topic, heading or subject" autocomplete="off" enterkeyhint="search" spellcheck="false"><div id="srchRes" class="list srch-res"></div></div>`);
  drawSearch("");
}
const hiText = (t, q) => { const i = t.toLowerCase().indexOf(q); return i < 0 ? esc(t) : esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length)); };
function drawSearch(raw) {
  const el = $("#srchRes"); if (!el) return;
  const q = raw.trim().toLowerCase();
  if (!q) { el.innerHTML = `<p class="small muted" style="padding:6px 2px">Type part of a title. Your notes are searched too.${matchMedia("(pointer:fine)").matches ? " Press / anywhere to search." : ""}</p>`; return; }
  const hits = [];
  DSUBJ.forEach(s => { if (s.name.toLowerCase().includes(q)) hits.push({ go: "subject:" + s.id, title: s.name, sub: "Subject", sid: s.id, rank: 0 }); });
  Object.values(nodes).forEach(n => {
    const tl = n.title.toLowerCase(), inTitle = tl.includes(q);
    const inNotes = !inTitle && q.length > 2 && notesOf(n.id).toLowerCase().includes(q);
    if (!inTitle && !inNotes) return;
    hits.push({ go: (n.depth === 0 ? "chapter:" : "topic:") + n.id, title: n.title, sub: `${subjects[n.subject].name} · ${n.num}${n.p1 ? ` · pp ${n.p1}–${n.p2}` : ""}${inNotes ? " · found in your notes" : ""}`, sid: n.subject, rank: inNotes ? 3 : tl.startsWith(q) ? 1 : 2 });
  });
  hits.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
  renderHits(el, hits, q, raw);
  if (typeof fuzzySearch === "function" && q.length >= 3) fuzzySearch(q).then(fz => {
    if (!fz || ($("#srch") || {}).value !== raw) return;
    const seen = new Set(hits.map(h => h.go)), extra = fz.filter(h => !seen.has(h.go));
    if (extra.length) renderHits(el, [...hits, ...extra.map(h => ({ ...h, sub: h.sub + (hits.length ? "" : " · closest match") }))], q, raw);
  });
}
function renderHits(el, hits, q, raw) {
  el.innerHTML = hits.length ? hits.slice(0, 40).map(h => `<button class="item" data-sgo="${esc(h.go)}" style="--pc:${subjColor(h.sid)}"><span class="mark"></span><span class="grow"><span class="t">${hiText(h.title, q)}</span><br><span class="s">${esc(h.sub)}</span></span>${ico("chev", 'class="chev"')}</button>`).join("") + (hits.length > 40 ? `<p class="tiny muted">${hits.length - 40} more. Type more letters to narrow it down.</p>` : "")
    : `<p class="small muted" style="padding:6px 2px">Nothing matches “${esc(raw.trim())}”.</p>`;
}

/* ---------- safety nets: other open tabs, unexpected errors ---------- */
addEventListener("storage", e => {
  if (e.key !== KEY || !e.newValue || !S) return;
  try { const m = migrate(JSON.parse(e.newValue)); if (!m) return; const r = sanitize(m); S = r.state; buildModel(); if (!$(".scrim") && !$(".focus-scrim")) render(false); } catch (err) { }
});
let errShown = false;
function onFail(msg) { console.error(msg); if (errShown || !document.body) return; errShown = true; try { toast("Something didn't work. Your data is safe. If it keeps happening, reload the app."); } catch (e) { } }
addEventListener("error", e => { if (e.filename && !e.filename.startsWith(location.origin)) return; if (!e.message) return; onFail(e.message); });
addEventListener("unhandledrejection", e => onFail(e.reason && e.reason.message || String(e.reason)));

/* =====================================================================
   9. MOTION — GSAP (free, incl. Flip and SplitText) + View Transitions, all optional
   ===================================================================== */
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
const FX = {
  get on() { return !!window.gsap && !mqReduce.matches && S && S.settings.motion === "full"; },
  intro: true,
  colors: ["#3c4bd8", "#e6ea4f", "#e0533f", "#f0a53a", "#2fa36b"],
  burst(el, n = 26, spread = 60) {
    if (!this.on || !window.confetti || !el) return;
    const r = el.getBoundingClientRect();
    confetti({ particleCount: n, spread, startVelocity: 26, scalar: .75, ticks: 120, origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight }, colors: this.colors, disableForReducedMotion: true });
  },
  party() {
    if (!this.on || !window.confetti) return;
    const go = (x, a) => confetti({ particleCount: 70, angle: a, spread: 70, startVelocity: 48, origin: { x, y: .75 }, colors: this.colors, disableForReducedMotion: true });
    go(0, 60); go(1, 120);
  },
  floatChip(el, text) {
    if (!this.on || !el) return;
    const r = el.getBoundingClientRect(), c = document.createElement("div");
    c.className = "floatchip"; c.textContent = text; document.body.appendChild(c);
    c.style.left = (r.left + r.width / 2) + "px"; c.style.top = (r.top) + "px";
    gsap.fromTo(c, { y: 0, opacity: 0, scale: .7, xPercent: -50 }, { y: -38, opacity: 1, scale: 1, duration: .35, ease: "back.out(2)" });
    gsap.to(c, { y: -64, opacity: 0, duration: .5, delay: .75, ease: "power2.in", onComplete: () => c.remove() });
  },
  /* runs after each screen is drawn */
  enter(view, fresh) {
    if (!this.on) return;
    const v = $(".view"); if (!v) return;
    if (fresh) {
      $$("[data-count]", v).forEach(el => { const to = +el.dataset.count, o = { n: Math.min(to + 12, to * 2 + 9) }; el.textContent = Math.round(o.n); gsap.to(o, { n: to, duration: 1.1, ease: "power3.out", delay: .15, onUpdate: () => el.textContent = Math.round(o.n) }); });
      $$("[data-num]", v).slice(0, 12).forEach(el => { const to = +el.dataset.num, o = { n: 0 }; gsap.to(o, { n: to, duration: .9, ease: "power2.out", onUpdate: () => el.textContent = Math.round(o.n) + "%" }); });
      $$("[data-count-up]", v).forEach(el => { const to = +el.dataset.countUp, o = { n: 0 }; gsap.to(o, { n: to, duration: 1, ease: "power2.out", delay: .2, onUpdate: () => el.textContent = Math.round(o.n) }); });
      $$(".ring-v", v).forEach(c => gsap.from(c, { strokeDashoffset: c.style.getPropertyValue("--c"), duration: 1.2, ease: "power3.out", delay: .15 }));
      gsap.from($$(".upnext, .tile, .sring, .wd, .mini, .ep, .rec", v).slice(0, 30), { y: 16, opacity: 0, duration: .55, ease: "power3.out", stagger: .04, clearProps: "transform,opacity" });
      gsap.from($$(".task, .exam, .list > .item, .chapter, .heading, .qcard, .day", v).slice(0, 40), { y: 14, opacity: 0, duration: .5, ease: "power3.out", stagger: .03, delay: .05, clearProps: "transform,opacity" });
    }
    if (view === "today" && this.intro && window.SplitText) {
      this.intro = false;
      const h = $("#heroTitle"); if (!h) return;
      h.classList.add("intro");
      const split = SplitText.create(h, { type: "words", mask: "words", wordsClass: "w" });
      gsap.from(split.words, { yPercent: 110, duration: .8, ease: "expo.out", stagger: .06, onComplete: () => split.revert() });
      gsap.from(".hero .date, .hero .lede", { opacity: 0, y: 10, duration: .6, ease: "power3.out", stagger: .1, delay: .35 });
    }
  },
  ladder() { if (!this.on) return; const b = $(".rung.cur .b"); if (b) gsap.from(b, { scaleX: 0, transformOrigin: "left", duration: .6, ease: "expo.out" }); }
};
function flipRerender(after) {
  if (FX.on && window.Flip) {
    const state = Flip.getState("[data-flip-id]");
    rerender();
    Flip.from(state, { duration: .55, ease: "power3.inOut", absolute: false, nested: true, prune: true, onEnter: els => gsap.fromTo(els, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4, ease: "power3.out" }) });
  } else rerender();
  after && after();
}
function placeIndicator(container) {
  if (!container) return;
  const cur = container.querySelector('[aria-current="page"]'), ind = container.querySelector(".ind");
  if (!ind) return;
  if (!cur) { ind.style.opacity = 0; return; }
  const cr = container.getBoundingClientRect(), r = cur.getBoundingClientRect();
  ind.style.opacity = 1;
  ind.style.width = r.width + "px"; ind.style.height = r.height + "px";
  ind.style.transform = `translate(${r.left - cr.left}px, ${r.top - cr.top}px)`;
}

/* =====================================================================
   10. ROUTER & ACTIONS
   ===================================================================== */
let stack = [{ v: "today" }];
const TABS = [["today", "Today", "today"], ["exams", "Subjects", "exams"], ["listen", "Listen", "headphones"], ["practice", "Review", "cards"], ["progress", "Progress", "progress"]];
const RAIL = [...TABS, ["calendar", "Calendar", "cal"], ["settings", "Settings", "gear"]];
const tabOf = r => ({ subject: "exams", chapter: "exams", topic: "exams", map: "exams", learn: "exams", review: "practice", import: "exams", exam: "practice", read: "exams" })[r.v] || r.v;
function navigate(fn, dir) {
  const run = () => { fn(); render(true); };
  if (FX.on && document.startViewTransition) {
    document.documentElement.dataset.nav = dir;
    const vt = document.startViewTransition(run);
    vt.finished.finally(() => delete document.documentElement.dataset.nav);
  } else run();
}
function go(spec) {
  const [v, ...rest] = spec.split(":"); const a = rest.join(":");
  if (!V[v]) return;
  const cur = stack[stack.length - 1];
  if (v === "editsubj" && !(cur.v === "editsubj" && cur.a === a)) { qpPreview = null; qpText = ""; importBusy = null; editHue = null; }
  if (v === "import") { qpPreview = null; qpText = ""; importBusy = null; lastImport = null; IMP = { sid: a && subjects[a] ? a : null, done: null, mode: "append", typed: false }; }
  const isTab = RAIL.some(t => t[0] === v);
  /* tabs slide in from the side they sit on, so moving between them feels spatial */
  const ti = k => RAIL.findIndex(t => t[0] === k), from = ti(tabOf(stack[0])), to = ti(v);
  const dir = !isTab ? "forward" : from < 0 || to < 0 || from === to ? "tab" : to > from ? "tab-r" : "tab-l";
  navigate(() => { if (isTab) stack = [{ v }]; else stack.push({ v, a }); }, dir);
}
function back() { if (stack.length > 1) navigate(() => stack.pop(), "back"); }
function crumbs() {
  const r = stack[stack.length - 1];
  if (stack.length === 1) return `<div class="brand"><i></i>Study Desk</div>${deferredInstall && !isStandalone() ? `<button class="proto" data-action="install">Install app</button>` : ""}<button class="icon-btn sm srch" data-action="search" aria-label="Search topics">${ico("search")}</button><button class="icon-btn sm gear" data-go="settings" aria-label="Settings">${ico("gear")}</button>`;
  let trail = [];
  const id = r.a;
  if (r.v === "subject" && subjects[id]) trail = [["subject:" + id, subjects[id].name]];
  else if (r.v === "learn" && nodes[id]) { const sid = nodes[id].subject; trail = [["subject:" + sid, subjects[sid].name], ["topic:" + id, crumbTitle(id)], ["learn:" + id, "Step by step"]]; }
  else if (r.v === "map" && nodes[id]) { const sid = nodes[id].subject; trail = [["subject:" + sid, subjects[sid].name], ["map:" + sid, "Mind map"], ["map:" + id, crumbTitle(id)]]; }
  else if (nodes[id]) {
    let n = nodes[id]; const chain = []; while (n) { chain.unshift(n); n = n.parent ? nodes[n.parent] : null; }
    trail = [["subject:" + chain[0].subject, subjects[chain[0].subject].name], ...chain.map(c => [(c.depth === 0 ? "chapter:" : "topic:") + c.id, crumbTitle(c.id)])];
  } else if (r.v === "practice") trail = [["practice", "Review"]];
  else if (r.v === "review") trail = [["review", "Flashcards"]];
  else if (r.v === "map" && subjects[id]) trail = [["subject:" + id, subjects[id].name], ["map:" + id, "Mind map"]];
  else if (r.v === "edit") trail = [["edit", "My subjects"]];
  else if (r.v === "import") trail = [["import", "Import"]];
  else if (r.v === "exam") trail = [["exam", "Practice exam"]];
  else if (r.v === "read" && typeof BOOKS !== "undefined") { const b = BOOKS.find(x => x.id === String(id).split(":")[0]); trail = b && subjects[b.sid] ? [["subject:" + b.sid, subjects[b.sid].name], ["read:" + b.id, "Textbook"]] : [["read:" + id, "Textbook"]]; }
  else if (r.v === "episode") trail = [["episode", "Now playing"]];
  else if (r.v === "calendar") trail = [["calendar", "Calendar"]];
  else if (r.v === "summary" && subjects[id]) trail = [["subject:" + id, subjects[id].name], ["summary:" + id, "Summary"]];
  else if (r.v === "editsubj") trail = [["edit", "My subjects"], ["editsubj:" + id, id === "new" ? "New subject" : (subjects[id]?.name || "Subject")]];
  const root = RAIL.find(t => t[0] === stack[0].v);
  const parts = [[stack[0].v, root[1]], ...trail];
  return `<button class="back" data-action="back" aria-label="Back">${ico("back")}</button><nav class="crumbs" aria-label="Breadcrumb">${parts.map((p, i) => i === parts.length - 1 ? `<span class="here">${esc(p[1])}</span>` : `<button data-crumb="${esc(p[0])}">${esc(p[1])}</button><span class="sep">›</span>`).join("")}</nav>`;
}
function render(fresh) {
  const r = stack[stack.length - 1];
  let html;
  try { html = V[r.v](r.a); }
  catch (e) { console.error(e); html = `<div class="card stack"><h2>Something went wrong on this screen</h2><p class="muted">Your data is safe. Go back to Today and try again.</p><button class="btn btn-pen" data-go="today">Go to Today</button></div>`; }
  $("#main").innerHTML = `<div class="topbar">${crumbs()}<span class="tb-title" aria-hidden="true"></span></div><div class="view" data-view="${r.v}">${html}</div>`;
  watchTitle();
  document.documentElement.classList.toggle("immersive", r.v === "review");
  const cr = $(".crumbs"); if (cr) cr.scrollLeft = cr.scrollWidth;
  const cur = tabOf(stack[0]);
  const mk = list => `<span class="ind" aria-hidden="true"></span>` + list.map(([k, l, i]) => `<button class="tab" data-go="${k}" ${cur === k ? 'aria-current="page"' : ""}>${ico(i)}<span>${l}</span></button>`).join("");
  $("#tabs").innerHTML = mk(TABS); $("#railTabs").innerHTML = mk(RAIL);
  requestAnimationFrame(() => { placeIndicator($("#tabs")); placeIndicator($("#railTabs")); });
  if (fresh) { window.scrollTo({ top: 0 }); FX.enter(r.v, true); }
  lastDay = todayKey();
}
/* show a compact title in the top bar once the page's big title scrolls out of view */
let titleObs = null;
function watchTitle() {
  if (titleObs) titleObs.disconnect();
  const h = $(".view h1"), tb = $(".topbar"), t = $(".tb-title"); if (!h || !tb || !t || stack.length > 1 || !("IntersectionObserver" in window)) return;
  t.textContent = h.textContent.trim();
  titleObs = new IntersectionObserver(([en]) => tb.classList.toggle("scrolled", !en.isIntersecting && en.boundingClientRect.top < 0), { rootMargin: "-64px 0px 0px 0px" });
  titleObs.observe(h);
}
function rerender() { const y = window.scrollY; render(false); $$(".view").forEach(v => v.style.animation = "none"); window.scrollTo({ top: y }); }
addEventListener("resize", () => { placeIndicator($("#tabs")); placeIndicator($("#railTabs")); });

function toast(msg, action) {
  $$(".toast").forEach(t => t.remove());
  const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status");
  el.innerHTML = ico("spark") + `<span>${esc(msg)}</span>` + (action ? `<button class="toast-act">${esc(action.label)}</button>` : "");
  if (action) el.querySelector("button").onclick = () => { el.remove(); action.fn(); };
  $("#layer").appendChild(el);
  setTimeout(() => el.remove(), action ? 6000 : 3800);
  if (action) el.style.animationDuration = "6s";
}

function setStatus(id, s, label) { S.status[id] = clamp(s, 0, 5); if (label) { S.recent.unshift({ id, text: label, when: todayKey() }); S.recent = S.recent.slice(0, 20); } save(); }
function answer(i) {
  const pool = qPool(), q = pool[Q.idx % pool.length]; if (!q || Q.picked !== null) return;
  Q.picked = i; Q.done++; const ok = i === q.a; if (ok) Q.right++; logEvent({ t: "q", n: q.node, ok });
  const h = S.attempts[q.node] || (S.attempts[q.node] = { a: 0, c: 0 }); h.a++; if (ok) h.c++;
  if (!ok) { const m = S.mistakes[q.node] || (S.mistakes[q.node] = { n: 0, qs: [] }); m.n++; if (!m.qs.includes(q.id)) m.qs.push(q.id); }
  else { const m = S.mistakes[q.node]; if (m && m.qs.includes(q.id)) { m.n = Math.max(0, m.n - 1); m.qs = m.qs.filter(x => x !== q.id); } }
  if (st(q.node) === 2 && h.a >= 2) setStatus(q.node, 3, "Practised");
  save();
  return ok;
}
function applySettings(rebuild) {
  const th = S.settings.theme;
  if (th === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = th;
  document.documentElement.classList.toggle("calm", S.settings.motion === "reduced");
  document.documentElement.classList.toggle("big", S.settings.text === "large");
  if (rebuild) { generate(todayKey()); S.changes.unshift({ when: todayKey(), text: "Study settings changed, so the plan was rebuilt from today." }); }
  save();
}
function download(name, text) {
  try { const url = URL.createObjectURL(new Blob(Array.isArray(text) ? text : [text], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); return true; } catch (e) { return false; }
}
function doImport(txt) {
  const r = importText(txt);
  if (r.error) { importMsg = { ok: false, text: r.error }; rerender(); return; }
  snapshot();
  S = r.state; repairs = r.fixes; buildModel(); rollOver(); applySettings(false); save(true);
  if (r.notes) Object.entries(r.notes).forEach(([id, text]) => { if (nodes[id] && typeof text === "string") saveNotes(id, text).catch(() => { }); });
  importMsg = { ok: true, text: "Backup restored" + (r.fixes ? `, with ${r.fixes} item${r.fixes > 1 ? "s" : ""} repaired.` : ".") };
  rerender(); toast("Backup restored.", { label: "Undo", fn: undo });
}

document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]"), g = e.target.closest("[data-go]"), c = e.target.closest("[data-crumb]");
  if (a) {
    e.preventDefault(); e.stopPropagation();
    const act = a.dataset.action, id = a.dataset.id;
    if (editorAction(act, a)) return;
    if (act.startsWith("imp-")) { importAction(act, a); return; }
    if (typeof TOOL_ACTS !== "undefined" && TOOL_ACTS.has(act)) { toolAction(act, a); return; }
    if (typeof X_ACTS !== "undefined" && X_ACTS.has(act)) { xAction(act, a); return; }
    if (typeof SP_ACTS !== "undefined" && SP_ACTS.has(act)) { spAction(act, a); return; }
    if (typeof M_ACTS !== "undefined" && M_ACTS.has(act)) { mAction(act, a); return; }
    if (typeof R_ACTS !== "undefined" && R_ACTS.has(act)) { rAction(act, a); return; }
    if (typeof E_ACTS !== "undefined" && E_ACTS.has(act)) { eAction(act, a); return; }
    if (typeof L_ACTS !== "undefined" && L_ACTS.has(act)) { lAction(act, a); return; }
    if (typeof P_ACTS !== "undefined" && P_ACTS.has(act)) { pAction(act, a); return; }
    if (typeof A_ACTS !== "undefined" && A_ACTS.has(act)) { aAction(act, a); return; }
    if (V3_ACTS.has(act)) { v3Action(act, a); return; }
    switch (act) {
      case "back": back(); return;
      case "focus": focusStart(id); return;
      case "search": openSearch(); return;
      case "bak-later": META.snooze = Date.now(); metaSave(); rerender(); return;
      case "toggle": {
        const t = S.tasks.find(x => x.id === id); if (!t) return;
        t.done = !t.done;
        if (t.done) {
          t.prev = st(t.node);
          if (t.type !== "mock") { const ns = { learn: 1, recall: 2, practice: 3, calc: 3, revision: 4 }[t.type]; if (ns > st(t.node)) setStatus(t.node, ns); }
          S.recent.unshift({ id: t.node, text: TYPES[t.type].label, when: todayKey() }); S.recent = S.recent.slice(0, 20); logEvent({ t: "task", n: t.node, m: t.dur, tid: t.id }); save();
          a.setAttribute("aria-checked", "true");
          const moved = t.type !== "mock" && st(t.node) !== t.prev;
          FX.floatChip(a, moved ? "→ " + STATUS[st(t.node)] : "Done");
          const left = tasksOn(t.date).filter(x => !x.done).length;
          setTimeout(() => { flipRerender(); if (t.date === todayKey() && left === 0) { FX.party(); toast("Day complete. Everything on today's plan is done."); } else toast(t.type === "mock" ? "Mock test logged." : `${nodes[t.node].title} is now “${STATUS[st(t.node)]}”.` + (t.type === "learn" && moved ? " Active recall moves it to Understood." : "")); }, FX.on ? 320 : 0);
        } else { if (t.prev !== undefined) S.status[t.node] = t.prev; const i = S.recent.findIndex(r => r.id === t.node); if (i === 0) S.recent.shift(); const li = S.log.findIndex(e => e.tid === t.id); if (li >= 0) S.log.splice(li, 1); save(); flipRerender(); }
        return;
      }
      case "miss": {
        const t = S.tasks.find(x => x.id === id); if (!t) return;
        snapshot(); const msg = missTask(t); save();
        const row = a.closest(".task");
        const done = () => { flipRerender(); toast(msg, { label: "Undo", fn: undo }); };
        if (FX.on && row) gsap.to(row, { x: 60, opacity: 0, duration: .28, ease: "power2.in", onComplete: done }); else done();
        return;
      }
      case "step": { const cur = st(id); if (cur >= 5 || (cur === 4 && !(acc(id) >= .8 && S.attempts[id].a >= 3))) return; logEvent({ t: "step", n: id }); setStatus(id, cur + 1, STATUS[cur + 1]); rerender(); FX.ladder(); FX.burst($(".rung.cur") || a, cur + 1 === 5 ? 90 : 24, cur + 1 === 5 ? 100 : 55); toast(`${nodes[id].title}: ${STATUS[cur + 1]}.`); return; }
      case "stepdown": setStatus(id, st(id) - 1); rerender(); return;
      case "dunno": openExplain(id); return;
      case "practise": { const has = QS.some(q => q.node === id); Q = { ...Q, topic: has ? id : null, subj: has ? "all" : nodes[id].subject, lvl: "all", mode: "all", idx: 0, picked: null }; navigate(() => stack.push({ v: "practice" }), "forward"); return; }
      case "qf": Q[a.dataset.k] = a.dataset.v || (a.dataset.k === "topic" ? null : "all"); if (a.dataset.k === "mode") Q.topic = null; Q.idx = 0; Q.picked = null; rerender(); return;
      case "answer": { const ok = answer(+a.dataset.i); rerender(); if (ok) { FX.burst($(".opt.right"), 22, 50); if (FX.on) gsap.fromTo("#qscore", { scale: 1.25 }, { scale: 1, duration: .5, ease: "back.out(3)" }); } return; }
      case "nextq": Q.idx++; Q.picked = null; rerender(); if (FX.on) gsap.from("#qcard", { x: 24, opacity: 0, duration: .35, ease: "power3.out", clearProps: "all" }); $("#qcard")?.scrollIntoView({ block: "nearest" }); return;
      case "cal-open": calSel = a.dataset.k; calMonth = calSel.slice(0, 7) + "-01"; go("calendar"); return;
      case "pickday": calSel = a.dataset.k; if (calSel.slice(0, 7) !== calMonth.slice(0, 7)) calMonth = calSel.slice(0, 7) + "-01"; rerender(); return;
      case "month": { const d = parseKey(calMonth), dir = +a.dataset.d; d.setMonth(d.getMonth() + dir); calMonth = keyOf(d); { const t = todayKey(); calSel = t.slice(0, 7) === calMonth.slice(0, 7) ? t : calMonth; } rerender(); if (FX.on) gsap.from("#calGrid", { x: 30 * dir, opacity: 0, duration: .35, ease: "power3.out", clearProps: "all" }); return; }
      case "replan": snapshot(); generate(todayKey()); S.changes.unshift({ when: todayKey(), text: "Plan rebuilt from today using your latest progress and practice scores." }); save(); flipRerender(); toast("Plan rebuilt from today.", { label: "Undo", fn: undo }); return;
      case "day": { const d = +a.dataset.d, days = S.settings.days; if (days.includes(d)) { if (days.length === 1) { toast("Keep at least one study day."); return; } S.settings.days = days.filter(x => x !== d); } else S.settings.days = [...days, d].sort(); snapshot(); applySettings(true); rerender(); toast("Study days updated. Plan rebuilt.", { label: "Undo", fn: undo }); return; }
      case "perday": S.settings.maxPerDay = clamp(S.settings.maxPerDay + +a.dataset.d, 2, 10); applySettings(true); rerender(); return;
      case "sum-mode": SUM_DETAIL = a.dataset.v === "detail"; try { localStorage.setItem("studydesk.sumMode", SUM_DETAIL ? "detail" : "short"); } catch (e) { } rerender(); return;
      case "setopt": S.settings[a.dataset.k] = a.dataset.v; applySettings(false); rerender(); return;
      case "install": if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; rerender(); }); } else go("settings"); return;
      case "export": { markBackup(); const big = Object.keys(NOTES).length > 300; if (big) { toast("Making your backup. Big books take a few seconds."); a.disabled = true; }
        exportParts().then(parts => { const ok = download(`study-desk-backup-${todayKey()}.json`, parts); toast(ok ? "Backup file saved." : "Saving files isn't allowed here. Use Copy backup instead."); }).finally(() => { a.disabled = false; }); return; }
      case "copybak": { markBackup(); const txt = exportText(); const fallback = () => { const ta = $("#importText"); if (ta) { ta.value = txt; ta.select(); } toast("Backup placed in the box below. Copy it from there."); }; try { navigator.clipboard.writeText(txt).then(() => toast("Backup copied. Paste it somewhere safe."), fallback); } catch (err) { fallback(); } return; }
      case "importpaste": { const v = ($("#importText") || {}).value || ""; if (!v.trim()) { importMsg = { ok: false, text: "Paste a backup into the box first." }; rerender(); return; } doImport(v); return; }
      case "reset": if (a.dataset.confirm) {
          (async () => { for (const st of ["notes", "audio", "sketch", "pics", "vec", "books", "marks", "figs", "aq", "ai"]) { try { for (const r of (await IDB.all(st) || [])) await IDB.del(st, r.id); } catch (e) { } }
            NOTES = {}; RECS = []; if (typeof SKETCHES !== "undefined") SKETCHES = []; if (typeof FIGS !== "undefined") { FIGS = []; figsSave(); }
            ls.del(KEY); ls.del(BAK); fresh(); rollOver(); applySettings(false); save(true); Q = { subj: "all", lvl: "all", topic: null, mode: "all", idx: 0, picked: null, right: 0, done: 0 }; stack = [{ v: "today" }]; FX.intro = true; render(true); toast("Everything is erased. Study Desk is empty again."); })();
        } else { a.dataset.confirm = "1"; a.textContent = TAP + " again to erase everything"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Erase everything on this device"; } }, 3500); } return;
    }
  }
  if (c) {
    const spec = c.dataset.crumb;
    const idx = stack.findIndex((r, i) => i > 0 && (r.v + (r.a ? ":" + r.a : "")) === spec);
    if (RAIL.some(t => t[0] === spec)) navigate(() => stack = [stack[0]], "back");
    else if (idx > 0) navigate(() => stack = stack.slice(0, idx + 1), "back");
    else { stack = [stack[0]]; go(spec); }
    return;
  }
  if (g) { e.preventDefault(); closeSheet(true); go(g.dataset.go); }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.matches("input[type=time][data-block]")) {
    const i = +el.dataset.block, edge = +el.dataset.edge, v = parseT(el.value); if (v === null) return;
    const b = S.settings.blocks.map(x => x.slice()); b[i][edge] = v;
    if (b[i][1] - b[i][0] < 30) { toast("A study block needs at least 30 minutes."); rerender(); return; }
    const sorted = b.slice().sort((x, y) => x[0] - y[0]);
    if (sorted.some((x, j) => j && x[0] < sorted[j - 1][1])) { toast("Study blocks can't overlap."); rerender(); return; }
    snapshot(); S.settings.blocks = sorted; applySettings(true); rerender(); toast("Study times updated. Plan rebuilt.", { label: "Undo", fn: undo });
  }
  if (el.id === "imp-file" && el.files && el.files[0]) { importFile(el.files[0], el.dataset.sid); return; }
  if (el.id === "rec-file" && el.files && el.files[0]) { addRecording(el.files[0], ($("#rec-subj") || {}).value || ""); return; }
  if (el.id === "voice-pick") { const v = TTS.getVoices().find(v => v.name === el.value); if (v) { P_.voice = v; try { localStorage.setItem("studydesk.voice", v.name); } catch (e) { } } return; }
  if (el.id === "importFile" && el.files && el.files[0]) {
    const f = el.files[0];
    if (f.size > 5e6) { importMsg = { ok: false, text: "That file is too big to be a Study Desk backup." }; rerender(); return; }
    const rd = new FileReader(); rd.onload = () => doImport(String(rd.result)); rd.onerror = () => { importMsg = { ok: false, text: "Couldn't read that file." }; rerender(); }; rd.readAsText(f);
  }
});
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-action],[role="link"][data-go]')) { e.preventDefault(); e.target.click(); }
  if (e.key === "Escape") { if ($(".focus-scrim")) focusAction("min"); else closeSheet(); }
  if (e.key === "/" && !e.target.closest("input,textarea,select,[contenteditable]") && !$(".scrim")) { e.preventDefault(); openSearch(); }
});
document.addEventListener("input", e => { if (e.target.id === "srch") drawSearch(e.target.value); });
function dayCheck() { if (S && lastDay && lastDay !== todayKey()) { if (rollOver()) save(); render(false); } }
setInterval(dayCheck, 60000);

/* ---------- "I don't understand this" sheet (drag down to close) ---------- */
let X = { id: null, mode: 0, picked: null };
function explainFor(id) {
  const n = nodes[id], e = S.content.explain[id];
  if (e) return e;
  const ch = chapterOf(id);
  /* no written explanation: build one from this topic's own notes (via the summary), never invent it */
  const sm = notesOf(id) ? summaryOf(id) : null, items = sm && sm.sections ? sm.sections.flatMap(x => x.items) : [];
  if (sm && items.length) {
    const tl = n.title.toLowerCase(), def = (sm.defs || []).find(d => tl.includes(d.term.toLowerCase()) || d.term.toLowerCase().includes(tl)) || (sm.defs || [])[0];
    const ex = items.find(x => /\b(for example|e\.g\.|such as|for instance)\b/i.test(x.t));
    const examLines = items.filter(x => x.kinds.includes("exam") || x.kinds.includes("formula")).map(x => x.t);
    return {
      generic: true, fromNotes: true,
      simple: def ? `${def.term}: ${def.def}.` : items[0].t,
      uni: items.filter(x => !def || !x.t.includes(def.def)).slice(0, 4).map(x => x.t).join(" "),
      exam: examLines.length ? examLines.slice(0, 3).join(" ") : `Make sure you can define and explain these key terms: ${(sm.terms || []).slice(0, 6).join(", ")}.`,
      example: ex ? ex.t : ""
    };
  }
  return {
    generic: true,
    simple: `${n.title} is part of “${ch.title}” (pages ${n.p1}–${n.p2}). Add your notes for this topic and a plain-language explanation is built from them.`,
    uni: `Read pages ${n.p1}–${n.p2}, then import the chapter or paste your notes so this view can explain it in your textbook's words.`,
    exam: `For the exam: define ${n.title.toLowerCase()} precisely, give one example, and connect it to the rest of chapter ${ch.num}.`,
    example: ""
  };
}
function openExplain(id) { X = { id, mode: 0, picked: null }; drawSheet(true); }
function closeSheet(instant) {
  const sc = $(".scrim"); if (!sc) return;
  if (instant || !FX.on) { sc.remove(); return; }
  const sh = $(".sheet", sc);
  gsap.to(sh, { y: sh.offsetHeight + 40, duration: .28, ease: "power2.in" });
  gsap.to(sc, { opacity: 0, duration: .28, onComplete: () => sc.remove() });
}
function drawSheet(opening) {
  const n = nodes[X.id], e = explainFor(X.id), modes = ["Very simple", "University level", "Exam focus", "Example", "Practice question"];
  const q = QS.find(q => q.node === X.id) || QS.find(q => q.subject === n.subject);
  let body;
  if (X.mode < 4) body = `<div class="explain"><p>${esc([e.simple, e.uni, e.exam, e.example][X.mode] || (X.mode === 3 ? "Your notes for this topic don't include an example yet. Add one to your notes and it shows up here." : ""))}</p>${e.fromNotes ? `<p class="note">Built from your notes for this topic. Every sentence comes from them.</p>` : e.generic ? `<p class="note">No notes for this topic yet. Add or import them and this explanation is built from them.</p>` : ""}</div>`;
  else if (!q) body = `<div class="explain"><p class="muted">No practice questions for this subject yet.</p></div>`;
  else body = `<div class="explain"><p style="font-weight:700">${esc(q.q)}</p><div class="opts" style="margin-top:12px">${q.o.map((o, i) => { let c = ""; if (X.picked !== null) c = i === q.a ? "right" : i === X.picked ? "wrong" : "fade"; return `<button class="opt ${c}" data-x="pick" data-i="${i}" ${X.picked !== null ? "disabled" : ""}><span class="l">${"ABCDEFG"[i]}</span><span>${esc(o)}</span></button>`; }).join("")}</div>
    ${X.picked !== null ? `<div class="verdict ${X.picked === q.a ? "ok" : "no"}" style="margin-top:12px"><h3>${ico(X.picked === q.a ? "check" : "x")}${X.picked === q.a ? "Correct" : "Incorrect"}</h3><p>${esc(q.e || "")}</p></div>` : ""}${q.node !== X.id ? `<p class="note">No question for this exact topic yet, so here is one from ${esc(subjects[n.subject].name)}.</p>` : ""}</div>`;
  const inner = `<div class="sheet-head"><div class="grab"></div>
    <div class="row"><div class="grow"><div class="tiny muted mono">${esc(subjects[n.subject].name)} · ${n.num} · pp ${n.p1}–${n.p2}</div><h2>${esc(n.title)}</h2></div><button class="icon-btn" data-x="close" aria-label="Close">${ico("x")}</button></div></div>
    <div class="modes" role="tablist">${modes.map((m, i) => `<button class="mode" role="tab" aria-selected="${X.mode === i}" data-x="mode" data-i="${i}"><b>${i + 1}</b>${m}</button>`).join("")}</div>
    ${body}
    <div class="row" style="flex-wrap:wrap">${X.mode < 4 ? `<button class="btn btn-pen" data-x="mode" data-i="${X.mode + 1}">${X.mode < 3 ? "Explain it another way" : "Try a question"}</button>` : ""}<button class="btn btn-line" data-x="close">Got it</button></div>`;
  const existing = $(".sheet");
  if (existing && !opening) { existing.innerHTML = inner; if (FX.on) gsap.from(".explain", { opacity: 0, y: 8, duration: .3, ease: "power3.out" }); return; }
  $$(".scrim").forEach(s => s.remove());
  $("#layer").insertAdjacentHTML("beforeend", `<div class="scrim" data-x="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="Explain ${esc(n.title)}">${inner}</div></div>`);
  const sh = $(".sheet");
  if (FX.on) { sh.style.animation = "none"; gsap.from(sh, { y: 120, opacity: 0, duration: .5, ease: "expo.out" }); }
  $(".sheet .mode[aria-selected='true']")?.focus({ preventScroll: true });
  dragToClose(sh);
}
function dragToClose(sh) {
  let y0 = null, dy = 0, t0 = 0;
  sh.addEventListener("pointerdown", e => { if (!e.target.closest(".sheet-head") || e.target.closest("button")) return; y0 = e.clientY; t0 = performance.now(); dy = 0; sh.setPointerCapture(e.pointerId); sh.style.transition = "none"; });
  sh.addEventListener("pointermove", e => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 === null) return; const v = dy / Math.max(1, performance.now() - t0); y0 = null;
    if (dy > 110 || v > .6) closeSheet(); else { sh.style.transition = "transform .35s cubic-bezier(.34,1.56,.64,1)"; sh.style.transform = ""; }
  };
  sh.addEventListener("pointerup", end); sh.addEventListener("pointercancel", end);
}
$("#layer").addEventListener("click", e => {
  const sg = e.target.closest("[data-sgo]"); if (sg) { closeSheet(true); go(sg.dataset.sgo); return; }
  const f = e.target.closest("[data-f]"); if (f) { focusAction(f.dataset.f); return; }
  const x = e.target.closest("[data-x]"); if (!x) return;
  if (x.dataset.x === "close") { if (x.classList.contains("scrim") && e.target !== x) return; closeSheet(); return; }
  if (x.dataset.x === "mode") { X.mode = +x.dataset.i; X.picked = null; drawSheet(false); return; }
  if (x.dataset.x === "pick") { X.picked = +x.dataset.i; drawSheet(false); const q = QS.find(q => q.node === X.id) || QS.find(q => q.subject === nodes[X.id].subject); if (q && X.picked === q.a) FX.burst($(".sheet .opt.right"), 20, 50); }
});

/* =====================================================================
   11. INSTALL & OFFLINE
   ===================================================================== */
let deferredInstall = null, wantReload = false;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; if (S) rerender(); });
addEventListener("appinstalled", () => { deferredInstall = null; toast("Study Desk is installed."); if (S) rerender(); });
(function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  const okOrigin = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!okOrigin || /claude\.ai|claudeusercontent/.test(location.hostname)) return;
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      const offer = w => toast("A new version of Study Desk is ready.", { label: "Update", fn: () => { wantReload = true; w.postMessage("skipWaiting"); } });
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); }); });
    }).catch(() => { });
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloaded || !wantReload) return; reloaded = true; save(true); location.reload(); });
  });
})();

/* =====================================================================
   12. BOOT
   ===================================================================== */
function boot() {
  if (!loadState()) fresh();
  checkDataFile();
  if (rollOver()) save();
  if (DSUBJ.length && !S.tasks.some(t => t.date >= todayKey())) { generate(todayKey()); save(); }
  applySettings(false);
  focusLoad(); if (F) fTick = setInterval(focusTickFn, 1000);
  render(true);
  setTimeout(loadLocalFiles, 0);
  if (contentNotice && contentNotice.auto) toast("Your study content was updated.");
  document.documentElement.classList.add("ready");
}
/* boot once every script (including tools.js) has run */
let booted = false;
const bootOnce = () => { if (booted) return; booted = true; boot(); };
if (document.readyState === "complete") bootOnce(); else { document.addEventListener("DOMContentLoaded", bootOnce); addEventListener("load", bootOnce); }

/* paste or drop a PDF / PowerPoint onto the subject editor */
document.addEventListener("paste", e => {
  const r = stack[stack.length - 1], sid = r.v === "import" ? IMP.sid : r.v === "editsubj" && r.a !== "new" ? r.a : null; if (!sid) return;
  const f = [...(e.clipboardData?.files || [])].find(f => /\.(pdf|pptx?|docx?)$/i.test(f.name)); if (!f) return;
  e.preventDefault(); importFile(f, sid);
});
document.addEventListener("dragover", e => { const z = e.target.closest?.("#dropzone"); if (z) { e.preventDefault(); z.classList.add("over"); } });
document.addEventListener("dragleave", e => { const z = e.target.closest?.("#dropzone"); if (z) z.classList.remove("over"); });
document.addEventListener("drop", e => { const z = e.target.closest?.("#dropzone"); if (!z) return; e.preventDefault(); z.classList.remove("over"); const f = e.dataTransfer?.files?.[0]; if (f) importFile(f, z.dataset.sid); });
