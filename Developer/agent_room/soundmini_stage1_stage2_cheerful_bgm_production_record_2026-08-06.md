# SoundMini Stage 1·2 cheerful student-recovery BGM production record

Date: 2026-08-06
Project: Escape! zombie school
Kanban task: t_ad0b9a15
Specialist: soundmini / Sound_Mini
Scope: produce two original playable WAV draft loops under Developer-only non-runtime working space. No runtime registry, manifest contract, title screen, Firebase, build, AAB, commit, or push changes.

## Direction applied

- Zero horror feeling.
- Core emotions: 유쾌, 신남, 다정, 청춘.
- World premise: infected students are friends who will ultimately return to normal; BGM frames action as cheerful rescue/recovery, not extermination.
- Stage 1: 교실 장난감 구조대 칩튠, warmer and kinder, classroom toy rescue energy.
- Stage 2: 복도 스포츠 아케이드 런, faster sporty corridor action with sneaker-step momentum.
- Boss/climax feeling is baked into later-loop density, not a separate boss track.

## Source and reproducibility

Generator source:
- `Developer/stage_bgm_drafts_2026-08-06/generate_stage_bgm_drafts.py`

Working masters, intentionally not in runtime/public/src assets:
- `Developer/stage_bgm_drafts_2026-08-06/masters/stage1_classroom_toy_rescue_loop_draft.wav`
- `Developer/stage_bgm_drafts_2026-08-06/masters/stage2_corridor_sports_arcade_loop_draft.wav`

Validation metrics JSON:
- `Developer/stage_bgm_drafts_2026-08-06/render_metrics_initial.json`
- `Developer/stage_bgm_drafts_2026-08-06/validation_metrics.json`

Method:
- Direct self-written procedural synthesis with Python + NumPy only.
- Mono 16-bit PCM WAV output at 32 kHz.
- No external samples, downloads, named-game imitation, copied melody/chord/rhythm signatures, AI music service, or real-person voice imitation.
- Composition uses intentionally short original motif fragments only: Stage 1 uses <=4-note classroom rescue motifs; Stage 2 uses <=3-note corridor cheer blips.
- The tiny boundary fade/sample guard sets start/end samples to zero for draft loop seam safety; no long reverb tail is used.

## Commands used

All commands were run from project root `D:/JungSil/2.Minigame_project/school_survivor-integration`.

```bash
git status --short --branch
python Developer/stage_bgm_drafts_2026-08-06/generate_stage_bgm_drafts.py --json Developer/stage_bgm_drafts_2026-08-06/render_metrics_initial.json
python Developer/stage_bgm_drafts_2026-08-06/generate_stage_bgm_drafts.py --validate --determinism --json Developer/stage_bgm_drafts_2026-08-06/validation_metrics.json
```

Determinism check created temporary outputs under:
- `Developer/stage_bgm_drafts_2026-08-06/tmp/stage_bgm_determinism_t_ad0b9a15/run_a/`
- `Developer/stage_bgm_drafts_2026-08-06/tmp/stage_bgm_determinism_t_ad0b9a15/run_b/`

The generator then removed only that explicit task-specific temp directory; `tempDirRemoved: true`.

## Track metadata and signal validation

### Stage 1 — classroom toy rescue loop draft

- Logical id: `stage1_classroom_toy_rescue_chiptune_draft`
- File: `Developer/stage_bgm_drafts_2026-08-06/masters/stage1_classroom_toy_rescue_loop_draft.wav`
- BPM: 140
- Meter: 4/4
- Bars/beats: 36 bars / 144 beats
- Duration: 61.71428125 sec
- Key/mode color: C major / A Dorian / D Mixolydian bright hybrid
- Motif: original <=4-note classroom rescue motifs `[E4,G4,rest,A4]` and `[G4,E4,rest,D4]`, with later bright response variation.
- Palette: square lead, triangle bass, restrained toy bell, short dry noise drums, thin late arpeggio.
- Arrangement: bass+tick intro, main motif, lead dropout/rest area, later arpeggio lift, mischievous low pulse/noise-roll climax lead-out, final lead/bell rest before return.
- Channels: 1 mono
- Sample rate: 32000 Hz
- Bit depth: 16-bit PCM
- Frames: 1974857
- Bytes: 3949758
- SHA-256: `c56b6e3e783c278a73d1fa60dc4019f017dd444de4478ffd238299083eb7af08`
- Sample peak: 0.8399658203125 (-1.5147677157072617 dBFS), below 0.89 target
- RMS: 0.18319552490935972 (-14.741702789226778 dBFS)
- DC offset: -0.00010442078868914622
- Start sample: 0.0
- End sample: 0.0
- Loop seam discontinuity: 0.0
- Loop seam window RMS delta, first/last 1024 samples: 0.20907165011991333
- Non-silent ratio: 0.6720628379675085
- Clipped sample count: 0
- Signal validation: PASS

### Stage 2 — corridor sports arcade loop draft

- Logical id: `stage2_corridor_sports_arcade_run_draft`
- File: `Developer/stage_bgm_drafts_2026-08-06/masters/stage2_corridor_sports_arcade_loop_draft.wav`
- BPM: 148
- Meter: 4/4
- Bars/beats: 36 bars / 144 beats
- Duration: 58.378375 sec
- Key/mode color: G Mixolydian / E Dorian / heroic modal color
- Motif: original <=3-note corridor cheer blips `[D4,F#4,A4]`, `[E4,G4,A4]`, and short variants.
- Palette: narrow pulse bass, dry sneaker tick, filtered short noise hats, hollow square blip, rare small bell sparkle.
- Arrangement: faster pulse intro, main corridor blip call, tick dropout/breathing area, projectile-action short hat lift, sporty low-pulse climax lead-out, final root pulse return.
- Channels: 1 mono
- Sample rate: 32000 Hz
- Bit depth: 16-bit PCM
- Frames: 1868108
- Bytes: 3736260
- SHA-256: `c7c1991803c99173ffa62ee40992ab13b17cc6f3cb8499902852e6931cf7a9e0`
- Sample peak: 0.8399658203125 (-1.5147677157072617 dBFS), below 0.89 target
- RMS: 0.18380080497058648 (-14.713051818354161 dBFS)
- DC offset: -0.002013235517289376
- Start sample: 0.0
- End sample: 0.0
- Loop seam discontinuity: 0.0
- Loop seam window RMS delta, first/last 1024 samples: 0.30413970369678817
- Non-silent ratio: 0.4893780231121541
- Clipped sample count: 0
- Signal validation: PASS

## Determinism proof

Generator was run twice into a task-specific temporary output directory and compared by SHA-256.

- Stage 1 run A: `c56b6e3e783c278a73d1fa60dc4019f017dd444de4478ffd238299083eb7af08`
- Stage 1 run B: `c56b6e3e783c278a73d1fa60dc4019f017dd444de4478ffd238299083eb7af08`
- Stage 1 deterministic: true
- Stage 2 run A: `c7c1991803c99173ffa62ee40992ab13b17cc6f3cb8499902852e6931cf7a9e0`
- Stage 2 run B: `c7c1991803c99173ffa62ee40992ab13b17cc6f3cb8499902852e6931cf7a9e0`
- Stage 2 deterministic: true
- Temporary outputs removed: true

## Title BGM canonical lock verification

File checked, not modified:
- `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`

Expected and observed:
- Bytes: 998122
- SHA-256: `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`
- Canonical check: PASS

## Originality and provenance statement

Both WAV drafts were generated from the checked-in deterministic Python source above using only mathematical oscillators/noise synthesis and original short motif patterns written for this task. No third-party audio file, sample pack, downloaded material, AI music service, commercial game asset, Nintendo/Sega/classic-game melody, or named-game imitation was used. These are review drafts only and are not approved runtime/release assets until human listening QA and integration QA approve them.

## QA boundary

Objective signal-level validation was performed with Python `wave`, NumPy PCM measurement, SHA-256 hashing, and deterministic re-render comparison. No human playback/listening QA was performed in this worker run, so subjective musical quality, loop feel over repeated play, mobile speaker translation, and SFX masking in actual gameplay remain unclaimed.

## Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: Escape! zombie school BGM production; sound/audio domain requires `soundmini`.
- Specialists involved: `soundmini` current Kanban task `t_ad0b9a15`.
- Cards/artifacts/review trail: this production record and Developer-only generated WAV/source artifacts listed above.
- Verification: command outputs in `validation_metrics.json`; title BGM canonical check PASS; signal validation PASS for both WAVs.
- Remaining blockers: human listening QA and gameplay/SFX masking QA are still needed before runtime integration or release-candidate approval.
