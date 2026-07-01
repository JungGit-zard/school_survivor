# Zombie Death Random All Styles

## Implementation

- `ENEMY_DEATH_COLLAPSE_STYLES` now uses the active 10 styles after removing the backward-walk death.
- Runtime death selection uses a shuffled bag, so repeated kills visibly cycle through varied deaths.
- `EnemyDeathCollapse` supports `styleOverride` only for Graphics Studio inspection; gameplay still uses the random bag.
- `forwardFall`, `backwardFall`, `leftFall`, and `rightFall` now use stronger dominant direction and rotation values.
- `leftFall` and `rightFall` now use a `sidePivot` renderer path around the falling-side foot tip.
- `proneSink` uses a staged renderer path: prone pose, then sink down and fade.

## Verification

- `npm test -- enemyDeathCollapse.test.js`: passed.
- `npm test`: passed, 65 files / 356 tests.
- `npm run build`: passed.
- Graphics Studio browser check confirmed `1/10 forwardFall` through `10/10 shatter5`.
