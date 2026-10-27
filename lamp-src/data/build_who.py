# Builds lamp/bib/people.json and places.json. Run from a folder holding gh/theo/json (Theographic) and who/ (fixes.py, Easton data).
import json,re,html,collections,sys
T='gh/theo/json/'
pe=json.load(open(T+'people.json'));pl=json.load(open(T+'places.json'));vs=json.load(open(T+'verses.json'))
OS="Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev".split()
CODES="GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split()
O2C=dict(zip(OS,CODES));ORD={c:i for i,c in enumerate(CODES)}
vref={v['id']:v['fields']['osisRef'] for v in vs}
def conv(o):b,c,v=o.split('.');return (O2C[b],int(c),int(v))
LINK=re.compile(r'\[[^\]]*\]\(/[a-z0-9]+#([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?\)')
def clean(t):
    t=html.unescape(t or '').replace('\xa0',' ').replace('�',' ')
    t=re.sub(r'\[([^\]]*)\]\([^)]*\)',r'\1',t);t=re.sub(r'\s+([,;.)])',r'\1',t);t=re.sub(r'\(\s+','(',t);t=re.sub(r'[ \t]+',' ',t).strip()
    return t
def trim(t,lim):
    if len(t)<=lim:return t
    cut=t[:lim];p=max(cut.rfind('. '),cut.rfind('.)'),cut.rfind('.”'))
    return cut[:p+1] if p>lim*0.4 else cut.rstrip()+'…'
def pick(raw,chs,books):
    """keep only paragraphs whose verse citations belong to this person/place"""
    paras=[x for x in raw.split('\n\n') if x.strip()]
    out=[];keeping=False;cited_any=False;matched_any=False
    for i,pa in enumerate(paras):
        refs=[(O2C.get(b),int(c)) for b,c,_ in LINK.findall(pa) if O2C.get(b)]
        if refs:
            cited_any=True
            hit=sum(r in chs for r in refs)
            ok=refs[0] in chs or hit*3>=len(refs)
            keeping=ok;matched_any|=ok
        elif i==0: keeping=True
        if keeping: out.append(pa)
    if out and paras and out[0] is not paras[0]:
        out=paras if (len(chs)>=8 and matched_any) else []
    return out,cited_any,matched_any
stats=collections.Counter();drops=[]
def person_rows():
    idx={p['id']:i for i,p in enumerate(pe)};rows=[]
    for p in pe:
        f=p['fields'];refs=sorted((conv(vref[v]) for v in f.get('verses',[]) if v in vref),key=lambda r:(ORD[r[0]],r[1],r[2]))
        chs={(b,c) for b,c,_ in refs}
        raw=(f.get('dictText') or [''])[0]
        paras,cited,matched=pick(raw,chs,None)
        d=clean('\n\n'.join(paras)) if paras else ''
        if raw and cited and not matched: stats['dropped_mismatch']+=1;drops.append((f.get('displayTitle'),clean(raw)[:100]));d=''
        elif raw and len(paras)<len([x for x in raw.split('\n\n') if x.strip()]): stats['trimmed']+=1
        if not raw: stats['no_dict']+=1
        cc=collections.Counter((b,c) for b,c,_ in refs)
        top=sorted(cc.items(),key=lambda x:-x[1])[:6];top=sorted([k for k,_ in top],key=lambda k:(ORD[k[0]],k[1]))
        rel=[[idx[i] for i in f.get(r,[]) if i in idx][:12] for r in ['father','mother','children','siblings','partners']]
        first=refs[0] if refs else None
        d=re.sub(r'^Heb\. id\.\s*','',d)
        rows.append([f.get('displayTitle') or f.get('name'),(f.get('gender') or '')[:1],trim(d,900),rel,f.get('alsoCalled') or '',len(refs),'%s.%d.%d'%first if first else '',['%s.%d'%k for k in top],f.get('name') or ''])
    return rows
def place_rows():
    rows=[]
    for p in pl:
        f=p['fields'];refs=sorted((conv(vref[v]) for v in f.get('verses',[]) if v in vref),key=lambda r:(ORD[r[0]],r[1],r[2]))
        chs={(b,c) for b,c,_ in refs};raw=(f.get('dictText') or [''])[0] if isinstance(f.get('dictText'),list) else (f.get('dictText') or '')
        paras,cited,matched=pick(raw,chs,None);d=clean('\n\n'.join(paras)) if paras else ''
        if raw and cited and not matched: stats['pl_dropped']+=1;d=''
        lat=f.get('openBibleLat') or f.get('latitude');lon=f.get('openBibleLong') or f.get('longitude')
        cc=collections.Counter((b,c) for b,c,_ in refs);top=sorted(cc.items(),key=lambda x:-x[1])[:6];top=sorted([k for k,_ in top],key=lambda k:(ORD[k[0]],k[1]))
        first=refs[0] if refs else None
        rows.append([f.get('displayTitle') or f.get('kjvName'),f.get('featureType') or '',float(lat) if lat else None,float(lon) if lon else None,trim(d,900),len(refs),'%s.%d.%d'%first if first else '',['%s.%d'%k for k in top]])
    return rows
P=person_rows();L=place_rows()
BN="Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra Nehemiah Esther Job Psalm Proverbs Ecclesiastes|Song of Songs|Isaiah Jeremiah Lamentations Ezekiel Daniel Hosea Joel Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah Malachi Matthew Mark Luke John Acts Romans|1 Corinthians|2 Corinthians|Galatians Ephesians Philippians Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus Philemon Hebrews James|1 Peter|2 Peter|1 John|2 John|3 John|Jude Revelation"
names=[]
for chunk in BN.split('|'):
    names+= [chunk] if chunk[:1].isdigit() or ' of ' in chunk else chunk.split()
assert len(names)==66,len(names)
BNAME=dict(zip(CODES,names))
def rlbl(r):
    b,c,v=r.split('.');return f"{BNAME[b]} {c}:{v}"
OVR={'Jesus':'Jesus Justus'}
dup=collections.Counter(r[0] for r in P)
for r in P:
    if r[0] in OVR and r[5]==1 and r[6]=='COL.4.11': r[0]=OVR[r[0]]
    elif dup[r[0]]>1 and '(' not in r[0] and r[6]: r[0]=f"{r[0]} ({rlbl(r[6])})"
dupl=collections.Counter(r[0] for r in L)
for r in L:
    if dupl[r[0]]>1 and '(' not in r[0] and r[6]: r[0]=f"{r[0]} ({rlbl(r[6])})"
OV2={"Elijah (1 Kings 17:1)":("Elijah the prophet","Elias"),"Jeremiah (2 Chronicles 35:25)":("Jeremiah the prophet",None),"Daniel (Ezekiel 14:14)":("Daniel the prophet",None),
 "Zacharias (Luke 1:5)":("Zechariah (father of John the Baptist)","Zacharias"),"Zechariah (Ezra 5:1)":("Zechariah the prophet",None),"Zacharias (2 Chronicles 24:20)":("Zechariah (son of Jehoiada)",None),
 "Herod":("Herod the Great",None),"Timotheus":("Timothy","Timotheus"),"Joab (1 Samuel 26:6)":("Joab (David's commander)",None),"Jonathan (1 Samuel 13:2)":("Jonathan (son of Saul)",None),
 "Nathan (2 Samuel 7:2)":("Nathan the prophet",None),"Zadok (2 Samuel 8:17)":("Zadok the priest",None),"Lazarus (John 11:1)":("Lazarus of Bethany",None),"Lazarus (Luke 16:20)":("Lazarus (in Jesus' parable)",None),
 "Abigail (1 Samuel 25:3)":("Abigail (wife of Nabal, then David)",None),"Gad (1 Samuel 22:5)":("Gad the prophet",None),"Hiram (2 Samuel 5:11)":("Hiram (king of Tyre)",None),"Mordecai (Esther 2:5)":("Mordecai",None),
 "Michael (Daniel 10:13)":("Michael (the angel)",None),"Tamar (2 Samuel 13:1)":("Tamar (daughter of David)",None),"Amnon (2 Samuel 3:2)":("Amnon (son of David)",None),"Adonijah (2 Samuel 3:4)":("Adonijah (son of David)",None),
 "Obed (Ruth 4:17)":("Obed (grandfather of David)",None),"Elkanah (1 Samuel 1:1)":("Elkanah (father of Samuel)",None),"Kish (1 Samuel 9:1)":("Kish (father of Saul)",None),"Benaiah (2 Samuel 8:18)":("Benaiah (son of Jehoiada)",None)}
for r in P:
    if r[0] in OV2:
        t,a=OV2.pop(r[0]);r[0]=t
        if a and a not in r[4].split(','):r[4]=(r[4]+','+a).strip(',')
assert not OV2,OV2
import sys as _s;_s.path.insert(0,'who');import fixes;fixes.apply(P)
print('still dup people',sum(1 for k,v in collections.Counter(r[0] for r in P).items() if v>1))
print(dict(stats));print('people',len(P),'places',len(L))
if len(sys.argv)>1:
    json.dump({'pl':P},open(sys.argv[1]+'/people.json','w'),ensure_ascii=False,separators=(',',':'))
    json.dump({'pl':L},open(sys.argv[1]+'/places.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(drops,open('who/drops.json','w'),ensure_ascii=False,indent=0)
