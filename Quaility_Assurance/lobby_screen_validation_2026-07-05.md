# Lobby Screen Validation - 2026-07-05

## Validated

- Title screen no longer starts a stage directly after login; it enters the lobby.
- Lobby `입장하기` calls the stage start flow with `stage1`.
- Lobby coin shop and ranking buttons call their parent navigation callbacks.
- Game result coin shop and ranking return paths still work through the previous-screen state.
- HUD clear-result next-stage button has `nextStageId` available again.

## Commands

- `npm test` -> passed, 85 files / 525 tests.
- `npm run build` -> passed.
- Playwright smoke -> passed, title -> lobby -> stage start on `127.0.0.1:5173`.

## Follow-up Check

- `npm test -- src/components/Lobby.test.jsx` -> passed, 1 file / 2 tests.
- `npm run build` -> passed.

## Bottom Navigator Check

- `npm test -- src/components/Lobby.test.jsx src/components/resultCoinShopFlow.test.jsx` -> passed, 2 files / 6 tests.
- `npm run build` -> passed.

## Pause Return Check

- `npm test -- src/components/HUD.test.jsx` -> passed, 1 file / 17 tests.
- `npm run build` -> passed.
