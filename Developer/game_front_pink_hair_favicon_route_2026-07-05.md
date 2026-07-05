# Game front pink hair favicon route - 2026-07-05

## Change

- Added `Developer/r3f_prototype/public/favicon-game.svg`.
- Game front defaults to the pink-hair favicon.
- Graphics Studio keeps the existing block-face favicon via a small `/graphics-studio` pathname check in `index.html`.

## Verification

- `npm test -- src/faviconRoute.test.js`
- `npm run build`
- `/favicon-game.svg?v=20260705` and `/favicon.svg?v=20260705` both returned 200.
