# Zombie Death Random All Styles QA

## Checks

- The death style pool has exactly the active 10 styles.
- The shuffled bag deals all 10 styles before repeating.
- Direction tests prove forward/backward/left/right falls have dominant, different axes.
- Pivot tests prove left/right falls use falling-side foot-tip pivots.
- Staged tests prove `proneSink` sinks after going prone.
- Graphics Studio plays `1/10 forwardFall` through `10/10 shatter5` in order.

## Result

- `npm test -- enemyDeathCollapse.test.js`: passed.
- `npm test`: passed, 65 files / 359 tests.
- `npm run build`: passed, with the existing large chunk warning.
- Playwright Graphics Studio check: passed.
- Screenshot: `Quaility_Assurance/graphics_studio_death_sequence_2026-07-01.png`
- Observed sequence:
  `1/10 forwardFall`, `2/10 backwardFall`, `3/10 leftFall`, `4/10 rightFall`,
  `5/10 proneSink`, `6/10 shatter1`, `7/10 shatter2`, `8/10 shatter3`,
  `9/10 shatter4`, `10/10 shatter5`, then repeats.
