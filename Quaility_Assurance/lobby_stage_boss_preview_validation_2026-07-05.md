# Lobby Stage Boss Preview Validation

Date: 2026-07-05

## Checks

- `npm test -- src/components/Lobby.test.jsx src/components/resultCoinShopFlow.test.jsx`
  - Passed: 2 files, 12 tests.
- `npm test -- src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/Lobby.test.jsx src/App.virtualJoystick.test.jsx`
  - Passed: 4 files, 37 tests.
- `npm test -- src/components/resultCoinShopFlow.test.jsx src/components/GraphicsStudioPreview.test.js`
  - Passed: 2 files, 13 tests.
- `npm test -- src/components/StageBossPreview.test.js src/components/GraphicsStudio.test.jsx src/components/Lobby.test.jsx`
  - Passed: 3 files, 22 tests.
- `npm run build`
  - Passed.

## Coverage

- Confirms the stage card preview space remains present.
- Confirms the lobby no longer uses the daily or weekly first-place preview text in that space.
- Rechecked after enlarging the preview camera framing.
- Confirms the old square `STAGE` badge is not rendered.
- Confirms the card hero title uses `Stage 1 - 교실 생존`.
- Confirms Graphics Studio saves stage boss preview zoom and pan.
- Confirms studio sync messages carry stage boss preview framing to the game window.
- Confirms the lobby reads saved stage boss preview framing.
- Confirms the boss preview is taller and the stage text is overlaid on top of it.
- Confirms the overlaid stage text is right-aligned.
- Confirms the stage boss preview recreates the R3F camera when zoom changes.
- Confirms the `입장하기` button lives inside the preview section.
- Confirms the `클리어` badge appears at the top-left after a stage clear.
- Confirms the stage label and Korean stage title are both rendered after splitting the title.
- Confirms the `점수 레코드` button lives inside the preview and sits below the clear badge.
- Confirms the stage card keeps thin inner padding while the boss preview uses the enlarged height.
- Confirms the lobby ambient light receives a translated screen position.
