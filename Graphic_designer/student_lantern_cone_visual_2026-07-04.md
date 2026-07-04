# Student Lantern Cone Visual - 2026-07-04

Reference:
- User-provided screenshot: player shines a warm flashlight beam toward 12 o'clock.

Visual direction:
- Use a ground-projected widening cone, narrow near the player and broad at the far end.
- Keep the beam warm yellow with a brighter inner cone.
- Avoid a rectangular light box; the silhouette should read as a handheld lantern/flashlight cone.

Implementation:
- `StudentLantern.jsx` now renders two `shapeGeometry` cone meshes on the floor plane.
- The cone follows `playerFacing`, so 12 o'clock appears when the player faces upward.
