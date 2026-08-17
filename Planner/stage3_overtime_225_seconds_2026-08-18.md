# Stage 3 무한모드/overtime 225초 시작

- 작성: Level_Mini (levelmini)
- 날짜: 2026-08-18
- 범위: Stage 3 overtime 첫 혼합 일반 좀비 스폰 시작 시각만 변경

## 사용자 확정값

- Stage 3 무한모드/overtime 첫 스폰은 225초(3분 45초)다.
- Stage 1·2·4의 overtime 첫 스폰은 기존 300초(5분 00초)를 유지한다.
- 이후 cadence는 기존 30초 간격을 유지한다: Stage 3은 225초, 255초, 285초, ... / Stage 1·2·4는 300초, 330초, 360초, ...
- 한 tick의 요청 수는 기존 30마리를 유지하며, 동시 좀비 상한 150마리와 중복 tick 방지는 유지한다.

## 비범위 잠금

- 보스 150초 정본은 변경하지 않는다.
- 마틸다 210초 정본은 변경하지 않는다.
- CompassBlade, weaponCatalog, Tumbler는 변경하지 않는다.
- Stage 1의 overtime E04 제외 풀은 유지하고, Stage 2·3·4의 기본 일반 좀비 풀은 유지한다.

## Acceptance criteria

1. Stage 3 tick boundary: 224.999초에서는 overtime tick이 없고, 225초에는 tick 0이 생성된다.
2. Stage 3 cadence: 254.999초는 tick 0 유지, 255초는 tick 1로 진행한다.
3. Stage isolation: Stage 1·2·4는 225초에 발화하지 않고 300초부터 tick 0이 생성된다.
4. 중복 방지: 이미 tick 0을 발화한 뒤 225.5초(Stage 3)에서는 재발화하지 않는다.
5. 런타임 배선: Enemies scheduler가 current stage id를 overtime selector에 전달한다.
6. 기존 규칙 보존: 요청 수 30, 30초 간격, 동시 상한 150, Stage 1 E04 제외 풀을 변경하지 않는다.

## QA handoff — Balance_QA_Mini

- 집중 테스트: `npm test -- src/components/Enemies.test.jsx -t "all-stage overtime mixed ordinary reinforcements"`가 통과해야 한다.
- 회귀 묶음: `npm test -- src/components/Enemies.test.jsx src/components/Game.runtimeTime.test.js src/lib/burstEvents.test.js src/lib/stageConfig.test.js`가 통과해야 한다.
- 수동 확인 시 Stage 3 장기 생존/무한모드에서 225초 첫 보강이 보이고, Stage 1·2·4에서는 225초 보강이 보이지 않는지 확인한다.
