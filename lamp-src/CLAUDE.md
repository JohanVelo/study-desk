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

- Never change the reading-path order, the streak rules (one rest day per week; quiet time counts; grace days: 1 earned per 7 days in a row, up to 3, used automatically: JJ said yes on 28 Oct 2026; `streakRun` in lamp.html, test t49) or the Monday group-week rollover without asking JJ (JJ moved it from Tuesday to Monday midnight on 27 Oct 2026). New path stages are only ever **appended**, because progress is keyed by day number.
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
| `lamp-src/app/src/sw.js` | Service worker. App cache is versioned per build; `lamp-data-v1` keeps `bib/`, `orig/` and `art/*.jpg` across updates, except `bib/people.json` and `bib/places.json` (rebuilt data, kept per build; t48). |
| `lamp-src/app/src/schema.sql` | Supabase tables (`lamp_docs`, `lamp_members`, `lamp_config`) and row-level security. |
| `lamp-src/app/config.json` | Supabase URL and publishable key. |
| `lamp/` | The deployed app (built output plus big data: `bib/`, `art/`, `orig/`). Don't edit by hand; rebuild. |
| `.github/workflows/lamp-iphone.yml` | Runs the app in iPhone Safari (simulator) on every push to `lamp/**`; screenshots go to branch `iphone-shots`. |
| `.github/workflows/lamp-keepalive.yml` | Daily ping so the free Supabase project never pauses. |

**Installed-app-only features** are gated on `HAS_ORIG` (a manifest link is present): Greek/Hebrew, the extra 116 engravings, offline Bible download, word of the day, calendar files.

**Data:** each person's progress is one document `data/users/<id>/progress` `{done, notes, saved, hl, qt, step, settings}`, copied to localStorage key `lamp-state-v1` on every change and merged field by field on connect. Group: `group/meta` (week, auto-advance), one `gm/<uid>` document per member (answers, prayers, replies, reactions, reading days `rd`), `live/game` + `lv/<uid>` for live quizzes.

- `step[day] = {m, g}`: Today's step flags (steps 1 and 2 come from `done` and `notes`).
- `saved[k]`: `m` 0–3 is the 3-day learning phase; after that FSRS-4.5 review fields `s, d, r, l, lr, due` (`srGrade`, `srStart`, `srMigrate`). Merge keeps the record with the higher `m` or later `lr`.
- `gm/<uid>.fb[YYYY-MM]` = the monthly "How's Lamp?" choice; the leader sees totals only. Written comments never go to the database: the person sends them through their own share sheet.
- Unsent changes live in localStorage `lamp-outbox-v1` and are retried on `online`, on return to the app and with back-off (`flush`, `resync`). `window.LAMP_BUSY()` stops silent updates during quiet time, Listen, puzzles, meeting mode, the reader and memorising.
- Today shows the chapter finished today (`todayDone()`) until midnight, so its four steps can be completed.
- `pl[id] = {t, at, n, last, ans, an, u}`: the private prayer list (Journal → Prayers); `ans` set = answered, shown on the answered timeline. `ex[YYYY-MM-DD] = {q0..q3, at, u}`: the evening Examen (Today side column after 17:00). Both merge per item by the later `u`; `null` = deleted.
- v24 premium layer: `weekStrip()` (Today header), `settleToday()` (quiet finish after marking read), `chime()` (Web Audio; setting `sound`, `haptics`), `buzz()` uses the iOS switch-haptic trick when `navigator.vibrate` is missing, milestones `MS_DONE`/`MS_RUN` remembered in `settings.ms` (shown once, full-screen `#msm`, `shareMilestone()` makes a 1080×1350 PNG), `journeyCard()` bookshelf on My path, `openStory()` "Your Lamp story" recap (all worked out on the device).
- v25 (review): satellite map backdrops in `lamp/sat/*.webp` (Copernicus Sentinel-2 L2A 120 m mosaics from AWS S3 `sentinel-s2-l2a-mosaic-120`, July–Aug 2019, CC BY 4.0, credited on the map and in Sources). `satOn()`/`setSat()` (setting `mapStyle`, `plain` = drawn map); an image error adds `.satfail` and falls back to the drawn map. Made by `mksat.py` + `colsat.py` in the scratchpad (not needed again unless maps change). Group writes queue in `gQ`, persist in localStorage `lamp-gq-v1`, retry with back-off and flush when the app is hidden. RSVP keys are `<week>@<Monday date>`. Saving the leader card keeps the weekly rollover day. Installed app: a signed-in person with no signal goes straight in (`window.LAMP_ACCOUNT`), keeps the outbox, and joins the group on the `lamp-online` event. Native feel: checkboxes are iOS switches, hover only on `(hover:hover)`, sheets slide away (`Element.prototype.remove` wrapper for `#scrim`: the leaving copy loses its ids at once) and drag down to close on phones; group tabs are sticky.
- v26: 9 share-picture styles, Learn tabs, folded My path stages, 3D tabernacle (`img/tab`), 3D places (`img/places`), NHEB/ASV/YLT packed as `bib/T-ot|nt.json` (NLT, NIV, ESV and others are Bible.com links only, because of copyright), group "Did you notice?" + 4 more questions per week.
- v27 (always something new): `fun/bank.json` (485 questions, 80 Who am I, 60 Connections groups, 400 daily words + `vocab`, 120 Who said it, 40 timelines; every ref and quote checked against BSB). `freshQs()` mixes bank, verse gaps, Which book, Doré art; `markSeen`/`freshOrder` (localStorage `lamp-qseen`) never repeat until the pool is used. Six daily puzzles seeded by `funDay()` (same for everyone): Lamp word, Today's five, Picture reveal, Connections, Who am I, In order; state in `lamp-d-<game>-<day>`. "New today" card on Today and first Learn tab (`fresh`), `season()` computes the church year from Easter. Peaceful-field scene `meadowSVG()` (time of day, night in dark mode) on Today; `fieldEmpty()` on empty states. Group quick quiz, live quiz, memory match and verse builder use the fresh pools. Test t45.
- v28 (field background): `#fieldbg` fixed layer behind the app with our own three.js renders in `img/field/<t>-wide|tall.webp` + `<t>-tiny.jpg` (t = day, gold, hills, dusk, night; sources in the scratchpad `fieldbg/`). `fieldBgT()`: light = day/gold/dusk by hour, dark = hills by day, dusk 17–19, night after. Veil via `--fv1..3`. Setting `bg` (Field/Plain, html.plainbg). JJ's Pinterest pictures were used only as mood references.
- v29 (shepherd scene): JJ asked for the Pinterest Jesus-with-sheep painting; it is copyrighted (adding a bird does not make it ours), so `img/field/{day,gold,dusk,night}` are our own code-drawn scenes of Jesus walking with sheep under towering clouds, with a little swallow (sources in the scratchpad `shepherd/`). `hills` removed: dark mode is dusk 05–19, night otherwise. The Today hero is now `.fh-img` (same scene; flipped and cropped on wide, zoomed on phones). `.wks-sub` gets a glass pill over the field for contrast.
- v30: second painting pass of the shepherd scenes; the field background drifts slowly (`fbDrift`) and a small swallow (`fieldBird()`, `.fbird`) crosses the sky every 40–90 s (not at night, not with reduced motion). Fixed person sheets (`REL`: index 2 = children, 3 = siblings) and hid the Journal `[data-askv]` Ask buttons in the installed app. A 37-page PDF guide with 121 screenshots is in the project files at `lamp-guide/` (re-run from the scratchpad `guide/`).
- v31 (audit pass from JJ's improvement prompt): "A word for today" on Today (`#devo`, `fillDevo`, `openDevo`; Spurgeon's Morning and Evening 1866, public domain, from github.com/gm5dna/morning-evening, split as `fun/me/MM.json` = per day [mVerse,mRef,mText,eVerse,eRef,eText]; evening from 16:00; setting `devo`). Reader "Letters: Classic/Clear" (setting `rf`, html.rfclear, Atkinson Hyperlegible). Shorter Doré band on phones, phone hero flipped (Jesus right), clearer swallow, glass behind text on the field (.lede, .side-k, .feelrow kicker, .topbar, .subnav), 44 px taps on touch, "Weekly goal met", Memorise/recognise, reader bar says Previous, bookshelf shows chapter ranges when a book repeats, bible.json/geo.json load when idle, placeInd in rAF, drift pauses while scrolling, highlights merge remote-wins unless unsent, first set sends all fields.
- v32 (adversarial click-everything review): offline group answers/prayers merged into gm/<uid> on connect (lamp-group-v1 then cleared); Examen keeps text on fast close; Lamp word has one keydown handler (`wordKey`) and refuses words outside vocab; series key verse uses `w.sr.book`; missing verses toast instead of a save bar; storage-full toast checks `docRef` and holds 7 s (`toast(m,hold)` locks out other toasts); leap-day devo label; `funDay` uses Date.UTC; `rsvpKey` local date; pic/who/order use `dayPick` (fixed shuffled order from funDay 297); story overlay id is `#lstory` (the Learn "Big story" panel is `#story`); focus returns to the opener when a sheet closes (`sheetOpener`); smaller ranged spine labels on phones; word grid fits 375x667; sw precaches fun/bank.json and this/next month devo; fillWotd guards a stale card. Test t46.
- v33 (JJ: "by Monday it goes on to the next week"): `curWk()` = leader week + whole Mondays since `monOf(at)`; with no saved `at` it counts from Monday 19 Oct 2026 = w7 (the installed app had no meta, so it never moved). `wkCheck()` runs with dayCheck so an open app moves at midnight. Group hero: "New this week" chip (Mon–Tue, shine + one burst per new week via `lamp-wk-seen`), "Next week · from Monday …" peek (`.gnext`, gold Fri–Sun, opens next week; "Back to this week" when browsing), direction-aware slide when changing weeks, current week scrolled into view, 44 px week buttons on touch. Cards rise in on scroll (CSS `animation-timeline:view()`, motion allowed only). Test t47.
- v33 data pass (JJ: Who's who found no people; "accurate data, double check everything"): `lamp-src/data/build_who.py` rebuilds bib/people.json + places.json from Theographic (needs the theographic repo at `gh/theo` in the scratchpad): rows gain [5]=verse count, [6]=first ref, [7]=top chapters, people [8]=plain name. Easton paragraphs are kept only when their citations match the person's own chapters (80 mismatched articles dropped); duplicate names get "(first ref)"; key figures retitled (`OV2`); hand corrections in `data/fixes.py`. Who's who searches all people/places/aka (`whoSearch`, `WHO_C`), sheets show "Named or referred to in N verses" + where-to-read chips (`whoFacts`). Library spines open `openBook` with `BOOKINFO` (66 intros from `data/books.py`: author as the book claims it, else "traditionally"). The land links to all places (`#allPlaces`). A fact-check fixed 19 errors and ~40 debatable/wording items (ART titles, FIGS, TAB, TERMS, TL eras -1876, HW notes, bank q112/292/301/452/484, tests som q4).
- v34 (JJ: grace days yes; "always show what the right answers are"): grace days (see rules above), Your streak sheet (`openStreak`, tap the top flame or the week-strip flame), `graceNotice` toast when one is used. Every quiz shows the right answer straight after a wrong pick (`rightLine`) and reviews with "You said" + "Right answer" (`ansRev`): Today's five, Keep playing, group quick quiz, tests, chapter quiz, live quiz, Picture reveal. Test t49.
- v35 (JJ: "continue improving… go through everything… with screenshots"): full tour (42 screens × 4, `scratchpad qa/tour.js`) and click crawl. New: Learn → **Read by topic** (`TPLANS`, 8 plans × 5 readings, 12 from v36, progress in `settings.tp`, `openTopic`), **Hymn of the week** (`HYMNS`, 12 public-domain hymns, changes every Monday, `openHymn`; card on Today and in Read by topic). Chosen tab scrolled into view in scrolling tab rows (`edgeMask`). Laptop sidebar streak line opens Your streak. Test t50.
- v36 (nightly round, 29 Oct): **Prayer partners** in the group Prayer tab (`ppRing`, `ppFor`, `paintPP`): each Monday every active member (seen in the last 60 days) gets one person to pray for, in a ring so everyone is also prayed for. Every phone works out the same ring from the Monday and the sorted member ids, so nothing new is stored except my own `pp:{<monday dayKey>:<partner id>}` when I tap I prayed. Name-hidden requests never show on the card. 4 more topic plans (12 in all). Test t51.
- Group doc extras (v23): `bd` = my reading buddy's id, `pd[day] = {t, at}` = a shared "What happened?" answer (only when setting `shareRef` is on). Settings: `weekGoal` (3/4/5/7), `buddy`, `shareRef`, `easy` (easy mode sets `mode` listen, `size` l, `rate` .85).

## Run, test, deploy

```bash
# build the installed app
(cd lamp-src/app && python3 build.py)
# serve it for tests (8767 = installed app, 8765 = lamp.html as the artifact)
python3 -m http.server 8767 --directory lamp-src/app/dist &
mkdir -p /tmp/lt && cp lamp-src/lamp/lamp.html /tmp/lt/ && ln -sfn $PWD/lamp/{bib,art,bible.json,geo.json,tests.json} /tmp/lt/ && cp -r lamp-src/lamp/sat /tmp/lt/
python3 -m http.server 8765 --directory /tmp/lt &   # lamp.html as the artifact, with the deployed data beside it
# run a test (Playwright from the global npm root)
PW=$(npm root -g)/playwright node lamp-src/tests/t33.js
```

- Port 8765 is QGIS on JJ's laptop: only use it in a sandbox.
- Tests: t25 group, t27 replies/pictures/reminders, t28, t31 reading ring, t33 Listen/feelings/puzzle, t34 highlights/page colours; app tests t22, t23, t26 silent update, t29, t30 Greek/Hebrew, t32 word of the day, t35 offline download; t36 streak and offline outbox, t37 Today's step and reviews, t38 first week, group tabs, reader bar, How's Lamp, path order and no tracking, t39 axe-core, t44 v25 review fixes + satellite maps, t40 buddy, weekly goal, shared reflection, welcome back, prayer list, Examen, easy mode, t41 "Which verse is this?" reviews, leader's prayer list, read aloud in meeting mode, t42 week strip, chime, milestones, t43 bookshelf and Lamp story. Installed-app tests (t22, t23, t26, t29, t30, t32, t35) live in `lamp-src/app/`. Run them all with `lamp-src/tests/runall.sh` (one at a time, stops on failure).
- After any change, at minimum: the test for that feature, t26 (updates), t35 (offline), plus screenshots.
- **Deploy:** `cd lamp-src/app && python3 build.py && cp -r dist/. ../../lamp/ && rm -rf dist`, then commit as `JohanVelo <jjscholtz09@gmail.com>` and push `main`. Pages deploys; phones update silently on next open. Then check the `iphone-shots` screenshots.
- **Artifact (until retired):** publish `lamp-src/lamp/lamp.html` to the artifact URL above, keeping its capabilities (`db` rules, `user`, `sample`, `downloads`).

## Refactoring safely

1. Write or extend a test that pins the current behaviour.
2. Make one small change (one feature, one file area).
3. Run that test, t26 and t35; take screenshots.
4. Commit with a message that says what users will notice.
5. Never combine a refactor with a behaviour change in the same commit.
