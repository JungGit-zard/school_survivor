import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from pathlib import Path
import cv2, math
OUT=Path(__file__).parent
W,H=720,540
Y,X=np.mgrid[0:H,0:W].astype(np.float32)
x=(X-W/2)/172; y=-(Y-270)/172
rng=np.random.default_rng(31)
k=np.arange(38); nz=1-2*(k+.5)/38; phi=k*2.399963229728653
planes=np.stack([np.sqrt(1-nz*nz)*np.cos(phi),np.sqrt(1-nz*nz)*np.sin(phi),nz],1).astype(np.float32)
planes[:,0]/=1.13; planes[:,1]/=.94; planes[:,2]/=.87
D=(.92+rng.uniform(-.075,.075,38)).astype(np.float32)
fontpath=Path("C:/Windows/Fonts/malgun.ttf")
font=ImageFont.truetype(str(fontpath),23) if fontpath.exists() else ImageFont.load_default()
small=ImageFont.truetype(str(fontpath),15) if fontpath.exists() else ImageFont.load_default()
def render(frame,plain=False):
 t=frame/24
 angle=0 if t<2 else .65*np.sin((t-2)/3*math.pi)
 c,s=np.cos(angle),np.sin(angle)
 R=np.array([[c,0,s],[0,1,0],[-s,0,c]],np.float32)
 P=planes@R.T
 front=np.full((H,W),1e4,np.float32); back=np.full((H,W),-1e4,np.float32); face=np.zeros((H,W),np.int16)
 for j,n in enumerate(P):
  if abs(n[2])<1e-5: continue
  z=(D[j]-n[0]*x-n[1]*y)/n[2]
  if n[2]>0:
   m=z<front; front[m]=z[m]; face[m]=j
  else: back=np.maximum(back,z)
 mask=(front>=back)&(front<3)&(back>-3)
 z=np.where(mask,front,0)
 pos=np.stack([x,y,z],-1)@R
 normal=P[face].copy(); smooth=np.stack([x/1.13**2,y/.94**2,z/.87**2],-1)
 smooth/=np.maximum(np.linalg.norm(smooth,axis=-1,keepdims=True),.001)
 normal=.72*normal+.28*smooth
 rough=np.sin(pos[:,:,0]*26+pos[:,:,1]*19)*np.cos(pos[:,:,2]*23-pos[:,:,1]*29)
 normal[:,:,0]+=.027*rough; normal[:,:,1]+=.022*np.sin(pos[:,:,0]*39+pos[:,:,2]*17)
 normal/=np.maximum(np.linalg.norm(normal,axis=-1,keepdims=True),.001)
 light=np.array([-.45,.75,.65]); light/=np.linalg.norm(light)
 diffuse=np.maximum(normal@light,0)
 grain=.5+.5*np.sin(pos[:,:,0]*65+pos[:,:,1]*32)*np.sin(pos[:,:,2]*57+pos[:,:,1]*74)
 marble=np.sin(pos[:,:,0]*8+pos[:,:,1]*5+np.sin(pos[:,:,2]*7))
 base=np.array([.29,.32,.36])[None,None,:]*(.38+.65*diffuse[:,:,None])
 base=base*(.86+.12*grain[:,:,None])+.025*marble[:,:,None]
 # View-dependent reflection lookup plus time-scrolling luminous texture.
 refl=2*normal[:,:,2,None]*normal-np.array([0,0,1])
 u=refl[:,:,0]; v=refl[:,:,1]
 flow=np.sin(5*u+3*v-t*1.6+1.2*np.sin(3*v+t*.65))
 ribbons=np.exp(-((flow-.56)/.18)**2)
 wisps=np.exp(-((np.sin(7*v-2*u+t*.9+np.sin(u*4))+.25)/.25)**2)
 surfuv=pos[:,:,0]*3.8+pos[:,:,1]*2.4+np.sin(pos[:,:,2]*5)-t*.7
 scroll=np.exp(-(np.sin(surfuv)/.26)**2)
 strength=(.66*ribbons+.25*wisps+.18*scroll)*(.3+.7*np.clip(normal[:,:,2],0,1))
 colors=np.array([.18,.63,1.0])[None,None,:]*strength[:,:,None]
 golden=np.exp(-((np.sin(u*4-v*3-t*.8)-.75)/.14)**2)*.5
 colors+=np.array([1.0,.62,.18])[None,None,:]*golden[:,:,None]
 half=light+np.array([0,0,1]); half/=np.linalg.norm(half)
 spec=np.maximum(normal@half,0)**40
 if not plain: base+=colors+spec[:,:,None]*.65
 else: base+=spec[:,:,None]*.12
 # Minimal bloom from the surface only; no particles or surrounding aura.
 emission=np.clip((colors-.3)*.6,0,1)*mask[:,:,None] if not plain else np.zeros_like(base)
 glow=Image.fromarray(np.uint8(emission*255)).filter(ImageFilter.GaussianBlur(9))
 bg=np.zeros((H,W,3),np.float32); bg[:]=[.035,.045,.065]
 radial=np.exp(-((x*.55)**2+(y*.55)**2))
 bg+=radial[:,:,None]*np.array([.025,.035,.05])
 ground=np.exp(-((X-W/2)/160)**2-((Y-447)/19)**2)
 bg*=1-.7*ground[:,:,None]
 rgb=np.where(mask[:,:,None],np.clip(base,0,1),bg)+np.asarray(glow)/255*.38
 im=Image.fromarray(np.uint8(np.clip(rgb,0,1)**.9*255))
 dr=ImageDraw.Draw(im)
 dr.text((30,22),"빛나는 돌 · 표면 광택 시안" if not plain else "기본 돌 · 광택 적용 전",font=font,fill=(224,233,247))
 dr.text((30,57),"스크롤 텍스처 + 시점 의존 광택 + 가산 합성",font=small,fill=(139,162,190))
 if not plain:
  dr.text((30,H-36),"카메라 고정 · 빛의 흐름" if t<2 else "시점 회전 · 표면 반응",font=small,fill=(170,193,216))
 dr.text((W-193,H-36),"SEAL 원본 복원 아님",font=small,fill=(124,141,165))
 return im
render(24).save(OUT/"glowing-stone.png")
a=render(24,True); b=render(24); comp=Image.new("RGB",(W*2,H)); comp.paste(a,(0,0)); comp.paste(b,(W,0)); comp.save(OUT/"stone-comparison.png")
writer=cv2.VideoWriter(str(OUT/"glowing-stone.mp4"),cv2.VideoWriter_fourcc(*"mp4v"),24,(W,H))
if not writer.isOpened(): raise RuntimeError("MP4 writer unavailable")
for f in range(120):
 writer.write(cv2.cvtColor(np.asarray(render(f)),cv2.COLOR_RGB2BGR))
writer.release()
cap=cv2.VideoCapture(str(OUT/"glowing-stone.mp4")); n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); ok,im=cap.read(); cap.release()
assert ok and n==120
Image.open(OUT/"glowing-stone.png").verify()
print("VERIFIED",n,"frames; PNG and MP4", [(f.name,f.stat().st_size) for f in OUT.iterdir()])
