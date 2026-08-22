# Stage 4 floor tile quarter-area implementation

- Kanban: `escape-zombie-school` / `t_f846db84` / `threemini`
- Source of truth: `Developer/r3f_prototype/src/components/ClassroomFloor.jsx`
- Stage 4 only: cached cafeteria tile source keeps the same floor plane and changes `repeat` from `12` to `24` through `STAGE4_TILE_FREQUENCY_MULTIPLIER = 2`.
- Mathematical contract: linear scale `0.5`; apparent tile area ratio `0.5 * 0.5 = 0.25`.
- No Firebase, Studio, title, audio, assets, camera, obstacle, character, Stage 1~3, or dev-server changes.

## Performance contract

The implementation remains one `FloorPlane`, one material, and one loader-cached tile source. UV repetition only changes sampling frequency: no per-tile allocation, draw-call increase, geometry increase, material increase, or texture-memory increase.

## Tests

- RED: focused ClassroomFloor test failed before source change because `STAGE4_TILE_LINEAR_SCALE` was undefined.
- GREEN: `npm test -- --run src/components/ClassroomFloor.test.jsx` passed: 1 file, 8 tests.
