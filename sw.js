/* Study Desk service worker: the app shell is cached so it opens offline.
   Bump VERSION on every release so phones pick up the new files. */
const VERSION = "study-desk-4.6.0";
/* caches that survive app updates: big libraries, the text reader, voices and speech models */
const KEEP = ["study-desk-ocr-7", "study-desk-libs-1", "study-desk-models", "transformers-cache"];
const SHELL = [
  "./", "index.html", "styles.css", "data.js", "summary.js", "app.js", "tools.js", "extras.js", "speech.js", "more.js", "read.js", "voice-worker.js", "stt-worker.js", "embed-worker.js", "vendor/fsrs.umd.js", "vendor/minisearch.umd.js", "manifest.webmanifest",
  "vendor/gsap.min.js", "vendor/Flip.min.js", "vendor/SplitText.min.js", "vendor/confetti.min.js", "vendor/jszip.min.js", "vendor/register.js",
  "fonts/bricolage.woff2", "fonts/atkinson-400.woff2", "fonts/atkinson-700.woff2", "fonts/jbmono-500.woff2", "fonts/jbmono-700.woff2",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VERSION + "-fonts" && !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes("/vendor/ocr/")) {
    /* the text reader is large: keep it in its own cache that survives app updates */
    e.respondWith(caches.open("study-desk-ocr-7").then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  const keep = (name) => e.respondWith(caches.open(name).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()).catch(() => { }); return r; }))));
  if (url.origin === location.origin && url.pathname.includes("/vendor/x/")) { keep("study-desk-libs-1"); return; }
  if (url.origin === location.origin && url.pathname.includes("/vendor/ai/")) { keep("study-desk-models"); return; }
  /* natural voices (Piper) download once from Hugging Face; the speech-to-text model is cached by transformers.js itself */
  if (url.hostname === "huggingface.co" && url.pathname.startsWith("/diffusionstudio/piper-voices/")) { keep("study-desk-models"); return; }
  /* the speech-to-text library and its runtime come from a CDN the first time, then work offline */
  if (url.hostname === "cdn.jsdelivr.net" && /transformers|onnxruntime/.test(url.pathname)) { keep("study-desk-models"); return; }
  if (url.origin === location.origin) {
    /* pages: network first so updates arrive, cache when offline */
    if (req.mode === "navigate") {
      e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put("index.html", c)); return r; }).catch(() => caches.match("index.html")));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })));
    return;
  }
  /* Google Fonts: serve cached copy, refresh in the background */
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION + "-fonts").then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
