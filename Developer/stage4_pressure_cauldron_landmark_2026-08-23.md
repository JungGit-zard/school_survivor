# Stage 4 Pressure Cauldron Landmark

## Must keep

- The canonical placement is `stage4-pressure-cauldron-center` at `[0, 0, 0]`.
- Runtime and Graphics Studio share `PressureCauldron.jsx` through the single Firebase Studio id `stage-object-pressure-cauldron`.
- The vessel, front step, and obstacle system remain blocking. Stage 4 starts at `[0, 0, 7]`; stages 1–3 retain `[0, 0, 0]`.
- User-mandated shrink is exactly `0.2` linear scale on the shared `PressureCauldron.jsx` visual root; canonical placement stays `[0, 0, 0]` and placement scale stays `1`.
- Collider parts follow the redesigned exact `0.2` envelope: vessel `[0, 0.36, 0]` / `[1.376, 0.592, 1.376]`, twin steps `[0, 0.056, 0.676]` / `[0.592, 0.112, 0.168]`, left cabinet `[-0.692, 0.29, 0.036]` / `[0.172, 0.436, 0.252]`, right auxiliary `[0.676, 0.184, -0.032]` / `[0.248, 0.276, 0.316]`, and handwheel `[0.636, 0.236, 0.408]` / `[0.168, 0.236, 0.184]` (position / size).
- Close-up concept redesign: retain the seven existing primary Studio group siblings in their original order; place the safety valve and latches inside vessel, and cabinet/housing inside side controls. The fixed `0.2` parent root inverse-compensates only the cauldron item Studio position so runtime and preview world transforms remain equal; default Studio behavior and saved part offsets remain unchanged.
- The current visual collider envelope has five parts for vessel, twin steps, left cabinet, right auxiliary housing, and handwheel. Its exact values are covered in `stageObjectColliders.test.js`.

## Never do

- Do not move the cauldron away from the exact center or reintroduce the four former center prep tables.
- Do not use the non-depth-writing Stage 4 surface material factory for this landmark.
