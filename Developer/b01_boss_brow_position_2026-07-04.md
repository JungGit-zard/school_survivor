# B01 Boss Brow Position

Date: 2026-07-04

## Change

- Added explicit `leftBrow` and `rightBrow` entries to `B01_BOSS_FACE_LAYOUT`.
- Rendered both brow blocks above the boss zombie eyes using the existing toon `ZBlock`.

## Verification

- `npm test -- src/components/ZombieMesh.test.js`
- `npm run build`

