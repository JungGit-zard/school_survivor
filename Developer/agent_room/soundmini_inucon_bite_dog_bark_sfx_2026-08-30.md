# Sound_Mini — Inucon push dog-bark SFX replacement (2026-08-30)

- Kanban: `t_51e4acdf`
- Profile: `soundmini`
- Scope: replace only `inuconBite` audio assets used by the existing runtime SFX id. No code/registry wiring changed.
- Project path: `D:\JungSil\2.Minigame_project\school_survivor-integration`

## Mandatory pre-command gate

Command run from project root:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile soundmini -Domain auto -TaskSummary 'inucon dog bark sfx asset replacement'
```

Result:

- exit_code: `0`
- resolved_domains: `common`, `audio`
- matched_domains: `audio`
- match_evidence: `sfx`
- combined_receipt_sha256: `74007aa4a558382338198117491cbfac8c80bfb8b35d80589160ef1529ecf637`

All emitted `read_required` documents were read completely except `SESSION_MEMORY.md`, which was read according to the central rule as the latest single session entry only (`Session 8 · Entry 0 · 2026-08-30 0524 KST`). Additional Sound_Mini startup/methodology documents read: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`, `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`, `Developer/agent_room/soundmini_animalese_voice_methodology_2026-07-15.md`, and `Developer/agent_room/game_development_kanban_process.md`.

## Asset design

- Intended event: Inucon successful push, existing SFX id `inuconBite`.
- New sound: compact two-bark procedural dog cue: first lower “woof” burst plus second brighter “arf” burst.
- Duration target: under 0.5s, mono 44.1kHz, mobile-safe peak under full scale.
- Runtime/code boundary: kept `Inucon.jsx`, `Player.jsx`, `sfxRegistry.js`, `SOUND_MAP`, cooldowns, volumes, title BGM, and unrelated audio unchanged.

## Source and license

- Source type: project-owned procedural synthesis generated locally with Python (`numpy` math/noise/formant synthesis) and encoded to OGG Vorbis + MP3 fallback.
- External copyrighted audio: none.
- Real-person voice imitation: none.
- Third-party sample/audio asset source: none.
- License status: project-owned generated asset; no NC/GPL/SA/unclear-license input used.

## Files changed

- `Developer/r3f_prototype/public/sfx/enemies/inuconBite.ogg`
- `Developer/r3f_prototype/public/sfx/enemies/inuconBite.mp3`

No other `public/sfx/enemies` asset was intentionally edited.

## Verification results

```text
node scripts/verify-voice-sfx-assets.mjs
→ verified 29 voice-like SFX ids (58 files)
```

Decode/duration verification with Python `soundfile`:

```text
public/sfx/enemies/inuconBite.ogg: decode=OK duration=0.430000s sr=44100 samples=18963 peak=0.5340 rms=0.0666 bytes=6656 sha256=91a515d574ea36ce148a09ba7d3ff2dcae2d71695d1be7e5c856bdd3e63126c4
public/sfx/enemies/inuconBite.mp3: decode=OK duration=0.470204s sr=44100 samples=20736 peak=0.5224 rms=0.0614 bytes=3761 sha256=0cc80254c7fa8348379e9749b445348cd226d5d82a8758a1688176b7c673bb99
```

Focused git status:

```text
 M public/sfx/enemies/inuconBite.mp3
 M public/sfx/enemies/inuconBite.ogg
```

Repository had many unrelated dirty/deleted/untracked files before this task; they were preserved and not intentionally touched.

## Commands run

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile soundmini -Domain auto -TaskSummary 'inucon dog bark sfx asset replacement'
read_file/read required documents emitted by checker and Sound_Mini startup docs
test -d /c/Users/admin/AppData/Local/hermes/profiles/soundmini/home/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
git status --short --branch
ffmpeg -version >/dev/null 2>&1 && echo FFMPEG_OK || echo FFMPEG_MISSING
ffprobe ... (blocked: ffprobe missing)
python -m pip install --user --quiet lameenc soundfile
python procedural synthesis/encode script (first run failed with IndentationError before writing assets)
python procedural synthesis/encode script (second run wrote and verified OGG/MP3)
node scripts/verify-voice-sfx-assets.mjs
python decode/duration/hash verification for inuconBite OGG/MP3
git diff --numstat -- public/sfx/enemies/inuconBite.ogg public/sfx/enemies/inuconBite.mp3
git status --short -- public/sfx/enemies/inuconBite.ogg public/sfx/enemies/inuconBite.mp3
TZ=Asia/Seoul date '+%Y-%m-%d %H%M KST'
```

## Blockers / review note

- `ffmpeg`/`ffprobe` were not available on PATH, so encoding used installed Python packages `soundfile` and `lameenc`.
- Objective file/decode/duration checks pass. Final audible acceptance should be by human/QA listening because “clearly recognizable dog bark” is partly perceptual.
