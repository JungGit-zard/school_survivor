import sys, json, struct, io
import numpy as np
from PIL import Image
sys.path.insert(0, r'F:\ezs-work\backup\boss_remodel_20261121\scripts')
GLB = r'F:\ezs-work\backup\mini_zombies_stage_20261115\build\mini_zombies_uncompressed.glb'
b=open(GLB,'rb').read(); l=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+l]); off=20+l
binb=b[off+8:off+8+struct.unpack('<I',b[off:off+4])[0]]
bv=j['bufferViews'][1]; raw=np.frombuffer(binb,dtype=np.uint8,count=bv['byteLength'],offset=bv['byteOffset']).reshape(-1,24)
uv=raw[:,12:20].copy().view(np.float32).reshape(-1,2); part=raw[:,20]; pos=raw[:,0:12].copy().view(np.float32).reshape(-1,3)
pv=j['bufferViews'][0]; im=np.array(Image.open(io.BytesIO(binb[pv['byteOffset']:pv['byteOffset']+pv['byteLength']])).convert('RGB'))
parts={p['id']:p for p in j['nodes'][0]['extras']['mini']['parts']}
def key(u,v):
    px=min(511.999,max(0,u*512)); py=min(511.999,max(0,v*512))
    if py<128: return 'slot%d'%int(px//8)
    if py<256 and px>=320: return 'slot%d'%(64+int((px-320)//8))
    return 'r%dc%d'%(int(py//128),int(px//32))
for body in sys.argv[1:]:
    print('==',body)
    for pid,p in parts.items():
        if p.get('body')!=body: continue
        m=part==pid; ks={}
        for (u,v),y in zip(uv[m],pos[m][:,1]):
            k=key(u,v); c=im[min(511,int(v*512)),min(511,int(u*512))]
            ks.setdefault(k,[0,c,[]]); ks[k][0]+=1; ks[k][2].append(y)
        print(' ',p['part'],' '.join('%s:%d#%02x%02x%02x(y%.2f-%.2f)'%(k,n,*c,min(ys),max(ys)) for k,(n,c,ys) in sorted(ks.items(),key=lambda x:-x[1][0])))
