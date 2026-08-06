# Stage 1·2 BGM draft objective audio QA note

Date: 2026-08-06
Project: Escape! zombie school
Kanban task: t_ad0b9a15
QA type: objective file/signal validation only; no human listening playback performed.

## Files checked

- `Developer/stage_bgm_drafts_2026-08-06/masters/stage1_classroom_toy_rescue_loop_draft.wav`
- `Developer/stage_bgm_drafts_2026-08-06/masters/stage2_corridor_sports_arcade_loop_draft.wav`
- `Developer/stage_bgm_drafts_2026-08-06/generate_stage_bgm_drafts.py`
- `Developer/stage_bgm_drafts_2026-08-06/validation_metrics.json`
- `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a` canonical lock check only

## Commands

```bash
python Developer/stage_bgm_drafts_2026-08-06/generate_stage_bgm_drafts.py --json Developer/stage_bgm_drafts_2026-08-06/render_metrics_initial.json
python Developer/stage_bgm_drafts_2026-08-06/generate_stage_bgm_drafts.py --validate --determinism --json Developer/stage_bgm_drafts_2026-08-06/validation_metrics.json
```

## Objective results

- WAV header validation: PASS for both files: mono, 16-bit PCM, 32000 Hz.
- Peak target: PASS for both files, sample peak 0.8399658203125 <= 0.89.
- Clipping: PASS for both files, clipped sample count 0.
- Unintended silence: PASS for both files; non-silent ratio Stage 1 = 0.6720628379675085, Stage 2 = 0.4893780231121541.
- DC offset: PASS for both files; Stage 1 = -0.00010442078868914622, Stage 2 = -0.002013235517289376.
- Sample-level start/end seam discontinuity: PASS for both files, 0.0.
- Deterministic re-render: PASS; both temporary run SHA-256 values matched final masters and temp directory was removed.
- Title BGM lock: PASS; `title_bgm.m4a` remains 998122 bytes and SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`.

## Not claimed

- No human listening QA was performed.
- No in-game SFX masking test was performed.
- No Android WebView/Capacitor playback test was performed.
- No runtime integration was performed.

## QA recommendation before integration

Before any runtime connection, run a separate listening/integration QA card that checks:

1. Seam feel over repeated loops at least several cycles.
2. Stage 1/2 distinguishability within 5 seconds.
3. `bossWarning`, `playerHit`, `levelUp`, projectile, dialogue/tutorial readability over BGM.
4. Mobile speaker fatigue and Android WebView decode/playback behavior after user input unlock.
