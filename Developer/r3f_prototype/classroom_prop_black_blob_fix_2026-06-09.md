# Classroom Prop Black Blob Fix

Date: 2026-06-09

## Files Changed

- `src/components/StageObjects/propRendering.js`
- `src/components/StageObjects/ClassroomDesk.jsx`
- `src/components/StageObjects/ClassroomChair.jsx`
- `src/components/StageObjects/UnconsciousStudent.jsx`
- `src/components/StageObjects/stageObjectAssets.test.jsx`

## Root Cause

The black area around classroom props had two contributing render paths.

First, the StageObject mesh pieces used `castShadow receiveShadow`. Since the app enables canvas shadows, the main directional light casts shadows, and the classroom floor receives shadows, the props projected dark blocky shapes onto the floor.

Second, StageObject outline meshes used the global `inflateScale()` helper. That helper is unsuitable for thin prop pieces because values below `0.5` become negative:

```text
[1.76, 0.12, 1.04] -> [2.52, -0.76, 1.08]
[1.56, 0.03, 0.86] -> [2.12, -0.94, 0.72]
[0.08, 0.72, 0.08] -> [-0.84, 0.44, -0.84]
```

That could create oversized or flipped black backside outline geometry.

## Implementation

- Added `propRendering.js` with:
  - `STAGE_PROP_MESH_RENDERING` to force classroom prop mesh shadows off.
  - `getPropOutlineScale()` to add a small fixed outline padding.
- Updated desk, chair, and unconscious student helper boxes to use the new prop-specific rendering helpers.
- Strengthened tests so raw `castShadow` and `receiveShadow` cannot be reintroduced directly in StageObject component files.
- Added outline scale tests for thin boards and legs.

## Verification

- `npm test -- src/components/StageObjects/stageObjectAssets.test.jsx src/components/StageObjects/stageObjectPlacements.test.js --pool=threads`
- `npm run build`
