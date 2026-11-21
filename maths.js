/* Study Desk v4.15: maths that survives import, shows as real maths, and can be read aloud
   1. PDFs: equations come out of pdf.js as loose pieces (subscripts and powers on their own lines, fractions split
      over three lines, math-italic letters like 𝐸 and 𝛷). Lines are rebuilt from the positions and sizes of the
      pieces: small raised or lowered pieces become powers and subscripts, numerator/denominator stacks become
      fractions, and the result is written as LaTeX between $…$ (in a sentence) or $$…$$ (a line of its own).
   2. Word (.docx) and PowerPoint (.pptx): equation-editor maths (OMML) becomes LaTeX before the text is read.
   3. Notes, summaries, cards and AI answers show it with Temml; podcasts and read-aloud say it in words.
   Nothing is invented: every symbol comes from the file; only its layout is rebuilt. */

/* ---------- 1. symbols to LaTeX ---------- */
const MX_GREEK = { α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "varepsilon", ϵ: "epsilon", ζ: "zeta", η: "eta", θ: "theta", ϑ: "vartheta", ι: "iota", κ: "kappa", λ: "lambda", μ: "mu", µ: "mu", ν: "nu", ξ: "xi", π: "pi", ρ: "rho", σ: "sigma", ς: "varsigma", τ: "tau", υ: "upsilon", φ: "varphi", ϕ: "phi", χ: "chi", ψ: "psi", ω: "omega", Γ: "Gamma", Δ: "Delta", Θ: "Theta", Λ: "Lambda", Ξ: "Xi", Π: "Pi", Σ: "Sigma", Υ: "Upsilon", Φ: "Phi", Ψ: "Psi", Ω: "Omega", "∆": "Delta", "Ω": "Omega" };
const MX_OPS = { "−": "-", "–": "-", "×": "\\times", "·": "\\cdot", "⋅": "\\cdot", "∙": "\\cdot", "÷": "\\div", "±": "\\pm", "∓": "\\mp", "≤": "\\le", "≥": "\\ge", "≠": "\\ne", "≈": "\\approx", "≅": "\\cong", "≡": "\\equiv", "∝": "\\propto", "∞": "\\infty", "→": "\\to", "←": "\\leftarrow", "↔": "\\leftrightarrow", "⇒": "\\Rightarrow", "⇔": "\\Leftrightarrow", "∠": "\\angle", "°": "^{\\circ}", "∫": "\\int", "∬": "\\iint", "∮": "\\oint", "∑": "\\sum", "∏": "\\prod", "∂": "\\partial", "∇": "\\nabla", "′": "'", "″": "''", "%": "\\%", "∘": "\\circ", "∗": "*", "⊥": "\\perp", "∥": "\\parallel", "∈": "\\in", "∉": "\\notin", "⊂": "\\subset", "⊆": "\\subseteq", "∪": "\\cup", "∩": "\\cap", "∀": "\\forall", "∃": "\\exists", "¬": "\\neg", "∧": "\\wedge", "∨": "\\vee", "⊕": "\\oplus", "⊗": "\\otimes", "ℏ": "\\hbar", "ℓ": "\\ell", "…": "\\ldots", "⋯": "\\cdots", "⟨": "\\langle", "⟩": "\\rangle", "‖": "\\|", "#": "\\#", "&": "\\&", "{": "\\{", "}": "\\}", "_": "\\_", "$": "\\$" };
const MX_FUNCS = /^(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|arcsin|arccos|arctan|ln|log|exp|lim|max|min|det|deg|arg|Re|Im|mod)$/;
/* Unicode super/subscript digits and letters some notes already use (V₁, m², x⁻¹) */
const MX_SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")", "ⁿ": "n", "ⁱ": "i" };
const MX_SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")", "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x", "ₕ": "h", "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₚ": "p", "ₛ": "s", "ₜ": "t", "ᵣ": "r" };
/* the Symbol font's private-use code points (old Word files): U+F0xx → the Unicode symbol */
const MX_PUA = { 0xF061: "α", 0xF062: "β", 0xF063: "χ", 0xF064: "δ", 0xF065: "ε", 0xF066: "φ", 0xF067: "γ", 0xF068: "η", 0xF069: "ι", 0xF06A: "ϕ", 0xF06B: "κ", 0xF06C: "λ", 0xF06D: "μ", 0xF06E: "ν", 0xF070: "π", 0xF071: "θ", 0xF072: "ρ", 0xF073: "σ", 0xF074: "τ", 0xF075: "υ", 0xF077: "ω", 0xF078: "ξ", 0xF079: "ψ", 0xF07A: "ζ", 0xF044: "Δ", 0xF046: "Φ", 0xF047: "Γ", 0xF04C: "Λ", 0xF050: "Π", 0xF051: "Θ", 0xF053: "Σ", 0xF057: "Ω", 0xF058: "Ξ", 0xF059: "Ψ", 0xF0A3: "≤", 0xF0B3: "≥", 0xF0B1: "±", 0xF0B4: "×", 0xF0B8: "÷", 0xF0B9: "≠", 0xF0BB: "≈", 0xF0B5: "∝", 0xF0A5: "∞", 0xF0B6: "∂", 0xF0D6: "√", 0xF0F2: "∫", 0xF0E5: "∑", 0xF0AE: "→", 0xF0DE: "⇒", 0xF0B0: "°", 0xF0D0: "∠", 0xF0D1: "∇", 0xF02D: "−", 0xF02B: "+", 0xF03D: "=", 0xF028: "(", 0xF029: ")", 0xF0D7: "·", 0xF0A2: "′" };
const mxPua = s => s.replace(/[-]/g, c => MX_PUA[c.charCodeAt(0)] || c);
/* 𝐸 𝛷 𝜂 (math italic) → E Φ η; leaves ordinary letters, digits and symbols alone */
const mxPlain = s => mxPua(s).replace(/[\u{1D400}-\u{1D7FF}℀-⅏]/gu, c => c.normalize("NFKC"));
const hasMathAlpha = s => /[\u{1D400}-\u{1D7FF}]/u.test(s);

/* a run of text inside maths → LaTeX. small: inside a subscript (words become upright) */
function mxTex(s, small) {
  /* 𝑓𝑁 is f times N, not a word: math-italic letters stand alone */
  s = mxPua(String(s)).replace(/[\u{1D400}-\u{1D7FF}]/gu, c => { const p = c.normalize("NFKC"); return /[A-Za-z]/.test(p) ? " " + p + " " : p; });
  s = mxPlain(s).replace(/\s+/g, " ");
  let out = "";
  const toks = s.match(/[A-Za-z]+|\d+(?:[.,]\d+)*|\s+|./gu) || [];
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (/^\s+$/.test(t)) { out += " "; continue; }
    if (/^[A-Za-z]+$/.test(t)) {
      if (t.length === 1) out += t;
      else if (MX_FUNCS.test(t)) out += "\\" + t + " ";
      /* "fL" in a formula is f times L; "kW", "mH" and "Hz" are units */
      else if (!small && t.length <= 3 && !/^[kmMGcnpμu][A-Za-z]$/.test(t) && !/^[A-Z][a-z]+$/.test(t) && !/^(rpm|rad|deg|min|sec|max)$/.test(t)) out += t.split("").join(" ");
      else out += (small ? "\\mathrm{" : "\\text{") + t + "}";
      continue;
    }
    if (/^\d/.test(t)) { out += t.replace(/,(?=\d{3}\b)/g, "{,}"); continue; }
    if (MX_GREEK[t]) { out += "\\" + MX_GREEK[t] + " "; continue; }
    if (t === "√") { out += "\\sqrt"; const nx = toks[k + 1] === " " ? toks[k + 2] : toks[k + 1]; if (nx && /^(\d|[A-Za-z]$)/.test(nx)) { out += "{" + mxTex(nx, small) + "}"; k += toks[k + 1] === " " ? 2 : 1; } else out += " "; continue; }
    if (MX_SUP[t]) { out += "^{" + MX_SUP[t] + "}"; continue; }
    if (MX_SUB[t]) { out += "_{" + MX_SUB[t] + "}"; continue; }
    if (MX_OPS[t] !== undefined) { out += MX_OPS[t] + (/^\\[a-z]+$/i.test(MX_OPS[t]) ? " " : ""); continue; }
    out += t;
  }
  return out.replace(/ {2,}/g, " ").replace(/\{ /g, "{").replace(/ \}/g, "}").trim();
}

/* ---------- 2. PDF lines rebuilt with their maths ---------- */
/* a piece of text: { s, x, y, size, w, f, sub: [], sup: [] } */
const mxEnd = t => t.x + t.w;
/* where a piece really ends, with its subscripts and powers */
const mxEnd2 = t => Math.max(mxEnd(t), ...(t.sub || []).map(mxEnd2), ...(t.sup || []).map(mxEnd2));
function mxPieceTex(t, small) {
  let s = mxTex(t.s, small);
  const scr = (arr, mark) => { if (!arr || !arr.length) return ""; const inner = arr.map(a => mxPieceTex(a, true)).join(""); return mark + "{" + inner + "}"; };
  return s + scr(t.sub, "_") + scr(t.sup, "^");
}
function mxSeqTex(seq, small) {
  let out = "";
  seq.forEach((t, k) => { const prev = seq[k - 1]; if (prev && t.x - mxEnd2(prev) > Math.max(1, t.size * .18)) out += " "; out += t.frac ? `\\frac{${mxSeqTex(t.frac[0], small)}}{${mxSeqTex(t.frac[1], small)}}` : mxPieceTex(t, small); });
  return out.replace(/ {2,}/g, " ").trim();
}
/* split a sorted list of pieces where the gap is wide */
function mxSegments(items, size) {
  const segs = []; let cur = [];
  items.forEach(t => { const last = cur[cur.length - 1]; if (last && t.x - mxEnd2(last) > size * .7) { segs.push(cur); cur = []; } cur.push(t); });
  if (cur.length) segs.push(cur); return segs;
}
const mxText = seq => seq.map(t => t.s + (t.sub || []).map(x => x.s).join("") + (t.sup || []).map(x => x.s).join("")).join(" ");
function mathLines(raw) {
  const its = raw.filter(t => t.s && t.s.trim()).map(t => ({ ...t, s: mxPua(t.s), sub: [], sup: [] }));
  /* rows: pieces on the same baseline */
  const rows = [];
  its.slice().sort((a, b) => b.y - a.y || a.x - b.x).forEach(t => {
    const tol = Math.max(1.2, t.size * .12);
    let r = rows.find(r => Math.abs(r.y - t.y) <= tol && Math.abs(r.size - t.size) < Math.max(r.size, t.size) * .3) || rows.find(r => Math.abs(r.y - t.y) <= tol * .5);
    if (!r) rows.push(r = { y: t.y, size: 0, items: [] });
    r.items.push(t); r.size = Math.max(r.size, t.size);
  });
  rows.forEach(r => r.items.sort((a, b) => a.x - b.x));
  /* small pieces just above or below a bigger row, touching the end of a piece in it: powers and subscripts */
  for (const r of rows.slice().sort((a, b) => a.size - b.size)) {
    for (const t of r.items.slice()) {
      let best = null, bd = 1e9;
      for (const b of rows) {
        if (b === r || b.size < t.size * 1.08 || Math.abs(b.y - t.y) > b.size * .6 || Math.abs(b.y - t.y) < b.size * .1) continue;
        for (const bt of b.items) {
          if (bt.size < t.size * 1.05) continue;
          const tail = [bt, ...bt.sub, ...bt.sup].reduce((m, q) => Math.max(m, mxEnd(q)), 0);
          const d = Math.abs(t.x - tail); if (t.x >= tail - b.size * .5 && t.x <= tail + b.size * .25 && d < bd) { bd = d; best = { b, bt, up: t.y > b.y }; }
        }
      }
      if (!best) continue;
      (best.up ? best.bt.sup : best.bt.sub).push(t); r.items.splice(r.items.indexOf(t), 1);
    }
  }
  let live = rows.filter(r => r.items.length).sort((a, b) => b.y - a.y);
  /* numerator over denominator, either side of a row with = or another operator between them: fractions */
  for (const R of live) {
    if (!R.items.length) continue;
    const S = R.size, above = live.filter(A => A !== R && A.items.length && A.y - R.y > S * .2 && A.y - R.y < S * 1.15).sort((a, b) => a.y - b.y)[0], below = live.filter(B => B !== R && B.items.length && R.y - B.y > S * .2 && R.y - B.y < S * 1.15).sort((a, b) => b.y - a.y)[0];
    if (!above || !below || !/[=<>≈≤≥+−\-×·]/.test(R.items.map(t => t.s).join(""))) continue;
    const busy = (a, b) => R.items.some(t => t.x < b - 1 && mxEnd2(t) > a + 1);
    for (const as of mxSegments(above.items, S)) {
      const a0 = as[0].x, a1 = Math.max(...as.map(mxEnd2));
      const bs = mxSegments(below.items, S).find(seg => { const b0 = seg[0].x, b1 = Math.max(...seg.map(mxEnd2)); return b0 < a1 && b1 > a0; });
      if (!bs) continue;
      const x0 = Math.min(a0, bs[0].x), x1 = Math.max(a1, ...bs.map(mxEnd2));
      if (mxText(as).length > 60 || mxText(bs).length > 60 || busy(x0, x1)) continue;
      R.items.push({ s: "", x: x0, w: x1 - x0, y: R.y, size: S, frac: [as, bs], sub: [], sup: [] });
      as.forEach(t => above.items.splice(above.items.indexOf(t), 1)); bs.forEach(t => below.items.splice(below.items.indexOf(t), 1));
    }
    R.items.sort((a, b) => a.x - b.x);
  }
  live = live.filter(r => r.items.length);
  return live.map(r => ({ y: r.y, size: Math.max(...r.items.filter(t => !t.frac).map(t => t.size), r.items.some(t => t.frac) ? 0 : r.size) || r.size, items: r.items, s: mxRowText(r.items) }));
}
/* is this row an equation on its own line? */
function mxIsDisplay(items) {
  if (items.some(t => t.frac)) return true;
  const plain = items.map(t => mxPlain(t.s)).join(" "), words = (plain.match(/[A-Za-z]{4,}/g) || []).filter(w => !MX_FUNCS.test(w));
  if (items.some(t => hasMathAlpha(t.s))) return words.length <= 1 && plain.length < 160;
  return /[=]/.test(plain) && items.some(t => t.sub.length || t.sup.length) && !words.length && !/^[a-z]/.test(plain.trim()) && plain.length < 120;
}
/* a mathy word: a letter or two, a number, an operator, a Greek letter */
const MX_GLUE = /^(?:[A-Za-z]{1,2}|(?=[^\s]*[0-9α-ωΑ-Ω])[0-9.,α-ωΑ-Ωϕ()A-Za-z]{1,8}|\d+(?:[.,]\d+)*|[=+\-−×·÷/()±≈≤≥≠∝√%°]+|[α-ωΑ-Ωϕϵ∆]|cos|sin|tan|ln|log)$/;
function mxRowText(items) {
  if (!items.some(t => t.frac || t.sub.length || t.sup.length || hasMathAlpha(t.s))) {
    let s = ""; items.forEach((t, k) => { const p = items[k - 1]; if (p && t.x - mxEnd(p) > Math.max(1, t.size * .15) && !/\s$/.test(s) && !/^\s/.test(t.s)) s += " "; s += t.s; }); return s.replace(/\s+/g, " ").trim();
  }
  if (mxIsDisplay(items)) return "$$" + mxSeqTex(items) + "$$";
  /* a sentence with some maths in it: plain text, with each maths run between $…$ */
  const parts = []; /* { m: true, items: [...] } | { m: false, s } */
  const pushText = (s, gapBefore) => { if (!s) return; const last = parts[parts.length - 1]; if (last && !last.m) last.s += (gapBefore ? " " : "") + s; else parts.push({ m: false, s: (gapBefore ? " " : "") + s }); };
  const pushMath = (t, gapBefore) => { const last = parts[parts.length - 1]; if (last && last.m && !/\S/.test("")) { last.items.push(t); return; } parts.push({ m: true, items: [t], gap: gapBefore }); };
  items.forEach((t, k) => {
    const p = items[k - 1], gap = !!p && t.x - mxEnd2(p) > Math.max(1, t.size * .15);
    const scripted = t.sub.length || t.sup.length;
    if (t.frac || hasMathAlpha(t.s)) { pushMath(t, gap); return; }
    if (!scripted) { pushText(t.s, gap && !/^\s/.test(t.s)); return; }
    /* the scripts belong to the last word: "…the core is Φ" + "m" → "…the core is " + $\Phi_{m}$ */
    const m = t.s.match(/^([\s\S]*?)(\S+)$/), head = m ? m[1] : "", word = m ? m[2] : t.s;
    /* a long word with a raised number is a footnote mark, not maths */
    if (word.replace(/[^A-Za-z]/g, "").length > 3 && !t.sub.length) { pushText(t.s + t.sup.map(x => x.s).join(""), gap); return; }
    const lead = word.match(/^[([{"'“‘]+/); const core = lead ? word.slice(lead[0].length) : word;
    pushText(head + (lead ? lead[0] : ""), gap && !/^\s/.test(t.s)); pushMath({ ...t, s: core, x: t.x + t.w - core.length * t.w / Math.max(1, t.s.length), w: core.length * t.w / Math.max(1, t.s.length) }, /\s$/.test(head) || (!head && gap));
  });
  /* glue: "E₂ = 4.44 f N₂ Φm" is one formula, not four — join maths runs separated only by mathy words */
  for (let k = 0; k < parts.length - 2; k++) {
    if (!parts[k].m || parts[k + 1].m || !parts[k + 2].m) continue;
    const ws = parts[k + 1].s.trim().split(/\s+/).filter(Boolean);
    if (ws.length <= 8 && ws.every(w => MX_GLUE.test(w))) { parts[k].glue = (parts[k].glue || []).concat([{ txt: parts[k + 1].s }], [{ items: parts[k + 2].items }]); parts[k].tail = parts[k + 2]; parts.splice(k + 1, 2); k--; }
  }
  /* a maths run followed by an operator and more mathy words takes them in: "$B_m = \\Phi_m$ / A" → "$B_m = \\Phi_m / A$" */
  for (let k = 0; k < parts.length - 1; k++) {
    if (!parts[k].m || parts[k + 1].m) continue;
    const mm = parts[k + 1].s.match(/^\s*((?:[=+\-−×·÷/≈≤≥≠∝±]\s*)(?:(?:[^\s,;:.]|\.(?=\d))+\s*)*?)(?=[,;:]|\.(?:\s|$)|\s*[A-Za-z]{3,}|$)/);
    /* "$I^2$R" : a letter written straight after the maths belongs to it */
    const tight = !/^\s/.test(parts[k + 1].s) && parts[k + 1].s.match(/^([A-Za-z]{1,2})(?=[\s,.;:]|$)/);
    if (tight) { parts[k].glue = (parts[k].glue || []).concat([{ txt: tight[1] }]); parts[k + 1].s = parts[k + 1].s.slice(tight[1].length); continue; }
    if (!mm || !mm[1].trim()) continue;
    const ws = mm[1].trim().split(/\s+/);
    if (!ws.every(w => MX_GLUE.test(w)) || ws.length > 8) continue;
    parts[k].glue = (parts[k].glue || []).concat([{ txt: mm[1] }]); parts[k + 1].s = parts[k + 1].s.slice(mm[0].length);
    parts[k + 1].s = (/^[,.;:]/.test(parts[k + 1].s) ? "" : " ") + parts[k + 1].s;
  }
  let out = "";
  parts.forEach(pt => {
    if (!pt.m) { out += pt.s; return; }
    let tex = mxSeqTex(pt.items);
    (pt.glue || []).forEach(g => { tex += g.txt !== undefined ? " " + mxTex(g.txt) + " " : mxSeqTex(g.items); });
    out += (pt.gap && !/\s$/.test(out) && out ? " " : "") + "$" + tex.replace(/\s+/g, " ").trim() + "$";
  });
  return out.replace(/\s+/g, " ").replace(/\$\s+([.,;:])/g, "$$$1").trim();
}

/* the importer's page reader, now maths-aware (same output shape as before) */
pdfPageItems = async function (doc, i) {
  impTick();
  const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
  pdfRelease(doc, pg);
  const H = vp.height || 842, fonts = new Map();
  const raw = tc.items.filter(it => it.str && it.str.trim() && Math.abs(it.transform[1]) < .01).map(it => {
    const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
    fonts.set(it, it.fontName);
    return { s: it.str, x: it.transform[4], y: it.transform[5], size, w: it.width || it.str.length * size * .5, f: it.fontName };
  });
  return mathLines(raw).map(r => {
    const f = {}; let chars = 0;
    const walk = t => { if (t.frac) { t.frac.flat().forEach(walk); return; } chars += t.s.length; f[t.f] = (f[t.f] || 0) + t.s.length; t.sub.forEach(walk); t.sup.forEach(walk); };
    r.items.forEach(walk);
    const [mf, mc] = Object.entries(f).sort((a, b) => b[1] - a[1])[0] || [];
    return { s: r.s, size: r.size, chars, font: mc >= chars * .9 ? mf : "", rel: 1 - r.y / H, math: /\$/.test(r.s) };
  }).filter(l => l.s);
};
/* an equation line is never a heading, even in a bigger font */
const _pagesToNotesM = pagesToNotes;
pagesToNotes = function (pages, repeats) {
  const tagged = pages.map(ls => ls.map(l => l.math && /^\$\$/.test(l.s) ? { ...l, size: Math.min(l.size, 1) } : l));
  return _pagesToNotesM(tagged, repeats);
};

/* ---------- 3. Word and PowerPoint equations (OMML) → LaTeX ---------- */
const OM = "http://schemas.openxmlformats.org/officeDocument/2006/math";
function ommlTex(el) { return ommlRaw(el).replace(/(?<!\})\{([A-Za-z0-9]|\\[A-Za-z]+)\}(?=[_^])/g, "$1"); }
function ommlRaw(el) {
  if (!el) return "";
  const kids = n => [...n.childNodes].filter(c => c.nodeType === 1);
  const one = (n, name) => kids(n).find(c => c.localName === name);
  const arg = (n, name) => { const c = one(n, name); return c ? ommlTex(c) : ""; };
  const prop = (n, pr, name) => { const p = one(n, pr); const c = p && one(p, name); return c ? c.getAttributeNS(OM, "val") || c.getAttribute("m:val") : null; };
  const all = n => kids(n).map(ommlTex).join("");
  switch (el.localName) {
    case "oMathPara": return kids(el).filter(c => c.localName === "oMath").map(ommlTex).join(" \\\\ ");
    case "oMath": case "e": case "num": case "den": case "sub": case "sup": case "deg": case "lim": case "fName": return all(el);
    case "r": { const t = kids(el).filter(c => c.localName === "t").map(c => c.textContent).join(""); const plain = prop(el, "rPr", "nor") || prop(el, "rPr", "lit"); return plain && /[A-Za-z]{2}/.test(t) ? "\\text{" + t + "}" : mxTex(t); }
    case "f": { const ty = prop(el, "fPr", "type"); const n = arg(el, "num"), d = arg(el, "den"); return ty === "lin" ? `${n}/${d}` : ty === "noBar" ? `\\genfrac{}{}{0pt}{}{${n}}{${d}}` : `\\frac{${n}}{${d}}`; }
    case "sSub": return `{${arg(el, "e")}}_{${arg(el, "sub")}}`;
    case "sSup": return `{${arg(el, "e")}}^{${arg(el, "sup")}}`;
    case "sSubSup": return `{${arg(el, "e")}}_{${arg(el, "sub")}}^{${arg(el, "sup")}}`;
    case "sPre": return `{}_{${arg(el, "sub")}}^{${arg(el, "sup")}}${arg(el, "e")}`;
    case "rad": { const d = arg(el, "deg"); return d ? `\\sqrt[${d}]{${arg(el, "e")}}` : `\\sqrt{${arg(el, "e")}}`; }
    case "d": { const b = prop(el, "dPr", "begChr"), e = prop(el, "dPr", "endChr"), sep = prop(el, "dPr", "sepChr") || ","; const L = b === null ? "(" : b, Rr = e === null ? ")" : e;
      /* a matrix in brackets: one environment, not brackets around brackets */
      const es = kids(el).filter(c => c.localName === "e"), mOnly = es.length === 1 && kids(es[0]).length === 1 && kids(es[0])[0].localName === "m";
      if (mOnly) { const env = { "(": "pmatrix", "[": "bmatrix", "{": "Bmatrix", "|": "vmatrix", "‖": "Vmatrix" }[L] || "matrix"; return ommlTex(kids(es[0])[0]).replace(/matrix\}/g, env + "}"); }
      const fix = c => !c ? "." : c === "{" ? "\\{" : c === "}" ? "\\}" : c === "|" ? "|" : c === "‖" ? "\\|" : c === "⟨" ? "\\langle" : c === "⟩" ? "\\rangle" : c === "⌊" ? "\\lfloor" : c === "⌋" ? "\\rfloor" : c === "⌈" ? "\\lceil" : c === "⌉" ? "\\rceil" : c; return `\\left${fix(L)}${kids(el).filter(c => c.localName === "e").map(ommlTex).join(mxTex(sep))}\\right${fix(Rr)}`; }
    case "nary": { const ch = prop(el, "naryPr", "chr") || "∫"; const op = { "∑": "\\sum", "∏": "\\prod", "∫": "\\int", "∬": "\\iint", "∭": "\\iiint", "∮": "\\oint", "⋃": "\\bigcup", "⋂": "\\bigcap" }[ch] || mxTex(ch); const lo = arg(el, "sub"), hi = arg(el, "sup"); return `${op}${lo ? `_{${lo}}` : ""}${hi ? `^{${hi}}` : ""} ${arg(el, "e")}`; }
    case "func": return `${arg(el, "fName")} ${arg(el, "e")}`;
    case "limLow": return `${arg(el, "e")}_{${arg(el, "lim")}}`;
    case "limUpp": return `${arg(el, "e")}^{${arg(el, "lim")}}`;
    case "acc": { const ch = prop(el, "accPr", "chr") || "̂"; const m = { "̇": "\\dot", "̈": "\\ddot", "̃": "\\tilde", "̄": "\\bar", "̂": "\\hat", "⃗": "\\vec", "→": "\\vec", "˙": "\\dot", "¯": "\\bar" }[ch] || "\\hat"; return `${m}{${arg(el, "e")}}`; }
    case "bar": return (prop(el, "barPr", "pos") === "bot" ? "\\underline{" : "\\overline{") + arg(el, "e") + "}";
    case "groupChr": { const ch = prop(el, "groupChrPr", "chr") || "⏟"; return (ch === "⏞" ? "\\overbrace{" : "\\underbrace{") + arg(el, "e") + "}"; }
    case "box": case "borderBox": case "phant": return arg(el, "e");
    case "eqArr": return `\\begin{aligned}${kids(el).filter(c => c.localName === "e").map(ommlTex).join(" \\\\ ")}\\end{aligned}`;
    case "m": return `\\begin{matrix}${kids(el).filter(c => c.localName === "mr").map(r => kids(r).filter(c => c.localName === "e").map(ommlTex).join(" & ")).join(" \\\\ ")}\\end{matrix}`;
    default: return kids(el).length ? all(el) : "";
  }
}
/* replace every equation in a Word/PowerPoint XML part with a plain text run holding $LaTeX$, so the normal reader keeps it */
function ommlInline(xml, wordNs) {
  if (!/<m:oMath/.test(xml)) return xml;
  const doc = new DOMParser().parseFromString(xml, "application/xml"); if (doc.querySelector("parsererror")) return xml;
  const W = wordNs ? "http://schemas.openxmlformats.org/wordprocessingml/2006/main" : "http://schemas.openxmlformats.org/drawingml/2006/main";
  const run = (text, ref) => {
    if (wordNs) { const r = doc.createElementNS(W, "w:r"), t = doc.createElementNS(W, "w:t"); t.setAttribute("xml:space", "preserve"); t.textContent = text; r.appendChild(t); return r; }
    const r = doc.createElementNS(W, "a:r"), t = doc.createElementNS(W, "a:t"); t.textContent = text; r.appendChild(t); return r;
  };
  [...doc.getElementsByTagNameNS(OM, "oMathPara")].forEach(p => { const tex = ommlTex(p).trim(); if (tex) p.parentNode.replaceChild(run(`$$${tex}$$`), p); else p.remove(); });
  [...doc.getElementsByTagNameNS(OM, "oMath")].forEach(m => { if (!m.parentNode) return; const tex = ommlTex(m).trim(); if (tex) m.parentNode.replaceChild(run(`$${tex}$`), m); else m.remove(); });
  /* PowerPoint keeps a picture fallback next to the maths: drop it so the formula isn't read twice */
  return new XMLSerializer().serializeToString(doc);
}
/* PowerPoint: an <a14:m> in a paragraph → $…$ (or $$…$$ for a maths paragraph of its own) */
function pptxMath(el) {
  const para = el.getElementsByTagNameNS(OM, "oMathPara")[0], tex = (para ? ommlTex(para) : [...el.getElementsByTagNameNS(OM, "oMath")].map(ommlTex).join(" ")).trim();
  return tex ? (para ? ` $$${tex}$$ ` : ` $${tex}$ `) : "";
}
/* .docx: rewrite word/document.xml before mammoth reads it */
const _docxToOutlineM = docxToOutline;
docxToOutline = async function (buf, name) {
  try {
    const zip = await JSZip.loadAsync(buf), f = zip.file("word/document.xml");
    if (f) { const xml = await f.async("string"); if (/<m:oMath/.test(xml)) { zip.file("word/document.xml", ommlInline(xml, true)); buf = await zip.generateAsync({ type: "arraybuffer" }); } }
  } catch (e) { console.error(e); }
  return _docxToOutlineM(buf, name);
};

/* ---------- 4. showing maths ---------- */
/* $…$ may start with a digit when it is clearly maths ($2\pi f$), and $$…$$ may hold several lines */
const MATH_RE2 = /\$\$([\s\S]+?)\$\$|\$(?=[^\s$])((?:\\.|[^$\n\\]){1,400}?)(?<=\S)\$(?!\d)|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
const mxOkInline = s => !/^\d[\d\s.,]*$/.test(s) && (/^\D/.test(s) || /[\\^_=a-zA-Z]/.test(s));
let mathQ = Promise.resolve();
mathify = function (root) {
  /* calls queue up instead of being dropped while another is running */
  mathQ = mathQ.then(() => mathifyNow(root)).catch(e => console.error(e));
  return mathQ;
};
async function mathifyNow(root) {
  if (!root || !root.isConnected) return;
  const test = s => { MATH_RE2.lastIndex = 0; let m; while ((m = MATH_RE2.exec(s))) if (m[1] || m[3] || m[4] || mxOkInline(m[2])) return true; return false; };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; if (!p || p.closest("textarea,input,script,style,code,pre,.math,svg,[contenteditable],.no-math")) return NodeFilter.FILTER_REJECT; return n.nodeValue.includes("$") || n.nodeValue.includes("\\(") || n.nodeValue.includes("\\[") ? (test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) : NodeFilter.FILTER_REJECT; } });
  const hits = []; while (walker.nextNode()) hits.push(walker.currentNode);
  if (!hits.length) return;
  await loadScript("vendor/x/temml.min.js"); loadCss("vendor/x/Temml-Local.css");
  if (!document.getElementById("math-font")) { const st = document.createElement("style"); st.id = "math-font";
    /* STIX Two Math (SIL OFL): the same proper maths font on every phone and laptop, downloaded once with the maths library */
    st.textContent = '@font-face{font-family:"Study Math";src:url("vendor/x/STIXTwoMath.woff2") format("woff2");font-display:swap}.math math{font-family:"Study Math","STIX Two Math","Cambria Math",math}';
    document.head.appendChild(st); }
  hits.forEach(node => {
    if (!node.parentNode) return;
    const text = node.nodeValue, frag = document.createDocumentFragment(); let last = 0;
    MATH_RE2.lastIndex = 0; let m;
    while ((m = MATH_RE2.exec(text))) {
      const [all, d1, i1, i2, d2] = m, tex = d1 || d2 || i1 || i2, display = !!(d1 || d2);
      if (i1 && !mxOkInline(i1)) continue;
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement("span"); span.className = display ? "math math-d" : "math";
      try { temml.render(tex, span, { displayMode: display, throwOnError: true, trust: false }); span.setAttribute("role", "math"); span.setAttribute("aria-label", mathWords(tex)); span.title = ""; }
      catch (e) { span.className = "math-raw"; span.textContent = mathPlain(tex); span.title = all; }
      frag.appendChild(span); last = m.index + all.length;
    }
    frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });
  /* a long equation on a phone scrolls sideways; then it can be reached with the keyboard too */
  requestAnimationFrame(() => root.querySelectorAll?.(".math-d").forEach(d => { if (d.scrollWidth > d.clientWidth + 2) { d.tabIndex = 0; } else d.removeAttribute("tabindex"); }));
}
/* anything that appears later (sheets, flashcards, questions, search, AI answers, learn steps) gets its maths drawn too */
let mxPend = new Set(), mxRaf = 0;
new MutationObserver(list => {
  for (const m of list) for (const n of m.addedNodes) {
    if (n.nodeType === 3) { if (n.nodeValue.includes("$") && n.parentElement) mxPend.add(n.parentElement); }
    else if (n.nodeType === 1 && !n.closest(".math") && (n.textContent || "").includes("$")) mxPend.add(n);
  }
  if (mxPend.size && !mxRaf) mxRaf = requestAnimationFrame(() => { mxRaf = 0; const els = [...mxPend]; mxPend = new Set(); els.filter(e => e.isConnected && !els.some(o => o !== e && o.contains(e))).forEach(e => mathify(e)); });
}).observe(document.documentElement, { childList: true, subtree: true });

/* ---------- 5. maths in words, for podcasts, read-aloud and screen readers ---------- */
const MX_SAY = { alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta", varepsilon: "epsilon", epsilon: "epsilon", zeta: "zeta", eta: "eta", theta: "theta", vartheta: "theta", iota: "iota", kappa: "kappa", lambda: "lambda", mu: "mu", nu: "nu", xi: "xi", pi: "pi", rho: "rho", sigma: "sigma", varsigma: "sigma", tau: "tau", upsilon: "upsilon", phi: "phi", varphi: "phi", chi: "chi", psi: "psi", omega: "omega", Gamma: "capital gamma", Delta: "delta", Theta: "capital theta", Lambda: "capital lambda", Xi: "capital xi", Pi: "capital pi", Sigma: "sigma", Upsilon: "capital upsilon", Phi: "phi", Psi: "capital psi", Omega: "omega",
  times: "times", cdot: "times", div: "divided by", pm: "plus or minus", mp: "minus or plus", le: "is less than or equal to", leq: "is less than or equal to", ge: "is greater than or equal to", geq: "is greater than or equal to", ne: "is not equal to", neq: "is not equal to", approx: "is approximately", equiv: "is equivalent to", propto: "is proportional to", infty: "infinity", to: "tends to", rightarrow: "gives", Rightarrow: "implies", angle: "angle", circ: "degrees", int: "the integral of", iint: "the double integral of", oint: "the closed integral of", sum: "the sum of", prod: "the product of", partial: "partial", nabla: "del", sin: "sine", cos: "cos", tan: "tan", ln: "the natural log of", log: "log", exp: "e to the", lim: "the limit", max: "the maximum of", min: "the minimum of", ldots: "and so on", cdots: "and so on", hbar: "h bar", ell: "l" };
function mathWords(tex) {
  let s = String(tex);
  const grp = "\\{((?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*)\\}";
  for (let k = 0; k < 4; k++) {
    s = s.replace(new RegExp("\\\\frac\\s*" + grp + "\\s*" + grp, "g"), (m, a, b) => ` ${a} over ${b} `)
      .replace(new RegExp("\\\\sqrt\\s*\\[([^\\]]+)\\]\\s*" + grp, "g"), (m, n, a) => ` the ${n === "3" ? "cube" : n + "th"} root of ${a} `)
      .replace(new RegExp("\\\\sqrt\\s*" + grp, "g"), (m, a) => ` the square root of ${a} `)
      .replace(new RegExp("\\\\(?:text|mathrm|mathbf|mathit|operatorname)\\s*" + grp, "g"), " $1 ")
      .replace(new RegExp("\\^\\s*" + grp, "g"), (m, a) => a === "2" ? " squared " : a === "3" ? " cubed " : a === "\\circ" ? " degrees " : /^-?1$/.test(a) && a === "-1" ? " to the minus one " : ` to the power ${a} `)
      .replace(new RegExp("_\\s*" + grp, "g"), (m, a) => /^[a-z]{2,}$/i.test(a.replace(/\\mathrm|[{}\s]/g, "")) || /^\d+$/.test(a) || /^[a-z]$/i.test(a) ? ` ${a} ` : ` sub ${a} `);
  }
  s = s.replace(/\^\s*(\w)/g, (m, a) => a === "2" ? " squared " : a === "3" ? " cubed " : ` to the power ${a} `).replace(/_\s*(\w)/g, " $1 ")
    .replace(/\\(left|right|big|Big|bigg|Bigg)\s*/g, "").replace(/\\[,;: !]/g, " ")
    .replace(/\\([A-Za-z]+)/g, (m, w) => ` ${MX_SAY[w] || w} `)
    .replace(/=/g, " equals ").replace(/\+/g, " plus ").replace(/(\s|^)-(\s|\d|[a-z])/gi, "$1minus $2").replace(/</g, " is less than ").replace(/>/g, " is greater than ").replace(/\//g, " over ").replace(/\\%|%/g, " percent ")
    .replace(/[{}\\]/g, " ").replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/\s+/g, " ").trim();
  return s;
}
/* a readable plain form, for search, flashcard backs and when Temml can't draw it */
function mathPlain(tex) {
  return String(tex).replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)").replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)").replace(/\\(?:text|mathrm)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\([A-Za-z]+)/g, (m, w) => { const g = Object.entries(MX_GREEK).find(([, v]) => v === w); return g ? g[0] : ({ times: "×", cdot: "·", div: "÷", pm: "±", le: "≤", ge: "≥", ne: "≠", approx: "≈", propto: "∝", infty: "∞", circ: "°", int: "∫", sum: "∑", partial: "∂", sqrt: "√", to: "→" })[w] || w; })
    .replace(/_\{([^{}]*)\}/g, "_$1").replace(/\^\{([^{}]*)\}/g, "^$1").replace(/[{}]/g, "").replace(/\\%/g, "%").replace(/\s+/g, " ").trim();
}
/* text with $…$ → the same text with the maths said in words */
const sayMaths = t => String(t || "").replace(MATH_RE2, (m, d1, i1, i2, d2) => { const tex = d1 || d2 || i1 || i2; return i1 && !mxOkInline(i1) ? m : " " + mathWords(tex) + (d1 || d2 ? ". " : " "); }).replace(/:\s+([^.]*?)\.\s+\./g, ": $1. ").replace(/\s+([.,;:])/g, "$1").replace(/\s{2,}/g, " ");
const plainMaths = t => String(t || "").replace(MATH_RE2, (m, d1, i1, i2, d2) => { const tex = d1 || d2 || i1 || i2; return i1 && !mxOkInline(i1) ? m : mathPlain(tex); });
