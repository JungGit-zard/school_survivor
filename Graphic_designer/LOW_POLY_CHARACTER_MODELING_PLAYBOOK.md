# Low-poly character modeling playbook

- Project: Escape! zombie school
- Owner role: Three_Mini / graphics-modeling documentation
- Scope: practical low-poly character modeling manual for the next player/zombie/boss model.
- Runtime boundary: viewer-only asset guidance until the user explicitly approves integration. Do not connect to game runtime, Graphics Studio, Firebase, title, or Studio values from this playbook alone.
- Current proven reference: v8 was built in Blender headless from the user/source reference sheet. It was not exported from R3F, and this document must never claim otherwise.

## 0. Absolute boundaries

1. Do not edit runtime code, Firebase, GraphicsStudio.jsx, Studio state, title assets, or existing dirty files while authoring a model manual.
2. Treat model candidates as independent viewer-only artifacts until the user confirms the exact integration task.
3. A viewer GLB, contact sheet, or high silhouette score is not game approval, Studio approval, Firebase approval, or title approval.
4. Pixel3D / Pixal3D / image-to-3D tools are optional rough-shape tools only. They are not required, and they do not replace Blender cleanup, QA, pivots, topology, or user visual approval.
5. Future optional workflow: Three.js/R3F low-poly blockout can be used as a temporary shape sketch, then rebuilt/finalized in Blender. That is a future option only. The actual v8 asset was Blender-headless-built from source references.

## 1. Modeling philosophy: classic low-resource first

Use the old low-resource character approach: make the character read from a distance with large masses, few planes, clean silhouette, and deliberate texture placement.

Priority order:

1. Big silhouette: head/skull, hair mass, body, skirt/outfit, shoes, backpack or weapon.
2. Front/side/back depth consistency: the same character must make sense in all views.
3. Pose and joints: arms/legs/head must swing without tearing the design apart.
4. Face readability: eyes, eyebrows, and mouth must read on one face surface.
5. Surface detail: only after the previous four gates pass.

Do not spend triangles as random surface density. Spend triangles only where they change the visible silhouette or deformation: skull volume, bob-hair width/depth/bottom line, face plane, skirt/outfit shape, shoes, backpack, and action-critical props.

## 2. Reference priority: F / S / B / FACE

Always model from the actual reference sheet in this order:

1. FRONT: primary identity, head width, hair width, body width, outfit proportions, feet stance.
2. SIDE: exact depth, nose/face plane, hair depth, backpack depth, skirt/body thickness.
3. BACK: rear hair shape, backpack, rear silhouette, shoulder/body continuation.
4. FACE: final facial expression and feature placement, but only after the head/face plane exists.

If references conflict, do not average blindly:

- Use FRONT for identity and horizontal silhouette.
- Use SIDE for depth reconstruction.
- Use BACK for rear mass and hair/backpack continuation.
- Use FACE only for texture/feature placement, not for inventing a separate detached face model.

## 3. Exact 90-degree side-depth reconstruction

The side reference is not decoration. It is the 90-degree depth contract.

Procedure:

1. Align FRONT and SIDE to the same head top, chin, shoulder, skirt bottom, and foot baseline.
2. Build a gray blockout first.
3. In Blender/world axes, keep FRONT width on the left-right axis, and use SIDE width as the front-back depth axis.
4. For every major mass, check both dimensions:
   - Head/skull: front width vs side depth.
   - Bob hair: front width, side depth, bottom line, back volume.
   - Face: one forward-facing plane/curved plane with enough depth to belong to the head.
   - Torso/skirt: front width plus side thickness.
   - Shoes: front read plus side sole depth.
5. Render FRONT, SIDE, BACK, and 3/4 before adding texture details.
6. If SIDE fails, do not fix it with painted shadows. Change geometry mass.

## 4. Visual priority scale: S / A / B / C / D

Use this scale to decide where polygons and time go.

- S: silhouette-critical identity. Skull/head size, bob hair outline, face plane, main outfit/skirt, shoes, signature backpack/prop.
- A: animation-critical masses. Arms, legs, hands/feet blocks, pivots, shoulder/hip separations.
- B: readable surface zones. One face UV, torso color block, skirt pleats, shoe color, backpack patch.
- C: secondary style. Small folds, small trims, subtle asymmetry, tiny color accents.
- D: avoid or postpone. Hidden inner faces, random bevel density, micro wrinkles, duplicate eye cards, black tattoo-like outline strokes on skin.

Rule: S and A get geometry. B usually gets UV/texture or material zones. C is optional. D is removed.

## 5. Geometry construction rules

### 5.1 Large forms first

Start with separate low-poly masses:

- Head/skull
- Hair cap and hair side/back masses
- Face surface
- Neck if needed
- Torso
- Skirt/outfit lower mass
- Left/right upper arms
- Left/right lower arms or hand blocks
- Left/right legs
- Left/right shoes
- Backpack/prop if present

Each mass should be watertight where possible, simple, and readable in flat gray.

### 5.2 Separate watertight major masses

Do not make one fragile melted shell. Keep major masses separate if they need independent silhouette, material, or pivot behavior.

Good:

- Hair as its own mass around the skull.
- Arms and legs as separate blocks with pivot origins.
- Shoes as separate masses if shoe shape matters.
- Backpack as a separate mass attached to the back.

Bad:

- Thin shell with holes.
- Random internal faces.
- Many tiny detached slivers that do not change silhouette.
- Eye/mouth planes floating in front of a face.

### 5.3 Face plane design

The face must be a deliberate polygon surface on the head, not a stack of detached cards.

Rules:

1. Create one face surface that belongs to the head volume.
2. UV-map eyes, eyebrows, and mouth directly on that one surface.
3. Do not use duplicate detached eye cards.
4. Do not tattoo black 2D outer silhouette lines on skin to fake geometry.
5. If the face reads poorly, adjust the face plane, UV scale, and texture placement before adding extra meshes.

### 5.4 Joints and pivots

For walk and arm actions, pivots matter more than extra polygons.

Minimum pivot groups:

- Head pivot near neck/top spine.
- Body/hips pivot near center mass.
- Left/right arm pivots at shoulders.
- Left/right leg pivots at hips.
- Optional hand/prop pivots if actions require them.

QA pose requirements:

- Neutral standing pose.
- Walk pose.
- Right/left arm swing or attack pose.
- 8-way turnaround.

If a limb looks attached in neutral but breaks in walk pose, the geometry is not finished.

## 6. Normals, toon, and outline

Default style:

- Low-poly/faceted forms can use flat normals where planar style is intended.
- Use smooth normals only when a large curved mass needs a softer cartoon read.
- Keep toon material simple: flat color, limited shade steps, small texture atlas or direct UV texture.
- Use outline as runtime/rendering treatment, not as black skin tattoos baked into the face/body texture.

Do not use heavy postprocessing or dense PBR surface detail for mobile-first characters unless a later task proves the budget.

## 7. Required gated workflow

### Gate 1 — gray blockout

Output:

- FRONT gray render
- SIDE gray render
- BACK gray render
- 3/4 gray render
- quick silhouette metrics or overlay contact sheet

Pass criteria:

- Large masses match the reference.
- 90-degree SIDE depth is believable.
- Back is not an afterthought.
- No texture is used to hide geometry problems.

### Gate 2 — geometry QA

Check:

- No nonmanifold edges.
- No negative signed-volume objects.
- No accidental internal junk faces.
- No duplicate floating facial feature cards.
- Major masses are separate and named clearly.
- Pivots/origins support walk and arm actions.
- Triangle budget is spent on S/A priority areas.

### Gate 3 — texture QA

Check:

- One face surface UV contains eyes, eyebrows, and mouth.
- Facial features align on FRONT and remain believable in 3/4 view.
- Outfit texture follows the mass; it does not fake missing silhouette.
- No black 2D outer silhouette lines are painted onto skin.
- Texture sizes stay mobile-lightweight, normally 256-512px unless a later task justifies more.

### Gate 4 — 8-way and pose QA

Output:

- 000, 045, 090, 135, 180, 225, 270, 315 degree renders.
- Walk pose render.
- Arm swing / action pose render.

Pass criteria:

- The model reads as the same character in every direction.
- Side and back are not weaker than front.
- Limb motion does not expose holes or broken joints.
- Face remains readable without detached cards.

### Gate 5 — mobile/lightweight performance review

Record:

- Structural triangle count.
- Export triangle count.
- Mesh part count.
- Material count.
- Texture count and size.
- GLB size.
- Whether the asset is viewer-only or integrated.

Target ranges are not approval by themselves. For player-scale characters, v8 proved a viewer-only candidate around 3.2k triangles and 31 parts can remain lightweight. Runtime approval still requires separate game/Studio/Firebase verification.

## 8. Failure examples from v3-v8

These are practical lessons, not shame records.

- v3 source-faithful: tried to preserve many source details but used a recovered lower-resolution source. Approximate metrics were weak: front IoU 0.7336, side 0.6470, back 0.7560, face 0.8698. Lesson: do not claim exact identity from low-resolution recovered reference or approximate metrics.
- v4: cleaner turnaround started, but blockout silhouette was still only front 0.8630, side 0.8544, back 0.8523. Lesson: acceptable-looking front is not enough.
- v5: triangles dropped to final 2454, but silhouette also dropped to front 0.8517, side 0.8449, back 0.8413. Lesson: fewer triangles are not automatically better if large forms drift.
- v6: final 2716 triangles improved blockout silhouette to front 0.8789, side 0.8692, back 0.8697. Lesson: spend triangles on silhouette-changing masses.
- v7: final 2956 triangles kept front/back similar but side dipped to 0.8651. Lesson: side depth must be actively reconstructed, not assumed from front/back.
- v8: final 3244 export triangles, 31 mesh parts, front 0.9204, side 0.8669, back 0.9145. Lesson: front/back identity improved strongly, but side scanline deltas remained, so even the best viewer-only result still needs side-depth review before integration.

## 9. Actual v8 asset facts

Root folder:

`Graphic_designer/game_resource_library/player_r3f_blender_20261003/09_v8_turnaround/`

Source reference:

`Graphic_designer/game_resource_library/character_sheets/PLAYER_front_side_back_face_v1.png`

Final artifacts:

- `final/PLAYER_v8_final.blend`
  - SHA-256: `0a5bc10c2574d0d350d985faf96959d08ff2c8411022d0ed6f2cc0a78a696c45`
  - Size: 349,910 bytes
- `final/PLAYER_v8_final.glb`
  - SHA-256: `215b30262049c76c747a116d6fc455512bb4c9d4d57e8630ef28d6933af19a72`
  - Size: 363,724 bytes
- `final/PLAYER_v8_source_vs_model_contact.png`
  - SHA-256: `7bb7aef196e5db840635579d1af34e2e4a9a040d44c6c4786634eff4a4f90d78`
- `final/PLAYER_v8_360_contact.png`
  - SHA-256: `6859fbc22b350b70ca9aa1f5f01bbe9f0703bcf851d7145d1edb7e5b9cd55cc1`
- `surface/PLAYER_v8_face_surface_uv.png`
  - SHA-256: `3c2815f6dd62e8590a29c996d23bda433c641a2fbfd5cd01709bc5b0a2bdbfb2`

QA metrics:

- `final/PLAYER_v8_final_qa.json`
  - structural triangles: 3236
  - export triangles: 3244
  - mesh parts: 31
  - nonmanifold edges: `{}`
  - negative signed volumes: `{}`
  - runtime integration: `not connected; PlayerMesh.jsx untouched`
- `blockout/PLAYER_v8_blockout_silhouette_metrics.json`
  - front IoU: 0.9204
  - side IoU: 0.8669
  - back IoU: 0.9145
  - width at 680h: front source/model 374/365, side 276/266, back 369/365
- `blockout/PLAYER_v8_scanline_metrics.json`
  - side row 320 left delta: -31
  - side row 550 right delta: -30
  - use this as a reminder that side depth still needs human/art review.

## 10. Practical checklist for the next model

Before modeling:

- [ ] Confirm the target: player, zombie, boss, or prop.
- [ ] Confirm the source art is user-supplied or explicitly approved.
- [ ] Place FRONT/SIDE/BACK/FACE reference planes.
- [ ] Decide S/A/B/C/D priorities.

During blockout:

- [ ] Build only gray major masses.
- [ ] Match FRONT width and identity.
- [ ] Reconstruct exact SIDE depth at 90 degrees.
- [ ] Check BACK silhouette.
- [ ] Render F/S/B/3q.

During final geometry:

- [ ] Spend triangles only on silhouette-changing forms.
- [ ] Keep major masses separate and watertight.
- [ ] Place pivots for walk and arm actions.
- [ ] Remove internal junk, nonmanifold edges, and duplicate cards.

During texture:

- [ ] Put eyes/eyebrows/mouth on one face UV surface.
- [ ] Avoid detached eye cards.
- [ ] Avoid black 2D outer silhouette lines painted on skin.
- [ ] Keep texture small and readable.

Before handoff:

- [ ] Export blend and GLB.
- [ ] Save F/S/B/3q, 8-way, walk, and arm/action renders.
- [ ] Save QA JSON with triangles, mesh parts, GLB size, nonmanifold, negative volume, and runtime scope.
- [ ] State clearly: viewer-only or integrated.

## 11. Integration reminder

This playbook drives modeling. It does not authorize integration.

A separate approved integration task must verify:

- same model source across Studio/game/title if applicable,
- stable part IDs and pivots,
- Studio/Firebase revision contract,
- runtime performance on the target scene,
- mobile rendering,
- and user visual approval.

Until then, the correct status is: independent viewer-only asset candidate.
