# Stage4 hazard readability implementation — t_c4cc2f7d

Status: owned runtime patch implemented; focused tests and normal production build passed. Independent real-Scene/browser/audio acceptance remains with root / Balance_QA. No browser or remote writes performed by Three_Mini.

## Location / ownership

- Canonical documents: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration
- Candidate: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/stage4-upgrade-20261024
- App below candidate: Developer/r3f_prototype
- Baseline read-only Git check: clean zombie_only at 0bcf4bff123f58c28a12598bbf9f4d68e5aada5b before source edits.
- Concept canonical SHA256 verified: 320d7db4542023d4b69a4f0e10802fbcbcfce7a708c0a31eaa097df3d84c300a.
- Source ownership only the five files below. Other writers' Game.jsx, HUD.jsx, locales and integration helpers/tests are present and preserved. They are excluded from implementation.patch.
- No stage / commit / push / checkout / reset / stash; root owns Git operations.

## Delivered changes

1. PressureCauldron default runtime wrapper mounts Stage4CauldronGroundWarning as a scene-root R3F portal. Its center is Game's existing fixed world (0, 0) center and its ring outer radius comes from PRESSURE_CAULDRON_DAMAGE_RADIUS, not the cauldron model transform. There is no PRESSURE_CAULDRON_DAMAGE_CENTER export. Position/scale/yaw/Studio tuning remain on the existing prop model, not on the damage boundary. Removed the misleading model-scaled eight-box hazard ring; existing cauldron body, steam and debris remain.
2. Continuous full warning from cycle 12000 through 14999 ms; fixed 3.2-unit solid rim + inset progress ticks, then a separate 250 ms fire rim/spokes. Frame-only runtime clock; no timer, listener or network registration. Pause freezes progress. Nonactive stages and terminal phases hide the portal; unmount removes it. Runtime clock reset clears it. Model-only previews do not gain a scene hazard portal.
3. B04 soup remains on existing centers and exact 1.1-unit radius. Eight separated rim arcs plus a bowl/steam glyph identify soup by shape, rather than color alone. Nothing increases damage radius. Existing start/advance/consume code, max-three generation and timing are unchanged.
4. Approved minimal B04 transition cues from soundmini.md: zombieChargeRoar at nonempty telegraph entry; flaskHit at telegraph -> explode; bossRoar once when entering P2 after existing done state. Stage4/playing/B04 gated; listener exceptions cannot interrupt combat. No new bossWarning, bossDeath or stage-clear emission. No registry, mix or asset edits. P1 projectile/dash cue opportunities are not added in this minimal patch.
5. The central cauldron's bossWarning/explosion sound edges belong to Game.jsx's real hazard consumer, per soundmini.md. This implementer deliberately does NOT emit those sounds from the visual portal. Game owner integration must use stage4CauldronFeedback / Game.stage4Feedback.runtime.test.jsx or equivalent reviewed owner patch; no duplicate visual-side cue should be added.

## Exact owned source file list and raw SHA256

Paths below are candidate-relative, raw bytes (not Git-normalized hashes):

- Developer/r3f_prototype/src/components/Enemy.jsx
  dfcbfa657f8c5d5a8f5e229bfe9158bfa89525191406d962c075b8c400227576
- Developer/r3f_prototype/src/components/StageObjects/PressureCauldron.jsx
  e3ca1c20b5ed0e11742db4b6884ea7f8071cd7e9d3eec0e022db507a7afa91e8
- Developer/r3f_prototype/src/components/StageObjects/PressureCauldron.test.js
  d8936201d5703e195c8fdcfa182bfbeec2dae9738854b0b848218a29e2e9d181
- Developer/r3f_prototype/src/components/StageObjects/Stage4CauldronGroundWarning.jsx (new)
  a308bf21af0e1a6fa96221614499ea600bfc73cb32e3b4dba100931f47783a2d
- Developer/r3f_prototype/src/components/Stage4Hazards.runtime.test.jsx (new)
  43052d656a4376a9a995a00781a3510c2173cb9638735c74d255176beccc00be

Tracked files remain LF, matching baseline blobs; no whole-Enemy line-ending churn. Only the scoped patch is exported. Existing PressureCauldron.test.js's old model-space eight-box contract now asserts the world-portal mount; real geometry/frame behavior is covered in the new runtime test, not only string checks.

## Execution evidence

Canonical report directory: Developer/agent_room/stage4_upgrade_20261024/

- implementation-audio-red-final.log: real Enemy transition test initially failed because approved cue trace was empty; after implementation it passes.
- implementation-focused.log: normal npm test -- src/components/Stage4Hazards.runtime.test.jsx src/components/StageObjects/PressureCauldron.test.js src/lib/b04SoupBlast.test.js src/lib/stage4PressureCauldronHazard.test.js src/lib/chefBossPhase.test.js. Exit 0; 5 files, 35 tests passed. Normal pretest ran branch, legacy-B02, dialogue and Studio source gates. No full-suite execution.
- Seven new frame/component cases execute actual R3F host objects and subscribed useFrame callbacks. Verify world center/radius/scale under Studio tuning and owner transforms, full warning sample window/progress/fire cutoff, runtime clock/pause/terminal/stage/run/unmount cleanup; B04 shape, existing HP50 -> 1200 ms warning -> 250 ms fire -> P2, single-hit damage consumer, boss-defeat path, death/unmount cancellation, and listener-failure isolation.
- Test boundaries: Zustand fixture is memory-only; ZombieMesh/GPU, Rapier and texture loader are offline substitutes. Existing Enemy state machine and existing hazard/soup helpers are real. These tests are NOT mobile GPU visual acceptance, physical collision simulation, or audible playback proof.
- implementation-build.log: normal npm run build exit 0, including normal prebuild environment gate (PASS; existing candidate env was provided outside this implementer, no env or credential read/copy), Studio sync 4 files / 45 tests passed, Vite 405 transformed modules, postbuild legacy-artifact gate and 62 hosting JS asset checks passed. Build warnings: oversized chunk and ineffective dynamic imports; not modified here.
- Build artifact: candidate/Developer/r3f_prototype/dist/index.html raw SHA256 c506e0959eb3322bd8a3550066cb3fde0c87da11e15075732335375c6b8bcd57. This is a build of the shared candidate snapshot; root should rebuild after all writers finish.
- Read-only git diff --check returned no errors. Static scoped-source scan and patch receipt are in implementation.json.

## Root / UI / independent Balance_QA handoff

Do not apply implementation.patch onto this already-edited candidate; it is a review/export artifact, not a second application instruction. Do not copy candidate files broadly into canonical. Root reviews and integrates narrowly.

Advisor correction: real-scene verification must use a fresh public GET of the current Firebase canonical Studio snapshot, normal validation/decode/application and matching revision ACK before mounting characters. Do not use default graphics, local seeds or saved Studio snapshots. Keep all Studio values in RAM without modification, deny every remote write and all unrelated external requests, and compare the complete canonical values/revision/hash again afterwards. The gameplay fixture keeps cloudUser null and never writes user progress. Do not call recordBossDefeat on a real Firebase-backed store merely to arrange the scene.

Suggested checks at a portrait viewport with normal Game camera/player/UI:
- At runtime 11.999 / 12 / 13.5 / 14.999 / 15 / 15.249 / 15.250 sec: center (0,0,0), outer radius 3.2 world units (0.8 block), uninterrupted warning, progress, distinct fire cutoff. Pause at 13.5 sec and resume using frozen runtime clock; repeat at next cycle 27–30.25 sec.
- Browser verification keeps actual Firebase scale/yaw/offset unchanged. Synthetic transform parameters in isolated component tests prove only geometry math, not Studio parity or permission to seed the browser. Warning must stay at Game's fixed center and radius.
- B04 actual boss path at 150 sec; call existing body _enemyHit with a noncritical, zero-knockback HP50 crossing in the OFFLINE fixture only. Preserve existing boss HP/stat values, max three circles and centers. Verify soup marks do not look like central solid cauldron ring; check 1.2 s warning and 0.25 s fire, P2 once, no cue stacking after repeated frames/pause, death during telegraph cancels later cues. Use existing mute/SFX settings for audible review; no mix changes.
- UI guidance uses marker semantic roles: central solid ring = kitchen/cauldron, separated bowl-rim soup marks = B04. Keep general nonhazard navigation outside these damage footprints; Three_Mini did not edit HUD/Game/locales.
- Preserve map 18.72 x 32 units; B04 150, Matilda warning205/spawn210, portal210, nominal240. No new zombie type/stats/geometry/palette/costume/slots; BOX E03/E02/E04 shared meshes remain handed off to the modeling agent. Permanent unlock remains boss-death-only.

## Review / redaction

Implementer self-review: Three_Mini. Independent reviewer: root / Balance_QA pending, no child spawned. No browser opened. No claim that a running visual scene or audible output has been independently accepted. Redaction: source/test/build evidence contains no copied secrets, tokens, passwords, auth data, or env contents; only paths, hashes, test counts and public code/build identifiers. Persistent lesson records only tested rendering/state facts and the limitation that headless frame tests cannot replace real-scene visual review.
