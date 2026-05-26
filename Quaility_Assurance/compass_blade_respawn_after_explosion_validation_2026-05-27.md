# Compass Blade Respawn After Explosion Validation

## Test Plan

- Verify the respawn duration constant is 5000ms.
- Verify an explosion produces a respawn-until timestamp exactly 5 seconds later.
- Verify non-explosion hits do not start a respawn.
- Run focused compass blade tests.
- Run the full test suite and build.

## Result

- `npm.cmd test -- --run src/components/Weapons/CompassBlade.test.jsx`
  - Passed: 1 test file, 5 tests.
- `npm.cmd test -- --run`
  - Passed: 23 test files, 150 tests.
- `npm.cmd run build`
  - Passed.
  - Vite still reports the existing large chunk warning after minification.

## Notes

- The respawn helper confirms explosion starts a 5000ms respawn window.
- Non-explosion hits return 0 and do not start respawn timing.
- Build validation confirms the conditional sensor/visual rendering compiles.
