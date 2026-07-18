# Compass Blade Five-Hit Explosion Implementation

## Scope

- Updated the compass blade hit-stack threshold from 10 enemy contact hits to 5.
- Kept the existing explosion damage multiplier and one-tile radius behavior.

## Files

- `Developer/r3f_prototype/src/lib/compassBlade.js`
  - Set `COMPASS_BLADE_STACKS_TO_EXPLODE` to `5`.
- `Developer/r3f_prototype/src/components/Weapons/CompassBlade.test.jsx`
  - Updated the explosion test wording from tenth hit to fifth hit.
  - Added an explicit threshold assertion so the requested 5-hit rule is covered by tests.

## Behavior

- Hits 1 through 4 build stacks without exploding.
- Hit 5 triggers the explosion and resets the stack to 0.
