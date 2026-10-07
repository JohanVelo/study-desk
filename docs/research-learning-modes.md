# Research: visual, audio, voice, debate, engagement and peer study for Study Desk

Date: 2026-10-07. Versions, licences and dates come from the npm registry (`npm view`, checked today).
File sizes come from the published npm tarballs (raw / gzip -9), measured locally.
Marked [unverified] = from memory or a secondary source I could not confirm.
Constraint for everything below: no build step, vendored ESM or UMD file, works offline from the service-worker cache.

---------------------------------------------------------------------------------------------------

## 0. Things that affect the existing app

1. **Trystero 0.26.0 (2026-10-04) moves the strategies into separate packages.**
   `trystero/torrent` (and nostr, mqtt and the others) now throws:
   `Importing from "trystero/torrent" is deprecated. Install and import from "@trystero-p2p/torrent" instead.`
   `@trystero-p2p/torrent` is 0.26.0, MIT. Pin the version you vendor; don't let a CDN float to `latest`.
2. **Licence risk for Piper.**
   - Upstream Piper moved to `OHF-Voice/piper1-gpl`, which is **GPL-3.0**. It embeds espeak-ng (GPL-3.0) for phonemes.
   - `@mintplex-labs/piper-tts-web` 1.0.5 (2026-08-11) is labelled MIT, but it runs espeak-ng compiled to WASM [verify by reading its bundle].
   - The `phonemizer` npm package (Apache-2.0 label, used by kokoro-js) is also "text to phones using eSpeak NG" (stated in its README).
   - A label that says MIT or Apache doesn't remove espeak-ng's GPL. For a free, open-source GitHub Pages app this is usually fine if the app's own source is published under a GPL-compatible licence. It matters if you ever sell a closed build. **Flag this to the owner. It isn't a blocker for a free, open-source PWA.**
   - Piper voice models have **per-voice licences**: some are CC-BY or CC0, a few are non-commercial. Check each voice's MODEL_CARD.
3. **Chrome Prompt API (Gemini Nano) is desktop only.**
   - Source: developer.chrome.com/docs/ai/prompt-api, checked today. The page lists web support as Chrome 148 and says it is "still being developed".
   - Requirements: 22 GB free disk, and either a GPU with more than 4 GB VRAM or 16 GB RAM with 4+ cores.
   - **Not supported on Android, iOS, or ChromeOS devices that aren't Chromebook Plus.** Any feature built on it needs a phone fallback.

---------------------------------------------------------------------------------------------------

## 1. Visual forms of each PDF

### Candidates (verified)

| Library | Version (date) | Licence | Vendor file | Size raw / gz | Notes |
|---|---|---|---|---|---|
| markmap-view + markmap-lib | 0.18.12 (2025-06-12) | MIT | `markmap-view/dist/browser/index.js` (IIFE, needs global `d3`) + `markmap-lib/dist/browser/index.iife.js` | 50 KB / 12 KB + 677 KB / 171 KB | Markdown headings become a collapsible, zoomable mind map. Also has `markmap-autoloader` (14 KB) and `markmap-toolbar`. No release in 16 months but stable. |
| d3 | 7.9.0 (2024-03-12) | ISC | `d3/dist/d3.min.js` | 280 KB / 92 KB | Needed by markmap. d3-hierarchy (3.1.2, ISC) gives tree, cluster and radial layouts for a spider diagram. |
| Mermaid | 12.1.0 (2026-10-02) | MIT | `dist/mermaid.min.js` (UMD) **or** `dist/mermaid.esm.min.mjs` + `dist/chunks/mermaid.esm.min/*.mjs` | UMD **5.49 MB / 1.57 MB gz**; ESM entry 31 KB with 208 lazy chunks (5.4 MB total) | flowchart, timeline, mindmap, kanban, treeView, architecture, radar. Heavy. Lazy-load it only on the "Diagram" tab. Its optional ELK layout uses elkjs (**EPL-2.0 OR GPL-3.0**); skip it. |
| Cytoscape.js | 3.34.3 (2026-09-07) | MIT | `dist/cytoscape.min.js` or `cytoscape.esm.min.mjs` | 436 KB / 136 KB | Best for **concept maps** (labelled edges, compound nodes, touch pan/zoom, canvas renderer that stays fast on phones). Layouts: cytoscape-fcose 2.2.0 MIT, cytoscape-dagre 4.0.1 MIT. |
| vis-network | 10.1.2 (2026-08-19) | Apache-2.0 OR MIT | `standalone/umd/vis-network.min.js` | 652 KB / 154 KB | Physics graph. Heavier than Cytoscape with less control over layout. |
| vis-timeline | 8.5.4 (2026-08-12) | Apache-2.0 OR MIT | `standalone/umd/vis-timeline-graph2d.min.js` | 549 KB / 156 KB | Interactive zoomable timeline. Too heavy if Mermaid's timeline or a hand-rolled SVG is enough. |
| Rough.js | 4.6.6 (2023-11-20) | MIT | `bundled/rough.esm.js` | 28 KB / 9 KB | Hand-drawn look for SVG or canvas. Can restyle any of the above by redrawing shapes. Old but finished. |
| jsMind | 0.9.1 (2025-12-15) | BSD-3-Clause | `es6/jsmind.js` (+ draggable-node, screenshot plugins) | small | Editable mind map, an alternative if students should drag and edit nodes. |
| simple-mind-map | 0.14.0-fix.3 | MIT | 26 MB unpacked | heavy | XMind-like. Too heavy. |
| Excalidraw | 0.18.1 (2026-04-20) | MIT | needs React + bundler | 47 MB unpacked | **Reject**: React-only and needs a build step. |
| @antv/g6 | 5.1.1 | MIT | 7.6 MB unpacked | heavy | Overkill. |

### Recommendation

- **Mind map / spider diagram**: markmap 0.18.12, about 275 KB gz in total with d3, and the default view.
  - The app already has chapters, topics and extracted notes, so emit Markdown (`# chapter / ## topic / - key sentence`) and render it. Fully offline. Collapsing nodes handles large chapters.
  - "Spider" style: a radial `d3.tree()` from d3-hierarchy in about 80 lines of SVG, with optional Rough.js styling.
- **Concept map** (nodes = key terms, edges = labelled relations): Cytoscape.js 3.34.3 + cytoscape-fcose.
  - Offline: build the edges extractively. Term co-occurrence inside the same sentence gives the edge, and the verb phrase between the terms becomes the label. TF-IDF picks the key terms.
  - With the Claude key: ask the model to return JSON `{nodes:[{id,label}], edges:[{from,to,label,quote}]}` and require each edge to cite a source sentence, so it can be checked against the PDF.
- **Flowchart / timeline**: Mermaid 12.1.0.
  - Vendor the ESM entry and its chunks folder, and precache only the chunks you use: flowchart, timeline, mindmap and the core. Load it on demand, never at startup.
  - Offline timeline: regex-extract dates or years with their sentences, then emit Mermaid `timeline` syntax.
  - Flowchart: detect numbered steps and "first, then, finally" sequences, then emit `flowchart TD`.
  - With the Claude key: Claude writes the Mermaid source. Validate it with `mermaid.parse()` before rendering and fall back to the extractive version on error.
  - Mobile: Mermaid renders to SVG and is fine on phones for diagrams under about 100 nodes. Cap the size.
- **Picture / illustration**:
  - Generating images on the device isn't practical. SD-Turbo-class ONNX models are 1 GB or more and need WebGPU [unverified size].
  - Offline: reuse the figures already extracted from the PDF, ranked by caption match to the topic. Lucide icons 1.52.0 (ISC) can serve as concept glyphs.
  - With the Claude key: ask for an SVG "explainer illustration" or labelled diagram. Claude writes SVG well. Sanitise it before inserting: strip `<script>`, `on*` attributes and external hrefs.
- **Hand-drawn theme toggle**: Rough.js across all views ("sketchnote mode") for 9 KB gz. It's cheap, and dual coding comes from the visuals themselves, not from the sketch style.

---------------------------------------------------------------------------------------------------

## 2. Audio that is not bland: an expressive two-host podcast

### TTS candidates

| Engine | JS package (version, date) | Licence | Model download | Voices / expression | Phone viability |
|---|---|---|---|---|---|
| **Kokoro-82M** | kokoro-js 1.2.1 (2025-05-03), depends on @huggingface/transformers ^3.5.1 + phonemizer | Apache-2.0 (weights Apache-2.0); phonemizer = espeak-ng, see §0 | Files in `onnx-community/Kokoro-82M-v1.0-ONNX` `onnx/` (from HF listing): fp32 326 MB, fp16 163 MB, q4f16 155 MB, uint8f16 114 MB, quantized (q8) 92.4 MB, q8f16 86 MB. Each voice style file is small (about 0.5 MB) [unverified]. | 28 English voices: af_heart, af_bella, af_nicole, am_michael, am_fenrir, am_puck, bf_emma, bm_george, bm_fable, and others. Clearly more natural and lively than Piper. No emotion tags. `tts.stream(TextSplitterStream)` streams sentence by sentence. | q8 (92 MB) on WASM works on recent phones but is slower than real time on mid-range Android [unverified]. On WebGPU the README recommends fp32 (326 MB). |
| **Kitten TTS** | kitten-tts-js 0.1.2 (2026-02-24), an unofficial port | Apache-2.0 | nano int8 about 25 MB, nano 56 MB, micro 41 MB, mini 80 MB | 8 voices (Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo). Less expressive than Kokoro. The int8 nano has reported issues. | Best for low-end phones. |
| **Piper** (current) | @mintplex-labs/piper-tts-web 1.0.5 | engine GPL-3.0 via espeak-ng; voices vary | 20 to 75 MB per voice | Flat prosody. "high" quality voices and multi-speaker `libritts_r` give variety but not emotion. | Fast on phones. |
| Supertonic 3 | no npm package; repo has a `web/` onnxruntime-web example | code MIT, **model OpenRAIL-M** (use restrictions) | about 99M params [unverified size] | **Inline `<laugh> <breath> <sigh>` tags**, 31 languages, the most expressive option seen | **Repo is being archived, with no further development.** Use for ideas only. |
| Web Speech `speechSynthesis` | built in | n/a | 0 | OS voices. Good on iOS and macOS (Siri voices), variable on Android. | Free fallback, but the voice can't be guaranteed. |

### Recommendation: "Two-host Study Podcast"

- **Engine**: kokoro-js 1.2.1, run in the existing TTS worker.
  - Download `model_quantized.onnx` (q8, 92 MB) once on Wi-Fi, after an explicit "Download better voices (92 MB)" button. Cache it with the Cache API or OPFS.
  - Device: `"webgpu"` when `navigator.gpu` exists, else `"wasm"`. Keep Piper or Kitten as the small fallback.
  - Vendor `kokoro-js/dist/kokoro.web.js` (2.1 MB raw / 0.9 MB gz, which already bundles transformers.js and phonemizer). Point `env.localModelPath` at your own copy of the model, or fetch it from the HF CDN on first use.
- **Make it not bland: the script matters more than the voice.** Ideas from podcastfy (Apache-2.0, config only):
  - Its config has `roles_person1: "main summarizer"`, `roles_person2: "questioner/clarifier"`, `dialogue_structure`, `engagement_techniques: [rhetorical questions, anecdotes, analogies, humor]` and `conversation_style: [engaging, fast-paced, enthusiastic]`.
  - Use one voice per host, for example `af_heart` (host A, explains) and `am_puck` or `bm_george` (host B, the curious sceptic).
- **Offline, with no LLM: a template dialogue built from extractive content.** No rewriting of facts.
  - Host B asks, generated from the flashcard question: "So what actually is X?"
  - Host A answers with the extracted sentence(s), verbatim.
  - Host B reacts from a pool of interjections ("Wait, really?", "OK, so in other words…"), then gives a recall prompt ("Pause, can you name the three…"). The quiz pauses are retrieval practice.
  - Vary the `speed` parameter by 0.95 to 1.1, insert 250 to 600 ms silences between turns, and add short "stingers" (a WebAudio beep) between topics.
- **With the Claude key**:
  - Generate a script as JSON `[{speaker:"A"|"B", text, cite}]` under the podcastfy-style rules. Require every factual line to carry a `cite` pointing at a source chunk.
  - Optionally add a "Debate" format (host B disagrees and host A defends using the text). That copies NotebookLM's Brief, Critique and Debate formats, so it's parity, not a unique feature.
  - Synthesis still runs locally with Kokoro.
- **Chrome Prompt API on desktop**: the same JSON script generation can run locally with no key. Use `LanguageModel.create({initialPrompts})` and `promptStreaming`.

---------------------------------------------------------------------------------------------------

## 3. Talk to the app, and "debate with the app"

### Speech input

| Option | Version | Licence | Download | Notes |
|---|---|---|---|---|
| Moonshine (already used) | @moonshine-ai/moonshine-js 0.1.29 (2025-07-03); bundle 2.3 MB / 0.8 MB gz | code and English models MIT (non-English legacy models: non-commercial community licence) | tiny quantized: about 27 MB on disk (measured in package); base about 61 MB [secondary source] | English only. Fast on phones. The npm package is stale; moonshine models also run via transformers.js 4.3.1 (`onnx-community/moonshine-*-ONNX`) [unverified ids]. |
| Whisper via transformers.js | @huggingface/transformers 4.3.1 (2026-10-06); `dist/transformers.web.min.js` 454 KB / 128 KB gz | Apache-2.0; Whisper weights MIT | tiny about 40 MB, base about 76 MB, small about 240 MB (secondary source) | Use when the PDF isn't in English (99 languages). |
| Web Speech `SpeechRecognition` | built in | n/a | 0 | Chrome sends audio to Google servers unless `processLocally = true`. On-device mode is **experimental** (MDN), with `SpeechRecognition.available()/install()`. Chrome version not verified. Safari supports it with on-device for some languages [unverified]. |
| **VAD for hands-free** | @ricky0123/vad-web 0.0.31 (2026-09-12) | ISC | `dist/bundle.min.js` 69 KB / 21 KB gz + `silero_vad_v5.onnx` 2.3 MB + onnxruntime-web WASM (peer dep, about 10 MB WASM [unverified]) | `vad.MicVAD.new({onSpeechStart, onSpeechEnd(Float32Array@16kHz)})`. Plain `<script>` usage is documented (set `baseAssetPath` and `onnxWASMBasePath` to vendored paths). |

### Local reasoning for debate (no key)

- Chrome Prompt API (Gemini Nano): desktop only, see §0. Best quality-to-cost ratio on laptops.
- WebLLM 0.2.85 (2026-09-08), Apache-2.0. `lib/index.js` is 6.6 MB / 2.2 MB gz, and it needs WebGPU.
  - VRAM needed (from the package's model list): gemma3-1b-it q4f16 711 MB; Llama-3.2-1B q4f16 879 MB; Qwen3-0.6B q4f16 1.4 GB; Qwen3.5-0.8B q4f16 1.6 GB; Qwen3-1.7B 2.0 GB; Qwen3.5-2B 2.2 GB.
  - Downloads are roughly the same size. **Too big and unreliable for phones**; offer it as an opt-in "laptop offline debate" only.
- wllama 3.8.1 (2026-10-02, MIT): llama.cpp in WASM, CPU only, so it works without WebGPU but is slow. Same model-size problem.

### Recommendation: "Debate Mode" (the differentiator)

- **Loop**: VAD hears the student, then Moonshine (or Whisper for other languages) transcribes, then the debater replies, then Kokoro speaks.
  - Barge-in: when `onSpeechStart` fires, stop TTS playback.
  - Push-to-talk button as the default on iOS, where an always-on mic plus audio playback is fragile [unverified].
- **Debate structure** (this is retrieval practice plus elaborative interrogation):
  1. The app picks a **claim** from the topic: a key sentence or a "common misconception" flashcard.
  2. It states its position, sometimes deliberately wrong (a "devil's advocate" toggle). The student must agree or rebut **using evidence**.
  3. The app scores the rebuttal: does it mention the key terms or concepts of the source sentence? Then it counter-argues once and reveals the source quote with its page number.
  4. The result feeds FSRS: a weak rebuttal counts as Again or Hard on the linked cards.
- **Offline, no LLM**: rule-based debate from extractive material.
  - Claims come from extracted sentences. "Wrong" positions are made by negation, or by swapping a key term with a sibling term from the same topic. Distractors are generated the way MCQ distractors are.
  - Scoring: keyword and embedding overlap with the source sentence. transformers.js with a small embedding model such as all-MiniLM-L6-v2 is about 23 MB q8 [unverified].
  - The arguments are scripted, but it is fully local and works on phones.
- **Desktop Chrome**: the Prompt API plays the opponent, with `initialPrompts` containing the source chunks and the rule "argue only from these; cite chunk ids".
- **With the Claude key**: the best experience. Stream the opponent's reply and send each sentence into Kokoro as it arrives. The system prompt:
  - fixes the position;
  - forbids claims that aren't in the provided chunks;
  - has the model end each turn with a question.
- **Voice-only quick commands** ("next card", "explain again", "quiz me on chapter 3"): regex intents on the Moonshine transcript, with no LLM needed.

---------------------------------------------------------------------------------------------------

## 4. What keeps learners engaged: the evidence

Use this as the design rationale. Effect sizes marked [mem] are from memory of the paper; the rest were checked today.

- **Retrieval practice / testing effect**: the strongest, most robust finding.
  - Adesope, Trevisan and Sundararajan (2017, *Rev. Educ. Res.* 87(3):659–701): practice tests beat restudy "and all other comparison conditions" (abstract checked). Overall g of about 0.61, and about 0.51 vs restudy [mem].
  - Dunlosky et al. (2013, *PSPI*) rate practice testing and distributed practice as **high utility**; elaborative interrogation and self-explanation moderate; highlighting, rereading and summarising low [mem].
  - **Implication: every mode (podcast pauses, debate, quiz battle) should make the learner retrieve, not just consume.**
- **Spacing**: Cepeda et al. (2006, *Psych. Bull.*) meta-analysis: spaced is better than massed, and the best gap grows with the retention interval [mem]. FSRS (ts-fsrs 5.4.2, MIT, 2026-09-01) already covers this.
- **Interleaving**: Brunmair and Richter (2019, *Psych. Bull.*): an overall moderate benefit of about g 0.42. Large for visual categories (paintings, about 0.67), smaller for maths (about 0.34), and *negative* for word lists [mem; abstract not retrievable].
  - Implication: interleave topics in quizzes and debates when the topics are confusable. Don't mix vocabulary lists.
- **Dual coding / multimedia**: Paivio's dual-coding theory and Mayer's multimedia principle say words plus relevant pictures beat words alone. The coherence principle says to cut decorative images, and the redundancy principle says not to show identical text on screen while it is narrated [mem].
  - Implication: mind maps and concept maps aid learning when they show *structure*. Decorative illustrations do not.
- **"Learning styles" (VARK matching)**: Pashler, McDaniel, Rohrer and Bjork (2008, *PSPI*) found no adequate evidence for the meshing hypothesis (matching instruction to a preferred modality). Later studies such as Rogowsky et al. (2015) and Husmann and O'Loughlin (2019) agree [mem].
  - **Be honest in-app**: offer multiple formats because *combining* modalities (dual coding) and *variety* help everyone, not because a learner "is visual". Don't run a VARK quiz.
- **Gamification**: Sailer and Homner (2020, *Educ. Psych. Rev.*), meta-analysis, checked:
  - cognitive g = 0.49, motivational g = 0.36, behavioural g = 0.25 (small but significant);
  - **game fiction and social interaction moderate the behavioural outcomes, and combining competition with collaboration was especially effective.**
  - Implication: a quiz battle with a friend plus a shared team goal is better supported than solo points.
  - Use streaks and XP lightly. Reward *retrieval effort* (cards reviewed, debates won with evidence), not time spent.
- **Attention**: the "8-second attention span" and "10-minute lecture attention" figures are not well supported [mem: Bradbury 2016 critique].
  - What works: short segments, interpolated questions (testing during lectures reduces mind-wandering; Szpunar et al. 2013, *PNAS*) [mem], and active responding.
  - Implication: about 5-minute podcast segments with recall pauses; debates of 3 to 5 exchanges.
- **Generation and desirable difficulties** (Bjork) [mem]:
  - generating answers and explanations beats reading them;
  - self-explanation and argumentation (debate) count here.
- **Hypercorrection effect**: errors made with high confidence that are then corrected are remembered well [mem]. So ask for a confidence rating before revealing the answer in debates and quizzes.

---------------------------------------------------------------------------------------------------

## 5. Study with a friend over the existing P2P sync

The app already uses Trystero (WebRTC with public signalling). Note the 0.26 package split in §0.

- `room.makeAction('quiz')` sends `{type:'q'|'answer'|'score', ...}`.
- Data channels are low latency, so a live quiz battle works.
- **Live Quiz Battle**:
  - The host picks a deck or chapter and sends the question ids, not the content, if both peers have the same PDF. Otherwise it sends the card text.
  - Both answer, and speed plus correctness gives the points.
  - After each round, show *why* with the source quote. Each player's answers update their **own** FSRS state.
  - Sailer and Homner support adding a **co-op round** ("team must reach 80% together") next to the competition.
- **Shared Debate**: one student is assigned FOR and the other AGAINST a claim from the PDF. The app is the moderator:
  - turn timer, push-to-talk;
  - optional voice via `room.addStream()` (Trystero supports media streams);
  - it scores evidence use with the same rubric as §3;
  - with the Claude key, the host's device can act as judge.
- **Teach-back / explain-to-a-friend**: peer A explains a topic by voice, and peer B gets three auto-generated check questions. This is "learning by teaching" (protégé effect) [mem].
- **Privacy**: P2P only, with nothing stored server-side. Room codes are shared out of band. Public signalling trackers see the IPs; say so in the UI.
- **Fun extras**: canvas-confetti 1.9.4 (ISC), and a short Kokoro-voiced "announcer" line for round winners.

---------------------------------------------------------------------------------------------------

## 6. What competitors already offer, and what would be unique

| Product | Relevant features (checked unless marked) |
|---|---|
| **NotebookLM** | Audio Overviews with **Brief, Critique and Debate** formats (Google blog, Sep 2025); Video Overviews; flashcards and quizzes with "explain"; Learning Guide (Socratic tutor). Interactive "join the conversation" audio mode and Mind Maps [mem, not confirmed in sources fetched]. Cloud only, Google account. |
| **Quizlet** | Flashcards, Learn mode, practice tests, Quizlet Live (classroom team game) [mem]. |
| **Knowt** | AI notes from lectures and PDFs, flashcards with spaced repetition, quizzes, games; voice tutoring that quizzes you; podcast from your content. Freemium, Ultra $149.99/yr (stork.ai comparison). |
| **StudyFetch** | Guides, flashcards and quizzes from PDF, audio and video; 24/7 AI tutor through text, calls and visual explanations; study schedules. Paid. |
| **Speechify** | 1,000+ voices with emotion control, AI podcast from documents (style, depth, tone), hands-free voice chat with documents, summaries, quizzes. Cloud. |

**What's unique to Study Desk (defensible):**
1. **Everything runs on the device and offline**: podcast voices, speech input, VAD, mind and concept maps, FSRS. No account. Competitors are cloud-only.
2. **Debate where the student argues back by voice and is graded against the source with page citations**, which then feeds spaced repetition.
   - NotebookLM's "Debate" is two AI hosts debating *while you listen*. That's passive, not student vs app.
   - **Debate is unique only as an interactive, retrieval-scored loop.** Don't market "debate podcasts" as new.
3. **Peer-to-peer quiz battle and debate without a server.**
4. Huge PDFs (20k pages) split into chapters locally.
5. Honest "no learning styles" framing: the app offers formats for dual coding and variety.

---------------------------------------------------------------------------------------------------

## 7. Build list (vendor exact files into `/vendor`, precache lazily)

| Need | Package@version | File to vendor | Load when |
|---|---|---|---|
| Mind map | markmap-view@0.18.12, markmap-lib@0.18.12, d3@7.9.0 | `dist/browser/index.js`, `dist/browser/index.iife.js`, `dist/d3.min.js` | "Mind map" tab |
| Spider / radial | d3@7.9.0 (d3-hierarchy included) | same d3.min.js | same |
| Concept map | cytoscape@3.34.3 + cytoscape-fcose@2.2.0 (+ cose-base 2.2.0, layout-base 2.0.1) | `dist/cytoscape.esm.min.mjs` + UMD builds of the fcose chain | "Concept map" tab |
| Flowchart / timeline | mermaid@12.1.0 | `dist/mermaid.esm.min.mjs` + needed `dist/chunks/mermaid.esm.min/*.mjs` (no .map) | on demand |
| Sketch style | roughjs@4.6.6 | `bundled/rough.esm.js` | toggle |
| Icons | lucide@1.52.0 (ISC) | individual SVGs | static |
| Voices | kokoro-js@1.2.1 | `dist/kokoro.web.js` + model `onnx/model_quantized.onnx` (92.4 MB) + voice .bin files | opt-in download |
| Small-voice fallback | kitten-tts-js@0.1.2 (Apache-2.0; ships ESM src, needs onnxruntime-web, phonemizer, jszip; may need an import map, not a single file) or keep Piper | n/a | low-end devices |
| Hands-free | @ricky0123/vad-web@0.0.31 + onnxruntime-web (pin a version the VAD supports, ^1.17) | `dist/bundle.min.js`, `dist/silero_vad_v5.onnx`, `ort.wasm.min.js` + `ort-wasm-simd-threaded.*` | voice mode |
| STT | existing Moonshine; transformers@4.3.1 `dist/transformers.web.min.js` for Whisper multilingual | n/a | voice mode |
| Local LLM (laptop) | Chrome Prompt API (built in); optional @mlc-ai/web-llm@0.2.85 with gemma3-1b-it-q4f16_1-MLC (711 MB) | `lib/index.js` | opt-in only |
| P2P | @trystero-p2p/torrent@0.26.0 (or stay pinned on the current trystero version) | dist ESM | already loaded |
| Confetti | canvas-confetti@1.9.4 | `dist/confetti.browser.js` | quiz battle |

**Offline vs Claude key, in summary**: every feature has an extractive or rule-based offline path. The Claude key (opus) only *upgrades* four things:
- concept-map relations;
- the podcast script;
- the debate opponent and judge;
- SVG illustrations.

Each Claude output must cite source chunks, and the app checks those citations exist before showing the output. That keeps "no AI rewriting on device" true and makes cloud output verifiable.

## Not verified
- Kokoro and Kitten real-time factor on mid-range phones.
- Exact Moonshine base size.
- The `onnx-community/moonshine` model ids.
- Chrome version for on-device `SpeechRecognition`.
- iOS mic plus playback behaviour for barge-in.
- NotebookLM Interactive mode and Mind Map (not confirmed in sources fetched).
- Supertonic model size.
- Whether piper-tts-web bundles espeak-ng (very likely, not read).
- All [mem] effect sizes.
