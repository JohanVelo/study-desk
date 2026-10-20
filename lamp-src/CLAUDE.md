# Lamp: project brief for Claude

Read this fully before any Lamp task. Keep it up to date when something here changes.

## What Lamp is

A Bible reading and study-group app. It has a 190-day reading path, a reader with 4 public-domain translations, a journal with memorising, and a weekly group study with answers, prayer, check-ins and games.

- **For:** JJ's own church group first (JJ leads it). Later, maybe other small groups in South Africa.
- **Owner:** JJ (GitHub `JohanVelo`, jjscholtz09@gmail.com). Not a developer: explain in plain language with step-by-step guides, lead with the answer, think for them. Use they/them for JJ.
- **Live:** https://johanvelo.github.io/study-desk/lamp/ (GitHub Pages from `main`, folder `lamp/`).
- **Old version:** the claude.ai artifact https://claude.ai/artifact/NBuYLpeGQTdiA1wZYzjUGN (Claude sign-in, AI Ask and AI quiz). Agreed on 2026-10-20: it will be retired once the group has moved to the installed app. Until then, keep the two in step where a feature is marked "both".

## Hard promises (never break these)

1. **Free.** No ads, no paid services. Ask JJ before anything that costs money.
2. **No tracking.** No analytics SDKs, no third-party scripts that report usage, no per-person usage logs on the server. The only network hosts allowed: the app's own address, the Supabase project, Google Fonts, and links the person taps (Bible.com). Any measurement is on the device, a group total, or an anonymous opt-in answer.
3. **Private by default.** Notes, saved verses and highlights are visible only to their owner. The group sees only what someone shares (answers, reactions, replies, prayers, and reading days if `shareRead` is on).
4. **Offline first.** Reading, Listen, journal and memorising must work with no signal (churches, planes, rural areas). Changes made offline must reach the server later without being lost.
5. **Attribution.** Keep the "Sources and thanks" screen and the licence notes complete: WEB, BSB, KJV, BBE (public domain); OpenBible.info cross references (CC BY); Theographic people and places (CC BY-SA); STEPBible Greek/Hebrew (CC BY 4.0); Easton's Bible Dictionary; Gustave Doré 1866 engravings; Natural Earth maps.
6. **Supabase:** use the publishable key only, never the secret/service_role key. Never touch the Velocity Nexus project (JJ's business).

## Rules for changes

- Never change the reading-path order, the streak rules (one rest day per week; quiet time counts) or the Tuesday group-week rollover without asking JJ. New path stages are only ever **appended**, because progress is keyed by day number.
- Never break offline reading. After any change, check that today's chapter opens offline.
- One feature per change. Test first, then change, then test again. Keep each step small enough to undo with `git revert`.
- Quality bar: premium design (see JJ's excellence standard), light and dark, 44 px touch targets, WCAG AA contrast, British/South African English, sentence case, plain words.
- Look at what you built: screenshots of every changed screen at 390×844 and 1440×900, light and dark. Run axe-core: zero serious or critical issues.
- Ask JJ to try new things on a real iPhone; the simulator run is not the same.

## How it's built

| Path | What it is |
|---|---|
| `lamp-src/lamp/lamp.html` | The whole app in one file (HTML, CSS, JS, no framework). It is also the claude.ai artifact. |
| `lamp-src/app/build.py` | Makes the installed app in `app/dist/`: 24 text swaps (removes AI, adds account settings and group code) plus `app/src/app.js`. Stops with an error if a swap no longer matches. |
| `lamp-src/app/src/app.js` | Sign-in (email, password, group code) and a Supabase layer that speaks the same `claude.use("db")` / `claude.use("user")` API as the artifact. |
| `lamp-src/app/src/sw.js` | Service worker. App cache is versioned per build; `lamp-data-v1` keeps `bib/`, `orig/` and `art/*.jpg` across updates. |
| `lamp-src/app/src/schema.sql` | Supabase tables (`lamp_docs`, `lamp_members`, `lamp_config`) and row-level security. |
| `lamp-src/app/config.json` | Supabase URL and publishable key. |
| `lamp/` | The deployed app (built output plus big data: `bib/`, `art/`, `orig/`). Don't edit by hand; rebuild. |
| `.github/workflows/lamp-iphone.yml` | Runs the app in iPhone Safari (simulator) on every push to `lamp/**`; screenshots go to branch `iphone-shots`. |
| `.github/workflows/lamp-keepalive.yml` | Daily ping so the free Supabase project never pauses. |

**Installed-app-only features** are gated on `HAS_ORIG` (a manifest link is present): Greek/Hebrew, the extra 116 engravings, offline Bible download, word of the day, calendar files.

**Data:** each person's progress is one document `data/users/<id>/progress` `{done, notes, saved, hl, qt, settings}`, copied to localStorage key `lamp-state-v1` on every change and merged field by field on connect. Group: `group/meta` (week, auto-advance), one `gm/<uid>` document per member (answers, prayers, replies, reactions, reading days `rd`), `live/game` + `lv/<uid>` for live quizzes.

**Known weak spot:** unsent changes are held in memory only (`pending` in `queue()`/`flush()`); a failed send is not retried on reconnect. Fixing this (an outbox in IndexedDB) is planned.

## Run, test, deploy

```bash
# build the installed app
cd lamp-src/app && python3 build.py
# serve it for tests (8767 = installed app, 8765 = lamp.html as the artifact)
python3 -m http.server 8767 --directory lamp-src/app/dist &
mkdir -p /tmp/lt && cp lamp-src/lamp/lamp.html /tmp/lt/ && ln -sfn $PWD/lamp/{bib,art,bible.json,geo.json,tests.json} /tmp/lt/
python3 -m http.server 8765 --directory /tmp/lt &   # lamp.html as the artifact, with the deployed data beside it
# run a test (Playwright from the global npm root)
PW=$(npm root -g)/playwright node lamp-src/tests/t33.js
```

- Port 8765 is QGIS on JJ's laptop: only use it in a sandbox.
- Tests: t25 group, t27 replies/pictures/reminders, t28, t31 reading ring, t33 Listen/feelings/puzzle, t34 highlights/page colours; app tests t22, t23, t26 silent update, t29, t30 Greek/Hebrew, t32 word of the day, t35 offline download. `<FILL IN: one runall script>`.
- After any change, at minimum: the test for that feature, t26 (updates), t35 (offline), plus screenshots.
- **Deploy:** `cd lamp-src/app && python3 build.py && cp -r dist/. ../../lamp/ && rm -rf dist`, then commit as `JohanVelo <jjscholtz09@gmail.com>` and push `main`. Pages deploys; phones update silently on next open. Then check the `iphone-shots` screenshots.
- **Artifact (until retired):** publish `lamp-src/lamp/lamp.html` to the artifact URL above, keeping its capabilities (`db` rules, `user`, `sample`, `downloads`).

## Refactoring safely

1. Write or extend a test that pins the current behaviour.
2. Make one small change (one feature, one file area).
3. Run that test, t26 and t35; take screenshots.
4. Commit with a message that says what users will notice.
5. Never combine a refactor with a behaviour change in the same commit.
