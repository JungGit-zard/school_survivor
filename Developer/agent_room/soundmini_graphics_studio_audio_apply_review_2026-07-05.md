# Sound_Mini Review - Graphics Studio Audio Apply Button - 2026-07-05

## Scope

Review the requested audio studio `Apply` control and immediate game application behavior.

## Decision

No new audio assets, synthesis, licensing, or playback engine were added. The safest low-risk path is to reuse the existing `saveSfxTunings` and `playSfx` flow.

## Result

- The audio tab now exposes `Apply`.
- `Apply` stores the selected SFX volume/rate tuning.
- Existing game SFX playback reads saved tuning on each `playSfx` call, so newly applied values affect the next game playback immediately.

