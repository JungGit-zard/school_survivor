# Stage 4 floor tile exact square-world WebP implementation

- Kanban: `escape-zombie-school` / `t_f846db84`, `t_3b4d3c08`, `t_f8aa2c93` / `threemini`
- Source of truth: `Developer/r3f_prototype/src/components/ClassroomFloor.jsx`
- Stage 4 only: the old multi-cell cafeteria image is not used. The floor imports only `Developer/r3f_prototype/src/assets/background_floor/tile_stage04_white_ceramic.webp`.
- Exact square-world contract: target tile world size is `28.8 / 24 = 1.2` world units. Therefore `repeatX = 28.8 / 1.2 = 24` and `repeatZ = 32 / 1.2 = 26.6666666667`.
- Scale contract retained: exact-bounds base tile world size `2.4`; linear scale `0.5`; visible tile area ratio `0.25`.
- Scope exclusions: Firebase, Studio, title, audio, props, cauldron, camera, obstacles, characters, Stage 1, Stage 2, and Stage 3 were not intentionally changed.

## Stage 1 square-world mapping method reused

- Stage 4 now derives repeat per axis from floor dimension divided by target world tile size, matching the Stage 1-style per-axis mapping principle instead of stretching one repeat value across a rectangular arena.
- Stage 4 combat floor bounds remain `28.8 × 32` from `getStageBounds('stage4')`.
- The 1254 × 1254 source remains a single tile source; rectangular Stage 4 bounds are handled by UV repeat (`repeatX = 24`, `repeatZ = 26.6666666667`) so the displayed tile stays square in world units.

## WebP asset verification

- PRE verification before PNG removal: `tile_stage04_white_ceramic.png` existed at `1254 × 1254`, RGB, `1,142,849` bytes; `tile_stage04_white_ceramic.webp` existed at `1254 × 1254`, RGB, `780,700` bytes.
- Final project asset tree keeps only `tile_stage04_white_ceramic.webp` for this Stage 4 ceramic source.
- Python Pillow metadata verification after removal confirmed WebP format `WEBP`, size `(1254, 1254)`, mode `RGB`, file size `780,700` bytes.
- Thin grout visual quality was checked by direct image inspection of the WebP source; no PNG runtime/import path remains.

## Performance contract

The implementation remains one `FloorPlane`, one material, and one loader-cached tile source. UV repetition only changes sampling frequency: no per-tile allocation, draw-call increase, geometry increase, material increase, or texture-memory increase.

## Tests

- RED attempt: added a WebP-only asset-tree assertion before finalizing source cleanup; by the time the focused run executed, the project PNG was already absent and the assertion passed. The prior failing state was the card's correction target: Stage 4 used equal 24×24 rectangular repeats, making Z tile size `32 / 24 = 1.333…` instead of the required square-world `1.2`.
- GREEN: `npm test -- --run src/components/ClassroomFloor.test.jsx` passed: 1 file, 9 tests.
