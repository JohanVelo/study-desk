/* Search by meaning: a small sentence-embedding model (all-MiniLM-L6-v2, Apache-2.0) via
   transformers.js (Apache-2.0). Runs on the device in a worker. The library comes from a CDN
   and the model from Hugging Face the first time (about 23 MB), then both are cached offline.
   It only turns text into numbers so similar passages can be found. It never writes text. */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js";
env.allowLocalModels = false;
let fx = null, loading = null;
async function load() {
  if (fx) return fx;
  if (loading) return loading;
  const files = {};
  loading = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    dtype: "q8",
    progress_callback: p => {
      if (p.status === "progress" && p.file) { files[p.file] = [p.loaded || 0, p.total || 0]; const v = Object.values(files); self.postMessage({ op: "progress", loaded: v.reduce((a, x) => a + x[0], 0), total: v.reduce((a, x) => a + x[1], 0) }); }
    }
  }).then(p => (fx = p)).catch(e => { loading = null; throw e; });
  return loading;
}
self.onmessage = async e => {
  const { id, op, texts } = e.data || {};
  try {
    const p = await load();
    if (op === "load") { self.postMessage({ id, ok: true }); return; }
    const out = await p(texts, { pooling: "mean", normalize: true });
    const dim = out.dims[out.dims.length - 1], data = out.data, vecs = [];
    for (let i = 0; i < texts.length; i++) vecs.push(Array.from(data.subarray(i * dim, (i + 1) * dim), x => Math.round(x * 1e4) / 1e4));
    self.postMessage({ id, ok: true, vecs });
  } catch (err) { self.postMessage({ id, ok: false, err: String((err && err.message) || err) }); }
};
