# Graphics Studio viewport pan controls - 2026-07-05

## Change

- Enabled pan in `GraphicsStudioPreview` OrbitControls.
- Middle mouse drag pans the studio viewport.
- Left mouse drag rotates the view.
- Right mouse drag also pans the view.
- Pan uses screen-space movement so dragging up/down moves the visible view up/down.

## Verification

- `npm test -- src/components/GraphicsStudioPreview.test.js`
- `npm run build`
