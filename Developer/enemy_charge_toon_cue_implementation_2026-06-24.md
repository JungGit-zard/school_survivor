# Enemy charge 3D/toon cue implementation

Date: 2026-06-24
Tasks: `t_0c51a730`, `t_2ac3d69d`
Role: Three_Mini / technical implementation

## Summary

Replaced the previous `go!` HTML sprite speech bubble in `Developer/r3f_prototype/src/components/Enemy.jsx` with an in-world 3D/toon charge cue rendered as mesh geometry.

The new cue appears only while a charger enemy is in `animPhase === 'warn'`, preserving the existing E05/B01 charge warning state and the floor-direction readability supplied by `ChargeWarningLine`.

## Implementation details

Changed file:

- `Developer/r3f_prototype/src/components/Enemy.jsx`

Technical changes:

- Removed `Html` usage from `@react-three/drei` for the charge cue.
- Added exported `CHARGE_CUE_LAYOUT` for focused regression coverage.
- Added `ChargeToonCue`, composed from Three.js mesh geometry:
  - a yellow toon exclamation mark body,
  - a red toon dot,
  - two orange toon chevrons,
  - inverted-hull style outline materials through the existing toon helpers.
- The cue uses `toonMat`, `outlineMat`, and `inflateScale` so it stays in the same 3D cartoon rendering language as the enemy visuals.
- Kept the cue scoped to `stats.charger && animPhase === 'warn'`, so normal gameplay does not show a persistent proxy marker.

Added focused test:

- `Developer/r3f_prototype/src/components/EnemyVisual.test.js`

Test coverage:

- Guards that E05 and B01 remain charger enemies.
- Guards the 3D cue layout has visible mark/dot/chevron pieces.
- Guards that the old `<Html>`/`GoSpeechBubble`/`go!` sprite cue is not reintroduced.

## Verification

Focused tests:

```text
npm test -- src/components/EnemyVisual.test.js src/components/PlayerMesh.test.js src/lib/vfxGeometry.test.js

Test Files  3 passed (3)
Tests       5 passed (5)
```

Build:

```text
npm run build

✓ 710 modules transformed.
✓ built in 864ms
```

Known build warning:

- Existing Vite chunk-size warning remains for the large app bundle. This is not introduced by the cue change.

Browser visual check:

- Dev server: `http://127.0.0.1:5192/graphics-studio`
- Checked `Zombie E05` with Motion `warn`: 3D/toon cue appears above the zombie and remains visible in the preview.
- Checked `Zombie B01` with Motion `warn`: 3D/toon cue appears above the boss and stays within the preview after lowering cue height to `CHARGE_CUE_LAYOUT.y = 1.75`.
- Browser console after visual check: `total_errors=0`, no JS errors captured.

Additional recheck for `t_2ac3d69d`:

```text
npm test -- src/components/EnemyVisual.test.js src/components/EnemyProjectileVisual.test.js

Test Files  1 passed (1)
Tests       2 passed (2)
Duration    1.50s
```

```text
npm run build

✓ 710 modules transformed.
✓ built in 742ms
```

Browser recheck for `t_2ac3d69d`:

- Dev server: `http://127.0.0.1:5197/graphics-studio`
- Checked `Zombie E05` with Motion `warn`: no HTML `go!` bubble visible; 3D/toon warning cue visible above the zombie.
- Browser console after recheck: `total_errors=0`; only Vite/React DevTools info/debug messages.

## Policy notes

- No 2D sprite/image-plane substitute was added for player or monsters.
- The new cue is a short-lived charge warning VFX, not a monster substitute or debug proxy shape.
- Character/monster rendering remains 3D toon/outline based.
- No commit was made.
