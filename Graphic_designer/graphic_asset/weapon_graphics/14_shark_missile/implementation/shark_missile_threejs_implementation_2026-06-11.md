# Shark Missile Three.js Implementation - 2026-06-11

## Reference

- Primary 2D concept: `concept/shark_missile_extreme_lowpoly_concept_2026-06-09.png`
- Runtime icon: `Developer/r3f_prototype/src/assets/weapon_icon/14_wea_shark_missile.svg`

## Visual Direction

- Low-poly shark-shaped missile.
- Blue block body, cream jaw, simple white teeth, black eye accent.
- Dark engine cap with yellow hazard stripes.
- Orange triangular flame trail.
- Toon materials and black outline treatment match the current classroom/weapon style.

## Runtime Asset Structure

- The in-game model is procedural three.js geometry in `SharkMissile.jsx`.
- The graphics archive keeps the 2D concept images and copied `original_icon.png` reference.
- Future refinement should preserve the readable shark head, dorsal fin, and engine flame silhouette at the game camera distance.
