from pathlib import Path
import csv
import shutil

repo = Path(__file__).resolve().parents[3]
dest = repo / "Graphic_designer/game_resource_library"
rows = []
visual = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}

def add_tree(source_rel, target_prefix, category, status, exts=None, exclude_parts=()):
    source_root = repo / source_rel
    for src in source_root.rglob("*"):
        if not src.is_file() or (exts is not None and src.suffix.lower() not in exts):
            continue
        rel = src.relative_to(source_root)
        if any(part in exclude_parts for part in rel.parts[:-1]):
            continue
        target_rel = Path(target_prefix) / rel
        target = dest / target_rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, target)
        rows.append({"category": category, "original_path": (Path(source_rel) / rel).as_posix(),
                     "library_path": (Path("Graphic_designer/game_resource_library") / target_rel).as_posix(),
                     "usage_status": status})

for source_rel in ("Developer/r3f_prototype/src/assets", "Developer/r3f_prototype/public"):
    root_name = Path(source_rel).name
    for src in (repo / source_rel).rglob("*"):
        if not src.is_file():
            continue
        ext = src.suffix.lower()
        category = ("runtime/images" if ext in visual else
                    "runtime/audio" if ext in {".mp3", ".m4a", ".wav", ".ogg"} else
                    "runtime/fonts" if ext in {".woff", ".woff2", ".ttf", ".otf"} else
                    "runtime/misc")
        rel = src.relative_to(repo / source_rel)
        target_rel = Path(category) / root_name / rel
        target = dest / target_rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, target)
        rows.append({"category": category, "original_path": (Path(source_rel) / rel).as_posix(),
                     "library_path": (Path("Graphic_designer/game_resource_library") / target_rel).as_posix(),
                     "usage_status": "사용 미확인"})

add_tree("Graphic_designer/graphic_asset", "source-art/graphic_asset", "source-art/graphic_asset",
         "원화/참고 자료, 런타임 사용 미확인", visual, ("game_screenshot",))
add_tree("Graphic_designer/stage_comic_mobile_backgrounds_2026-09-12", "source-art/stage_comic_mobile_backgrounds",
         "source-art/stage-comic-backdrops", "기존 배경 참고 자료, 런타임 사용 미확인", visual)
add_tree("marketing/x_daily_zombie_school_posting/image_pool", "references/style_variants",
         "reference/style-variants", "기존 스타일 후보, 선택 미결정; 게임 런타임 사용 미확인", visual,
         ("x_viet", "x_ko", "x_jp", "x_en"))
add_tree("Developer/stage_bgm_drafts_2026-08-06/masters", "source-audio/stage-bgm-drafts",
         "source-audio/stage-bgm-drafts", "초안 원본, 런타임 사용 아님")

manifest = dest / "RESOURCE_MANIFEST.csv"
with manifest.open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=("category", "original_path", "library_path", "usage_status"))
    writer.writeheader()
    writer.writerows(rows)
print(f"COPIED={len(rows)}")
from collections import Counter
for category, count in sorted(Counter(row["category"] for row in rows).items()):
    print(f"{category}={count}")
