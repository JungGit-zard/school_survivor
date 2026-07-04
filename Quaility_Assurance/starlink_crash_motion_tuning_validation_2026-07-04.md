# Starlink Crash Motion Tuning Validation - 2026-07-04

## Checked

- Fall duration is tested as `2700ms`.
- Crash pose tilt is tested as `Math.PI / 4`.
- Default Zomlonbisk escape speed is tested as `3 units/sec`.
- Starlink weapon source is tested to spawn crashes at the screen center.
- Starlink crash sequence source is tested to apply half-size Zomlonbisk scaling.
- Starlink crash sequence source is tested to use a satellite center-pivot wrapper.

## Command

```powershell
npm test -- src/lib/starlinkCrash.test.js src/components/Weapons/Starlink.test.jsx
```

## Result

- Passed: 2 test files, 18 tests.
