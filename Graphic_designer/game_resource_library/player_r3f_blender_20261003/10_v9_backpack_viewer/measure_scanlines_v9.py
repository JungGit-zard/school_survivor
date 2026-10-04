"""Measure normalized original/model silhouettes at fixed body-height rows."""
import json
import sys
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
model_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else here
version = 'v7' if 'v7' in model_dir.name else 'v9'
source = Image.open(here.parents[1] / 'character_sheets' /
                    'PLAYER_front_side_back_face_v1.png').convert('RGBA')
boxes = {'front': (10,70,412,820), 'side': (415,70,730,820),
         'back': (745,70,1140,820)}
rows = (55,100,160,220,270,320,380,430,490,550,610,660)

def normalized(mask):
    bbox = mask.getbbox()
    mask = mask.crop(bbox)
    width = round(mask.width * 680 / mask.height)
    mask = mask.resize((width,680),Image.Resampling.NEAREST)
    canvas = Image.new('L',(540,740))
    canvas.paste(mask,((540-width)//2,30))
    return canvas

result = {}
for view,box in boxes.items():
    reference = normalized(source.crop(box).getchannel('A').point(
        lambda a: 255 if a > 32 else 0))
    model = normalized(Image.open(model_dir/'blockout'/
        f'PLAYER_{version}_blockout_{view}.png').convert('RGBA')
        .getchannel('A').point(lambda a: 255 if a > 32 else 0))
    samples=[]
    for row in rows:
        def span(mask):
            active=[x for x in range(mask.width) if mask.getpixel((x,row))]
            return [min(active),max(active)] if active else None
        reference_span=span(reference); model_span=span(model)
        samples.append({'row':row,'reference':reference_span,'model':model_span,
            'left_delta':model_span[0]-reference_span[0] if reference_span and model_span else None,
            'right_delta':model_span[1]-reference_span[1] if reference_span and model_span else None})
    result[view]=samples
print(json.dumps(result,ensure_ascii=False,indent=2))
if version=='v9':
    (here/'blockout'/'PLAYER_v9_scanline_metrics.json').write_text(
        json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
