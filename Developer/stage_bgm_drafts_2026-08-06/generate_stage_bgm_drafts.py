#!/usr/bin/env python
"""
Escape! zombie school Stage 1/2 cheerful no-horror BGM draft generator.

- Deterministic, self-composed procedural synthesis.
- Stdlib + NumPy only.
- No external samples, downloads, AI music service, or copied game melodies.
- Output: mono 16-bit PCM WAV loop drafts for review only; not runtime assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shutil
import struct
import sys
import wave
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Tuple

import numpy as np

SR = 32000
PEAK_TARGET = 0.84
BOUNDARY_FADE_SAMPLES = 256
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTDIR = ROOT / "Developer" / "stage_bgm_drafts_2026-08-06" / "masters"
TITLE_BGM = ROOT / "Developer" / "r3f_prototype" / "src" / "assets" / "audio" / "title_bgm.m4a"
TITLE_EXPECTED_BYTES = 998122
TITLE_EXPECTED_SHA256 = "991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe"


def midi(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def env_ar(length: int, attack: float = 0.006, release: float = 0.030) -> np.ndarray:
    e = np.ones(length, dtype=np.float64)
    a = min(length, max(1, int(attack * SR)))
    r = min(length, max(1, int(release * SR)))
    e[:a] *= np.linspace(0.0, 1.0, a, endpoint=False)
    e[-r:] *= np.linspace(1.0, 0.0, r, endpoint=False)
    return e


def square_wave(freq: float, n: int, phase: float = 0.0) -> np.ndarray:
    t = (np.arange(n, dtype=np.float64) / SR) + phase
    # Mildly softened square by summing odd harmonics below a conservative cap.
    y = np.zeros(n, dtype=np.float64)
    for harmonic in (1, 3, 5, 7):
        if freq * harmonic < SR * 0.42:
            y += np.sin(2.0 * math.pi * freq * harmonic * t) / harmonic
    return np.tanh(y * 1.7)


def pulse_wave(freq: float, n: int, duty: float = 0.35) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    ph = (freq * t) % 1.0
    raw = np.where(ph < duty, 1.0, -1.0)
    # Keep pulse bass dry but remove duty-cycle DC bias before it accumulates in the mix.
    raw = raw - float(np.mean(raw))
    max_abs = float(np.max(np.abs(raw))) or 1.0
    raw = raw / max_abs
    # One-pole-ish smoothing through a tiny moving average to reduce hard alias edge.
    kernel = np.ones(5, dtype=np.float64) / 5.0
    smoothed = np.convolve(raw, kernel, mode="same")
    smoothed = smoothed - float(np.mean(smoothed))
    return smoothed


def triangle_wave(freq: float, n: int) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    ph = (freq * t) % 1.0
    return 2.0 * np.abs(2.0 * ph - 1.0) - 1.0


def sine_wave(freq: float, n: int) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    return np.sin(2.0 * math.pi * freq * t)


def bell_wave(freq: float, n: int) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    return (
        0.70 * np.sin(2 * math.pi * freq * t)
        + 0.22 * np.sin(2 * math.pi * freq * 2.01 * t)
        + 0.10 * np.sin(2 * math.pi * freq * 3.02 * t)
    )


def noise(n: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    raw = rng.uniform(-1.0, 1.0, n)
    # Dry, short, filtered noise; no long tails.
    kernel = np.array([0.18, 0.28, 0.08, -0.05, -0.02], dtype=np.float64)
    return np.convolve(raw, kernel, mode="same")


def add(buf: np.ndarray, start_sec: float, dur_sec: float, wave_fn: Callable[[int], np.ndarray], gain: float,
        attack: float = 0.004, release: float = 0.030) -> None:
    start = int(round(start_sec * SR))
    n = max(1, int(round(dur_sec * SR)))
    end = min(buf.shape[0], start + n)
    if start < 0 or start >= buf.shape[0] or end <= start:
        return
    n = end - start
    y = wave_fn(n) * env_ar(n, attack, release) * gain
    buf[start:end] += y


def add_note(buf: np.ndarray, beat: float, beats: float, bpm: float, freq: float, kind: str, gain: float,
             attack: float = 0.004, release: float = 0.030) -> None:
    sec = 60.0 / bpm
    dur = beats * sec
    start = beat * sec
    if kind == "square":
        fn = lambda n: square_wave(freq, n)
    elif kind == "triangle":
        fn = lambda n: triangle_wave(freq, n)
    elif kind == "pulse":
        fn = lambda n: pulse_wave(freq, n)
    elif kind == "bell":
        fn = lambda n: bell_wave(freq, n)
    elif kind == "sine":
        fn = lambda n: sine_wave(freq, n)
    else:
        raise ValueError(kind)
    add(buf, start, dur, fn, gain, attack, release)


def add_noise_hit(buf: np.ndarray, beat: float, bpm: float, dur_beats: float, gain: float, seed: int,
                  attack: float = 0.001, release: float = 0.020) -> None:
    sec = 60.0 / bpm
    add(buf, beat * sec, dur_beats * sec, lambda n: noise(n, seed), gain, attack, release)


def apply_boundary_guard(buf: np.ndarray) -> None:
    # Tiny sample-level seam guard: start and end both reach exact zero without a reverb tail.
    fade = np.linspace(0.0, 1.0, BOUNDARY_FADE_SAMPLES, endpoint=False)
    buf[:BOUNDARY_FADE_SAMPLES] *= fade
    buf[-BOUNDARY_FADE_SAMPLES:] *= fade[::-1]
    buf[0] = 0.0
    buf[-1] = 0.0


def normalize(buf: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(buf))) if buf.size else 0.0
    if peak <= 1e-12:
        return buf
    return buf * (PEAK_TARGET / peak)


def pcm16(buf: np.ndarray) -> np.ndarray:
    clipped = np.clip(buf, -1.0, 1.0)
    return np.round(clipped * 32767.0).astype("<i2")


def write_wav(path: Path, buf: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = pcm16(buf)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(data.tobytes())


def render_stage1() -> Tuple[np.ndarray, Dict[str, object]]:
    bpm = 140
    bars = 36
    beats_total = bars * 4
    length = int(round((beats_total * 60.0 / bpm) * SR))
    buf = np.zeros(length, dtype=np.float64)
    # Original 4-note motif: E-G-rest-A, answered by G-E-D-C fragment variants.
    motif_a = [64, 67, None, 69]
    motif_b = [67, 64, None, 62]
    bass_roots = [48, 45, 50, 55]  # C, A, D, G modal-family movement.
    secbeat = 60.0 / bpm
    for bar in range(bars):
        b0 = bar * 4
        root = bass_roots[bar % len(bass_roots)]
        # Triangle bass: soft quarter pulses, playful and non-ominous.
        for q, step in enumerate([0, 7, 0, 5]):
            add_note(buf, b0 + q, 0.54, bpm, midi(root + step), "triangle", 0.095, 0.006, 0.045)
        # Classroom tick groove; sparse first 8 bars, brighter later.
        if bar % 2 == 0:
            add_noise_hit(buf, b0 + 0.0, bpm, 0.055, 0.020, 1000 + bar)
            add_noise_hit(buf, b0 + 2.0, bpm, 0.050, 0.017, 1100 + bar)
        for off in [1.0, 3.0]:
            add_noise_hit(buf, b0 + off, bpm, 0.040, 0.012 if bar < 16 else 0.016, 1200 + bar * 7 + int(off * 10))
        # Lead arrangement sections.
        if 4 <= bar < 14 or 18 <= bar < 28 or 28 <= bar < 34:
            mot = motif_a if (bar // 2) % 2 == 0 else motif_b
            # Keep motif at <=4 note positions; rests remain rests.
            for i, note in enumerate(mot):
                if note is not None:
                    lift = 12 if bar >= 28 and i == 3 else 0
                    add_note(buf, b0 + i * 0.5, 0.30, bpm, midi(note + lift), "square", 0.070, 0.003, 0.025)
            if bar % 4 == 3:
                add_note(buf, b0 + 3.0, 0.34, bpm, midi(72), "square", 0.045, 0.003, 0.020)
        # Break/dropout: bars 14-17 lead rests, only kind bass/tick remains.
        # Restrained toy bell warmth, never constant school-bell masking.
        if bar in (7, 15, 23, 31):
            add_note(buf, b0 + 2.5, 0.42, bpm, midi(76), "bell", 0.055, 0.002, 0.070)
        if bar in (24, 25, 26, 27, 28, 29, 30, 31):
            # Thin 8th-note lift, short and high enough to sparkle but not mask UI.
            arp = [72, 76, 79, 76]
            for i in range(8):
                add_note(buf, b0 + i * 0.5 + 0.25, 0.15, bpm, midi(arp[i % 4]), "square", 0.028, 0.002, 0.016)
        if 32 <= bar < 35:
            # Boss/climax baked-in as mischievous low pulse + tiny rolls, no fear cue.
            add_note(buf, b0 + 0.0, 0.25, bpm, midi(48), "pulse", 0.045, 0.002, 0.020)
            add_note(buf, b0 + 2.0, 0.25, bpm, midi(55), "pulse", 0.040, 0.002, 0.020)
            add_noise_hit(buf, b0 + 3.5, bpm, 0.10, 0.018, 1400 + bar)
        # Last bar: lead and bell rest for clean loop return.
    # A little first-beat classroom bounce after the boundary fade.
    add_noise_hit(buf, 0.25, bpm, 0.055, 0.010, 1999)
    apply_boundary_guard(buf)
    buf = normalize(buf)
    meta = {
        "logicalId": "stage1_classroom_toy_rescue_chiptune_draft",
        "bpm": bpm,
        "bars": bars,
        "beats": beats_total,
        "durationSec": length / SR,
        "sampleRate": SR,
        "modeColor": "C major / A Dorian / D Mixolydian bright hybrid",
        "motifStatement": "Original <=4-note classroom rescue motifs: [E4,G4,rest,A4] and [G4,E4,rest,D4], with later bright response variation.",
        "palette": "square lead, triangle bass, restrained toy bell, short dry noise drums, thin late arpeggio",
    }
    return buf, meta


def render_stage2() -> Tuple[np.ndarray, Dict[str, object]]:
    bpm = 148
    bars = 36
    beats_total = bars * 4
    length = int(round((beats_total * 60.0 / bpm) * SR))
    buf = np.zeros(length, dtype=np.float64)
    # Original 3-note blip motif: D-F#-A / E-G-A, short corridor cheer.
    blips = [[62, 66, 69], [64, 67, 69], [67, 69, 74], [66, 69, 71]]
    bass = [43, 50, 52, 47]  # G, D, E, B-ish heroic modal pulse.
    for bar in range(bars):
        b0 = bar * 4
        root = bass[bar % 4]
        # Pulse bass sneaker run: unmistakably faster than Stage 1.
        for eighth in range(8):
            beat = b0 + eighth * 0.5
            gain = 0.070 if eighth % 2 == 0 else 0.045
            add_note(buf, beat, 0.21, bpm, midi(root + (0 if eighth < 4 else 7)), "pulse", gain, 0.002, 0.018)
        # Dry sneaker ticks offbeat; leave space on beats for projectile and warning SFX.
        if not (14 <= bar < 18):
            for off in [0.75, 1.75, 2.75, 3.75]:
                add_noise_hit(buf, b0 + off, bpm, 0.030, 0.013 if bar < 24 else 0.017, 3000 + bar * 11 + int(off * 100))
        # Blip motif appears in short calls only, no long melody.
        if 4 <= bar < 14 or 18 <= bar < 28 or 28 <= bar < 34:
            mot = blips[bar % len(blips)]
            for i, note in enumerate(mot):
                add_note(buf, b0 + 0.25 + i * 0.375, 0.16, bpm, midi(note), "square", 0.052, 0.002, 0.016)
            if bar % 4 in (1, 3):
                add_note(buf, b0 + 2.5, 0.18, bpm, midi(76 if bar < 28 else 78), "square", 0.038, 0.002, 0.014)
        # Tick dropout bars 14-17: athletic breathing room.
        if 20 <= bar < 32:
            # Projectile-action lift: filtered noise hats but short/dry.
            for sixteenth in [0.25, 1.25, 2.25, 3.25]:
                add_noise_hit(buf, b0 + sixteenth, bpm, 0.025, 0.010, 3600 + bar * 13 + int(sixteenth * 100))
        if bar in (22, 30):
            # Rare friendly team sparkle, less bell than Stage 1.
            add_note(buf, b0 + 3.0, 0.22, bpm, midi(79), "bell", 0.030, 0.002, 0.045)
        if 32 <= bar < 35:
            # Bright boss-compatible lift; no ominous drone, just sporty low pulses.
            for beat in [0.0, 1.5, 2.5]:
                add_note(buf, b0 + beat, 0.18, bpm, midi(43), "pulse", 0.052, 0.002, 0.016)
            add_noise_hit(buf, b0 + 3.5, bpm, 0.060, 0.018, 3900 + bar)
        # Last bar naturally returns to root pulse only.
    apply_boundary_guard(buf)
    buf = normalize(buf)
    meta = {
        "logicalId": "stage2_corridor_sports_arcade_run_draft",
        "bpm": bpm,
        "bars": bars,
        "beats": beats_total,
        "durationSec": length / SR,
        "sampleRate": SR,
        "modeColor": "G Mixolydian / E Dorian / heroic modal color",
        "motifStatement": "Original <=3-note corridor cheer blips: [D4,F#4,A4], [E4,G4,A4], and short variants.",
        "palette": "narrow pulse bass, dry sneaker tick, filtered short noise hats, hollow square blip, rare small bell sparkle",
    }
    return buf, meta


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def measure_wav(path: Path) -> Dict[str, object]:
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        rate = wf.getframerate()
        frames = wf.getnframes()
        raw = wf.readframes(frames)
    if channels != 1 or sampwidth != 2:
        raise RuntimeError(f"unexpected WAV format for {path}: channels={channels}, sampwidth={sampwidth}")
    data = np.frombuffer(raw, dtype="<i2").astype(np.float64) / 32768.0
    peak = float(np.max(np.abs(data))) if data.size else 0.0
    rms = float(np.sqrt(np.mean(data * data))) if data.size else 0.0
    dc = float(np.mean(data)) if data.size else 0.0
    seam_discontinuity = float(abs(data[0] - data[-1])) if data.size else None
    n = min(1024, data.size // 2)
    seam_window_rms_delta = float(np.sqrt(np.mean((data[:n] - data[-n:]) ** 2))) if n > 0 else None
    non_silent_ratio = float(np.mean(np.abs(data) > (1.0 / 32768.0))) if data.size else 0.0
    clipped = int(np.sum(np.abs(data) >= 1.0))
    return {
        "path": str(path.as_posix()),
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
        "channels": channels,
        "sampleRate": rate,
        "bitDepth": sampwidth * 8,
        "frames": frames,
        "durationSec": frames / rate,
        "samplePeak": peak,
        "samplePeakDbfs": 20 * math.log10(peak) if peak > 0 else None,
        "rms": rms,
        "rmsDbfs": 20 * math.log10(rms) if rms > 0 else None,
        "dcOffset": dc,
        "startSample": float(data[0]) if data.size else None,
        "endSample": float(data[-1]) if data.size else None,
        "loopSeamDiscontinuity": seam_discontinuity,
        "loopSeamWindowRmsDelta1024": seam_window_rms_delta,
        "nonSilentRatio": non_silent_ratio,
        "clippedSampleCount": clipped,
        "passesSignalValidation": bool(
            peak <= 0.89 and peak > 0.05 and rms > 0.005 and clipped == 0 and abs(dc) < 0.005
            and seam_discontinuity is not None and seam_discontinuity <= (1.0 / 32768.0)
            and non_silent_ratio > 0.15
        ),
    }


def verify_title_bgm() -> Dict[str, object]:
    if not TITLE_BGM.exists():
        return {"path": str(TITLE_BGM.as_posix()), "exists": False, "passes": False}
    size = TITLE_BGM.stat().st_size
    sha = sha256_file(TITLE_BGM)
    return {
        "path": str(TITLE_BGM.as_posix()),
        "exists": True,
        "bytes": size,
        "sha256": sha,
        "expectedBytes": TITLE_EXPECTED_BYTES,
        "expectedSha256": TITLE_EXPECTED_SHA256,
        "passes": size == TITLE_EXPECTED_BYTES and sha == TITLE_EXPECTED_SHA256,
    }


def render_all(outdir: Path) -> Dict[str, object]:
    tracks = []
    for filename, render_fn in [
        ("stage1_classroom_toy_rescue_loop_draft.wav", render_stage1),
        ("stage2_corridor_sports_arcade_loop_draft.wav", render_stage2),
    ]:
        buf, meta = render_fn()
        path = outdir / filename
        write_wav(path, buf)
        metrics = measure_wav(path)
        tracks.append({**meta, "file": metrics})
    return {"tracks": tracks, "titleBgmCanonical": verify_title_bgm()}


def deterministic_check(tmpdir: Path) -> Dict[str, object]:
    resolved = tmpdir.resolve()
    if ROOT.resolve() not in resolved.parents and resolved != ROOT.resolve():
        # Still allow OS temp, but require an explicit task marker to prevent accidental deletion elsewhere.
        if "stage_bgm_determinism_t_ad0b9a15" not in str(resolved).replace("\\", "/"):
            raise RuntimeError(f"Refusing temp cleanup outside task-specific directory: {resolved}")
    if tmpdir.exists():
        shutil.rmtree(tmpdir)
    a = tmpdir / "run_a"
    b = tmpdir / "run_b"
    first = render_all(a)
    second = render_all(b)
    pairs = []
    ok = True
    for ta, tb in zip(first["tracks"], second["tracks"]):
        sha_a = ta["file"]["sha256"]
        sha_b = tb["file"]["sha256"]
        same = sha_a == sha_b
        ok = ok and same
        pairs.append({"logicalId": ta["logicalId"], "sha256RunA": sha_a, "sha256RunB": sha_b, "same": same})
    shutil.rmtree(tmpdir)
    return {"tempDirRemoved": not tmpdir.exists(), "pairs": pairs, "passes": ok}


def validate_existing(outdir: Path, run_determinism: bool = False) -> Dict[str, object]:
    files = [
        outdir / "stage1_classroom_toy_rescue_loop_draft.wav",
        outdir / "stage2_corridor_sports_arcade_loop_draft.wav",
    ]
    metrics = [measure_wav(p) for p in files]
    det = None
    if run_determinism:
        det = deterministic_check(ROOT / "Developer" / "stage_bgm_drafts_2026-08-06" / "tmp" / "stage_bgm_determinism_t_ad0b9a15")
    return {
        "tracks": metrics,
        "titleBgmCanonical": verify_title_bgm(),
        "determinism": det,
        "passes": all(m["passesSignalValidation"] for m in metrics) and verify_title_bgm()["passes"] and (det is None or det["passes"]),
    }


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--outdir", default=str(DEFAULT_OUTDIR))
    ap.add_argument("--validate", action="store_true")
    ap.add_argument("--determinism", action="store_true")
    ap.add_argument("--json", default="")
    args = ap.parse_args(argv)
    outdir = Path(args.outdir).resolve()
    if args.validate:
        result = validate_existing(outdir, args.determinism)
    else:
        result = render_all(outdir)
    text = json.dumps(result, ensure_ascii=False, indent=2)
    print(text)
    if args.json:
        p = Path(args.json)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text + "\n", encoding="utf-8")
    return 0 if result.get("passes", True) is not False else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
