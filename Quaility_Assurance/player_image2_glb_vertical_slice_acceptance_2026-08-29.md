# Player Image 2.0 → GLB vertical slice: independent QA baseline

- QA owner: `balanceqa`
- Kanban: `escape-zombie-school` / `t_e250542c`
- Scope: independent, read-only acceptance of the Player original art, the Blockbench→Blender GLB output, and any approved shared runtime integration.
- Prohibited in this QA: product-code edits, Firebase/Auth/Studio writes, localStorage writes, title edits, stage edits, commit, and push.
- Result at baseline: **PENDING — no Player `.bbmodel`/exported `.glb` was present at baseline.**

## Baseline evidence

Observed at QA start (2026-08-29 KST):

| Target | SHA-256 |
| --- | --- |
| `Graphic_designer/player_image2_turnaround_2026-08-29.png` | `EB070E1AC0F26A66C0D93E383067DBA3F6381AE8FDAC8DBEB0A338159B508752` |
| `src/components/PlayerMesh.jsx` | `D1699F44237DA7D74207E90F8ECB9670E76EC06B8CF178D9AB6998E84628F2DF` |
| `src/components/TitleScene3D.jsx` | `C6E51C4D248230F484A1118C6F8F2B0D1D5BD6AB7C60697F316277A3C04F0D7C` |
| `src/components/GraphicsStudioPreview.jsx` | `8E18B76DA6A22E673BA1F2C9B1191F3DFD9DE2AAD541B52BFA67E32DE14F3B97` |
| `src/components/StudioTunedGroup.jsx` | `147DCF43765451F78785881AEBC4B3F005E64C18F91D7E392C0287B1EB185646` |

At baseline, the worktree already contained unrelated or in-progress modifications to `PlayerMesh.jsx` and other gameplay files. This QA neither attributes nor changes them.

## Original-art identity checklist

The supplied five-view sheet establishes these non-negotiable Player features:

- five views: front, front-three-quarter, side, back, back-three-quarter;
- oversized faceted pink bob haircut, three front bang points, long left-side hair panel, and white rectangular hair clip on the character's right fringe;
- light skin square face, paired vertical dark-red rectangular eyes, and no added mouth/nose detail;
- red open school jacket, white shirt, yellow tie, dark-blue skirt;
- separate arms/hands, white socks/legs, and chunky dark-blue shoes with pale toe panels;
- bright-blue rectangular backpack with visible shoulder straps, top anchors, side protrusions, and rear flap pocket;
- separate blue flashlight with dark bezel, pale lens, yellow switch, and wrist loop.

Acceptance requires a visually comparable front/side/back view. Missing any listed silhouette-critical part is a FAIL, not a substitution with an older Player model.

## GLB acceptance gates

1. Artifact chain: keep the Blockbench `.bbmodel`, the UI-exported source `.glb`, and Blender-normalized final `.glb` together under the Player asset folder. Blender must not consume `.bbmodel` directly.
2. Artifact identity: final GLB header is `glTF`, version `2`; Y-up/metric, root named `player`, and child mesh/armature names begin `player__`.
3. Geometry: flat normals after Blender re-import; no accidental smooth shading. Triangle count must be reported. This document does not invent a numeric budget: the builder must declare a measured count and the game render owner must compare it to the existing Player budget before approval.
4. Named separable parts must at least cover hair/head, face, torso/jacket, tie, left/right arm, left/right hand, skirt, left/right leg, left/right shoe, backpack, and flashlight. Pivots must support existing movement/animation rather than bake over the Studio transform chain.
5. Materials: toon/outline compatibility must be retained by the shared Player renderer; a GLB material must not silently replace or bypass current Studio material tuning.

## Studio, game, and title parity gates

- The game `PlayerMesh`, Graphics Studio preview, and title must consume one shared Player asset/component path. A title-only proxy, duplicate mesh, or visual re-creation is an immediate FAIL.
- Existing Studio item id stays exactly `player`; numeric child ordering and existing part/group keys stay valid.
- Existing transform semantics stay: base transform + Studio offset + animation offset for position/rotation, and base × Studio multiplier × animation multiplier for scale. No local seed, source revision, fallback, or reset path may be introduced.
- The title may retain only its outer presentation transform/animation around the fully Studio-applied shared Player. Title source and title visual behavior must otherwise have zero unrelated diff.
- Firebase/Studio/Graphics values may be read only through their existing implementation; this QA will not write them. Browser `localStorage` reads/writes and any fallback/readiness hiding introduced by the slice are FAIL.

## Required evidence before PASS

- `validate_glb.py` result for the actual Player GLB, including GLB v2, root/nodes, mesh count, armature count, triangle count, flat-normal check, and errors array.
- Blender re-import inspection of actual Player GLB.
- Source diff limited to the approved shared Player integration, with `TitleScene3D.jsx` separately reviewed for unrelated visual diff.
- Focused existing Player/Studio/title tests, plus any new focused asset-contract tests.
- Real screen evidence for game, Graphics Studio, and title consuming the same Firebase revision. Without this, parity remains PENDING rather than PASS.

## Actual artifact evidence (2026-08-29)

- Blockbench source: `src/assets/models/player/source/player-image2-2026-08-29.bbmodel`, SHA-256 `0733788EA72E7F7375DB35C2DDE5356CD9E48C358E99F3F3E6002D24A75C47AE`.
- Final Blender-normalized asset: `src/assets/models/player/player-image2-2026-08-29.glb`, SHA-256 `35DE40DAF9CAD1D66DCC759A563C7888FF9827AADE85625525899D50D40BF733`, 192,948 bytes.
- Independent Blender 5.2 re-import with the project validator: **PASS** — `asset_id=player`, GLB v2, `mesh_count=58`, `triangle_count=2552`, `armature_count=0`, `errors=[]`.
- The source model has 29 named part groups beneath `player_root`, including all source-art-critical hair, clip, face, clothing, backpack, limb, shoe, and lantern parts. The visual original-art sheet and model-part inventory are structurally consistent.
- Blockbench itself was opened and the source document was loaded. Actual File → Export → glTF 2.0 UI automation was blocked because the available UI provider returned another foreground window. Therefore the final GLB's **Blockbench UI-export provenance is PENDING**, not PASS.

## Integration review

Confirmed: gameplay `PlayerVisual` passes `modelVariant="image2"`, and Graphics Studio preview uses `PlayerVisual`; those two surfaces therefore share the new Player GLB component.

### Blocking Studio compatibility defect

**FAIL — unchanged existing numeric Studio part paths are not preserved.** The P0 adapter removed the raw `<primitive object={model}>` and recreated the legacy direct-child order plus the named animation pivots. That is an improvement, but it is insufficient for the persisted deep paths. Existing Firebase-owned Player part/group values use numeric paths such as `player::part::0.0.8.0.0` and `player::part::0.0.19.2.0.8`. `StudioTunedGroup` resolves them through the live object `children[]` order.

Legacy `head` is a ref group containing a `<Block>` **intermediate group**, which in turn contains outline/surface meshes. P0 `head` is a ref group containing `<PlayerImage2Part>`, which emits meshes directly. Therefore the legacy `...head.0.0` depth is not present in P0. The same mismatch exists wherever a legacy `Block` group was replaced by direct GLB mesh output. `findStudioPartByKey` retries shorter suffixes when a full numeric path fails, so this is not a safe no-op: it can select a different object instead of surfacing the mismatch.

P0 deep recheck: no raw primitive remains; focused tests are 28/28 PASS; production build and its Studio-sync suite are PASS (41/41); final GLB validator is PASS (`58` meshes, `2552` triangles, armature `0`, errors `[]`); `TitleScene3D.jsx` and `GraphicsStudioPreview.jsx` have zero diff. The actual GLB was independently re-imported: every mapped named part has both surface and outline mesh materials, so the new `PlayerImage2Block` / `PlayerImage2OutlineBlock` pair can produce the legacy `group → surface mesh` and direct-outline slots.

The added deep-key regression test is **synthetic-only**: `playerStudioTree({ image2 })` currently builds the same mock tree for both variants. It proves the intended structure and detects listed snapshot keys, but it does not render the two R3F components or inspect their live Three object trees. Static source comparison nevertheless confirms the relevant wrapper pattern now matches legacy: outer outline group, direct blocks, head/hair/eye/bag/arm/lantern/leg/shoe wrappers, and ref pivots are rebuilt with the same group/direct-mesh nesting. This is sufficient for static compatibility acceptance, but live Firebase same-revision screen validation remains required before release acceptance.

No Firebase migration or value rewrite was performed by QA, because the current Player Studio values are Firebase-only and must not be changed without authorization. The shared GLB integration cannot be accepted for existing Studio values until an authorized, tested compatibility design preserves the existing numeric hierarchy or a server-approved migration exists.

### Title locked boundary

`TitleScene3D.jsx` remains unmodified by explicit Advisor direction under the title lock. It continues to use the default legacy Player variant. This is intentional for this slice and is recorded as **title parity excluded / PENDING**, not evidence that all three surfaces use the new GLB.

## Current QA verdict

**CONDITIONAL / NOT RELEASE-ACCEPTED.** Static P0 compatibility is accepted: the actual GLB parses/re-imports, source part inventory matches the supplied art, gameplay and Graphics Studio share the image2 GLB, and the legacy numeric wrapper/pivot structure is restored in source. It is not a full release PASS because: (1) Blockbench UI-export provenance is unverified; (2) the persisted-key regression test is synthetic rather than a live R3F object-tree/Firebase application test; (3) title is deliberately locked to the legacy variant; and (4) no real game/Studio/title same-revision screen evidence or mobile performance measurement exists.

## Blender 5.2 direct-import visual QA (2026-08-29) — FAIL

Evidence is retained in `Quaility_Assurance/player_image2_glb_visual_qa_2026-08-29/`:

- `player-image2-front-orthographic.png`
- `player-image2-right-orthographic.png`
- `player-image2-back-orthographic.png`
- `player-image2-geometry-audit.txt`

The final GLB was imported by Blender 5.2 headlessly, and front/right/back orthographic renders were inspected directly. **FAIL: the standalone final GLB cannot visually reproduce the supplied original art.** The three rendered views are predominantly navy, parts overlap, and the shoes are visibly separated from the legs. Therefore the pink hair, white clip, red jacket, white shirt, yellow tie, blue lower uniform, cyan backpack, grey shoes, and flashlight cannot be accepted as visually present in a direct GLB render.

This is not caused by missing color data: the imported GLB material base colors include hair-top `(1.000, 0.576, 0.714)`, jacket `(0.847, 0.122, 0.263)`, backpack `(0.016, 0.616, 0.886)`, shirt `(0.984, 0.969, 0.937)`, tie `(0.980, 0.796, 0.173)`, uniform `(0.098, 0.247, 0.576)`, shoe `(0.365, 0.451, 0.545)`, and outline `(0.031, 0.051, 0.137)`. Every surface/outline mesh pair imports with identical local scale `(1,1,1)`, so the dark outline duplicate sits over the colored surface in a normal standalone import. Parent transforms are also materially required for assembly: for example `player__shoe-l/r` are children of `player__leg-l/r` at `(0,-0.76,0.06)`, while the mesh locals are `(0,0,0)`.

The runtime adapter currently supplies outline inflation and legacy wrapper placement, but that does not repair the final GLB as an independently renderable deliverable. Preserve these FAIL PNGs; re-render only after the builder replaces/fixes the final GLB. This visual gate overrides the earlier structural-only conditional acceptance.

## Final replacement GLB visual re-QA (2026-08-29) — PASS

The failed artifact was replaced, not patched in place. The independently measured final SHA-256 is `238DE386D331156CD148B5A0A97DDD5A3303A27103020556238D2E27B6A0E92F`.

- Blender 5.2 actual import + project validator: **PASS** — GLB v2, 29 meshes, 1,276 triangles, 0 armatures, `errors=[]`.
- The preserved, overwritten `front/right/back` QA PNGs were inspected directly. They now show the pink hair, white right-fringe clip, long left rear hair piece, red jacket, white shirt, yellow tie, blue lower uniform, cyan backpack and flap, grey shoes, and blue/yellow/white flashlight as distinct attached parts. No visual overlap or detached shoe remains.
- Named source nodes remain present for the critical separable parts. In particular `player__hair-tail-l`, `player__hair-clip-r`, `player__backpack`, `player__lantern-body`, `player__shoe-l`, and `player__shoe-r` all import with their expected parent relationships. Shoe child local transform is corrected to `(0,-0.48,0.06)` beneath its leg.
- The source GLB intentionally contains 29 semantic surface meshes only. `createPlayerImage2PartAssets` deterministically derives one outline entry from each surface geometry using `createPlayerOcclusionSafeOutlineMaterial`; that material is an inverted-hull `THREE.BackSide` outline. It retains the existing `PlayerImage2OutlineBlock` slots and the previously accepted Studio child structure. No raw `<primitive object={model}>` is present.
- Independent focused tests: 4 files / 28 passed. Independent production build: **PASS**, including Studio/game-sync 4 files / 41 passed and bundling the final GLB at 100.04 kB.

**Final visual-asset gate: PASS.** The separate pre-existing release limitations remain as recorded above: Blockbench GUI export provenance is not UI-verified; persisted Studio hierarchy test remains synthetic rather than a mounted-R3F/Firebase proof; and title remains the intentionally locked legacy boundary. No product source, Firebase, title, or localStorage state was changed by QA.
