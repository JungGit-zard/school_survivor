"""Compare gray orthographic silhouettes against the original transparent sheet."""
from pathlib import Path
import json
from PIL import Image, ImageChops

here=Path(__file__).resolve().parent
src=Image.open(here.parents[1] / 'character_sheets' / 'PLAYER_front_side_back_face_v1.png').convert('RGBA')
out=here/'blockout'
boxes={'front':(10,70,412,820),'side':(415,70,730,820),'back':(745,70,1140,820)}
report={}
tiles=[]
for view,box in boxes.items():
    ref=src.crop(box)
    model=Image.open(out/f'PLAYER_v8_blockout_{view}.png').convert('RGBA')
    rm=ref.getchannel('A').point(lambda a:255 if a>32 else 0)
    mm=model.getchannel('A').point(lambda a:255 if a>32 else 0)
    rb=rm.getbbox(); mb=mm.getbbox()
    if not rb or not mb: raise RuntimeError(f'Missing {view} alpha mask')
    rm=rm.crop(rb); mm=mm.crop(mb)
    w1=round(rm.width*680/rm.height); w2=round(mm.width*680/mm.height)
    rm=rm.resize((w1,680),Image.Resampling.NEAREST)
    mm=mm.resize((w2,680),Image.Resampling.NEAREST)
    canvas_r=Image.new('L',(540,740))
    canvas_m=Image.new('L',(540,740))
    canvas_r.paste(rm,((540-w1)//2,30))
    canvas_m.paste(mm,((540-w2)//2,30))
    inter=ImageChops.multiply(canvas_r,canvas_m)
    union=ImageChops.lighter(canvas_r,canvas_m)
    intersection=sum(1 for pixel in inter.getdata() if pixel)
    union_area=sum(1 for pixel in union.getdata() if pixel)
    iou=round(intersection/union_area,4)
    report[view]={'reference_bbox_crop':rb,'model_bbox_render':mb,
      'source_width_at_680h':w1,'model_width_at_680h':w2,'silhouette_iou':iou}
    tile=Image.new('RGB',(540,740),(246,246,246))
    red=Image.new('RGB',tile.size,(222,68,100))
    cyan=Image.new('RGB',tile.size,(47,175,206))
    tile.paste(red,(0,0),canvas_r)
    tile.paste(cyan,(0,0),canvas_m.point(lambda a:int(a*.48)))
    tile.save(out/f'PLAYER_v8_blockout_{view}_overlay.png')
    tiles.append(tile)
contact=Image.new('RGB',(540*3,740),(255,255,255))
for i,tile in enumerate(tiles): contact.paste(tile,(i*540,0))
contact.save(out/'PLAYER_v8_blockout_overlay_contact.png')
(out/'PLAYER_v8_blockout_silhouette_metrics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))

