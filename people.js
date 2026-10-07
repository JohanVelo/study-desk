/* Study Desk v4.11: profiles, part 2 (the screens)
   Settings → People on this device: add a person, switch, rename, remove.
   With more than one person, every main screen shows whose profile is open, and one tap switches. */

const pfAvatar = (id, big) => `<span class="pf-av${big ? " big" : ""}" style="--h:${PROFILES.hue(id)}" aria-hidden="true">${esc(PROFILES.initial(id))}</span>`;
const pfName = id => PROFILES.nameOf(id);

function peopleCard() {
  const list = PROFILES.list, cur = PROFILES.cur;
  return `<section class="card stack pf-card" id="people"><h2 class="h3">People on this device</h2>
    <p class="small muted">Each person gets their own subjects, books, notes, flashcards and progress. Nothing is shared between profiles, so big books stay separate too.</p>
    <div class="pf-list">${list.map(p => `<div class="pf-row${p.id === cur ? " on" : ""}">
      ${pfAvatar(p.id)}<span class="grow"><b>${esc(pfName(p.id))}</b><span class="tiny muted">${p.id === cur ? "Using now" : "Tap Switch to study as " + esc(pfName(p.id))}</span></span>
      ${p.id === cur ? `<button class="btn btn-line btn-sm" data-action="pf-rename" data-id="${p.id}">Rename</button>` : `<button class="btn btn-soft btn-sm" data-action="pf-switch" data-id="${p.id}">Switch</button><button class="icon-btn sm pf-more" data-action="pf-manage" data-id="${p.id}" aria-label="Rename or remove ${esc(pfName(p.id))}">${ico("chev")}</button>`}
    </div>`).join("")}</div>
    <button class="btn btn-pen btn-auto" data-action="pf-add">${ico("plus")}Add a person</button></section>`;
}
const _vSettingsP = V.settings;
V.settings = () => {
  let h = _vSettingsP();
  h = h.replace("</header>", "</header>" + peopleCard());
  if (PROFILES.many) h = h.replace("Erase every subject, note, recording, sketch and all progress on this device.", `Erase every subject, note, recording, sketch and all progress in ${esc(pfName(PROFILES.cur))}'s profile. Other people on this device keep theirs.`);
  return h;
};
if (typeof JUMPS !== "undefined" && JUMPS.settings) JUMPS.settings.unshift(["People on this device", "People"]);

/* whose profile is open: a small avatar in the top bar of every main screen */
const _renderP = render;
render = function (fresh) {
  _renderP(fresh);
  if (stack.length !== 1 || !PROFILES.many) return;
  const id = PROFILES.cur;
  ($(".topbar .gear") || $(".topbar .srch"))?.insertAdjacentHTML("afterend", `<button class="pf-btn" data-action="pf-open" aria-label="Studying as ${esc(pfName(id))}. Switch person">${pfAvatar(id)}</button>`);
};

function openPeople() {
  const list = PROFILES.list, cur = PROFILES.cur;
  openSheet("Who's studying?", `${sheetHead("Profiles on this device", "Who's studying?")}
    <div class="stack" style="gap:10px">${list.map(p => `<button class="pf-pick${p.id === cur ? " on" : ""}" data-action="${p.id === cur ? "pf-close" : "pf-switch"}" data-id="${p.id}">${pfAvatar(p.id, true)}<span class="grow"><b>${esc(pfName(p.id))}</b><span class="tiny muted">${p.id === cur ? "Using now" : "Switch to this profile"}</span></span>${p.id === cur ? ico("check") : ico("chev")}</button>`).join("")}
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-soft" data-action="pf-add">${ico("plus")}Add a person</button><button class="btn btn-line" data-sgo="settings">Manage profiles</button></div></div>`);
}
function openAddPerson() {
  const me = PROFILES.me(), needMine = !me.name;
  openSheet("Add a person", `${sheetHead("Profiles on this device", "Add a person")}
    <div class="stack form">
      <p class="small muted">They start with an empty Study Desk: their own subjects, books and progress. You can switch back any time.</p>
      <label class="fld"><span>Their name</span><input id="pf-new" type="text" maxlength="40" autocomplete="off" placeholder="e.g. Shasti"></label>
      ${needMine ? `<label class="fld"><span>And your name, for this profile</span><input id="pf-mine" type="text" maxlength="40" autocomplete="off" placeholder="e.g. Megan"></label>` : ""}
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="pf-create">Add and switch to them</button><button class="btn btn-line" data-action="pf-close">Cancel</button></div>
    </div>`);
  setTimeout(() => $("#pf-new")?.focus(), 60);
}
function openManage(id) {
  openSheet("Profile", `${sheetHead("Profiles on this device", pfName(id))}
    <div class="stack form">
      <label class="fld"><span>Name</span><input id="pf-name" type="text" maxlength="40" autocomplete="off" value="${esc((PROFILES.list.find(p => p.id === id) || {}).name || "")}"></label>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-pen" data-action="pf-save" data-id="${id}">Save name</button>
      ${id !== PROFILES.cur ? `<button class="btn btn-line danger" data-action="pf-del" data-id="${id}">Remove this profile</button>` : ""}</div>
      ${id !== PROFILES.cur ? `<p class="tiny muted">Removing deletes ${esc(pfName(id))}'s subjects, books, notes and progress from this device. Save a backup in their profile first if they might want it back.</p>` : ""}
    </div>`);
  setTimeout(() => $("#pf-name")?.focus(), 60);
}

const P_ACTS = new Set(["pf-open", "pf-add", "pf-create", "pf-switch", "pf-rename", "pf-manage", "pf-save", "pf-del", "pf-close"]);
async function pAction(act, a) {
  const id = a.dataset.id;
  switch (act) {
    case "pf-open": openPeople(); return;
    case "pf-add": openAddPerson(); return;
    case "pf-close": closeSheet(); return;
    case "pf-rename": case "pf-manage": openManage(id); return;
    case "pf-create": {
      const name = ($("#pf-new")?.value || "").trim(), mine = $("#pf-mine") ? $("#pf-mine").value.trim() : null;
      if (!name) { toast("Write their name first."); $("#pf-new")?.focus(); return; }
      if (mine) PROFILES.rename(PROFILES.cur, mine);
      const nid = PROFILES.add(name); if (!nid) { toast("Couldn't add a profile here. The browser may be in private mode."); return; }
      save(true); toast(`Switching to ${name}…`); setTimeout(() => PROFILES.switchTo(nid), 350); return;
    }
    case "pf-switch": save(true); toast(`Switching to ${pfName(id)}…`); setTimeout(() => PROFILES.switchTo(id), 250); return;
    case "pf-save": { const v = ($("#pf-name")?.value || "").trim(); if (!v) { toast("Write a name first."); return; } PROFILES.rename(id, v); closeSheet(); rerender(); toast("Name saved."); return; }
    case "pf-del": {
      if (!a.dataset.confirm) { a.dataset.confirm = "1"; a.textContent = TAP + " again to remove " + pfName(id); setTimeout(() => { if (a.isConnected) { delete a.dataset.confirm; a.textContent = "Remove this profile"; } }, 3500); return; }
      const name = pfName(id); a.disabled = true; await PROFILES.remove(id); closeSheet(); rerender(); toast(`${name}'s profile is removed.`); return;
    }
  }
}
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.matches?.("#pf-new,#pf-mine,#pf-name")) return;
  e.preventDefault(); $(e.target.id === "pf-name" ? '[data-action="pf-save"]' : '[data-action="pf-create"]')?.click();
});
