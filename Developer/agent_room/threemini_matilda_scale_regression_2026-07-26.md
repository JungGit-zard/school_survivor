# threemini Matilda scale regression routing trail — 2026-07-26

## Routing

- Profile: `threemini` (graphics/runtime visual regression diagnosis).
- Scope: Matilda runtime scale only; no Firebase read/write and no Studio value change.

## Finding and resolution

- Cause: commit `b475334` passed Matilda's runtime `statOverride.scale = 3.0` to `EnemyVisual`. The prior visual path used `ENEMY_STATS.B01.scale = 2.0`, so the body became `3.0 / 2.0 = 1.5` times larger.
- Final fix: `Enemies.jsx` keeps the visual runtime scale at `ENEMY_STATS.B01.scale = 2.0`, matching the collider scale. HP and damage remain x3; speed remains x1.4.
- Unchanged: `MatildaMesh`, Firebase, and Graphics Studio tuning values.

## Validation boundary

- Focused 99 tests and the build passed.
- No live Firebase Graphics Studio visual test was run.
