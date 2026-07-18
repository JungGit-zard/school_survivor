# Upgrade Icon Fallback Fix - 2026-05-25

## Request

- Level-up card weapon icon images were displayed as broken images.
- User asked to make all connected game icon images appear.

## Root Cause Notes

- `HUD.jsx` imports all 12 weapon icon PNG files and Vite includes them in the production build.
- Direct dev-server request for `01_wea_pencil.png.png` returned `200 image/png`.
- The PNG file itself opens correctly.
- The visible failure is therefore treated as a runtime image-load failure path: when an image fails in the browser, the UI previously kept the broken `<img>` element and did not fall back to the existing drawn icon.

## Change

- Exported `UpgradeIcon` for focused UI testing.
- Added image error handling in `UpgradeIcon`.
- When a weapon icon image fails to load, the card now switches to the existing drawn fallback icon instead of showing a broken image.
- Added `fallbackIconWrap` style so fallback icons stay centered in the same icon area.

## Files Changed

- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/HUD.test.jsx`

