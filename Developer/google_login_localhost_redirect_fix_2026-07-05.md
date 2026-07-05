# Google login localhost redirect fix - 2026-07-05

## Problem

The app forced local dev `localhost:5173` to `127.0.0.1:5173` to share Graphics Studio storage. Firebase Google popup auth can reject `127.0.0.1` when only `localhost` is authorized, causing login to close or fail.

## Fix

Removed the automatic host canonicalization. The game now stays on the user-opened host. Cross-origin studio sync is handled by the Game URL bridge instead.

## Verification

- `npm test -- src/App.virtualJoystick.test.jsx src/components/GraphicsStudio.test.jsx src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js`
- `npm run build`

