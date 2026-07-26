# threemini zombie-meter Pencil range routing trail — 2026-07-26

## Scope

- Profile: `threemini` graphics/spatial-unit review.
- Read-only. No code, Firebase, Graphics Studio, or browser state changed.

## Basis and finding

- E01 has `scale: 1.0` and uses the shared size multiplier `4/3` (`Enemy.jsx:77,214`). Its spawn/obstacle footprint is `enemySpawnRadius = 0.28 × scale × 4/3 = 0.3733`, so the effective occupied diameter is `0.7467` world units (`Enemies.jsx:144-149`).
- The proposed fixed reference `1zm = 0.75 world units` therefore matches the current E01 gameplay footprint closely. It is a spatial design unit, not a promise that every rendered mesh edge or raw cuboid dimension is exactly 0.75.
- Pencil eligibility definition is coherent: player-center circle, diameter `6zm = 4.5`, radius `3zm = 2.25`. It changes firing eligibility only; it requires no circle mesh, decal, HUD, or Studio item.

## Spatial contract

- `1zm` is permanently `0.75 world units`. Future E01 mesh, animation, outline, visual scale, collider implementation, or Firebase Studio tuning changes do not silently change Pencil's `zm` conversion.
- Eligibility is planar center distance from player center to enemy center, inclusive at `2.25`; it is not edge-to-edge distance and does not follow a visual silhouette.
- Any future request to redefine the meter is a separate design/balance decision with explicit approval, not an incidental consequence of a model change.

## Visual observations

1. At E01 center distance 2.24, Pencil may fire; at 2.26, it must not. At exactly 2.25, the inclusive boundary is eligible.
2. No range circle, ground ring, preview mesh, HUD marker, or other new graphic appears.
3. Rescaling/retexturing E01 without an approved meter change leaves the 2.25-world-unit threshold visually and mechanically stable.
4. Dense E01 formations at the threshold select targets by center point without apparent range oscillation from outlines or animation.
