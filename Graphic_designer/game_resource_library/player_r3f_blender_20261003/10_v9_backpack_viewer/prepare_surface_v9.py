"""Extract original interior facial features; paint only non-silhouette clothing marks."""
from pathlib import Path
from PIL import Image, ImageDraw

here=Path(__file__).resolve().parent
source=Image.open(here.parents[1]/'character_sheets'/'PLAYER_front_side_back_face_v1.png').convert('RGBA')
out=here/'surface'
out.mkdir(parents=True,exist_ok=True)

def eye(name,box):
    image=source.crop(box).resize((512,384),Image.Resampling.LANCZOS)
    pixels=image.load()
    for y in range(image.height):
        for x in range(image.width):
            r,g,b,a=pixels[x,y]
            # The extreme crop margins contain the FACE drawing's cheek
            # contour and fringe. Those belong to 3D shape, never a decal.
            if ((name=='eye_left' and ((x<70 and y>145) or (y<30 and x<260)))
                or (name=='eye_right' and x>452 and y>120)):
                pixels[x,y]=(r,g,b,0)
                continue
            # Remove the beige face paper, keeping white sclera, red iris,
            # dark eyelid and the warm eyebrows from the original FACE panel.
            if r>215 and g>170 and b>145 and 8<=r-g<=65 and 0<=g-b<=65:
                pixels[x,y]=(r,g,b,0)
            elif a<64:
                pixels[x,y]=(r,g,b,0)
    image.save(out/f'PLAYER_v9_{name}.png')

eye('eye_left',(1286,428,1419,558))
eye('eye_right',(1506,428,1636,558))
eye('eye_side',(632,248,680,306))

# Facial expression: copied from the same original FACE panel, never its outer line.
smile=source.crop((1425,566,1505,605)).resize((320,156),Image.Resampling.LANCZOS)
p=smile.load()
for y in range(smile.height):
    for x in range(smile.width):
        r,g,b,a=p[x,y]
        if r>205 and g>155 and b>135 and 6<=r-g<=70 and 0<=g-b<=75:
            p[x,y]=(r,g,b,0)
smile.save(out/'PLAYER_v9_smile.png')

# The eyes and mouth live on the actual face UV, including its front/side
# bevel. No floating eye cards or separate duplicated profile-eye decal.
face_atlas=Image.new('RGBA',(1024,1024),(252,229,213,255))
def paste_face_detail(filename,center_x,top_y,width,height):
    mark=Image.open(out/filename).convert('RGBA').resize(
        (width,height),Image.Resampling.LANCZOS)
    face_atlas.alpha_composite(mark,(round(center_x-width/2),top_y))
eye_width=round(.30/.86*1024)
eye_height=round(.28/.81*1024)
eye_top=round((1-(2.425-1.98)/.81)*1024)
paste_face_detail('PLAYER_v9_eye_left.png',(-.26+.43)/.86*1024,
                  eye_top,eye_width,eye_height)
paste_face_detail('PLAYER_v9_eye_right.png',(.26+.43)/.86*1024,
                  eye_top,eye_width,eye_height)
paste_face_detail('PLAYER_v9_smile.png',512,
                  round((1-(2.1325-1.98)/.81)*1024),
                  round(.16/.86*1024),round(.075/.81*1024))
face_atlas.save(out/'PLAYER_v9_face_surface_uv.png')

# Torso decal contains only inward clothing color separations and gold buttons.
# The silhouette remains the torso mesh; no black body outline is baked.
torso=Image.new('RGBA',(512,512),(0,0,0,0))
d=ImageDraw.Draw(torso)
d.polygon([(166,5),(346,5),(333,183),(318,451),(192,451),(179,183)],fill=(250,247,240,255))
d.polygon([(135,10),(214,87),(192,228),(147,432),(90,432),(115,50)],fill=(212,32,32,255))
d.polygon([(377,10),(298,87),(320,228),(365,432),(422,432),(397,50)],fill=(212,32,32,255))
d.polygon([(165,5),(226,75),(198,128),(141,39)],fill=(255,248,241,255))
d.polygon([(347,5),(286,75),(314,128),(371,39)],fill=(255,248,241,255))
d.polygon([(236,74),(276,74),(289,113),(274,143),(238,143),(223,113)],fill=(255,201,33,255))
d.polygon([(238,143),(274,143),(287,316),(255,354),(225,316)],fill=(246,184,26,255))
d.line([(225,316),(255,354),(287,316)],fill=(197,128,22,255),width=5)
for x in (122,390):
    for y in (300,375):
        d.rounded_rectangle((x-10,y-10,x+10,y+10),radius=2,fill=(255,210,50,255))
torso.save(out/'PLAYER_v9_torso_front.png')

skirt=Image.new('RGBA',(512,256),(0,0,0,0))
d=ImageDraw.Draw(skirt)
for x in (50,135,220,305,390,475):
    d.polygon([(x,0),(x+8,0),(x+21,256),(x+1,256)],fill=(22,104,160,120))
    d.line([(x+10,0),(x+22,256)],fill=(56,200,240,85),width=4)
skirt.save(out/'PLAYER_v9_skirt_pleats.png')

pack=Image.new('RGBA',(512,512),(0,0,0,0))
d=ImageDraw.Draw(pack)
d.rounded_rectangle((46,50,466,266),radius=20,fill=(56,200,240,235),outline=(22,104,160,255),width=10)
d.rectangle((228,215,286,271),fill=(255,192,51,255),outline=(150,97,23,255),width=7)
d.rounded_rectangle((79,304,431,454),radius=16,outline=(22,104,160,175),width=9)
pack.save(out/'PLAYER_v9_pack_back.png')

print('Surface art created from the high-resolution original; no outer silhouette in texture')

