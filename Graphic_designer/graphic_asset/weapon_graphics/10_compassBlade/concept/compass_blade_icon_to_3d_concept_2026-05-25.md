# Compass Blade Icon To 3D Concept - 2026-05-25

## Source Art

- Source image: `Developer/r3f_prototype/src/assets/weapon_icon/10_wea_compass.png.png`
- The icon shows a school compass tool turned into a spinning blade weapon.

## 2D Source Interpretation

- Main silhouette:
  - Two dark blue metal compass legs opened in a V shape.
  - A red circular hinge at the top center.
  - One sharp metal needle/blade tip.
  - Small gold screw accents on the legs.
  - Bright orange slash trail behind the compass, implying fast orbiting motion.

## 3D Rebuild Direction

- Build as a readable low-poly/toon 3D prop, not as a flat 2D sprite.
- Use `MeshToonMaterial` through the project `toonMat` helper.
- Use inverted-hull outlines through the project `outlineMat` + `inflateScale` helpers.
- Keep the model centered locally at the weapon hitbox origin, so the visual and collider can share one world pose.
- The model should rotate around the player as a single compass-blade object.

## 3D Parts

- Center hinge:
  - Red circular hub with dark outline.
  - Small blue outer cap behind the red center.
- Compass legs:
  - Two slim dark blue arms opened diagonally.
  - Metal/steel lower tips.
  - Gold screw dots on each arm.
- Blade/needle:
  - One longer silver needle tip pointing forward.
  - The second leg remains a support arm so the object still reads as a compass.
- Motion trail:
  - A subtle orange/yellow curved arc behind the compass.
  - It must be visual only, not a debug ring or targeting marker.

## Do Not Do

- Do not use a plain rectangular box as the final compass blade.
- Do not show debug circles or aim markers around the player.
- Do not separate the visual model from the actual hitbox position.
- Do not use realistic PBR styling; keep toon shading and outlines.

