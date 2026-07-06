# Stage 1 vertical length two-thirds implementation - 2026-07-07

## Request

- 스테이지 1 세로 길이를 기존의 3분의 2로 줄인다.

## Implementation

- `Developer/r3f_prototype/src/lib/stageConfig.js`
  - `stage1.mapHalfZ`를 `27`에서 `18`로 변경했다.
  - 전체 Z 길이는 `54u`에서 `36u`가 된다.
- `Developer/r3f_prototype/src/lib/playerMovementBounds.test.js`
  - 플레이어 이동 가능 Z 범위 기대값을 `±23`에서 `±14`로 맞췄다.
- `Developer/r3f_prototype/src/lib/stageConfig.test.js`
  - Stage 1 경계값이 `halfX: 10`, `halfZ: 18`인지 확인하는 회귀 테스트를 추가했다.

## Notes

- X축 폭은 변경하지 않았다.
- 스폰 타임라인과 적 스탯은 변경하지 않았다.
