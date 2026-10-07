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
- **Subjects:** chapter → heading → subheading with page ranges, summaries, and an editor (add by hand, or import from a PDF, PowerPoint or Word file).
- **Summaries you can trust:** every bullet is a sentence from your own notes (nothing is made up). The summary covers every heading or slide, always keeps definitions, formulas, numbers, dates and "exam" lines, checks that every key term appears, and shows how much it covered. Definitions become flashcards, and the same summary feeds podcasts, search, the blurt check and the explain sheet.
- **Practice questions from your notes:** multiple-choice questions are built from your own sentences and definitions (which term matches this description, and fill the gap). The wrong answers are other real terms, people or years from the same topic, so nothing is invented.
- **Maths and formulas:** write `$E = mc^2$` in your notes and it is typeset properly, in notes, summaries, flashcards and questions (Temml, MathML).
- **Formatted notes:** headings, bold, bullets, tables and links, with a small toolbar and a preview.
- **Sketches:** draw diagrams with a finger, mouse or Apple Pencil, saved with the topic.
- **Reminders:** add exams and the next two weeks of study sessions to the phone or laptop calendar (.ics), and the app icon shows how many flashcards are due.
- **Phone ↔ laptop sync:** a pairing code connects the two devices directly, end to end encrypted, and copies your study data. Nothing is stored on a server.
- **Natural podcast voices:** optional on-device voices (Piper) that sound like a person, downloaded once and then offline.
- **Lecture recordings to text:** a recording is written out on the device (Moonshine), then summarised like any other notes.
- **Export to Anki:** all flashcards as an .apkg deck.
- **AI explanation (laptop only):** if the browser has built-in AI (Chrome), it can explain your notes in plain words. Always labelled as a draft to check.
- **Word documents:** .docx files import like PDFs and PowerPoints.
- **Any textbook PDF imports (v4.13):** contents pages with dot leaders ("Cells ........ 5"), headings that are only bold, and PDFs with no structure at all (split into parts of a few pages) all import now. **Scanned books** (pictures of pages) are recognised and read with on-device text recognition: the contents page first, then each topic's pages as its notes. If you type the contents list yourself, the PDF stays attached so its pages still become notes.
- **Imports:** PDFs are read with their headings, without running headers, footers or page numbers. PowerPoints are read in slide order with titles, bullet levels, tables and speaker notes. PDFs without bookmarks or a contents page are split by their headings.
- **Listen:** study podcasts read aloud by the device, plus your own lecture recordings.
- **Review:** flashcards made automatically from notes and summaries, scheduled with FSRS spaced repetition (the same method Anki uses), plus a "blurt check" that compares what you remember with your notes.
- **Snap a page:** photograph a textbook page and the text is read on the device (Tesseract), no upload.
- **Mind map** of every subject, and search that forgives typos.
- **Progress, Calendar:** questions, weak topics, mistakes, the revision ladder and an animated weekly recap.
- **Picture cards:** cover the labels on a diagram; each box becomes a flashcard (image occlusion).
- **Practice exam:** timed questions from your notes, marked at the end, with a breakdown by chapter.
- **Search by meaning (optional, about 23 MB):** finds passages in your notes that mean the same thing, and only ever shows your own words.
- **Focus sounds:** rain, brown noise or waves, generated on the device. **Study rhythm:** a streak heatmap on Progress.
- **Pair by QR code** for sync, and a short guided tour (Settings → Help).
- **Read the textbook in the app:** keep a PDF on the device, read it with zoom and a contents list, highlight lines, and turn highlights into flashcards for the topic on that page. Each topic has a Read button that opens its pages. Find words anywhere in the book, pinch or press + and − to zoom, use the arrow keys on a laptop, and pick up where you left off from Today. Cards made from highlights show their page.
- **Teach it back:** explain a topic out loud. It's written out on the device and checked against your notes, like a spoken blurt check.
- **Easy to find your way:** every topic opens with six tiles (read or notes, flashcards, practise, blurt check, teach it back, listen), long pages like Settings and Progress have a row of shortcuts, and short tips explain a screen the first time you see it. If a few earlier sessions weren't ticked off, Today asks once whether you did them or want them moved, and the practice filters fold away until you need them.
- **Quicker every day:** on a phone, swipe a session right to tick it off or left to move it later (with a small buzz on Android). Press and hold the app icon for shortcuts (start the next session, review flashcards, search, add). Today has an Add button for a quick flashcard, notes or sketch, search remembers recent searches, and Settings has a Larger text option.
- **Very big books:** a PDF of any size (tested with 1,000 and 20,000 pages, up to 2 GB) is read page by page with a live progress screen (step, page X of N, time left, Cancel), and the text of every topic is saved as notes. Big subjects open fast: the summary of everything and the mind map fold into chapters, and practice questions are kept on the device so they aren't rebuilt each time.
- **Every detail or short summaries:** a switch on each topic's summary. "Every detail" keeps a line from every paragraph plus all definitions, formulas, numbers, lists and examples ("Examples from your notes").
- **Diagrams and pictures from the PDF:** figures are cut out with their caption and page, shown on their topic, with the sentences in the book that explain them, and can become picture cards.
- **Learn it step by step:** a topic is cut into short parts (a few points at a time, with its diagrams and examples), each followed by a quick check. Missed checks can be gone over again or turned into flashcards.
- **Profiles:** several people can share one phone or laptop (Settings → People on this device). Each person has their own subjects, books, notes, flashcards and progress, kept fully apart. With more than one person, the top bar shows whose profile is open and switches with one tap. The first profile keeps the original storage, so nothing moves on update.
- **Online AI (optional, Claude):** add your own Anthropic API key under Settings → Online AI and each topic gets an "Explain this topic" button. Claude reads the topic's textbook pages as pictures (up to 20 pages, so diagrams, tables and formulas are seen as printed) and explains them: key ideas with page numbers, every diagram, worked examples, common mistakes and 5 questions that can become flashcards. Each diagram gets "Explain this diagram" too. Nothing is sent until you tap the button, the key stays on the device in that profile, answers are saved so opening them again is free, and everything is marked as AI-written. It costs a few cents per explanation on your Anthropic account. Server-side fallbacks are on, so a request a safety check declines is retried on another model. Your notes are never changed by the AI.
- **Write by hand:** write with a finger or Apple Pencil and turn it into text for your notes (works best with clear print).
- Search everything with the magnifier (or press `/` on a laptop).

## Put in real study data
Study Desk starts empty. Everyone adds their own subjects in the app with **Import a file**, a three-step guide: pick or create the subject, choose a PDF, PowerPoint or Word file (or type the chapters), then check the list before anything is added. Subjects can also be added by hand under Subjects → Edit my subjects.

Copies that still held the old sample subjects remove them once on update (v4.3). A sample subject is kept if anyone wrote notes, a sketch, a question or a flashcard in it, and anything added by hand is never touched. Settings → Start again erases everything in the profile that is open.

To ship content with the app instead, edit **data.js** (empty by default). The format is explained at the top of the file. After changing it, open Settings → Data check to see whether anything needs fixing. When you release a new version, bump `VERSION` in `sw.js` so installed copies update.

## Files
- `index.html` app page · `styles.css` design · `app.js` logic · `tools.js` flashcards, blurt, photo-to-text, mind map · `extras.js` questions from notes, maths, Word import, calendar, formatted notes, sketches, charts, Anki, sync, laptop AI · `speech.js` natural voices and recordings-to-text (with `voice-worker.js` and `stt-worker.js`) · `more.js` search by meaning (with `embed-worker.js`), picture cards, practice exams, focus sounds, study rhythm, QR pairing and the tour · `ease.js` topic study tiles, page shortcuts, first-time tips, catching up on missed sessions, swipe, shortcuts, quick add and recent searches · `read.js` the textbook reader with highlights, teach it back, handwriting to text and diagrams from PDFs · `learn.js` learn a topic step by step · `profiles.js` (loaded first) keeps each profile's storage apart · `people.js` the profile screens · `claude.js` the optional online AI (Claude, on your own key) · `summary.js` the summary engine (TextRank, MMR and RAKE, written for this app, no dependencies) · `data.js` study content
- `sw.js` offline cache · `manifest.webmanifest` install details · `icons/` app icons
- `vendor/` GSAP 3.13 with Flip and SplitText (free “no charge” licence), canvas-confetti (ISC), JSZip (MIT), pdf.js (Apache 2.0), ts-fsrs (MIT), MiniSearch (MIT) and Tesseract.js (Apache 2.0)
- `vendor/x/` compromise (MIT), Temml (MIT), mammoth (BSD-2), marked (MIT), DOMPurify (Apache-2.0/MPL-2.0), perfect-freehand (MIT), µPlot (MIT), Trystero (MIT), anki-apkg-export (MIT), sql.js (MIT), driver.js (MIT), lean-qr (MIT), qr-scanner (MIT) and the Anthropic TypeScript SDK (MIT, bundled for the browser and loaded only when online AI is used), with licences in `vendor/x/licenses/`. One local change: µPlot's number formatter falls back to en-GB if the browser reports a locale tag `Intl` rejects.
- `vendor/ai/` transformers.js (Apache-2.0), ONNX Runtime Web (MIT), piper-tts-web (MIT) and piper-phonemize/espeak-ng (GPL-3). Voice and speech models are downloaded from Hugging Face the first time they are used, then cached for offline use.
- `fonts/` Bricolage Grotesque, Atkinson Hyperlegible, JetBrains Mono (SIL Open Font Licence)
- `artifact.html` the same app as a claude.ai preview page

## Host on GitHub Pages
Repository → Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save. The site appears at `https://<user>.github.io/study-desk/`.
