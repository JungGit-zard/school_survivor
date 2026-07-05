# Lobby Screen Completion - 2026-07-05

## Scope

- Reviewed the existing lobby work left in `Developer/r3f_prototype/src/components/Lobby.jsx` and related modal/list components.
- Connected `App.jsx` so the title screen now enters the lobby first, and the lobby starts the selected stage.
- Kept coin shop and ranking returns aware of whether they were opened from the lobby or a game result.
- Restored the missing `nextStageId` calculation in `HUD.jsx` so the clear-result next-stage button cannot reference an undefined value.

## Verification

- `npm test` passed: 85 files, 525 tests.
- `npm run build` passed.
- Browser smoke passed on `http://127.0.0.1:5173/?e2e=1`: title -> lobby -> Stage 1 start.

## Follow-up Layout Update

- Moved `내 누적플레이` and `내 시즌최고점` into the `시즌` block instead of keeping them as a separate top-level header row.
- Verified with `npm test -- src/components/Lobby.test.jsx` and `npm run build`.

## Bottom Navigator Update

- Replaced the two top quick-action rows with a four-button bottom navigator: `능력치`, `무기`, `랭킹`, `상점`.
- Kept each button wired to the existing modal/navigation callback.
- Verified with `npm test -- src/components/Lobby.test.jsx src/components/resultCoinShopFlow.test.jsx` and `npm run build`.

## Pause Return Label Update

- Changed the in-game pause modal return action from `타이틀로 돌아가기` to `로비로 돌아가기`.
- The confirmed action now routes through the lobby callback when available.
- Verified with `npm test -- src/components/HUD.test.jsx` and `npm run build`.
