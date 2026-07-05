# Graphics Studio game origin sync fix - 2026-07-05

## Problem

The game and Graphics Studio can be opened as `127.0.0.1:5173` and `localhost:5173`. Browsers treat those as separate origins, so `localStorage` studio tuning changes do not cross between them.

## Fix

During local dev on port `5173`, `localhost` is canonicalized to `127.0.0.1` before the app routes. This keeps the game and studio on the same origin and storage bucket.

## Verification

- `npm test -- src/App.virtualJoystick.test.jsx src/components/GraphicsStudio.test.jsx src/components/StudioTunedGroup.test.jsx src/components/GraphicsStudioPreview.test.js`
- `npm run build`
- `npm test`

