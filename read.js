/* Study Desk v4.5
   1. Textbook reader: keep a PDF on the device, read it here (pdf.js, Apache-2.0), highlight lines
      and turn highlights into flashcards in the topic for that page.
   2. Teach it back: explain a topic out loud; the speech is written out on the device (Moonshine)
      and checked against the topic's notes, like a spoken blurt check.
   3. Handwriting to text: write with a finger or Apple Pencil and read it with the on-device text reader. */
Object.assign(P, {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  marker: '<path d="M14.5 4.5l5 5-8 8H7v-4.5z"/><path d="M4 21h9"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  minus: '<path d="M5 12h14"/>',
  contents: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  type: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'
});

/* ---------- storage: books (the PDF itself) and marks (highlights, last page) ---------- */
let BOOKS = [], MARKS = {};
async function loadBooks() {
  try { BOOKS = (await IDB.all("books") || []).map(b => ({ ...b, data: undefined })).sort((a, b) => a.added - b.added); } catch (e) { BOOKS = []; }
  try { (await IDB.all("marks") || []).forEach(m => { MARKS[m.id] = m; }); } catch (e) { }
}
const booksOf = sid => BOOKS.filter(b => b.sid === sid);
const marksOf = bid => MARKS[bid] || (MARKS[bid] = { id: bid, hl: [], last: 0 });
const saveMarks = bid => IDB.put("marks", marksOf(bid)).catch(() => { });
const pageLabel = (b, i) => (b.labels && b.labels[i]) || String(i + 1);
const pageNum = (b, i) => { const l = b.labels && b.labels[i]; return l && /^\d+$/.test(l) ? +l : i + 1; };
function pageIndexOf(b, printed) {
  if (b.labels) { const k = b.labels.indexOf(String(printed)); if (k >= 0) return k; }
  return Math.min(Math.max((+printed || 1) - 1, 0), b.pages - 1);
}
/* the topic a line on a page belongs to. Page ranges often overlap (a topic ends on the page the next
   one starts), so when the page is on screen, look for the next topic's heading: above the line means
   the new topic, below it means the one before. */
const normT = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function topicAt(b, i, y) {
  const p = pageNum(b, i), ls = leavesBySubject[b.sid] || [];
  const cands = ls.filter(n => n.p1 && n.p1 <= p && p <= (n.p2 || n.p1));
  if (!cands.length) { let best = null; for (const n of ls) if (n.p1 && n.p1 <= p && (!best || n.p1 > best.p1)) best = n; return (best || ls[0] || {}).id || null; }
  if (cands.length === 1) return cands[0].id;
  const starting = cands.filter(n => n.p1 === p), before = cands.filter(n => n.p1 < p).sort((a, c) => c.p1 - a.p1)[0];
  if (!starting.length) return cands.sort((a, c) => (a.p2 - a.p1) - (c.p2 - c.p1))[0].id;
  const el = rdPageEl(i), spans = el ? [...el.querySelectorAll(".textLayer span")] : [];
  if (y != null && spans.length) {
    const pr = el.getBoundingClientRect(); let pick = null, pickY = -1;
    for (const n of starting) {
      const want = normT(n.title).slice(0, 24); if (!want) continue;
      const sp = spans.find(s => normT(s.textContent).includes(want)); if (!sp) continue;
      const hy = (sp.getBoundingClientRect().top - pr.top) / pr.height;
      if (hy <= y + .01 && hy > pickY) { pick = n; pickY = hy; }
    }
    if (pick) return pick.id;
    if (before) return before.id;
  }
  return (y != null && y < .25 && before ? before : starting[0]).id;
}
const fmtSize = n => n > 1e6 ? (n / 1e6).toFixed(n > 1e7 ? 0 : 1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB";

const RD = { bid: null, doc: null, docFor: null, zoom: 1, gen: 0, io: null, vis: new Set(), sel: null, adding: null, jump: null, lastPdf: null, kept: null };
const ZOOMS = [.6, .8, 1, 1.25, 1.5, 2];

async function addBook(file, sid) {
  if (!file || !subjects[sid]) return null;
  if (!/\.pdf$/i.test(file.name || "") && file.type !== "application/pdf") { toast("Choose a PDF file."); return null; }
  if (file.size > 400e6) { toast("That PDF is over 400 MB, which is too big to keep on a phone. Try a smaller copy."); return null; }
  RD.adding = file.name || "PDF"; drawBookShelf();
  try {
    const buf = await file.arrayBuffer(), blob = new Blob([buf], { type: "application/pdf" });
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ data: buf, isEvalSupported: false }).promise;
    let labels = null, title = "";
    try { labels = await doc.getPageLabels(); } catch (e) { }
    try { const m = await doc.getMetadata(); title = String(m?.info?.Title || "").trim(); } catch (e) { }
    if (title.length < 3 || /^(untitled|microsoft (word|powerpoint)|slide|document|presentation)\b/i.test(title) || /\.(docx?|pptx?|pdf)$/i.test(title)) title = (file.name || "Textbook").replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\p{Ll}/u, c => c.toUpperCase());
    const pg = await doc.getPage(1), vp1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 132 / vp1.width });
    let thumb = "";
    try { const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: cx, viewport: vp }).promise; thumb = cv.toDataURL("image/jpeg", .72); } catch (e) { }
    const rec = { id: newId("bk"), sid, name: file.name || "textbook.pdf", title: title.slice(0, 140), pages: doc.numPages, labels: labels ? labels.slice(0, 6000) : null, ratio: +(vp1.height / vp1.width).toFixed(4), size: file.size, added: Date.now(), thumb, data: blob };
    doc.destroy();
    await IDB.put("books", rec);
    try { navigator.storage?.persist && navigator.storage.persist(); } catch (e) { }
    await loadBooks();
    return rec;
  } catch (e) {
    console.error(e);
    toast(/password/i.test(String(e && e.message)) ? "That PDF is password-protected. Remove the password and try again." : /quota|space/i.test(String(e && (e.name + e.message))) ? "There isn't enough space on this device for that PDF." : "Couldn't open that PDF. It may be damaged.");
    return null;
  } finally { RD.adding = null; drawBookShelf(); }
}

/* ---------- the shelf on a subject page ---------- */
function bookShelf(sid) {
  const bs = booksOf(sid);
  return `<section class="section" id="bkShelf" data-sid="${sid}"><div class="sec-head"><h2>Textbook</h2>${bs.length ? `<span class="tiny muted">${bs.length} PDF${bs.length > 1 ? "s" : ""} on this device</span>` : ""}</div>
    ${bs.length ? `<div class="bk-list">${bs.map(b => { const m = marksOf(b.id), n = m.hl.length; return `<button class="bk-row" data-go="read:${b.id}"><span class="bk-cover">${b.thumb ? `<img src="${b.thumb}" alt="">` : ico("book")}</span><span class="grow"><b>${esc(b.title)}</b><span class="tiny muted">${b.pages} pages${n ? ` · ${n} highlight${n > 1 ? "s" : ""}` : ""}${m.last ? ` · on page ${esc(pageLabel(b, m.last))}` : ""}</span></span>${ico("chev", 'class="chev"')}</button>`; }).join("")}</div>`
      : `<div class="card bk-empty"><span class="bk-ic">${ico("book")}</span><div class="stack" style="gap:4px"><b>Read the textbook here</b><span class="small muted">Keep the PDF in Study Desk, highlight the important lines and turn them into flashcards. It stays on this device.</span></div></div>`}
    ${RD.adding ? `<p class="small muted row" role="status" style="gap:8px"><span class="spin" aria-hidden="true"></span>Opening ${esc(RD.adding)}…</p>` : `<label class="btn btn-line btn-sm bk-add" for="rd-file">${ico("upload")}${bs.length ? "Add another PDF" : "Add the textbook PDF"}</label><input type="file" id="rd-file" class="sr" accept=".pdf,application/pdf" data-sid="${sid}">`}
  </section>`;
}
function drawBookShelf() { const el = $("#bkShelf"); if (el) el.outerHTML = bookShelf(el.dataset.sid); }

/* ---------- the reader ---------- */
V.read = arg => {
  const [bid, pg] = String(arg || "").split(":"), b = BOOKS.find(x => x.id === bid);
  if (!b) return `<div class="card empty stack"><b>This PDF isn't on this device</b><span class="small muted">PDFs stay on the device they were added on and aren't part of backups or pairing.</span><button class="btn btn-line btn-sm" data-action="back" style="align-self:center">Go back</button></div>`;
  const m = marksOf(bid);
  if (RD.bid !== bid) { RD.zoom = m.zoom || 1; }
  RD.bid = bid; RD.jump = pg !== undefined && pg !== "" ? Math.min(Math.max(+pg, 0), b.pages - 1) : m.last || 0;
  return `<div class="rd" data-bid="${bid}">
    <div class="rd-bar"><div class="grow rd-name"><b>${esc(b.title)}</b><span class="tiny muted">${esc(subjects[b.sid]?.name || "")}</span></div>
      <button class="rd-pg" data-action="rd-goto">${ico("search")}<span><span id="rdPg">${esc(pageLabel(b, RD.jump))}</span><span class="muted">/${b.pages}</span></span><span class="sr"> pages. Find or go to a page</span></button>
      <span class="rd-zoom" role="group" aria-label="Text size"><button class="icon-btn sm" data-action="rd-zoom" data-d="-1" aria-label="Smaller">${ico("minus")}</button><button class="icon-btn sm" data-action="rd-zoom" data-d="1" aria-label="Bigger">${ico("plus")}</button></span>
      <button class="rd-hls" data-action="rd-list">${ico("marker")}<b id="rdHlN">${m.hl.length}</b><span class="sr"> highlights</span></button></div>
    ${m.hl.length ? "" : `<p class="rd-tip small">${ico("info")}<span>Select a line to highlight it or turn it into a flashcard.</span></p>`}
    <div class="rd-scroll" id="rdScroll"><div class="rd-pages" id="rdPages">${Array.from({ length: b.pages }, (_, i) => `<div class="rd-page" data-i="${i}" style="aspect-ratio:1/${b.ratio}" role="img" aria-label="Page ${esc(pageLabel(b, i))}"><span class="rd-num" aria-hidden="true">${esc(pageLabel(b, i))}</span></div>`).join("")}</div></div>
  </div>`;
};
const rdBook = () => BOOKS.find(x => x.id === RD.bid);
async function rdDoc() {
  if (RD.doc && RD.docFor === RD.bid) return RD.doc;
  if (RD.doc) { try { RD.doc.destroy(); } catch (e) { } RD.doc = null; }
  const bid = RD.bid, rec = await IDB.get("books", bid); if (!rec || !rec.data) throw new Error("missing");
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(await rec.data.arrayBuffer()), isEvalSupported: false }).promise;
  if (RD.bid !== bid) { doc.destroy(); throw new Error("stale"); }
  RD.doc = doc; RD.docFor = bid; return doc;
}
function rdWidth() { const sc = $("#rdScroll"), pages = $("#rdPages"); if (!sc || !pages) return; const cs = getComputedStyle(sc), fit = Math.min(sc.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 880); pages.style.width = Math.round(fit * RD.zoom) + "px"; }
async function rdMount() {
  const b = rdBook(), pages = $("#rdPages"); if (!b || !pages) return;
  rdWidth(); RD.gen++; RD.vis.clear();
  if (RD.io) RD.io.disconnect();
  RD.io = new IntersectionObserver(es => es.forEach(e => { const el = e.target; if (e.isIntersecting) { RD.vis.add(el); rdRender(el); } else { RD.vis.delete(el); rdUnrender(el); } }), { rootMargin: "120% 0px" });
  $$(".rd-page", pages).forEach(el => RD.io.observe(el));
  rdScrollTo(RD.jump || 0, true);
  try { await rdDoc(); RD.vis.forEach(rdRender); }
  catch (e) { if (e.message !== "stale") { console.error(e); pages.insertAdjacentHTML("beforebegin", `<div class="lock bad" role="alert">${ico("info")}<span>Couldn't open this PDF on this device.</span></div>`); } }
}
async function rdRender(el) {
  const gen = RD.gen; if (!RD.doc || RD.docFor !== RD.bid || el.dataset.r === String(gen)) return;
  el.dataset.r = gen;
  try {
    const i = +el.dataset.i, page = await RD.doc.getPage(i + 1);
    const w = el.clientWidth || 360, vp1 = page.getViewport({ scale: 1 }), scale = w / vp1.width, vp = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, RD.zoom > 1.3 ? 1.5 : 2);
    const cv = document.createElement("canvas"); cv.className = "rd-cv"; cv.width = Math.floor(vp.width * dpr); cv.height = Math.floor(vp.height * dpr);
    await page.render({ canvasContext: cv.getContext("2d", { alpha: false }), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    if (el.dataset.r !== String(gen) || !el.isConnected) { cv.width = cv.height = 0; return; }
    rdUnrender(el, true);
    el.style.setProperty("--scale-factor", scale);
    const hl = document.createElement("div"); hl.className = "rd-hl";
    const tl = document.createElement("div"); tl.className = "textLayer";
    el.append(cv, hl, tl); el.classList.add("on");
    drawHl(el);
    try { await new pdfjsLib.TextLayer({ textContentSource: page.streamTextContent(), container: tl, viewport: vp }).render(); } catch (e) { }
    if (RD.q) rdMarkHits(el);
  } catch (e) { if (el.dataset.r === String(gen)) delete el.dataset.r; }
}
function rdUnrender(el, keepFlag) {
  el.querySelectorAll(".rd-cv").forEach(c => { c.width = c.height = 0; c.remove(); });
  el.querySelectorAll(".textLayer,.rd-hl").forEach(x => x.remove());
  el.classList.remove("on"); if (!keepFlag) delete el.dataset.r;
}
function drawHl(el) {
  const box = el.querySelector(".rd-hl"); if (!box) return;
  const i = +el.dataset.i, m = marksOf(RD.bid);
  box.innerHTML = m.hl.filter(h => h.i === i).map(h => h.rects.map(r => `<i class="${h.card ? "c" : ""}" data-h="${h.id}" style="left:${r[0] * 100}%;top:${r[1] * 100}%;width:${r[2] * 100}%;height:${r[3] * 100}%"></i>`).join("")).join("");
}
const rdTopOff = () => { const bar = $(".rd-bar"); return bar ? (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight : 120; };
const rdPageEl = i => $(`.rd-page[data-i="${i}"]`);
function rdScrollTo(i, instant) {
  const el = rdPageEl(i); if (!el) return;
  const off = rdTopOff() + 8;
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - off), behavior: instant ? "instant" : "smooth" });
}
function rdCurrent() {
  const y = rdTopOff() + 40; let best = null, bd = Infinity;
  for (const el of RD.vis) { const r = el.getBoundingClientRect(), i = +el.dataset.i; if (r.top <= y && r.bottom > y) return i; const d = Math.min(Math.abs(r.top - y), Math.abs(r.bottom - y)); if (d < bd) { bd = d; best = i; } }
  return best;
}
let rdScrollRaf = 0, rdSaveT = 0;
addEventListener("scroll", () => {
  if (!$("#rdPages")) return;
  cancelAnimationFrame(rdScrollRaf);
  rdScrollRaf = requestAnimationFrame(() => {
    const b = rdBook(), i = rdCurrent(); if (!b || i === null) return; const out = $("#rdPg"); if (out) out.textContent = pageLabel(b, i);
    if (RD.q) { const n = $("#rdFindBar .rf-n"), hp = RD.hitPages || [], k = hp.indexOf(i); if (n) n.textContent = k >= 0 ? `${k + 1} of ${hp.length}` : `${hp.length} page${hp.length === 1 ? "" : "s"}`; }
    const m = marksOf(b.id); m.seen = Date.now(); if (m.last !== i) { m.last = i; clearTimeout(rdSaveT); rdSaveT = setTimeout(() => saveMarks(b.id), 600); }
  });
}, { passive: true });
let rdResizeT = 0;
addEventListener("resize", () => { if (!$("#rdPages")) return; clearTimeout(rdResizeT); rdResizeT = setTimeout(() => { const i = rdCurrent() ?? (marksOf(RD.bid).last || 0); rdWidth(); RD.gen++; RD.vis.forEach(el => { delete el.dataset.r; rdRender(el); }); rdScrollTo(i, true); }, 250); });
function rdZoom(d) {
  const k = ZOOMS.findIndex(z => z >= RD.zoom - .01), cur = k < 0 ? ZOOMS.length - 1 : k;
  const nk = d > 0 ? (ZOOMS[cur] > RD.zoom + .01 ? cur : cur + 1) : cur - 1;
  if (nk < 0 || nk >= ZOOMS.length) { toast(d > 0 ? "That's the biggest size." : "That's the smallest size."); return; }
  rdZoomTo(ZOOMS[nk]);
}
function rdZoomTo(z, anchor) {
  const b = rdBook(); if (!b) return;
  z = Math.round(Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], z)) * 100) / 100; if (Math.abs(z - RD.zoom) < .02) return;
  const i = anchor ?? rdCurrent() ?? (marksOf(b.id).last || 0); RD.zoom = z; marksOf(b.id).zoom = z; saveMarks(b.id);
  rdWidth(); RD.gen++; $$(".rd-page").forEach(el => rdUnrender(el)); rdScrollTo(i, true);
  requestAnimationFrame(() => RD.vis.forEach(rdRender));
}
/* pinch with two fingers to zoom the pages (not the whole app) */
(function rdPinch() {
  let d0 = 0, z0 = 1, mid = null;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  document.addEventListener("touchstart", e => { if (e.touches.length !== 2 || !e.target.closest?.("#rdScroll")) return; d0 = dist(e.touches); z0 = RD.zoom; mid = rdCurrent(); }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!d0 || e.touches.length !== 2) return; e.preventDefault();
    const k = Math.max(ZOOMS[0] / z0, Math.min(ZOOMS[ZOOMS.length - 1] / z0, dist(e.touches) / d0)), pg = $("#rdPages");
    if (pg) { pg.style.transformOrigin = "50% " + (scrollY + innerHeight / 2 - pg.getBoundingClientRect().top - scrollY) + "px"; pg.style.transform = `scale(${k})`; }
  }, { passive: false });
  document.addEventListener("touchend", e => {
    if (!d0 || e.touches.length) return; const pg = $("#rdPages"); const m = /scale\(([\d.]+)\)/.exec(pg?.style.transform || ""); if (pg) pg.style.transform = "";
    const k = m ? +m[1] : 1; d0 = 0; if (Math.abs(k - 1) > .06) rdZoomTo(z0 * k, mid);
  });
  document.addEventListener("gesturestart", e => { if (e.target.closest?.("#rdScroll")) e.preventDefault(); });
})();
/* keys on a laptop: arrows and Page Up/Down move a page, + and - change the size */
document.addEventListener("keydown", e => {
  if (!$("#rdPages") || $(".scrim") || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const b = rdBook(); if (!b) return; const i = rdCurrent() ?? 0;
  if (["ArrowRight", "PageDown"].includes(e.key) || (e.key === "ArrowDown" && e.shiftKey)) { e.preventDefault(); rdScrollTo(Math.min(b.pages - 1, i + 1)); }
  else if (["ArrowLeft", "PageUp"].includes(e.key) || (e.key === "ArrowUp" && e.shiftKey)) { e.preventDefault(); rdScrollTo(Math.max(0, i - 1)); }
  else if (e.key === "+" || e.key === "=") { e.preventDefault(); rdZoom(1); }
  else if (e.key === "-") { e.preventDefault(); rdZoom(-1); }
  else if (e.key === "f" || e.key === "/") { e.preventDefault(); e.stopImmediatePropagation(); gotoSheet(); }
}, true);

/* ---------- selecting text: highlight or make a card ---------- */
function mergeRects(rs) {
  rs = rs.filter(r => r[2] > .002 && r[3] > .002).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const out = [];
  for (const r of rs) {
    const o = out.find(q => Math.abs((q[1] + q[3] / 2) - (r[1] + r[3] / 2)) < Math.min(q[3], r[3]) * .6 && r[0] <= q[0] + q[2] + .02 && r[0] + r[2] >= q[0] - .02);
    if (o) { const x1 = Math.min(o[0], r[0]), y1 = Math.min(o[1], r[1]), x2 = Math.max(o[0] + o[2], r[0] + r[2]), y2 = Math.max(o[1] + o[3], r[1] + r[3]); o[0] = x1; o[1] = y1; o[2] = x2 - x1; o[3] = y2 - y1; }
    else out.push(r.slice());
  }
  return out.slice(0, 40).map(r => r.map(v => Math.round(v * 1e4) / 1e4));
}
function rdSelRead() {
  const s = getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return null;
  const r = s.getRangeAt(0), c = r.commonAncestorContainer, host = (c.nodeType === 1 ? c : c.parentElement)?.closest?.(".rd-page");
  if (!host) return null;
  const text = s.toString().replace(/\s+/g, " ").trim(); if (text.length < 2) return null;
  const pr = host.getBoundingClientRect();
  const rects = mergeRects([...r.getClientRects()].map(x => [(x.left - pr.left) / pr.width, (x.top - pr.top) / pr.height, x.width / pr.width, x.height / pr.height]));
  if (!rects.length) return null;
  return { i: +host.dataset.i, text: text.slice(0, 1500), rects, box: r.getBoundingClientRect() };
}
function rdPopHide() { $("#rdPop")?.remove(); }
let rdSelT = 0;
document.addEventListener("selectionchange", () => {
  if (!$("#rdPages")) return;
  clearTimeout(rdSelT);
  rdSelT = setTimeout(() => {
    const sel = rdSelRead(); RD.sel = sel;
    if (!sel) { rdPopHide(); return; }
    let pop = $("#rdPop");
    if (!pop) { document.body.insertAdjacentHTML("beforeend", `<div class="rd-pop" id="rdPop" role="toolbar" aria-label="Selected text"><button data-action="rd-hl">${ico("marker")}Highlight</button><button data-action="rd-card">${ico("cards")}Make a card</button></div>`); pop = $("#rdPop"); }
    const w = pop.offsetWidth || 240, h = pop.offsetHeight || 48, bx = sel.box;
    /* below the selection: on iPhone the system's copy menu sits above it */
    let top = bx.bottom + 12; if (top + h > innerHeight - 12) top = Math.max(70, bx.top - h - 12);
    pop.style.top = Math.round(top) + "px"; pop.style.left = Math.round(Math.max(10, Math.min(innerWidth - w - 10, bx.left + bx.width / 2 - w / 2))) + "px";
  }, 160);
});
document.addEventListener("pointerdown", e => { if (e.target.closest?.("#rdPop")) e.preventDefault(); }, true);
/* a highlight that stops mid-sentence still makes a whole card: finish the sentence from the page text */
function rdWholeSentence(i, text) {
  if (/[.!?]["”')]?$/.test(text)) return undefined;
  const el = rdPageEl(i), page = el ? [...el.querySelectorAll(".textLayer span")].filter(x => !x.children.length).map(x => x.textContent).join(" ").replace(/\s+/g, " ") : "";
  const k = page.indexOf(text); if (k < 0) return undefined;
  const rest = page.slice(k + text.length, k + text.length + 240), m = rest.match(/^[^.!?]*[.!?]/);
  return m ? (text + (/^[\s,;:)]/.test(m[0]) ? "" : " ") + m[0].trim().replace(/^-\s*/, "")).replace(/\s+([,.;:!?])/g, "$1").replace(/\s+/g, " ") : undefined;
}
function rdAddHl(sel) {
  const b = rdBook(); if (!b || !sel) return null;
  const m = marksOf(b.id);
  const same = m.hl.find(h => h.i === sel.i && h.text === sel.text); if (same) return same;
  const h = { id: newId("h"), i: sel.i, text: sel.text, full: rdWholeSentence(sel.i, sel.text), rects: sel.rects, at: Date.now(), node: topicAt(b, sel.i, sel.rects[0][1]) };
  m.hl.push(h); m.hl.sort((x, y) => x.i - y.i || x.rects[0][1] - y.rects[0][1]); saveMarks(b.id);
  const el = rdPageEl(sel.i); if (el) drawHl(el);
  const n = $("#rdHlN"); if (n) n.textContent = m.hl.length;
  $(".rd-tip")?.remove();
  return h;
}

/* a first draft of the card; she can change both sides before saving */
const RD_STOP = new Set("about above after again against because before being below between could does doing during either every from further having here itself might other ourselves should since such than that their them themselves then there these they this those through under until very were what when where which while whom would your yours".split(" "));
function cardFromText(t) {
  t = String(t).replace(/\s+/g, " ").trim().replace(/^[•\-–·*\d.)\s]+/, "");
  const sentences = t.split(/(?<=[.!?])\s+(?=[A-Z])/), s = sentences[0].length >= 20 || sentences.length === 1 ? sentences[0] : sentences.slice(0, 2).join(" ");
  const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
  let m = s.match(/^(?:an?\s+|the\s+)?([^,;:.()]{2,60}?)\s+(is|are|refers to|refer to|means|is defined as|are defined as|describes|occurs when|happens when)\s+(.{8,})$/i);
  if (m && m[1].split(" ").length <= 7 && !/^(it|this|that|there|these|they|he|she|we|which)$/i.test(m[1].trim())) {
    const term = m[1].trim(), v = m[2].toLowerCase(), plural = /^are|refer to/.test(v);
    const f = /occurs when|happens when/.test(v) ? `When does ${term.toLowerCase()} occur?` : `What ${plural ? "are" : "is"} ${/^[A-Z]{2}/.test(term) ? term : term.charAt(0).toLowerCase() + term.slice(1)}?`;
    return { f, b: cap(m[3].replace(/\s+$/, "")), how: "def" };
  }
  m = s.match(/^([^:–—]{2,50}?)\s*[:–—]\s+(.{8,})$/);
  if (m && m[1].split(" ").length <= 6) return { f: `What is ${m[1].trim().replace(/^[A-Z](?![A-Z])/, c => c.toLowerCase())}?`, b: cap(m[2]), how: "def" };
  const ws = (s.match(/[\p{L}][\p{L}'’-]{5,}/gu) || []).filter(w => !RD_STOP.has(w.toLowerCase()));
  if (ws.length) {
    const score = w => w.length + (/^\p{Lu}/u.test(w) && s.indexOf(w) > 0 ? 3 : 0) + (/(tion|ism|ity|ology|ance|ence|ment)$/i.test(w) ? 2 : 0);
    const key = ws.slice().sort((a, b) => score(b) - score(a))[0];
    return { f: "Fill the gap: " + s.replace(key, "_____"), b: key, how: "gap" };
  }
  return { f: "", b: s, how: "" };
}
function hlSheet(hid) {
  const b = rdBook(), m = marksOf(RD.bid), h = m.hl.find(x => x.id === hid); if (!b || !h) return;
  const card = h.card && (S.cards || []).find(c => c.id === h.card);
  const ls = leavesBySubject[b.sid] || [], node = card ? card.node : h.node && nodes[h.node] ? h.node : topicAt(b, h.i, h.rects[0][1]);
  const d = cardFromText(h.full || h.text);
  openSheet("Highlight", `${sheetHead(`${b.title} · page ${pageLabel(b, h.i)}`, card ? "Highlight and card" : "Turn it into a flashcard")}
    <div class="stack form">
      <blockquote class="rd-quote">${esc(h.text)}</blockquote>
      ${card ? `<div class="found">${ico("check")}<div><b>${esc(card.f)}</b><span class="tiny muted">Flashcard in ${esc(nodes[card.node]?.title || "a topic")}</span></div></div>
        <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-action="fc-edit" data-id="${card.id}" data-node="${card.node}">${ico("pencil")}Edit the card</button><button class="btn btn-line btn-sm" data-action="rd-show" data-h="${h.id}">Show on the page</button><button class="btn btn-line btn-sm" data-action="rd-del" data-h="${h.id}">Remove highlight</button></div>`
      : !ls.length ? `<p class="small muted">Add chapters to ${esc(subjects[b.sid].name)} first, so the card has a topic to go in.</p><div class="row" style="flex-wrap:wrap"><button class="btn btn-line btn-sm" data-go="import:${b.sid}">Import chapters</button><button class="btn btn-line btn-sm" data-action="rd-del" data-h="${h.id}">Remove highlight</button></div>`
      : `<label class="fld"><span>Topic</span><select id="hl-node">${ls.map(n => `<option value="${n.id}" ${n.id === node ? "selected" : ""}>${esc(n.num + " " + n.title)}${n.p1 ? ` (p. ${n.p1}–${n.p2})` : ""}</option>`).join("")}</select></label>
        <label class="fld"><span>Question (front)</span><textarea id="hl-f" rows="2" placeholder="Write a question this line answers">${esc(d.f)}</textarea></label>
        <label class="fld"><span>Answer (back)</span><textarea id="hl-b" rows="3">${esc(d.b)}</textarea></label>
        <p class="tiny muted">${d.how === "def" ? "Made from the definition in your highlight." : d.how === "gap" ? "A fill-the-gap card. Change the hidden word if a better one matters more." : "Write the question yourself."} Edit both sides before saving.</p>
        <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="rd-mk" data-h="${h.id}">${ico("check")}Add flashcard</button><button class="btn btn-line btn-sm" data-action="rd-show" data-h="${h.id}">Show on the page</button><button class="btn btn-line btn-sm" data-action="rd-del" data-h="${h.id}">Remove highlight</button></div>`}
    </div>`);
}
function rdMakeCard(h, node, f, b) {
  if (!S.cards) S.cards = [];
  const c = { id: newId("c"), node, f: f.slice(0, 1000), b: b.slice(0, 2000), kind: "own", due: null, s: null, added: todayKey() };
  S.cards.push(c); h.card = c.id; h.node = node; return c;
}
function listSheet() {
  const b = rdBook(); if (!b) return;
  const m = marksOf(b.id), hs = m.hl, cards = new Set((S.cards || []).map(c => c.id)), left = hs.filter(h => !(h.card && cards.has(h.card)));
  const canMake = left.filter(h => cardFromText(h.full || h.text).f).length, ls = leavesBySubject[b.sid] || [];
  openSheet("Highlights", `${sheetHead(b.title, hs.length ? `${hs.length} highlight${hs.length > 1 ? "s" : ""}` : "Highlights")}
    <div class="stack form">
      ${!hs.length ? `<p class="small muted">Nothing highlighted yet. Select a line on a page, then choose Highlight or Make a card.</p>`
      : `${canMake && ls.length ? `<div class="hl-make"><div class="grow"><b>${canMake} highlight${canMake > 1 ? "s have" : " has"} no card yet</b><span class="tiny muted">Each becomes a question or fill-the-gap card in the topic for its page. Check them in your next review.</span></div><button class="btn btn-pen btn-sm" data-action="rd-mkall">${ico("cards")}Make ${canMake} card${canMake > 1 ? "s" : ""}</button></div>` : ""}
        <ol class="hl-list">${hs.map(h => `<li><button data-action="rd-open" data-h="${h.id}"><span class="hl-p mono">p. ${esc(pageLabel(b, h.i))}</span><span class="hl-t">${esc(h.text)}</span>${h.card && cards.has(h.card) ? `<span class="hl-c" title="Has a flashcard">${ico("cards")}<span class="sr">Has a flashcard</span></span>` : ""}</button></li>`).join("")}</ol>`}
      <details class="bk-about"><summary class="small">About this PDF</summary><div class="stack" style="gap:10px;padding-top:10px">
        <p class="small muted">${esc(b.name)} · ${b.pages} pages · ${fmtSize(b.size)}. Kept on this device only. PDFs aren't part of backups or pairing because they're big, so keep the original file too. Removing it keeps any flashcards you made.</p>
        <button class="btn btn-line btn-sm" data-action="rd-rm" style="align-self:flex-start">Remove this PDF from this device</button></div></details>
    </div>`);
}
/* one box for both: a page number goes to that page, words search the whole book */
const fold = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
async function rdTexts(onProgress) {
  const b = rdBook(); if (!b) return [];
  RD.texts = RD.texts || {}; if (RD.texts[b.id]) return RD.texts[b.id];
  const doc = await rdDoc(), out = [];
  for (let i = 0; i < b.pages; i++) {
    let t = ""; try { const tc = await (await doc.getPage(i + 1)).getTextContent(); t = tc.items.map(it => (it.str || "") + (it.hasEOL ? "\n" : "")).join(""); } catch (e) { }
    out.push(t.replace(/-\n(\p{Ll})/gu, "$1").replace(/\s+/g, " ").trim());
    if (onProgress && (i % 8 === 7 || i === b.pages - 1)) onProgress((i + 1) / b.pages);
  }
  if (RD.bid === b.id) RD.texts[b.id] = out; return out;
}
function gotoSheet(q) {
  const b = rdBook(); if (!b) return;
  const s = subjects[b.sid], rows = [];
  (s?.chapterIds || []).forEach(cid => { const c = nodes[cid]; rows.push([c, 0]); c.kids.forEach(k => rows.push([nodes[k], 1])); });
  const ok = rows.filter(([n]) => n.p1 && n.p1 <= pageNum(b, b.pages - 1) + 50);
  openSheet("Find or go to a page", `${sheetHead(b.title, "Find or go to a page")}
    <div class="stack form">
      <div class="row rd-gorow"><label class="fld grow"><span>Page number or words to find</span><input id="rd-n" type="search" enterkeyhint="search" autocomplete="off" placeholder="e.g. 42 or working memory" value="${esc(q || RD.q || "")}"></label><button class="btn btn-pen" data-action="rd-n">Go</button></div>
      <div id="rdFind" role="status"></div>
      ${ok.length ? `<div class="stack rd-tocwrap" style="gap:6px"><span class="h3">Chapters</span><div class="rd-toc">${ok.map(([n, d]) => `<button class="${d ? "sub" : ""}" data-action="rd-jump" data-i="${pageIndexOf(b, n.p1)}"><span class="grow"><small class="mono">${esc(n.num)}</small> ${esc(n.title)}</span><span class="tiny muted mono">p. ${n.p1}</span></button>`).join("")}</div></div>` : ""}
    </div>`);
  setTimeout(() => $("#rd-n")?.focus({ preventScroll: true }), 80);
  if (q || RD.q) rdFind(q || RD.q);
}
let rdFindSeq = 0;
async function rdFind(q) {
  const out = $("#rdFind"), b = rdBook(); if (!out || !b) return;
  q = String(q).replace(/\s+/g, " ").trim(); const fq = fold(q), seq = ++rdFindSeq;
  if (fq.length < 2) { out.innerHTML = ""; return; }
  $(".rd-tocwrap")?.setAttribute("hidden", "");
  if (!RD.texts?.[b.id]) out.innerHTML = `<p class="small row" style="gap:8px"><span class="spin" aria-hidden="true"></span><span id="rdFindP">Reading the book…</span></p>`;
  const texts = await rdTexts(p => { const e = $("#rdFindP"); if (e) e.textContent = `Reading the book… ${Math.round(p * 100)}%`; });
  if (seq !== rdFindSeq || !$("#rdFind")) return;
  const hits = []; let total = 0;
  texts.forEach((t, i) => { const ft = fold(t); let k = ft.indexOf(fq), n = 0; while (k >= 0) { n++; total++; if (n === 1 && hits.length < 80) hits.push({ i, k, n: 0 }); k = ft.indexOf(fq, k + fq.length); } if (n && hits.length && hits[hits.length - 1].i === i) hits[hits.length - 1].n = n; });
  RD.hitPages = [...new Set(hits.map(h => h.i))];
  const snip = (t, k) => { const a = Math.max(0, k - 60), z = Math.min(t.length, k + fq.length + 80); return (a ? "…" : "") + esc(t.slice(a, k)) + "<mark>" + esc(t.slice(k, k + fq.length)) + "</mark>" + esc(t.slice(k + fq.length, z)) + (z < t.length ? "…" : ""); };
  $("#rdFind").innerHTML = !hits.length ? `<p class="small muted">No matches for “${esc(q)}”.${texts.every(t => !t) ? " This PDF has no text to search. It may be scanned pages." : ""}</p>`
    : `<p class="tiny muted">${total} match${total > 1 ? "es" : ""} on ${RD.hitPages.length} page${RD.hitPages.length > 1 ? "s" : ""}${hits.length >= 80 ? " (first 80 pages shown)" : ""}</p><ol class="hl-list rd-hits">${hits.map(h => `<li><button data-action="rd-hit" data-i="${h.i}" data-q="${esc(q)}"><span class="hl-p mono">p. ${esc(pageLabel(b, h.i))}</span><span class="hl-t">${snip(texts[h.i], h.k)}${h.n > 1 ? ` <span class="tiny muted">+${h.n - 1} more</span>` : ""}</span></button></li>`).join("")}</ol>`;
}
function rdMarkHits(el) {
  el.querySelectorAll(".textLayer mark.hit").forEach(m => { const sp = m.parentElement; if (sp) sp.textContent = sp.textContent; });
  if (!RD.q) return;
  let fq = fold(RD.q); const spans = [...el.querySelectorAll(".textLayer span")].filter(x => !x.children.length);
  let hit = spans.filter(x => fold(x.textContent).includes(fq));
  if (!hit.length) { const w = fq.split(" ").sort((a, c) => c.length - a.length)[0]; if (w && w.length >= 4) { fq = w; hit = spans.filter(x => fold(x.textContent).includes(w)); } }
  /* mark just the words: folding keeps one character per letter for the usual Latin text */
  hit.forEach(sp => { const t = sp.textContent, ft = fold(t); if (ft.length !== t.length) { sp.innerHTML = `<mark class="hit">${esc(t)}</mark>`; return; } let out = "", at = 0, k = ft.indexOf(fq); while (k >= 0) { out += esc(t.slice(at, k)) + `<mark class="hit">${esc(t.slice(k, k + fq.length))}</mark>`; at = k + fq.length; k = ft.indexOf(fq, at); } sp.innerHTML = out + esc(t.slice(at)); });
}
function rdFindBar() {
  $("#rdFindBar")?.remove(); const b = rdBook(); if (!RD.q || !b || !$("#rdPages")) return;
  const i = rdCurrent() ?? 0, hp = RD.hitPages || [], k = hp.indexOf(i);
  document.body.insertAdjacentHTML("beforeend", `<div class="rd-findbar" id="rdFindBar" role="region" aria-label="Find in the book"><button class="rf-q" data-action="rd-goto">${ico("search")}<span>“${esc(RD.q)}”</span></button><span class="tiny mono rf-n">${k >= 0 ? `${k + 1} of ${hp.length}` : `${hp.length} page${hp.length === 1 ? "" : "s"}`}</span><button class="icon-btn sm" data-action="rd-hitgo" data-d="-1" aria-label="Previous match">${ico("back")}</button><button class="icon-btn sm" data-action="rd-hitgo" data-d="1" aria-label="Next match">${ico("chev")}</button><button class="icon-btn sm" data-action="rd-findx" aria-label="Stop finding">${ico("x")}</button></div>`);
}

/* ---------- 2. teach it back ---------- */
const TB = { id: null, phase: "ready", mr: null, stream: null, chunks: [], t0: 0, tick: 0, ac: null, an: null, raf: 0, result: null, text: "", secs: 0, pct: 0, msg: "", err: "" };
const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
function openTeach(id, keep) {
  const n = nodes[id]; if (!n) return;
  if (!keep) Object.assign(TB, { id, phase: "ready", result: null, text: "", err: "" });
  const sm = summaryOf(id);
  const head = sheetHead(subjects[n.subject].name + " · " + n.num, "Teach it back: " + n.title);
  let body;
  if (!sm) body = `<p class="muted">Teach it back checks your explanation against this topic's notes. Add notes first, then try again.</p><button class="btn btn-pen" data-action="notes" data-id="${id}" style="align-self:flex-start">${ico("notes")}Add notes</button>`;
  else if (!canRecord()) body = `<p class="muted">This browser can't record sound. Use the blurt check to write your explanation instead.</p><button class="btn btn-pen" data-action="blurt" data-id="${id}" style="align-self:flex-start">${ico("bulb")}Blurt check</button>`;
  else if (TB.phase === "ready") body = `<p class="small muted">Close your notes and explain this topic out loud, as if teaching a friend who missed the lecture. Then see which ideas you covered.</p>
      <ul class="tb-tips small"><li>Say the key terms and give an example.</li><li>One to three minutes is plenty.</li><li>Stuck? Say what you'd look up. That's useful too.</li></ul>
      <button class="tb-rec" data-action="tb-start"><span class="tb-dot">${ico("mic")}</span><span><b>Start explaining</b><span class="tiny">Tap again when you're done</span></span></button>
      ${TB.err ? `<div class="lock bad" role="alert">${ico("info")}<span>${esc(TB.err)}</span></div>` : ""}
      <p class="tiny muted">Your voice is turned into text on this device and nothing is uploaded. The first time, a speech model downloads once (60–250 MB).</p>`;
  else if (TB.phase === "rec") body = `<div class="tb-live" role="status"><span class="tb-time mono" id="tbTime">0:00</span><div class="tb-meter" id="tbMeter" aria-hidden="true">${"<i></i>".repeat(16)}</div><span class="small muted">Listening… explain ${esc(n.title)}</span></div>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="tb-stop">${ico("stop")}Stop and check</button><button class="btn btn-line" data-action="tb-cancel">Cancel</button></div>`;
  else if (TB.phase === "work") body = `<div class="dl" role="status"><div class="dl-top"><span class="small" id="tbMsg">${esc(TB.msg)}</span></div><div class="dlbar"><i id="tbBar" style="width:${Math.round(TB.pct * 100)}%"></i></div></div><p class="tiny muted">Keep Study Desk open while it writes out what you said.</p>`;
  else {
    const r = TB.result, wc = words(TB.text).length, mins = Math.max(TB.secs / 60, 1 / 60), um = (TB.text.match(/\b(um+|uh+|erm+|uhm+)\b/gi) || []).length;
    body = r ? `<div class="blurt-score" style="--p:${r.score}"><b>${Math.round(r.score * 100)}%</b><span>${r.score >= .7 ? "You could teach this. It's sticking." : r.score >= .4 ? "Good start. Look at the missed ideas, then explain it again tomorrow." : "Lots still to learn. Read the missed ideas, then try again later."}</span></div>
      <div class="tb-stats"><span><b>${fmtSecs(TB.secs)}</b> spoken</span><span><b>${wc}</b> words</span>${TB.secs >= 20 ? `<span><b>${Math.round(wc / mins)}</b> words a minute</span>` : ""}${um ? `<span><b>${um}</b> “um”${um > 1 ? "s" : ""}</span>` : ""}</div>
      <ul class="blurt-list">${r.ideas.map(x => `<li class="${x.ok ? "ok" : "gap"}">${ico(x.ok ? "check" : "x")}<span>${esc(x.b)}</span></li>`).join("")}</ul>
      ${r.terms.length ? `<div class="terms">${r.terms.map(x => `<span class="${x.ok ? "" : "gap"}">${x.ok ? "✓ " : ""}${esc(x.t)}</span>`).join("")}</div>` : ""}
      <details class="tb-said"><summary class="small">What you said</summary><p class="small">${esc(TB.text)}</p></details>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-action="tb-again">${ico("mic")}Explain it again</button><button class="btn btn-line" data-x="close">Done</button></div>`
      : `<div class="lock bad" role="alert">${ico("info")}<span>No speech was heard. Check the microphone is allowed for Study Desk and speak a little closer.</span></div><div class="row"><button class="btn btn-soft" data-action="tb-again">Try again</button></div>`;
  }
  const html = `${head}<div class="stack form" id="tbBody">${body}</div>`;
  const sh = $(".sheet"); if (keep && sh && $("#tbBody")) sh.innerHTML = html; else openSheet("Teach it back", html);
}
const fmtSecs = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
async function tbStart() {
  if (STT.busy) { toast("A lecture recording is being turned into text. Try again when it's done."); return; }
  try {
    TB.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) { TB.err = e && e.name === "NotAllowedError" ? "The microphone isn't allowed. Allow it for Study Desk in the browser's settings, then try again." : "Couldn't find a microphone on this device."; openTeach(TB.id, true); return; }
  const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find(t => MediaRecorder.isTypeSupported?.(t)) || "";
  TB.chunks = []; TB.mr = new MediaRecorder(TB.stream, type ? { mimeType: type } : undefined);
  TB.mr.ondataavailable = e => { if (e.data && e.data.size) TB.chunks.push(e.data); };
  TB.mr.start(1000); TB.t0 = Date.now(); TB.phase = "rec"; TB.err = ""; openTeach(TB.id, true); buzz(8);
  try { const AC = window.AudioContext || window.webkitAudioContext; TB.ac = new AC(); const src = TB.ac.createMediaStreamSource(TB.stream); TB.an = TB.ac.createAnalyser(); TB.an.fftSize = 64; src.connect(TB.an); } catch (e) { TB.an = null; }
  const data = new Uint8Array(32);
  const loop = () => {
    if (TB.phase !== "rec") return;
    const t = $("#tbTime"), s = (Date.now() - TB.t0) / 1000; if (t) t.textContent = fmtSecs(s);
    if (s > 600) { tbStop(); toast("Stopped at 10 minutes."); return; }
    const bars = $$("#tbMeter i");
    if (TB.an && bars.length) { TB.an.getByteFrequencyData(data); bars.forEach((b, k) => b.style.setProperty("--v", (data[1 + k] / 255).toFixed(2))); }
    TB.raf = requestAnimationFrame(loop);
  };
  loop();
}
function tbRelease() { cancelAnimationFrame(TB.raf); try { TB.stream && TB.stream.getTracks().forEach(t => t.stop()); } catch (e) { } try { TB.ac && TB.ac.close(); } catch (e) { } TB.stream = null; TB.ac = null; TB.an = null; }
function tbCancel() { if (TB.mr && TB.mr.state !== "inactive") { TB.mr.ondataavailable = null; TB.mr.onstop = null; try { TB.mr.stop(); } catch (e) { } } tbRelease(); TB.phase = "ready"; }
async function tbStop() {
  if (!TB.mr || TB.mr.state === "inactive") return;
  TB.secs = (Date.now() - TB.t0) / 1000;
  const done = new Promise(res => { TB.mr.onstop = res; }); TB.mr.stop(); await done; tbRelease();
  const blob = new Blob(TB.chunks, { type: TB.mr.mimeType || "audio/webm" }); TB.chunks = [];
  TB.phase = "work"; TB.pct = 0; TB.msg = "Getting ready…"; openTeach(TB.id, true);
  const show = () => { const m = $("#tbMsg"), b = $("#tbBar"); if (m) m.textContent = TB.msg; if (b) b.style.width = Math.round(TB.pct * 100) + "%"; };
  STT.busy = "teach"; keepAwake(true);
  try {
    const device = await sttDevice();
    if (!STT.w) STT.w = new Worker("stt-worker.js", { type: "module" });
    TB.msg = "Getting the speech model ready…"; show();
    await workerCall(STT.w, { op: "load", device }, d => { if (d.total) { TB.pct = d.loaded / d.total * .6; TB.msg = `Downloading the speech model (once): ${fmtMB(d.loaded)} of ${fmtMB(d.total)}`; show(); } });
    TB.msg = "Writing out what you said…"; TB.pct = .6; show();
    const pcm = await decode16k(blob), parts = sttChunks(pcm); let text = "";
    for (let k = 0; k < parts.length; k++) { const d = await workerCall(STT.w, { op: "text", device, audio: pcm.slice(parts[k][0], parts[k][1]) }); if (d.text) text += (text ? " " : "") + d.text; TB.pct = .6 + .4 * (k + 1) / parts.length; show(); }
    TB.text = text.trim();
    TB.result = words(TB.text).length >= 3 ? blurtGrade(TB.text, TB.id) : null;
    if (TB.result) { logEvent({ t: "blurt", n: TB.id, sc: Math.round(TB.result.score * 100) }); if (TB.result.score >= .6 && st(TB.id) === 1) setStatus(TB.id, 2, "Explained out loud"); save(); }
    TB.phase = "done";
  } catch (e) {
    console.error(e); TB.phase = "ready";
    TB.err = navigator.onLine === false ? "You're offline. The speech model needs the internet once to download." : "Couldn't write out the recording on this device. Try the blurt check instead.";
  } finally { STT.busy = null; keepAwake(false); }
  if ($("#tbBody")) { openTeach(TB.id, true); if (TB.result && TB.result.score >= .7) setTimeout(() => FX.burst($(".blurt-score"), 30, 70), 120); }
}
/* closing the sheet while recording throws the recording away */
new MutationObserver(() => { if ((TB.phase === "rec") && !$("#tbBody")) tbCancel(); }).observe($("#layer"), { childList: true });

/* ---------- 3. handwriting to text ---------- */
function sketchRaster(sk) {
  return new Promise((res, rej) => {
    const ink = sk.paths.filter(p => !/\/\s*\.\d+\)$/.test(p.c));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sk.w} ${sk.h}" width="${sk.w * 2}" height="${sk.h * 2}"><rect width="100%" height="100%" fill="#fff"/>${ink.map(p => `<path d="${p.d}" fill="#111"/>`).join("")}</svg>`;
    const img = new Image(); img.onload = () => { const cv = document.createElement("canvas"); cv.width = sk.w * 2; cv.height = sk.h * 2; const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0); cv.toBlob(b => b ? res(b) : rej(new Error("png")), "image/png"); };
    img.onerror = () => rej(new Error("svg")); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}
const _openSketch = openSketch;
openSketch = function (node, id, mode) {
  _openSketch(node, id);
  if (!SK) return;
  SK.hw = mode === "hw";
  const sh = $(".sheet"); if (!sh) return;
  if (SK.hw) { const h = $(".sheet-head h2", sh); if (h) h.textContent = "Write by hand"; $(".sk-pad", sh)?.classList.add("lined"); const lf = $("#sk-title", sh)?.closest(".fld"); if (lf) lf.hidden = true; }
  const row = $('[data-action="sk-save"]', sh)?.parentElement;
  if (row) {
    row.insertAdjacentHTML(SK.hw ? "beforebegin" : "afterend", `<div class="hw stack" style="gap:8px"><div class="row" style="flex-wrap:wrap"><button class="btn ${SK.hw ? "btn-pen" : "btn-soft btn-sm"}" data-action="hw-read">${ico("type")}Turn writing into text</button></div><div id="hw-out" role="status"></div></div>`);
    if (SK.hw) { const sv = $('[data-action="sk-save"]', sh); if (sv) { sv.className = "btn btn-line btn-sm"; sv.lastChild.textContent = "Keep as a sketch"; } }
  }
  if (SK.hw) $(".sk-pad", sh)?.insertAdjacentHTML("beforebegin", `<p class="small muted">Write in clear print, a few words per line. Study Desk reads it on this device. Check the text before you save it.</p>`);
};
async function hwRead() {
  const out = $("#hw-out"); if (!SK || !out) return;
  if (!SK.paths.length) { toast("Write something first."); return; }
  const show = (label, p) => { out.innerHTML = `<p class="small row" style="gap:8px"><span class="spin" aria-hidden="true"></span>${esc(label)}${p ? ` ${Math.round(p * 100)}%` : ""}</p>`; };
  show("Reading your writing…");
  try {
    const text = (await ocrImages([await sketchRaster(SK)], show)).replace(/[|_~]{1,}/g, " ").replace(/[ \t]+/g, " ").trim();
    if (!text) { out.innerHTML = `<div class="lock bad">${ico("info")}<span>Couldn't make out any words. Write bigger, in print, with space between lines.</span></div>`; return; }
    out.innerHTML = `<label class="fld"><span>The text (fix anything it misread)</span><textarea id="hw-text" rows="4">${esc(text)}</textarea></label>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen btn-sm" data-action="hw-add" data-node="${SK.node}">${ico("notes")}Add to my notes</button><button class="btn btn-line btn-sm" data-action="hw-copy">${ico("copy")}Copy</button></div>`;
  } catch (e) { console.error(e); out.innerHTML = `<div class="lock bad">${ico("info")}<span>The text reader couldn't start. Connect to the internet once, then it works offline.</span></div>`; }
}

/* ---------- wiring into the existing screens ---------- */
const _openNotesSheet = openNotesSheet;
openNotesSheet = function (id) {
  _openNotesSheet(id);
  $('label[for="ocr-file"]')?.insertAdjacentHTML("afterend", `<button class="btn btn-soft" data-action="hw-open" data-node="${id}">${ico("pencil")}Write by hand</button>`);
};
const _vSubject = V.subject;
V.subject = sid => {
  let h = _vSubject(sid); if (!subjects[sid]) return h;
  const b = booksOf(sid)[0];
  if (b) h = h.replace(/(<button class="btn btn-soft btn-sm" data-go="summary:[^"]*">[\s\S]*?<\/button>)/, m0 => m0 + `<button class="btn btn-line btn-sm" data-go="read:${b.id}">${ico("book")}Read the textbook</button>`);
  return h.replace(/<\/div>\s*$/, () => bookShelf(sid) + "</div>");
};
const _vTopic = V.topic;
V.topic = id => {
  let h = _vTopic(id); const n = nodes[id]; if (!n || !n.leaf) return h;
  const b = booksOf(n.subject)[0];
  if (b && n.p1) h = h.replace(/(<span class="bigpages">[^<]*<\/span>)/, m0 => m0 + `<button class="btn btn-soft btn-sm" data-go="read:${b.id}:${pageIndexOf(b, n.p1)}">${ico("book")}Read</button>`);
  return h;
};
const _vImport = V.import;
V.import = () => {
  const h = _vImport();
  if (!IMP.done || !RD.lastPdf || !IMP.sid || !subjects[IMP.sid]) return h;
  const kept = RD.kept === RD.lastPdf;
  return h.replace(/<\/div>\s*$/, () => `<section class="card bk-offer" id="bkOffer">${kept ? `${ico("check")}<div class="grow"><b>The PDF is kept on this device</b><span class="small muted">Read it and highlight it from ${esc(subjects[IMP.sid].name)} › Textbook, or from the Read button on each topic.</span></div><button class="btn btn-line btn-sm" data-go="read:${RD.keptId}">Open it</button>`
    : `<span class="bk-ic">${ico("book")}</span><div class="grow"><b>Read this PDF in Study Desk too?</b><span class="small muted">Keep ${esc(RD.lastPdf.name)} here to read it, highlight lines and turn them into flashcards. It uses ${fmtSize(RD.lastPdf.size)} on this device.</span></div><button class="btn btn-soft btn-sm" data-action="rd-keep" ${RD.adding ? "disabled" : ""}>${RD.adding ? "Saving…" : "Keep the PDF"}</button>`}</section></div>`);
};
/* Today: pick up the textbook where you left off */
const _vToday = V.today;
V.today = () => {
  const h = _vToday();
  const recent = BOOKS.map(b => ({ b, m: MARKS[b.id] })).filter(x => x.m && x.m.last > 0 && x.m.seen && Date.now() - x.m.seen < 14 * 864e5 && subjects[x.b.sid]).sort((a, c) => c.m.seen - a.m.seen)[0];
  if (!recent) return h;
  const { b, m } = recent, p = Math.round((m.last + 1) / b.pages * 100);
  const card = `<button class="card cont-read" data-go="read:${b.id}" style="--pc:${subjColor(b.sid)}"><span class="bk-cover">${b.thumb ? `<img src="${b.thumb}" alt="">` : ico("book")}</span><span class="grow"><span class="tiny muted">Continue reading · ${esc(subjects[b.sid].name)}</span><b>${esc(b.title)}</b><span class="cr-bar" aria-hidden="true"><i style="width:${p}%"></i></span><span class="tiny muted">Page ${esc(pageLabel(b, m.last))} of ${b.pages}${m.hl.length ? ` · ${m.hl.length} highlight${m.hl.length > 1 ? "s" : ""}` : ""}</span></span>${ico("chev", 'class="chev"')}</button>`;
  const d = h.indexOf('<div class="dash">'), k = d < 0 ? -1 : h.indexOf('<section class="section"><div class="sec-head"><h2>', d);
  return k < 0 ? h : h.slice(0, k) + card + h.slice(k);
};
/* a card made from a highlight says where it came from */
function hlOfCard(cid) { for (const m of Object.values(MARKS)) { const h = m.hl.find(x => x.card === cid); if (h) { const b = BOOKS.find(x => x.id === m.id); if (b) return { b, h }; } } return null; }
const _vReview = V.review;
V.review = () => {
  const h = _vReview(); if (typeof R === "undefined" || !R || R.i >= R.ids.length) return h;
  const src = hlOfCard(R.ids[R.i]); if (!src) return h;
  return h.replace(/(<div class="fc-face fc-back"[^>]*>[\s\S]*?)(<\/div>)/, (m0, a, z) => a + `<span class="fc-src">${ico("book")}${esc(src.b.title)}, page ${esc(pageLabel(src.b, src.h.i))}</span>` + z);
};
const _openCardSheet = openCardSheet;
openCardSheet = function (node, cid) {
  _openCardSheet(node, cid);
  const src = cid && hlOfCard(cid), row = src && $('.sheet [data-action="fc-save"]')?.parentElement;
  if (row) row.insertAdjacentHTML("beforeend", `<button class="btn btn-line btn-sm" data-sgo="read:${src.b.id}:${src.h.i}">${ico("book")}Page ${esc(pageLabel(src.b, src.h.i))} in the textbook</button>`);
};
const _importFile = importFile;
importFile = async function (file, sid) { RD.lastPdf = file && /\.pdf$/i.test(file.name || "") ? file : null; return _importFile(file, sid); };
const _render = render;
render = function (fresh) {
  rdPopHide();
  const top = stack[stack.length - 1];
  if (top.v !== "read" && RD.io) { RD.io.disconnect(); RD.io = null; RD.vis.clear(); }
  $("#rdFindBar")?.remove(); if (top.v !== "read" || String(top.a || "").split(":")[0] !== RD.bid) { RD.q = ""; RD.hitPages = []; }
  _render(fresh);
  if (top.v === "read") { rdMount(); rdFindBar(); }
};

const R_ACTS = new Set(["rd-zoom", "rd-goto", "rd-n", "rd-hit", "rd-hitgo", "rd-findx", "rd-jump", "rd-list", "rd-hl", "rd-card", "rd-open", "rd-show", "rd-mk", "rd-mkall", "rd-del", "rd-rm", "rd-keep", "tb-open", "tb-start", "tb-stop", "tb-cancel", "tb-again", "hw-read", "hw-add", "hw-copy", "hw-open"]);
async function rAction(act, a) {
  const b = rdBook(), m = b ? marksOf(b.id) : null, h = m && a.dataset.h ? m.hl.find(x => x.id === a.dataset.h) : null;
  switch (act) {
    case "rd-zoom": rdZoom(+a.dataset.d); return;
    case "rd-goto": gotoSheet(); return;
    case "rd-n": {
      const v = ($("#rd-n")?.value || "").trim(); if (!v || !b) return;
      const i = b.labels && b.labels.indexOf(v) >= 0 ? b.labels.indexOf(v) : /^\d+$/.test(v) ? pageIndexOf(b, +v) : -1;
      if (i >= 0 && (/^\d+$/.test(v) || b.labels?.includes(v))) { if (/^\d+$/.test(v) && +v > pageNum(b, b.pages - 1)) { toast(`This PDF ends at page ${pageLabel(b, b.pages - 1)}.`); return; } closeSheet(true); rdScrollTo(i, true); return; }
      rdFind(v); return;
    }
    case "rd-hit": { RD.q = a.dataset.q; closeSheet(true); const i = +a.dataset.i; rdScrollTo(i, true); $$(".rd-page.on").forEach(rdMarkHits); rdFindBar(); return; }
    case "rd-hitgo": { const hp = RD.hitPages || [], i = rdCurrent() ?? 0; if (!hp.length) return; const d = +a.dataset.d; const t = d > 0 ? (hp.find(x => x > i) ?? hp[0]) : ([...hp].reverse().find(x => x < i) ?? hp[hp.length - 1]); rdScrollTo(t, true); setTimeout(rdFindBar, 120); return; }
    case "rd-findx": RD.q = ""; RD.hitPages = []; $("#rdFindBar")?.remove(); $$(".rd-page.on").forEach(rdMarkHits); return;
    case "rd-jump": closeSheet(true); rdScrollTo(+a.dataset.i, true); return;
    case "rd-list": listSheet(); return;
    case "rd-hl": { const hh = rdAddHl(RD.sel); getSelection()?.removeAllRanges(); rdPopHide(); if (hh) { buzz(6); toast("Highlighted.", { label: "Make a card", fn: () => hlSheet(hh.id) }); } return; }
    case "rd-card": { const hh = rdAddHl(RD.sel); getSelection()?.removeAllRanges(); rdPopHide(); if (hh) hlSheet(hh.id); return; }
    case "rd-open": hlSheet(a.dataset.h); return;
    case "rd-show": if (h) { closeSheet(true); rdScrollTo(h.i); const el = rdPageEl(h.i); setTimeout(() => el?.querySelectorAll(`[data-h="${h.id}"]`).forEach(x => { x.classList.remove("flash"); void x.offsetWidth; x.classList.add("flash"); }), 450); } return;
    case "rd-mk": {
      if (!h) return; const node = $("#hl-node")?.value, f = ($("#hl-f")?.value || "").trim(), bk = ($("#hl-b")?.value || "").trim();
      if (!f || !bk) { toast("Write both a question and an answer."); return; }
      if (!nodes[node]) return;
      rdMakeCard(h, node, f, bk); save(); saveMarks(b.id); closeSheet(); const el = rdPageEl(h.i); if (el) drawHl(el); buzz(8);
      toast(`Card added to ${nodes[node].title}. It shows up in your next review.`); return;
    }
    case "rd-mkall": {
      const cards = new Set((S.cards || []).map(c => c.id)); let n = 0;
      for (const x of m.hl) { if (x.card && cards.has(x.card)) continue; const d = cardFromText(x.full || x.text), node = x.node && nodes[x.node] ? x.node : topicAt(b, x.i, x.rects[0][1]); if (!d.f || !node) continue; rdMakeCard(x, node, d.f, d.b); n++; }
      save(); saveMarks(b.id); $$(".rd-page.on").forEach(drawHl); closeSheet(); if (n) { FX.party && FX.party(); toast(`${n} card${n > 1 ? "s" : ""} added. Check them in your next review.`); } return;
    }
    case "rd-del": {
      if (!h) return; if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to remove"; return; }
      m.hl = m.hl.filter(x => x !== h); saveMarks(b.id); closeSheet(); const el = rdPageEl(h.i); if (el) drawHl(el); const n = $("#rdHlN"); if (n) n.textContent = m.hl.length;
      toast(h.card ? "Highlight removed. Its flashcard stays." : "Highlight removed."); return;
    }
    case "rd-rm": {
      if (!b) return; if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to remove the PDF"; return; }
      await IDB.del("books", b.id); await IDB.del("marks", b.id); delete MARKS[b.id]; if (RD.doc) { try { RD.doc.destroy(); } catch (e) { } RD.doc = null; RD.docFor = null; }
      await loadBooks(); closeSheet(true); const sid = b.sid; RD.bid = null; stack = stack.filter(x => x.v !== "read"); if (!stack.length) stack = [{ v: "exams" }]; render(true); toast("PDF removed. Your flashcards are still there."); return;
    }
    case "rd-keep": {
      if (!RD.lastPdf || RD.adding) return; a.disabled = true; a.textContent = "Saving…";
      const rec = await addBook(RD.lastPdf, IMP.sid); if (rec) { RD.kept = RD.lastPdf; RD.keptId = rec.id; toast("Kept. Open it from the subject page."); }
      render(false); return;
    }
    case "tb-open": openTeach(a.dataset.id); return;
    case "tb-start": if (TB.phase === "ready") tbStart(); return;
    case "tb-stop": tbStop(); return;
    case "tb-cancel": tbCancel(); openTeach(TB.id, true); return;
    case "tb-again": TB.phase = "ready"; TB.result = null; TB.text = ""; TB.err = ""; openTeach(TB.id, true); return;
    case "hw-open": {
      const node = a.dataset.node, ta = $("#notes-text");
      if (ta && ta.value.trim() !== (notesOf(node) || "").trim()) { await saveNotes(node, ta.value); sumCache.clear(); }
      openSketch(node, null, "hw"); if (SK) SK.from = ta ? "notes" : ""; return;
    }
    case "hw-read": hwRead(); return;
    case "hw-add": {
      const t = ($("#hw-text")?.value || "").trim(), node = a.dataset.node; if (!t || !nodes[node]) return;
      await saveNotes(node, ((notesOf(node) || "").trim() + "\n\n" + t).trim()); sumCache.clear();
      const back = SK && SK.from === "notes"; if (back) openNotesSheet(node); else closeSheet(); rerender();
      if (back) setTimeout(() => { const ta = $("#notes-text"); if (ta) ta.scrollTop = ta.scrollHeight; }, 60);
      toast(`Added to your notes for ${nodes[node].title}.`); return;
    }
    case "hw-copy": { const t = $("#hw-text")?.value || ""; try { await navigator.clipboard.writeText(t); toast("Copied."); } catch (e) { $("#hw-text")?.select(); toast("Select the text and copy it."); } return; }
  }
}
/* tapping a highlight on the page opens it */
document.addEventListener("click", e => {
  const pg = e.target.closest?.(".rd-page.on"); if (!pg || e.target.closest("button,a")) return;
  const s = getSelection(); if (s && !s.isCollapsed) return;
  const r = pg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, i = +pg.dataset.i;
  const h = marksOf(RD.bid).hl.find(h => h.i === i && h.rects.some(q => x >= q[0] - .005 && x <= q[0] + q[2] + .005 && y >= q[1] - .005 && y <= q[1] + q[3] + .005));
  if (h) hlSheet(h.id);
});
document.addEventListener("keydown", e => { if (e.target.id === "rd-n" && e.key === "Enter") { e.preventDefault(); $('[data-action="rd-n"]')?.click(); } });
document.addEventListener("change", async e => {
  const el = e.target; if (el.id !== "rd-file" || !el.files || !el.files[0]) return;
  const rec = await addBook(el.files[0], el.dataset.sid);
  if (rec) toast(`${rec.title} is ready to read.`, { label: "Open", fn: () => go("read:" + rec.id) });
});
(function rBoot() { loadBooks().then(() => { const v = stack[stack.length - 1].v; if (["subject", "topic", "read"].includes(v)) rerender(); }); })();
