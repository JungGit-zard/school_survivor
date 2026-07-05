# Graphics Studio single part outline - 2026-07-05

## Change

Single part focus now uses the same neon BoxHelper outline as grouped part focus.

The outline is updated every frame, so it follows the selected part's current scale, position, and rotation while editing.

## Verification

- `npm test -- src/components/GraphicsStudioPreview.test.js src/components/GraphicsStudio.test.jsx`
- `npm run build`

