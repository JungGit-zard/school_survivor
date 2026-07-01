# Zombie Death Random All Styles QA

## Checks

- The death style pool has exactly the requested 11 styles.
- The shuffled bag deals all 11 styles before repeating.
- Direction tests prove forward/backward/left/right falls have dominant, different axes.
- Pivot tests prove left/right falls use falling-side foot-tip pivots.
- Backstep tests prove leg and foot parts use a fast walk cycle.
- Staged tests prove `backstepFall` has 3 steps and `proneSink` sinks after going prone.
- Graphics Studio plays `1/11 forwardFall` through `11/11 shatter5` in order.

## Result

- `npm test -- enemyDeathCollapse.test.js`: passed.
- `npm test`: passed, 65 files / 358 tests.
- `npm run build`: passed, with the existing large chunk warning.
- Playwright Graphics Studio check: passed.
- Screenshot: `Quaility_Assurance/graphics_studio_death_sequence_2026-07-01.png`
- Observed sequence:
  `1/11 forwardFall`, `2/11 backwardFall`, `3/11 leftFall`, `4/11 rightFall`,
  `5/11 backstepFall`, `6/11 proneSink`, `7/11 shatter1`, `8/11 shatter2`,
  `9/11 shatter3`, `10/11 shatter4`, `11/11 shatter5`, then repeats.
