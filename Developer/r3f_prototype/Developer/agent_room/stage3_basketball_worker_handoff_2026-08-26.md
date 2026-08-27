# Stage 3 South Basketball Hoop/Ball Worker Handoff — 2026-08-26

Task: `t_2355f0f6` — implement: replace Stage 3 south basketball hoop and ball visual
Workspace: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype`

## Implemented

- Replaced the Stage 3 south hoop placement id `stage3-hoop-south-damaged` with `stage3-hoop-south-playful` in `src/components/StageObjects/stageObjectPlacements.js`.
- Moved the south hoop inward from `z=17.0` to `z=16.0` to reduce 6-o'clock edge clipping risk on mobile.
- Removed the south hoop's `damaged: true` prop and uses `playful: true` instead.
- Updated `src/components/StageObjects/GymProps.jsx` so `BasketballHoop` supports a bright/cute `playful` mode:
  - brighter blue/orange/cream palette;
  - fuller octagonal rim silhouette instead of only four rectangular rim bars;
  - added more net cords for readability;
  - added red pad/white target detail;
  - added two low-poly basketballs near the base so the south fixture reads as a hoop/ball set, not a broken horror prop.
- Updated the Stage 3 placement test in `src/components/StageObjects/stageObjectPlacements.test.js` to assert the south hoop uses the playful prop, keeps the south-facing rotation, and does not carry `damaged`.

## Files touched for this task

- `src/components/StageObjects/GymProps.jsx`
- `src/components/StageObjects/stageObjectPlacements.js`
- `src/components/StageObjects/stageObjectPlacements.test.js`
- `Developer/agent_room/stage3_basketball_worker_handoff_2026-08-26.md`

Note: the shared worktree also contains unrelated pre-existing/concurrent edits in Stage 4 kitchen layout/lighting/pickup files. I did not include those as part of this Stage 3 basketball handoff.

## Verification run

Focused Stage 3 placement test:

```bash
npm test -- --run src/components/StageObjects/stageObjectPlacements.test.js -t "Stage 3"
```

Result:

- PASS — 1 test file passed.
- 3 Stage 3 tests passed, 32 tests skipped by the filter.

Production build:

```bash
npm run build
```

Result:

- PASS — prebuild gates passed:
  - branch guard OK on `zombie_only`;
  - Firebase release env gate PASS;
  - legacy B02 source gate PASS;
  - dialogue store gate PASS;
  - studio-game sync source contract PASS;
  - studio-game sync Vitest suite PASS: 4 files, 41 tests.
- PASS — Vite production build completed.
- PASS — postbuild gates passed:
  - legacy B02 artifact gate PASS for `dist`;
  - hosting JavaScript asset verification PASS, 59 assets checked.

Non-blocking build/test warnings observed:

- Existing React test `act(...)` warnings in Firebase/bootstrap/studio tests.
- Existing Three.js multiple import warning in `GraphicsStudio.immediate.test.jsx`.
- Vite chunk-size warnings and ineffective dynamic import warnings for weapon catalog/unlocks.

## Visual intent check

The implemented south hoop intentionally avoids the old broken/damaged horror read. It should now read as a bright toy-like gym hoop with balls: orange rim, cream net, blue/red padded stand/backboard, and two visible low-poly basketballs. The silhouette still uses multiple blocky parts to stay consistent with the mobile-readable low-poly/blocky art direction while avoiding a generic stacked-box look.


## Hana follow-up — rounded rim polish
- South hoop remains `stage3-hoop-south-playful` at `[0, 0, 16.0]` facing north.
- `GymProps.jsx` now uses a single low-segment `<torusGeometry args={[0.38, 0.045, 6, 18]} />` for non-damaged hoop rims.
- Purpose: satisfy the concept requirement for a thick rounded orange rim while keeping the old box-segment rim only for damaged/non-playful fallback.
- Test updated: `stageObjectAssets.test.jsx` allows exactly one torusGeometry in Stage 3 gym props and keeps low-poly balls as icosahedrons.
