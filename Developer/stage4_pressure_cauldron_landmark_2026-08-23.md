# Stage 4 Pressure Cauldron Landmark

## Must keep

- The canonical placement is `stage4-pressure-cauldron-center` at `[0, 0, 0]`.
- Runtime and Graphics Studio share `PressureCauldron.jsx` through the single Firebase Studio id `stage-object-pressure-cauldron`.
- The vessel, front step, and obstacle system remain blocking. Stage 4 starts at `[0, 0, 7]`; stages 1–3 retain `[0, 0, 0]`.
- User-mandated shrink is exactly `0.2` linear scale on the shared `PressureCauldron.jsx` visual root; canonical placement stays `[0, 0, 0]` and placement scale stays `1`.
- Collider parts are scaled to the same exact `0.2` dimensions: vessel position `[0, 0.34, 0]`, size `[1.144, 0.68, 1.144]`; front step position `[0, 0.054, 0.646]`, size `[0.44, 0.108, 0.144]`.

## Never do

- Do not move the cauldron away from the exact center or reintroduce the four former center prep tables.
- Do not use the non-depth-writing Stage 4 surface material factory for this landmark.
