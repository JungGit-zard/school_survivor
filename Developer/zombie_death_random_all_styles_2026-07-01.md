# Zombie Death Random All Styles

## Implementation

- `ENEMY_DEATH_COLLAPSE_STYLES` now matches the requested 11 styles exactly.
- Runtime death selection uses a shuffled bag, so repeated kills visibly cycle through varied deaths.
- `EnemyDeathCollapse` supports `styleOverride` only for Graphics Studio inspection; gameplay still uses the random bag.
- `forwardFall`, `backwardFall`, `leftFall`, and `rightFall` now use stronger dominant direction and rotation values.
- `leftFall` and `rightFall` now use a `sidePivot` renderer path around the falling-side foot tip.
- `backstepFall` uses a staged renderer path: 3 backward steps, then fall and fade.
- `backstepFall` leg and foot parts now swing on a fast walk cycle during the three steps.
- `proneSink` uses a staged renderer path: prone pose, then sink down and fade.

## Verification

- `npm test -- enemyDeathCollapse.test.js`: passed.
- `npm test`: passed, 65 files / 356 tests.
- `npm run build`: passed.
- Graphics Studio browser check confirmed `1/11 forwardFall` through `11/11 shatter5`.
