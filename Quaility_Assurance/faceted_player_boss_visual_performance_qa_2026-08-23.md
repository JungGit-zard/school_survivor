# Faceted Player / B01-B04 Visual & Performance QA

- Kanban: `escape-zombie-school` / `t_bc09608f` (threemini)
- Scope: shared `PlayerMesh` and `ZombieMesh` player/B01/B02/B03/B04 visual verification only. No Firebase, authentication, save state, title layout/camera/light, or product-code edits were made by this QA worker.

## Result: PASS

The 15 canonical live R3F captures below render the shared components through `StudioTuningSnapshotProvider`, at front, side, and back angles. Every capture shows the complete silhouette at a usable mobile-scale framing: headgear through feet, large readable facets, black outline, and ground contact/shadow.

- `faceted_qa_player_{front,side,back}.png`
- `faceted_qa_b01_{front,side,back}.png`
- `faceted_qa_b02_{front,side,back}.png`
- `faceted_qa_b03_{front,side,back}.png`
- `faceted_qa_b04_{front,side,back}.png`

Visual acceptance notes:

- Player: angular hair, jacket, bag, limbs and readable outline.
- B01: faceted face/hair and broad upper-body silhouette.
- B02: bun, uniform/back silhouette and feet remain complete; Stage-2 v2 guard passed.
- B03: headband, face, torso and feet all visible after reframing.
- B04: chef hat, apron, torso and feet all visible after reframing.

## Runtime / mesh budget check

- `getCachedFacetedGeo` is shared and memoized for block/ZBlock geometry; there is no per-frame geometry allocation path in these components.
- The cache only calls `toNonIndexed()` when indexed and recalculates normals. Fresh localhost console check found no Three geometry warning or runtime exception.
- Faceted kinds use low-segment primitives (dodecahedron/octahedron/wedge/low cylinder/low cone) and keep the existing paired outline approach rather than adding mesh/material layers.

## Verification

- `npm run build`: PASS. Prebuild Firebase release-env, legacy-B02, dialogue store and Studio-game sync guards passed; Vite production build and postbuild artifact/hosting checks passed.
- Focused visual suite previously re-run after implementation: 104 / 106 passed. The unchanged existing failures are an obsolete RZT stat expectation in `ZombieMesh.test.js` and an obsolete `playerVisualReady ?` string expectation in `GraphicsStudioPreview.test.js`; neither originates from this faceted change.
- `git diff --check`: PASS.
- Fresh `http://localhost:5173/` browser navigation: app loaded; console only contained Vite/React development and historical HMR messages, with no runtime error.

## Cleanup

- The temporary `Developer/r3f_prototype/faceted-qa-preview.html` was deleted.
- Redundant initial/lobby/title QA captures were deleted. Only the 15 canonical captures remain in `Quaility_Assurance/`.
