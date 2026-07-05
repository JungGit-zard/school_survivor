# Graphics Studio Audio Apply Button - 2026-07-05

## Change

Added an `Apply` button to the Graphics Studio audio inspector.

## Behavior

- Volume and pitch sliders still save live.
- `Apply` confirms the currently selected SFX tuning through `saveSfxTunings`.
- Game playback uses the saved tuning immediately because `playSfx` reloads SFX tuning at playback time.

