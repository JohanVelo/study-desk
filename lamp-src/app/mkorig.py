"""Build Lamp's "Original words" data from STEPBible TAGNT/TAHOT + TBESG/TBESH (CC BY 4.0, STEPBible.org / Tyndale House).
Output: src/orig/<BOOK>.json  {"ch": [[verse words...], ...]}  word = [original, transliteration, English, key, grammar]
        src/orig/lex.json      {key: [lemma, translit, gloss, meaning, count, [refs]]}"""
import json, os, re, sys, html
from collections import defaultdict
STEP = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "orig")
os.makedirs(OUT, exist_ok=True)
CANON = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split()
ROW = re.compile(r"^([0-9A-Za-z]{3})\.(\d+)\.(\d+)(?:\([^)]*\))?#\d+=([A-Za-z()]+)\t")

books = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))  # code -> ch -> v -> words
order = []
use = defaultdict(list)  # key -> refs

def heb_key(ds):
    m = re.search(r"\{(H\d+[A-Z]?)\}", ds)
    return m.group(1) if m else ds.split("/")[0].strip("{}")

def clean_tr(t):
    return re.sub(r"[./\\]", "", t).replace("-", "").lower()

for fn in ["hot-Gen-Deu.txt", "hot-Jos-Est.txt", "hot-Job-Sng.txt", "hot-Isa-Mal.txt", "gnt1.txt", "gnt2.txt"]:
    greek = fn.startswith("gnt")
    for line in open(os.path.join(STEP, fn), encoding="utf-8-sig"):
        m = ROW.match(line)
        if not m: continue
        bk, ch, v, typ = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
        if bk not in order: order.append(bk)
        c = line.rstrip("\n").split("\t")
        if greek:
            word, tr = (re.match(r"(.*?) \((.*)\)$", c[1]) or re.match(r"(.*)()", c[1])).groups()
            ds, gram = (c[3].split("=", 1) + [""])[:2]
            eng = c[2]
            w = [word, tr, eng, ds, gram, typ]
        else:
            if "L" not in typ[:1] and "Q" not in typ[:1]: continue
            word = c[1].replace("/", "").replace("\\", "")
            tr = clean_tr(c[2]); eng = re.sub(r"\s*/\s*", " ", c[3]).strip()
            w = [word, tr, eng, heb_key(c[4]), c[5], typ]
        books[bk][ch][max(v, 1) if not greek else v].append(w)

nt0 = order.index("Mat")
ot, nt = order[:nt0], order[nt0:]
assert len(ot) == 39 and len(nt) == 27, (len(ot), len(nt))
code_of = dict(zip(ot + nt, CANON))

# lexicon
lex = {}
def meaning_g(d):
    bs = [html.unescape(re.sub(r"<[^>]+>", "", b)).strip(" ,;:.") for b in re.findall(r"<b>(.*?)</b>", d)]
    bs = [b for b in bs if b and not re.search(r"[Ͱ-Ͽἀ-῿]", b)]
    out = []
    for b in bs:
        if b.lower() not in [o.lower() for o in out]: out.append(b)
    return "; ".join(out[:4])
def meaning_h(d):
    lines = [html.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.split(r"<br\s*/?>", d, flags=re.I)]
    top = [re.sub(r"^\d+\)\s*", "", x) for x in lines if re.match(r"^\d+\)", x)]
    if not top: top = [x.lstrip(": ") for x in lines if x and not x.startswith("Also means")][:1]
    return "; ".join(top[:4])
for fn, g in [("tbesg.txt", True), ("tbesh.txt", False)]:
    for line in open(os.path.join(STEP, fn), encoding="utf-8-sig"):
        c = line.rstrip("\n").split("\t")
        if len(c) < 8 or not re.match(r"^[GH]\d", c[0]): continue
        k = c[1].split()[0]
        if k in lex: continue
        mean = (meaning_g if g else meaning_h)(c[7])
        gl = re.sub(r"\s*/\s*", ", ", c[6].split(":", 1)[-1].strip())
        mean = re.sub(r"\s*\((TWOT|BDB|AS)\)\s*", " ", mean).strip()
        lex[k] = [c[3], c[4] if g else clean_tr(c[4]), gl, mean[:260]]

def resolve(k):
    if k in lex: return k
    b = re.match(r"([GH])0*(\d+)", k)
    if b:
        for cand in [f"{b.group(1)}{int(b.group(2)):04d}", f"{b.group(1)}{int(b.group(2)):04d}G", f"{b.group(1)}{int(b.group(2)):04d}A", k[:5]]:
            if cand in lex: return cand
    return k

miss = defaultdict(int); total = 0
for bk, chs in books.items():
    code = code_of[bk]; greek = bk in nt
    data = {}
    for ch in sorted(chs):
        vs = chs[ch]; n = max(vs)
        arr = []
        for v in range(1, n + 1):
            ws = vs.get(v, [])
            if greek:
                main = [w for w in ws if "N" in w[5]]
                ws = main or [w for w in ws if "K" in w[5]] or ws
            row = []
            for w in ws:
                k = resolve(w[3]); total += 1
                if k not in lex: miss[k] += 1
                else: use[k].append(f"{code}.{ch}.{v}")
                row.append([w[0].replace("¶", "").strip(), w[1], w[2].replace("<obj.>", "(object)").replace("<the>", "(the)"), k, w[4]])
            arr.append(row)
        data[str(ch)] = arr
    json.dump(data, open(os.path.join(OUT, code + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

out = {}
for k, refs in use.items():
    u = list(dict.fromkeys(refs)); n = len(refs)
    pick = [u[int(i * (len(u) - 1) / 5)] for i in range(6)] if len(u) > 6 else u
    out[k] = lex[k] + [n, list(dict.fromkeys(pick))]
for p in "GH":
    json.dump({k: v for k, v in out.items() if k[0] == p}, open(os.path.join(OUT, f"lex-{p.lower()}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
open(os.path.join(OUT, "CREDITS.txt"), "w").write("Greek and Hebrew words, glosses, grammar and brief lexicons: STEPBible.org data by Tyndale House, Cambridge (TAGNT, TAHOT, TBESG, TBESH), licensed CC BY 4.0. https://github.com/STEPBible/STEPBible-Data\n")
print("words", total, "missing", sum(miss.values()), sorted(miss.items(), key=lambda x: -x[1])[:15])
