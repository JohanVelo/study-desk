import json,sys,os
src=sys.argv[1]; out=sys.argv[2]
PS=[1,8,19,22,23,27,32,46,51,90,91,103,121,139,150]
BOOKS={'MRK':('mark',None),'GEN':('genesis',None),'LUK':('luke',None),'ACT':('acts',None),'JHN':('john',None),'EXO':('exodus',range(1,21)),'ROM':('romans',None),'PSA':('psalms',PS)}
res={}
for code,(fn,keep) in BOOKS.items():
  data=json.load(open(os.path.join(src,fn+'.json')))
  chs={}; block=None; cur=None; lastv={}; header=None
  for o in data:
    t=o['type']
    if t=='header': header=o['value'].strip(); block=None; continue
    if t in('paragraph start','stanza start'):
      cur='p' if t=='paragraph start' else 'q'; block=None; continue
    if t in('paragraph end','stanza end'): block=None; continue
    if t=='line break': continue
    ch=o['chapterNumber']
    if keep and ch not in keep: header=None; continue
    v=o['verseNumber']; txt=o['value'].replace('  ',' ').strip()
    if not txt: continue
    arr=chs.setdefault(str(ch),[])
    if header: arr.append(['h',[0,header]]); header=None; block=None
    if block is None or block[1]!=ch:
      block=[cur or 'p',ch]; arr.append(block)
    vn = v if lastv.get(ch)!=v else 0
    lastv[ch]=v
    block.append([vn,txt])
  for k,bl in chs.items():
    chs[k]=[[b[0]]+b[2:] if b[0]!='h' else b for b in bl]
  res[code]=chs
json.dump(res,open(out,'w'),ensure_ascii=False,separators=(',',':'))
print({k:len(v) for k,v in res.items()}, os.path.getsize(out))
