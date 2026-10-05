/* Study Desk — app logic
   Sections: 1 utils · 2 model · 3 store · 4 priority & progress · 5 scheduler · 6 icons
             7 UI pieces · 8 views · 9 motion · 10 router & actions · 11 install & offline · 12 boot */
"use strict";
const APP_VERSION = "2.0.0";
const SCHEMA = 2;

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
   2. MODEL — builds a flat, validated index from window.STUDY_DATA
   ===================================================================== */
const DATA = window.STUDY_DATA || { subjects: [], questions: [], history: {}, mistakes: {}, explain: {} };
const STATUS = ["Not started", "Learning", "Understood", "Practised", "Revised", "Mastered"];
const STATUS_COL = ["var(--line)", "var(--p-medium)", "var(--p-high)", "var(--pen)", "var(--p-done)", "var(--ok)"];
const DIFF = ["", "Easy", "Medium", "Difficult"];
const LEVELS = { easy: "Easy", medium: "Medium", hard: "Difficult", exam: "Exam-style" };
const TYPES = {
  learn: { label: "Learn", icon: "book" }, recall: { label: "Active recall", icon: "bulb" }, practice: { label: "Practice questions", icon: "pencil" },
  revision: { label: "Revision", icon: "loop" }, calc: { label: "Calculations", icon: "sigma" }, mock: { label: "Mock test", icon: "clip" }
};
const nodes = {}, subjects = {}, leavesBySubject = {}, byTitle = {}, legacyId = {};
const dataIssues = [];
const issue = (where, msg) => dataIssues.push({ where, msg });

(function buildModel() {
  if (!window.STUDY_DATA) issue("data.js", "The data file did not load, so there is nothing to show.");
  const seenS = new Set();
  (DATA.subjects || []).forEach((s, si) => {
    if (!s || !s.id || !s.name) { issue("Subject " + (si + 1), "Needs an id and a name."); return; }
    if (seenS.has(s.id)) { issue(s.name, "Two subjects share the id “" + s.id + "”."); return; }
    seenS.add(s.id);
    if (!(s.exam && DATE_RE.test(s.exam)) && !Number.isInteger(s.examInDays)) issue(s.name, "Needs an exam date (exam:\"YYYY-MM-DD\") or examInDays.");
    if (s.examTime && parseT(s.examTime) === null) issue(s.name, "Exam time should look like 09:00.");
    if (typeof s.hue !== "number") s.hue = (si * 97 + 24) % 360;
    subjects[s.id] = s; leavesBySubject[s.id] = []; s.chapterIds = [];
    const walk = (raw, parent, depth, idx, siblingsSeen) => {
      if (!Array.isArray(raw) || typeof raw[0] !== "string") { issue(s.name, "A topic entry is not in the [title, from, to, difficulty, …] format."); return null; }
      const [title, p1, p2, diff, rest, extra] = raw;
      const num = parent ? parent.num + "." + (idx + 1) : String(idx + 1);
      let sl = slug(title), k = 2; while (siblingsSeen.has(sl)) sl = slug(title) + "-" + (k++);
      siblingsSeen.add(sl);
      const id = (parent ? parent.id : s.id) + "/" + sl;
      const where = s.name + " " + num + " " + title;
      if (!isInt(p1, 0, 1e5) || !isInt(p2, 0, 1e5) || p1 > p2) issue(where, "Page range should be two whole numbers, first ≤ last.");
      if (parent && (p1 < parent.p1 || p2 > parent.p2)) issue(where, `Pages ${p1}–${p2} fall outside the parent's ${parent.p1}–${parent.p2}.`);
      if (!isInt(diff, 1, 3)) issue(where, "Difficulty should be 1, 2 or 3.");
      const n = { id, title, p1: +p1 || 0, p2: Math.max(+p2 || 0, +p1 || 0), diff: isInt(diff, 1, 3) ? diff : 2, num, depth, subject: s.id, parent: parent ? parent.id : null, kids: [], calc: !!(extra && extra.calc) };
      nodes[id] = n; legacyId[s.id + "-" + num.replace(/\./g, "-")] = id;
      if (Array.isArray(rest)) { const seen = new Set(); rest.forEach((r, i) => { const c = walk(r, n, depth + 1, i, seen); if (c) n.kids.push(c.id); }); if (!n.kids.length) n.leaf = true; }
      else n.leaf = true;
      if (n.leaf) {
        n.seed = isInt(rest, 0, 5) ? rest : 0;
        if (rest !== undefined && !Array.isArray(rest) && !isInt(rest, 0, 5)) issue(where, "Starting status should be 0–5.");
        leavesBySubject[s.id].push(n);
        if (byTitle[title]) issue(where, "Another topic has the same title, so questions for it may attach to the wrong one.");
        else byTitle[title] = n;
      }
      return n;
    };
    const seen = new Set();
    (s.chapters || []).forEach((c, i) => { const n = walk(c, null, 0, i, seen); if (n) s.chapterIds.push(n.id); });
    if (!leavesBySubject[s.id].length) issue(s.name, "Has no topics yet.");
  });
  DATA.questions = (DATA.questions || []).filter((q, i) => {
    const where = "Question " + (i + 1);
    q.id = "q" + i + "-" + slug(q.topic || "").slice(0, 24);
    const n = byTitle[q.topic];
    if (!n) { issue(where, "Topic “" + q.topic + "” doesn't match any subheading title."); return false; }
    if (!Array.isArray(q.o) || q.o.length < 2) { issue(where, "Needs at least two answer options."); return false; }
    if (!isInt(q.a, 0, q.o.length - 1)) { issue(where, "Correct answer index is out of range."); return false; }
    if (!LEVELS[q.level]) { issue(where, "Level should be easy, medium, hard or exam."); q.level = "medium"; }
    q.node = n.id; q.subject = n.subject; return true;
  });
  Object.keys(DATA.history || {}).forEach(t => { const h = DATA.history[t]; if (!byTitle[t]) issue("History", "“" + t + "” doesn't match a topic."); else if (!(isInt(h.a, 0, 1e4) && isInt(h.c, 0, h.a))) issue("History", "“" + t + "” has more correct answers than attempts."); });
  Object.keys(DATA.mistakes || {}).forEach(t => { if (!byTitle[t]) issue("Mistakes", "“" + t + "” doesn't match a topic."); });
})();
const DSUBJ = (DATA.subjects || []).filter(s => subjects[s.id] === s);
const leafIds = Object.values(nodes).filter(n => n.leaf).map(n => n.id);
const pagesOf = n => Math.max(1, n.p2 - n.p1 + 1);
const chapterOf = id => { let n = nodes[id]; while (n && n.parent) n = nodes[n.parent]; return n; };

/* =====================================================================
   3. STORE — versioned, validated, backed up
   ===================================================================== */
const KEY = "studydesk.v2", BAK = "studydesk.v2.bak", LEGACY = "studydesk.proto.v1";
const DEFAULT_SETTINGS = { days: [1, 2, 3, 4, 5, 6], blocks: [[540, 720], [840, 1020]], maxPerDay: 6, theme: "system", motion: "full" };
let S, saveTimer = null, saveFailed = false, repairs = 0, restoredFrom = null, lastDay = null;
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
addEventListener("pagehide", () => save(true));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(true); else dayCheck(); });

const examKey = sid => { const s = subjects[sid]; return s.exam && DATE_RE.test(s.exam) ? s.exam : addDays(S.anchor, s.examInDays || 0); };
const daysLeft = sid => diffDays(examKey(sid), todayKey());
const st = id => S.status[id] ?? 0;
const acc = id => { const h = S.attempts[id]; return h && h.a ? h.c / h.a : null; };

function blankState() {
  const t = todayKey();
  const s = { schema: SCHEMA, app: "study-desk", anchor: t, status: {}, attempts: {}, mistakes: {}, tasks: [], recent: [], changes: [], seq: 0, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) };
  leafIds.forEach(id => s.status[id] = nodes[id].seed);
  Object.entries(DATA.history || {}).forEach(([k, v]) => { if (byTitle[k] && isInt(v.a, 0, 1e4) && isInt(v.c, 0, v.a)) s.attempts[byTitle[k].id] = { a: v.a, c: v.c }; });
  Object.entries(DATA.mistakes || {}).forEach(([k, n]) => { if (byTitle[k] && isInt(n, 1, 999)) { const id = byTitle[k].id; s.mistakes[id] = { n, qs: DATA.questions.filter(q => q.node === id).map(q => q.id).slice(0, n) }; } });
  return s;
}
function fresh() {
  S = blankState();
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

/* v1 (single-file prototype) → v2: ids moved from positions to title paths */
function migrate(o) {
  if (!o || typeof o !== "object") return null;
  if (o.v === 1 && !o.schema) {
    const map = id => legacyId[id] || null;
    const remapObj = src => { const out = {}; Object.entries(src || {}).forEach(([k, v]) => { const n = map(k); if (n) out[n] = v; }); return out; };
    o = {
      schema: 2, app: "study-desk", anchor: o.anchor, status: remapObj(o.status), attempts: remapObj(o.attempts),
      mistakes: Object.fromEntries(Object.entries(remapObj(o.mistakes)).map(([k, m]) => [k, { n: m.n, qs: [] }])),
      tasks: (o.tasks || []).map(t => ({ ...t, node: map(t.node) })).filter(t => t.node),
      recent: (o.recent || []).map(r => ({ ...r, id: map(r.id) })).filter(r => r.id),
      changes: (o.changes || []).map(c => ({ when: c.when, text: c.text })), seq: o.seq || 0, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    };
  }
  if (o.schema !== SCHEMA) return null;
  return o;
}
/* Repairs anything out of shape instead of crashing. Counts what it fixed. */
function sanitize(o) {
  let fixes = 0; const fix = () => fixes++;
  const out = blankState();
  if (typeof o.anchor === "string" && DATE_RE.test(o.anchor)) out.anchor = o.anchor; else fix();
  Object.entries(o.status || {}).forEach(([k, v]) => { if (nodes[k] && nodes[k].leaf && isInt(v, 0, 5)) out.status[k] = v; else fix(); });
  out.attempts = {};
  Object.entries(o.attempts || {}).forEach(([k, v]) => { if (nodes[k] && v && isInt(v.a, 0, 1e5) && isInt(v.c, 0, v.a)) out.attempts[k] = { a: v.a, c: v.c }; else fix(); });
  out.mistakes = {};
  const qIds = new Set(DATA.questions.map(q => q.id));
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
  if (!o) { const leg = ls.get(LEGACY); o = tryParse(leg); src = o ? "legacy" : null; }
  if (!o) return false;
  const r = sanitize(o);
  S = r.state; repairs = r.fixes; restoredFrom = src === "main" ? null : src;
  if (main && src === "main") ls.set(BAK, main); /* last good copy from the previous session */
  if (src === "legacy") ls.del(LEGACY);
  return true;
}

/* ---------- backup / restore ---------- */
function exportText() { return JSON.stringify({ app: "study-desk", schema: SCHEMA, version: APP_VERSION, exportedAt: new Date().toISOString(), state: S }, null, 1); }
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
function undo() { if (!undoSnap) return; S = JSON.parse(undoSnap); undoSnap = null; save(); flipRerender(); toast("Undone."); }

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

V.exams = () => `<div class="stack" style="gap:20px"><header class="subhead"><div class="eyebrow">${DSUBJ.length} subjects</div><h1>Exam countdown</h1><p class="muted">Counted from today's date. The closer the exam and the less prepared you are, the louder the card.</p></header>
  <div class="exams grid">${DSUBJ.slice().sort((a, b) => daysLeft(a.id) - daysLeft(b.id)).map(s => examCard(s.id)).join("")}</div></div>`;

V.subject = sid => {
  const s = subjects[sid]; if (!s) return V.exams();
  const d = daysLeft(sid), lvl = subjLevel(sid);
  return `<div class="stack" style="gap:22px">
    <header class="subhead"><div class="eyebrow">${esc(s.code || "")}${s.course ? " · " + esc(s.course) : ""}</div><h1>${esc(s.name)}</h1>
      <div class="chips"><span class="countchip" style="--pc:${PRC[lvl]}"><b>${Math.max(d, 0)}</b> day${d === 1 ? "" : "s"} left</span><span class="small muted">${fmtD(examKey(sid), { weekday: "long", day: "numeric", month: "long" })}${s.examTime ? " · " + esc(s.examTime) : ""}${s.venue ? " · " + esc(s.venue) : ""}</span></div></header>
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
  const qs = DATA.questions.filter(q => q.node === id);
  const ts = S.tasks.filter(t => t.node === id && t.type !== "mock" && t.date >= todayKey()).sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start).slice(0, 4);
  const canMaster = cur === 4 && a !== null && a >= .8 && h.a >= 3;
  let next = "";
  if (cur < 4) next = `<button class="btn btn-pen" data-action="step" data-id="${id}">${ico("check")}Mark as ${STATUS[cur + 1].toLowerCase()}</button>`;
  else if (cur === 4) next = `<button class="btn btn-pen" data-action="step" data-id="${id}" ${canMaster ? "" : "disabled"}>${ico("spark")}Mark as mastered</button>`;
  const lockMsg = cur === 4 && !canMaster ? `<div class="lock">${ico("lock")}<span>Mastered unlocks after revision <b>and</b> at least 80% on 3 or more practice questions. ${a === null ? "No practice answers yet." : `Right now: ${h.c}/${h.a} correct (${pct(a)}%).`}</span></div>`
    : cur < 4 ? `<div class="lock">${ico("info")}<span>Opening or reading a topic never marks it mastered. Each step needs real work: practice moves it to Practised, revision to Revised, and Mastered needs a strong practice score.</span></div>` : "";
  return `<div class="stack" style="gap:20px">
    <header class="subhead"><div class="eyebrow">${esc(s.name)} · ${n.num}</div><h1>${esc(n.title)}</h1>
      <div class="chips"><span class="bigpages">Pages ${n.p1}–${n.p2}</span>${diffTag(n.diff)}${prPill(sp.level)}</div></header>
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
          ${qs.length ? "" : `<p class="tiny muted">This topic has no questions yet. Questions come with your real content.</p>`}</section>
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
  if (Q.mode === "mistakes") { const ids = new Set(Object.values(S.mistakes).flatMap(m => m.qs)); return DATA.questions.filter(q => ids.has(q.id)); }
  return DATA.questions.filter(q => (Q.topic ? q.node === Q.topic : true) && (Q.subj === "all" || q.subject === Q.subj) && (Q.lvl === "all" || q.level === Q.lvl));
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
      ${dataIssues.length ? `<div class="lock">${ico("info")}<span>${dataIssues.length} thing${dataIssues.length > 1 ? "s" : ""} to fix in the study data:</span></div><ul class="issues">${dataIssues.slice(0, 30).map(i => `<li><b>${esc(i.where)}</b>: ${esc(i.msg)}</li>`).join("")}</ul>` : `<div class="lock" style="background:color-mix(in oklch,var(--ok) 12%,var(--surface))">${ico("shield")}<span>All study data checks out: ${DSUBJ.length} subjects, ${Object.keys(nodes).length} chapters, headings and topics, ${DATA.questions.length} questions.</span></div>`}
      ${repairs ? `<p class="tiny muted">${repairs} saved item${repairs > 1 ? "s were" : " was"} out of shape and repaired on start-up.</p>` : ""}
      <p class="tiny muted mono">Saved data ${used} · format v${SCHEMA} · ${navigator.serviceWorker && navigator.serviceWorker.controller ? "offline ready" : "online only"}</p></section>
    <button class="btn btn-line" data-action="reset">Reset demo data</button>
  </div>`;
};

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
  S = r.state; repairs = r.fixes; rollOver(); applySettings(false); save(true);
  importMsg = { ok: true, text: "Backup restored" + (r.fixes ? `, with ${r.fixes} item${r.fixes > 1 ? "s" : ""} repaired.` : ".") };
  rerender(); toast("Backup restored.", { label: "Undo", fn: undo });
}

document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]"), g = e.target.closest("[data-go]"), c = e.target.closest("[data-crumb]");
  if (a) {
    e.preventDefault(); e.stopPropagation();
    const act = a.dataset.action, id = a.dataset.id;
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
      case "practise": { const has = DATA.questions.some(q => q.node === id); Q = { ...Q, topic: has ? id : null, subj: has ? "all" : nodes[id].subject, lvl: "all", mode: "all", idx: 0, picked: null }; navigate(() => stack.push({ v: "practice" }), "forward"); return; }
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
  const n = nodes[id], e = (DATA.explain || {})[n.title];
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
  const q = DATA.questions.find(q => q.node === X.id) || DATA.questions.find(q => q.subject === n.subject);
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
  if (x.dataset.x === "pick") { X.picked = +x.dataset.i; drawSheet(false); const q = DATA.questions.find(q => q.node === X.id) || DATA.questions.find(q => q.subject === nodes[X.id].subject); if (q && X.picked === q.a) FX.burst($(".sheet .opt.right"), 20, 50); }
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
  if (!DSUBJ.length) {
    S = blankState();
    $("#main").innerHTML = `<div class="card stack" style="margin-top:40px"><h1>Study Desk</h1><p>No study data found. Check <b>data.js</b>.</p><ul class="issues">${dataIssues.map(i => `<li><b>${esc(i.where)}</b>: ${esc(i.msg)}</li>`).join("")}</ul></div>`;
    return;
  }
  if (!loadState() || diffDays(todayKey(), S.anchor) > 60) fresh();
  if (rollOver()) save();
  if (!S.tasks.some(t => t.date >= todayKey())) { generate(todayKey()); save(); }
  applySettings(false);
  render(true);
  document.documentElement.classList.add("ready");
})();
