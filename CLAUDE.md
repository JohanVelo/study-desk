# Study Desk: project brief for Claude

This file is the main source of truth for this project. Read it fully before any task, keep it up to date when something here changes, and read `docs/ROADMAP.md` before planning new features.

## 1. What this is

Study Desk is an installable study app (a PWA) that turns a student's own PDFs, slides and Word files into a study plan, notes, summaries, flashcards, practice questions, podcasts, diagrams and more.

- **Owner:** JJ (GitHub `JohanVelo`, jjscholtz09@gmail.com), in South Africa. He is not a developer: explain things in plain language with step-by-step guides, be goal-based, and think for him.
- **Users:** Megan (JJ's girlfriend, a university student) and her friend Shasti, on phones (iPhone Safari matters) and laptops.
- **Live:** https://johanvelo.github.io/study-desk/ (GitHub Pages, deployed from `main` on every push). Repo: `JohanVelo/study-desk`.
- **Version:** 4.13.0 (2026-10-07). `APP_VERSION` in `app.js`, `VERSION` in `sw.js`.
- **The ambition:** the best study app in South Africa. It should keep students hooked while giving them every important fact in their own material. Quality over speed, always.

## 2. Non-negotiable principles

1. **Data stays on the device.** No server, no accounts. Everything lives in the browser (localStorage + IndexedDB) per device and per profile. Phone and laptop sync peer-to-peer (encrypted, pairing code or QR).
2. **Works offline.** The service worker (`sw.js`) caches the app shell. Big optional parts (voices, models, libraries) download on first use and are then cached.
3. **Nothing invented on the device.** The on-device summariser is extractive: it only keeps the book's own sentences, covers every heading, keeps definitions, formulas and dates, and shows a coverage line. Never add on-device "AI rewriting" that could invent facts.
4. **Online AI is optional, on the person's own key, and always labelled.** Claude (Anthropic API) only runs when someone adds their own key in Settings → Online AI and taps a button. Every AI answer is marked as AI-written, cites pages, and is never mixed into the student's notes (notes stay the book's own words, because summaries and "what your book says" read from them).
5. **No build step.** Plain HTML, CSS and JavaScript files served as they are. Libraries are vendored single files (ESM or UMD) under `vendor/`. Keep it that way unless JJ agrees to change it.
6. **Free and open source first.** Check every library's licence (MIT, Apache, BSD, ISC, MPL are fine; flag GPL/AGPL and anything with use restrictions) and ask JJ before anything paid.
7. **Starts empty.** `data.js` has no sample content. Never put sample subjects back (check: `grep -c "subjects: \[\]" data.js` must print 1).

## 3. Quality bar (JJ was frustrated when this was skipped)

- **Premium design.** Follow the Excellence Standard: distinctive, beautiful, clear, smooth, accessible. Nothing generic or "AI default". Light and dark are both designed. Touch targets at least 44 px. WCAG AA contrast.
- **Before calling anything done, look at it.** Take screenshots of EVERY changed screen, form, sheet and setting on phone (390×844) and laptop (1440×900), in light and dark, and actually look at them for overlaps, clipping, cut-off text and misalignment. Automated checks once missed an overlap in the Add a Subject form (venue vs exam time). Automated tests alone are not enough.
- **Run axe-core** on new screens (serious and critical issues must be zero).
- **Run the full regression** (`tests/runall.sh`) before every release. All tests must pass.
- **Performance budget:** every screen opens in under 0.7 s with a 20,000-page / 5,000-topic library; no long main-thread tasks during import; huge PDFs show a live progress screen.
- **Plain-language copy.** Sentence case, buttons say exactly what happens, errors explain what went wrong and how to fix it. British/South African English.

## 4. How the code is organised

Scripts load in this order (`index.html` uses `defer`; `artifact.html` is the same app as a claude.ai preview page without `defer`):

| File | What it does |
|---|---|
| `profiles.js` | Runs first, not deferred. Several people on one device: patches `Storage.prototype` get/set/remove and `IDBFactory.prototype.open` so every profile except the first (`p0`) uses `studydesk@<id>.*` keys and its own `studydesk@<id>` database. Shared keys: `studydesk.(profiles|nvoice|nvoice.ok|smart)`. `window.PROFILES` API. Switching reloads the page. |
| `vendor/gsap…` | GSAP 3.13 + Flip + SplitText (motion). |
| `data.js` | Shipped content. Empty on purpose. |
| `summary.js` | Extractive summary engine (TextRank, MMR, RAKE; written for this app). "Every detail" and "Short" modes. |
| `app.js` | Core: state, storage, views (`V.*`), router (`go("view:arg")`, `back()`), import (PDF/PPTX/DOCX, streaming PDF read of any size with live progress and Cancel), plan, summaries, backup/restore (`exportParts`), settings, IndexedDB helper `IDB`, the action dispatcher. |
| `tools.js` | FSRS flashcards (ts-fsrs), blurt check, photo OCR, mind map (`V.map`, folds big subjects into chapters), fuzzy search (MiniSearch). |
| `extras.js` | Questions from notes (auto-questions, chunked and cached in IDB `aq`), maths typesetting, .docx import, calendar reminders, formatted notes (`mdToHtml`: marked + DOMPurify), sketches, progress charts, Anki export, P2P sync (Trystero), Chrome built-in AI explain (laptop only). |
| `speech.js` | Podcasts with natural voices (Piper TTS in `voice-worker.js`), lecture transcription (Moonshine in `stt-worker.js`). |
| `more.js` | Search by meaning (`embed-worker.js`, all-MiniLM-L6-v2), picture cards, practice exams, focus sounds, study streak heatmap, QR pairing, guided tour (driver.js). |
| `read.js` | Textbook PDF reader in the app (`read:bookId:page`), highlights → flashcards, find in book, pinch zoom, teach it back, write by hand, diagrams cut out of PDFs (`FIGS`, IDB `figs`, `openFig`, `figSays`). |
| `ease.js` | Ease of use: topic study tiles, Settings/Progress shortcut rows (`JUMPS`, cards get id `set-<label>`), one-time tips, catch-up banner, swipe, home-screen shortcuts, quick add, recent searches. |
| `learn.js` | "Learn it step by step" (`learn:id`): a topic in short parts with checks. |
| `people.js` | Profile screens: Settings → People on this device, top-bar avatar switcher. |
| `claude.js` | v4.12 optional online AI: Settings → Online AI (key in `studydesk.aikey`, per profile), "Explain this topic" (renders the topic's textbook pages, max 20, as JPEGs for Claude), "Explain this diagram". Answers cached in IDB `ai`. |
| `sw.js` | Service worker. `SHELL` list must include every app file. Bump `VERSION` every release. `vendor/x/` is cached on first use. |

**Extension pattern.** Later files extend earlier ones by wrapping and reassigning globals, for example:
```js
const _vTopicX = V.topic;
V.topic = id => { const h = _vTopicX(id); return h + myCard(id); };
```
The same is done for `render`, `crumbs`, `studyTiles`, `exportObj`, `eAction`, `rAction`, `openFig`, `V.settings`. Action buttons use `data-action="..."`; each file declares a `Set` of its actions (`R_ACTS`, `E_ACTS`, `L_ACTS`, `P_ACTS`, `A_ACTS`, `X_ACTS`, `TOOL_ACTS`…) and the dispatcher in `app.js` routes them. `data-go="view:arg"` navigates; `data-sgo` closes a sheet then navigates.

**UI helpers:** `openSheet(label, html)`, `sheetHead(eyebrow, title)`, `closeSheet(instant)`, `toast(text)`, `ico(name)` (SVG icons in the `P` object), `esc()`, `$`, `$$`, `rerender()`, `go()`, `back()`.

**Storage:**
- localStorage `studydesk.v2` = main state `S` (schema 3) plus `.bak`, and other `studydesk.*` keys (tips, tour, exam, sum mode, recent searches, voice, aikey…).
- IndexedDB `studydesk` **version 7**, stores: `notes audio sketch pics vec books marks figs aq ai`. Adding a store: bump the version in `IDB` (app.js), add it to the `onupgradeneeded` list, the in-memory fallback `mem` map, the "Start again" erase list, and `tests/t15.js`.
- Gotcha: `IDB.get()` returns the request object (truthy) when a key is missing. Always check a field, e.g. `rec && rec.text`.
- PDFs kept for the reader live in IDB `books` (blob). They are not in backups or sync.

## 5. Running and testing

```bash
# serve the app (from the repo root). Tests use port 8765 unless SD_PORT is set
# (SD_PORT2 for t7's 8777), e.g. when 8765 is taken on the laptop: SD_PORT=8865 SD_PORT2=8877 bash runall.sh
python3 -m http.server 8765
# tests (Playwright + axe-core)
cd tests && npm install && npx playwright install chromium   # first time only
bash runall.sh            # full regression, ~25 min; results in tests/reg/
node t25.js               # one test
```
- t7 (offline from a subfolder) also needs a server on 8777 that serves the repo under `/study-desk/` (see `tests/README.md`).
- t2, t5, t7, t8 temporarily copy `tests/sample-data.js` over `data.js` (runall restores it). t3, t6, t9–t12 run with `node -r ./with-sample.js`. Never commit `data.js` with sample content.
- Fixtures: `node mksumtest.js` makes `tests/sumtest/` (used by t9, t10, t13, t14) and `node mkhard.js` makes the hard PDFs for t26 (dot leaders, bold headings, a scan). Both are committed; rerun only to change them.
- Run tests one at a time: Python's simple server drops requests when several browsers load the app at once.
- Big-book tests: `node mkhandbook20k.js` creates the 20,000-page fixture (108 MB, git-ignored).
- Tests use `serviceWorkers: 'block'`, locale en-GB, and `go('view')` to navigate. With `reducedMotion: 'reduce'` CSS transitions become 1 ms.
- The online AI is tested with a pretend API (`t25.js` routes `https://api.anthropic.com/**` to a fake streaming response), so no real key or money is needed.

## 6. Releasing

1. Bump `APP_VERSION` (app.js) and `VERSION` (sw.js); add any new file to `SHELL` in sw.js and a `<script>` tag in both `index.html` and `artifact.html`.
2. Run `tests/runall.sh` and the screenshot review (section 3).
3. Update `README.md` (features + files) and this file if anything here changed.
4. Commit as `JohanVelo <jjscholtz09@gmail.com>` and push `main`. GitHub Pages deploys automatically; check with `gh api repos/JohanVelo/study-desk/actions/runs --jq '.workflow_runs[0] | [.head_sha[0:7], .status, .conclusion] | @tsv'`.
5. Installed copies update themselves through the service worker on next open.
6. Never commit `zz-*.pdf` test files or the 20k fixture.

## 7. Online AI (Claude API) rules

- SDK: official `@anthropic-ai/sdk` bundled for the browser as `vendor/x/anthropic-sdk.mjs` (esbuild ESM bundle of 0.132.0, minified). Loaded lazily with `await import()`. Client: `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`.
- Model `claude-opus-5-5`, `thinking: {type: "adaptive"}`, `output_config: {effort: "medium"}`, streaming (`client.beta.messages.stream(...)` + `finalMessage()`), `max_tokens` 16000, server-side fallbacks on (`betas: ["server-side-fallback-2026-07-01"], fallbacks: "default"`). Check `stop_reason === "refusal"` and `"max_tokens"`. No assistant prefill.
- Price shown to users: $4 per million input tokens, $20 per million output.
- Typed errors become plain sentences (`aiError` in claude.js).
- Every prompt tells Claude to use only the provided material, cite pages, and mark its own examples "(my example)".
- The key is never logged, never synced, never in backups, never sent anywhere except `api.anthropic.com`.
- Before changing Claude API code, check the current Anthropic docs: the API changes often.

## 8. What exists today (feature list by version)

- v4.0: FSRS flashcards, blurt check, photo OCR, mind map, fuzzy search, Review tab, day dial.
- v4.1: by-eye pass of 55 screens × 5 sizes; extractive summariser feeding summaries, podcasts, search, explain, definition flashcards.
- v4.2: practice questions from notes, maths, .docx import, calendar reminders, formatted notes, sketches, progress charts, Anki export, encrypted P2P sync, natural TTS voices, lecture transcription, Chrome built-in AI explain.
- v4.3: clean slate and a guided 3-step Import (Subject, File, Check).
- v4.4: search by meaning, picture cards, practice exams, focus sounds, streak heatmap, QR pairing, guided tour.
- v4.5–4.6: textbook reader with highlights → flashcards, teach it back, write by hand, find in book, pinch zoom, Continue reading.
- v4.7–4.9: study tiles, shortcuts, tips, catch-up banner, swipe sessions, home-screen shortcuts, larger text, quick add, recent searches.
- v4.10: huge PDFs (20,000 pages: read ~2 min, save ~1.5 min on a laptop), live import progress, Every detail / Short summaries with examples, diagrams from PDFs, Learn it step by step, all screens under 0.7 s at 5,000 topics.
- v4.11: profiles (several people per device, fully separate data).
- v4.12: optional online AI (Claude) explaining topics from their textbook pages and explaining diagrams.
- v4.13: PDF import never dead-ends: dot-leader contents pages, bold-only headings, no-structure PDFs (split by pages), scanned books read with on-device text recognition (Tesseract; contents pages have their leader dots wiped and are read line by line, PSM 6). Typed contents lists keep the PDF attached for notes. Missing test fixtures recreated (`mksumtest.js`).

## 9. What's next

See `docs/ROADMAP.md` ("Learn it your way": visual maps, lively two-host audio, talk to the app, debate mode, study with a friend, engagement) and `docs/research-learning-modes.md` (library versions, licences, sizes and the learning-science evidence behind each choice).

## 10. Working with JJ

- Lead with the answer, in plain words, with a short step-by-step when he has to do something.
- When a decision changes what users see or can't be undone, give 2–4 options with one recommended. Otherwise pick the sensible default, say which, and keep going.
- Show screenshots of new work.
- Say honestly when something can't reach the bar, and propose the best alternative.
- Real iPhone Safari can't be tested from a sandbox: ask JJ to try new features on Megan's phone.
