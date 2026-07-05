# Graphics Studio part/group Apply runtime fix - 2026-07-05

## Problem

Graphics Studio saved confirmed whole-item tunings under keys like `player`, but part focus and grouped part edits were saved under keys like `player::part::0.1` and `player::group::0.1+0.2`.

The game runtime `StudioTunedGroup` only loaded the whole-item key, so Apply could show a confirmation while part/group transforms did not appear in the game.

## Change

- Added runtime application for saved `::part::` and `::group::` graphics tuning keys.
- Reused the same transform rules as the studio preview: scale, position, rotation, and material tuning.
- Added suffix path matching so game runtime roots still find parts when the studio preview has an extra wrapper group.
- Changed studio editing to live game updates: slider/input/reset/Ctrl+Z now save immediately so open game views receive the same storage/event update as Apply.

## Verification

- `npm test -- src/components/StudioTunedGroup.test.jsx`
- `npm test -- src/components/GraphicsStudio.test.jsx src/components/GraphicsStudioPreview.test.js src/lib/sfxRegistry.test.js`
- `npm run build`
- `npm test`
