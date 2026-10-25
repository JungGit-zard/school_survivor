"""Nanum Myeongjo ExtraBold TTF(3.2MB) -> unicode-range 분할 WOFF2 + CSS.

브라우저는 화면에 실제로 그려지는 글자가 속한 조각만 내려받는다.
- core: ASCII/Latin + 랜딩 타이틀 글자. 랜딩 첫 로드는 이 조각 하나(수 KB)만 받는다.
- game: 게임 소스(src/**/*.js, *.jsx)에 등장하는 한글. HUD 퀘스트 문구용.
- hangul-NN: 나머지 한글 음절을 연속 구간으로 나눈 조각(동적 문구 대비).
- misc: 그 밖의 기호/자모.

실행: python scripts/build-nanum-myeongjo-woff2.py  (fonttools + brotli 필요)
원본 TTF는 보관용으로 남긴다. CSS는 src/assets/fonts/nanumMyeongjo.css 를 덮어쓴다.
"""
from __future__ import annotations

import pathlib
import re

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / 'src' / 'assets' / 'fonts'
SOURCE = FONT_DIR / 'NanumMyeongjo-ExtraBold.ttf'
OUT_DIR = FONT_DIR / 'nanum-myeongjo'
CSS_PATH = FONT_DIR / 'nanumMyeongjo.css'
HANGUL_CHUNK = 1100
LANDING_TITLE_TEXT = '탈출! 좀비학교'


def is_hangul(cp: int) -> bool:
    return 0xAC00 <= cp <= 0xD7A3


def game_corpus() -> set[int]:
    chars: set[int] = set()
    for path in (ROOT / 'src').rglob('*'):
        if path.suffix not in {'.js', '.jsx', '.json'} or '.test.' in path.name:
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        chars.update(ord(ch) for ch in re.findall('[가-힣]', text))
    return chars


def to_ranges(cps: list[int]) -> str:
    cps = sorted(cps)
    parts = []
    start = prev = cps[0]
    for cp in cps[1:] + [None]:
        if cp is not None and cp == prev + 1:
            prev = cp
            continue
        parts.append(f'U+{start:X}' if start == prev else f'U+{start:X}-{prev:X}')
        if cp is not None:
            start = prev = cp
    return ', '.join(parts)


def main() -> None:
    cmap = TTFont(SOURCE).getBestCmap()
    available = set(cmap)
    core = {cp for cp in available if cp < 0x250 or 0x2000 <= cp <= 0x206F}
    core |= {ord(ch) for ch in LANDING_TITLE_TEXT if ord(ch) in available}
    game = (game_corpus() & available) - core
    rest_hangul = sorted(cp for cp in available if is_hangul(cp) and cp not in core and cp not in game)
    misc = available - core - game - set(rest_hangul)

    chunks: list[tuple[str, list[int]]] = [('core', sorted(core)), ('game', sorted(game))]
    for index in range(0, len(rest_hangul), HANGUL_CHUNK):
        chunks.append((f'hangul-{index // HANGUL_CHUNK + 1:02d}', rest_hangul[index:index + HANGUL_CHUNK]))
    if misc:
        chunks.append(('misc', sorted(misc)))

    OUT_DIR.mkdir(exist_ok=True)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    options.hinting = False

    faces = []
    total = 0
    for name, cps in chunks:
        font = TTFont(SOURCE)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=cps)
        subsetter.subset(font)
        out = OUT_DIR / f'nanum-myeongjo-extrabold-{name}.woff2'
        font.flavor = 'woff2'
        font.save(out)
        size = out.stat().st_size
        total += size
        print(f'{name:12s} {len(cps):6d} glyphs {size / 1024:8.1f} KB')
        faces.append(
            "@font-face {\n"
            "  font-family: 'Nanum Myeongjo';\n"
            f"  src: url('./nanum-myeongjo/{out.name}') format('woff2');\n"
            "  font-weight: 800;\n"
            "  font-style: normal;\n"
            "  font-display: swap;\n"
            f"  unicode-range: {to_ranges(cps)};\n"
            "}\n"
        )
    print(f'total {total / 1024:.1f} KB in {len(chunks)} files')
    header = (
        '/* 생성 파일: scripts/build-nanum-myeongjo-woff2.py — 직접 수정하지 말 것.\n'
        ' * unicode-range 분할 WOFF2. 브라우저는 실제 그려지는 글자의 조각만 받는다.\n'
        ' * 원본 TTF(NanumMyeongjo-ExtraBold.ttf)는 보관용이며 번들에 포함되지 않는다. */\n'
    )
    CSS_PATH.write_text(header + '\n'.join(faces), encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
