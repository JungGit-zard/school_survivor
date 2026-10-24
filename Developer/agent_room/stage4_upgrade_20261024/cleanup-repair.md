# Stage4 cleanup repair — t_d9356a4d

Candidate: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/stage4-upgrade-20261024

Status: SCOPED_REPAIR_FOCUSED_TESTS_PASS_ROOT_BROWSER_PENDING

Routing: Existing advisor-managed blocked card referenced only; no card mutation or dispatch. Reuse decision: threemini for Three/R3F resource ownership.

Mandatory checker PASS; GSTACK_OK; receipt 7af286119cd893177be0493b2533acd37b6678472376deb9cb9c0bb13c69e64c

## Proven root cause
Actual Three r164 InstancedMesh + R3F applyProps(mesh,{dispose:null}) sets mesh.dispose=null; actual component unmount reproduces TypeError at expansionInstances.js:126.

## Smallest repair
Remove dispose={null} from primitive only. Parent group dispose={null} retained. Required explicit cleanup unchanged; no optional chaining.

## RED
npm test -- src/components/expansion/ExpansionCleanup.test.jsx
Exit 1: one pass / one failure. TypeError: mesh.dispose is not a function at expansionInstances.js:126:83 during actual R3F unmount

## GREEN
npm test -- src/components/expansion/ExpansionInstances.test.js src/components/expansion/ExpansionRuntimeRetention.test.js src/components/expansion/ExpansionCleanup.test.jsx
Exit 0: three files / seven tests pass. Normal pretest guards pass.
Actual component mounted/unmounted twice via real R3F reconciler; four direct InstancedMesh methods retain prototype identity; mesh/geometry/material dispose events exactly once per cycle. Existing borrowed-cache and runtime-retention tests pass.

## Scope / limitations
- GPU driver is mocked; no actual browser/visual acceptance claimed.
- No build, deploy, direct Git command, env access/modification, remote Firebase access or dispatch. Normal mandated npm pretest runs its existing branch-check script.
- No model/tuning/graphics/stats/default changes; only component prop removed and one regression test added.
- Root/advisor remains responsible for build and actual browser QA.

## Source SHA256
ExpansionZombieInstanceLayer.jsx: 251332c4111a2d5fc0301dd634b10b042bd4f5f2ce56091b8b81be1e336d2420
ExpansionCleanup.test.jsx: 857b4c17686c3626afeed888848709e43f9a7557349f6c0e13f1493a9907e8ca

## Negative lesson
Do not pass dispose=null onto an owned InstancedMesh primitive: it overwrites its required method. Optional chaining would conceal loss of required cleanup rather than repair ownership.

Reviewer: Three_Mini technical self-review; root/advisor independent review pending

Redaction: PASS: only task/source paths, source hashes, aggregate test outcomes; no credentials/env/account data

Warning: RED emitted Multiple instances of Three.js being imported; GREEN emitted no Three warning.
