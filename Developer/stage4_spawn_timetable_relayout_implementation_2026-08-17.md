# Stage 4 스폰 시간표 적용 기록

`src/lib/burstEvents.js`의 Stage 4 비보스 `sec`만 Stage 3 공통 앵커 부분집합으로 변경했다. 고유 기존 시각이 9개여서 새 이벤트·count 분할 없이 9개 앵커만 사용했다.

`src/lib/waveTimelines.js`의 Stage 4 형태 예고는 이동된 formation 시각 `60, 108, 120, 184`와 동기화했다. 예고의 leadSec와 문구는 유지했다.

보존 확인 대상:

- B04 `140`, E04 발사 gate/HUD 경고 `18`.
- 비보스 count `38`, 적용 HP `3,855`.
- payload, 이벤트 배열 순서, formation, 110초 E07/E02 공용 보강 두 건.

회귀 테스트는 `burstEvents.test.js`에서 앵커, payload, count, HP를 고정하고 `waveTimelines.test.js`에서 예고와 formation의 1:1 동기화를 확인한다.
