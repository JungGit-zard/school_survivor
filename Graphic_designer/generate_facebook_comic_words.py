from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
POOL = ROOT / "marketing" / "x_daily_zombie_school_posting" / "image_pool"
SOURCE = "zombie_catch_comic_20261014"
COLLECTION = "zombie_catch_comic_words_20261015"
STORIES = ["desk_trap", "locker_maze", "cafeteria_tray", "gym_ball", "library_cart"]

# Four short words or sound effects, in reading order, for each four-panel episode.
WORDS = {
    "ko": [
        ["교실!", "숨자!", "쾅!", "탈출!"],
        ["사물함!", "막혔어!", "숨자!", "찾았다!"],
        ["급식실!", "쟁반!", "으악!", "엎질렀다!"],
        ["체육관!", "공이다!", "데굴!", "성공!"],
        ["도서관!", "쉿!", "카트!", "우당탕!"],
    ],
    "en": [
        ["CLASS!", "HIDE!", "THUMP!", "ESCAPE!"],
        ["LOCKERS!", "BLOCKED!", "HIDE!", "FOUND!"],
        ["LUNCH!", "TRAY!", "WHOA!", "SPLASH!"],
        ["GYM!", "BALL!", "ROLL!", "SUCCESS!"],
        ["LIBRARY!", "SHH!", "CART!", "CRASH!"],
    ],
    "ja": [
        ["教室！", "危ない！", "ドン！", "脱出！"],
        ["ロッカー！", "ふさがれた！", "隠れて！", "見つけた！"],
        ["食堂！", "トレー！", "うわっ！", "大惨事！"],
        ["体育館！", "ボール！", "ゴロゴロ！", "大成功！"],
        ["図書室！", "静かに！", "カート！", "ガシャーン！"],
    ],
    "vi": [
        ["LỚP HỌC!", "NÉ!", "RẦM!", "THOÁT!"],
        ["TỦ ĐỒ!", "BỊ CHẶN!", "TRỐN!", "THẤY RỒI!"],
        ["NHÀ ĂN!", "KHAY!", "ÔI!", "ĐỔ MẤT!"],
        ["NHÀ THỂ CHẤT!", "BÓNG!", "LĂN!", "THÀNH CÔNG!"],
        ["THƯ VIỆN!", "SUỴT!", "XE ĐẨY!", "RẦM!"],
    ],
}

FONTS = {
    "ko": Path(r"C:\Windows\Fonts\malgunbd.ttf"),
    "en": Path(r"C:\Windows\Fonts\segoeuib.ttf"),
    "ja": Path(r"C:\Windows\Fonts\YuGothB.ttc"),
    "vi": Path(r"C:\Windows\Fonts\segoeuib.ttf"),
}
# Each label sits inside the top edge of one panel, clear of the CTA strip.
ANCHORS = ((28, 22), (558, 22), (28, 475), (558, 475))
MAX_LABEL_WIDTH = 480


def draw_label(draw, anchor, text, font):
    x, y = anchor
    bounds = draw.textbbox((0, 0), text, font=font, stroke_width=1)
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    if width > MAX_LABEL_WIDTH:
        raise ValueError(f"Caption does not fit its panel: {text}")
    draw.rounded_rectangle(
        (x - 8, y - 4, x + width + 8, y + height + 7),
        radius=11,
        fill=(255, 255, 255),
        outline=(33, 28, 93),
        width=2,
    )
    draw.text((x, y), text, font=font, fill=(237, 53, 117),
              stroke_width=1, stroke_fill=(33, 28, 93))


def main():
    generated = []
    for locale, episodes in WORDS.items():
        for number, captions in enumerate(episodes, start=1):
            source = POOL / "facebook" / locale / SOURCE / f"{number:02d}.png"
            target = POOL / "facebook" / locale / COLLECTION / f"{number:02d}.png"
            image = Image.open(source).convert("RGB")
            draw = ImageDraw.Draw(image)
            font = ImageFont.truetype(str(FONTS[locale]), 25)
            for anchor, caption in zip(ANCHORS, captions):
                draw_label(draw, anchor, caption, font)
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target)
            generated.append((locale, number, target))

    catalog_path = POOL / "image_catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    catalog["images"] = [
        row for row in catalog["images"]
        if not (row.get("platform") == "Facebook" and row.get("collection") == COLLECTION)
    ]
    for locale, number, target in generated:
        captions = WORDS[locale][number - 1]
        catalog["images"].append({
            "platform": "Facebook",
            "locale": locale,
            "collection": COLLECTION,
            "path": f"facebook/{locale}/{COLLECTION}/{number:02d}.png",
            "gameStartText": {
                "ko": "게임시작", "en": "START GAME",
                "ja": "ゲームスタート", "vi": "BẮT ĐẦU CHƠI",
            }[locale],
            "format": "four_panel_comic_with_localized_words",
            "story": STORIES[number - 1],
            "dialogueWords": captions,
        })
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    config_path = POOL.parent / "posting_config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    for locale in WORDS:
        config["facebook_rotation_image_pool"][locale]["images"] = [
            f"image_pool/facebook/{locale}/{COLLECTION}/{number:02d}.png"
            for number in range(1, 6)
        ]
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
