/* Lamp app shell: Supabase sign-in, then the same claude.use("db" | "user") API the page already speaks. */
(() => {
  const CFG = window.LAMP_CONFIG || {};
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5c1.8 2.2 2.6 3.8 2.6 5.2a2.6 2.6 0 1 1-5.2 0c0-1.4.8-3 2.6-5.2Z" fill="currentColor" fill-opacity=".3"/><path d="M4 14h16l-2.2 4.2a3 3 0 0 1-2.7 1.6H8.9a3 3 0 0 1-2.7-1.6L4 14Z"/><path d="M12 10.5V14"/><path d="M20 14c1.4 0 2-.8 2-1.6S21.4 11 20.5 11"/></svg>';
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

  const sb = window.supabase && CFG.url ? window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "lamp-auth" } }) : null;

  /* ---------- the db/user API on top of Supabase ---------- */
  let ME = null, MEMBER = null;
  const cache = new Map(), members = new Map();
  const docL = new Map(), colL = new Map();
  const colOf = p => p.replace(/\/[^/]+$/, "");
  const snapDoc = p => ({ id: p.split("/").pop(), exists: cache.has(p), data: () => cache.has(p) ? structuredClone(cache.get(p)) : undefined, metadata: {} });
  const snapCol = c => { const docs = [...cache.keys()].filter(k => colOf(k) === c && k !== c).map(snapDoc); return { docs, size: docs.length, empty: !docs.length, metadata: {}, docChanges: () => [] }; };
  const fire = p => { (docL.get(p) || []).forEach(f => f(snapDoc(p))); const c = colOf(p); (colL.get(c) || []).forEach(f => f(snapCol(c))); };
  const put = (p, d) => { if (d === undefined) cache.delete(p); else cache.set(p, d); fire(p); };
  const err = (e, fallback) => { const m = String(e?.message || e || ""); const code = /not_found/.test(m) ? "not_found" : /permission|row-level|42501|denied/i.test(m) || e?.code === "42501" ? "permission_denied" : /fetch|network/i.test(m) ? "unavailable" : fallback || "internal"; return Object.assign(new Error(m || code), { code }); };
  const merge = (a, b) => { if (!a || typeof a !== "object" || Array.isArray(a) || !b || typeof b !== "object" || Array.isArray(b)) return b; const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = k in o ? merge(o[k], v) : v; return o; };
  const clean = d => JSON.parse(JSON.stringify(d));

  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      async get() { const { data, error } = await sb.from("lamp_docs").select("data").eq("path", path).maybeSingle(); if (error) throw err(error); if (data) cache.set(path, data.data); else cache.delete(path); return snapDoc(path); },
      async set(d) { const body = clean(d); const { error } = await sb.from("lamp_docs").upsert({ path, data: body, updated_at: new Date().toISOString() }); if (error) throw err(error); put(path, body); },
      async update(patch) { const { data, error } = await sb.rpc("lamp_update", { p: path, patch: clean(patch) }); if (error) throw err(error); put(path, data); },
      async delete() { const { error } = await sb.from("lamp_docs").delete().eq("path", path); if (error) throw err(error); put(path, undefined); },
      onSnapshot(next) { const a = docL.get(path) || []; a.push(next); docL.set(path, a); setTimeout(() => next(snapDoc(path)), 0); return () => docL.set(path, (docL.get(path) || []).filter(f => f !== next)); },
      collection: c => colRef(path + "/" + c)
    };
  }
  function colRef(path) {
    return {
      path,
      doc: id => docRef(path + "/" + (id || crypto.randomUUID().replace(/-/g, "").slice(0, 20))),
      async get() { const { data, error } = await sb.from("lamp_docs").select("path,data").eq("col", path); if (error) throw err(error); data.forEach(r => cache.set(r.path, r.data)); return snapCol(path); },
      onSnapshot(next) { const a = colL.get(path) || []; a.push(next); colL.set(path, a); setTimeout(() => next(snapCol(path)), 0); return () => colL.set(path, (colL.get(path) || []).filter(f => f !== next)); }
    };
  }
  const db = { doc: docRef, collection: colRef };
  const prof = id => { const m = members.get(id); return { id, name: m?.name || "", avatarUrl: "", color: m?.color || "#8A8F98", isMe: id === ME?.id, guest: false }; };
  const user = {
    async id() { return ME?.id || null; },
    async me() { const p = prof(ME.id); return { ...p, isOwner: MEMBER?.role === "leader", canEdit: MEMBER?.role === "leader" }; },
    async isOwner() { return MEMBER?.role === "leader"; },
    async canEdit() { return MEMBER?.role === "leader"; },
    async can() { return !!MEMBER; },
    async profiles(ids) { return Object.fromEntries([].concat(ids || []).map(id => [id, prof(id)])); },
    async search(q) { q = String(q || "").toLowerCase(); return [...members.values()].filter(m => m.name.toLowerCase().includes(q)).map(m => ({ id: m.user_id, name: m.name })); }
  };

  async function loadAll() {
    const [{ data: docs, error: e1 }, { data: mem, error: e2 }] = await Promise.all([sb.from("lamp_docs").select("path,data"), sb.from("lamp_members").select("user_id,name,color,role")]);
    if (e1 || e2) throw err(e1 || e2);
    docs.forEach(r => cache.set(r.path, r.data));
    mem.forEach(m => members.set(m.user_id, m));
    MEMBER = members.get(ME.id) || null;
    sb.channel("lamp-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lamp_docs" }, ev => {
        if (ev.eventType === "DELETE") { if (ev.old?.path) put(ev.old.path, undefined); return; }
        const r = ev.new; if (!r?.path) return;
        const was = cache.get(r.path); if (JSON.stringify(was) !== JSON.stringify(r.data)) put(r.path, r.data);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lamp_members" }, ev => {
        if (ev.eventType === "DELETE") members.delete(ev.old?.user_id); else if (ev.new?.user_id) members.set(ev.new.user_id, ev.new);
        const ids = [...cache.keys()].filter(k => colOf(k) === "gm"); if (ids[0]) fire(ids[0]);
      })
      .subscribe();
    // catch up after the phone wakes the app from the background
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await sb.from("lamp_docs").select("path,data"); if (!data) return;
      const seen = new Set(data.map(r => r.path));
      data.forEach(r => { if (JSON.stringify(cache.get(r.path)) !== JSON.stringify(r.data)) put(r.path, r.data); });
      [...cache.keys()].forEach(k => { if (!seen.has(k)) put(k, undefined); });
    });
  }

  /* ---------- claude.use: resolves once the person is in (or chose to just look around) ---------- */
  let resolveReady; const ready = new Promise(r => (resolveReady = r));
  let LOCAL = false;
  window.claude = { use: async name => { await ready; if (LOCAL || !sb) return null; if (name === "db") return db; if (name === "user") return user; return null; } };
  window.LAMP_APP = {
    standalone: true,
    get signedIn() { return !!MEMBER; },
    get name() { return MEMBER?.name || ""; },
    get email() { return ME?.email || ""; },
    async signOut() { try { await sb?.auth.signOut(); } catch (e) {} localStorage.removeItem("lamp-local"); location.reload(); },
    async rename(n) { n = String(n || "").trim().slice(0, 40); if (!n || !MEMBER) return false; const { error } = await sb.from("lamp_members").update({ name: n }).eq("user_id", ME.id); if (error) return false; MEMBER.name = n; members.set(ME.id, MEMBER); return true; },
    signIn() { localStorage.removeItem("lamp-local"); location.reload(); },
    async code() { if (MEMBER?.role !== "leader") return ""; const { data } = await sb.rpc("lamp_get_code"); return data || ""; },
    async newCode() { const { data, error } = await sb.rpc("lamp_new_code"); if (error) throw error; return data; }
  };

  /* ---------- the welcome gate ---------- */
  const gate = document.createElement("div");
  gate.id = "gate"; gate.setAttribute("role", "dialog"); gate.setAttribute("aria-modal", "true"); gate.setAttribute("aria-labelledby", "gH");
  const pend = () => { try { return JSON.parse(localStorage.getItem("lamp-pending") || "{}"); } catch (e) { return {}; } };
  const field = (id, label, type, ac, extra = "") => `<label class="gf"><span>${label}</span><div class="gin"><input id="${id}" type="${type}" autocomplete="${ac}" ${extra}>${type === "password" ? `<button type="button" class="geye" data-eye="${id}" aria-label="Show password">${EYE}</button>` : ""}</div></label>`;
  const views = {
    loading: () => `<div class="gspin" aria-label="Loading"></div>`,
    join: () => `<h1 id="gH">Join your Bible study</h1><p class="gsub">Make your account once. Lamp keeps you signed in after that.</p>
      <form id="gForm" novalidate>${field("gName", "Your first name", "text", "given-name", 'maxlength="40" required')}${field("gEmail", "Email", "email", "email", 'required inputmode="email"')}${field("gPass", "Choose a password", "password", "new-password", 'minlength="6" required')}${field("gCode", "Group code", "text", "off", 'required autocapitalize="characters" spellcheck="false"')}
      <p class="gerr" id="gErr" role="alert"></p><button class="gbtn" id="gGo">Create my account</button></form>
      <p class="galt">Already have an account? <button class="glink" data-to="signin">Sign in</button></p>`,
    signin: () => `<h1 id="gH">Welcome back</h1><p class="gsub">Sign in once on this phone and you're set.</p>
      <form id="gForm" novalidate>${field("gEmail", "Email", "email", "email", 'required inputmode="email"')}${field("gPass", "Password", "password", "current-password", "required")}
      <p class="gerr" id="gErr" role="alert"></p><button class="gbtn" id="gGo">Sign in</button></form>
      <p class="galt"><button class="glink" data-to="forgot">Forgot your password?</button></p><p class="galt">New here? <button class="glink" data-to="join">Make an account</button></p>`,
    forgot: () => `<h1 id="gH">Reset your password</h1><p class="gsub">We'll email you a link to choose a new one.</p>
      <form id="gForm" novalidate>${field("gEmail", "Email", "email", "email", 'required inputmode="email"')}<p class="gerr" id="gErr" role="alert"></p><button class="gbtn" id="gGo">Send the link</button></form>
      <p class="galt"><button class="glink" data-to="signin">Back to sign in</button></p>`,
    newpass: () => `<h1 id="gH">Choose a new password</h1><p class="gsub">Then you're straight back in.</p>
      <form id="gForm" novalidate>${field("gPass", "New password", "password", "new-password", 'minlength="6" required')}<p class="gerr" id="gErr" role="alert"></p><button class="gbtn" id="gGo">Save and continue</button></form>`,
    code: () => `<h1 id="gH">One last step</h1><p class="gsub">Enter the group code your leader sent, so you join the right group.</p>
      <form id="gForm" novalidate>${field("gName", "Your first name", "text", "given-name", `maxlength="40" required value="${esc(pend().name || "")}"`)}${field("gCode", "Group code", "text", "off", `required autocapitalize="characters" spellcheck="false" value="${esc(pend().code || "")}"`)}
      <p class="gerr" id="gErr" role="alert"></p><button class="gbtn" id="gGo">Join the group</button></form>
      <p class="galt"><button class="glink" id="gOut">Use a different account</button></p>`,
    check: () => `<div class="gbig">📬</div><h1 id="gH">Check your email</h1><p class="gsub">We sent a link to <b>${esc(pend().email || "your email")}</b>. Tap it to confirm your account, then come back here and sign in.</p>
      <button class="gbtn" data-to="signin">I've confirmed, sign me in</button>`,
    sent: () => `<div class="gbig">✉️</div><h1 id="gH">Link sent</h1><p class="gsub">Open the email on this phone and tap the link to choose a new password.</p><button class="gbtn" data-to="signin">Back to sign in</button>`,
    offline: () => `<h1 id="gH">Can't reach Lamp</h1><p class="gsub">Check your internet connection and try again.</p><button class="gbtn" id="gRetry">Try again</button><p class="galt"><button class="glink" id="gOff">Read offline for now</button></p>`
  };
  let cur = "loading";
  function show(v, msg) {
    cur = v;
    const card = $("#gCard"); if (!card) return;
    card.innerHTML = views[v]() + (["join", "signin", "code"].includes(v) ? `<p class="galt gpeek"><button class="glink" id="gPeek">Just look around first</button></p>` : "");
    card.animate?.([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" });
    if (msg) $("#gErr").textContent = msg;
    card.querySelectorAll("[data-to]").forEach(b => b.onclick = e => { e.preventDefault(); show(b.dataset.to); });
    card.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => { const i = $("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; b.classList.toggle("on", i.type === "text"); });
    $("#gPeek")?.addEventListener("click", () => { localStorage.setItem("lamp-local", "1"); finish(true); });
    $("#gOut")?.addEventListener("click", async () => { await sb.auth.signOut(); show("signin"); });
    $("#gRetry")?.addEventListener("click", () => start());
    $("#gOff")?.addEventListener("click", () => finish(true));
    addEventListener("online", () => { if (cur === "offline") start(); }, { once: true });
    const f = $("#gForm"); if (f) { f.onsubmit = e => { e.preventDefault(); submit(v); }; setTimeout(() => f.querySelector("input:not([value]),input[value='']")?.focus({ preventScroll: true }), 350); }
  }
  const val = id => ($("#" + id)?.value || "").trim();
  const busy = on => { const b = $("#gGo"); if (b) { b.disabled = on; b.classList.toggle("busy", on); } };
  const say = m => { const e = $("#gErr"); if (e) e.textContent = m; busy(false); };
  const friendly = e => { const m = String(e?.message || e); return /Invalid login/i.test(m) ? "That email and password don't match. Try again, or reset your password." : /already registered|already been registered/i.test(m) ? "There's already an account with that email. Sign in instead." : /wrong_code/.test(m) ? "That group code isn't right. Check the message from your leader." : /Email not confirmed/i.test(m) ? "Please confirm your email first. Look for the link we sent you." : /rate limit|security purposes/i.test(m) ? "Too many tries just now. Wait a minute and try again." : /fetch|network/i.test(m) ? "No internet connection. Check it and try again." : /Password should/i.test(m) ? "Your password needs at least 6 characters." : m; };
  async function submit(v) {
    busy(true);
    try {
      if (v === "join") {
        const name = val("gName"), email = val("gEmail"), pass = $("#gPass").value, code = val("gCode");
        if (!name) return say("Please add your first name."); if (!/^\S+@\S+\.\S+$/.test(email)) return say("Please check your email address."); if (pass.length < 6) return say("Your password needs at least 6 characters."); if (!code) return say("Please enter the group code from your leader.");
        localStorage.setItem("lamp-pending", JSON.stringify({ name, code, email }));
        const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.origin + location.pathname, data: { name } } });
        if (error) throw error;
        if (!data.session) return show("check");
        return afterAuth(data.session);
      }
      if (v === "signin") {
        const email = val("gEmail"), pass = $("#gPass").value; if (!email || !pass) return say("Please fill in your email and password.");
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) throw error;
        return afterAuth(data.session);
      }
      if (v === "forgot") {
        const email = val("gEmail"); if (!/^\S+@\S+\.\S+$/.test(email)) return say("Please check your email address.");
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw error;
        return show("sent");
      }
      if (v === "newpass") {
        const pass = $("#gPass").value; if (pass.length < 6) return say("Your password needs at least 6 characters.");
        const { data, error } = await sb.auth.updateUser({ password: pass }); if (error) throw error;
        const { data: s } = await sb.auth.getSession(); return afterAuth(s.session);
      }
      if (v === "code") {
        const name = val("gName"), code = val("gCode"); if (!name) return say("Please add your first name."); if (!code) return say("Please enter the group code.");
        const { error } = await sb.rpc("lamp_join", { code, display_name: name }); if (error) throw error;
        localStorage.removeItem("lamp-pending");
        const { data: s } = await sb.auth.getSession(); return afterAuth(s.session);
      }
    } catch (e) { say(friendly(e)); }
  }
  async function afterAuth(session) {
    if (!session) return show("signin");
    ME = { id: session.user.id, email: session.user.email };
    const { data: m, error } = await sb.from("lamp_members").select("user_id,name,color,role").eq("user_id", ME.id).maybeSingle();
    if (error) return show("offline");
    if (!m) {
      const p = pend();
      if (p.code && p.name) { const { error: je } = await sb.rpc("lamp_join", { code: p.code, display_name: p.name }); if (!je) { localStorage.removeItem("lamp-pending"); return afterAuth(session); } return show("code", friendly(je)); }
      return show("code");
    }
    try { await loadAll(); } catch (e) { return show("offline"); }
    localStorage.setItem("lamp-known", "1");
    finish(false);
  }
  function finish(local) {
    LOCAL = local; resolveReady();
    document.documentElement.classList.toggle("lamp-local", local);
    gate.classList.add("out"); setTimeout(() => gate.remove(), 600);
  }
  async function start() {
    if (!sb) { finish(true); return; }
    show("loading");
    const hash = location.hash || "";
    sb.auth.onAuthStateChange((ev, session) => { if (ev === "PASSWORD_RECOVERY") show("newpass"); });
    if (/type=recovery/.test(hash)) { setTimeout(() => cur === "loading" && show("newpass"), 1200); return; }
    const { data, error } = await sb.auth.getSession();
    if (error && /fetch|network/i.test(error.message)) return show("offline");
    if (hash && /access_token|error_description/.test(hash)) history.replaceState(null, "", location.pathname);
    if (data?.session) return afterAuth(data.session);
    if (localStorage.getItem("lamp-local") === "1") return finish(true);
    show(pend().email || localStorage.getItem("lamp-known") ? "signin" : "join");
  }
  gate.innerHTML = `<div class="gglow"></div><div class="gwrap"><div class="gbrand"><span class="glogo">${LOGO}</span><span class="gword">Lamp</span><span class="gtag">A light for your path</span></div><div class="gcard" id="gCard"></div></div>`;
  const mount = () => { document.body.appendChild(gate); start(); };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  // Updates install on their own: check on open, when coming back to the app and every 30 minutes,
  // then swap in the new version at a quiet moment (in the background, just after opening, or after 2 idle minutes).
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) addEventListener("load", async () => {
    const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => null);
    if (!reg) return;
    const t0 = Date.now(); let had = !!navigator.serviceWorker.controller, waiting = false, idle = Date.now();
    const busy = () => document.activeElement?.matches?.("input,textarea,select,[contenteditable]") || document.querySelector(".live-on,[data-live-busy]") || window.LAMP_BUSY?.();
    const swap = () => { if (waiting) { waiting = false; sessionStorage.setItem("lamp-updated", "1"); location.reload(); } };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!had) { had = true; return; }
      waiting = true;
      if ((document.hidden && !busy()) || Date.now() - t0 < 20000) swap();
    });
    const check = () => reg.update().catch(() => {});
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(e => addEventListener(e, () => { idle = Date.now(); }, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", () => { if (document.hidden) { if (!busy()) swap(); } else check(); });
    // ask the phone to keep Lamp's saved data (iPhone can clear website data after 7 days without a visit)
    navigator.storage?.persist?.().catch(() => {});
    setInterval(() => { if (waiting && !busy() && Date.now() - idle > 120000) swap(); }, 15000);
    setInterval(check, 30 * 60000);
    check();
  });
})();
if (sessionStorage.getItem("lamp-updated")) { sessionStorage.removeItem("lamp-updated"); addEventListener("load", () => setTimeout(() => window.toast?.("Lamp just updated itself to the newest version"), 2500)); }
