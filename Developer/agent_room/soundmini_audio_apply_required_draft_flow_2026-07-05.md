# Sound_Mini Review - Audio Apply-Required Draft Flow - 2026-07-05

## Scope

Review the audio tab behavior change: slider edits must remain temporary until `Apply`.

## Decision

No new playback engine, asset, or format change was needed. The minimal safe path is to keep draft audio tuning in React state and call `saveSfxTunings` only from `Apply`.

## Result

Audio slider edits no longer change game playback storage until `Apply` is pressed. Once applied, existing `playSfx` reads the saved tuning on the next playback.

