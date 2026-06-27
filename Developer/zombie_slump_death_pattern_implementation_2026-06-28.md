# Zombie Slump Death Pattern Implementation

## Scope

Changed code:

- `Developer/r3f_prototype/src/lib/enemyDeathCollapse.js`
- `Developer/r3f_prototype/src/lib/enemyDeathCollapse.test.js`
- `Developer/r3f_prototype/src/components/EnemyDeathCollapse.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`

## Implementation

- Added `slump` to `ENEMY_DEATH_COLLAPSE_STYLES`.
- Added `WEAK_COLLAPSE_STYLES = ['crumble', 'slump']`.
- Added `pickWeakCollapseStyle`.
- Updated `collapseStyleForIntensity(intensity, seed)` so weak deaths can deterministically choose `crumble` or `slump` by enemy ID/position seed.
- Added `createSlumpMotion`:
  - low horizontal spread,
  - downward velocity,
  - per-part settle height,
  - stronger damping so parts sit into place instead of flying away.
- Updated `EnemyDeathCollapse` to pass its deterministic style seed into `collapseStyleForIntensity`.
- Updated Graphics Studio enemy death preview to use a deterministic weak/slump preview.

## Behavior

- Existing strong scatter and medium body collapse behavior is preserved.
- Weak kills now gain variety without adding random frame-to-frame instability.
- The effect still uses the existing toon material, outline material, and body-part geometry.
