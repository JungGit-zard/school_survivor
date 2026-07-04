# Player flashlight lantern validation - 2026-07-04

## Scope

- Verify the student lantern attack uses a distinct player animation name.
- Verify the player mesh exposes the flashlight model layout.
- Verify Graphics Studio accepts and previews the named animation.

## Automated Checks

- `npm test -- src/components/PlayerMesh.test.js src/lib/playerArmAction.test.js src/components/Weapons/StudentLantern.test.jsx src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/GraphicsStudioPreview.test.js`
- Result: passed, 6 files / 30 tests.
- `npm run build`
- Result: passed. Vite reported only existing bundle-size / dynamic-import warnings.
- `npm test -- src/components/Weapons/StudentLantern.test.jsx src/components/PlayerMesh.test.js`
- Result: passed, 2 files / 7 tests after moving the beam origin to the flashlight lens and adding the held light cone.
- Re-ran the same test command after scaling the held cone to attack range.
- Result: passed, 2 files / 7 tests.

## Studio Smoke Check

- Opened `http://127.0.0.1:5199/graphics-studio#player` with Playwright.
- Selected Motion `lanternFlashlight`.
- Canvas PNG data length was `11706`, confirming the preview rendered nonblank.
- Screenshot: `Quaility_Assurance/screenshots/player-lantern-flashlight-studio-2026-07-04.png`
- Rechecked after the lens light cone change.
- Canvas PNG data length was `7134`.
- Screenshot: `Quaility_Assurance/screenshots/player-lantern-light-cone-studio-2026-07-04.png`
- Rechecked after attack-range cone scaling.
- Screenshot: `Quaility_Assurance/screenshots/player-lantern-attack-range-cone-studio-2026-07-04.png`
