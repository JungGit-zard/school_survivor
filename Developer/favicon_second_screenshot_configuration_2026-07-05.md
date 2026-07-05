# Favicon second screenshot configuration - 2026-07-05

## Change

- Replaced the empty favicon link in `Developer/r3f_prototype/index.html`.
- Added `Developer/r3f_prototype/public/favicon.svg`.
- The game front and Graphics Studio both use the same favicon because both routes share the Vite `index.html`.

## Verification

- `npm run build`
- `http://127.0.0.1:5173/` contains `/favicon.svg?v=20260705`.
- `http://127.0.0.1:5173/graphics-studio` contains `/favicon.svg?v=20260705`.
