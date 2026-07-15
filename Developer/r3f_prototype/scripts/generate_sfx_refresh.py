import math
import os
import random
import shutil
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'sfx'
TMP = ROOT / 'tmp_sfx_refresh'
SR = 44100
random.seed(7152026)

SOUNDS = {
    # weapon hit refresh: deliberately different envelopes/timbres per weapon
    'weapons/pencilHit': dict(kind='wood_tick', dur=0.105, f=1780, noise=0.18, click=0.85, harmonics=[(1, .75), (2.8, .22)], drive=.55),
    'weapons/rulerHit': dict(kind='slap', dur=0.155, f=520, noise=0.34, click=1.0, harmonics=[(1, .8), (1.5, .35), (2.1, .18)], drive=.7),
    'weapons/boxCutterHit': dict(kind='metal_slice', dur=0.130, f=2650, noise=0.23, click=.62, harmonics=[(1, .6), (1.37, .3), (3.2, .18)], sweep=-900, drive=.52),
    'weapons/tumblerHit': dict(kind='hollow_donk', dur=0.230, f=260, noise=0.14, click=.58, harmonics=[(1, .8), (2.05, .28), (3.1, .13)], drive=.8),
    'weapons/bellHit': dict(kind='school_bell', dur=0.360, f=880, noise=0.04, click=.3, harmonics=[(1, .7), (2.01, .45), (3.96, .24)], drive=.48),
    'weapons/flaskHit': dict(kind='glass_pop', dur=0.240, f=1220, noise=0.28, click=.8, harmonics=[(1, .5), (1.72, .3), (2.46, .2)], sweep=520, drive=.56),
    'weapons/onigiriHit': dict(kind='soft_splat', dur=0.190, f=180, noise=0.42, click=.42, harmonics=[(1, .55), (1.9, .15)], drive=.74),
    'weapons/stunGunHit': dict(kind='electric_zap', dur=0.180, f=1150, noise=0.30, click=.45, harmonics=[(1, .55), (6.0, .28), (8.3, .18)], tremolo=92, drive=.68),
    'weapons/missileHit': dict(kind='small_boom', dur=0.380, f=135, noise=0.48, click=.95, harmonics=[(1, .75), (1.55, .24)], sweep=-70, drive=.95),
    'weapons/starlinkHit': dict(kind='orbital_crack', dur=0.420, f=72, noise=0.38, click=1.0, harmonics=[(1, .7), (3.4, .25), (7.8, .13)], sweep=-45, drive=.95),
    'weapons/compassHit': dict(kind='needle_ping', dur=0.260, f=1480, noise=0.09, click=.46, harmonics=[(1, .72), (2.62, .26), (4.02, .15)], drive=.5),
    'weapons/umbrellaHit': dict(kind='canopy_thump', dur=0.280, f=310, noise=0.20, click=.62, harmonics=[(1, .65), (1.35, .3), (2.4, .16)], drive=.72),
    'weapons/eraserHit': dict(kind='rubber_boom', dur=0.310, f=210, noise=0.31, click=.65, harmonics=[(1, .68), (1.8, .22)], sweep=-85, drive=.78),
    'weapons/chibikoHit': dict(kind='tiny_pop', dur=0.100, f=2360, noise=0.16, click=.75, harmonics=[(1, .58), (1.9, .21)], drive=.45),
    'weapons/sharkHit': dict(kind='bite_crunch', dur=0.300, f=92, noise=0.55, click=1.0, harmonics=[(1, .55), (2.3, .28)], tremolo=36, drive=.9),
    'weapons/flaskTick': dict(kind='acid_sizzle', dur=0.165, f=1640, noise=0.64, click=.16, harmonics=[(1, .25), (2.7, .16)], tremolo=44, drive=.46),
    'weapons/lanternTick': dict(kind='light_singe', dur=0.145, f=1960, noise=0.32, click=.22, harmonics=[(1, .36), (2.2, .14)], tremolo=60, drive=.42),

    # newly identified gameplay cues
    'events/chestDrop': dict(kind='wood_drop', dur=0.280, f=185, noise=0.18, click=1.0, harmonics=[(1, .72), (1.55, .26)], sweep=-50, drive=.82),
    'events/chestOpen': dict(kind='lock_gold_burst', dur=0.470, f=560, noise=0.16, click=.82, harmonics=[(1, .45), (2, .35), (3.98, .22)], sweep=380, drive=.62),
    'events/textbookLand': dict(kind='paper_flop', dur=0.130, f=360, noise=0.46, click=.34, harmonics=[(1, .24), (1.6, .14)], drive=.44),
    'ui/textbookCollect': dict(kind='xp_chime', dur=0.270, f=980, noise=0.035, click=.32, harmonics=[(1, .55), (1.5, .42), (2, .24)], sweep=260, drive=.42),
    'enemies/dogeDeath': dict(kind='doge_toy_pop', dur=0.360, f=620, noise=0.12, click=.64, harmonics=[(1, .56), (1.25, .34), (1.7, .2)], sweep=720, tremolo=18, drive=.55),
    'enemies/dogeEscape': dict(kind='doge_poof_away', dur=0.420, f=440, noise=0.34, click=.38, harmonics=[(1, .4), (1.7, .25)], sweep=-220, tremolo=11, drive=.5),
}

def env(t, dur, kind):
    a = min(1.0, t / max(0.002, dur * 0.08))
    rel = max(0.0, 1.0 - t / dur)
    if 'bell' in kind or 'chime' in kind or 'burst' in kind:
        return a * (rel ** 1.7)
    if 'boom' in kind or 'crack' in kind:
        return a * (rel ** 2.2)
    if 'sizzle' in kind:
        return a * (rel ** 1.1)
    return a * (rel ** 2.8)

def synth(spec):
    dur = spec['dur']
    n = int(SR * dur)
    f0 = spec['f']
    data = []
    last_noise = 0.0
    phase = 0.0
    for i in range(n):
        t = i / SR
        e = env(t, dur, spec['kind'])
        sweep = spec.get('sweep', 0.0)
        f = max(35.0, f0 + sweep * (t / dur))
        trem = spec.get('tremolo')
        trem_amp = 1.0 if not trem else 0.72 + 0.28 * math.sin(2 * math.pi * trem * t)
        val = 0.0
        for mult, amp in spec.get('harmonics', [(1, 1)]):
            val += amp * math.sin(2 * math.pi * f * mult * t + phase)
        # shaped noise: moving average gives paper/wood body, raw gives crunch/sizzle
        raw = random.uniform(-1, 1)
        last_noise = last_noise * 0.70 + raw * 0.30
        noisy = raw if ('sizzle' in spec['kind'] or 'crunch' in spec['kind']) else last_noise
        val = val * (1 - spec['noise']) + noisy * spec['noise']
        # click transient
        click_len = max(1, int(SR * min(0.018, dur * 0.22)))
        if i < click_len:
            val += spec['click'] * (1 - i / click_len) * random.uniform(-1, 1)
        # intentional soft clipping
        val *= e * trem_amp * spec.get('drive', 0.7)
        val = math.tanh(val * 1.6) * 0.72
        data.append(int(max(-1, min(1, val)) * 32767))
    return data

def write_wav(path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = b''.join(int(s).to_bytes(2, 'little', signed=True) for s in samples)
        wf.writeframes(frames)

def ffmpeg_convert(wav, stem):
    ogg = OUT / f'{stem}.ogg'
    mp3 = OUT / f'{stem}.mp3'
    ogg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-c:a', 'libvorbis', '-q:a', '4', str(ogg)], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '80k', str(mp3)], check=True)
    return ogg, mp3

if TMP.exists():
    shutil.rmtree(TMP)
TMP.mkdir()
created = []
for stem, spec in SOUNDS.items():
    wav = TMP / f"{stem.replace('/', '__')}.wav"
    write_wav(wav, synth(spec))
    ogg, mp3 = ffmpeg_convert(wav, stem)
    created.append((stem, ogg.stat().st_size, mp3.stat().st_size))
shutil.rmtree(TMP)
for stem, ogg_size, mp3_size in created:
    print(f'{stem}: ogg={ogg_size} mp3={mp3_size}')
print(f'generated={len(created)}')
