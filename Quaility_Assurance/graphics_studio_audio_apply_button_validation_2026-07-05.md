# Graphics Studio Audio Apply Button Validation - 2026-07-05

## Scope

Validate that the audio tab has an `Apply` button and that applied SFX tuning is available to game playback.

## Automated Checks

- `GraphicsStudio.test.jsx` confirms the audio tab exposes `Apply`, stores the current pitch tuning, and shows `Audio applied`.
- `sfxRegistry.test.js` confirms `playSfx` uses saved studio volume/rate tuning at playback time.

