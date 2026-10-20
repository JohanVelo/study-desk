/* Lamp offline support: the app opens without a connection, and Bible text you've read stays available. */
const V = "lamp-20261020182331";
const SHELL = ["./", "index.html", "app.js", "app.css", "supabase.js", "manifest.webmanifest", "bible.json", "tests.json", "geo.json", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const page = e.request.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("index.html");
  if (page) { e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put("index.html", c)); return r; }).catch(() => caches.match("index.html"))); return; }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok && /\/(bib|art|icons)\/|\.json$|\.js$|\.css$/.test(u.pathname)) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; })));
});
