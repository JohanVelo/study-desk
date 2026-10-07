/* Study Desk v4.12: optional online AI (Claude), on each person's own Anthropic API key
   Claude reads the textbook pages of a topic as pictures (so diagrams, tables and formulas are seen as
   they are printed), or a single diagram, and explains them with examples and quick checks.
   Nothing is sent until someone taps a button, the key stays on this device in this profile,
   and every answer is marked as AI-written with page references to check against the book.
   Uses the official Anthropic TypeScript SDK (MIT), bundled for the browser in vendor/x/anthropic-sdk.mjs. */

const AI_MODEL = "claude-opus-5-5", AI_PRICE = { in: 4, out: 20 }, AI_PAGES = 20, AI_KEY = "studydesk.aikey";
const aiKey = () => { try { return localStorage.getItem(AI_KEY) || ""; } catch (e) { return ""; } };
const aiOn = () => !!aiKey();
let AIC = null, AI_BUSY = null;
async function aiClient() {
  const key = aiKey(); if (!key) throw Object.assign(new Error("no key"), { friendly: "Add your Anthropic API key in Settings → Online AI first." });
  if (!AIC || AIC.key !== key) {
    const { default: Anthropic } = await import(new URL("vendor/x/anthropic-sdk.mjs", location.href).href);
    /* the key is the person's own and never leaves this device except to Anthropic */
    AIC = { key, Anthropic, client: new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 2 }) };
  }
  return AIC;
}
function aiError(e, A) {
  if (e && e.friendly) return e.friendly;
  const Ant = A && A.Anthropic, msg = String((e && e.message) || "");
  if (Ant && e instanceof Ant.AuthenticationError) return "Your API key wasn't accepted. Check it in Settings → Online AI.";
  if (Ant && e instanceof Ant.PermissionDeniedError) return "This API key isn't allowed to use Claude. Check your Anthropic account.";
  if (Ant && e instanceof Ant.RateLimitError) return "Claude is busy for your account right now. Wait a minute and try again.";
  if (/credit balance|billing/i.test(msg)) return "Your Anthropic account needs credit. Add some under Billing at console.anthropic.com.";
  if (Ant && e instanceof Ant.APIConnectionError) return "Couldn't reach Claude. Check the internet connection and try again.";
  if (Ant && e instanceof Ant.APIError && e.status >= 500) return "Claude had a problem on its side. Try again in a moment.";
  return "Something went wrong asking Claude. Try again.";
}
/* a saved answer, or null (IDB.get hands back the request itself when nothing is saved) */
const aiGet = async key => { try { const r = await IDB.get("ai", key); return r && typeof r.text === "string" ? r : null; } catch (e) { return null; } };
const AI_HAS = new Set();
setTimeout(() => IDB.all("ai").then(rs => Array.isArray(rs) && rs.forEach(r => r && r.id && AI_HAS.add(r.id))).catch(() => { }), 400);
const aiCost = u => { if (!u) return ""; const d = ((u.input_tokens || 0) + (u.cache_creation_input_tokens || 0)) * AI_PRICE.in / 1e6 + (u.output_tokens || 0) * AI_PRICE.out / 1e6; return d < 0.01 ? "less than 1 cent" : d < 1 ? `about ${Math.round(d * 100)} cents` : `about $${d.toFixed(2)}`; };

const AI_SYSTEM = `You are a patient university tutor helping a student learn from their own textbook.
You are given pages of their book as images and/or their notes. Teach from that material.

Rules:
- Base every statement on the material provided. Cite the page for facts, like (p. 42).
- If you add an example or explanation that is not in the material, mark it "(my example)".
- If the material doesn't cover something, say so rather than guessing.
- Read diagrams, charts, tables and formulas carefully as printed. Explain what each shows, how to read it, and what it means.
- Plain British English, short sentences, no filler. Use Markdown headings and bullet points.
- End with a "## Check yourself" section of 5 questions, each written as two lines: "Q: ..." then "A: ..." (answers in one or two sentences).`;

/* ---------- pages of the textbook as pictures ---------- */
async function aiBookDoc(bid) {
  const rec = await IDB.get("books", bid); if (!rec || !rec.data) return null;
  const lib = await loadPdfJs();
  return lib.getDocument({ data: new Uint8Array(await rec.data.arrayBuffer()), isEvalSupported: false }).promise;
}
async function aiPageImages(b, from, to, onStep) {
  const doc = await aiBookDoc(b.id); if (!doc) return [];
  const out = [], cv = document.createElement("canvas"), ctx = cv.getContext("2d");
  try {
    for (let i = from; i <= to; i++) {
      onStep && onStep(i - from + 1, to - from + 1);
      const pg = await doc.getPage(i + 1), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(2.2, 1240 / v1.width) });
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise; pg.cleanup();
      out.push({ label: pageLabel(b, i), data: cv.toDataURL("image/jpeg", .82).split(",")[1] });
    }
  } finally { cv.width = cv.height = 0; try { doc.destroy(); } catch (e) { } }
  return out;
}
/* what a topic would send: its pages if the book is kept on this device, otherwise its notes */
function aiPlan(id) {
  const n = nodes[id], b = typeof booksOf === "function" ? booksOf(n.subject)[0] : null;
  if (b && n.p1) {
    const from = pageIndexOf(b, n.p1), last = pageIndexOf(b, n.p2 || n.p1), to = Math.min(last, from + AI_PAGES - 1);
    return { b, from, to, all: last - from + 1, notes: last > to ? notesOf(id).slice(0, 60000) : "" };
  }
  return { b: null, notes: notesOf(id).slice(0, 120000) };
}

/* ---------- asking ---------- */
async function aiAsk({ content, out, onText }) {
  const A = await aiClient();
  const stream = A.client.beta.messages.stream({
    model: AI_MODEL, max_tokens: 16000,
    thinking: { type: "adaptive" }, output_config: { effort: "medium" },
    /* if a safety check declines, the API retries on another model by itself */
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    system: AI_SYSTEM, messages: [{ role: "user", content }]
  });
  let text = "";
  stream.on("text", d => { text += d; onText && onText(text); });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw Object.assign(new Error("refusal"), { friendly: "Claude declined to answer this one. Try the summary or Learn it step by step instead." });
  text = msg.content.filter(c => c.type === "text").map(c => c.text).join("");
  return { text, usage: msg.usage, cut: msg.stop_reason === "max_tokens" };
}
/* "## Check yourself" Q/A lines become flip-open questions and can become flashcards */
function aiSplit(md) {
  const m = md.match(/\n#{1,3}\s*Check yourself[^\n]*\n([\s\S]*)$/i); if (!m) return { md, qa: [] };
  const qa = []; let q = null;
  m[1].split("\n").forEach(l => { const t = l.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").replace(/\*\*/g, "").trim(); if (/^Q\s*[:.]/i.test(t)) q = t.replace(/^Q\s*[:.]\s*/i, ""); else if (/^A\s*[:.]/i.test(t) && q) { qa.push({ q, a: t.replace(/^A\s*[:.]\s*/i, "") }); q = null; } });
  return { md: md.slice(0, m.index), qa };
}
async function aiRender(box, rec, final) {
  const { md, qa } = aiSplit(rec.text || "");
  box.innerHTML = `<div class="ai-out md">${await mdToHtml(md)}</div>
    ${qa.length ? `<div class="ai-qa"><h3 class="h3">Check yourself</h3>${qa.map(x => `<details class="ai-q"><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")}</div>` : ""}
    ${final ? `<p class="ai-meta tiny">${ico("spark")}<span>Written by Claude (online AI) from ${esc(rec.src || "your material")}${rec.cost ? ` · cost ${esc(rec.cost)}` : ""}. Check it against your book.${rec.cut ? " The answer was cut short." : ""}</span></p>` : ""}`;
  typeof mathify === "function" && mathify(box);
  return qa;
}

/* ---------- topic: explain with Claude ---------- */
async function aiTopic(id, again) {
  const n = nodes[id], plan = aiPlan(id), key = "t:" + id;
  const old = again ? null : await aiGet(key);
  const pagesTxt = plan.b ? `pages ${pageLabel(plan.b, plan.from)}–${pageLabel(plan.b, plan.to)} of your textbook` : "your notes";
  openSheet("Explain with Claude", `${sheetHead(subjects[n.subject].name + " · " + n.title, "Explained by Claude")}
    <div class="stack" style="gap:14px"><div id="aiBox" aria-live="polite"></div><div class="row ai-acts" id="aiActs" style="flex-wrap:wrap"></div></div>`);
  const box = $("#aiBox"), acts = $("#aiActs");
  const done = (rec, qa) => {
    acts.innerHTML = `${qa.length ? `<button class="btn btn-soft btn-sm" data-action="ai-cards" data-id="${id}">${ico("cards")}Make ${qa.length} flashcards</button>` : ""}<button class="btn btn-line btn-sm" data-action="ai-topic" data-id="${id}" data-again="1">Ask again</button>`;
  };
  if (old && old.text) { const qa = await aiRender(box, old, true); done(old, qa); return; }
  if (!plan.b && !plan.notes.trim()) { box.innerHTML = `<p class="muted">Add notes to this topic or keep the textbook PDF on this device first. Claude only explains your own material.</p>`; return; }
  if (AI_BUSY) { box.innerHTML = `<p class="muted">Claude is still working on another explanation. Try again when it's done.</p>`; return; }
  const status = t => { const w = box.querySelector(".ai-wait span:last-child"); if (w) { w.textContent = t; return; }
    box.innerHTML = `<div class="ai-wait"><span class="spin" aria-hidden="true"></span><span>${esc(t)}</span></div><div class="ai-skel" aria-hidden="true"><i style="width:42%"></i><i></i><i style="width:88%"></i><i style="width:94%"></i><i style="width:60%"></i></div><p class="tiny muted">This usually takes under a minute. You can close this and keep studying: the answer is saved on this device when it arrives.</p>`; };
  AI_BUSY = id; let A = null;
  try {
    A = await aiClient();
    const content = [];
    if (plan.b) {
      status(`Getting ${pagesTxt} ready…`);
      const imgs = await aiPageImages(plan.b, plan.from, plan.to, (i, t) => status(`Getting page ${i} of ${t} ready…`));
      imgs.forEach(p => { content.push({ type: "text", text: `Page ${p.label}:` }); content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: p.data } }); });
    }
    const notes = plan.notes;
    if (notes) content.push({ type: "text", text: `${plan.b ? "The rest of this topic, as text from the book" : "My notes for this topic"}:\n\n${notes}` });
    content.push({ type: "text", text: `Topic: ${n.num} ${n.title} (${subjects[n.subject].name}).\n\nHelp me learn this topic properly:\n## In plain words — what it is about, in a short paragraph.\n## Key ideas — every important idea, step by step, with page references.\n## Diagrams and tables — for each one in the material: what it shows, how to read it, what it means.\n## Worked examples — two or three concrete examples that make the ideas usable.\n## Common mistakes — what students often get wrong here.\n## Check yourself — 5 questions as described.` });
    status(plan.b ? `Claude is reading ${pagesTxt}…` : "Claude is reading your notes…");
    const r = await aiAsk({ content, onText: t => { if (!box.querySelector(".ai-out")) box.innerHTML = `<div class="ai-out md ai-live"></div>`; box.querySelector(".ai-out").textContent = t; } });
    const rec = { id: key, text: r.text, at: Date.now(), src: pagesTxt + (plan.b && plan.notes ? " and the text of the rest" : ""), cost: aiCost(r.usage), cut: r.cut };
    IDB.put("ai", rec).catch(() => { }); AI_HAS.add(key); const tc = $(".view .ai-card"); if (tc && tc.querySelector(`[data-id="${id}"]`)) tc.outerHTML = aiTopicCard(id);
    if (!box.isConnected) { toast("Claude's explanation is ready. Open it again from the topic."); return; }
    const qa = await aiRender(box, rec, true); done(rec, qa);
  } catch (e) { console.error(e); if (box.isConnected) box.innerHTML = `<div class="lock">${ico("info")}<span>${esc(aiError(e, A))}</span></div>`; }
  finally { AI_BUSY = null; }
}

/* ---------- one diagram ---------- */
async function aiFigure(fid) {
  const f = FIGS.find(x => x.id === fid); if (!f) return;
  const box = $("#aiFig"); if (!box) return;
  const old = await aiGet("f:" + fid);
  if (old && old.text) { await aiRender(box, old, true); return; }
  box.innerHTML = `<div class="ai-wait"><span class="spin" aria-hidden="true"></span><span>Claude is looking at the picture…</span></div><div class="ai-skel" aria-hidden="true"><i style="width:42%"></i><i></i><i style="width:80%"></i></div>`;
  let A = null;
  try {
    A = await aiClient();
    const url = await figData(fid), mt = (url.match(/^data:(image\/[a-z+]+);base64,/) || [])[1], data = url.split(",")[1], says = figSays(f), n = nodes[f.node];
    if (!data || !/^image\/(jpeg|png|webp|gif)$/.test(mt)) throw Object.assign(new Error("no image"), { friendly: "This picture isn't saved on this device any more. Import the PDF again to explain it." });
    const content = [{ type: "image", source: { type: "base64", media_type: mt, data } },
      { type: "text", text: `This picture is from page ${f.p} of my textbook${n ? `, in the topic "${n.title}"` : ""}.${f.cap ? `\nCaption: ${f.cap}` : ""}${says.length ? `\nWhat the book says about it:\n- ${says.join("\n- ")}` : ""}${n && notesOf(f.node) ? `\n\nNotes for the topic (for context):\n${notesOf(f.node).slice(0, 12000)}` : ""}\n\nExplain this picture:\n## What it shows\n## How to read it — go through each part, label or axis.\n## What it means — the idea it is there to teach.\n## An example — one concrete example that uses it.\n## Check yourself — 3 questions as described.` }];
    const r = await aiAsk({ content, onText: t => { if (!box.isConnected) return; if (!box.querySelector(".ai-out")) box.innerHTML = `<div class="ai-out md ai-live"></div>`; box.querySelector(".ai-out").textContent = t; } });
    const rec = { id: "f:" + fid, text: r.text, at: Date.now(), src: `the picture on page ${f.p}`, cost: aiCost(r.usage), cut: r.cut };
    IDB.put("ai", rec).catch(() => { });
    if (box.isConnected) await aiRender(box, rec, true);
  } catch (e) { console.error(e); if (box.isConnected) box.innerHTML = `<div class="lock">${ico("info")}<span>${esc(aiError(e, A))}</span></div>`; }
}
const _openFigA = openFig;
openFig = async function (id) {
  await _openFigA(id);
  if (!aiOn()) return;
  const has = await aiGet("f:" + id);
  $(".sheet .fig-big")?.parentElement.insertAdjacentHTML("beforeend", `<section class="ai-card stack"><div class="sec-head"><h3 class="h3">Explained by Claude</h3><span class="tiny muted">online AI</span></div><div id="aiFig">${has ? "" : `<p class="small muted">Claude looks at this picture with its caption and explains how to read it, with an example.</p>`}</div>${has ? "" : `<button class="btn btn-soft btn-sm" data-action="ai-fig" data-id="${id}" style="align-self:flex-start">${ico("spark")}Explain this diagram</button>`}</section>`);
  if (has) aiFigure(id);
};

/* ---------- on the topic page ---------- */
function aiTopicCard(id) {
  if (!aiOn()) return "";
  if (AI_HAS.has("t:" + id)) return `<section class="card stack ai-card" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">Explain with Claude</h2><span class="tiny muted">online AI</span></div>
    <p class="small muted">Claude's explanation of this topic is saved on this device. Opening it again is free.</p>
    <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen btn-sm" data-action="ai-topic" data-id="${id}">${ico("spark")}Open the explanation</button><button class="btn btn-line btn-sm" data-action="ai-topic" data-id="${id}" data-again="1">Ask again</button></div></section>`;
  const plan = aiPlan(id); if (!plan.b && !notesOf(id)) return "";
  const what = plan.b ? `Claude reads pages ${esc(pageLabel(plan.b, plan.from))}–${esc(pageLabel(plan.b, plan.to))} of your textbook as they are printed, diagrams and all${plan.all > AI_PAGES ? `, plus the text of the other ${plan.all - AI_PAGES} pages` : ""}` : "Claude reads your notes for this topic";
  const est = plan.b ? (plan.to - plan.from + 1) * 1700 + 4000 : Math.round(plan.notes.length / 3.6) + 4000;
  const cents = Math.max(2, Math.round((est * AI_PRICE.in / 1e6 + 3500 * AI_PRICE.out / 1e6) * 100));
  return `<section class="card stack ai-card" style="gap:10px"><div class="sec-head"><h2 style="font-size:18px">Explain with Claude</h2><span class="tiny muted">online AI</span></div>
    <p class="small muted">${what}, then explains it step by step: key ideas with page numbers, every diagram and table, worked examples, common mistakes and 5 questions. About ${cents} cents on your Anthropic account.</p>
    <button class="btn btn-pen btn-sm" data-action="ai-topic" data-id="${id}" style="align-self:flex-start">${ico("spark")}Explain this topic</button></section>`;
}
const _vTopicA = V.topic;
V.topic = id => { const h = _vTopicA(id), c = nodes[id] && nodes[id].leaf ? aiTopicCard(id) : ""; if (!c) return h; const k = h.indexOf('<section class="card stack figs-card"'); return k >= 0 ? h.slice(0, k) + c + h.slice(k) : h.replace(/(<\/section>)(?![\s\S]*<\/section>)/, "$1" + c); };

/* ---------- settings ---------- */
function aiSettingsCard() {
  const k = aiKey();
  return `<section class="card stack ai-set"><h2 class="h3">Online AI</h2>
    <p class="small muted">Optional. Claude (by Anthropic) can read a topic's textbook pages or a diagram and explain it with examples and questions. Nothing is sent until you tap Explain, and only that topic's pages or that picture go to Anthropic. It uses your own API key, so the cost (a few cents each time) goes on your Anthropic account. The key stays on this device, in ${typeof PROFILES !== "undefined" && PROFILES.many ? esc(PROFILES.nameOf(PROFILES.cur)) + "'s" : "this"} profile.</p>
    ${k ? `<div class="lock" style="background:color-mix(in oklab,var(--ok) 12%,var(--surface))">${ico("check")}<span>Connected with the key ending in <b class="mono">${esc(k.slice(-4))}</b>. Topics and diagrams now have an Explain button.</span></div>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-line btn-sm" data-action="ai-test">Test the key</button><button class="btn btn-line btn-sm danger" data-action="ai-forget">Remove the key</button></div>`
    : `<ol class="steps"><li>Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> and sign up (or sign in).</li><li>Under <b>Billing</b>, add a little credit (five dollars lasts a long time).</li><li>Under <b>API keys</b>, create a key and copy it.</li><li>Paste it here and tap Save.</li></ol>
      <label class="fld"><span>Anthropic API key</span><input id="ai-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…"></label>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen btn-sm" data-action="ai-keysave">Save and test</button></div>`}
    <p class="tiny muted" id="aiSetMsg" role="status"></p></section>`;
}
const _vSettingsA = V.settings;
/* next to the on-laptop AI card when there is one, otherwise just above Backup */
V.settings = () => { const h = _vSettingsA(), a = h.indexOf('<h2 class="h3">AI drafts on this laptop</h2>'), k = a >= 0 ? h.lastIndexOf("<section", a) : h.indexOf('<section class="card stack"><h2 class="h3">Backup and restore</h2>'); return k >= 0 ? h.slice(0, k) + aiSettingsCard() + h.slice(k) : h; };
if (typeof JUMPS !== "undefined" && JUMPS.settings) { const i = JUMPS.settings.findIndex(j => j[1] === "Backup"); JUMPS.settings.splice(i >= 0 ? i : JUMPS.settings.length, 0, ["Online AI", "AI"]); }
async function aiTest() {
  let A = null; const msg = t => { const m = $("#aiSetMsg"); if (m) m.textContent = t; };
  msg("Checking the key…");
  try { A = await aiClient(); await A.client.models.retrieve(AI_MODEL); msg("The key works. Claude is ready."); return true; }
  catch (e) { msg(aiError(e, A)); return false; }
}

const A_ACTS = new Set(["ai-topic", "ai-fig", "ai-cards", "ai-keysave", "ai-test", "ai-forget"]);
async function aAction(act, a) {
  const id = a.dataset.id;
  switch (act) {
    case "ai-topic": aiTopic(id, !!a.dataset.again); return;
    case "ai-fig": a.remove(); aiFigure(id); return;
    case "ai-cards": {
      const rec = await IDB.get("ai", "t:" + id).catch(() => null); if (!rec) return;
      const { qa } = aiSplit(rec.text); if (!S.cards) S.cards = []; let n = 0;
      qa.forEach(x => { if (!S.cards.some(c => c.node === id && c.f === x.q)) { S.cards.push({ id: newId("c"), node: id, f: x.q.slice(0, 1000), b: x.a.slice(0, 2000), kind: "own", due: null, s: null, added: todayKey() }); n++; } });
      save(); a.disabled = true; a.textContent = n ? `${n} flashcards added` : "Already added"; toast(n ? `${n} flashcards added. They show up in your next review.` : "These are already in your flashcards."); return;
    }
    case "ai-keysave": {
      const v = ($("#ai-key")?.value || "").trim();
      if (!/^sk-ant-/.test(v) || v.length < 30) { const m = $("#aiSetMsg"); if (m) m.textContent = "That doesn't look like an Anthropic API key. It starts with sk-ant-."; return; }
      try { localStorage.setItem(AI_KEY, v); } catch (e) { toast("Couldn't save the key on this device."); return; }
      AIC = null; a.disabled = true; const ok = await aiTest();
      if (ok) { rerender(); toast("Online AI is on. Topics and diagrams now have an Explain button."); } else { try { localStorage.removeItem(AI_KEY); } catch (e) { } a.disabled = false; }
      return;
    }
    case "ai-test": aiTest(); return;
    case "ai-forget": {
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to remove"; setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Remove the key"; } }, 3500); return; }
      try { localStorage.removeItem(AI_KEY); } catch (e) { } AIC = null; rerender(); toast("The key is removed from this device."); return;
    }
  }
}
