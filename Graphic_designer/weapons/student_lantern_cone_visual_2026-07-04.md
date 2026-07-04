# Student Lantern Cone Visual - 2026-07-04

Reference:
- User-provided screenshot: player shines a warm flashlight beam toward 12 o'clock.

Visual direction:
- Use a ground-projected widening cone, narrow near the player and broad at the far end.
- Keep the beam warm yellow with a brighter inner cone.
- Avoid a rectangular light box; the silhouette should read as a handheld lantern/flashlight cone.
- Fade the outer beam sides and far tip to 100% transparent so the effect does not look like a hard paper wedge.

Implementation:
- `StudentLantern.jsx` now renders two `shapeGeometry` cone meshes on the floor plane.
- The cone follows `playerFacing`, so 12 o'clock appears when the player faces upward.
- Follow-up: cone meshes now use shader materials with `smoothstep` alpha fade instead of uniform `meshBasicMaterial` opacity.
- Follow-up: cone meshes now start about 20px forward in the firing direction instead of directly at the player's body center.
