# Study Desk tests

Browser tests with Playwright, plus axe-core for accessibility. The app has no build step; the tests drive the real app in Chromium.

## First time
```bash
cd tests
npm install
npx playwright install chromium
```

## Servers
Every test needs `SD_PORT` (and t7 needs `SD_PORT2`). The new checks and `runall.sh` refuse to run without it, or on 8765, because JJ's laptop runs the QGIS bridge there.
```bash
# 1. the app, from the repo root
python3 -m http.server 8866
# 2. only for t7 (works offline from a subfolder): a folder whose "study-desk" link points at THIS repo
#    (on JJ's laptop that is C:/dev/pages-root2 -> C:/dev/study-desk-fix; runall.sh checks the bytes match)
mkdir -p ../../pages-root2 && ln -s "$(pwd)/.." ../../pages-root2/study-desk
cd ../../pages-root2 && python3 -m http.server 8867
```

## Run
```bash
SD_PORT=8866 SD_PORT2=8867 bash runall.sh      # everything, compared with baseline/runall.json; exit 1 if any test got worse
SD_PORT=8866 SD_PORT2=8867 RUNALL_ONLY=t7 bash runall.sh   # one test, same guards and data.js swap
SD_PORT=8866 node t25.js                       # one test on its own
```
Every test prints PASS/FAIL lines and ends with `ALL PASS` or `N FAILED`. Screenshots land in `shots*/` (git-ignored); look at them for every changed screen. One browser test at a time.

## The v4.14 checks (run separately, not in runall)
All pin the clock to Wednesday 7 October 2026, 10:00 (`sdlib.js`), print `FAIL <check> ...` lines, and exit 1 on a fail.
- `node -r ./with-sample.js contrast.js`: full axe-core scan, motion off, 22 screens x phone/laptop x light/dark (88 checks). Gate for accessibility.
- `node -r ./with-sample.js tapprobe.js`: 50 timed screen changes; a tap at the button's settled centre must land within 150 ms (95th percentile), every direction under 250 ms, the screen fully shown by 600 ms, plus edge cases and the "Transition was skipped" check. `--reduce`: reduced motion runs no animation, in both the OS and the app setting.
- `PLANT=s3 node -r ./with-sample.js audit.js`: opens every screen and taps every safe button; 0 page errors, and tap problems no worse than `baseline/audit.json` (3 runs). Axe here is a report only (it runs with motion on).
- `node t21x3.js`: t21 three times; each screen's median open time against `baseline/t21.json`.
- `node firetest.js [id-prefix]`: runs the planted faults in `baseline/plants.json` and checks each one trips exactly its expected FAIL checks. A check that has never failed is not trusted.
- Baselines: `WRITE_BASELINE=1` on runall.sh, audit.js, tapprobe.js and t21x3.js records the reference run (v4.13 with the v4.14 checks).

## What each test covers
- t2, t3, t5, t6, t7: older whole-app flows, layout at many sizes, and offline use from a subfolder (t7: service worker, manifest, offline reload, no errors)
- t8: flashcards, persistence, backup round-trip, blurt, OCR offline, fuzzy search, mind map
- t9: real PowerPoint + PDF import, notes, summary, flashcards, podcast, search, explain
- t10: the 12 upgrades of v4.2 · t11: sync between two devices (needs public relays) · t12: podcast falls back to the device voice
- t13: clean slate + import flow · t14: v4.4 upgrades · t15: textbook reader, teach it back, handwriting, IndexedDB v7 stores
- t16: find in book, pinch, continue reading · t17: study tiles, shortcut rows, tips · t18: swipe, shortcuts, text size, quick add, recent searches, tab slide direction
- t19: import progress screen · t20: 1,000-page book · t21: 20,000-page book (run `node mkhandbook20k.js` first; slow, not in runall; `t21x3.js` runs it three times)
- t22: diagrams from PDFs · t23: learn step by step · t24: profiles · t25: online AI with a pretend Claude API
- t26: hard PDFs: dot-leader contents, bold-only headings, no structure, scanned books read with text recognition (`node mkhard.js` makes them)
- `mksumtest.js` makes `sumtest/` (memory.pptx, methods.pdf, biopsych.docx, lecture.wav, today.png) for t9, t10, t13, t14
- Port: `SD_PORT` (and `SD_PORT2` for t7) are required; never 8765 on JJ's laptop
- t2, t5, t7, t8 need the old sample subjects inside `data.js` (runall swaps `sample-data.js` in and restores it); t3, t6, t9–t12 run with `node -r ./with-sample.js`
- axe412.js: accessibility of the online AI screens · comp412.js: puts light and dark screenshots side by side · mk*.js: make the PDF fixtures
