"""Reviewer sheets: source-to-model views and eight 45-degree rotations."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

here=Path(__file__).resolve().parent
out=here/'final'
source=Image.open(here.parents[1]/'character_sheets'/'PLAYER_front_side_back_face_v1.png').convert('RGBA')
views=[('FRONT',(10,70,412,820),'front'),
       ('SIDE',(415,70,730,820),'side'),
       ('BACK',(745,70,1140,820),'back')]
font=ImageFont.load_default()
contact=Image.new('RGB',(3*600,2*700),(244,244,244))
draw=ImageDraw.Draw(contact)
for col,(label,box,view) in enumerate(views):
    ref=source.crop(box)
    ref=ref.crop(ref.getchannel('A').getbbox())
    ref=ref.resize((round(ref.width*630/ref.height),630),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(600,670),(255,255,255,255))
    tile.alpha_composite(ref,((600-ref.width)//2,10))
    contact.paste(tile.convert('RGB'),(col*600,30))
    model=Image.open(out/f'PLAYER_v8_final_{view}.png').convert('RGBA')
    model=model.crop(model.getchannel('A').getbbox())
    model=model.resize((round(model.width*630/model.height),630),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(600,670),(255,255,255,255))
    tile.alpha_composite(model,((600-model.width)//2,10))
    contact.paste(tile.convert('RGB'),(col*600,730))
    draw.text((col*600+18,8),f'ORIGINAL {label}',fill=(45,45,45),font=font)
    draw.text((col*600+18,708),f'BLENDER v8 {label}',fill=(45,45,45),font=font)
contact.save(out/'PLAYER_v8_source_vs_model_contact.png')

angles=list(range(0,360,45))
contact=Image.new('RGB',(4*500,2*530),(247,247,247))
draw=ImageDraw.Draw(contact)
for i,angle in enumerate(angles):
    photo=Image.open(out/f'PLAYER_v8_turn_{angle:03d}.png').convert('RGBA')
    bg=Image.new('RGBA',(500,500),(255,255,255,255))
    photo.thumbnail((500,500),Image.Resampling.LANCZOS)
    bg.alpha_composite(photo,((500-photo.width)//2,(500-photo.height)//2))
    x=(i%4)*500;y=(i//4)*530
    contact.paste(bg.convert('RGB'),(x,y+25))
    draw.text((x+15,y+6),f'{angle:03d} degrees',fill=(35,35,35),font=font)
contact.save(out/'PLAYER_v8_360_contact.png')
print('Saved source-to-model and 360-degree QA contacts')

