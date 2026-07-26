# 전기충격기 체인 최근접 대상 수정 (2026-07-26)

## 원인

`EnemySpatialGrid`는 적의 active 수와 highest index만 비교해 최신 상태를 판정했다. 같은 적이 프레임 안에서 이동하면 grid cell membership은 이전 위치인데도 최신으로 오판했고, 전기충격기 체인 검색이 실제 최근접 후보를 누락할 수 있었다.

## 수정

- `EnemyEntityPool.spatialRevision`은 X/Z 위치 또는 활성 멤버십이 바뀔 때만 JavaScript 안전 정수 범위에서 단조 증가한다. `0`은 정상 revision이다.
- `Number.MAX_SAFE_INTEGER` 다음 변경에서는 revision을 `-1` exhaustion sentinel으로 전환하고 이후 유지한다. sentinel 상태는 정확성을 우선해 grid를 절대 최신으로 인정하지 않으므로 전수 검색 fallback을 사용한다.
- grid rebuild는 revision을 캡처하고, `isCurrentFor`는 active 수, highest index, non-negative 안전 정수 revision을 모두 비교한다.
- public `spawn`, `despawn`, `reset`, `setPosition`, `integrate`는 필요한 경우 revision을 갱신한다.
- 시뮬레이션 루프가 typed array 좌표를 직접 변경할 때는 적마다 갱신하지 않고, 이동 완료 후 한 번만 revision을 증가시킨 뒤 기존 최종 grid rebuild가 새 revision을 캡처한다.

## 검증

`stunGunChainNearestRegression.test.js`는 grid가 없을 때와 위치가 바뀐 뒤의 grid가 무효화된 때 모두 `(1, 1.5)`를 선택함을 확인한다.
