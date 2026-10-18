# Audio ship — Advisor baseline

Owner: existing audio Advisor, Orca terminal `term_75f45fe9-8501-4e1d-a845-5c4e44b5ab1f`.
Canonical checkout: `F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration`.
Integration/deployment owner: `term_af12cb1e-0b5e-44fd-a413-e31f83dc0a66`.
No independent production deployment from audio lane.

## Ownership recovered

- Existing soundmini card `t_3dc10901`: automatic runs 1670/1671 crashed; manual96330 was interrupted on user request. Resumed registered soundmini manual session57502, launcher PID30616.
- Existing uimini card `t_ccf55f42`: automatic runs1672/1673 crashed; manual3220 was interrupted on user request. Resumed registered uimini manual session96067, launcher PID11912.
- Another live uimini PID32720 is the integration phase2 UI worker, not an audition writer; preserve it.
- Cards remain blocked against the old automatic dispatcher to prevent duplicate writers; manual ownership recorded in card comments.

## Baseline checks before edits

Audio runtime and assets had no task changes before restart. Shared checkout has extensive unrelated edits; no reset/stash/broad staging.

`node node_modules/vitest/vitest.mjs run src/lib/dialogueVoice.test.js src/lib/sfxRegistry.test.js src/components/HUD.dialogueVoice.test.js scripts/verify-audio-manifest.test.js`

2026-10-16 09:06 KST: 37 passed, 4 failed, 3 test files passed, 1 failed. Failures were in existing provenance verifier tests: two valid-fixture assertions and two 5-second timeouts. Runtime/dialogue/HUD focused tests passed.

`node scripts/verify-audio-manifest.mjs`

Fails only existing inuconBite OGG/MP3 byte and SHA-256 metadata mismatch. Investigate provenance/generator/history before refreshing metadata; do not rewrite the audio merely to match stale hashes. Title BGM and other baseline assets are not to be modified.

## Scope and acceptance

93 SOUND_MAP/dialogue cases, original plus 279 distinguishable A/B/C playable alternatives; Korean audition page with cancellation/unlock/error handling, no automatic candidate selection. Fix demonstrated runtime reliability defects and restore genuinely missing baseline functionality. No BGM/title, user tuning, auth/progress, Firebase writes, localStorage or shared gameplay edits. Deliver source/reason/SHA manifest and focused verification to integration owner for selective absorption into `releases/integrated-game-20261016-t_e2815ba8`.

## Independent interim verification — 09:21 KST

- `node node_modules/vitest/vitest.mjs run src/lib/dialogueVoice.lifecycle.test.js src/lib/dialogueVoice.test.js src/lib/sfxRegistry.test.js src/components/HUD.dialogueVoice.test.js scripts/verify-audio-manifest.test.js --testTimeout=15000`: exit0, 5 files/51 tests passed, 2.82 seconds. Timeout changed only for this invocation because baseline contention caused 5-second fixture subprocess timeouts; assertions unchanged.
- `node --test Developer/agent_room/audio_ship_20261016/uimini-audition.test.cjs`: exit0, 9 passed, 0 skipped/failed. Includes stale disposal recursion regression, cancellation, error handling, search, original/ABC controls and memory-only choices. Synthetic fixture tests do not prove real audio coverage.
- Scoped `git diff --check`: exit0.
- uimini Node-only completion accepted, process session58524 exited0; no browser launch. Actual assets and browser QA still pending; NOT READY.
