# Onigiri Retarget and Rice Burst Fix - 2026-05-25

## Scope

- Fixed the onigiri projectile disappearing when its original target dies before impact.
- Replaced the flat white bounce flash with a scattered rice-grain burst.

## Root Cause

`OnigiiriProjectile` ended immediately when `target.rb._enemyDead` or `target.rb._enemyHit` became invalid. That meant a projectile in flight had no fallback path if the enemy selected at fire time died from another weapon.

The visual burst was also implemented as a single flat circle mesh, which did not match the onigiri fantasy or the existing scattered zombie death feedback style.

## Implementation

- Added `src/lib/onigiri.js`:
  - `pickNextOnigiriTarget` selects the nearest living enemy from the projectile position.
  - `createRiceBurstGrains` generates deterministic rice-grain scatter data.
  - `shouldShowRiceBurst` limits the rice burst to the final consumed bounce.
- Updated `src/components/Weapons/Onigiri.jsx`:
  - Dead or invalid target now retargets instead of expiring immediately.
  - Existing bounce chaining now reuses the same target selection helper.
  - `BounceFlash` was replaced with `RiceBurst`, using small toon rice grains with arc motion.
  - Rice burst is shown only when `bouncesRef.current` reaches 0 after a hit.
  - The dark grain outline mesh was removed because it read as a black smoke cloud in motion.

## Notes

- If no living enemy remains, the projectile still expires. This avoids a projectile flying forever with no valid gameplay target.
- The intentionally misspelled existing component/export name `Onigiiri` was preserved to avoid broad rename churn.
