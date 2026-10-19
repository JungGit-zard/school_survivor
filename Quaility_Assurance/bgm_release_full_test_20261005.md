# BGM deployment and full automated test results

- Date: 2026-10-05 KST
- Kanban: `escape-zombie-school / t_ae363645`
- Deployed commit: `bcca78a`
- Scope: finish requested CDN BGM connections, deploy web app, run full configured automated suite.

## Deployment

- Built from an isolated `zombie_only` worktree at `bcca78a`; unrelated original-worktree changes were excluded.
- Command: `npm run deploy:hosting:safe -- bgm-bcca78a`.
- Firebase environment gate, production build, 45 Studio sync tests and 55 hosting JavaScript asset checks passed.
- Preview channel `bgm-bcca78a` was verified and promoted to live successfully.
- Fresh browser verified `https://escapezombie.com/` landing, then `/game` and guest lobby.
- Title: `https://music.escapezombie.com/zombie_openning.mp3`, playing=true, observed playback position 27.894955 seconds.
- Guest lobby: `https://music.escapezombie.com/zombie_soft1.mp3`, playing=true, loop=true, observed playback position 18.355408 seconds. Title playback had stopped.
- Browser reported no page errors; test browser closed afterward.
- No authenticated Google login verification was performed; authentication code was not changed. No live user Firebase data was changed.

## Full test suite

- Tested original working tree, including its pre-existing uncommitted changes; this differs from the isolated deployed commit.
- Command: `npm test -- --reporter=verbose --maxWorkers=4`.
- Start: 22:36:36 KST; duration: 384.60 seconds; exit code: 1.
- Files: 248 passed, 18 failed, total 266.
- Tests: 2,515 passed, 30 failed, 20 skipped, total 2,565.
- Full local output: `Quaility_Assurance/full_test_bgm_20261005.log` (ignored log, not committed).
- The previously long-running Lobby test performs 10,000 mock login/hydration/render cycles. It passed in 376,344 ms. It was not a confirmed network delay or deadlock.
- Failure areas: audio manifest (2), virtual joystick (2), boss passives (3), critical-hit visual wiring (1), deferred imports (1), Studio preview (1), visual pool reset (1), quest-giver editor (1), Studio animation (1), Studio group readiness (1), title cheat settings (1), graphics config (2), prop palette (1), prop readiness (1), student proximity (1), stage prop assets (3), stage prop placement (6), Hanako wiring (1).
- Failures were recorded, not repaired or classified as pre-existing without baseline comparison. Full-suite success is not claimed.
- Focused BGM validation in the preceding task: 19 tests passed.

## Routing limitation

The registered soundmini Opus invocation in the preceding task returned HTTP 400 (model unsupported by this ChatGPT Codex account). No substitute model was used. Advisor verification and deployment evidence are recorded on the Kanban card.
