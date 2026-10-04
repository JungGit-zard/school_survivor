"""Build localized full-bleed Google Play screenshot candidates from game captures."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
MARKETING = ROOT / "marketing/google_playstore_image"
STAGES = ROOT / "Developer/r3f_prototype/Developer/agent_room/stage_screenshots_2026-08-27"
OVERLAY = OUT / "bottom_character_energy_overlay.png"
SIZE = (1080, 1920)
FONT = Path("C:/Windows/Fonts/malgunbd.ttf")
FONT_JA = Path("C:/Windows/Fonts/YuGothB.ttc")


def capture(suffix):
    return next(MARKETING.glob(f"*{suffix}.png"))


# Eight primary candidates, followed by two alternates. Each is an actual capture.
SCENES = [
    capture("192637"), capture("192421"), capture("192538"), STAGES / "stage1.png",
    STAGES / "stage2.png", STAGES / "stage3.png", STAGES / "stage4.png", capture("192649"),
    STAGES / "stage3.png", STAGES / "stage4.png",
]

COPY = {
    "ko": [
        ("좀비가 몰려온다!", "학교를 탈출하라!"), ("교실에서 살아남아라", "복도를 돌파하라!"),
        ("보스가 길을 막는다", "정면 승부다!"), ("몰려드는 좀비들", "끝까지 버텨라!"),
        ("학교는 안전하지 않다", "탈출구를 찾아라!"), ("새로운 구역의 위협", "강적에 맞서라!"),
        ("마지막 구역까지", "살아서 탈출하라!"), ("더 강한 무기를 골라", "전장을 돌파하라!"),
        ("위협은 더 거세진다", "살아남아라!"), ("끝없는 좀비 떼", "돌파구를 만들어라!"),
    ],
    "en": [
        ("ZOMBIES ARE CLOSING IN", "ESCAPE THE SCHOOL!"), ("SURVIVE THE CLASSROOM", "BREAK THROUGH THE HALL!"),
        ("A BOSS BLOCKS THE WAY", "FACE IT HEAD-ON!"), ("ZOMBIES KEEP COMING", "HOLD THE LINE!"),
        ("NOWHERE IS SAFE", "FIND THE EXIT!"), ("A NEW ZONE, NEW DANGER", "FIGHT THE THREAT!"),
        ("MAKE IT TO THE END", "ESCAPE ALIVE!"), ("CHOOSE A STRONGER WEAPON", "BREAK THROUGH!"),
        ("THE DANGER GROWS", "SURVIVE!"), ("ENDLESS ZOMBIE WAVES", "MAKE AN OPENING!"),
    ],
    "ja": [
        ("ゾンビが迫りくる", "学校から脱出せよ！"), ("教室で生き残れ", "廊下を突破せよ！"),
        ("ボスが行く手を阻む", "正面から挑め！"), ("ゾンビが押し寄せる", "最後まで耐えろ！"),
        ("学校に安全地帯はない", "出口を探せ！"), ("新たな区域の脅威", "強敵に立ち向かえ！"),
        ("最後の区域まで", "生きて脱出せよ！"), ("より強い武器を選べ", "戦場を突破せよ！"),
        ("脅威はさらに増す", "生き残れ！"), ("尽きないゾンビの群れ", "突破口を作れ！"),
    ],
}


def open_image(path, mode="RGBA"):
    with Image.open(path) as source:
        return source.convert(mode)


def font_for(draw, text, maximum, initial, path):
    size = initial
    while size > 36:
        font = ImageFont.truetype(str(path), size)
        if draw.textbbox((0, 0), text, font=font, stroke_width=2)[2] <= maximum:
            return font
        size -= 2
    return ImageFont.truetype(str(path), size)


def full_bleed_capture(path):
    shot = open_image(path)
    scale = SIZE[0] / shot.width
    scaled = shot.resize((SIZE[0], round(shot.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", SIZE, "#12121a")
    # Preserve the capture aspect ratio: fill width, never stretch gameplay.
    canvas.alpha_composite(scaled, (0, 0))
    return canvas


def draw_copy(canvas, language, index):
    top, bottom = COPY[language][index]
    font_path = FONT_JA if language == "ja" else FONT
    layer = Image.new("RGBA", SIZE)
    draw = ImageDraw.Draw(layer)
    top_font = font_for(draw, top, 700, 64, font_path)
    bottom_font = font_for(draw, bottom, 700, 72, font_path)
    # The supplied overlay contains the diagonal ribbon; copy remains clear of the character.
    draw.text((645, 1645), top, font=top_font, anchor="mm", fill="white", stroke_width=4, stroke_fill="#0b0711")
    if " " in bottom:
        pink, yellow = bottom.split(" ", 1)
        pink += " "
    else:
        split_at = len(bottom) // 2
        pink, yellow = bottom[:split_at], bottom[split_at:]
    pink_width = draw.textlength(pink, font=bottom_font)
    yellow_width = draw.textlength(yellow, font=bottom_font)
    start = 645 - (pink_width + yellow_width) / 2
    draw.text((start, 1725), pink, font=bottom_font, anchor="lm", fill="#ff2d9b", stroke_width=5, stroke_fill="#100611")
    draw.text((start + pink_width, 1725), yellow, font=bottom_font, anchor="lm", fill="#ffd21f", stroke_width=5, stroke_fill="#100611")
    return Image.alpha_composite(canvas, layer)


def render(scene_index, language):
    # The optional level-up capture includes Korean in-game UI, so non-Korean
    # storefront variants use the language-neutral Stage 1 action capture instead.
    source = capture("192421") if scene_index == 7 and language != "ko" else SCENES[scene_index]
    canvas = full_bleed_capture(source)
    overlay = open_image(OVERLAY).resize(SIZE, Image.Resampling.LANCZOS)
    canvas = Image.alpha_composite(canvas, overlay)
    canvas = draw_copy(canvas, language, scene_index)
    dest = OUT / language / f"{scene_index + 1:02d}_{'primary' if scene_index < 8 else 'alternate'}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(dest, "PNG", optimize=True)
    return dest


if __name__ == "__main__":
    for language in COPY:
        for index in range(len(SCENES)):
            print(render(index, language))
