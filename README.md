# Study Desk

Live app: https://johanvelo.github.io/study-desk/

A personal university study planner: what to study today, exam countdowns, chapter → heading → subheading tracking, practice questions, revision stages and progress. Works offline and installs on phone and laptop (it's a Progressive Web App).

## Install it
Open the site link, then:
- **iPhone / iPad (Safari):** Share button → **Add to Home Screen** → Add.
- **Android (Chrome):** ⋮ menu → **Install app** (or the Install button in Settings).
- **Windows / Mac (Chrome or Edge):** click the install icon at the right of the address bar, or Settings → Install app.
- **Mac (Safari):** File → **Add to Dock**.

Each device keeps its own progress. Use Settings → Backup to move progress between devices. Backups include progress, plan, subjects and notes; audio recordings stay on the device that added them.

## What it does
- **Today:** the one session to do next, a focus timer, the rest of the day, the week ahead and exam countdowns.
- **Subjects:** chapter → heading → subheading with page ranges, summaries, and an editor (add by hand, or import from a PDF or PowerPoint).
- **Listen:** study podcasts read aloud by the device, plus your own lecture recordings.
- **Review:** flashcards made automatically from notes and summaries, scheduled with FSRS spaced repetition (the same method Anki uses), plus a "blurt check" that compares what you remember with your notes.
- **Snap a page:** photograph a textbook page and the text is read on the device (Tesseract), no upload.
- **Mind map** of every subject, and search that forgives typos.
- **Progress, Calendar:** questions, weak topics, mistakes, the revision ladder and an animated weekly recap.
- Search everything with the magnifier (or press `/` on a laptop).

## Put in real study data
The easiest way is inside the app: Subjects → Edit my subjects. To ship content with the app instead, edit **data.js**. The format is explained at the top of the file. After changing it, open Settings → Data check to see whether anything needs fixing. When you release a new version, bump `VERSION` in `sw.js` so installed copies update.

## Files
- `index.html` app page · `styles.css` design · `app.js` logic · `tools.js` flashcards, blurt, photo-to-text, mind map · `data.js` study content
- `sw.js` offline cache · `manifest.webmanifest` install details · `icons/` app icons
- `vendor/` GSAP 3.13 with Flip and SplitText (free “no charge” licence), canvas-confetti (ISC), JSZip (MIT), pdf.js (Apache 2.0), ts-fsrs (MIT), MiniSearch (MIT) and Tesseract.js (Apache 2.0)
- `fonts/` Bricolage Grotesque, Atkinson Hyperlegible, JetBrains Mono (SIL Open Font Licence)
- `artifact.html` the same app as a claude.ai preview page

## Host on GitHub Pages
Repository → Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save. The site appears at `https://<user>.github.io/study-desk/`.
