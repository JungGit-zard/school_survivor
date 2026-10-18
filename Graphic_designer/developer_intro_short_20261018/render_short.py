"""Render the 30-second Korean developer intro short from existing project art."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
FFMPEG = Path(r"C:\Program Files (x86)\kdisk.co.kr\ffmpeg.exe")
W, H, FPS, FRAMES_PER_SLIDE = 1080, 1920, 30, 150
FONT = Path(r"C:\Windows\Fonts\malgun.ttf")
BGM = ROOT / "Developer/r3f_prototype/src/assets/audio/title_bgm.m4a"
PROTECTED_BGM_SHA256 = "991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe"

SLIDES = [
    ("Quaility_Assurance/screenshots/stage1-visual-loop-01-initial-player-e01-floor-pencil-2026-06-24.png", "안녕하세요. 제가 만든 게임,\n《탈출! 좀비학교》를 소개합니다."),
    ("Graphic_designer/쇼츠프로젝트_20261010/images/A02_연필투척.png", "좀비가 나타난 학교에서\n살아남아 출구까지 달려보세요."),
    ("Quaility_Assurance/screenshots/stage1-visual-loop-02-e05-charge-weapons-pickups-2026-06-24.png", "연필, 지우개, 자!\n익숙한 학용품이 무기가 됩니다."),
    ("Graphic_designer/쇼츠프로젝트_20261010/images/A03_자공격.png", "무기를 강화하고 좀비를 피하며\n나만의 생존 방법을 찾아보세요."),
    ("Quaility_Assurance/screenshots/stage1-visual-loop-03-b01-boss-loop-2026-06-24.png", "무섭기보다는 귀엽고 유쾌하게,\n다시 도전하고 싶은 게임을 만들었습니다."),
    ("Graphic_designer/쇼츠프로젝트_20261010/images/A08_탈출질주.png", "무료로, 광고 없이 즐겨보세요!\n게임 시작 → escapezombie.com"),
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size)


def centered(draw: ImageDraw.ImageDraw, y: int, text: str, f: ImageFont.FreeTypeFont,
             fill: str, stroke: str = "#111827", stroke_width: int = 2) -> None:
    box = draw.textbbox((0, 0), text, font=f, stroke_width=stroke_width)
    draw.text(((W - (box[2] - box[0])) / 2, y), text, font=f, fill=fill,
              stroke_width=stroke_width, stroke_fill=stroke)


def make_slide(source: Path, caption: str, index: int) -> Image.Image:
    art = Image.open(source).convert("RGB")
    bg = Image.new("RGB", (W, H), "#101329")
    # Softly fill the phone canvas with the same source without cropping its foreground copy.
    scale = max(W / art.width, H / art.height)
    back = art.resize((int(art.width * scale), int(art.height * scale)), Image.Resampling.LANCZOS)
    x, y = (back.width - W) // 2, (back.height - H) // 2
    back = back.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(28))
    back = Image.blend(back, Image.new("RGB", (W, H), "#101329"), 0.52)
    slide = back.convert("RGBA")
    draw = ImageDraw.Draw(slide, "RGBA")
    draw.rounded_rectangle((32, 40, W - 32, H - 40), 34, fill=(8, 13, 36, 145), outline=(255, 216, 79, 230), width=4)
    centered(draw, 95, "개발자의 게임 소개", font(60), "#FFFFFF", stroke_width=3)
    centered(draw, 175, "ESCAPE! ZOMBIE SCHOOL", font(28), "#FFE66D", stroke_width=2)

    # Preserve the actual source art as a single unaltered foreground image.
    art.thumbnail((1000, 1120), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (1040, 1160), (9, 12, 30, 235))
    frame.alpha_composite(Image.new("RGBA", frame.size, (0, 0, 0, 0)))
    frame_draw = ImageDraw.Draw(frame)
    frame_draw.rounded_rectangle((0, 0, 1039, 1159), 24, fill=(12, 15, 35, 255), outline=(255, 255, 255, 220), width=3)
    px, py = (1040 - art.width) // 2, (1160 - art.height) // 2
    frame.paste(art.convert("RGBA"), (px, py))
    slide.alpha_composite(frame, ((W - frame.width) // 2, 265))

    draw = ImageDraw.Draw(slide, "RGBA")
    draw.rounded_rectangle((48, 1490, W - 48, 1810), 32, fill=(5, 9, 27, 224), outline=(255, 211, 64, 235), width=3)
    lines = caption.splitlines()
    fs = 47 if index != 5 else 43
    f = font(fs)
    block_h = len(lines) * (fs + 23)
    top = 1490 + (320 - block_h) // 2
    for line in lines:
        centered(draw, top, line, f, "#FFFFFF", stroke_width=2)
        top += fs + 23
    return slide.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if sha256(BGM).lower() != PROTECTED_BGM_SHA256:
        raise SystemExit("Protected title BGM hash mismatch; refusing to render.")
    if BGM.stat().st_size != 998122:
        raise SystemExit("Protected title BGM byte count mismatch; refusing to render.")
    if not FFMPEG.is_file() or not FONT.is_file():
        raise SystemExit("Required local FFmpeg or Malgun Gothic font is unavailable.")

    slides = []
    inventory = []
    for rel, caption in SLIDES:
        source = ROOT / rel
        if not source.is_file():
            raise SystemExit(f"Missing visual source: {rel}")
        slides.append(make_slide(source, caption, len(slides)))
        inventory.append({"path": rel.replace("\\", "/"), "sha256": sha256(source), "caption": caption})

    # Six 5-second chapters with short cross-fades between slides.
    cmd = [str(FFMPEG), "-y", "-loglevel", "error", "-nostats", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
           "-ss", "0", "-i", str(BGM), "-map", "0:v:0", "-map", "1:a:0", "-t", "30",
           "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20",
           "-af", "atrim=0:30,afade=t=out:st=29:d=1", "-strict", "-2", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
           str(OUT / "개발자의_게임소개_30초_ko.mp4")]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for si, slide in enumerate(slides):
            next_slide = slides[si + 1] if si + 1 < len(slides) else None
            for fi in range(FRAMES_PER_SLIDE):
                if fi >= FRAMES_PER_SLIDE - 8:
                    alpha = (fi - (FRAMES_PER_SLIDE - 8) + 1) / 8
                    target = next_slide if next_slide is not None else Image.new("RGB", (W, H), "black")
                    frame = Image.blend(slide, target, alpha)
                else:
                    frame = slide
                proc.stdin.write(frame.tobytes())
    except BrokenPipeError:
        pass
    finally:
        proc.stdin.close()
    stderr = proc.stderr.read().decode("utf-8", errors="replace")
    code = proc.wait()
    if code:
        raise SystemExit(f"FFmpeg failed ({code}):\n{stderr[-5000:]}")

    manifest = {
        "title": "개발자의 게임 소개",
        "duration_seconds": 30,
        "video": "개발자의_게임소개_30초_ko.mp4",
        "render_script": "render_short.py",
        "resolution": "1080x1920",
        "fps": FPS,
        "video_codec": "H.264",
        "audio_codec": "AAC",
        "audio_source": "Developer/r3f_prototype/src/assets/audio/title_bgm.m4a",
        "audio_source_sha256": PROTECTED_BGM_SHA256,
        "audio_source_bytes": 998122,
        "audio_edit": "first 30 seconds, 1-second fade-out; source file untouched",
        "voiceover": None,
        "visual_sources": inventory,
        "slides_srt": "개발자의_게임소개_30초_ko.srt",
    }
    (OUT / "source_inventory.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(OUT / "개발자의_게임소개_30초_ko.mp4")


if __name__ == "__main__":
    main()
