/* Natural podcast voices: Piper text-to-speech (piper-tts-web, MIT; Piper voices from Hugging Face).
   Runs in a worker so the app stays smooth while speech is made. */
import { TtsSession } from "./vendor/ai/piper.mjs";
const base = new URL("./vendor/ai/", import.meta.url).href;
let session = null, current = "";
self.onmessage = async e => {
  const { id, op, voice, text } = e.data || {};
  try {
    if (!session || current !== voice) {
      TtsSession._instance = null;
      session = await TtsSession.create({
        voiceId: voice,
        progress: p => { if (p && /\.onnx$/.test(p.url || "")) self.postMessage({ op: "progress", loaded: p.loaded, total: p.total }); },
        wasmPaths: { onnxWasm: base, piperData: base + "piper_phonemize.data", piperWasm: base + "piper_phonemize.wasm" }
      });
      current = voice;
    }
    if (op === "load") { self.postMessage({ id, ok: true }); return; }
    const blob = await session.predict(text);
    self.postMessage({ id, ok: true, blob });
  } catch (err) { session = null; current = ""; self.postMessage({ id, ok: false, err: String((err && err.message) || err) }); }
};
