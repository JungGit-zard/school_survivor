# Player leg outline validation - 2026-07-07

## Scope

- 주인공 다리 파츠 외곽선 누락 수정 검증.

## Verified

- `npm test -- src/components/PlayerMesh.test.js`
  - PASS: 1 file, 6 tests.

## Notes

- `PlayerMesh.test.js`가 양쪽 다리 리그 안에 각각 3개의 `OutlineBlock`이 있는지 확인한다.
