from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
POOL = ROOT / "marketing" / "x_daily_zombie_school_posting" / "image_pool"
SOURCE = "zombie_catch_comic_20261014"
COLLECTION = "zombie_catch_comic_words_20261014"

# Four short beats per comic, matched to the scene shown in each episode.
WORDS = {
    "ko": [
        ["책상!", "좀비!", "휙!", "탈출!"],
        ["사물함!", "길막!", "숨자!", "찾았다!"],
        ["좀비!", "식당!", "우왕!", "악!"],
        ["체육관!", "공이다!", "데굴!", "골인!"],
        ["도서관!", "쉿!", "카트!", "와르르!"],
    ],
    "en": [
        ["DESK!", "ZOMBIE!", "WHOOSH!", "ESCAPE!"],
        ["LOCKERS!", "BLOCKED!", "HIDE!", "FOUND!"],
        ["ZOMBIE!", "CAFETERIA!", "WHOA!", "YIKES!"],
        ["GYM!", "BALL!", "ROLL!", "SCORE!"],
        ["LIBRARY!", "SHH!", "CART!", "CRASH!"],
    ],
    "ja": [
        ["机！", "ゾンビ！", "ヒュッ！", "脱出！"],
        ["ロッカー！", "通れない！", "隠れろ！", "見つかった！"],
        ["ゾンビ！", "食堂！", "わあ！", "きゃー！"],
        ["体育館！", "ボール！", "ゴロゴロ！", "ゴール！"],
        ["図書室！", "しーっ！", "カート！", "ガラガラ！"],
    ],
    "vi": [
        ["BÀN!", "ZOMBIE!", "VỤT!", "THOÁT!"],
        ["TỦ ĐỒ!", "CHẶN LỐI!", "NÚP!", "BỊ THẤY!"],
        ["ZOMBIE!", "NHÀ ĂN!", "Ồ!", "Á!"],
        ["NHÀ TẬP!", "QUẢ BÓNG!", "LĂN!", "VÀO RỔ!"],
        ["THƯ VIỆN!", "SUỴT!", "XE ĐẨY!", "ẦM!"],
    ],
}

FONTS = {
    "ko": Path(r"C:\Windows\Fonts\malgunbd.ttf"),
    "en": Path(r"C:\Windows\Fonts\segoeuib.ttf"),
    "ja": Path(r"C:\Windows\Fonts\YuGothB.ttc"),
    "vi": Path(r"C:\Windows\Fonts\segoeuib.ttf"),
}
POSITIONS = ((28, 24), (628, 24), (28, 526), (628, 526))
STORIES = ["desk_trap", "locker_maze", "cafeteria_tray", "gym_ball", "library_cart"]


def main():
    for locale, episodes in WORDS.items():
        for number, captions in enumerate(episodes, start=1):
            source = POOL / "x" / locale / SOURCE / f"{number:02d}.png"
            target = POOL / "x" / locale / COLLECTION / f"{number:02d}.png"
            image = Image.open(source).convert("RGB")
            draw = ImageDraw.Draw(image)
            font = ImageFont.truetype(str(FONTS[locale]), 34)
            for (x, y), caption in zip(POSITIONS, captions):
                bounds = draw.textbbox((0, 0), caption, font=font, stroke_width=1)
                width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
                draw.rounded_rectangle(
                    (x - 10, y - 5, x + width + 10, y + height + 9),
                    radius=14,
                    fill=(255, 255, 255),
                    outline=(33, 28, 93),
                    width=3,
                )
                draw.text(
                    (x, y), caption, font=font, fill=(237, 53, 117),
                    stroke_width=1, stroke_fill=(33, 28, 93),
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target)

    catalog_path = POOL / "image_catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    catalog["images"] = [
        row for row in catalog["images"]
        if not (row.get("platform") == "X" and row.get("collection") == COLLECTION)
    ]
    for locale, episodes in WORDS.items():
        for number, captions in enumerate(episodes, start=1):
            catalog["images"].append({
                "platform": "X",
                "locale": locale,
                "collection": COLLECTION,
                "path": f"x/{locale}/{COLLECTION}/{number:02d}.png",
                "gameStartText": {"ko": "게임시작", "en": "START GAME", "ja": "ゲームスタート", "vi": "BẮT ĐẦU CHƠI"}[locale],
                "format": "four_panel_comic_with_localized_words",
                "story": STORIES[number - 1],
                "dialogueWords": captions,
            })
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    config_path = POOL.parent / "posting_config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    for locale in WORDS:
        config["localized_social_image_pool"][locale]["source"] = f"image_pool/x/{locale}/{COLLECTION}"
        config["localized_social_image_pool"][locale]["images"] = [
            f"image_pool/x/{locale}/{COLLECTION}/{number:02d}.png"
            for number in range(1, 6)
        ]
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
