# 로자리 동복 1차 (Rosari winter uniform, pass 1)

- Date: 2026-10-27 KST
- Request (Terry): "로자리의 동복을 1차 완료 해놓아라" / "로자리의 동복이라는 것은 옷장 안에서 갈아입는 것이다."
- Worker: threemini (Three_Mini). Status: pass 1. Visual sign-off and an approved 2D concept are still pending.

## Design source

No approved 동복 2D concept, reference image, design doc or earlier branch work exists in the repo,
`Graphic_designer/`, `Planner/`, git history (all refs) or the Hermes notes (searched 동복/하복/winter/uniform/outfit/costume/wardrobe/의상).
Pass 1 derives from the existing uniform identity:

- the Rosari room GLB `public/assets/rosari-room/PLAYER_wholebody_refined_t_efe49b7c.glb`: red long-sleeve jacket with white cuffs, pink-white collar, yellow tie, navy skirt and white socks;
- the title/key art: Rosari in a red blazer, navy plaid skirt and yellow tie; zombie students in navy blazers with red ties and plaid bottoms.

Per project policy (2D concept before 3D), pass 2 must replace these derived choices with an approved 2D concept.

## Pass 1 spec (same cut, heavier winter palette)

| Slot | Default (교복) | 동복 1차 |
|---|---|---|
| Blazer body + long sleeves | red | wine `#8a2639` |
| Lapels (new, extruded) | none | dark wine `#5e1627` |
| Shirt V under lapels (new) + cuffs | pink-white | white `#fffaf4` |
| Collar | pink-white | white `#fffaf4` |
| Tie | yellow | navy `#23305e` |
| Front buttons (new, 2) | none | gold `#e6b04a` |
| Skirt (matches blazer) | navy | deep wine `#5c1d2d` |
| Legs + socks | skin + white socks | charcoal tights `#2c2733` |
| Hair, face, hands, shoes, backpack | unchanged | unchanged |

Budget: the S-tier silhouette is unchanged. The new accessories (shirt V, two lapels, two 8-segment buttons) add about 100 triangles in 3 meshes, all inside the torso silhouette. Toon gradient and the 2px screen-space outline are the same as the room's.

## Where it lives

- Selected only inside the Rosari room wardrobe (옷장 → 학교 교복 / 동복). The default stays 학교 교복.
- Session-only React state. No localStorage, Firebase or new settings key.
- Applies only to the room's own clone of the GLB. The Graphics Studio, game and title player, `playerAppearance` and Studio tuning are not touched.
- Code: `Developer/r3f_prototype/src/lib/rosariOutfits.js` and `Developer/r3f_prototype/src/components/RosariRoom.jsx`.

## Left for pass 2

- An approved 2D 동복 concept (plaid skirt pattern, ribbon vs tie, blazer emblem/pocket, shoes or loafers, optional muffler or cardigan).
- Plaid skirt via a small atlas texture (the GLB has no UVs on the skirt, so it needs a UV pass).
- A decision on whether the winter uniform should reach the in-game player. That requires the Studio-tuned path and the `playerAppearance` work (separate Rosari game-model session), not this room clone.
- A wardrobe preview thumbnail, and UI review by uimini.
