import sys, json, struct, io, os
import numpy as np
from PIL import Image
def acc(j,binb,i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]; dt={5126:np.float32,5123:np.uint16,5121:np.uint8,5125:np.uint32}[a['componentType']]
    st=bv.get('byteStride'); off=bv.get('byteOffset',0)+a.get('byteOffset',0)
    if st and st!=n*np.dtype(dt).itemsize:
        raw=np.frombuffer(binb,dtype=np.uint8,count=st*a['count'],offset=off).reshape(-1,st)[:, :n*np.dtype(dt).itemsize]
        return raw.copy().view(dt).reshape(-1,n)
    return np.frombuffer(binb,dtype=dt,count=n*a['count'],offset=off).reshape(-1,n)
for f in sys.argv[1:]:
    b=open(f,'rb').read(); l=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+l]); off=20+l
    binb=b[off+8:off+8+struct.unpack('<I',b[off:off+4])[0]]
    img=j['images'][0]; 
    if 'uri' in img: im=Image.open(os.path.join(os.path.dirname(f),img['uri']))
    else:
        bv=j['bufferViews'][img['bufferView']]; im=Image.open(io.BytesIO(binb[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]))
    im=np.array(im.convert('RGB')); H,W=im.shape[:2]
    print('==',os.path.basename(f),'colormap',W,H)
    for mi,m in enumerate(j['meshes']):
        for p in m['primitives']:
            pos=acc(j,binb,p['attributes']['POSITION']); uv=acc(j,binb,p['attributes']['TEXCOORD_0'])
            js=acc(j,binb,p['attributes']['JOINTS_0'])[:,0] if 'JOINTS_0' in p['attributes'] else None
            ks={}
            for i,(u,v) in enumerate(uv):
                x=min(W-1,int(u*W)); y=min(H-1,int(v*H)); k='r%dc%d'%(y*4//H, x*16//W)
                c=im[y,x]; ks.setdefault(k,[0,c,[]]); ks[k][0]+=1; ks[k][2].append(pos[i][1])
            print(' ',m.get('name'),' '.join('%s:%d#%02x%02x%02x(y%.2f-%.2f)'%(k,n,*c,min(ys),max(ys)) for k,(n,c,ys) in sorted(ks.items(),key=lambda x:-x[1][0])))
