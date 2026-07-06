# Stage 2 Teacher Zombie Boss Visual

Date: 2026-07-06

## Direction

- Uses the provided 2D concept image as the visual direction.
- Adds a blocky middle-aged female teacher zombie boss for Stage 2.
- Keeps the existing three.js toon/outline style.
- Does not model separate face parts, glasses, brows, eyes, or mouth geometry.
- Uses `boss_02.webp` as the single face texture plane on the front face.
- Rebuilt the model around a square blue head, a fixed square face texture plane, black cap/side/back hair blocks, and a rear bun.
- The rebuilt visual uses a fresh Graphics Studio item key, `zombie-b02-teacher`, so old face decals or part transforms cannot visually override the new boss.
- The broken custom Stage 2 teacher boss model has been removed from production; the next teacher boss visual should be rebuilt from a clean part layout.
- Rebuilt the production visual as a low-poly teacher zombie: square blue face with `boss_02.webp`, black front/side/back hair blocks, rear bun, dark teacher suit, skirt, blue hands/legs, and black shoes.
- The face texture is attached to the head part like Matilda's face slot; it is not exposed as a separate texture-control part.
- Graphics Studio focus now treats the B02 face texture as display-only and selects the visible low-poly blocks around it. The front hair cap, side locks, side hair, back hair, and bun pieces each have their own thin neon contour when focused.
- The front hair cap was nudged forward slightly so the visual layer and click/focus layer match; clicking the visible cap focuses that cap, not the whole head.
- The latest B02 hairstyle uses only five rectangular forms: one top hair plate, left and right side plates, one back hair plate, and one rear bun block.
