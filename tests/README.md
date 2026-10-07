# Study Desk tests

Browser tests with Playwright, plus axe-core for accessibility. The app has no build step; the tests drive the real app in Chromium.

## First time
```bash
cd tests
npm install
npx playwright install chromium
```

## Servers
```bash
# 1. the app, from the repo root
python3 -m http.server 8765
# 2. only for t7 (works offline from a subfolder): serve a folder containing a link "study-desk" -> the repo
mkdir -p ../../pages-root && ln -s "$(pwd)/.." ../../pages-root/study-desk
cd ../../pages-root && python3 -m http.server 8777
```

## Run
```bash
bash runall.sh      # everything; prints one line per test; output in reg/
node t25.js         # one test
```
Every test prints PASS/FAIL lines and ends with `ALL PASS` or `N FAILED`. Screenshots land in `shots*/` (git-ignored); look at them for every changed screen.

## What each test covers
- t2, t3, t5, t6, t7: older whole-app flows, layout at many sizes, and offline use from a subfolder (t7)
- t8: flashcards, persistence, backup round-trip, blurt, OCR offline, fuzzy search, mind map
- t9: real PowerPoint + PDF import, notes, summary, flashcards, podcast, search, explain
- t10: the 12 upgrades of v4.2 · t11: sync between two devices (needs public relays) · t12: podcast falls back to the device voice
- t13: clean slate + import flow · t14: v4.4 upgrades · t15: textbook reader, teach it back, handwriting, IndexedDB v7 stores
- t16: find in book, pinch, continue reading · t17: study tiles, shortcut rows, tips · t18: swipe, shortcuts, text size, quick add, recent searches
- t19: import progress screen · t20: 1,000-page book · t21: 20,000-page book (run `node mkhandbook20k.js` first; slow, not in runall)
- t22: diagrams from PDFs · t23: learn step by step · t24: profiles · t25: online AI with a pretend Claude API
- t26: hard PDFs: dot-leader contents, bold-only headings, no structure, scanned books read with text recognition (`node mkhard.js` makes them)
- `mksumtest.js` makes `sumtest/` (memory.pptx, methods.pdf, biopsych.docx, lecture.wav, today.png) for t9, t10, t13, t14
- Port: set `SD_PORT` (and `SD_PORT2` for t7) if 8765/8777 are taken
- t2, t5, t7, t8 need the old sample subjects inside `data.js` (runall swaps `sample-data.js` in and restores it); t3, t6, t9–t12 run with `node -r ./with-sample.js`
- axe412.js: accessibility of the online AI screens · comp412.js: puts light and dark screenshots side by side · mk*.js: make the PDF fixtures
