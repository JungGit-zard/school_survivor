# Graphics Studio part/group Apply runtime validation - 2026-07-05

## Validation Summary

The Apply pipeline was checked for the reported issue where confirmed studio changes did not appear in the game.

## Confirmed

- Whole-item graphics tuning still updates game groups immediately after save.
- Saved part focus keys like `player::part::0` apply to runtime parts.
- Saved group keys like `player::group::...+...` apply to each grouped runtime part.
- Graphics slider/input/reset/Ctrl+Z changes now save immediately instead of waiting for Apply.
- Audio slider changes now save immediately for game playback.
- Runtime suffix matching covers the wrapper-path difference between studio preview and game model roots.
- Existing SFX tuning test still confirms saved audio volume/rate is read on playback.

## Commands

- `npm test -- src/components/StudioTunedGroup.test.jsx`
- `npm test -- src/components/GraphicsStudio.test.jsx src/components/GraphicsStudioPreview.test.js src/lib/sfxRegistry.test.js`
- `npm run build`
- `npm test`

## Result

All checked tests passed, including the full suite: 83 test files, 508 tests.
