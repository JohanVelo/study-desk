/* =====================================================================
   Study Desk summary engine (runs on this device, nothing is uploaded)

   Goal: a summary you can trust before an exam. It never invents text:
   every bullet is a sentence from your own notes. It is built to COVER
   the material, not just pick a few nice sentences:
     1. Split the notes into sections (headings, slide titles, or even
        parts of a long text) and give every section at least one bullet.
     2. Always keep definitions, formulas, key numbers/dates, lists and
        "this is important / exam" lines.
     3. Rank the rest with TextRank on TF-IDF vectors and pick with MMR,
        so bullets are central and not repeats of each other.
     4. Find the key terms (RAKE-style phrases, TF-IDF weighted) and make
        sure every key term appears in at least one bullet.
     5. Report coverage honestly: sections covered, key terms covered,
        and how much of the important vocabulary the bullets carry.
   Methods: TextRank (Mihalcea & Tarau 2004), MMR (Carbonell & Goldstein
   1998), RAKE (Rose et al. 2010). Written from scratch, no dependencies.
   ===================================================================== */
(function (G) {
  "use strict";
  const STOP = new Set(("a about above after again against all also am an and any are aren't as at be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each etc few for from further had hasn't has have haven't having he her here hers herself him himself his how however i i.e e.g if in into is isn't it it's its itself just let's may me might more most much must mustn't my myself no nor not now of off on once one only or other others otherwise our ours ourselves out over own per same she should shouldn't so some such than that that's the their theirs them themselves then there there's these they this those through thus to too under until up upon us use used uses using usually very via was wasn't we were weren't what what's when where which while who whom whose why will with within without won't would wouldn't you your yours yourself yourselves also often many several since therefore hence whereas e.g. i.e. like well even still yet ever every get gets got make makes made way ways thing things lot lots really quite rather slide page chapter section figure fig table see shown below above following example examples eg ie vs along across towards toward around onto whether either neither back away beyond behind besides inside outside throughout yeah okay ok gonna um uh say says said go goes going went want wants talk talking today get gets got lets put").split(" "));
  const CUE_DEF = /\b(is|are) (defined as|known as|called|referred to as|termed)\b|\b(refers? to|is defined|means|is the (process|study|ability|amount|rate|measure|state|term|name)|are the (process|study|set|group)|describes?|denotes?)\b/i;
  const CUE_EXAM = /\b(examiners?|exams?|important|key (point|idea|concept|fact|feature|term)s?|remember|note that|exam|test|must know|crucial|essential|main (reason|cause|point|idea|types?|functions?|features?|purpose)|in summary|to summari[sz]e|in conclusion|therefore|as a result|this means|the difference between|compared (to|with)|advantages?|disadvantages?)\b/i;
  const CUE_LIST = /\b(two|three|four|five|six|seven|eight|nine|ten|\d+) (main |key |basic |major |different )?(types|kinds|stages|steps|phases|parts|factors|causes|effects|functions|features|principles|elements|components|categories|levels|ways|reasons|characteristics|properties|rules|laws)\b|\bthe following\b|\bas follows\b/i;
  const RE_FORMULA = /(\b[A-Za-z]{1,3}\s*=\s*[-\w(√π])|(\b[a-z]{3,}\s*=\s*[\w(]+[^=]*[\/×*+−-]\s*\w)|[×÷±√∑∫≈≠≤≥∝∆Δπ]|\b\w+\s*\^\s*\d|\b\d+\s*[x×*/]\s*\d+\s*=|\b(mol|kg|m\/s|km\/h|N|J|W|Pa|Hz|°C|K)\b\s*$/;
  const RE_NUM = /\b(1[0-9]{3}|20[0-9]{2})\b|\b\d+(\.\d+)?\s?(%|percent|per cent)|\b\d[\d,.]*\s?(million|billion|thousand|kg|km|cm|mm|µm|nm|mg|ml|g|m|s|ms|years?|days?|hours?|°C|°F|degrees)\b|R\s?\d|\$\s?\d|€\s?\d|£\s?\d/i;
  const RE_PAGENUM = /^(page|p\.|slide)?\s*\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i;

  const norm = s => String(s || "").replace(/­/g, "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  const stem = w => {
    w = w.toLowerCase();
    if (w.length > 5) w = w.replace(/(ational|ization|isation|fulness|ousness|iveness)$/, m => ({ ational: "ate", ization: "ize", isation: "ize", fulness: "ful", ousness: "ous", iveness: "ive" })[m]);
    if (w.length > 4) w = w.replace(/(ies)$/, "y").replace(/(sses)$/, "ss").replace(/([^s])s$/, "$1");
    if (w.length > 5) w = w.replace(/(ing|edly|ed|ment|ness|ions?|ity|al|er|ers|est|ive|ize|ise)$/, "").replace(/([a-z]{4,})ly$/, (m, a) => /[aeiou]p?pl$|^(rel|app|fami|ital|supp)/.test(m) ? m : a);
    return w.slice(0, 9);
  };
  const tokens = s => (norm(s).toLowerCase().match(/[a-zÀ-ɏ][a-zÀ-ɏ0-9'-]*[a-z0-9À-ɏ]|[a-z]/g) || []);
  const content = s => tokens(s).filter(w => w.length > 2 && !STOP.has(w)).map(stem);

  /* ---------- 1. structure: lines → sections of units ---------- */
  const isBulletLine = l => /^\s*([-•*–·▪◦●○■□➢➤►✓]|\(?[a-z0-9ivx]{1,4}[.)])\s+/i.test(l);
  const stripBullet = l => l.replace(/^\s*([-•*–·▪◦●○■□➢➤►✓]|\(?[a-z0-9ivx]{1,4}[.)])\s+/i, "");
  const looksHeading = (l, next) => {
    if (/^#{1,6}\s/.test(l)) return true;
    const t = l.trim();
    if (t.length < 3 || t.length > 80 || /[.,;!?]$/.test(t) || isBulletLine(t)) return false;
    const w = t.split(/\s+/);
    if (w.length > 10) return false;
    if (/^((chapter|unit|part|section|module|lecture|topic|week)\s+\d+|\d+(\.\d+){0,3}\.?\s+[A-Z])/i.test(t)) return true;
    if (t === t.toUpperCase() && /[A-Z]{3}/.test(t) && w.length <= 8) return true;
    const caps = w.filter(x => /^[A-Z0-9]/.test(x)).length;
    /* a short Title Case line followed by a normal sentence */
    return !!next && caps / w.length >= .6 && w.length <= 7 && /^[A-Z]/.test(next.trim()) && next.trim().length > t.length;
  };
  const cleanHeading = h => h.replace(/^#{1,6}\s*/, "").replace(/^(slide\s*\d+\s*[:.\-–]\s*)/i, "").trim();

  function splitSentences(p) {
    /* protect common abbreviations and decimals so they don't end a sentence */
    const prot = p.replace(/\b(e\.g|i\.e|etc|vs|cf|approx|fig|no|eq|Dr|Mr|Mrs|Ms|Prof|St|al|ca|Inc|Ltd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\./gi, "$1\u0001").replace(/(\d)\.(\d)/g, "$1\u0001$2");
    return prot.split(/(?<=[.!?])\s+(?=["'(\[]?[A-Z0-9À-Þ])|(?<=[.!?]["')\]])\s+/).map(s => s.replace(/\u0001/g, ".").trim()).filter(Boolean);
  }

  function structure(text, title) {
    text = norm(text).replace(/\r/g, "").replace(/-\n(?=[a-z])/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
    const lines = text.split("\n").map(l => l.trim());
    const sections = []; let cur = { h: "", paras: [] }, para = "";
    const flush = () => { if (para.trim()) cur.paras.push(para.trim()); para = ""; };
    const newSec = h => { flush(); if (cur.paras.length || cur.h) sections.push(cur); cur = { h, paras: [] }; };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], next = lines.slice(i + 1).find(x => x);
      if (!l) { flush(); continue; }
      if (RE_PAGENUM.test(l)) continue;
      if (/^(speaker )?notes?:\s*$/i.test(l)) { flush(); continue; }
      if (looksHeading(l, next)) { newSec(cleanHeading(l)); continue; }
      if (isBulletLine(l)) { flush(); para = stripBullet(l); if (!/[.!?:;]$/.test(para)) { flush(); } continue; }
      /* soft wrap: join with the line before unless that line clearly ended */
      if (para && /[.!?:;"')]$/.test(para) && /^[A-Z0-9"'(]/.test(l)) { flush(); para = l; }
      else if (para && !/[.!?:;]$/.test(para) && /^[A-Z]/.test(l) && para.length < 45) { flush(); para = l; }
      else para = para ? para + " " + l : l;
    }
    newSec("");
    /* turn paragraphs into units (sentences, or fragments from slides) */
    const out = [];
    sections.forEach(sec => {
      const units = [];
      sec.paras.forEach((p, pi) => {
        const ss = splitSentences(p);
        ss.forEach((s, si) => {
          /* very long run-ons: split at semicolons */
          const parts = s.length > 360 ? s.split(/(?<=;)\s+/) : [s];
          parts.forEach(x => { x = x.trim(); if (x) units.push({ t: x, para: pi, first: si === 0 }); });
        });
      });
      if (units.length || sec.h) out.push({ h: sec.h, units });
    });
    /* glue a heading-only section to the next one so we don't lose the heading */
    for (let i = out.length - 2; i >= 0; i--) if (!out[i].units.length && out[i + 1] && !out[i + 1].h) { out[i + 1].h = out[i].h; out.splice(i, 1); }
    let secs = out.filter(s => s.units.length);
    /* long text with no headings: split into parts so the end of the notes is covered too */
    const res = [];
    secs.forEach(s => {
      if (s.units.length <= 36) { res.push(s); return; }
      const parts = Math.ceil(s.units.length / 26), size = Math.ceil(s.units.length / parts);
      let a = 0;
      for (let k = 0; k < parts && a < s.units.length; k++) {
        let b = k === parts - 1 ? s.units.length : Math.min(s.units.length, a + size);
        /* end a part at a paragraph break where possible */
        if (k < parts - 1) { for (let j = b; j < Math.min(s.units.length, b + 6); j++) if (s.units[j].first) { b = j; break; } }
        res.push({ h: k === 0 ? s.h : "", units: s.units.slice(a, b), part: true });
        a = b;
      }
    });
    return res.filter(s => s.units.length);
  }

  /* ---------- 2. features ---------- */
  function classify(t) {
    const kinds = [];
    if (CUE_DEF.test(t) || /^[A-Z][\w'’()\- ]{1,48}\s?[:–—-]\s+\S.{8,}/.test(t)) kinds.push("def");
    if (RE_FORMULA.test(t)) kinds.push("formula");
    if (RE_NUM.test(t)) kinds.push("num");
    if (CUE_EXAM.test(t)) kinds.push("exam");
    if (CUE_LIST.test(t) || /:\s*$/.test(t)) kinds.push("list");
    return kinds;
  }
  const isJunk = t => {
    const w = t.split(/\s+/).length;
    if (w < 3 && !RE_FORMULA.test(t)) return true;
    if (/^(https?:|www\.)/i.test(t) || /©|all rights reserved|copyright|isbn/i.test(t)) return true;
    if ((t.match(/[a-z]/gi) || []).length < t.length * .45 && !RE_FORMULA.test(t)) return true;
    if (/^(thank you|questions\??|any questions|the end|agenda|outline|overview|contents|references|bibliography|learning (outcomes|objectives))\.?$/i.test(t)) return true;
    return false;
  };

  /* definitions: "Term is/are defined as …", "Term is a … that …", "Term: …", "… is called Term", "This is called Term" */
  const NOT_TERM = /^(it|this|that|these|those|there|they|he|she|we|you|i|which|what|one|the (result|answer|problem|reason|idea|point|aim|goal|purpose|outcome|difference|first|second|main|key|same|other|rest|following|study|aim)|result|answer|reason|idea|aim|goal|purpose|example|note|tip|step \d+|question|important|remember|answer|learn|know|see|use|make|check|practise|practice|today|here|now)$/i;
  const VERB_START = /^(learn|know|remember|note|see|use|make|check|practise|practice|draw|label|explain|describe|compare|list|state|name|give|read|write|try|look|think|study|revise|review|don't|do|be|go|get)\b/i;
  const okTerm = t => { t = t.trim(); const w = t.split(/\s+/); return t.length >= 2 && w.length <= 5 && !NOT_TERM.test(t) && !VERB_START.test(t) && !/^(in|on|at|for|after|before|when|if|because|so|but|and|then|thus|however|although|while)\b/i.test(t); };
  const clean = d => d.replace(/[.;]$/, "").trim();
  function definitionOf(t, prev) {
    let m;
    /* "This is known as forward conditioning." → the sentence before is the definition */
    m = t.match(/^(?:this|that|these|it|such an?(?: \w+)?)(?: \w+)?\s+(?:is|are|was|were)\s+(?:also\s+)?(?:known as|called|termed|referred to as|described as)\s+(?:an?\s+|the\s+)?["'“]?([A-Za-z][\w'’\- ]{2,40}?)["'”]?(?:[,.;]|\s+because|\s+and|$)/i);
    if (m && prev && m[1].split(/\s+/).length <= 4) return { term: m[1].trim(), def: clean(prev), anaphor: true };
    m = t.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w'’()\- ]{1,48}?)\s+(?:is|are)\s+(?:defined as|known as|referred to as|termed|called)\s+(.{6,})$/i);
    if (m && okTerm(m[1])) return { term: m[1].trim(), def: clean(m[2]) };
    m = t.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w'’()\- ]{1,40}?)\s+(?:refers? to|means|denotes|describes|measures|is used to describe)\s+(.{6,})$/i);
    if (m && okTerm(m[1])) return { term: m[1].trim(), def: clean(m[2]) };
    /* genus + difference: "An unconditioned stimulus is a stimulus that …", "Shaping is reinforcing …" */
    m = t.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w'’()\- ]{1,40}?)\s+(?:is|are)\s+((?:an?|the)\s+(?:[\w'’-]+\s+){0,4}?(?:that|which|who|where|whose|in which|by which|of|for|used|when|to|with|between|caused)\b.{3,})$/i)
      || t.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w'’()\- ]{1,40}?)\s+(?:is|are)\s+((?:an?|the)\s+(?:[\w'’-]+\s+){1,4}?[\w'’-]+\s*(?:,|\(|\.?$).*)$/i)
      || t.match(/^([A-Z][\w'’()\- ]{1,40}?)\s+(?:is|are)\s+((?:[a-z]+ing)\b.{8,})$/);
    if (m && okTerm(m[1]) && m[1].split(/\s+/).length <= 4 && m[2].split(/\s+/).length >= 3) return { term: m[1].trim(), def: clean(m[2]) };
    /* plural genus: "Confounding variables are variables other than the IV that …" */
    m = t.match(/^(?:the\s+)?([A-Za-z][\w'’()\- ]{1,40}?s)\s+are\s+((?:[\w'’-]+\s+){0,3}?(?:that|which|who|where|other than|in which)\b.{3,})$/i);
    if (m && okTerm(m[1]) && m[1].split(/\s+/).length <= 4) return { term: m[1].trim(), def: clean(m[2]) };
    m = t.match(/^([A-Z][\w'’()\- ]{1,44}?)\s?[:–—]\s+(.{8,})$/) || t.match(/^([A-Z][\w'’()\- ]{1,44}?)\s+-\s+(.{8,})$/);
    if (m && okTerm(m[1]) && !/=/.test(m[1])) return { term: m[1].trim(), def: clean(m[2]) };
    m = t.match(/^(.{12,}?),?\s+(?:which\s+)?(?:is|are)\s+(?:called|known as|termed)\s+(?:an?\s+|the\s+)?["'“]?([A-Za-z][\w'’\- ]{2,40}?)["'”]?\.?$/i);
    if (m && m[2].split(/\s+/).length <= 4 && okTerm(m[2])) return { term: m[2].trim(), def: clean(m[1].replace(/^(this|that|it)\s+/i, "")) };
    return null;
  }

  /* ---------- 3. key terms: noun-like phrases (RAKE-style splitting), counted, nested phrases resolved ---------- */
  const EDGE_BAD = new Set("show shows showed shown produce produces produced come comes came become becomes became make makes made found find finds says say said want wants wanted go goes went cause causes caused call called known increase increases increased decrease decreases decreased mean means meant include includes included occur occurs occurred form forms formed give gives gave take takes took need needs needed help helps helped lead leads led tend tends seem seems appear appears happen happens begin begins began keep keeps kept put puts let lets think thinks thought know knew learn learned remember note common classic really main key important different new other various certain whole typical basic general specific simple large small high low good bad big first second third last next many much more most less least great little own same real able likely possible going talk talking look looking today okay yeah right pretty actually basically something anything everything someone people person thing stuff kind sort lot bit part parts type types way ways case cases time times example study studies called based given related shows showing work works worked does done".split(" "));
  function keyTerms(sections, units, defs, titleStems, n) {
    const cnt = new Map(), secs = new Map(), surf = new Map();
    const lowerSeen = new Set();
    sections.forEach((s, si) => s.units.forEach(u => {
      norm(u.t).split(/[.,;:!?()\[\]{}"“”‘’\/\\|–—=+×÷<>]+|\s-\s|'s\b/).forEach(part => {
        const raw = part.split(/\s+/).map(w => w.replace(/^[^\wÀ-ɏ]+|[^\wÀ-ɏ]+$/g, "")).filter(Boolean);
        let ph = [];
        const end = () => {
          while (ph.length && (EDGE_BAD.has(ph[0].toLowerCase()) || /ly$/i.test(ph[0]))) ph.shift();
          while (ph.length && (EDGE_BAD.has(ph[ph.length - 1].toLowerCase()) || /(ly|ed|ing)$/.test(ph[ph.length - 1]) && /^[a-z]/.test(ph[ph.length - 1]))) ph.pop();
          for (let L = 1; L <= 3; L++) for (let i = 0; i + L <= ph.length; i++) {
            const g = ph.slice(i, i + L); if (EDGE_BAD.has(g[0].toLowerCase()) || EDGE_BAD.has(g[L - 1].toLowerCase())) continue;
            const key = g.map(stem).join(" "); if (key.split(" ").every(k => titleStems.has(k)) && L === 1) continue;
            cnt.set(key, (cnt.get(key) || 0) + 1);
            if (!secs.has(key)) secs.set(key, new Set()); secs.get(key).add(si);
            const disp = g.join(" "), sv = surf.get(key) || new Map(); sv.set(disp, (sv.get(disp) || 0) + 1); surf.set(key, sv);
            if (/^[a-z]/.test(disp)) lowerSeen.add(key);
          }
          ph = [];
        };
        raw.forEach(w => { const c = w.toLowerCase(); if (STOP.has(c) || c.length < 2 || /^\d+$/.test(c) || (c.length < 3 && !/^[A-Z]{2}$/.test(w))) end(); else ph.push(w); });
        end();
      });
    }));
    const scored = [];
    cnt.forEach((c, key) => {
      const ws = key.split(" "), L = ws.length;
      /* how often this phrase only appears inside a longer repeated phrase */
      let inside = 0; cnt.forEach((c2, k2) => { if (c2 >= 2 && k2.split(" ").length === L + 1 && (" " + k2 + " ").includes(" " + key + " ")) inside += c2; });
      const eff = c - inside;
      const sv = [...surf.get(key).entries()].sort((a, b) => b[1] - a[1]);
      let disp = (lowerSeen.has(key) ? (sv.find(([d]) => /^[a-z]/.test(d)) || sv[0]) : sv[0])[0];
      const proper = !lowerSeen.has(key) && disp.split(/\s+/).every(w => /^[A-Z]/.test(w));
      if (c < 2 && !(proper && L >= 2)) return;
      if (L === 1 && (disp.length < 5 && !/^[A-Z]{2,5}$/.test(disp))) return;
      if (eff <= 0 && c < 4) return;
      const sc = Math.max(eff, c * .3) * (1 + .7 * (L - 1)) * (1 + .15 * Math.min(secs.get(key).size, 4)) * (proper ? 1.1 : 1);
      scored.push({ key, t: disp, sc });
    });
    const out = [], keys = [];
    const sub = (a, b) => (" " + a + " ").includes(" " + b + " ") || (" " + b + " ").includes(" " + a + " ");
    const add = (t, key) => { if (keys.some(k => sub(k, key))) return false; keys.push(key); out.push(t); return true; };
    let nd = 0;
    defs.forEach(d => { if (nd < 14 && d.term.split(/\s+/).length <= 4 && ++nd && d.term.split(/\s+/).length <= 4) add(d.term.replace(/^(the|an?)\s+/i, ""), d.term.replace(/^(the|an?)\s+/i, "").split(/\s+/).map(stem).join(" ")); });
    const cap = Math.min(22, out.length + n); scored.sort((a, b) => b.sc - a.sc).forEach(s => { if (out.length < cap) add(s.t, s.key); });
    return out;
  }

  /* ---------- 4. TextRank over TF-IDF sentence vectors ---------- */
  function vectors(units) {
    const df = new Map();
    units.forEach(u => { u.ws = content(u.t); new Set(u.ws).forEach(w => df.set(w, (df.get(w) || 0) + 1)); });
    const N = units.length;
    units.forEach(u => {
      const tf = new Map(); u.ws.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
      let nrm = 0; u.v = new Map();
      tf.forEach((c, w) => { const x = (1 + Math.log(c)) * Math.log(1 + N / df.get(w)); u.v.set(w, x); nrm += x * x; });
      nrm = Math.sqrt(nrm) || 1; u.v.forEach((x, w) => u.v.set(w, x / nrm));
    });
    return df;
  }
  const cos = (a, b) => { let s = 0; const [x, y] = a.v.size < b.v.size ? [a.v, b.v] : [b.v, a.v]; x.forEach((v, w) => { const o = y.get(w); if (o) s += v * o; }); return s; };
  function textRank(units) {
    const n = units.length; if (!n) return;
    if (n === 1) { units[0].tr = 1; return; }
    const W = units.map(() => []);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const s = cos(units[i], units[j]); if (s > .05) { W[i].push([j, s]); W[j].push([i, s]); } }
    const out = W.map(e => e.reduce((a, x) => a + x[1], 0));
    let r = new Array(n).fill(1 / n);
    for (let it = 0; it < 30; it++) {
      const nr = new Array(n).fill(.15 / n);
      for (let i = 0; i < n; i++) W[i].forEach(([j, s]) => { nr[i] += .85 * r[j] * s / (out[j] || 1); });
      const d = nr.reduce((a, x, i) => a + Math.abs(x - r[i]), 0); r = nr; if (d < 1e-5) break;
    }
    const mx = Math.max(...r) || 1; units.forEach((u, i) => u.tr = r[i] / mx);
  }

  /* ---------- 5. main ---------- */
  function summarize(text, title = "", opts = {}) {
    text = String(text || "").slice(0, 120000);
    if (text.replace(/\s/g, "").length < 60) return null;
    const titleStems = new Set(content(title));
    let sections = structure(text, title);
    sections.forEach(s => s.units = s.units.filter(u => !isJunk(u.t)));
    sections = sections.filter(s => s.units.length);
    const all = sections.flatMap((s, si) => s.units.map((u, ui) => Object.assign(u, { si, ui })));
    if (!all.length) return null;
    /* drop repeated lines (slide footers, repeated titles) */
    const seenT = new Map(); all.forEach(u => { const k = u.t.toLowerCase().replace(/\W+/g, ""); seenT.set(k, (seenT.get(k) || 0) + 1); u.k = k; });
    const df = vectors(all);
    const used = new Set();
    const units = all.filter(u => { if (seenT.get(u.k) > 2 && u.t.length < 80) return false; if (used.has(u.k)) return false; used.add(u.k); return u.ws.length > 0 || RE_FORMULA.test(u.t); });
    if (!units.length) return null;
    sections = sections.map(s => ({ ...s, units: s.units.filter(u => units.includes(u)) })).filter(s => s.units.length);
    units.forEach((u, i) => {
      const prev = i > 0 && units[i - 1].si === u.si && units[i - 1].para === u.para ? units[i - 1] : null;
      u.prev = prev; u.kinds = classify(u.t).filter(k => k !== "def");
      u.def = definitionOf(u.t, prev && prev.t); if (u.def) u.kinds.unshift("def");
      /* "This is …", "It …" only makes sense with the sentence before it */
      u.needsPrev = !!prev && /^((at|in|on|for|by|with|from) (this|that|these|those)|this|these|that|it|they|such|he|she|its|their|here)\b/i.test(u.t) && prev.t.length + u.t.length < 380;
    });
    textRank(units);
    const headStems = sections.map(s => new Set(content(s.h)));
    units.forEach(u => {
      const len = u.t.length;
      let sc = .55 * u.tr;
      sc += .12 * Math.min(1, u.ws.filter(w => titleStems.has(w)).length / 2);
      sc += .12 * Math.min(1, u.ws.filter(w => headStems[u.si].has(w)).length / 2);
      if (u.first && u.para === 0) sc += .08;
      if (u.def) sc += .35;
      if (u.kinds.includes("formula")) sc += .25;
      if (u.kinds.includes("exam")) sc += .2;
      if (u.kinds.includes("list")) sc += .12;
      if (u.kinds.includes("num")) sc += .08;
      if (len < 30) sc -= .12; if (len > 300) sc -= .15; if (len > 450) sc -= .25;
      if (/^(but|and|so|also|this|these|it|they|however|thus)\b/i.test(u.t) && !u.first && !u.def) sc -= .06;
      u.meta = /\b(today we|we're going to|we are going to|let's (move on|talk|look|keep)|in this (lecture|chapter|video|episode|section)|we will (look|discuss|cover)|i'll put|any questions|does that make sense|see you next)\b/i.test(u.t);
      if (u.meta) sc -= .35;
      u.filler = u.meta || u.ws.length <= 2 && !u.def && !RE_FORMULA.test(u.t);
      u.sc = sc;
    });

    /* budget grows with the amount of material; every section gets at least one bullet */
    const wordsN = units.reduce((a, u) => a + u.t.split(/\s+/).length, 0);
    const avgW = wordsN / units.length;
    let budget = Math.round(2 + wordsN / 110 + units.length * .05);
    if (avgW < 11) budget = Math.max(budget, Math.round(units.length * .8)); /* slides are already condensed */
    budget = opts.max || Math.max(4, Math.min(60, budget));
    const nSec = sections.length;
    const secW = sections.map(s => s.units.reduce((a, u) => a + Math.max(.05, u.sc), 0));
    const totW = secW.reduce((a, b) => a + b, 0) || 1;
    /* each section's share of the budget follows how much it says; must-keep lines come on top */
    const quota = sections.map((s, i) => Math.max(1, Math.min(s.units.length, Math.round(budget * secW[i] / totW))));
    const picked = new Set();
    const mmr = (cands, k, already) => {
      const sel = [];
      while (sel.length < k) {
        let best = null, bs = -1e9;
        cands.forEach(c => { if (picked.has(c)) return; const red = Math.max(0, ...[...already, ...sel].map(s => cos(c, s))); const v = .72 * c.sc - .28 * red; if (red > .72) return; if (v > bs) { bs = v; best = c; } });
        if (!best) break; sel.push(best); picked.add(best);
      }
      return sel;
    };
    sections.forEach((s, i) => {
      /* must-keep first: definitions, formulas, exam cues (capped so a section of definitions stays readable) */
      const must = s.units.filter(u => u.def || u.kinds.includes("formula") || (u.kinds.includes("exam") && u.sc > .35)).sort((a, b) => b.sc - a.sc).slice(0, sections.length > 12 ? Math.max(quota[i], 1) + 1 : Math.max(quota[i], 3) + 2);
      must.forEach(u => picked.add(u));
      const others = s.units.filter(u => !picked.has(u));
      const rest = must.length ? Math.min(others.length, Math.max(others.length >= 3 ? 1 : 0, quota[i] - Math.ceil(must.length / 2))) : quota[i];
      if (rest > 0) mmr(others, rest, must);
    });

    /* key terms, then make sure every key term is in a bullet */
    const defs = units.filter(u => u.def).map(u => ({ term: u.def.term.replace(/^(the|an?)\s+/i, ""), def: u.def.def, t: u.t }));
    const nTerms = Math.max(4, Math.min(12, Math.round(2 + Math.sqrt(units.length) * .9)));
    const terms = keyTerms(sections, units, defs, titleStems, nTerms);
    const hasTerm = (u, t) => { const ks = t.split(/\s+/).map(stem); const ws = u.ws; return ks.every(k => ws.includes(k)) || u.t.toLowerCase().includes(t.toLowerCase()); };
    terms.forEach(t => {
      if ([...picked].some(u => hasTerm(u, t))) return;
      const c = units.filter(u => hasTerm(u, t)).sort((a, b) => b.sc - a.sc)[0];
      if (c) picked.add(c);
    });

    /* important vocabulary (TF-IDF mass across the notes, ignoring filler lines) */
    const N = units.length, vocab = new Map();
    units.forEach(u => { if (!u.filler) u.v.forEach((x, w) => vocab.set(w, (vocab.get(w) || 0) + x)); });
    const topVocab = [...vocab.entries()].filter(([w]) => df.get(w) >= 2 || N < 6).sort((a, b) => b[1] - a[1]).slice(0, Math.max(12, Math.min(60, Math.round(N * 1.2))));
    /* fill gaps: if an important word is in no bullet yet, add the best line that carries it (within a small extra budget) */
    const cover = () => new Set([...picked].flatMap(u => u.ws));
    let extra = Math.max(3, Math.round(budget * .5));
    for (const [w] of topVocab.slice(0, 24)) {
      if (extra <= 0) break;
      if (cover().has(w)) continue;
      const c = units.filter(u => !picked.has(u) && !u.filler && u.ws.includes(w)).sort((a, b) => b.sc - a.sc)[0];
      if (c) { picked.add(c); extra--; }
    }

    /* coverage: sections, key terms, and the share of important vocabulary carried by the bullets */
    const sel = units.filter(u => picked.has(u));
    const secCovered = new Set(sel.map(u => u.si)).size;
    const termsCovered = terms.filter(t => sel.some(u => hasTerm(u, t)));
    const selWords = new Set(sel.flatMap(u => u.ws));
    const vw = topVocab.reduce((a, [, x]) => a + x, 0) || 1, vc = topVocab.reduce((a, [w, x]) => a + (selWords.has(w) ? x : 0), 0);
    const missedWords = topVocab.filter(([w]) => !selWords.has(w)).slice(0, 6).map(([w]) => {
      const u = units.find(u => u.ws.includes(w)); const m = u && u.t.match(new RegExp(`\\b(${w.replace(/[^\w]/g, "")}[\\w'-]*)`, "i")); return m ? m[1] : null;
    }).filter(Boolean);

    const tidy = s => s.replace(/\s+/g, " ").replace(/^[-•*–]\s*/, "").replace(/^((so|okay|ok|right|well|now|and|but|yeah|um+|uh+)\s*,\s*)+/i, "").replace(/^(um+|uh+|so|okay|yeah|and|but then)\s+(?=[a-z])/i, "").replace(/\s+([,.;:])/g, "$1").replace(/^[a-z]/, c => c.toUpperCase()).replace(/[:;,]$/, "").trim();
    const outSecs = sections.map((s, i) => ({ h: s.h, part: !!s.part, items: s.units.filter(u => picked.has(u)).map(u => ({ t: tidy(u.needsPrev && !picked.has(u.prev) ? u.prev.t + " " + u.t : u.t), kinds: u.kinds, def: u.def ? { term: u.def.term, def: u.def.def } : null })) })).filter(s => s.items.length);
    const bullets = outSecs.flatMap(s => s.items.map(x => x.t));
    const shownHeads = outSecs.filter(s => s.h).length;
    return {
      bullets, terms, source: "auto",
      sections: shownHeads >= 2 ? outSecs : [{ h: "", items: outSecs.flatMap(s => s.items) }],
      defs: defs.slice(0, 40).map(d => ({ term: tidy(d.term), def: tidy(d.def) })),
      coverage: {
        sections: nSec, sectionsCovered: secCovered,
        terms: terms.length, termsCovered: termsCovered.length,
        vocab: Math.round(100 * vc / vw), missed: missedWords,
        units: N, words: wordsN
      }
    };
  }

  G.SDSummary = { summarize, structure, definitionOf, stem, content };
})(typeof window !== "undefined" ? window : globalThis);
