# Graphics Studio Model Transform Apply Visual Note - 2026-07-04

## Visual Control Added

- Graphics Studio now exposes model-level controls for:
  - overall scale
  - width X
  - height Y
  - depth Z
  - base rotation X/Y/Z
- Apply stores these values and the game runtime reuses them for the corresponding real game model.

## Visual Boundary

- The transform is applied to model visuals, not gameplay colliders or weapon damage ranges.
- Pickup sparkles and broad VFX remain outside model scaling unless the catalog item itself is the visual effect model.
