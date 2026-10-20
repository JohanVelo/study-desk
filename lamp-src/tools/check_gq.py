import json,sys
B='lamp/bib/BSB/'
d=json.load(open('gq.json'))
cache={}
def v(b,c,n):
    if b not in cache: cache[b]=json.load(open(B+b+'.json'))
    ch=cache[b]
    if c<1 or c>len(ch) or n<1 or n>len(ch[c-1]): return None
    return ch[c-1][n-1]
err=[]
assert len(d)==10,len(d)
for s in d:
    if len(s['qs'])!=12: err.append((s['id'],len(s['qs'])))
    for q in s['qs']:
        if len(q['o'])!=4 or len(set(q['o']))!=4: err.append(q['q'])
        if max(len(o) for o in q['o'])>62: err.append(('long',q['o']))
        b,c,n=q['r'].split('.'); c=int(c); n=int(n)
        t=v(b,c,n)
        if t is None: err.append(('badref',q['r']))
        if len(sys.argv)>1 and s['id'] in sys.argv[1:]:
            print('\n##',q['q'],'=>',q['o'][0]); 
            for k in range(-1,3):
                x=v(b,c,n+k)
                if x: print(f'  {b} {c}:{n+k}',x[:300])
print('sets',len(d),'qs',sum(len(s['qs']) for s in d)); print('ERR',err)
