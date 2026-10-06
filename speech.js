/* =====================================================================
   Study Desk speech: natural podcast voices (Piper) and lecture
   recordings to text (Moonshine). Both run on the device, in workers.
   The voice and speech models download once when Megan asks for them,
   then work offline.
   ===================================================================== */
"use strict";
const fmtMB = b => b >= 1e6 ? Math.round(b / 1e6) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
function workerCall(w, msg, onProgress) {
  return new Promise((res, rej) => {
    const id = Math.random().toString(36).slice(2);
    const fn = e => {
      const d = e.data || {};
      if (d.op === "progress") { onProgress && onProgress(d); return; }
      if (d.id !== id) return;
      w.removeEventListener("message", fn);
      d.ok ? res(d) : rej(new Error(d.err || "failed"));
    };
    w.addEventListener("message", fn); w.postMessage({ ...msg, id });
  });
}

/* ---------- natural voices (Piper) ---------- */
const NV_VOICES = [
  ["en_GB-alba-medium", "Alba", "Scottish woman, warm and clear"],
  ["en_GB-cori-medium", "Cori", "English woman, bright"],
  ["en_GB-northern_english_male-medium", "Owen", "Northern English man, calm"],
  ["en_US-hfc_female-medium", "Hailey", "American woman, friendly"],
  ["en_US-lessac-medium", "Lessac", "American woman, newsreader style"],
  ["en_GB-alan-low", "Alan", "English man, smaller download"]
];
const NV = {
  id: (() => { try { return localStorage.getItem("studydesk.nvoice") || ""; } catch (e) { return ""; } })(),
  ready: (() => { try { return localStorage.getItem("studydesk.nvoice.ok") || ""; } catch (e) { return ""; } })(),
  state: "idle", pct: 0, err: "", failed: false, w: null, cache: new Map(), audio: null, token: 0, pick: null,
  worker() { if (!this.w) this.w = new Worker("voice-worker.js", { type: "module" }); return this.w; },
  on() { return !!this.id && this.ready === this.id && this.state !== "error"; },
  unlock() {
    /* Safari only lets audio play straight after a tap, so start the shared player now with a moment of silence */
    if (!this.audio) { this.audio = new Audio(); this.audio.preload = "auto"; }
    try { this.audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="; this.audio.play().catch(() => { }); } catch (e) { }
  },
  synth(text) {
    const k = this.id + "|" + text;
    if (this.cache.has(k)) return this.cache.get(k);
    const p = workerCall(this.worker(), { op: "speak", voice: this.id, text }).then(d => d.blob);
    p.catch(() => this.cache.delete(k));
    this.cache.set(k, p);
    if (this.cache.size > 30) this.cache.delete(this.cache.keys().next().value);
    return p;
  },
  prefetch(segs, i) { let n = 0; for (let j = i + 1; j < segs.length && n < 2; j++) if (segs[j].kind !== "pause" && segs[j].text) { this.synth(segs[j].text); n++; } },
  async speak(text, rate, onend, onerr) {
    const my = ++this.token;
    if (!this.audio) this.unlock();
    try {
      const blob = await this.synth(text);
      if (my !== this.token) return;
      const a = this.audio, url = URL.createObjectURL(blob);
      a.onended = () => { URL.revokeObjectURL(url); if (my === this.token) onend(); };
      a.onerror = () => { URL.revokeObjectURL(url); if (my === this.token) onerr(); };
      a.src = url; a.playbackRate = rate; a.preservesPitch = true;
      await a.play();
    } catch (e) { if (my === this.token) { console.error(e); onerr(e); } }
  },
  stop() { this.token++; try { this.audio && this.audio.pause(); } catch (e) { } },
  async choose(id) {
    this.stop(); this.cache.clear();
    if (!id) { this.id = ""; try { localStorage.setItem("studydesk.nvoice", ""); } catch (e) { } drawVoiceCard(); return; }
    this.pick = id; this.failed = false; this.state = "loading"; this.pct = 0; this.err = ""; drawVoiceCard();
    try {
      await workerCall(this.worker(), { op: "load", voice: id }, d => { if (d.total) { this.pct = d.loaded / d.total; this.total = d.total; drawVoiceProgress(); } });
      this.id = id; this.ready = id; this.state = "idle";
      try { localStorage.setItem("studydesk.nvoice", id); localStorage.setItem("studydesk.nvoice.ok", id); } catch (e) { }
      drawVoiceCard(); toast("Voice ready. Podcasts now use " + NV_VOICES.find(v => v[0] === id)[1] + ".");
    } catch (e) {
      console.error(e); this.state = "error";
      this.err = navigator.onLine === false ? "You're offline. Connect to the internet once to download the voice." : "The voice couldn't be downloaded. Check the connection and try again.";
      drawVoiceCard();
    }
  },
  async sample() {
    if (!this.on()) return;
    playerStop && playerStop(); this.unlock();
    const name = NV_VOICES.find(v => v[0] === this.id)[1];
    this.speak(`Hi, I'm ${name}. I'll read your summaries and podcasts from now on.`, P_.rate || 1, () => { }, () => toast("Couldn't play the sample."));
  },
  async remove() {
    this.stop(); this.cache.clear();
    try { await caches.delete("study-desk-models"); } catch (e) { }
    try { const root = await navigator.storage.getDirectory(); await root.removeEntry("piper", { recursive: true }); } catch (e) { }
    this.id = ""; this.ready = ""; this.state = "idle";
    try { localStorage.removeItem("studydesk.nvoice"); localStorage.removeItem("studydesk.nvoice.ok"); } catch (e) { }
    if (this.w) { this.w.terminate(); this.w = null; }
    drawVoiceCard(); toast("Downloaded voices removed. Podcasts use the device voice.");
  }
};
function voiceCardHTML() {
  const sel = NV.state === "loading" ? NV.pick : NV.id;
  const row = (id, name, desc) => `<button class="vrow" role="radio" aria-checked="${sel === id}" data-action="nv-pick" data-v="${id}" ${NV.state === "loading" ? "disabled" : ""}><span class="vdot"></span><span class="grow"><b>${name}</b><span class="tiny muted">${desc}</span></span>${id && NV.ready === id ? `<span class="tiny ok-t">${ico("check")}Ready</span>` : ""}</button>`;
  return `<p class="small muted">Natural voices sound like a real person and work offline. Each one is a one-time download of about 60 MB (Alan about 20 MB), plus 30 MB of shared speech files.</p>
    <div class="vlist" role="radiogroup" aria-label="Podcast voice">${row("", "Device voice", "Built in, no download")}${NV_VOICES.map(v => row(...v)).join("")}</div>
    <div id="voiceStatus">${voiceStatusHTML()}</div>`;
}
function voiceStatusHTML() {
  if (NV.state === "loading") return `<div class="dl"><div class="dl-top"><span class="small">Downloading ${esc(NV_VOICES.find(v => v[0] === NV.pick)[1])}…</span><span class="tiny mono" id="nvPct">${NV.pct ? Math.round(NV.pct * 100) + "%" : ""}</span></div><div class="dlbar"><i id="nvBar" style="width:${Math.round(NV.pct * 100)}%"></i></div><p class="tiny muted">Keep Study Desk open. Wi-Fi is best.</p></div>`;
  if (NV.state === "error") return `<p class="small warn-t" role="alert">${esc(NV.err)}</p>`;
  if (NV.on()) return `<div class="row" style="flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-action="nv-sample">${ico("play")}Play a sample</button><button class="btn btn-line btn-sm" data-action="nv-remove">Remove downloaded voices</button></div>`;
  return "";
}
function drawVoiceCard() { const el = $("#voiceCard"); if (el) el.innerHTML = voiceCardHTML(); }
function drawVoiceProgress() { const b = $("#nvBar"), t = $("#nvPct"); if (b) b.style.width = Math.round(NV.pct * 100) + "%"; if (t) t.textContent = Math.round(NV.pct * 100) + "%"; }

/* ---------- lecture recordings to text (Moonshine) ---------- */
const STT = { w: null, busy: null, device: null, pct: 0, phase: "", stop: false };
const isPhone = () => matchMedia("(max-width: 700px), (pointer: coarse)").matches && !/Macintosh|Windows/.test(navigator.userAgent);
async function sttDevice() {
  if (STT.device) return STT.device;
  try { if (navigator.gpu && await navigator.gpu.requestAdapter()) return (STT.device = "webgpu"); } catch (e) { }
  return (STT.device = "wasm");
}
/* split 16 kHz audio into ~20 s pieces, cutting in the quietest moment so words aren't chopped */
function sttChunks(pcm, rate = 16000) {
  const out = [], frame = rate / 10;
  let start = 0;
  while (start < pcm.length) {
    if (pcm.length - start <= rate * 25) { out.push([start, pcm.length]); break; }
    let best = start + rate * 20, bestE = Infinity;
    for (let f = start + rate * 15; f + frame < start + rate * 25; f += frame) { let e = 0; for (let k = f; k < f + frame; k += 4) e += pcm[k] * pcm[k]; if (e < bestE) { bestE = e; best = f + frame / 2; } }
    out.push([start, Math.floor(best)]); start = Math.floor(best);
  }
  return out;
}
async function decode16k(blob) {
  const buf = await blob.arrayBuffer();
  const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 16000, 16000);
  const ab = await ctx.decodeAudioData(buf);
  if (ab.numberOfChannels === 1) return ab.getChannelData(0);
  const a = ab.getChannelData(0), b = ab.getChannelData(1), m = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) m[i] = (a[i] + b[i]) / 2;
  return m;
}
const sttLimitMin = () => isPhone() ? 45 : 180;
async function transcribeRec(id) {
  if (STT.busy) { toast("Already turning a recording into text. One at a time."); return; }
  const r = await IDB.get("audio", id); if (!r || !r.blob) { toast("This recording's audio isn't on this device."); return; }
  if (typeof Worker === "undefined") { toast("This browser can't do that. Try Chrome, Edge or Safari."); return; }
  STT.busy = id; STT.stop = false; STT.pct = 0; STT.phase = "Getting ready…"; drawStt();
  keepAwake(true);
  try {
    const device = await sttDevice();
    if (!STT.w) STT.w = new Worker("stt-worker.js", { type: "module" });
    STT.phase = "Downloading the speech model (once)…"; drawStt();
    await workerCall(STT.w, { op: "load", device }, d => { if (d.total) { STT.pct = d.loaded / d.total; STT.phase = `Downloading the speech model (once): ${fmtMB(d.loaded)} of ${fmtMB(d.total)}`; drawStt(); } });
    STT.phase = "Reading the audio…"; STT.pct = 0; drawStt();
    const pcm = await decode16k(r.blob), mins = pcm.length / 16000 / 60;
    if (mins > sttLimitMin()) throw Object.assign(new Error("long"), { mins });
    const parts = sttChunks(pcm);
    let i = r.sttPos && r.sttDraft ? r.sttPos : 0, text = i ? r.sttDraft : "";
    const t0 = Date.now(), i0 = i;
    for (; i < parts.length; i++) {
      if (STT.stop) break;
      const [a, b] = parts[i];
      const d = await workerCall(STT.w, { op: "text", device, audio: pcm.slice(a, b) });
      if (d.text) text += (text ? " " : "") + d.text;
      STT.pct = (i + 1) / parts.length;
      const per = (Date.now() - t0) / (i + 1 - i0), left = Math.round(per * (parts.length - i - 1) / 60000);
      STT.phase = `Writing the transcript: ${Math.round(STT.pct * 100)}%${i + 1 - i0 >= 2 ? (left >= 1 ? `, about ${left} min left` : ", almost done") : ""}`; STT.live = text; drawStt();
      if (i % 6 === 5) { const cur = await IDB.get("audio", id); if (cur) { cur.sttDraft = text; cur.sttPos = i + 1; await IDB.put("audio", cur); } }
    }
    const cur = await IDB.get("audio", id); if (!cur) return;
    if (i < parts.length) { cur.sttDraft = text; cur.sttPos = i; await IDB.put("audio", cur); toast("Paused. Choose Turn into text again to carry on where it stopped."); }
    else {
      const clean = tidyTranscript(text);
      /* running it again replaces the previous written-out transcript, it never doubles up */
      const mine = cur.transcript ? cur.transcript.split("## Transcript")[0].trim() : "";
      cur.transcript = mine ? mine + "\n\n## Transcript\n" + clean : clean; cur.sttDone = true; delete cur.sttDraft; delete cur.sttPos;
      await IDB.put("audio", cur); const m = RECS.find(x => x.id === id); if (m) m.transcript = cur.transcript;
      toast(clean ? "Transcript ready. The summary is below." : "No speech was found in this recording.");
    }
  } catch (e) {
    console.error(e);
    toast(e.message === "long" ? `This recording is ${Math.round(e.mins)} minutes. ${isPhone() ? "On a phone, recordings up to 45 minutes work. Open it on the laptop instead." : "Recordings up to 3 hours work."}` : navigator.onLine === false ? "You're offline. The speech model needs the internet once to download." : "Couldn't turn this recording into text on this device.");
  } finally {
    STT.busy = null; STT.live = ""; keepAwake(false);
    if ($(".scrim") && $("#stt-status")) openRecSheet(id); else drawStt();
  }
}
/* Moonshine writes plain sentences; add paragraph breaks every few sentences so the summary can find structure */
function tidyTranscript(t) {
  const s = String(t).replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  const out = []; for (let i = 0; i < s.length; i += 5) out.push(s.slice(i, i + 5).join(" "));
  return out.join("\n\n");
}
function sttHTML(r) {
  if (STT.busy === r.id) return `<div class="dl" id="stt-status" role="status"><div class="dl-top"><span class="small">${esc(STT.phase)}</span></div><div class="dlbar"><i style="width:${Math.round(STT.pct * 100)}%"></i></div>${STT.live ? `<p class="tiny muted stt-live">…${esc(STT.live.slice(-160))}</p>` : ""}<button class="btn btn-line btn-sm" data-action="stt-stop" style="align-self:flex-start">Pause</button></div>`;
  const resume = r.sttPos ? " (carry on)" : r.sttDone ? " again" : "";
  return `<div id="stt-status" class="stack" style="gap:6px"><button class="btn btn-soft" data-action="stt-go" data-id="${r.id}" ${STT.busy ? "disabled" : ""} style="align-self:flex-start">${ico("notes")}Turn into text${resume}</button>
    <p class="tiny muted">Writes out what was said, on this device. The first time it downloads a speech model (60–250 MB depending on the device). Keep the app open while it works. ${isPhone() ? "Up to 45 minutes on a phone." : "Up to 3 hours on a laptop."}</p></div>`;
}
function drawStt() { const el = $("#stt-status"); if (!el) return; const r = RECS.find(x => x.id === (STT.busy || el.querySelector("[data-id]")?.dataset.id)); if (r) el.outerHTML = sttHTML(r); }

/* ---------- actions ---------- */
const SP_ACTS = new Set(["nv-pick", "nv-sample", "nv-remove", "stt-go", "stt-stop"]);
function spAction(act, a) {
  switch (act) {
    case "nv-pick": { const v = a.dataset.v; if (!v) { NV.choose(""); return; } if (NV.ready === v) { NV.id = v; try { localStorage.setItem("studydesk.nvoice", v); } catch (e) { } drawVoiceCard(); NV.unlock(); NV.sample(); return; } NV.choose(v); return; }
    case "nv-sample": NV.unlock(); NV.sample(); return;
    case "nv-remove": if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to remove"; return; } NV.remove(); return;
    case "stt-go": transcribeRec(a.dataset.id); return;
    case "stt-stop": STT.stop = true; STT.phase = "Pausing after this part…"; drawStt(); return;
  }
}
