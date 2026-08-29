# Player Image 2.0 GLB vertical slice

- Source: `Graphic_designer/player_image2_turnaround_2026-08-29.png` (SHA-256 `EB070E1AC0F26A66C0D93E383067DBA3F6381AE8FDAC8DBEB0A338159B508752`).
- Editable Blockbench source: `Developer/r3f_prototype/src/assets/models/player/source/player-image2-2026-08-29.bbmodel`.
- Blender-authored intermediate: `src/assets/models/player/intermediate/player-image2-authored-raw.glb`.
- Runtime final: `src/assets/models/player/player-image2-2026-08-29.glb` (SHA-256 `238DE386D331156CD148B5A0A97DDD5A3303A27103020556238D2E27B6A0E92F`).

## Runtime boundary

Gameplay and the Graphics Studio preview use `PlayerMesh modelVariant="image2"`. The title continues to use the unmodified default legacy call; no title source or presentation was changed.

The image2 adapter imports the final GLB but does not mount its scene root with a primitive. Instead it places each named GLB geometry in the pre-existing PlayerMesh outer root, `StudioTunedGroup itemId="player"`, scale group, direct-child order, and animated group pivots. The final GLB retains semantic surfaces only; the existing runtime `OutlineBlock` slots deterministically derive their BackSide toon outlines from those same surfaces. This preserves the existing Studio numeric-transform/Firebase contract, bag swing, arm actions, and lantern visibility without a migration, proxy, fallback, localStorage, or Firebase write.

## Validation

- `run_pipeline.ps1`: PASS — 29 semantic surface meshes, 1,276 triangles, 0 armatures, `errors=[]`.
- Blender 5.2 re-import: required `player` root and `player__*` named-part hierarchy present.
- Targeted Player tests: 4 files, 28 passed, including every current `studioSnapshot.json` Player numeric part/group key resolving to the same legacy-compatible tree depth and object type.
- Production build: PASS; Studio/game sync tests: 41 passed; bundled GLB: 193,000 bytes.
- `git diff --check`: PASS.

The repaired Blender front/right/back evidence is in `Quaility_Assurance/player_image2_glb_visual_qa_2026-08-29/`. It confirms material colors, connected shoes, Y-up upright side view, and correct front (eyes/tie) versus back (backpack) orientation.

Blockbench was opened with the editable source and then terminated. Its GUI Export action could not be verified because the desktop accessibility provider returned an unusable window tree; no GUI-export success is claimed. The Blender intermediate-to-normalized final path above is the verified artifact route.
