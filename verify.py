import importlib.util,glob,os,math,sys
from math import *
bad=0;n=0;nc=0
for f in sorted(glob.glob('content/[0-9]*.py')):
    s=importlib.util.spec_from_file_location('m',f);m=importlib.util.module_from_spec(s);sys.path.insert(0,'content');s.loader.exec_module(m);t=m.TOPIC
    for k,p in enumerate(t['problems']):
        n+=1
        assert 0<=p['ans']<len(p['opts']),(f,k)
        if p['calc'] is None: nc+=1; continue
        v=eval(p['calc']); vals=p['vals']; c=vals[p['ans']]
        ok=abs(v-c)<=0.02*(abs(c) or 1) and all(abs(x-c)>0.03*(abs(c) or 1) for j,x in enumerate(vals) if j!=p['ans'])
        if not ok: bad+=1; print('FAIL',t['slug'],k+1,v,vals,p['ans'])
print(f'{n} problems, {n-nc} numerically verified, {nc} conceptual, {bad} failures'); sys.exit(1 if bad else 0)
