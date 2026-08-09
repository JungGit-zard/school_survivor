# Hanako Graphics Studio visual wiring record — 2026-08-09

## Scope
- Kanban task: `t_ff24f4c8`
- Visual asset/preview target: Hanako companion visual as a Graphics Studio weapon-model preview item.

## Graphics decision
- Hanako remains a toon 3D companion visual (`HanakoModel`) with outline/toon material treatment from `components/Weapons/Hanako.jsx`.
- Graphics Studio item ID is `weapon-hanako`, matching the model's `StudioTunedGroup itemId`.
- Catalog icon is `assets/weapon_icon/15_wea_hanako.svg`.
- Preview renders the actual 3D `HanakoModel`, scaled like Chibiko companion preview, not a 2D sprite or debug proxy.

## Gameplay boundary
- Hanako was intentionally not registered as a normal weapon catalog entry and not exposed through upgrade acquisition cards.
- This record is limited to Graphics Studio catalog/preview availability and runtime mounted model preservation.

## Verification
- Focused Vitest suite passed: 6 files / 94 tests.

## 2026-08-09 finalize note — t_e30aaf89
- Provenance retained: original Hanako 3D/source/icon work was created by Three_Mini card `t_f99fe441` and this record continues that Hanako asset trail.
- Final visual check scope: Hanako remains a 3D toon model with pink kimono, black bob haircut, cherry blossom hairpin, toon materials, and outline meshes; no 2D sprite/debug proxy substitutes were introduced for runtime or Studio preview.
- Final Studio contract: `StudioTunedGroup itemId="weapon-hanako"`, Studio catalog icon `15_wea_hanako.svg`, and Graphics Studio preview branch `type === 'hanako'` rendering `<HanakoModel />` are preserved.
- Runtime companion contract remains behind Chibiko with `HANAKO_TRAIL_FOLLOW_DISTANCE = 1.44`.
