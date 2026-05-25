# Umbrella Guard and Charge Warning Visual Fix - 2026-05-25

## Scope

- Reworked the umbrella guard model to follow the weapon icon more closely.
- Changed red zombie charge warning from a wide rectangle to a narrower arrow shape.

## Implementation

- `src/components/Weapons/UmbrellaGuard.jsx`
  - Replaced the purple cone-like umbrella with a yellow umbrella silhouette based on `11_wea_umb.png.png`.
  - Added dark ribs, blue shield ring, metal shaft, and curved yellow handle.
  - Cleaned up corrupted comments and the hidden `ribMat` declaration issue.
- `src/lib/vfxGeometry.js`
  - Added `getChargeWarningArrowConfig`.
  - Default charge warning width is now `0.35`, half of the previous `0.7`.
  - Shape points form a forward arrow head.
- `src/components/VFXLayer.jsx`
  - Replaced rectangular `planeGeometry` warning with `shapeGeometry`.

## Behavior

The red zombie warning now indicates both path and direction. The arrow tip points toward the charge destination.
