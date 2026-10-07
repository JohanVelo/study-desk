/* Study Desk v4.11: profiles, part 1 (runs before everything else)
   Several people can share one phone or laptop. Each profile has its own subjects, books, notes,
   flashcards, figures and progress, and nothing is shared between them.
   The first profile keeps the original storage names, so nothing moves for anyone already using the app.
   Every other profile gets its own copy of each "studydesk." key and its own IndexedDB database. */
(function () {
  const REG = "studydesk.profiles", SHARED = /^studydesk\.(profiles|nvoice|nvoice\.ok|smart)$/;
  const SP = Storage.prototype, get = SP.getItem, set = SP.setItem, del = SP.removeItem;
  let reg = null;
  try { reg = JSON.parse(get.call(localStorage, REG) || "null"); } catch (e) { }
  if (!reg || !Array.isArray(reg.list) || !reg.list.length) reg = { list: [{ id: "p0", name: "" }], cur: "p0" };
  if (!reg.list.some(p => p.id === reg.cur)) reg.cur = reg.list[0].id;
  const cur = reg.cur, own = k => typeof k === "string" && k.startsWith("studydesk.") && !SHARED.test(k);
  const keyFor = (id, k) => id === "p0" ? k : "studydesk@" + id + k.slice(9);
  const dbFor = id => id === "p0" ? "studydesk" : "studydesk@" + id;
  if (cur !== "p0") {
    const map = (st, k) => st === localStorage && own(k) ? keyFor(cur, k) : k;
    SP.getItem = function (k) { return get.call(this, map(this, k)); };
    SP.setItem = function (k, v) { return set.call(this, map(this, k), v); };
    SP.removeItem = function (k) { return del.call(this, map(this, k)); };
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name, ...rest) { return open.call(this, name === "studydesk" ? dbFor(cur) : name, ...rest); };
  }
  const write = () => { try { set.call(localStorage, REG, JSON.stringify(reg)); return true; } catch (e) { return false; } };
  const clean = s => String(s || "").replace(/\s+/g, " ").trim().slice(0, 40);
  window.PROFILES = {
    get list() { return reg.list.map(p => ({ ...p })); },
    get cur() { return cur; },
    get many() { return reg.list.length > 1; },
    me() { return reg.list.find(p => p.id === cur); },
    nameOf(id) { const p = reg.list.find(x => x.id === id); return p && p.name ? p.name : "Main profile"; },
    initial(id) { const n = (reg.list.find(x => x.id === id) || {}).name || ""; return (n.trim()[0] || "★").toUpperCase(); },
    hue(id) { const i = Math.max(0, reg.list.findIndex(x => x.id === id)); return [266, 152, 25, 200, 330, 60, 110, 290][i % 8]; },
    add(name) { const id = "p" + Date.now().toString(36); reg.list.push({ id, name: clean(name), added: Date.now() }); return write() ? id : null; },
    rename(id, name) { const p = reg.list.find(x => x.id === id); if (!p) return false; p.name = clean(name); return write(); },
    switchTo(id) { if (!reg.list.some(p => p.id === id) || id === cur) return false; reg.cur = id; if (!write()) return false; location.reload(); return true; },
    /* removes another profile and everything in it; the profile in use can't be removed */
    async remove(id) {
      if (id === cur || !reg.list.some(p => p.id === id)) return false;
      const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (id === "p0" ? own(k) : k && k.startsWith("studydesk@" + id + ".")) ks.push(k); }
      ks.forEach(k => del.call(localStorage, k));
      await new Promise(res => { try { const r = indexedDB.deleteDatabase(dbFor(id)); r.onsuccess = r.onerror = r.onblocked = () => res(); } catch (e) { res(); } });
      reg.list = reg.list.filter(p => p.id !== id); write(); return true;
    }
  };
})();
