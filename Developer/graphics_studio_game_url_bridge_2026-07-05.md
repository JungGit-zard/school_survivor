# Graphics Studio game URL bridge - 2026-07-05

## Change

Graphics Studio now has a `Game URL` field and `Connect` button.

When connected, studio edits are sent to the opened game window with `postMessage`. The game receives the message, writes the graphics and SFX tunings into its own origin storage, and triggers the existing runtime update path.

## Limit

Browsers cannot attach to an already-open unrelated tab. `Connect` opens or focuses a named game window, then live edits sync to that window.

## Verification

- `npm test -- src/components/GraphicsStudio.test.jsx src/App.virtualJoystick.test.jsx src/components/GraphicsStudioPreview.test.js src/components/StudioTunedGroup.test.jsx src/lib/sfxRegistry.test.js`
- `npm run build`

Full `npm test` still has unrelated ranking/database rule failures.

