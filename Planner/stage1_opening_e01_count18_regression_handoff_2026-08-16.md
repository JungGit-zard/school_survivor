# Stage 1 오프닝 E01 18마리 버스트 제거 회귀 기준 (2026-08-16)

## 목적
- Stage 1 초반 모바일 체감 안정화를 위해 오프닝 `E01` 18마리 버스트가 런타임에 다시 예약되지 않도록 회귀 테스트로 고정한다.
- 첫 일반 런타임 버스트는 5초 `E01` 10마리로 복구하고, 기존 0초 `E01` 18마리 버스트 제거 상태는 유지한다.

## 수용 기준
1. Stage 1 런타임 좀비 버스트 중 첫 웨이브 기준 5초(= 5초 / 블록 환산 없음: 시간 규칙) 이전 `E##` 이벤트가 없다.
2. Stage 1 런타임 이벤트 전체에 `{ type: 'E01', count: 18 }` 조합이 어느 시점에도 없다.
3. Stage 1 런타임 첫 일반 좀비 이벤트는 `{ sec: 5, type: 'E01', count: 10 }`이고, 다음 고정 버스트는 `{ sec: 24, type: 'E01', count: 9 }`이다.
4. `burstEvents.test.js`와 `Enemies.test.jsx`의 Stage 1 회귀 테스트가 위 규칙을 검증한다.

## 검증 명령
- `cd Developer/r3f_prototype && npx vitest run src/lib/burstEvents.test.js --maxWorkers=1 --no-file-parallelism`
- `cd Developer/r3f_prototype && npx vitest run src/components/Enemies.test.jsx -t "does not schedule Stage 1 runtime zombie bursts" --maxWorkers=1 --no-file-parallelism`
- `git diff --check -- Developer/r3f_prototype/src/lib/burstEvents.js Developer/r3f_prototype/src/lib/burstEvents.test.js Developer/r3f_prototype/src/components/Enemies.test.jsx`

## Balance_QA_Mini 인계 메모
- 모바일 실기기/브라우저 QA에서는 Stage 1 시작 후 0~5초 구간에 오프닝 18마리 무리가 보이지 않는지 확인한다.
- 5초에는 복구된 첫 정상 고정 버스트 `E01` 10마리가 체감되고, 24초 전후에는 다음 고정 버스트 `E01` 9마리만 추가 체감되는지 확인한다.
- 이 변경은 거리/사거리 규칙이 아니라 시간·마릿수 회귀 규칙이므로 블록 단위 환산 대상은 없다.
