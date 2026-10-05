# Study Desk

A personal university study planner: what to study today, exam countdowns, chapter → heading → subheading tracking, practice questions, revision stages and progress. Works offline and installs on phone and laptop (it's a Progressive Web App).

## Install it
Open the site link, then:
- **iPhone / iPad (Safari):** Share button → **Add to Home Screen** → Add.
- **Android (Chrome):** ⋮ menu → **Install app** (or the Install button in Settings).
- **Windows / Mac (Chrome or Edge):** click the install icon at the right of the address bar, or Settings → Install app.
- **Mac (Safari):** File → **Add to Dock**.

Each device keeps its own progress. Use Settings → Backup to move progress between devices.

## Put in real study data
Edit **data.js** only. The format is explained at the top of the file. After changing it, open Settings → Data check to see whether anything needs fixing. When you release a new version, bump `VERSION` in `sw.js` so installed copies update.

## Files
- `index.html` app page · `styles.css` design · `app.js` logic · `data.js` study content
- `sw.js` offline cache · `manifest.webmanifest` install details · `icons/` app icons
- `vendor/` GSAP 3.13 with Flip and SplitText (free “no charge” licence) and canvas-confetti (ISC)
- `fonts/` Bricolage Grotesque, Atkinson Hyperlegible, JetBrains Mono (SIL Open Font Licence)
- `artifact.html` the same app as a claude.ai preview page

## Host on GitHub Pages
Repository → Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save. The site appears at `https://<user>.github.io/study-desk/`.
