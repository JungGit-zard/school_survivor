# Internal Gameplay 500 Run Stress

## Scope

- Ran 500 internal gameplay state simulations.
- Covered 9 movement inputs: idle plus 8 directions.
- Alternated Stage 1 and Stage 2.
- Exercised elapsed time, survival milestone gold, picked-up gold, XP gain, level-up upgrade application, kill counts, player damage, gameover, clear, reset, and run record snapshot paths.
- Cycled through every key in `UPGRADE_EFFECTS`.

## Added Check

- `Developer/r3f_prototype/src/store/useGameStore.500runStress.test.js`

## Result

- `npm test -- src/store/useGameStore.500runStress.test.js`: passed, 1 file / 1 test, 500 simulated runs.
- `npm test`: passed, 67 files / 369 tests.
- `npm run build`: passed, with the existing large chunk warning.

## Limits

- This is an internal store/state stress run, not 500 real-time rendered browser playthroughs.
- It does not visually inspect canvas rendering, animation clipping, audio, or live device touch behavior.
- It is useful for catching broken gameplay state transitions and reward/record regressions.
