# Stage 3 Run Zombie Crew — subagent routing note (2026-07-17)

## User request
Add a voxel/low-poly casual-tone **Run Zombie** crew to Stage 3.

Reference concept:
- Enemy type: melee / swarm.
- Behavior: chases/crosses the player in a run; appears suddenly and cuts across the screen diagonally.
- Crew size: 1 leader + about 12 running crew zombies.
- Leader: purple sports outfit, headband, medal, bib `001`, taller/distinct.
- Crew: white/blue sports outfit, headband/wristbands/shoes, bib `013`, simple uniform.

## Routing expectations
For future follow-up work on this feature:
- **levelmini / balanceqa**: tune Stage 3 timing, crew count, damage pressure, and diagonal path readability.
- **threemini / graphicmini**: preserve voxel/low-poly toy proportions; improve headband, medal, bib readability if needed.
- **soundmini**: add dedicated running-footstep / crowd-rush cue if requested.
- **uimini**: add HUD/telegraph only if the sudden crossing feels unfair in playtest.
- **backendmini**: no backend involvement expected unless analytics/event logging is requested.

## Implementation target
Runtime source of truth should stay in:
- `Developer/r3f_prototype/src/lib/burstEvents.js` for Stage 3 burst timing.
- `Developer/r3f_prototype/src/components/Enemies.jsx` for formation placement and crew spawn data.
- `Developer/r3f_prototype/src/components/Enemy.jsx` for special cross-screen running movement.
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx` for leader/crew voxel visuals.

## Verification
Minimum gate:
- Unit tests for Stage 3 burst data and run-crew formation geometry.
- Enemy visual/source tests for leader/crew stats and mesh parts.
- `npm run build` or equivalent production build if the repo state allows.

## 2026-08-22 Formation correction
- Stage 3 crew remains one RZL leader plus six RZC followers; its event timing, HP, types, random stream consumption, and diagonal runtime direction stay unchanged.
- `createRunZombieCrewEntries` now places followers in the leader-local coordinates below. `behind` is positive opposite `RUN_ZOMBIE_CREW_DIR`; `side` is positive to its perpendicular right.

| Row | Followers | behind | side |
| --- | --- | ---: | --- |
| 1 | 3 | 1.15 | -0.72, 0, +0.72 |
| 2 | 3 | 2.20 | -0.72, 0, +0.72 |

- `Enemies.test.jsx` verifies every follower is behind the leader, rows are exactly 3+3, sides are symmetric, and no local coordinate is duplicated.
- Verification commands run from `Developer/r3f_prototype`: `npm run test -- src/components/Enemies.test.jsx -t "stage3 run zombie crew"`, `npm run test -- src/components/Enemies.test.jsx -t "formation spawns"`, and `npm run test -- src/components/Enemies.test.jsx`; final result was 109/109 tests passed, with branch guard, legacy B02 gate, dialogue store gate, and Studio-game sync contract passing in pretest.
