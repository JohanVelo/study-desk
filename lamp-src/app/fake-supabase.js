// Test double for supabase-js: one shared in-browser "server" (localStorage + BroadcastChannel) with the same rules as schema.sql.
window.supabase = { createClient() {
  const K = "fake-sb", bc = new BroadcastChannel("fake-sb");
  const load = () => JSON.parse(localStorage.getItem(K) || '{"users":{},"members":{},"docs":{},"config":{"join_code":"GRACE7"}}');
  const save = d => localStorage.setItem(K, JSON.stringify(d));
  let session = JSON.parse(sessionStorage.getItem("fake-session") || "null");
  const uid = () => session?.user?.id;
  const isMember = d => !!d.members[uid()], isLeader = d => d.members[uid()]?.role === "leader";
  const canRead = (d, p) => p.startsWith("data/users/") ? p.split("/")[2] === uid() : isMember(d);
  const canWrite = (d, p) => p.startsWith("data/users/") ? p.split("/")[2] === uid() : /^(gm|lv)\/[^/]+$/.test(p) ? p.split("/")[1] === uid() && isMember(d) : p === "group/meta" ? isLeader(d) : ["group/ice", "live/game"].includes(p) ? isMember(d) : false;
  const merge = (a, b) => (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, k in a && k in b ? merge(a[k], b[k]) : k in b ? b[k] : a[k]])) : b;
  const listeners = [];
  const emit = (table, eventType, row, old) => { const m = { table, eventType, new: row, old }; bc.postMessage(m); deliver(m); };
  const deliver = m => listeners.forEach(l => { if (l.table !== m.table) return; if (m.table === "lamp_docs") { const p = (m.new || m.old).path; if (!canRead(load(), p)) return; } l.cb(m); });
  bc.onmessage = e => deliver(e.data);
  const authL = [];
  const ok = data => ({ data, error: null }), bad = message => ({ data: null, error: { message } });
  const delay = v => new Promise(r => setTimeout(() => r(v), 30));
  function q(table) {
    let filt = null, mode = "select", payload = null, single = false;
    const run = () => {
      const d = load();
      if (table === "lamp_docs") {
        if (mode === "select") { let rows = Object.entries(d.docs).filter(([p]) => canRead(d, p)).map(([path, data]) => ({ path, data, col: path.replace(/\/[^/]+$/, "") })); if (filt) rows = rows.filter(r => r[filt[0]] === filt[1]); return single ? ok(rows[0] || null) : ok(rows); }
        if (mode === "upsert") { if (!uid() || !canWrite(d, payload.path)) return bad("new row violates row-level security policy"); d.docs[payload.path] = payload.data; save(d); emit("lamp_docs", "UPDATE", { path: payload.path, data: payload.data }); return ok(null); }
        if (mode === "delete") { const p = filt[1]; if (!canWrite(d, p)) return ok(null); delete d.docs[p]; save(d); emit("lamp_docs", "DELETE", null, { path: p }); return ok(null); }
      }
      if (table === "lamp_members") {
        if (mode === "select") { let rows = Object.values(d.members).filter(() => isMember(d) || true).filter(m => isMember(d) || m.user_id === uid()); if (filt) rows = rows.filter(r => r[filt[0]] === filt[1]); return single ? ok(rows[0] || null) : ok(rows); }
        if (mode === "update") { const m = d.members[filt[1]]; if (!m || filt[1] !== uid()) return bad("row-level security"); Object.assign(m, payload, { role: m.role }); save(d); emit("lamp_members", "UPDATE", m); return ok(null); }
      }
      return bad("unsupported");
    };
    const api = {
      select() { mode = mode === "select" ? "select" : mode; return api; }, eq(c, v) { filt = [c, v]; return api; }, maybeSingle() { single = true; return api; },
      upsert(row) { mode = "upsert"; payload = row; return api; }, update(row) { mode = "update"; payload = row; return api; }, delete() { mode = "delete"; return api; },
      then(res, rej) { return delay(run()).then(res, rej); }
    };
    return api;
  }
  return {
    from: q,
    async rpc(name, a) {
      await delay(); const d = load(); if (!uid()) return bad("not_signed_in");
      if (name === "lamp_join") { if (d.members[uid()]) return ok(d.members[uid()].role); if (String(a.code).trim().toUpperCase() !== d.config.join_code) return bad("wrong_code"); const role = Object.values(d.members).some(m => m.role === "leader") ? "member" : "leader"; d.members[uid()] = { user_id: uid(), name: a.display_name, color: ["#3B5BBA", "#B5523B", "#2E7D57", "#6B4FA0"][Object.keys(d.members).length % 4], role }; save(d); emit("lamp_members", "INSERT", d.members[uid()]); return ok(role); }
      if (name === "lamp_update") { if (!(a.p in d.docs) || !canWrite(d, a.p)) return bad("not_found"); d.docs[a.p] = merge(d.docs[a.p], a.patch); save(d); emit("lamp_docs", "UPDATE", { path: a.p, data: d.docs[a.p] }); return ok(d.docs[a.p]); }
      if (name === "lamp_get_code") return ok(isLeader(d) ? d.config.join_code : null);
      if (name === "lamp_new_code") { if (!isLeader(d)) return bad("permission_denied"); d.config.join_code = "HOPE" + Math.floor(Math.random() * 900 + 100); save(d); return ok(d.config.join_code); }
      return bad("unknown rpc");
    },
    channel() { const ch = { on(_t, f, cb) { listeners.push({ table: f.table, cb }); return ch; }, subscribe() { return ch; } }; return ch; },
    auth: {
      async getSession() { await delay(); return ok({ session }); },
      onAuthStateChange(cb) { authL.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      async signUp({ email, password, options }) { await delay(); const d = load(); if (Object.values(d.users).some(u => u.email === email)) return bad("User already registered"); const id = "u" + Math.random().toString(16).slice(2, 10) + "-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12); d.users[id] = { id, email, password }; save(d); if (window.__fakeConfirm) return ok({ session: null, user: { id, email } }); session = { user: { id, email } }; sessionStorage.setItem("fake-session", JSON.stringify(session)); return ok({ session, user: session.user }); },
      async signInWithPassword({ email, password }) { await delay(); const u = Object.values(load().users).find(u => u.email === email && u.password === password); if (!u) return bad("Invalid login credentials"); session = { user: { id: u.id, email } }; sessionStorage.setItem("fake-session", JSON.stringify(session)); return ok({ session, user: session.user }); },
      async signOut() { session = null; sessionStorage.removeItem("fake-session"); return ok(null); },
      async resetPasswordForEmail() { await delay(); return ok({}); },
      async updateUser() { await delay(); return ok({ user: session?.user }); }
    }
  };
} };
