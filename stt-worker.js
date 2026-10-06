/* Lecture recordings to text: Moonshine speech recognition (MIT) via transformers.js (Apache-2.0).
   Runs on the device in a worker. transformers.js is loaded from a CDN the first time, together
   with the speech model itself, and both are then cached for offline use. */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js";
env.allowLocalModels = false;
let asr = null, loading = null;
async function load(device) {
  if (asr) return asr;
  if (loading) return loading;
  const gpu = device === "webgpu";
  const files = {};
  loading = pipeline("automatic-speech-recognition", gpu ? "onnx-community/moonshine-base-ONNX" : "onnx-community/moonshine-tiny-ONNX", {
    device: gpu ? "webgpu" : "wasm",
    dtype: gpu ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
    progress_callback: p => {
      if (p.status === "progress" && p.file) { files[p.file] = [p.loaded || 0, p.total || 0]; const v = Object.values(files); self.postMessage({ op: "progress", loaded: v.reduce((a, x) => a + x[0], 0), total: v.reduce((a, x) => a + x[1], 0) }); }
    }
  }).then(p => (asr = p)).catch(e => { loading = null; throw e; });
  return loading;
}
self.onmessage = async e => {
  const { id, op, device, audio } = e.data || {};
  try {
    const p = await load(device);
    if (op === "load") { self.postMessage({ id, ok: true }); return; }
    const out = await p(audio);
    self.postMessage({ id, ok: true, text: String((out && out.text) || "").trim() });
  } catch (err) { self.postMessage({ id, ok: false, err: String((err && err.message) || err) }); }
};
