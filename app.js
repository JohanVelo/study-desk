/* Study Desk — app logic
   Sections: 1 utils · 2 model · 3 store · 4 priority & progress · 5 scheduler · 6 icons
             7 UI pieces · 8 views · 9 motion · 10 router & actions · 11 install & offline · 12 boot */
"use strict";
const APP_VERSION = "2.1.0";

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
const slug = s => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
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
  const out = { from: D.contentVersion || "sample-1", subjects: [], questions: [], explain: {} };
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
  const history = {}, mistakes = {};
  Object.entries(D.history || {}).forEach(([t, h]) => { if (titleToId[t] && h && isInt(h.a, 0, 1e4) && isInt(h.c, 0, h.a)) history[titleToId[t]] = { a: h.a, c: h.c }; });
  Object.entries(D.mistakes || {}).forEach(([t, n]) => { const id = titleToId[t]; if (id && isInt(n, 1, 999)) mistakes[id] = { n, qs: out.questions.filter(q => q.node === id).map(q => q.id).slice(0, n) }; });
  return { content: out, seeds, history, mistakes, legacy };
}

/* Repairs content so the rest of the app can trust it */
function cleanContent(c) {
  let fixes = 0;
  const out = { from: typeof c?.from === "string" ? c.from : "", subjects: [], questions: [], explain: {} };
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
  Object.entries(c?.explain || {}).forEach(([k, e]) => { if (ids.has(k) && e && typeof e === "object") out.explain[k] = { simple: String(e.simple || ""), uni: String(e.uni || ""), exam: String(e.exam || ""), example: String(e.example || "") }; });
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
  QS = C.questions.filter(q => nodes[q.node]).map(q => ({ ...q, subject: nodes[q.node].subject }));
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
const DEFAULT_SETTINGS = { days: [1, 2, 3, 4, 5, 6], blocks: [[540, 720], [840, 1020]], maxPerDay: 6, theme: "system", motion: "full" };
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
  const conv = DATA ? convertData(DATA, anchor) : { content: { from: "", subjects: [], questions: [], explain: {} }, seeds: {}, history: {}, mistakes: {} };
  return { schema: SCHEMA_NOW, app: "study-desk", anchor, content: conv.content, contentEdited: false, status: { ...conv.seeds }, attempts: conv.history, mistakes: conv.mistakes,
    tasks: [], recent: [], changes: [], seq: 0, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) };
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
  const st0 = o.settings || {}, d = DEFAULT_SETTINGS;
  out.settings = {
    days: Array.isArray(st0.days) && st0.days.length && st0.days.every(x => isInt(x, 0, 6)) ? [...new Set(st0.days)].sort() : (fix(), d.days.slice()),
    blocks: Array.isArray(st0.blocks) && st0.blocks.length && st0.blocks.every(b => Array.isArray(b) && isInt(b[0], 0, 1439) && isInt(b[1], 1, 1440) && b[1] - b[0] >= 30) ? st0.blocks.map(b => [b[0], b[1]]).sort((a, b) => a[0] - b[0]) : (fix(), d.blocks.map(b => b.slice())),
    maxPerDay: isInt(st0.maxPerDay, 2, 10) ? st0.maxPerDay : (fix(), d.maxPerDay),
    theme: ["system", "light", "dark"].includes(st0.theme) ? st0.theme : (fix(), "system"),
    motion: ["full", "reduced"].includes(st0.motion) ? st0.motion : (fix(), "full")
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
function checkDataFile() {
  if (!DATA || !DATA.contentVersion || DATA.contentVersion === S.content.from) return;
  if (!S.contentEdited) { loadDataFile(); contentNotice = { auto: true }; }
  else contentNotice = { auto: false };
}

/* ---------- backup / restore ---------- */
function exportText() { return JSON.stringify({ app: "study-desk", schema: SCHEMA_NOW, version: APP_VERSION, exportedAt: new Date().toISOString(), state: S }, null, 1); }
function importText(txt) {
  let o; try { o = JSON.parse(txt); } catch (e) { return { error: "That isn't a Study Desk backup. Check you copied the whole file." }; }
  const raw = o && o.app === "study-desk" && o.state ? o.state : o;
  const m = migrate(raw);
  if (!m) return { error: "This backup is from a version of Study Desk this app can't read." };
  return sanitize(m);
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
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
};
const ico = (k, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[k]}</svg>`;

/* =====================================================================
   7. UI PIECES
   ===================================================================== */
const subjColor = sid => `oklch(58% 0.15 ${subjects[sid].hue})`;
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
    <div class="body" role="link" tabindex="0" data-go="${go}" aria-label="Open ${esc(title)}">
      <span class="kind">${ico(ty.icon)}${ty.label} · ${t.dur} min<span class="grow"></span>${prPill(lvl)}</span>
      <span class="title">${esc(title)}</span>
      <span class="meta"><span style="color:${subjColor(t.subject)};font-weight:700">${s.name}</span>${opts.compact ? "" : `<span>${where}</span>`}${t.type !== "mock" ? pagesTag(n) : ""}${t.carried && !t.done ? `<span class="carried">Moved here</span>` : ""}${isNow ? `<span class="carried nowtag">Now</span>` : ""}</span>
      ${!t.done && !opts.noMove ? `<span class="acts"><span class="miss" role="button" tabindex="0" data-action="miss" data-id="${t.id}">${ico("shift")}I didn't get to this</span></span>` : ""}
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
V.today = () => {
  const t = todayKey(), ts = tasksOn(t), left = ts.filter(x => !x.done), mins = left.reduce((a, x) => a + x.dur, 0);
  const upcoming = DSUBJ.filter(s => daysLeft(s.id) >= 0).sort((a, b) => daysLeft(a.id) - daysLeft(b.id));
  const top = upcoming[0];
  const urgent = leafIds.map(id => ({ id, ...scoreParts(id, t) })).filter(x => x.level === "urgent" || x.level === "high").sort((a, b) => b.total - a.total).slice(0, 4);
  const weak = weakList().slice(0, 4);
  const changes = S.changes.filter(c => c.when === t).slice(0, 3);
  const allDone = ts.length && !left.length;
  const lede = !DSUBJ.length ? `Add your subjects in the data file to get a plan.` : !upcoming.length ? `All your exams are behind you. Well done.` : ts.length ? (left.length ? `<strong>${left.length} session${left.length > 1 ? "s" : ""}, ${Math.floor(mins / 60) ? Math.floor(mins / 60) + " h " : ""}${mins % 60} min</strong> left today. ${esc(top.name)} needs the most attention: its exam is in ${daysLeft(top.id)} day${daysLeft(top.id) === 1 ? "" : "s"}.` : `<strong>Today's plan is done.</strong> That's everything for today. Tomorrow's sessions are in the calendar.`) : `Today is a rest day. Your next sessions are in the calendar.`;
  if (!DSUBJ.length) return `<div class="stack" style="gap:24px"><header class="hero"><div class="date">${fmtD(t, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div><h1 id="heroTitle">What should I study <span class="hl">today?</span></h1>
      <p class="lede">Add your subjects and exam dates, and Study Desk will plan every day for you.</p></header>
      <div class="card stack"><h2 class="h3">Get started</h2><ol class="steps"><li>Add a subject and its exam date.</li><li>Import its contents from a PDF or PowerPoint, or type the chapters and page numbers.</li><li>Come back here each day to see what to study.</li></ol><button class="btn btn-pen" data-go="editsubj:new" style="align-self:flex-start">+ Add your first subject</button></div></div>`;
  return `<div class="stack" style="gap:28px">
    <header class="hero"><div class="date">${fmtD(t, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <h1 id="heroTitle">What should I study <span class="hl">today?</span></h1><p class="lede">${lede}</p>
      ${allDone ? `<div class="donebadge">${ico("check")}Day complete</div>` : ""}</header>
    ${restoredFrom ? `<div class="banner">${ico("shield")}<div>${restoredFrom === "legacy" ? "Your progress from the first prototype was carried over." : "Your saved data couldn't be read, so Study Desk restored it from the automatic backup."}</div></div>` : ""}
    ${changes.length ? `<div class="banner">${ico("shift")}<div>${changes.map(c => esc(c.text)).join("<br>")}<br><button data-go="calendar">See it in the calendar</button></div></div>` : ""}
    <div class="dash">
      <section class="section" aria-labelledby="plan-h"><div class="sec-head"><h2 id="plan-h">Today's study plan</h2><span class="tiny muted mono">${ts.filter(x => x.done).length}/${ts.length} done</span></div>
        <div class="card plan-card">${planList(ts)}</div>
        <p class="tiny muted">Tap a session to open the topic. If you can't finish one, tap “I didn't get to this” and the plan moves it to your next free study slot.</p></section>
      <div class="side stack" style="gap:28px">
        <section class="section"><div class="sec-head"><h2>Overall progress</h2><button class="link" data-go="progress">Details</button></div>
          <div class="card stack" style="gap:14px">${progRow("All subjects", progress(), "var(--pen)", "lg")}${DSUBJ.map(s => progRow(esc(s.name), progress(s.id), subjColor(s.id))).join("")}</div></section>
        <section class="section"><div class="sec-head"><h2>Urgent topics</h2></div>
          <div class="list">${urgent.length ? urgent.map(u => topicItem(u.id, `${esc(subjects[nodes[u.id].subject].name)} · ${STATUS[st(u.id)]} · ${DIFF[nodes[u.id].diff]}`)).join("") : `<div class="empty">Nothing urgent right now.</div>`}</div></section>
      </div>
    </div>
    <section class="section"><div class="sec-head"><h2>Upcoming exams</h2><button class="link" data-go="exams">All subjects</button></div>
      <div class="exams">${(upcoming.length ? upcoming : DSUBJ).map(s => examCard(s.id)).join("")}</div></section>
    <div class="dash">
      <section class="section"><div class="sec-head"><h2>My weak areas</h2><button class="link" data-go="practice">Practise</button></div>
        <div class="list">${weak.length ? weak.map(w => `<button class="item" data-go="topic:${w.id}" style="--pc:${PRC[w.sev]}"><span class="mark"></span><span class="grow"><span class="t">${esc(nodes[w.id].title)}</span><br><span class="s">${w.why}</span></span>${ico("chev", 'class="chev"')}</button>`).join("") : `<div class="empty">No weak areas. Keep practising to keep it that way.</div>`}</div></section>
      <section class="section"><div class="sec-head"><h2>Recently completed</h2></div>
        <div class="list">${S.recent.length ? S.recent.slice(0, 4).map(r => `<button class="item" data-go="topic:${r.id}" style="--pc:var(--ok)"><span class="mark"></span><span class="grow"><span class="t">${esc(nodes[r.id].title)}</span><br><span class="s">${esc(r.text)} · ${r.when === t ? "today" : fmtD(r.when, { weekday: "long" })}</span></span>${ico("chev", 'class="chev"')}</button>`).join("") : `<div class="empty">Finished sessions will show up here.</div>`}</div></section>
    </div>
  </div>`;
};

V.exams = () => `<div class="stack" style="gap:20px"><header class="subhead"><div class="eyebrow">${DSUBJ.length} subjects</div><h1>Exam countdown</h1><p class="muted">Counted from today's date. The closer the exam and the less prepared you are, the louder the card.</p><div class="row"><button class="btn btn-line btn-sm" data-go="edit">${ico("pencil")}Edit my subjects</button></div></header>
  ${DSUBJ.length ? "" : `<div class="card empty">No subjects yet. <button class="link" data-go="editsubj:new">Add your first subject</button></div>`}
  <div class="exams grid">${DSUBJ.slice().sort((a, b) => daysLeft(a.id) - daysLeft(b.id)).map(s => examCard(s.id)).join("")}</div></div>`;

V.subject = sid => {
  const s = subjects[sid]; if (!s) return V.exams();
  const d = daysLeft(sid), lvl = subjLevel(sid);
  return `<div class="stack" style="gap:22px">
    <header class="subhead"><div class="eyebrow">${esc(s.code || "")}${s.course ? " · " + esc(s.course) : ""}</div><h1>${esc(s.name)}</h1>
      <div class="chips"><span class="countchip" style="--pc:${PRC[lvl]}"><b>${Math.max(d, 0)}</b> day${d === 1 ? "" : "s"} left</span><span class="small muted">${fmtD(examKey(sid), { weekday: "long", day: "numeric", month: "long" })}${s.examTime ? " · " + esc(s.examTime) : ""}${s.venue ? " · " + esc(s.venue) : ""}</span><button class="btn btn-line btn-sm" data-go="editsubj:${sid}">${ico("pencil")}Edit</button></div></header>
    ${!s.chapterIds.length ? `<div class="card empty">No chapters yet. <button class="link" data-go="editsubj:${sid}">Add chapters or import a PDF</button></div>` : ""}
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
        <button class="btn btn-hl dunno" data-action="dunno" data-id="${id}"><span class="q">?</span>I don't understand this</button>
        <section class="section"><div class="sec-head"><h2 style="font-size:18px">Planned sessions</h2></div>
          <div class="card plan-card">${ts.length ? planList(ts, { date: true, compact: true }) : `<div class="empty">${cur >= 5 ? "Mastered. No more sessions needed." : "No upcoming sessions for this topic."}</div>`}</div></section>
      </div>
      <div class="stack">
        <section class="card stack" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">Practice</h2>${a !== null ? `<span class="score">${h.c}/${h.a} correct</span>` : ""}</div>
          ${a !== null ? progRow("Accuracy", a, a < .6 ? "var(--p-urgent)" : a < .8 ? "var(--p-high)" : "var(--ok)") : `<p class="small muted">No answers yet.</p>`}
          ${m ? `<p class="small"><b style="color:var(--bad)">${m} mistake${m > 1 ? "s" : ""}</b> to review.</p>` : ""}
          <button class="btn ${qs.length ? "btn-soft" : "btn-line"}" data-action="practise" data-id="${id}">${ico("pencil")}${qs.length ? `Practise this topic (${qs.length} question${qs.length > 1 ? "s" : ""})` : `Practise ${esc(s.name)}`}</button>
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
    cells += `<button class="day ${inM ? "" : "out"} ${k === t ? "today" : ""} ${k === calSel ? "sel" : ""} ${ex ? "examday" : ""}" style="${ex ? `--pc:${subjColor(ex[0])}` : ""}" data-action="pickday" data-k="${k}" aria-label="${fmtD(k, { weekday: "long", day: "numeric", month: "long" })}${ex ? ", " + ex.map(x => subjects[x].name).join(" and ") + " exam" : ""}${ts.length ? ", " + ts.length + " sessions" : ""}">
      <span>${parseKey(k).getDate()}</span>${ex ? `<span class="ex">${esc(subjects[ex[0]].name.slice(0, 4))} exam</span>` : `<span class="dots">${types.map(ty => `<i style="--c:${TYPE_COL[ty]}"></i>`).join("")}</span>`}</button>`;
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
  let qh = `<div class="card empty">${Q.mode === "mistakes" ? "No questions left to review. Nice." : "No questions match these filters."}</div>`;
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
  return `<div class="stack" style="gap:18px">
    <header class="subhead"><div class="eyebrow">Practice</div><h1>Test yourself</h1>${Q.done ? `<p class="small muted">This session: <b class="mono" style="color:var(--ink)">${Q.right}/${Q.done}</b> correct. Every answer updates the topic's accuracy and weak areas.</p>` : `<p class="small muted">Answers feed straight into topic progress, weak areas and your mistakes list.</p>`}</header>
    ${Q.topic ? `<div class="banner">${ico("pencil")}<div>Showing questions for <b>${esc(nodes[Q.topic].title)}</b>. <button data-action="qf" data-k="topic" data-v="">Show all topics</button></div></div>` : ""}
    <div class="filters" role="group" aria-label="Question set">${chip("mode", "all", "All questions")}${chip("mode", "mistakes", "Mistakes to review")}</div>
    ${Q.mode === "all" && !Q.topic ? `<div class="filters" role="group" aria-label="Subject">${chip("subj", "all", "All subjects")}${DSUBJ.map(s => chip("subj", s.id, esc(s.name))).join("")}</div>
    <div class="filters" role="group" aria-label="Difficulty">${chip("lvl", "all", "Any level")}${Object.entries(LEVELS).map(([k, v]) => chip("lvl", k, v)).join("")}</div>` : ""}
    ${qh}
    <section class="section"><div class="sec-head"><h2>Mistakes to review</h2></div>
      <div class="list">${mist.length ? mist.map(([id, m]) => topicItem(id, `${esc(subjects[nodes[id].subject].name)} · ${m.n} incorrect answer${m.n > 1 ? "s" : ""}`)).join("") : `<div class="empty">No mistakes to review. Wrong answers will show up here.</div>`}</div>
      <p class="tiny muted">Topics with repeated mistakes get a higher priority in your plan.</p></section>
  </div>`;
};

/* ---------- progress ---------- */
V.progress = () => {
  const counts = [0, 0, 0, 0, 0, 0]; leafIds.forEach(id => counts[st(id)]++);
  return `<div class="stack" style="gap:22px">
    <header class="subhead"><div class="eyebrow">${leafIds.length} topics tracked</div><h1>Progress</h1></header>
    <div class="card stack">${progRow("Overall", progress(), "var(--pen)", "lg")}
      <div class="dist" role="img" aria-label="Topics by stage">${counts.map((c, i) => c ? `<i style="flex:${c};--c:${i === 0 ? "var(--sunken)" : STATUS_COL[i]}"></i>` : "").join("")}</div>
      <div class="legend">${STATUS.map((x, i) => `<span><i style="--c:${i === 0 ? "var(--line)" : STATUS_COL[i]}"></i>${x} <b class="mono">${counts[i]}</b></span>`).join("")}</div>
      <p class="tiny muted">Progress comes from each subheading's stage, weighted by its number of pages, then rolls up to heading, chapter, subject and overall.</p></div>
    <section class="section"><div class="sec-head"><h2>By subject and chapter</h2></div>
      <div class="tree-prog">${DSUBJ.map((s, si) => `<details class="subj card" ${si === 0 ? "open" : ""}><summary class="stack" style="gap:8px"><div class="row">${ico("chev", 'class="caret"')}<span class="grow" style="font-family:var(--f-display);font-weight:650;font-size:18px">${esc(s.name)}</span><b class="mono">${pct(progress(s.id))}%</b></div>${seg(progress(s.id), "lg", subjColor(s.id))}</summary>
        <div class="lvl1" style="margin-top:14px">${s.chapterIds.map(cid => { const c = nodes[cid]; return `<div class="stack" style="gap:10px"><button data-go="chapter:${cid}" style="text-align:left">${progRow(`Chapter ${c.num}: ${esc(c.title)}`, progress(cid), subjColor(s.id))}</button>
          <div class="lvl2">${c.kids.map(h => `<button data-go="topic:${h}" style="text-align:left">${progRow(`<span class="small">${nodes[h].num} ${esc(nodes[h].title)}</span>`, progress(h), "var(--ink-2)")}</button>`).join("")}</div></div>`; }).join("")}</div></details>`).join("")}</div></section>
    <div class="dash">
      <section class="section"><div class="sec-head"><h2>My weak areas</h2></div><div class="list">${weakList().map(w => `<button class="item" data-go="topic:${w.id}" style="--pc:${PRC[w.sev]}"><span class="mark"></span><span class="grow"><span class="t">${esc(nodes[w.id].title)}</span><br><span class="s">${esc(subjects[nodes[w.id].subject].name)} · ${w.why}</span></span>${ico("chev", 'class="chev"')}</button>`).join("") || `<div class="empty">No weak areas right now.</div>`}</div></section>
      <section class="section"><div class="sec-head"><h2>The revision ladder</h2></div><div class="card stack" style="gap:10px">
        ${[["Not started", "Nothing done yet."], ["Learning", "You have started reading or done a Learn session."], ["Understood", "You can explain it without notes (after active recall)."], ["Practised", "You have answered questions on it."], ["Revised", "You came back to it after a gap."], ["Mastered", "Revised and 80%+ on practice questions. Opening a topic never does this."]].map((x, i) => `<div class="row" style="align-items:flex-start"><span style="width:12px;height:12px;border-radius:4px;margin-top:5px;flex:none;background:${i === 0 ? "var(--line)" : STATUS_COL[i]}"></span><span class="small"><b>${x[0]}.</b> ${x[1]}</span></div>`).join("")}</div></section>
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
    <section class="card stack"><h2 class="h3">My subjects</h2><p class="small muted">${DSUBJ.length} subject${DSUBJ.length === 1 ? "" : "s"}, ${leafIds.length} topics. Add subjects, chapters and page numbers, or import them from a PDF or PowerPoint.</p><button class="btn btn-soft" data-go="edit" style="align-self:flex-start">${ico("pencil")}Edit my subjects</button></section>
    <section class="card stack"><h2 class="h3">Study days</h2>
      <div class="daypick">${order7.map(d => `<button class="chip" aria-pressed="${s.days.includes(d)}" data-action="day" data-d="${d}">${dn[d]}</button>`).join("")}</div>
      <h2 class="h3">Study times</h2>
      <div class="times">${s.blocks.map((b, i) => `<div class="timerow"><span class="small" style="min-width:86px">${i === 0 ? "Morning" : i === 1 ? "Afternoon" : "Block " + (i + 1)}</span><label class="sr" for="bs${i}">Start</label><input type="time" id="bs${i}" value="${fmtT(b[0])}" data-block="${i}" data-edge="0"><span class="muted">to</span><label class="sr" for="be${i}">End</label><input type="time" id="be${i}" value="${fmtT(b[1])}" data-block="${i}" data-edge="1"></div>`).join("")}</div>
      <div class="row"><span class="small grow">Most sessions per day</span><div class="stepper"><button class="icon-btn sm" data-action="perday" data-d="-1" aria-label="Fewer">−</button><b class="mono" id="perday">${s.maxPerDay}</b><button class="icon-btn sm" data-action="perday" data-d="1" aria-label="More">+</button></div></div>
      <p class="tiny muted">Changes rebuild your plan from today. Finished sessions are kept.</p></section>
    <section class="card stack"><h2 class="h3">Appearance</h2>
      <div class="row" style="flex-wrap:wrap"><span class="small grow">Theme</span>${seg3("theme", [["system", "Auto"], ["light", "Light"], ["dark", "Dark"]])}</div>
      <div class="row" style="flex-wrap:wrap"><span class="small grow">Animations</span>${seg3("motion", [["full", "Full"], ["reduced", "Calm"]])}</div></section>
    <section class="card stack" id="install"><h2 class="h3">Install on phone or laptop</h2>
      ${isStandalone() ? `<div class="lock" style="background:color-mix(in oklch,var(--ok) 12%,var(--surface))">${ico("check")}<span>Study Desk is installed and works offline.</span></div>` : `
      ${deferredInstall ? `<button class="btn btn-pen" data-action="install">${ico("download")}Install app</button>` : ""}
      <ol class="steps">${steps.map(x => `<li>${x}</li>`).join("")}</ol>
      <p class="tiny muted">${ico("phone", 'style="width:14px;height:14px;vertical-align:-2px"')} Phone and ${ico("laptop", 'style="width:14px;height:14px;vertical-align:-2px"')} laptop each keep their own progress. Use Backup below to move it between them.</p>`}</section>
    <section class="card stack"><h2 class="h3">Backup and restore</h2>
      <p class="small muted">Your progress is saved on this device automatically, with a safety copy from your last visit. Make a backup before clearing your browser or switching devices.</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-action="export">${ico("download")}Save backup file</button><button class="btn btn-line" data-action="copybak">${ico("copy")}Copy backup</button></div>
      <div class="row" style="flex-wrap:wrap"><label class="btn btn-line" for="importFile">${ico("upload")}Restore from file</label><input type="file" id="importFile" accept="application/json,.json" class="sr"></div>
      <label class="small" for="importText">Or paste a backup</label><textarea id="importText" rows="3" placeholder='{"app":"study-desk", …}'></textarea>
      <div class="row"><button class="btn btn-line btn-sm" data-action="importpaste">Restore pasted backup</button></div>
      ${importMsg ? `<div class="lock" role="status">${ico(importMsg.ok ? "check" : "info")}<span>${esc(importMsg.text)}</span></div>` : ""}</section>
    <section class="card stack"><h2 class="h3">Data check</h2>
      ${dataIssues.length ? `<div class="lock">${ico("info")}<span>${dataIssues.length} thing${dataIssues.length > 1 ? "s" : ""} to fix in the study data:</span></div><ul class="issues">${dataIssues.slice(0, 30).map(i => `<li><b>${esc(i.where)}</b>: ${esc(i.msg)}</li>`).join("")}</ul>` : `<div class="lock" style="background:color-mix(in oklch,var(--ok) 12%,var(--surface))">${ico("shield")}<span>All study data checks out: ${DSUBJ.length} subjects, ${Object.keys(nodes).length} chapters, headings and topics, ${QS.length} questions.</span></div>`}
      ${repairs ? `<p class="tiny muted">${repairs} saved item${repairs > 1 ? "s were" : " was"} out of shape and repaired on start-up.</p>` : ""}
      <p class="tiny muted mono">Saved data ${used} · format v${SCHEMA_NOW} · ${navigator.serviceWorker && navigator.serviceWorker.controller ? "offline ready" : "online only"}</p></section>
    <button class="btn btn-line" data-action="reset">Reset demo data</button>
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
  const finish = (n, parent) => { if (n.p1 == null) { n.p1 = parent?.p1 ?? 0; warnings.push(`“${n.title}” has no page numbers.`); } if (n.p2 == null || n.p2 < n.p1) n.p2 = n.p1; n.kids.forEach(k => finish(k, n)); };
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
function previewRows(list, depth = 0, prefix = "") {
  return list.map((n, i) => { const num = prefix ? prefix + "." + (i + 1) : String(i + 1); return `<div class="prow" style="--d:${depth}"><span class="onum">${num}</span><span class="grow">${esc(n.title)}</span><span class="pages">pp ${n.p1}–${n.p2}</span><span class="tiny muted">${DIFF[n.diff]}</span></div>` + previewRows(n.kids, depth + 1, num); }).join("");
}

V.edit = () => {
  const sample = (S.content.from || "").startsWith("sample");
  return `<div class="stack" style="gap:20px">
    <header class="subhead"><div class="eyebrow">Your study content</div><h1>My subjects</h1><p class="muted">Add your subjects, exam dates, chapters and page numbers. The plan updates as you go.</p></header>
    ${contentNotice && !contentNotice.auto ? `<div class="banner">${ico("download")}<div>New study content has been prepared for you. Loading it replaces the subjects below but keeps progress on topics that still exist. <button data-action="content-load">Load new content</button></div></div>` : ""}
    ${sample ? `<div class="banner">${ico("info")}<div>These are <b>sample subjects</b>. Edit them, or clear them and add your own. <button data-action="content-clear">Remove all sample subjects</button></div></div>` : ""}
    <div class="list">${DSUBJ.length ? DSUBJ.map(s => `<button class="item" data-go="editsubj:${s.id}" style="--pc:${subjColor(s.id)}"><span class="mark"></span><span class="grow"><span class="t">${esc(s.name)}</span><br><span class="s">Exam ${fmtD(s.exam, { day: "numeric", month: "short", year: "numeric" })} · ${s.chapterIds.length} chapter${s.chapterIds.length === 1 ? "" : "s"} · ${leavesBySubject[s.id].length} topics</span></span>${ico("chev", 'class="chev"')}</button>`).join("") : `<div class="empty">No subjects yet. Add your first one below.</div>`}</div>
    <button class="btn btn-pen" data-go="editsubj:new">+ Add a subject</button>
    ${!sample && DSUBJ.length ? `<button class="btn btn-line btn-sm" data-action="content-clear" style="align-self:flex-start">Remove all subjects</button>` : ""}
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
      <p class="tiny muted">Tap a line to edit it. Use + to add a heading or subheading inside it.</p></section>
    <section class="card stack"><h2 class="h3">Add chapters in bulk</h2>
      <div class="dropzone" id="dropzone" data-sid="${sid}">
        <label class="btn btn-soft" for="imp-file">${ico("upload")}Import from PDF or PowerPoint</label><input type="file" id="imp-file" class="sr" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" data-sid="${sid}">
        <span class="tiny muted">or drop or paste the file here. It's read on this device and never uploaded.</span>
        ${importBusy?.reading ? `<div class="lock" role="status"><span class="spin" aria-hidden="true"></span><span>Reading ${esc(importBusy.reading)}…</span></div>` : importBusy?.note ? `<div class="lock" role="status">${ico("check")}<span>${esc(importBusy.note)}</span></div>` : importBusy?.error ? `<div class="lock" role="alert">${ico("info")}<span>${esc(importBusy.error)}</span></div>` : ""}
      </div>
      <p class="small muted">Or type or paste one topic per line: number, title, pages, and optionally easy, medium or hard. Numbers like 3.2.1 set the level.</p>
      <label class="sr" for="qp-text">Contents list</label>
      <textarea id="qp-text" rows="7" placeholder="3 Research methods 75-102&#10;3.1 Research designs 75-82&#10;3.1.1 Experimental designs 76-78 easy&#10;3.1.2 Correlational designs 79-82 hard&#10;3.2 Variables 83-89 hard">${esc(qpText)}</textarea>
      <div class="row"><button class="btn btn-line" data-action="qp-preview" data-id="${sid}">Preview</button></div>
      ${qpPreview ? `<div class="stack" style="gap:8px">${qpPreview.count ? `<p class="small"><b>${qpPreview.count} lines understood.</b> Check them before adding:</p><div class="preview">${previewRows(qpPreview.roots)}</div>` : `<p class="small">Nothing could be read from that text.</p>`}
        ${qpPreview.warnings.length ? `<ul class="issues">${qpPreview.warnings.slice(0, 12).map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
        ${qpPreview.count ? `<div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="qp-apply" data-id="${sid}" data-mode="append">Add to ${esc(s.name)}</button>${raw.chapters.length ? `<button class="btn btn-line btn-sm" data-action="qp-apply" data-id="${sid}" data-mode="replace">Replace all chapters</button>` : ""}</div>` : ""}</div>` : ""}
    </section>`}
  </div>`;
};

/* ---------- generic bottom sheet ---------- */
function openSheet(label, inner) {
  $$(".scrim").forEach(s => s.remove());
  $("#layer").insertAdjacentHTML("beforeend", `<div class="scrim" data-x="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">${inner}</div></div>`);
  const sh = $(".sheet");
  if (FX.on) { sh.style.animation = "none"; gsap.from(sh, { y: 120, opacity: 0, duration: .5, ease: "expo.out" }); }
  dragToClose(sh);
  setTimeout(() => sh.querySelector("input,textarea,select")?.focus({ preventScroll: true }), 60);
}
const sheetHead = (eyebrow, title) => `<div class="sheet-head"><div class="grab"></div><div class="row"><div class="grow"><div class="tiny muted mono">${esc(eyebrow)}</div><h2>${esc(title)}</h2></div><button class="icon-btn" data-x="close" aria-label="Close">${ico("x")}</button></div></div>`;
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
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = "Tap again to delete it and its progress"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Delete subject"; } }, 3500); return true; }
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
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = "Tap again to delete"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Delete"; } }, 3500); return true; }
      const f = findRaw(id); if (!f) return true;
      snapshot(); f.list.splice(f.index, 1); afterContentChange(true); closeSheet(); rerender(); toast(`${f.node.title} deleted.`, { label: "Undo", fn: undo }); return true;
    }
    case "node-move": {
      const f = findRaw(id), j = f.index + +a.dataset.d; if (j < 0 || j >= f.list.length) return true;
      [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]];
      const y = window.scrollY; afterContentChange(false); render(false); window.scrollTo({ top: y }); return true;
    }
    case "qp-preview": qpText = $("#qp-text")?.value || ""; qpPreview = parseOutline(qpText); rerender(); return true;
    case "qp-apply": {
      if (!qpPreview || !qpPreview.count) return true;
      snapshot();
      const raw = S.content.subjects.find(s => s.id === id);
      if (a.dataset.mode === "replace") raw.chapters = qpPreview.roots; else raw.chapters.push(...qpPreview.roots);
      const n = qpPreview.count; qpPreview = null; qpText = "";
      afterContentChange(true); rerender(); toast(`${n} chapters, headings and topics added. Plan updated.`, { label: "Undo", fn: undo }); return true;
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
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.dataset.label = a.textContent; a.textContent = "Tap again to remove them all"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = a.dataset.label; } }, 3500); return true; }
      snapshot(); S.content = { from: "own", subjects: [], questions: [], explain: {} }; S.status = {}; S.attempts = {}; S.mistakes = {}; S.tasks = []; S.recent = []; S.changes = [];
      afterContentChange(true); rerender(); toast("All subjects removed. Add your own below.", { label: "Undo", fn: undo }); return true;
    case "content-load":
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = "Tap again to replace your subjects"; return true; }
      snapshot(); loadDataFile(); contentNotice = null; rerender(); toast("New study content loaded.", { label: "Undo", fn: undo }); return true;
  }
  return false;
}

/* ---------- import a contents list from a PDF or PowerPoint (read on this device, nothing is uploaded) ---------- */
let importBusy = null;
const stripNum = t => t.replace(/\s+/g, " ").trim().replace(/^(chapter|ch\.?|unit|part|module|section|lecture|week)\s*\d+(\.\d+)*\s*[.:)\-–—]?\s*/i, "").replace(/^\d+(\.\d+)*\s*[.:)\-–—]?\s+/, "").trim();
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  const base = new URL("vendor/", document.baseURI).href;
  const lib = await import(base + "pdf.min.mjs");
  lib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
  window.pdfjsLib = lib; return lib;
}
async function pdfToOutline(buf) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: buf, isEvalSupported: false }).promise;
  let labels = null; try { labels = await doc.getPageLabels(); } catch (e) { }
  const pageNo = i => { const l = labels && labels[i]; return l && /^\d+$/.test(l) ? +l : i + 1; };
  const outline = await doc.getOutline().catch(() => null);
  if (outline && outline.length) {
    const lines = []; let count = 0;
    const resolve = async it => { try { let d = it.dest; if (typeof d === "string") d = await doc.getDestination(d); if (Array.isArray(d) && d[0]) { const idx = typeof d[0] === "number" ? d[0] : await doc.getPageIndex(d[0]); return pageNo(idx); } } catch (e) { } return null; };
    const walk = async (items, prefix, depth) => { for (let i = 0; i < items.length && count < 400; i++) { const it = items[i], num = prefix ? prefix + "." + (i + 1) : String(i + 1), p = await resolve(it), t = stripNum(it.title || ""); if (!t) continue; count++; lines.push(`${num} ${t}${p != null ? " " + p : ""}`); if (depth < 3 && it.items && it.items.length) await walk(it.items, num, depth + 1); } };
    await walk(outline, "", 0);
    if (lines.length) return { text: lines.join("\n"), note: `Read ${count} bookmarks from the PDF. Page numbers come from the PDF, so check they match your book.` };
  }
  /* no bookmarks: look for a contents page and read its lines */
  const pageLines = async i => {
    const pg = await doc.getPage(i), tc = await pg.getTextContent(), rows = [];
    tc.items.forEach(it => { if (!it.str || !it.str.trim()) return; const y = Math.round(it.transform[5]), x = it.transform[4]; let r = rows.find(r => Math.abs(r.y - y) <= 3); if (!r) rows.push(r = { y, parts: [] }); r.parts.push({ x, s: it.str }); });
    return rows.sort((a, b) => b.y - a.y).map(r => r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(" ").replace(/\s+/g, " ").trim());
  };
  const max = Math.min(doc.numPages, 30), tocLike = l => /\S.*\s(\d{1,4})$/.test(l) && /[a-z]{3}/i.test(l) && l.length < 160;
  let start = -1, collected = [];
  for (let i = 1; i <= max; i++) {
    const ls = await pageLines(i);
    if (start < 0 && ls.some(l => /^(table of )?contents$/i.test(l.trim()))) start = i;
    if (start > 0) { const good = ls.filter(tocLike); if (i > start && good.length < 3) break; collected.push(...good); }
  }
  if (!collected.length) for (let i = 1; i <= max; i++) { const good = (await pageLines(i)).filter(l => tocLike(l) && /^(\d+(\.\d+)*|chapter|unit)\b/i.test(l)); if (good.length >= 4) collected.push(...good); }
  if (collected.length) return { text: collected.slice(0, 400).join("\n"), note: start > 0 ? `Read the contents page (page ${start} of the PDF). Check the levels and page numbers before adding.` : "This PDF has no bookmarks or contents page, so these lines were picked from numbered headings. Check them carefully." };
  return { text: "", note: "Couldn't find bookmarks or a contents page in this PDF. Type or paste the contents list instead." };
}
async function pptxToOutline(buf, name) {
  if (!window.JSZip) throw new Error("zip");
  const zip = await JSZip.loadAsync(buf);
  const files = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => +a.match(/(\d+)\.xml$/)[1] - +b.match(/(\d+)\.xml$/)[1]);
  const titles = [];
  for (let i = 0; i < files.length; i++) {
    const xml = new DOMParser().parseFromString(await zip.file(files[i]).async("string"), "application/xml");
    const shapes = [...xml.getElementsByTagNameNS("*", "sp")];
    const textOf = sp => [...sp.getElementsByTagNameNS("*", "p")].map(p => [...p.getElementsByTagNameNS("*", "t")].map(t => t.textContent).join("")).filter(Boolean);
    const isTitle = sp => [...sp.getElementsByTagNameNS("*", "ph")].some(ph => /title|ctrTitle/i.test(ph.getAttribute("type") || ""));
    let t = shapes.filter(isTitle).flatMap(textOf).join(" ").trim();
    if (!t) t = (shapes.map(textOf).find(x => x.length) || [""])[0];
    titles.push(stripNum(t) || `Slide ${i + 1}`);
  }
  if (!titles.length) return { text: "", note: "No slides found in that file." };
  const deck = stripNum(name.replace(/\.pptx$/i, "").replace(/[_-]+/g, " ")) || "Slides";
  const lines = [`1 ${deck} 1-${titles.length}`]; let k = 0;
  for (let i = 0; i < titles.length; i++) { let j = i; while (j + 1 < titles.length && titles[j + 1].replace(/\s*\(cont.*\)$/i, "") === titles[i]) j++; k++; lines.push(`1.${k} ${titles[i]} ${i + 1}-${j + 1}`); i = j; }
  return { text: lines.join("\n"), note: `Read ${titles.length} slides from ${name}. Slide numbers are used as page numbers.` };
}
async function importFile(file, sid) {
  if (!file) return;
  const name = file.name || "file", ext = (name.match(/\.(\w+)$/) || [])[1]?.toLowerCase();
  if (file.size > 80e6) { importBusy = { error: "That file is over 80 MB. Try a smaller PDF or just the contents pages." }; rerender(); return; }
  if (ext === "ppt") { importBusy = { error: "Old .ppt files can't be read. Open it in PowerPoint and save it as .pptx first." }; rerender(); return; }
  if (!["pdf", "pptx"].includes(ext)) { importBusy = { error: "Choose a PDF or a PowerPoint (.pptx) file." }; rerender(); return; }
  importBusy = { reading: name }; rerender();
  try {
    const buf = await file.arrayBuffer();
    const r = ext === "pdf" ? await pdfToOutline(buf) : await pptxToOutline(buf, name);
    importBusy = r.text ? { note: r.note } : { error: r.note };
    if (r.text) { qpText = r.text; qpPreview = parseOutline(qpText); }
  } catch (e) {
    console.error(e);
    importBusy = { error: /password/i.test(String(e && e.message)) ? "That PDF is password-protected. Remove the password and try again." : `Couldn't read ${name}. It may be damaged or scanned as images only.` };
  }
  if (stack[stack.length - 1].v === "editsubj" && stack[stack.length - 1].a === sid) rerender();
}

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
const TABS = [["today", "Today", "today"], ["exams", "Exams", "exams"], ["calendar", "Calendar", "cal"], ["practice", "Practice", "practice"], ["progress", "Progress", "progress"]];
const RAIL = [...TABS, ["settings", "Settings", "gear"]];
const tabOf = r => ({ subject: "exams", chapter: "exams", topic: "exams" })[r.v] || r.v;
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
  const isTab = RAIL.some(t => t[0] === v);
  navigate(() => { if (isTab) stack = [{ v }]; else stack.push({ v, a }); }, isTab ? "tab" : "forward");
}
function back() { if (stack.length > 1) navigate(() => stack.pop(), "back"); }
function crumbs() {
  const r = stack[stack.length - 1];
  if (stack.length === 1) return `<div class="brand"><i></i>Study Desk</div>${deferredInstall && !isStandalone() ? `<button class="proto" data-action="install">Install app</button>` : `<span class="proto">Sample data</span>`}<button class="icon-btn sm gear" data-go="settings" aria-label="Settings">${ico("gear")}</button>`;
  let trail = [];
  const id = r.a;
  if (r.v === "subject" && subjects[id]) trail = [["subject:" + id, subjects[id].name]];
  else if (nodes[id]) {
    let n = nodes[id]; const chain = []; while (n) { chain.unshift(n); n = n.parent ? nodes[n.parent] : null; }
    trail = [["subject:" + chain[0].subject, subjects[chain[0].subject].name], ...chain.map(c => [(c.depth === 0 ? "chapter:" : "topic:") + c.id, crumbTitle(c.id)])];
  } else if (r.v === "practice") trail = [["practice", "Practice"]];
  else if (r.v === "edit") trail = [["edit", "My subjects"]];
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
  $("#main").innerHTML = `<div class="topbar">${crumbs()}</div><div class="view" data-view="${r.v}">${html}</div>`;
  const cur = tabOf(stack[0]);
  const mk = list => `<span class="ind" aria-hidden="true"></span>` + list.map(([k, l, i]) => `<button class="tab" data-go="${k}" ${cur === k ? 'aria-current="page"' : ""}>${ico(i)}<span>${l}</span></button>`).join("");
  $("#tabs").innerHTML = mk(TABS); $("#railTabs").innerHTML = mk(RAIL);
  requestAnimationFrame(() => { placeIndicator($("#tabs")); placeIndicator($("#railTabs")); });
  if (fresh) { window.scrollTo({ top: 0 }); FX.enter(r.v, true); }
  lastDay = todayKey();
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
  Q.picked = i; Q.done++; const ok = i === q.a; if (ok) Q.right++;
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
  if (rebuild) { generate(todayKey()); S.changes.unshift({ when: todayKey(), text: "Study settings changed, so the plan was rebuilt from today." }); }
  save();
}
function download(name, text) {
  try { const url = URL.createObjectURL(new Blob([text], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); return true; } catch (e) { return false; }
}
function doImport(txt) {
  const r = importText(txt);
  if (r.error) { importMsg = { ok: false, text: r.error }; rerender(); return; }
  snapshot();
  S = r.state; repairs = r.fixes; buildModel(); rollOver(); applySettings(false); save(true);
  importMsg = { ok: true, text: "Backup restored" + (r.fixes ? `, with ${r.fixes} item${r.fixes > 1 ? "s" : ""} repaired.` : ".") };
  rerender(); toast("Backup restored.", { label: "Undo", fn: undo });
}

document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]"), g = e.target.closest("[data-go]"), c = e.target.closest("[data-crumb]");
  if (a) {
    e.preventDefault(); e.stopPropagation();
    const act = a.dataset.action, id = a.dataset.id;
    if (editorAction(act, a)) return;
    switch (act) {
      case "back": back(); return;
      case "toggle": {
        const t = S.tasks.find(x => x.id === id); if (!t) return;
        t.done = !t.done;
        if (t.done) {
          t.prev = st(t.node);
          if (t.type !== "mock") { const ns = { learn: 1, recall: 2, practice: 3, calc: 3, revision: 4 }[t.type]; if (ns > st(t.node)) setStatus(t.node, ns); }
          S.recent.unshift({ id: t.node, text: TYPES[t.type].label, when: todayKey() }); S.recent = S.recent.slice(0, 20); save();
          a.setAttribute("aria-checked", "true");
          const moved = t.type !== "mock" && st(t.node) !== t.prev;
          FX.floatChip(a, moved ? "→ " + STATUS[st(t.node)] : "Done");
          const left = tasksOn(t.date).filter(x => !x.done).length;
          setTimeout(() => { flipRerender(); if (t.date === todayKey() && left === 0) { FX.party(); toast("Day complete. Everything on today's plan is done."); } else toast(t.type === "mock" ? "Mock test logged." : `${nodes[t.node].title} is now “${STATUS[st(t.node)]}”.` + (t.type === "learn" && moved ? " Active recall moves it to Understood." : "")); }, FX.on ? 320 : 0);
        } else { if (t.prev !== undefined) S.status[t.node] = t.prev; const i = S.recent.findIndex(r => r.id === t.node); if (i === 0) S.recent.shift(); save(); flipRerender(); }
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
      case "step": { const cur = st(id); if (cur >= 5 || (cur === 4 && !(acc(id) >= .8 && S.attempts[id].a >= 3))) return; setStatus(id, cur + 1, STATUS[cur + 1]); rerender(); FX.ladder(); FX.burst($(".rung.cur") || a, cur + 1 === 5 ? 90 : 24, cur + 1 === 5 ? 100 : 55); toast(`${nodes[id].title}: ${STATUS[cur + 1]}.`); return; }
      case "stepdown": setStatus(id, st(id) - 1); rerender(); return;
      case "dunno": openExplain(id); return;
      case "practise": { const has = QS.some(q => q.node === id); Q = { ...Q, topic: has ? id : null, subj: has ? "all" : nodes[id].subject, lvl: "all", mode: "all", idx: 0, picked: null }; navigate(() => stack.push({ v: "practice" }), "forward"); return; }
      case "qf": Q[a.dataset.k] = a.dataset.v || (a.dataset.k === "topic" ? null : "all"); if (a.dataset.k === "mode") Q.topic = null; Q.idx = 0; Q.picked = null; rerender(); return;
      case "answer": { const ok = answer(+a.dataset.i); rerender(); if (ok) { FX.burst($(".opt.right"), 22, 50); if (FX.on) gsap.fromTo("#qscore", { scale: 1.25 }, { scale: 1, duration: .5, ease: "back.out(3)" }); } return; }
      case "nextq": Q.idx++; Q.picked = null; rerender(); if (FX.on) gsap.from("#qcard", { x: 24, opacity: 0, duration: .35, ease: "power3.out", clearProps: "all" }); $("#qcard")?.scrollIntoView({ block: "nearest" }); return;
      case "pickday": calSel = a.dataset.k; if (calSel.slice(0, 7) !== calMonth.slice(0, 7)) calMonth = calSel.slice(0, 7) + "-01"; rerender(); return;
      case "month": { const d = parseKey(calMonth), dir = +a.dataset.d; d.setMonth(d.getMonth() + dir); calMonth = keyOf(d); rerender(); if (FX.on) gsap.from("#calGrid", { x: 30 * dir, opacity: 0, duration: .35, ease: "power3.out", clearProps: "all" }); return; }
      case "replan": snapshot(); generate(todayKey()); S.changes.unshift({ when: todayKey(), text: "Plan rebuilt from today using your latest progress and practice scores." }); save(); flipRerender(); toast("Plan rebuilt from today.", { label: "Undo", fn: undo }); return;
      case "day": { const d = +a.dataset.d, days = S.settings.days; if (days.includes(d)) { if (days.length === 1) { toast("Keep at least one study day."); return; } S.settings.days = days.filter(x => x !== d); } else S.settings.days = [...days, d].sort(); snapshot(); applySettings(true); rerender(); toast("Study days updated. Plan rebuilt.", { label: "Undo", fn: undo }); return; }
      case "perday": S.settings.maxPerDay = clamp(S.settings.maxPerDay + +a.dataset.d, 2, 10); applySettings(true); rerender(); return;
      case "setopt": S.settings[a.dataset.k] = a.dataset.v; applySettings(false); rerender(); return;
      case "install": if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; rerender(); }); } else go("settings"); return;
      case "export": { const ok = download(`study-desk-backup-${todayKey()}.json`, exportText()); toast(ok ? "Backup file saved." : "Saving files isn't allowed here. Use Copy backup instead."); return; }
      case "copybak": { const txt = exportText(); const fallback = () => { const ta = $("#importText"); if (ta) { ta.value = txt; ta.select(); } toast("Backup placed in the box below. Copy it from there."); }; try { navigator.clipboard.writeText(txt).then(() => toast("Backup copied. Paste it somewhere safe."), fallback); } catch (err) { fallback(); } return; }
      case "importpaste": { const v = ($("#importText") || {}).value || ""; if (!v.trim()) { importMsg = { ok: false, text: "Paste a backup into the box first." }; rerender(); return; } doImport(v); return; }
      case "reset": if (a.dataset.confirm) { snapshot(); ls.del(KEY); ls.del(BAK); fresh(); rollOver(); applySettings(false); save(true); Q = { subj: "all", lvl: "all", topic: null, mode: "all", idx: 0, picked: null, right: 0, done: 0 }; stack = [{ v: "today" }]; FX.intro = true; render(true); toast("Demo data reset.", { label: "Undo", fn: undo }); } else { a.dataset.confirm = "1"; a.textContent = "Tap again to reset everything"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Reset demo data"; } }, 3000); } return;
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
  if (el.id === "importFile" && el.files && el.files[0]) {
    const f = el.files[0];
    if (f.size > 5e6) { importMsg = { ok: false, text: "That file is too big to be a Study Desk backup." }; rerender(); return; }
    const rd = new FileReader(); rd.onload = () => doImport(String(rd.result)); rd.onerror = () => { importMsg = { ok: false, text: "Couldn't read that file." }; rerender(); }; rd.readAsText(f);
  }
});
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-action],[role="link"][data-go]')) { e.preventDefault(); e.target.click(); }
  if (e.key === "Escape") closeSheet();
});
function dayCheck() { if (S && lastDay && lastDay !== todayKey()) { if (rollOver()) save(); render(false); } }
setInterval(dayCheck, 60000);

/* ---------- "I don't understand this" sheet (drag down to close) ---------- */
let X = { id: null, mode: 0, picked: null };
function explainFor(id) {
  const n = nodes[id], e = S.content.explain[id];
  if (e) return e;
  const ch = chapterOf(id);
  return {
    generic: true,
    simple: `${n.title} is one idea inside “${ch.title}”. In everyday words: [a plain-language explanation from your real notes goes here].`,
    uni: `On pages ${n.p1}–${n.p2} the textbook defines ${n.title.toLowerCase()} and links it to the rest of chapter ${ch.num}. [The academic explanation will be written from your real study material.]`,
    exam: `For the exam: define ${n.title.toLowerCase()} precisely, give one example, and connect it to a key theory from chapter ${ch.num}. [Exam tips will come from your real past papers and marking guides.]`,
    example: `[A worked example for ${n.title} will appear here once real content is added.]`
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
  if (X.mode < 4) body = `<div class="explain"><p>${esc([e.simple, e.uni, e.exam, e.example][X.mode] || "")}</p>${e.generic ? `<p class="note">Sample topic without written explanations. Try “Statistical significance”, “Degrees of freedom” or “Confounding variables” to see the full version.</p>` : ""}</div>`;
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
(function boot() {
  if (!loadState()) fresh();
  checkDataFile();
  if (rollOver()) save();
  if (DSUBJ.length && !S.tasks.some(t => t.date >= todayKey())) { generate(todayKey()); save(); }
  applySettings(false);
  render(true);
  if (contentNotice && contentNotice.auto) toast("Your study content was updated.");
  document.documentElement.classList.add("ready");
})();

/* paste or drop a PDF / PowerPoint onto the subject editor */
document.addEventListener("paste", e => {
  const r = stack[stack.length - 1]; if (r.v !== "editsubj" || r.a === "new") return;
  const f = [...(e.clipboardData?.files || [])].find(f => /\.(pdf|pptx?)$/i.test(f.name)); if (!f) return;
  e.preventDefault(); importFile(f, r.a);
});
document.addEventListener("dragover", e => { const z = e.target.closest?.("#dropzone"); if (z) { e.preventDefault(); z.classList.add("over"); } });
document.addEventListener("dragleave", e => { const z = e.target.closest?.("#dropzone"); if (z) z.classList.remove("over"); });
document.addEventListener("drop", e => { const z = e.target.closest?.("#dropzone"); if (!z) return; e.preventDefault(); z.classList.remove("over"); const f = e.dataTransfer?.files?.[0]; if (f) importFile(f, z.dataset.sid); });
