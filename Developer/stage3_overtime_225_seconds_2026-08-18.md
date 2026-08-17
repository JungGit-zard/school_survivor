# Stage 3 overtime 225초 런타임 반영

- 작성: Level_Mini (levelmini)
- 날짜: 2026-08-18
- 구현 파일: `Developer/r3f_prototype/src/components/Enemies.jsx`
- 테스트 파일: `Developer/r3f_prototype/src/components/Enemies.test.jsx`

## 구현 요약

- `STAGE3_OVERTIME_REINFORCEMENT_START_SEC = 225`를 추가했다.
- `getOvertimeReinforcementStartSec(stageId)`이 Stage 3에는 225초, Stage 1·2·4에는 기존 `OVERTIME_REINFORCEMENT_START_SEC = 300`을 반환한다.
- `overtimeReinforcementTick(elapsedSec, stageId)`와 `shouldScheduleOvertimeReinforcement(lastFiredTick, elapsedSec, stageId)`가 stage id를 받아 Stage 3만 225초 기준으로 tick을 계산한다.
- frame scheduler는 `usePlayingFrame` 실제 스코프에 존재하는 `stageRuntime.id`만 사용해 `shouldScheduleOvertimeReinforcement(overtimeTickRef.current, sec, stageRuntime.id)`로 현재 스테이지 ID를 전달한다.
- `usePlayingFrame` 내부 overtime scheduler 경로에서 undefined `cache.id` 참조가 재유입되지 않도록 source regression test를 강화했다.
- interval 30초, 요청 30마리, 동시 상한 150마리, 이미 발화한 tick 중복 방지는 변경하지 않았다.

## 잠금 확인

- 보스 150초 정본은 변경하지 않았다.
- 마틸다 210초 정본은 변경하지 않았다.
- CompassBlade, weaponCatalog, Tumbler는 이 Stage 3 overtime 작업에서 변경하지 않는다.
- Stage 1 overtime 풀의 E04 제외 규칙과 Stage 2·3·4 기본 일반 좀비 풀은 유지한다.

## 테스트 커버리지

`src/components/Enemies.test.jsx`의 `all-stage overtime mixed ordinary reinforcements` 묶음이 다음을 고정한다.

1. Stage 3: 224.999초 false/null, 225초 true/tick 0.
2. Stage 3: 254.999초 tick 0, 255초 tick 1.
3. Stage 1·2·4: start selector가 300초를 반환하고, 225초에는 Stage 1 기준 발화하지 않는다.
4. 중복 방지: Stage 3 tick 0 발화 후 225.5초는 재발화하지 않는다.
5. scheduler runtime wiring: Enemies source의 `usePlayingFrame` block이 `stageRuntime.id`를 overtime scheduler에 전달하고, 같은 block 안에는 `cache.id`가 없어야 한다.
6. 기존 보존: 30초 interval, 30마리 요청, 150마리 상한, Stage 1 E04 제외 풀.

## 실행 검증 기록

- RED probe: `Enemies.jsx`의 scheduler 호출을 메모리상에서 `cache.id`로 변조한 검사에서 `usePlayingFrame contains cache.id = True`, `stageRuntime.id call = False`, exit 1을 확인했다.
- `npm test -- src/components/Enemies.test.jsx -t "all-stage overtime mixed ordinary reinforcements"`
  - 결과: 1 file passed, 5 tests passed, 88 skipped.
- `npm test -- src/components/Enemies.test.jsx src/components/Game.runtimeTime.test.js src/lib/burstEvents.test.js src/lib/stageConfig.test.js`
  - 결과: 4 files passed, 163 tests passed.
- `git diff --check -- Developer/r3f_prototype/src/components/Enemies.jsx Developer/r3f_prototype/src/components/Enemies.test.jsx Planner/stage3_overtime_225_seconds_2026-08-18.md Developer/stage3_overtime_225_seconds_2026-08-18.md`
  - 결과: exit 0. Enemies 파일 2개는 기존 Git 속성/줄끝 warning(LF→CRLF 예정)만 출력되고 whitespace error는 없었다.

## QA handoff — Balance_QA_Mini

- acceptance는 Stage 3 225초 단독 발화와 Stage 1·2·4 300초 유지다.
- 모바일/실플레이 확인 시 Stage 3에서 3분 45초 첫 혼합 보강이 보이고, Stage 1·2·4에서는 같은 시각에 보강이 없는지 확인한다.
- 30초 cadence와 동시 상한 150 때문에 필드가 이미 가득 찬 경우 요청 수가 줄어드는 것은 기존 의도 동작이다.
