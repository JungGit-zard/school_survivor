# Compass Blade Five-Hit Explosion Validation

## Test Plan

- Verify the stack threshold constant is 5.
- Verify a pre-threshold hit keeps building stacks.
- Verify the fifth contact hit triggers an explosion, deals the existing multiplied damage, uses the existing one-tile radius, and resets the stack.

## Result

- `npm.cmd test -- --run src/components/Weapons/CompassBlade.test.jsx`
  - Passed: 1 test file, 4 tests.
- `npm.cmd test -- --run`
  - Passed: 23 test files, 149 tests.
- `npm.cmd run build`
  - Passed.
  - Vite still reports the existing large chunk warning after minification.

## Notes

- The fifth contact hit now triggers the explosion and resets the stack to 0.
- Hits 1 through 4 remain stack-building hits.
