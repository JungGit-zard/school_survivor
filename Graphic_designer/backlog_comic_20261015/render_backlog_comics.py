from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "backlog_comic_20261015" / "art"
POOL = ROOT.parent / "marketing" / "x_daily_zombie_school_posting" / "image_pool"

# One short, episode-specific four-beat word sequence per language. The text is
# painted into the intentionally blank speech balloons and CTA banner.
COPY = {
    "ko": {
        "words": ["어라?", "빙글빙글!", "공 폭탄!", "잡았다!"],
        "cta": "게임시작",
        "promo": "우당탕탕 좀비잡기 · escapezombie.com",
        "font": "C:/Windows/Fonts/malgun.ttf",
    },
    "en": {
        "words": ["Huh?", "Round and round!", "Ball storm!", "Gotcha!"],
        "cta": "START GAME",
        "promo": "SCHOOL ZOMBIE ACTION · escapezombie.com",
        "font": "C:/Windows/Fonts/arial.ttf",
    },
    "ja": {
        "words": ["あれ？", "ぐるぐる！", "ボールの嵐！", "つかまえた！"],
        "cta": "ゲームスタート",
        "promo": "ドタバタゾンビ退治 · escapezombie.com",
        "font": "C:/Windows/Fonts/YuGothM.ttc",
    },
    "vi": {
        "words": ["Ơ kìa!", "Quay vòng!", "Bão bóng!", "Tóm được rồi!"],
        "cta": "BẮT ĐẦU CHƠI",
        "promo": "HÀNH ĐỘNG DIỆT ZOMBIE · escapezombie.com",
        "font": "C:/Windows/Fonts/arial.ttf",
    },
}

EPISODE_WORDS = {
    "ep01": {  # globe cart draws them into the gym's dodgeball pile
        "ko": ["어라?", "빙글빙글!", "공 폭탄!", "잡았다!"],
        "en": ["Huh?", "Round and round!", "Ball storm!", "Gotcha!"],
        "ja": ["あれ？", "ぐるぐる！", "ボールの嵐！", "つかまえた！"],
        "vi": ["Ơ kìa!", "Quay vòng!", "Bão bóng!", "Tóm được rồi!"],
    },
    "ep02": {  # science-room magnet attracts lunch trays and belt buckles
        "ko": ["좀비다!", "자석 ON!", "철컥!", "성공!"],
        "en": ["Zombies!", "Magnet on!", "Click!", "Success!"],
        "ja": ["ゾンビだ！", "磁石ON！", "ピタッ！", "成功！"],
        "vi": ["Zombie kìa!", "Bật nam châm!", "Dính chặt!", "Thành công!"],
    },
    "ep03": {  # library cart lure and harmless falling books
        "ko": ["쉿!", "수레 출발!", "책 폭포!", "잡았다!"],
        "en": ["Shh!", "Cart away!", "Book avalanche!", "Gotcha!"],
        "ja": ["しーっ！", "カート発進！", "本の雪崩！", "つかまえた！"],
        "vi": ["Suỵt!", "Xe lăn đi!", "Sách đổ ào!", "Tóm được rồi!"],
    },
    "ep04": {  # music room rhythm and instrument stands
        "ko": ["쉿!", "둥둥짝!", "쿵!", "앙코르?"],
        "en": ["Shh!", "Drumroll!", "Boom!", "Encore?"],
        "ja": ["しーっ！", "ドンドン！", "ドーン！", "アンコール？"],
        "vi": ["Suỵt!", "Tùng tùng!", "Bùm!", "Nữa nhé?"],
    },
    "ep05": {  # craft-paper roll neatly wraps zombies in art room
        "ko": ["어라?", "돌돌돌!", "종이 붕대!", "완성!"],
        "en": ["Uh-oh!", "Roll, roll!", "Paper wrap!", "Ta-da!"],
        "ja": ["あれ？", "コロコロ！", "紙ぐるぐる！", "完成！"],
        "vi": ["Ơ kìa!", "Lăn nào!", "Cuộn giấy!", "Xong rồi!"],
    },
    "ep06": {  # cafeteria gelatin and trays
        "ko": ["푸딩이다!", "살금살금!", "흔들흔들!", "냠!"],
        "en": ["Pudding!", "Sneak away!", "Wobble!", "Yum!"],
        "ja": ["プリンだ！", "そーっと！", "ぷるぷる！", "おいしい！"],
        "vi": ["Bánh flan!", "Đi nhẹ thôi!", "Rung rinh!", "Ngon quá!"],
    },
    "ep07": {  # auditorium curtain and foam stage props
        "ko": ["좀비 등장!", "스포트라이트!", "커튼 쾅!", "앙코르!"],
        "en": ["Zombies!", "Spotlight!", "Curtain call!", "Encore!"],
        "ja": ["ゾンビだ！", "ライトON！", "幕がドーン！", "アンコール！"],
        "vi": ["Zombie kìa!", "Đèn sân khấu!", "Màn buông!", "Diễn nữa!"],
    },
    "ep08": {  # greenhouse hose and sprinkler
        "ko": ["좀비다!", "물 뿌려!", "빙글빙글!", "새싹 성공!"],
        "en": ["Zombies!", "Sprinkle!", "Spin, spin!", "Sprout!"],
        "ja": ["ゾンビだ！", "水まき！", "ぐるぐる！", "芽が出た！"],
        "vi": ["Zombie kìa!", "Tưới nước!", "Quay vòng!", "Nảy mầm!"],
    },
    "ep09": {  # gym padded-mat zigzag maze
        "ko": ["코스 준비!", "점프!", "미로 완성!", "완주!"],
        "en": ["Course set!", "Hop!", "Mat maze!", "Finish!"],
        "ja": ["コース完成！", "ジャンプ！", "マット迷路！", "ゴール！"],
        "vi": ["Sẵn sàng!", "Nhảy nào!", "Mê cung nệm!", "Về đích!"],
    },
    "ep10": {  # astronomy projector and cushions
        "ko": ["별이다!", "달이 떴다!", "빙글빙글!", "우주 정복!"],
        "en": ["Stars!", "Big moon!", "Round we go!", "Space secured!"],
        "ja": ["星だ！", "大きな月！", "ぐるぐる！", "宇宙制圧！"],
        "vi": ["Sao kìa!", "Trăng to quá!", "Quay vòng!", "Vũ trụ an toàn!"],
    },
}

# Co-ordinates are proportional to the 1250x1250 imagegen canvas.
BUBBLES = [
    (0.02, 0.015, 0.24, 0.10),
    (0.52, 0.015, 0.24, 0.10),
    (0.02, 0.405, 0.23, 0.10),
    (0.52, 0.405, 0.24, 0.10),
]


def font_for(path: str, size: int) -> ImageFont.FreeTypeFont:
    font_path = Path(path)
    if not font_path.exists():
        font_path = Path("C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(str(font_path), size=size)


def fit_font(draw: ImageDraw.ImageDraw, text: str, font_path: str,
             max_width: int, start: int, min_size: int = 20) -> ImageFont.FreeTypeFont:
    size = start
    while size > min_size:
        font = font_for(font_path, size)
        if draw.textbbox((0, 0), text, font=font, stroke_width=1)[2] <= max_width:
            return font
        size -= 1
    return font_for(font_path, min_size)


def render(source: Path, destination: Path, locale: str, episode: str) -> None:
    copy = COPY[locale]
    words = EPISODE_WORDS.get(episode, {}).get(locale, copy["words"])
    image = Image.open(source).convert("RGB")
    width, height = image.size
    draw = ImageDraw.Draw(image)
    for text, (x0, y0, x1, y1) in zip(words, BUBBLES):
        box = (round(x0 * width), round(y0 * height), round(x1 * width), round(y1 * height))
        font = fit_font(draw, text, copy["font"], box[2] - box[0] - 25, 39)
        bounds = draw.textbbox((0, 0), text, font=font, stroke_width=1)
        tx = box[0] + (box[2] - box[0] - (bounds[2] - bounds[0])) / 2
        ty = box[1] + (box[3] - box[1] - (bounds[3] - bounds[1])) / 2 - bounds[1]
        draw.text((tx, ty), text, font=font, fill=(255, 35, 139),
                  stroke_width=2, stroke_fill=(41, 30, 84))

    # The lower blank banner is reserved for the localized game CTA and promo.
    cta_font = fit_font(draw, copy["cta"], copy["font"], round(width * .88), 66, 28)
    promo_font = fit_font(draw, copy["promo"], copy["font"], round(width * .90), 27, 18)
    cta_box = draw.textbbox((0, 0), copy["cta"], font=cta_font, stroke_width=1)
    promo_box = draw.textbbox((0, 0), copy["promo"], font=promo_font)
    cta_x = (width - (cta_box[2] - cta_box[0])) / 2
    promo_x = (width - (promo_box[2] - promo_box[0])) / 2
    draw.text((cta_x, round(height * .843)), copy["cta"], font=cta_font,
              fill=(255, 226, 0), stroke_width=2, stroke_fill=(28, 24, 76))
    draw.text((promo_x, round(height * .91)), copy["promo"], font=promo_font,
              fill=(255, 255, 255), stroke_width=1, stroke_fill=(28, 24, 76))
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--episodes", nargs="+", required=True,
                        help="episode identifiers matching art/epNN.png")
    parser.add_argument("--platforms", nargs="+", choices=["x", "facebook"], default=["x"])
    args = parser.parse_args()
    for episode in args.episodes:
        art = ART_DIR / f"{episode}.png"
        if not art.is_file():
            raise FileNotFoundError(art)
        for platform in args.platforms:
            for locale in COPY:
                target = POOL / platform / locale / "backlog_comic_20261015" / f"{episode[-2:]}.png"
                render(art, target, locale, episode)


if __name__ == "__main__":
    main()
