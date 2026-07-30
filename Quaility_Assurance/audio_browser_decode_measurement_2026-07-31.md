# Browser Audio Decode Measurement QA Plan

Date: 2026-07-31  
Scope: E2E-only, decode-only evidence for 77 runtime audio logical IDs.

## Entry route

Run the development build only at:

```text
http://localhost:5173/?e2e=1&e2eaudio=1
```

Both exact query values are mandatory. The route must not be used as evidence for the ordinary game route, loudness, playback quality, or listening tests.

## Acceptance checks

1. `[data-testid="audio-diagnostics-status"]` reaches `complete` or `complete-with-errors`.
2. Parse `[data-testid="audio-diagnostics-json"]` and confirm `catalog.actualCount === 77`, `catalog.sfxCount === 75`, `catalog.bgmCount === 2`, and `completed === 77`.
3. Confirm each logical ID appears exactly once. A failure must remain a `status: "error"` row with a concrete error message; do not omit or silently replace it.
4. For every `status: "ok"` row, verify finite positive duration/sample rate/channel count plus finite PCM peak/RMS/dBFS values. Do not require the decoded PCM peak to be at or below 1.0: retain `clippedSampleCount`, `clippedSampleRatio`, and `hasSampleOvers` as decoded-sample risk evidence.
5. Record browser version, URL, build/Git SHA, timestamp, completed JSON, and any errors.

## Measurement limits

The reported values are Web Audio decoded PCM duration, channel count, sample rate, sample peak, RMS, and RMS dBFS only. They are not LUFS or true-peak measurements and do not demonstrate clipping/masking absence, playback mix quality, Android output, or human listening.

## First-run evidence and current state

The first browser run completed 77 rows, with 60 `ok` and 17 error rows. The errors were caused by a diagnostic validation rule rejecting finite decoded samples above absolute 1.0, not by documented fetch/decode failures. The helper now reports those finite overs explicitly instead.

The Advisor must rerun after this change and record the final JSON. This document does not claim a final 77/77 result before that rerun.
