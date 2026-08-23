# Stage 4 Pressure Cauldron Landmark

## Must keep

- The canonical placement is `stage4-pressure-cauldron-center` at `[0, 0, 0]`.
- Runtime and Graphics Studio share `PressureCauldron.jsx` through the single Firebase Studio id `stage-object-pressure-cauldron`.
- The vessel, front step, and obstacle system remain blocking. Stage 4 starts at `[0, 0, 7]`; stages 1–3 retain `[0, 0, 0]`.
- User-mandated enlargement is exactly `0.4` linear scale on the shared `PressureCauldron.jsx` visual root; canonical placement stays `[0, 0, 0]` and placement scale stays `1`.
- Collider parts follow the redesigned exact `0.4` envelope: vessel `[0, 0.72, 0]` / `[2.752, 1.184, 2.752]`, twin steps `[0, 0.112, 1.352]` / `[1.184, 0.224, 0.336]`, left cabinet `[-1.384, 0.58, 0.072]` / `[0.344, 0.872, 0.504]`, right auxiliary `[1.352, 0.368, -0.064]` / `[0.496, 0.552, 0.632]`, and handwheel `[1.272, 0.472, 0.816]` / `[0.336, 0.472, 0.368]` (position / size).
- Close-up concept redesign: retain the seven existing primary Studio group siblings in their original order; place the safety valve and latches inside vessel, and cabinet/housing inside side controls. The fixed `0.4` parent root inverse-compensates only the cauldron item Studio position so runtime and preview world transforms remain equal; default Studio behavior and saved part offsets remain unchanged.
- Stage 4 only: elapsed 12.0–15.0 seconds in each 15-second cycle renders opaque rising three-puff smoke and deterministic local shiver; exactly 15/30/45… seconds causes a 250ms local burst ring. The Game fixed-step clock applies one `maxHp * 0.20` hit within horizontal radius `3.2`, bypassing only the normal contact-invulnerability gate with source `stage4PressureCauldron`.
- The current visual collider envelope has five parts for vessel, twin steps, left cabinet, right auxiliary housing, and handwheel. Its exact values are covered in `stageObjectColliders.test.js`.

## Never do

- Do not move the cauldron away from the exact center or reintroduce the four former center prep tables.
- Do not use the non-depth-writing Stage 4 surface material factory for this landmark.
