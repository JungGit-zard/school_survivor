"""만화 원본 PNG -> 미디어 사이트 배포용 WebP(본편 + 썸네일) + episodes.json.

실행 (r3f_prototype 폴더에서):  python media-site/tools/build_comics.py
- 원본 PNG는 그대로 둔다(보관용). 배포 폴더 media-site/site/ 에는 WebP만 생성된다.
- 1~5화: media-site/originals/web-comics-v2/*.png (한국어 대사판, 모든 언어 공용)
- 6~15화: public/comics/backlog-20261015/{ko,en,ja,vi}/NN.png (언어별)
"""
from __future__ import annotations

import json
import pathlib

from PIL import Image

MEDIA = pathlib.Path(__file__).resolve().parent.parent
PROTOTYPE = MEDIA.parent
SITE = MEDIA / 'site'
COMICS_OUT = SITE / 'comics'
LANGS = ['ko', 'en', 'ja', 'vi']
FULL_MAX_WIDTH = 1080
FULL_QUALITY = 82
THUMB_SIZE = (400, 300)  # 첫 컷 상단 4:3 크롭
THUMB_QUALITY = 72

V2_FILES = [
    'comic_ep01_attendance_vertical_1x4_ko_dialogue_v2.png',
    'comic_ep02_lunch_line_vertical_1x4_ko_dialogue_v2.png',
    'comic_ep03_homework_wind_vertical_1x4_ko_dialogue_v2.png',
    'comic_ep04_gym_bounce_vertical_1x4_ko_dialogue_v2.png',
    'comic_ep05_library_quiet_vertical_1x4_ko_dialogue_v2.png',
]
BACKLOG_DIR = PROTOTYPE / 'public' / 'comics' / 'backlog-20261015'


def save_full(src: pathlib.Path, dest: pathlib.Path) -> tuple[int, int]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as image:
        image = image.convert('RGB')
        if image.width > FULL_MAX_WIDTH:
            image = image.resize((FULL_MAX_WIDTH, round(image.height * FULL_MAX_WIDTH / image.width)), Image.LANCZOS)
        image.save(dest, 'WEBP', quality=FULL_QUALITY, method=6)
        return image.size


def save_thumb(src: pathlib.Path, dest: pathlib.Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as image:
        image = image.convert('RGB')
        crop_height = round(image.width * THUMB_SIZE[1] / THUMB_SIZE[0])
        image = image.crop((0, 0, image.width, min(crop_height, image.height)))
        image = image.resize(THUMB_SIZE, Image.LANCZOS)
        image.save(dest, 'WEBP', quality=THUMB_QUALITY, method=6)


def main() -> None:
    copy = json.loads((MEDIA / 'tools' / 'comic-copy.json').read_text(encoding='utf-8'))
    episodes = []
    for index, name in enumerate(V2_FILES, start=1):
        number = f'{index:02d}'
        src = MEDIA / 'originals' / 'web-comics-v2' / name
        width, height = save_full(src, COMICS_OUT / 'full' / 'shared' / f'{number}.webp')
        save_thumb(src, COMICS_OUT / 'thumbs' / 'shared' / f'{number}.webp')
        path = {lang: f'shared/{number}.webp' for lang in LANGS}
        episodes.append({'number': index, 'image': path, 'thumb': path, 'width': width, 'height': height})
    for episode in range(1, 11):
        number = f'{episode:02d}'
        path = {}
        for lang in LANGS:
            src = BACKLOG_DIR / lang / f'{number}.png'
            width, height = save_full(src, COMICS_OUT / 'full' / lang / f'{number}.webp')
            save_thumb(src, COMICS_OUT / 'thumbs' / lang / f'{number}.webp')
            path[lang] = f'{lang}/{number}.webp'
        episodes.append({'number': episode + 5, 'image': path, 'thumb': path, 'width': width, 'height': height})

    for item in episodes:
        item['title'] = {lang: copy['copy'][lang]['comics'][item['number'] - 1]['title'] for lang in LANGS}
        item['summary'] = {lang: copy['copy'][lang]['comics'][item['number'] - 1]['summary'] for lang in LANGS}
    ui = {lang: {key: value for key, value in copy['copy'][lang].items() if key != 'comics'} for lang in LANGS}
    data = {'languages': copy['languages'], 'ui': ui, 'episodes': episodes}
    (COMICS_OUT / 'episodes.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')

    total = sum(p.stat().st_size for p in COMICS_OUT.rglob('*.webp'))
    print(f'{len(episodes)} episodes, {sum(1 for _ in COMICS_OUT.rglob("*.webp"))} webp, {total / 1024 / 1024:.1f} MB')


if __name__ == '__main__':
    main()
