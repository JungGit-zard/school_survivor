# Graphics Studio persistent part preview fix - 2026-07-05

## Problem

After editing a part such as the shadow and then focusing another part, the studio preview showed the previous part at its original transform again.

## Fix

The preview now receives the full live tuning map and applies saved part/group tunings every frame, not only the currently focused part.

Reset remains the only way to bring a confirmed part back to its baseline.

## Verification

- `npm test -- src/components/GraphicsStudioPreview.test.js src/components/GraphicsStudio.test.jsx src/components/StudioTunedGroup.test.jsx`
- `npm run build`
- `npm test`

