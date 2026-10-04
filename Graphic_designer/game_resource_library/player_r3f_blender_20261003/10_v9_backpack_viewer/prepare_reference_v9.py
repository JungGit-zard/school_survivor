"""Crop the provided high-resolution turnaround for Blender image empties."""
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
source = here.parents[1] / 'character_sheets' / 'PLAYER_front_side_back_face_v1.png'
sheet = Image.open(source).convert('RGBA')
assert sheet.size == (1774, 887), sheet.size
for name, box in {
    'front': (0, 80, 420, 810),
    'side': (405, 80, 745, 810),
    'back': (740, 80, 1130, 810),
}.items():
    sheet.crop(box).save(here / f'PLAYER_reference_{name}.png')
print(f'Prepared Blender orthographic references from {source}')

