# Stage 1 vertical length two-thirds validation - 2026-07-07

## Scope

- Stage 1 교실 세로 길이를 기존 54u에서 36u로 줄인 변경 검증.

## Verified

- `npm test -- src/lib/stageConfig.test.js src/lib/playerMovementBounds.test.js`
  - PASS: 2 files, 9 tests.
- `npm run build`
  - PASS: Vite production build completed.

## Notes

- `npm test -- src/components/StageObjects/stageObjectPlacements.test.js`는 기존 Stage 2 책상 배치 기대값 불일치로 실패했다.
- 해당 실패는 Stage 1 세로 길이 변경과 직접 관련 없는 Stage 2 배치 변경 영역이다.
