# Study Desk roadmap: "Learn it your way"

JJ's goal (2026-10-07, in his words, summarised): turn every PDF into the forms people actually learn from — visual (spider diagrams, mind maps, pictures), audio that isn't bland, talking to the app and to each other, and **debating with the app**. It must hook students so they don't switch off after 30 minutes, while still giving them every important fact in their material. Build something no app in South Africa has.

Evidence and library details: `docs/research-learning-modes.md`. Read it before building any phase.

## Guiding rules for every phase

- **Variety and dual coding, not "learning styles".** Research does not support matching teaching to a person's "style" (Pashler et al. 2008). What does work for everyone: combining words with structural pictures (dual coding), testing yourself (retrieval practice, the strongest effect), spacing (FSRS already does this), interleaving similar topics, and explaining or arguing (self-explanation). So the app offers every format to everyone and never asks "are you a visual learner?". In-app copy should say "Pick the way that works for you today."
- **Every mode makes the learner retrieve, not just consume.** Podcasts pause to ask, maps hide labels to test, debates demand evidence, games quiz.
- **Offline first, Claude optional.** Every feature has an on-device version built from the book's own sentences (extractive, nothing invented). Claude, on the person's own key, upgrades quality and must cite pages; the app checks citations exist before showing.
- **Lazy-load heavy parts** and show their download size before downloading (phones, South African data costs). Big models only on Wi-Fi after a clear button.
- **Each result feeds FSRS** where it can (weak debate answer → the linked cards come back sooner).
- Same quality bar as always (CLAUDE.md section 3).

## Phase 1: See it (visual forms)

1. **"Map" tab on each subject, chapter and topic** with three views:
   - **Mind map / spider diagram:** markmap 0.18.12 + d3 7.9.0 (MIT/ISC). Build Markdown from chapters → topics → key sentences and key terms, render collapsible and zoomable. A radial "spider" layout with d3-hierarchy. Replaces/extends today's `V.map`.
   - **Concept map:** Cytoscape.js 3.34.3 + cytoscape-fcose (MIT). Nodes = key terms (from the summary engine's RAKE terms and definitions), edges = relations found in the same sentence, labelled with the verb phrase. Tap an edge → the sentence and page it came from.
   - **Timeline and flowchart:** Mermaid 12.1.0 (MIT, heavy: load the ESM entry and only the chunks needed, on demand). Timeline from dates/years and their sentences; flowchart from numbered steps and "first / then / finally". With Claude: Claude writes the Mermaid source, validate with `mermaid.parse()`, fall back to the on-device version on error.
2. **Test yourself on a map:** hide node labels and tap to reveal (like picture cards), and "rebuild the map" drag exercises.
3. **Pictures:** rank the figures already cut out of the PDF for each topic; optional "sketchnote" look with Rough.js 4.6.6. With Claude: an SVG explainer diagram per topic (sanitise: no scripts, no `on*` attributes, no external links).
4. **Export** maps as PNG/SVG into the topic's notes or share.

## Phase 2: Hear it (audio that isn't bland)

1. **Better voices:** kokoro-js 1.2.1 (Apache-2.0, 28 English voices, much livelier than Piper). Optional "Download better voices (92 MB)" on Wi-Fi; WebGPU when available, WASM otherwise. Keep Piper as the small fallback. Check speed on a mid-range Android and an iPhone before committing to it.
2. **Two-host study podcast:** host A explains, host B is the curious sceptic who asks, reacts and quizzes. On device: a template dialogue built around the book's own sentences (no rewriting), questions from flashcards, interjections from a pool, varied pace, short pauses and a sound between topics. With Claude: a JSON script `[{speaker, text, cite}]` where every factual line cites its page; synthesis still on the device.
3. **Recall pauses:** every ~5 minutes the podcast stops and asks; the student answers out loud (Moonshine) or taps; the answer is checked and fed to FSRS.
4. **Short episodes** (~5 minutes per topic), a queue, speed control, lock-screen controls (Media Session API), and listening offline.
5. Licence note: Piper and the eSpeak-based phonemiser are GPL-3. Fine for a free open-source app; flag to JJ if the app is ever sold as a closed product.

## Phase 3: Say it (talk to the app)

1. **Voice mode:** hands-free with @ricky0123/vad-web 0.0.31 (ISC) for detecting speech + the existing Moonshine speech-to-text (Whisper via transformers.js for other languages). Push-to-talk as the default on iPhone. Barge-in: stop speaking when the student starts.
2. **Voice commands without AI:** "next card", "explain again", "quiz me on chapter 3", "read me the summary".
3. **Talk to your book:** ask a question out loud; on device the answer is the best-matching passages (search by meaning) read aloud with page numbers; with Claude, a spoken explanation that cites pages.

## Phase 4: Argue it (debate mode — the unique feature)

No app we found does a student-versus-app debate that is scored against the student's own source. NotebookLM only has two AI hosts debating while you listen.

1. The app picks a **claim** from the topic (a key sentence or a common mistake) and takes a side — sometimes deliberately wrong ("devil's advocate").
2. The student agrees or rebuts **with evidence**, by voice or typing. Ask for confidence first (confident mistakes that get corrected are remembered best).
3. The app scores the rebuttal: key terms and meaning compared with the source sentence; it counters once, then reveals the source quote and page.
4. Result feeds FSRS (weak rebuttal → linked cards due sooner). 3–5 exchanges per debate, a running score, a "debate streak".
5. Opponents: on device, rule-based (wrong positions made by negation or swapping a key term with a related one from the same topic); on a laptop with Chrome's built-in AI, Gemini Nano plays the opponent; with Claude, the best opponent and judge, streaming its replies into the voice.
6. Modes: "Prove me wrong", "Defend this", "Spot the lie" (one false statement among three), "Exam examiner" (asks follow-ups like an oral exam).

## Phase 5: Together (study with a friend)

Over the existing encrypted peer-to-peer link (Trystero; note: Trystero 0.26 moved to `@trystero-p2p/torrent` — keep the vendored version pinned or migrate deliberately).

1. **Live quiz battle:** both answer the same questions; speed + correctness = points; after each round, the source quote. Each player's own FSRS updates.
2. **Co-op round:** a shared team goal ("80% together") next to the competition (the mix works better than either alone).
3. **Shared debate:** one side each, the app moderates (turn timer, push-to-talk, scoring evidence); optional voice between phones.
4. **Teach a friend:** one explains a topic by voice, the other gets three check questions.
5. Privacy note in the UI: nothing is stored on a server; the connection helpers can see IP addresses.

## Phase 6: Stay hooked (engagement, used lightly)

- XP for effort that builds memory (cards reviewed, checks passed, debates won with evidence), never for time spent.
- Daily goal and streak with a freeze day; weekly recap ("you mastered 14 topics").
- Short sessions (Pomodoro already exists), variety prompts ("you've only read today; try a debate"), celebration moments (canvas-confetti already vendored) kept rare.
- A "Today's mix" that interleaves formats and topics automatically.
- Measure what's used (on the device only, no tracking) and show the student their own pattern.

## Also open / known issues

- Confirm all v4.x features on Megan's real iPhone (Safari) — can't be tested from a sandbox.
- Kokoro/Kitten speed on mid-range phones is unverified.
- Mermaid is 1.5 MB gzipped as one file: never load it at startup.
- Chrome built-in AI is desktop only (not Android/iOS); every AI feature needs a phone path.
