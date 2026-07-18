# Compass Blade Respawn After Explosion Implementation

## Scope

- Added a 5-second respawn window after compass blade explosion.
- Kept the existing 5-hit explosion threshold, damage multiplier, explosion radius, and explosion visual.

## Files

- `Developer/r3f_prototype/src/lib/compassBlade.js`
  - Added `COMPASS_BLADE_RESPAWN_MS = 5000`.
  - Added `getCompassBladeRespawnUntilMs`.
- `Developer/r3f_prototype/src/components/Weapons/CompassBlade.jsx`
  - Added respawn state and a respawn-until timestamp.
  - Clears tracked enemy overlap state on explosion.
  - Hides blade visuals and hit sensors while respawning.
- `Developer/r3f_prototype/src/components/Weapons/CompassBlade.test.jsx`
  - Added coverage for the 5-second respawn timing helper.

## Behavior

- Explosion starts the respawn timer.
- During respawn, the compass blade cannot hit enemies because the hit sensor is not rendered.
- After 5 seconds, normal orbit and hit behavior resume.
