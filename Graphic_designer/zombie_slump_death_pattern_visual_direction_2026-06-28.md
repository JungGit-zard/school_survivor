# Zombie Slump Death Pattern Visual Direction

## Summary

Added a new zombie death pattern where a weakly killed zombie briefly slumps down into a seated/collapsed pose and then fades away. This gives low-power kills a softer physical finish instead of always crumbling or exploding.

## Visual Intent

- The zombie should look like it loses strength and drops into place.
- Body and head move downward with a forward fold.
- Arms and legs stay close to the body instead of scattering far away.
- The effect remains 3D, toon-rendered, and outlined through the existing `EnemyDeathCollapse` body-part system.
- It must not look like a 2D sprite, flat placeholder, or generic dust puff.

## Pattern Placement

- Strong/explosive kills remain `scatter`.
- Medium kills remain `bodyCollapse`.
- Weak kills now mix between:
  - `crumble`: small in-place breaking motion.
  - `slump`: 털썩 주저앉고 사라지는 motion.

## Visual QA

- Graphics Studio preview was adjusted so `Enemy Death Collapse` can show the weak/slump death preview.
- Captured visual evidence:
  - `Quaility_Assurance/zombie_slump_death_pattern_graphics_studio_360ms_2026-06-28.png`
