# Stage 1 40초 녹색좀비·웃는좀비 추가 고정 스폰 정본

날짜: 2026-08-09
작업자: Level_Mini
범위: Stage 1 버스트 스폰 타임라인, 초반 난이도 보강, 런타임 소비 경로 검증, QA 인계
관련 태스크: t_252aaf90
필수 문서 receipt: eb875ec743e7c7e64fe63494ad865ca7de4d1e46708e57d7347f4f6d763e4f5f
matched_domains: gameplay, qa
match_evidence: gameplay keyword `stage`, qa keyword `regression`

## 정본

Stage 1에서만 정확히 0분 40초 = 40초에 기존 스폰을 보존한 채 추가 고정 스폰을 발화한다.

- 녹색좀비 `E01`: 5마리
- 웃는좀비 `E07`: 3마리
- 총 추가 일반 좀비: 8마리

Stage 2, Stage 3, Stage 4에는 이 40초 보강을 추가하지 않는다.

거리·범위 수치 변경 없음. 맵 24블록 = 96 units, 일반 적 스폰 반경 8.5–12.5 units (2.1–3.1 블록), 적 접촉 거리/스탯은 기존 정본을 유지한다.

## 보존 규칙

- Stage 1 기존 0초 E01 16마리, 24초 E01 8마리, 60초 E02 4마리 등 기존 버스트는 삭제하지 않는다.
- 전 스테이지 1분 50초 = 110초 `E07` 3마리 + `E02` 3마리 보강은 그대로 유지한다.
- Stage 1 2분 30초 = 150초 `E07` 5마리 + `E01` 5마리 보강은 그대로 유지한다.
- Stage 1 기존 웨이브, B01 보스, 마틸다, 300초 이후 오버타임 혼합 보강은 변경하지 않는다.
- 적 스탯, AI, 모델, 오디오, Firebase, Graphics Studio, 타이틀, 스테이지 길이, 보스/마틸다/오버타임 타이밍은 변경하지 않는다.

## 구현 의도

40초는 Stage 1 초반 E01 단일 온보딩이 끝나고 다음 타입 압박으로 넘어가기 직전이다. E01 5마리는 기존 학습 적으로 밀도를 보강하고, E07 3마리는 웃는좀비를 조기에 소량 노출해 110초/150초 보강 전에 플레이어가 타입을 인지하게 한다.

## Acceptance criteria

1. `Developer/r3f_prototype/src/lib/burstEvents.js`의 Stage 1 `BURST_EVENTS`에 `{ sec: 40, type: 'E01', count: 5 }`가 정확히 1개 있다.
2. `Developer/r3f_prototype/src/lib/burstEvents.js`의 Stage 1 `BURST_EVENTS`에 `{ sec: 40, type: 'E07', count: 3 }`가 정확히 1개 있다.
3. `STAGE2_BURST_EVENTS`, `STAGE3_BURST_EVENTS`, `STAGE4_BURST_EVENTS`에는 위 40초 `E01` 5마리 또는 `E07` 3마리 이벤트가 없다.
4. 기존 0초/24초/60초 Stage 1 버스트, 110초 전 스테이지 보강, 150초 Stage 1 보강은 삭제·치환 없이 유지된다.
5. 런타임 경로 `getRuntimeBurstEventsForStage('stage1')`에서도 40초 E01/E07 이벤트가 보인다.
6. 실제 소비 경로는 `stageRuntime.burstEvents` → `shouldScheduleBurst` → `enqueueScheduled(SCHEDULE_BURST, burstIndex, sec)` → `cache.burstEvents[Math.trunc(a)]` → pooled `addEnemies(batch, true, cache.spawnToken)`이다.
7. `E01`과 `E07`은 `isPooledEnemyType` true이며 `ENEMY_STATS`에 등록되어 있다.

## QA handoff — Balance_QA_Mini

- Stage 1 실제 플레이 또는 런타임 이벤트 로그에서 40초 전후에 기존 0초/24초 버스트가 보존된 상태로 E01 5마리 + E07 3마리가 추가되는지 확인한다.
- Stage 2~4 실제 플레이 또는 런타임 이벤트 로그에서 40초 E01/E07 보강이 발화하지 않는지 확인한다.
- 40초 보강, 110초 전 스테이지 보강, 150초 Stage 1 보강이 서로 삭제·치환 없이 모두 발화하는지 확인한다.
- 모바일 Stage 1 루프에서 40초 밀도 피크가 초보자 즉사감이나 프레임 급락을 만들지 않는지 확인한다.
