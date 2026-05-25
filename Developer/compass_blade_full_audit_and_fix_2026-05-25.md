# Compass Blade Full Audit And Fix - 2026-05-25

## Request

- Audit all code implemented as `compassBlade` / 나침반 칼날.
- Rebuild the in-game 3D graphic from the connected icon source art.
- Fix the current in-game manifestation bug.
- Use three or more agents.

## Agents Used

- `agent-room-executor`: routing and methodology gate.
- `code-mapper`: full connection map from unlock to in-game hit flow.
- `reviewer`: correctness/code review findings.
- `game-developer`: gameplay bug analysis.
- `graphic_designer`: source-art-to-3D visual direction.
- `qa-expert`: QA plan and verification risks.

## Code Touchpoints Audited

- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/lib/weaponUnlocks.js`
- `Developer/r3f_prototype/src/lib/upgrades.js`
- `Developer/r3f_prototype/src/store/useGameStore.js`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/Game.jsx`
- `Developer/r3f_prototype/src/components/Weapons/index.js`
- `Developer/r3f_prototype/src/components/Weapons/CompassBlade.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/lib/refs.js`

## Root Causes Found

1. Visual position was applied twice.
   - The `RigidBody` was moved to the orbit world position.
   - Its child visual group was also set to the same world position.
   - Because child transforms are local to the parent, this could make the visual blade appear separated from the hit body.

2. Rotation update was effectively broken in the old source.
   - The `rotation.set(...)` call was attached to a damaged comment line in the inspected source.
   - This could stop the blade from facing its orbit direction.

3. Multi-blade overlap bookkeeping was incomplete.
   - Old code stored one `enemyId -> hitFn` entry.
   - When two or three blades touched the same enemy, one exit could delete the enemy while another blade was still overlapping.

4. The 3D graphic did not match the source icon.
   - Old model was mostly a thin box and small handle.
   - It did not express the source icon's V-shaped compass, red hinge, metal legs, screws, or orange slash trail.

## Implemented Fix

- Added `src/lib/compassBlade.js`.
  - Provides `getCompassBladeOrbitPose`.
  - Collider and visual model now share one pose calculation.
- Rebuilt `CompassBlade.jsx`.
  - Separates hit bodies from visual groups, matching the safer `TumblerOrbit` pattern.
  - Applies world position once to collider and once to independent visual group.
  - Restores orbit-aligned visual rotation.
  - Adds `overlapCountRef` for multi-blade enemy contact.
  - Replaces the box placeholder with a toon 3D compass:
    - two opened compass legs,
    - asymmetric main blade and support leg,
    - red circular hinge,
    - gold screw accents,
    - orange arc trail.
- Added `CompassBlade.test.jsx`.
  - Covers shared orbit pose calculation and even spacing.

## Remaining Design Risk

- Planner says Lv.5 target is damage 15, 3 blades, radius 1.45.
- Current upgrade table still has only `compassBladeDamage` and `compassBladeCount`.
- That means Lv.5 target contract is not fully reachable through existing card choices.
- This is a balance/progression contract issue and should be handled with a separate Planner-backed upgrade contract pass.

