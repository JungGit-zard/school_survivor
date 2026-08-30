# QA — Inucon `inuconBite` dog-bark audio asset check (2026-08-30)

- Kanban: `t_51e4acdf`
- QA scope: static audio asset verification only; no browser/gameplay run performed.
- Asset paths:
  - `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\public\sfx\enemies\inuconBite.ogg`
  - `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\public\sfx\enemies\inuconBite.mp3`

## Acceptance checks

| Check | Result | Evidence |
| --- | --- | --- |
| Expected OGG and MP3 files exist | PASS | `verify-voice-sfx-assets.mjs` verified 29 IDs / 58 files |
| Both files decode | PASS | Python `soundfile` decoded both files |
| Duration is mobile-safe short cue | PASS | OGG `0.430000s`, MP3 decoded with encoder padding `0.470204s` |
| Peak avoids full-scale clipping | PASS | OGG peak `0.5340`, MP3 peak `0.5224` |
| Registry/runtime code unchanged | PASS (scoped by task) | No edit to `Inucon.jsx`, `Player.jsx`, `sfxRegistry.js`, or title BGM |
| External copyrighted source avoided | PASS | Procedural generated audio only; no samples |

## Commands and results

```text
node scripts/verify-voice-sfx-assets.mjs
→ verified 29 voice-like SFX ids (58 files)
```

```text
public/sfx/enemies/inuconBite.ogg: decode=OK duration=0.430000s sr=44100 samples=18963 peak=0.5340 rms=0.0666 bytes=6656 sha256=91a515d574ea36ce148a09ba7d3ff2dcae2d71695d1be7e5c856bdd3e63126c4
public/sfx/enemies/inuconBite.mp3: decode=OK duration=0.470204s sr=44100 samples=20736 peak=0.5224 rms=0.0614 bytes=3761 sha256=0cc80254c7fa8348379e9749b445348cd226d5d82a8758a1688176b7c673bb99
```

Focused status:

```text
 M public/sfx/enemies/inuconBite.mp3
 M public/sfx/enemies/inuconBite.ogg
```

## Remaining risk

Subjective listening QA is still recommended before merge because the key acceptance phrase, “clearly recognizable short dog-bark sound,” cannot be fully proven by decode/duration metrics alone.
