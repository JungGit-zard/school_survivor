# Level_Mini 작업 기록 — Stage 1 40초 E01/E07 추가 고정 스폰

날짜: 2026-08-09
프로필: Level_Mini
관련 태스크: t_252aaf90
필수 문서 receipt: eb875ec743e7c7e64fe63494ad865ca7de4d1e46708e57d7347f4f6d763e4f5f
matched_domains: gameplay, qa
match_evidence: gameplay keyword `stage`, qa keyword `regression`

## 요약

Stage 1에서만 정확히 0분 40초 = 40초에 녹색좀비 `E01` 5마리와 웃는좀비 `E07` 3마리를 추가하는 선언형 버스트를 추가했다. Stage 2~4에는 40초 보강을 넣지 않았고, 기존 Stage 1 0초/24초/60초 버스트, 전 스테이지 110초 보강, Stage 1 150초 보강, 보스/마틸다/오버타임/스탯/AI/모델/오디오/Firebase/Studio/타이틀은 변경하지 않았다.

## 구현 파일

- `Developer/r3f_prototype/src/lib/burstEvents.js`
  - `STAGE1_40SEC_GREEN_SMILING_REINFORCEMENT_EVENTS` 추가
  - Stage 1 `BURST_EVENTS`에만 40초 `E01` 5마리 + `E07` 3마리 spread 추가
- `Developer/r3f_prototype/src/lib/burstEvents.test.js`
  - Stage 1 40초 type/count 정확성 테스트 추가
  - Stage 2~4 40초 미포함 테스트 추가
  - `getRuntimeBurstEventsForStage('stage1')` 런타임 포함 테스트 추가
- `Developer/r3f_prototype/src/components/Enemies.test.jsx`
  - 실제 런타임 소비 경로 `stageRuntime.burstEvents` → `SCHEDULE_BURST` → `cache.burstEvents` → pooled `addEnemies` 보존 테스트 추가
- `Developer/r3f_prototype/src/components/Enemies.jsx`
  - 런타임 버스트 HP 계산 주석을 현재 소비 경로와 맞게 갱신
- `Bang_Rules.md`
  - 상단 Stage 1 40초 보강 정본 규칙 추가
- `Planner/stage1_40sec_e01_e07_fixed_spawn_2026-08-09.md`
  - 기획 정본, acceptance criteria, Balance_QA_Mini 인계 기록 추가

## 수치 정리

- 발화 시각: 40초 = 0분 40초
- Stage 1 추가 수량: `E01` 5마리 + `E07` 3마리 = 총 8마리
- 기존 보존 수량:
  - 110초 = 1분 50초 전 스테이지 `E07` 3마리 + `E02` 3마리
  - 150초 = 2분 30초 Stage 1 `E07` 5마리 + `E01` 5마리
- 거리/범위 수치 변경 없음. 맵 크기, 스폰 반경 8.5–12.5 units (2.1–3.1 블록), 접촉 거리, 적 스탯은 모두 기존 정본 유지.

## 검증

- 집중 버스트 테스트: `npm test -- src/lib/burstEvents.test.js -t "Stage 1 40초 녹색좀비·웃는좀비 추가 스폰"` 통과.
- 런타임 wiring 테스트: `npm test -- src/components/Enemies.test.jsx -t "Stage 1 40s E01/E07"` 통과.
- 런타임 150초 보존 확인: `npm test -- src/components/Enemies.test.jsx -t "Stage 1 150s E07/E01"` 통과.
- 추가 집중/빌드/정적 점검 결과는 Kanban handoff에 기록한다.

## Balance_QA_Mini 인계

1. Stage 1 실제 플레이 또는 이벤트 로그에서 40초에 E01 5마리와 E07 3마리가 추가되는지 확인한다.
2. Stage 2~4에서는 40초 E01/E07 보강이 발화하지 않는지 확인한다.
3. 40초 보강 추가 뒤에도 Stage 1 기존 버스트, 110초 전 스테이지 보강, 150초 Stage 1 보강이 보존되는지 확인한다.
4. 모바일 Stage 1 루프에서 40초 밀도 피크가 과도한 초반 즉사감이나 프레임 급락을 만들지 않는지 확인한다.
