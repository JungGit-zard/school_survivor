# Stage 6 schoolyard (운동장) - free asset survey for a whole-board swap

Date: 2026-11-17. Research only: no repo edits, nothing staged or committed, no dev server started.
Raw packs: `F:\ezs-work\assets_cc0\environment\<author>-<pack>\` (each with `LICENSE_SNAPSHOT.md`), index `F:\ezs-work\assets_cc0\environment\INDEX.md`.
Pictures, manifests and scripts: this folder (`sheets\`, `mock\`, `manifests\`, `scripts\`, `scratch\` = fetched pages and the uncompressed bundle test).

## Pictures

Contact sheets (Blender 5.2 Workbench, flat light + cavity + black object outline, camera tilted 48 deg, every model fitted to its cell; label = name, triangles, W x H x D in the model's own units):

- `sheets\00_RECOMMENDED_SET_option_A.png` - one model per role for the recommended set (start here)
- `sheets\tinytreats_fun_playground.png`, `tinytreats_pretty_park.png`, `tinytreats_pleasant_picnic.png`
- `sheets\kaykit_forest.png`, `kaykit_platformer.png`, `kaykit_city_builder_bits.png`, `kaykit_holiday_bits.png`, `kaykit_minigame_variety.png`, `kaykit_prototype_bits.png`, `kaykit_mixed_bags.png`, `kaykit_mixed_bag2.png`
- `sheets\kenney_modular_buildings.png`, `kenney_racing_kit.png`, `kenney_fantasy_town_kit.png`, `kenney_coaster_kit.png`, `kenney_city_kit_suburban.png`, `kenney_city_kit_commercial.png`, `kenney_city_kit_roads.png`, `kenney_building_kit.png`, `kenney_nature_kit.png`, `kenney_retro_urban_kit.png`, `kenney_minigolf_kit.png`, `kenney_survival_kit.png`, `kenney_holiday_kit.png`, `kenney_furniture_kit.png`, `kenney_industrial.png`, `kenney_mini_arena.png`, `kenney_mini_skate.png`, `kenney_platformer_kit.png`, `kenney_prototype_kit.png`, `kenney_mini_forest.png`
- `sheets\peste_kids_park.png`, `oga_leonkin_playground.png`, `oga_polypizza_singles.png`, `marina_playground_builder.png`
- Every sheet has a `.stats.json` next to it (triangles, size, material count per model).

Mock layouts at the real arena size (24 x 40 game units, track R 9, goals at z +-11, school 26 wide at the top, stands at x +-14.75, gate at z +20.6; green cylinders = zombie-size markers 0.56 wide, yellow = player; outline/toon of the game not reproduced, Workbench flat light):

- `mock\mock_A_plan.png`, `mock\mock_A_view_top.png`, `mock\mock_A_view_bottom.png` - Option A (recommended)
- `mock\mock_B_plan.png`, `mock\mock_B_view_top.png`, `mock\mock_B_view_bottom.png` - Option B (all-Kenney)
- `mock\mock_A_stats.json`, `mock\mock_B_stats.json` - per-model instance counts and triangles; `mock\layout_A.json`, `layout_B.json` - exact placements used.

The ground (sand slab, red track oval, white lines, centre circle, penalty boxes, sand pit) in the mocks is drawn the same way the current `expansionEnvironment.js` paints it, not from a pack.

## Colour caveat that matters for the choice

Kenney's older kits (Racing, Nature, Furniture) store their colours as glTF baseColorFactor values that were authored as sRGB. Read as linear (Blender and three.js both do this), greens turn turquoise and reds turn pink - exactly what their sheets show. The newer Kenney kits (Modular Buildings, Fantasy Town, Coaster, Roads, Suburban, Minigolf, Survival, Building Kit) and all KayKit / Tiny Treats packs use a texture (colormap or gradient atlas) and come out with their intended colours. Material-colour kits need a recolour table at build time.

## Coverage table - recommended Option A

Licence for every row is CC0 (Kenney page "Creative Commons CC0"; KayKit / Tiny Treats itch "Creative Commons Zero v1.0 Universal"). Tris = solid triangles per model (outline hull adds about the same again).

| Element | Model (file) | Pack | Tris | Note |
|---|---|---|---|---|
| School block walls/windows | building-windows | Kenney Modular Buildings | 44 per tile | 10 x 3 tiles at scale 2.6 = 26 x 4.9 units; cream wall, blue windows |
| School entrance | building-door-window | Kenney Modular Buildings | 44 | 2 tiles in the middle of the ground floor |
| School roof | roof-flat-top | Kenney Modular Buildings | 28 per tile | visible from the angled camera |
| School clock, name plate | - | gap | - | keep hand-built (ring / plate) |
| Stands / bleachers | grandStand | Kenney Racing Kit | 128 per module | 8 modules per side at scale 2.5; material colours, recolour |
| Sports-day tents (천막) | tentLong, tent | Kenney Racing Kit | 86 | material colours, recolour (white/blue canopy) |
| Trees (plane-tree row) | Tree_1_A_Color1, Tree_2_A_Color1 | KayKit Forest Nature Pack | 530 / 336 | fitted to 4.2 units tall |
| Bushes | Bush_1_C_Color1 (also Bush_2_C) | KayKit Forest Nature Pack | 168 (108) | |
| Hedges / flower beds | hedge_straight_long, hedge_straight, flower_A, flower_B | Tiny Treats Pretty Park | 372 / 232 / 192 / 166 | in front of the school |
| School fence | fence_straight_long (+ fence_post, fence_corner) | Tiny Treats Fun Playground | 168 | green rail fence, reads like a school fence |
| Gate (sliding leaves, pillars) | - | gap | - | keep hand-built: it animates open with the exit portal |
| Lamp posts | street_lantern / streetlight | Tiny Treats Pretty Park / KayKit City Builder | 424 / 176 | |
| Benches | bench | Tiny Treats Pretty Park / KayKit City Builder | 396 / 44 | |
| Bins | trashcan / trash_A | Tiny Treats Pretty Park / KayKit City Builder | 504 / 18 | |
| Fire hydrant | firehydrant | KayKit City Builder | 180 | dressing |
| Slide | slide_A (slide_B taller) | Tiny Treats Fun Playground | 1574 (1288) | |
| Swings | swing_B_small (light) / swing_A_large | Tiny Treats Fun Playground | 692 / 3232 | use the small one; seats ship as separate fbx/obj parts if a sway is wanted |
| Seesaw | seesaw_small / seesaw_large | Tiny Treats Fun Playground | 452 / 676 | |
| Climbing frame / 구름사다리 | monkeybar_A / monkeybar_B | Tiny Treats Fun Playground | 520 / 680 | replaces the hand-built jungle gym |
| Merry-go-round | merry_go_round | Tiny Treats Fun Playground | 864 | |
| Sand pit | sandbox_square / sandbox_round | Tiny Treats Fun Playground | 890 / 480 | long-jump pit can stay a flat paint |
| Finish line gantry | signage_finish | KayKit Platformer | 652 | 운동회 finish |
| Flags (small) | flag_A_red (B/C, 4 colours) / flag_teamRed | KayKit Platformer / Mini-Game Variety | 502 / 576 | team flags; tall waving flagpoles stay hand-built |
| Hurdles | barrierSmall / barrierMedium | KayKit Mini-Game Variety (on disk) | 672 | white bar hurdles |
| Cones | cone (5 colours) | KayKit Platformer | 120 | |
| Giant ball (공굴리기) | ball_red / ball | KayKit Platformer / Mini-Game Variety | 528 / 540 | |
| Football, basketball | football, basketball | KayKit Holiday Bits | 540 / 1048 | |
| School bell | bell | KayKit Holiday Bits | 720 | optional |
| Signs | sign, signage_arrow_stand | KayKit Platformer | 440 / 292 | |
| Spectator dressing | cooler, picnic_blanket_red, radio | Tiny Treats Pleasant Picnic | 834 / 464 / - | optional |
| Football goals (solid colliders) | - | gap | - | keep hand-built (exact collider rectangles); OGA soccerGoal 145 tris exists but is a textured-net realistic goal |
| Assembly podium (조회대) | - | gap | - | keep hand-built (or compose from Kenney Building Kit stairs/floor) |
| PA horn speakers on poles | - | gap | - | keep hand-built; Kenney Furniture `speaker` is a hi-fi box |
| Tall flagpoles + waving flags | - | gap | - | keep hand-built (vertex-shader wave) |
| 만국기 bunting strings | - | gap | - | keep hand-built pennants |
| Pull-up bars (철봉) | - | gap | - | 3 bars, trivial to build |
| Tug-of-war rope | - | gap | - | build (one cylinder) |
| Medal podium 1-2-3 | - | gap | - | three boxes, or recoloured KayKit Platformer platform_*_red |
| Scoreboard | billboardLow (stand-in) | Kenney Racing Kit | 136 | no free in-style scoreboard with digits; Poly Pizza Ad Board is a blank sign |
| Basketball hoop with backboard | - | gap | - | KayKit hoops are game rings; Poly Pizza Armory_3D hoop (1328 tris) has no backboard |
| Bicycles / bike rack | - | gap | - | nothing CC0 in this style found |
| Drinking fountain (수돗가) | - | gap | - | Pretty Park fountain is an ornamental park fountain (1646 tris) |
| Ground: track oval, lines, centre circle, sand pit, dirt/grass | - | keep procedural | - | current code already paints these; photo CC0 textures (ambientCG / Poly Haven) were judged a worse fit |

## Gaps no free pack covers (stay hand-built or model ourselves)

Football goals (gameplay colliders), assembly podium, PA horn poles, tall waving flagpoles, bunting strings, sliding gate leaves and pillars, school clock and name plate, plain pull-up bars, tug-of-war rope, medal podium, a real scoreboard, a basketball hoop with backboard, bicycles / bike rack, a 수돗가 drinking fountain. All of these are simple shapes; five of them (goals, podium, flagpoles, PA poles, gate) already exist hand-built.

## Options

### Option A - KayKit-spec core + two Kenney gap-fillers (recommended)

Small props, greenery and playground from KayKit (Forest, Platformer, City Builder, Holiday, Mini-Game Variety) and Tiny Treats (Fun Playground, Pretty Park), which share one technical spec (gradient atlas, same sizing); school facade from Kenney Modular Buildings; stands and tents from Kenney Racing Kit.

- Pros: one look across almost everything (rounded, chunky, soft gradient) and the same spec as the KayKit furniture already shipped through `kaykitFurniture.js` / `KaykitProps.jsx`; the only free CC0 playground set found that matches is in this family; most sports-day items exist (hurdles, finish gantry, cones, flags, balls); trees read well from the top.
- Cons: higher triangles per item (KayKit 300-1600 vs Kenney 60-300; mock A 26.9k solid tris on the whole board, 22 model types); six gradient atlases + the Kenney colormap + Racing material colours = several textures unless merged at build time; the school and stands are Kenney, so there is a mild seam (flat colormap vs gradient) - in the mock it reads acceptably; Racing Kit needs a recolour table.
- Mock: `mock\mock_A_*.png`, 113 instances, 26,868 solid tris (swing_A_large alone is 3,232; the small swing cuts about 2.5k).

### Option B - all Kenney colormap kits (+ Tiny Treats playground only)

Modular Buildings school, Racing stands/tents/banner towers, Fantasy Town hedges/fences/lanterns, Coaster stalls/benches/bins/trees, Roads cones, Minigolf flags; playground still from Tiny Treats (Kenney has none).

- Pros: lowest triangles (mock B 17,358 solid, 20 types), one colormap convention for most kits, crisp flat look.
- Cons: Kenney kits differ in scale and detail level; several needed kits are the old material-colour kind (pastel in three.js, need recolour); few sports-day items (no hurdles, balls, finish line besides Racing's overhead); trees and hedges look thinner and more generic; playground is still Tiny Treats so it is mixed anyway.
- Mock: `mock\mock_B_*.png`.

### Option C - minimal swap (keep the six hand-built props)

Keep goals, podium, flagpoles, PA poles, jungle gym and bleachers as they are; swap only the boxy surroundings: school facade (Modular Buildings), plane trees and bushes (KayKit Forest), hedges/flowers (Pretty Park), fence (Fun Playground), plus a few sports-day items.

- Pros: smallest risk (no change to colliders, claims or saved Studio part paths under `authored-static-volumes`), about 10 model types.
- Cons: not a whole-board swap; stands and podium keep the box-built look next to the new props.

## Recommendation: Option A

Reasons: it is the only combination that covers the playground, greenery and sports-day dressing in one consistent style; it is the same asset spec the project already ships (KayKit furniture), so the existing one-GLB pipeline and toon + inverted-hull treatment apply directly; the two Kenney pieces fill exactly the two roles KayKit has nothing for (a multi-storey school block, bleachers/tents) and both are cheap (44 and 128 tris per tile/module). Keep the hand-built gameplay pieces (goals, gate, flagpoles, PA poles, podium, bunting) and the procedural ground.

Budget notes for the implementation brief:

- Triangles: mock A board total 26.9k solid; with the small swing and Tree_2_A instead of Tree_1_A for half the row, about 22k. Outline hulls double what is drawn, but the camera sees only part of the board at once, so the visible total should stay under 40k. Not measured in the game.
- Draw calls: one fill + one outline InstancedMesh per model type (current `KaykitProps.jsx` pattern) gives 2 x 22 = 44 for mock A, above the ~24 target. Options: cap the set at about 10-12 types, or bake every static decor piece into merged meshes per texture (like `bakeStaticRecords`), which needs the atlases merged into one texture first (the KayKit-spec gradient atlases can be downsampled to 128-256 px each per the authors and packed into one 1024 atlas with a UV offset per source), giving 2 draw calls for all static decor.
- Scale used in the mock (game units): Modular tile x2.6, Racing grandStand x2.5, Racing tentLong x2.4, KayKit trees fitted to 4.2 tall (about x1.0), Tiny Treats slide to 1.8 tall (about x0.45), fence to 2.3 wide (about x0.96). glTF +Z front faces the game camera without rotation; side stands use +-90 deg yaw.

## Sizes

- All archives downloaded this session: about 185 MB (Kenney 15 kits 62.5 MB, KayKit 6 packs 59.9 MB, Tiny Treats 3 packs 11.7 MB, MarinsPixel 25.7 MB, peste 2.4 MB, OpenGameArt 6 items 22.6 MB, Poly Pizza 0.14 MB). Environment folder on disk with extractions: 595 MB.
- Archives needed for Option A: Modular Buildings 1.8 + Racing 6.1 + KayKit Forest 6.4 + Platformer 23.8 + Holiday 13.4 + City Builder 4.9 + Tiny Treats Fun Playground 5.1 + Pretty Park 3.0 = about 64.5 MB (Mini-Game Variety already on disk).
- Bundled GLB estimate for the 32-model recommended set (`manifests\recommended_set.json`): one uncompressed Blender GLB export = 788 KB (14,076 tris, 7 distinct texture PNGs whose source files total about 172 KB). After the same gltf-transform merge/dedup/prune/quantize/meshopt steps used for `furniture_kaykit.glb` (121 KB for 22 models), an estimated 250-350 KB with the original atlases, or about 120-200 KB with the atlases merged/downsampled. gltf-transform was not run, so these two figures are estimates.

## Not downloaded, and why

- Paid tiers: KayKit City Builder EXTRA ($3.95, adds 16 park assets - the "City Builder Extra" of the earlier survey), Forest/Platformer EXTRA ($9.99), Holiday EXTRA ($4.99), Mixed Bag EXTRA ($3.99), Tiny Treats Source ($3.95), Lambda Games Low Poly Park (paid).
- Licence: crazydrpants Playground/Park (CC BY 4.0), VNBP Low Poly 3D Park Set (CC BY 4.0), OGA Park Props Lowpoly (CC-BY 3.0 / CC0 dual, vertex-colour shader), Quaternius (excluded by rule), Google Poly / Zsky / other CC-BY Poly Pizza items.
- No licence stated: kryganas low poly parks, Skfod Natural Park, CursedLake PS1 Playground, victorcstr Playground.
- Too heavy / wrong style: OGA Park Furniture (17.8k tris, 1-2k textures); ambientCG / Poly Haven photo textures (CC0, checked, not downloaded).
- Downloaded but not recommended: MarinsPixel Playground Builder (page says CC0, but the zip's License.txt adds "You may not repackage, redistribute or resell the models, no matter how much they are modified" - contradicts CC0, treat as not clean); peste Kids Park (CC0 but 1.2k-6.5k tris per item); MarinsPixel items are also heavy (swing 7.3k, carousel 5-9k tris); Kenney Retro Urban (photo-pixel style); OGA Moscow school (11.7k tris, photo textures); OGA soccer field (one 8k-tri piece).

## Could not verify

- How the swap looks under the game's real toon material, outline hull and lighting: the pictures are Blender Workbench renders, not the game. No in-game screenshot of the current Stage 6 was taken.
- Visible-triangle and draw-call numbers in the game; the bundle size after gltf-transform.
- Uploader-declared licences on OpenGameArt and Poly Pizza (authorship cannot be checked).
- itch.io browse/tag listings were not crawled; more CC0 packs may exist there.
