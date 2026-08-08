# threemini Stage 2 corridor prop rendering fix — 2026-08-09

## Scope
- Kanban: `t_080ff4da` — Fix all Stage 2 corridor prop graphics.
- Targeted path: shared StageObjects prop rendering and `CorridorProps.jsx` only.
- No browser/server, no Firebase writes, no placement or Studio transform changes, no commit/push.

## Required-document gate
- Command: `powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile threemini -Domain auto -TaskSummary "Stage2 corridor shared prop rendering regression"`
- Exit code: 0
- `matched_domains`: `gameplay`, `qa`
- `match_evidence`: `stage`, `regression`
- `combined_receipt_sha256`: `57633681dded90d0227398911aaf3f970250e758f55a39806092b1fd8bf656bc`

## Root cause
- Stage 2 corridor props are multi-part voxel/block models with many overlapping front/back panels.
- The shared non-occluding prop material path forces `depthWrite=false` to avoid the older character shadow-only occlusion bug on cover props.
- That path is correct for broad cover props, but it breaks complex corridor props because later subparts can draw through earlier front faces instead of using the normal opaque depth pass.

## Implementation
- `Developer/r3f_prototype/src/components/StageObjects/propRendering.js`
  - Added `getStagePropDepthWritingToonMaterial(...)` as a separate cached material instance that keeps toon shading and `THREE.DoubleSide`, but writes depth.
  - Kept `getStagePropToonMaterial(...)` depthWrite=false for existing non-occluding prop behavior.
  - Kept outline userData as per-mesh fresh object via `getStagePropOutlineUserData()`.
- `Developer/r3f_prototype/src/components/StageObjects/CorridorProps.jsx`
  - Switched `CorridorLockerBank`, `CorridorJanitorCart`, and `CorridorLostFoundBoard` to `getStagePropDepthWritingToonMaterial(...)`.
  - Switched local `PropBox`/`PropCylinder` mesh props to `STAGE_PROP_MESH_RENDERING` so they render in the normal opaque depth pass, not the non-occluding shared surface path.
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectAssets.test.jsx`
  - Added/kept red-capable regression coverage requiring corridor props to use the depth-writing material path and to keep non-corridor non-occluding material behavior unchanged.

## Validation
1. RED observed before fix:
   - `npm test -- src/components/StageObjects/stageObjectAssets.test.jsx`
   - Result: 1 failed / 23 passed.
   - Failure: `keeps every multi-part Stage 2 corridor prop in the normal opaque depth pass` expected `getStagePropDepthWritingToonMaterial` in `CorridorProps.jsx`.
2. Focused npm test after fix:
   - `npm test -- src/components/StageObjects/stageObjectAssets.test.jsx`
   - Pretest gates passed: branch guard, title surface canonical, title BGM canonical, legacy B02, dialogue store.
   - Vitest output: 1 file passed, 24 tests passed.
   - Tool exit code reported `4294967295` despite pass text, so direct Vitest verification below was also run.
3. Direct focused verification:
   - `npx vitest run src/components/StageObjects/stageObjectAssets.test.jsx src/components/GraphicsStudioPreview.test.js src/lib/stagePropPlacements.test.js`
   - Result: 3 files passed, 52 tests passed, exit code 0.
   - This covers the three requested object types through StageObjects asset contract, Graphics Studio preview branches, and Stage prop placement catalog normalization.

## Preserved boundaries
- Did not change model geometry dimensions, authored placements, Studio item IDs, Firebase paths, Firebase data, title, or unrelated dirty files.
- Did not run browser/server.
- Did not commit or push.
