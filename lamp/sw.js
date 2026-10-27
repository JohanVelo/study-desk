/* Lamp offline support: the app opens without a connection, and Bible text you've read stays available. */
const V = "lamp-20261027211419";
const DATA = "lamp-data-v1"; // Bible text, art and word data never change, so they survive app updates
// people and places are rebuilt now and then, so they live in the per-build cache, never the long-lived one
const FRESH = /\/bib\/(people|places)\.json$/;
const SHELL = ["./", "index.html", "app.js", "app.css", "supabase.js", "manifest.webmanifest", "bible.json", "tests.json", "geo.json", "fun/bank.json", "icons/icon-192.png"];
// this month's and next month's "A word for today", so an update while offline never leaves it blank
const devo = () => { const m = new Date().getMonth(); return [m, (m + 1) % 12].map(x => `fun/me/${String(x + 1).padStart(2, "0")}.json`); };
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).then(() => c.addAll(devo()).catch(() => {}))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== DATA).map(k => caches.delete(k)))).then(() => caches.open(DATA)).then(c => c.keys().then(rs => Promise.all(rs.filter(r => FRESH.test(new URL(r.url).pathname)).map(r => c.delete(r))))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const page = e.request.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("index.html");
  if (page) { e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put("index.html", c)); return r; }).catch(() => caches.match("index.html"))); return; }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok && /\/(bib|art|icons|orig|sat|por|img|fun)\/|\.json$|\.js$|\.css$/.test(u.pathname)) { const c = r.clone(); caches.open(!FRESH.test(u.pathname) && /\/(bib|orig|sat|por|img)\/|\/art\/.*\.jpg$/.test(u.pathname) ? DATA : V).then(x => x.put(e.request, c)); } return r; })));
});
