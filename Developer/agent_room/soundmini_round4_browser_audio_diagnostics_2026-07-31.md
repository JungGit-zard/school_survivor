# Sound_Mini Round 4 — Browser Audio Decode Diagnostics

Date: 2026-07-31  
Role: `soundmini` diagnostic implementation trail  
Scope: E2E-only browser decode measurement for the 75 runtime SFX logical IDs and the two runtime BGM imports.

## What is implemented

- The diagnostic catalog is derived directly from `src/lib/sfxRegistry.js` `SOUND_MAP` plus imports of `title_bgm.wav` and `gameplay_bgm.wav`; it creates no second manifest authority.
- The exact contract is 77 logical IDs: 75 SFX + `titleBgm` + `gameplayBgm`. Duplicate IDs and count mismatches are validation failures.
- In a browser at the strict dev-only URL `?e2e=1&e2eaudio=1`, each primary SFX URL and both BGM URLs are fetched and passed to `AudioContext.decodeAudioData` without playback.
- Each completed row reports only: `durationSec`, `channels`, `sampleRate`, PCM `samplePeak`/`samplePeakDbfs`, `pcmRms`/`pcmRmsDbfs`, and decoded-sample overs (`clippedSampleCount`, `clippedSampleRatio`, `hasSampleOvers`). Fetch/decode/validation failures remain explicit error rows keyed by logical ID.
- The component aborts pending fetches and closes its `AudioContext` at completion or unmount. It does not create `Audio`, call `play`, or use Firebase, Studio, or browser storage.

## Safety boundary

- The diagnostic module is dynamically loaded from `src/main.jsx` only after both query parameters equal `1` and `import.meta.env.DEV` is true.
- All ordinary and production URLs continue through the normal application branch; they do not mount the diagnostic component or execute its fetch/AudioContext operations.
- This is a decoding/PCM measurement aid only. It does **not** measure or claim integrated LUFS, true peak, clipping absence, masking absence, Android playback behavior, or that any sound was listened to.

## First browser run and required follow-up evidence

The first actual browser execution reached 77 rows but recorded only 60 `ok` and 17 `error` rows because the original helper treated finite decoded samples above absolute 1.0 as an invalid measurement. Reported examples included `bellFire`, `sharkFire`, `compassQuack`, `playerDeath`, and `bossRoar`.

Lossy-compressed audio decoded by Web Audio can have finite sample overs. The measurement now preserves that evidence instead of discarding the row: an overs is not called LUFS, true peak, or proof of output clipping.

An Advisor must rerun the target browser route and preserve the finished JSON from `[data-testid="audio-diagnostics-json"]` with the build/SHA and browser details. A final 77/77 result is not claimed here before that rerun.
