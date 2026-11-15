# Asset modification and animation capabilities (code-only agents)

Last checked: 2026-11-15 (threemini). Scope: what agents working only through code and headless tools can do to free (CC0) 3D assets, and how far animation goes. Terry-facing Korean version: https://claude.ai/artifact/KXmVtejv7tC6mXeoeHYFdd (private to the owner).

Evidence root for the experiments: `F:\ezs-work\backup\asset_capability_probe_20261115\` (`scripts\`, `out\`). The Mini Characters bake is at `F:\ezs-work\backup\mini_zombies_stage_20261115\` (read-only reference).

Levels: **verified** = shipped or staged in this project; **experiment** = small experiment run 2026-11-15, output cited; **untested** = method known, not done; **no** = not possible or not worth it.

## Key facts

- Kenney Mini Characters: one skeleton for all 20 characters (`root > leg-left, leg-right, torso > arm-left, arm-right, head`). Every vertex has one joint at weight 1.0; inverse binds are pure translations. 32 clips; 31 are byte-identical across all 20 files, `static` has 2 variants. Male vs female joint offsets differ by at most 1.28 mm (model units, height 0.671).
- Replaying pack clips on our rigid 6-part bodies is **exact**: max vertex error 0 vs three.js linear-blend skinning, 4 bodies (male-c, zombie, female-c, worker) x 6 clips (walk, attack-melee-right, die, emote-yes, sprint, idle) at 30 fps. Baked-GLB pivots equal pack bind pivots (diff 0). Output: `out\clip_replay_log.txt`, `out\clip_replay_results.json`, strips `out\clip_replay_strips.png`, `out\clip_blend_strips.png`, `out\clip_replay_gamecam.png`.
- Clip table size (6 joints, 30 fps): walk 0.667 s = 21 frames = 1,764 B (int16 quat+pos) / 3,528 B (f32 quat+pos) / 8,064 B (f32 mat4). All 25 non-wheelchair clips: 334 frames = 28 KB int16 / 56 KB f32. One table serves all 15 bodies.
- Arms in the staged mini zombies have a baked 1.2 rad lowering (`MINI_ARM_REST_TILT`); clip replay must undo it (`J * RotZ(+/-1.2)`), because clip rotations are relative to the T-pose bind.
- Cross-pack retarget works: Mini clips drove the Kenney Blocky rig (trunk `kenneyBlockyGeometry.js`, height 2.7 vs 0.671, ratio 4.024) using local rotations + scaled pivot offsets + a fixed arm bind fix (`RotZ(+/-90deg)`). Stride and arm height come out exaggerated; needs per-joint angle scaling. `out\retarget_blocky_strips.png`.
- VAT is not worth it for rigid bodies: male-c 1,022 verts x 426 frames x half3 = 2.6 MB per body vs 36 KB of joint tables for every body.
- Bake reproducibility: re-running `bake_mini_zombies.mjs` gives a byte-identical GLB (sha256 `736b00e2...b3439e`, 94,976 B) in 0.79 s.
- Silhouette at game size (camera dir 0,1,1, 48x60 px mask): 13 of 15 school-tone bodies have IoU >= 0.90 with each other (male-d/e/g 0.996); only female-b and female-f separate. Head top (hair/hat) is 40-64% of visible pixels; each body has 3-5 colour regions >= 8%. `out\silhouette_probe.json`, `out\silhouette_masks.png`.

## Capability table

| Item | Level | Evidence | Cost | Main risk |
|---|---|---|---|---|
| Static props (KayKit) | verified | `src/lib/kaykitFurniture.js`, `components/StageObjects/kaykitPropRecipes.js`, `KaykitProps.jsx`, `assets/models/kaykit/furniture_kaykit.glb` (120,824 B, 22 nodes, 1 atlas) | 2 draw calls per recipe part per stage (fill + outline) | stretching to collider footprints |
| Rigid low-poly characters (Kenney) | verified | Blocky: `lib/kenneyBlockyGeometry.js`, `lib/blockyZombiePose.js`, `components/BlockyZombieLayer.jsx`; Mini: bake folder above | Mini: 15 bodies + 17 props = 94,976 B; 12 draw calls per visible variant (+2 per loose prop) | joint seams when bending far |
| Skinned characters with blended weights | experiment | Blender ARMATURE_AUTO on a tube: 96/168 verts blended; three.js reads 192/360 blended (`out\blender\blender_probe.json`, `out\verify_blender_log.txt`) | >= 2 draw calls per unit, CPU skinning per unit | auto weights crease shoulders/elbows |
| Modular kits (walls/tiles) | untested | same path as furniture | like furniture | 1 px seams |
| Textures / atlases | verified | 52 palette slots painted into the 512^2 Mini colormap (capacity 88; slot 8x128 px) | atlas 8,697 B | no hand-painted detail |
| Whole-scene files | untested | split by node with Blender or gltf-transform | one-off | hidden lights/cameras/huge textures |
| GLB/GLTF | verified | all current work; skinned male-c 271 KB -> 80 KB with `gltf-transform meshopt` (`out\male-c_meshopt.glb`) | - | - |
| FBX | experiment | Blender 5.2 import of `character-male-c.fbx`: 1 armature, 6 bones, 32 actions -> GLB 206,588 B; three.js loads 32 clips | seconds | clip names become `root|walk|Animation Base Layer`, walk 0.667 s -> 0.700 s |
| OBJ | experiment | Blender import, 837 tris | - | no skeleton/animation |
| Recolour / UV remap | verified | `miniZombieRoster.js` `MINI_PALETTE_SLOTS`, `miniRemapUv` | 0 GLB bytes per variant | small-on-screen colour differences do not read |
| Texture repaint | verified (flat slots only) | bake paints slots with sharp | small | detailed painting: no |
| Scale / proportion | verified (whole body, arm tilt, head tilt) | roster `scale` 0.95-1.6 | small | per-part scaling untested; seams |
| Part swap (head/hat) | untested | same skeleton, pivots within 1.28 mm | small | hair is fused with the head mesh |
| Attach / merge props | verified | merged props add 0 draw calls; loose props +2 | small | props clip through the body in clips |
| Procedural props | verified | 15 box-built props in the bake | ~1-3 KB each (estimate) | boxy look |
| Vertex edits (bend, bevel, deform) | experiment | Blender: bend + jitter chair, bevel 308 -> 566 tris (`out\prop_damage_blender.png`) | seconds | jitter tears faces at UV seams (visible) |
| Cleanup / decimate / LOD | experiment (decimate 308 -> 154 -> 77) + verified (weld/dedup/meshopt in bake) | | | low-poly already; LOD gains small |
| Toon + outline | verified | MeshToonMaterial gradient + inverted-hull `createOutlineGeometry` | doubles draw calls | thin parts |
| Faces / expressions | verified (E07 SDF shader face; mini eye/mouth slots) | `components/ZombieMesh.jsx` | 1 shader | SDF face on Kenney heads untested |
| Mixing packs | verified | Kenney Blocky + Mini + KayKit + own props; desaturate 0.2, same toon/outline | small | proportions differ |
| Damaged/zombified prop | experiment | chair bend + jitter, GLB loads in three.js | seconds | same seam tearing |

## Animation ladder

1. Procedural rigid-part poses (current Blocky/Mini): verified. 12 draw calls per visible variant regardless of count.
2. Pack clips sampled into joint tables, played on rigid parts: experiment, exact (error 0). Same draw calls as 1; 28-56 KB for 25 clips. Human motion; layer zombie offsets on top.
3. Real SkinnedMesh + AnimationMixer for a few heroes: untested here. ~80 KB per meshopt character, >= 2 draw calls per unit, CPU per unit. Title scene is locked (STUDIO_GAME_TITLE_CHARACTER_ABSOLUTE_LAW.md, AGENTS.md title lock) - do not touch without Terry's explicit instruction.
4. Vertex animation textures: no (70x+ larger than joint tables for rigid bodies).
5. Own animation: experiment for cross-fade (per-joint slerp over 0.2 s) and additive arm/head offsets on walk (rough on first try; needs per-clip tuning). Procedural keyframes, squash/stretch, look-at already used in the project.
6. Retarget between skeletons: experiment (Mini -> Blocky). IK foot lock, ragdoll, shader expressions: untested. Cloth, facial muscle animation, finger acting, authoring natural new motion from scratch: no (needs a human animator).

Quality checks available without a phone: software rasterised previews from the real game data (this probe, `render_preview.mjs`), numeric parity tests, agent-browser screenshots of the dev server (not run in this probe). Real-device smoothness/thermal: unmeasured.

## Scaling to 100-200 types

- Cheap: new look on an existing behaviour = roster data (body + skin + eye + recolour + props), 0 GLB bytes on an existing body, bake 0.8 s. Also needed per type: ko/en/ja names, encyclopedia entry, `encounteredZombieTypes` allowlist id in `database.rules.json` (110 ids as of 2026-11-15, as an OR chain; rules deploy only from an origin-based worktree under the rules deploy guard). Estimate 10-20 looks per session (basis: the 18-look Mini staging files were written within ~40 min, 15:57-16:34 on 2026-11-15, after design).
- Expensive: new behaviour = code + tests + balanceqa + levelmini placement + soundmini gag sound + names + rules. Basis: commits of 2,044 lines/38 files (8 behaviours, ezs-zombies `21360912`), 6,902/52 (12 types, `25066a57`), 1,406/30 (10 types, `f186158f`); `novelZombie2Behavior.js` 699 lines + 493 test lines for 18 types. Estimate 3-6 per session; review is the bottleneck.
- Distinct looks: body shape gives ~3 silhouettes; distinction must come from hats/props (17 now), scale, motion and head-top colour. Nominal 3 x 18 x ~6 >= 300 combos; practical target is distinctness within a stage: 10 stages x 10 types = 100 is reachable as is; 20 per stage needs new silhouettes (props, bodies from other packs, gaits).
- Growth: palette 52/88 slots used (shrinking slot height to 16 px gives ~700 slots in the same atlas, untested); new box prop ~1-3 KB; new body from the same pack ~6 KB (95 KB / 15, estimate); runtime memory ~160 KB per visible variant set incl. outline (estimate), created lazily per stage.
- On-screen budget: alive cap `MAX_ENEMIES = 150` (`lib/enemyEntityPool.js`), render pool `POOLED_ENEMY_CAPACITY = 200`. Draw calls scale with distinct visible variants, not enemy count: +72 for 6 Mini variants, +240 for 20. Measured on this PC's Chrome at phone viewport (not a phone): Stage 6 median 519 calls (max 1,381), Stage 5 median 663 (max 1,045) (scratchpad soak samples, 2026-11-14/15). `Developer/agent_room/zombie_15_design_20261031.md` treats 520 calls for 40 E07-style zombies as over the mobile budget.
- Ways to stay inside (all untested): cap distinct looks per stage (e.g. 8); merge the 6 parts with a joint index and read the joint table in the vertex shader (2 calls per variant); share part meshes per body and recolour per instance; `BatchedMesh` for all variants (~2 calls).
- More CC0 bodies (from the 2026-11-14 survey, not re-verified): KayKit Skeletons, KayKit Adventurers, KayKit Character Animations. Quaternius moved to its own non-CC0 license on 2026-08-28: excluded under the CC0-only rule.

## Tooling on this PC (checked 2026-11-15, nothing installed)

| Tool | Status | Unlocks |
|---|---|---|
| Blender 5.2.0 LTS | installed at `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`; headless `-b --factory-startup --python` works (probe ran in 17 s) | FBX/OBJ import, GLB export, decimate, bevel, deform, auto weights, action baking, retargeting |
| gltf-transform CLI 4.5.1 (+ core/functions, sharp 0.35.5, meshoptimizer 1.2.0, draco3dgltf 1.5.9) | only in the npx cache `C:\Users\admin\AppData\Local\npm-cache\_npx\425967af1abfabd4\node_modules` - not a project dependency, can vanish | GLB optimise/merge/meshopt |
| three 0.164.1, three-stdlib 2.36.1, drei 9.122.0, meshoptimizer 1.1.1, vitest 4.1.6 | project `node_modules` | runtime, Node-side previews, clip sampling |
| Python 3.14 + numpy + PIL | installed (no trimesh/pygltflib/scipy) | image/number work |
| FBX2glTF, gltfpack, assimp | missing | faster format conversion without Blender (low priority) |
| toktx/basisu (KTX2) | missing | GPU texture compression for big textures (low priority now) |
| ImageMagick, ffmpeg | missing | GIF/video clips of animations for review |

## Probe scripts

`scripts\list_clips.mjs` (skeleton, clips, cross-file identity), `scripts\clip_replay.mjs` (exactness, tables, strips, blend), `scripts\retarget_blocky.mjs`, `scripts\silhouette_probe.mjs`, `scripts\blender_probe.py` + `scripts\verify_blender_outputs.mjs`, `scripts\build_page.mjs` (Korean page). They read the pack as data only and use a harness with copied drop-in libs and a per-package junction to `ezs-cf2` `node_modules\three`.
