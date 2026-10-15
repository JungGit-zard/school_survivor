from __future__ import annotations

import importlib.util
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
POOL = REPO / "marketing" / "x_daily_zombie_school_posting" / "image_pool"
CONFIG_PATH = REPO / "marketing" / "x_daily_zombie_school_posting" / "posting_config.json"
CATALOG_PATH = POOL / "image_catalog.json"
COLLECTION = "backlog_comic_20261015"

spec = importlib.util.spec_from_file_location("comic_renderer", HERE / "render_backlog_comics.py")
renderer = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(renderer)

STORIES = [
    ("globe_cart_dodgeballs", {"ko": "지구본 카트와 피구공 함정", "en": "Globe Cart Dodgeball Trap", "ja": "地球儀カートとドッジボール", "vi": "Xe địa cầu và bão bóng"}),
    ("science_magnet_lockers", {"ko": "자석 사물함 소동", "en": "Magnet and Locker Mix-up", "ja": "磁石とロッカーの大騒ぎ", "vi": "Nam châm và tủ đồ"}),
    ("library_cart_books", {"ko": "도서관 책수레 미끼", "en": "Library Cart Lure", "ja": "図書カートの作戦", "vi": "Mồi nhử xe sách"}),
    ("music_room_rhythm", {"ko": "음악실 드럼 리듬", "en": "Music Room Drumroll", "ja": "音楽室のドラムロール", "vi": "Nhịp trống phòng nhạc"}),
    ("art_room_paper_roll", {"ko": "미술실 종이말이 작전", "en": "Art Room Paper Wrap", "ja": "美術室の紙ぐるぐる作戦", "vi": "Cuộn giấy phòng mỹ thuật"}),
    ("cafeteria_gelatin_trays", {"ko": "급식실 푸딩 트레이 소동", "en": "Cafeteria Wobble and Trays", "ja": "食堂プリンとトレー騒動", "vi": "Bánh flan và khay ăn"}),
    ("auditorium_curtain_call", {"ko": "강당 커튼콜 작전", "en": "Auditorium Curtain Call", "ja": "講堂のカーテンコール作戦", "vi": "Màn sân khấu hội trường"}),
    ("greenhouse_sprinkler", {"ko": "온실 스프링클러 대작전", "en": "Greenhouse Sprinkler Spin", "ja": "温室スプリンクラー作戦", "vi": "Vòi phun nhà kính"}),
    ("gym_mat_maze", {"ko": "체육관 매트 미로", "en": "Gym Mat Maze", "ja": "体育館マット迷路", "vi": "Mê cung nệm phòng thể chất"}),
    ("planetarium_star_projector", {"ko": "천문관 별빛 유인 작전", "en": "Planetarium Starry Distraction", "ja": "プラネタリウム星空大作戦", "vi": "Màn sao ở cung thiên văn"}),
]


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    known = {(row.get("platform"), row.get("locale"), row.get("path")) for row in catalog["images"]}
    file_rows = []

    for platform, folder in (("X", "x"), ("Facebook", "facebook")):
        for locale, copy in renderer.COPY.items():
            for index, (story_id, titles) in enumerate(STORIES, start=1):
                filename = f"{index:02}.png"
                relative = f"{folder}/{locale}/{COLLECTION}/{filename}"
                path = POOL / folder / locale / COLLECTION / filename
                if not path.is_file():
                    raise FileNotFoundError(path)
                words = renderer.EPISODE_WORDS[f"ep{index:02}"][locale]
                row = {
                    "platform": platform,
                    "locale": locale,
                    "collection": COLLECTION,
                    "path": relative,
                    "gameStartText": copy["cta"],
                    "format": "four_panel_comic_with_localized_words",
                    "story": story_id,
                    "title": titles[locale],
                    "dialogueWords": words,
                }
                key = (platform, locale, relative)
                if key not in known:
                    catalog["images"].append(row)
                    known.add(key)
                file_rows.append({"platform": platform, "locale": locale, "episode": index,
                                  "story": story_id, "title": titles[locale], "path": relative,
                                  "gameStartText": copy["cta"], "dialogueWords": words})

                config_key = "localized_social_image_pool" if folder == "x" else "facebook_rotation_image_pool"
                config[config_key].setdefault(locale, {}).setdefault("images", [])
                config_path = f"image_pool/{relative}"
                if config_path not in config[config_key][locale]["images"]:
                    config[config_key][locale]["images"].append(config_path)

    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = {
        "collection": COLLECTION,
        "canvas": "1254x1254 PNG",
        "episodeCount": len(STORIES),
        "locales": list(renderer.COPY),
        "platforms": ["X", "Facebook"],
        "imageCount": len(file_rows),
        "ctaByLocale": {locale: copy["cta"] for locale, copy in renderer.COPY.items()},
        "episodes": [{"episode": i, "story": story, "titles": titles}
                     for i, (story, titles) in enumerate(STORIES, start=1)],
        "files": file_rows,
    }
    (HERE / "MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Registered {len(file_rows)} new image paths; collection catalog/config and MANIFEST.json updated.")


if __name__ == "__main__":
    main()
