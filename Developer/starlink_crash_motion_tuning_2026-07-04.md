# Starlink Crash Motion Tuning - 2026-07-04

## Request

- Broken Starlink fall speed is one third of the previous speed.
- The satellite falls while tilted 45 degrees and spinning around its own center.
- The crash target is the screen center at the moment the crash is triggered.
- The escaping Zomlonbisk is half size and moves at half speed.

## Implementation

- `CRASH_FALL_MS` changed from `900` to `2700`.
- Added `CRASH_TILT_RAD = Math.PI / 4` and use it for the crash pose tilt.
- The falling render wraps the satellite in a center-pivot group so the tilt/spin rotates around the model center.
- `ZOMLON_ESCAPE_SPEED` changed from `6.0` to `3.0`.
- Starlink crash spawning now uses `screenBounds` center instead of a random point near the player.
- The escaping Zomlonbisk render group uses `ZOMLON_ESCAPE_SCALE = 0.5`.

## Validation

- `npm test -- src/lib/starlinkCrash.test.js src/components/Weapons/Starlink.test.jsx`
