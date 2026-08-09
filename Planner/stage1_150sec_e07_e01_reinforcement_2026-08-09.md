# Stage 1 150초 웃는좀비·녹색좀비 보강 정본

날짜: 2026-08-09
작업자: Level_Mini
범위: Stage 1 버스트 스폰 타임라인, 난이도 보강, QA 인계
관련 태스크: t_7524f1f1
필수 문서 receipt: 3d06b10ba75ab4c67969532c7e012930fe2cae5c99d1b4d321208907e0480ee6

## 정본

Stage 1에서만 정확히 2분 30초 = 150초에 기존 스폰을 보존한 채 추가 보강을 발화한다.

- 웃는좀비 `E07`: 5마리
- 녹색좀비 `E01`: 5마리
- 총 추가 일반 좀비: 10마리

Stage 2, Stage 3, Stage 4에는 이 150초 보강을 추가하지 않는다.

## 보존 규칙

- 기존 전 스테이지 1분 50초 = 110초 `E07` 3마리 + `E02` 3마리 보강은 그대로 유지한다.
- Stage 1 기존 웨이브, 기존 버스트, B01 보스, 마틸다, 300초 이후 오버타임 혼합 보강은 변경하지 않는다.
- Stage 2~4 버스트 테이블은 기존 110초 보강과 각 스테이지 고유 이벤트만 유지한다.
- 적 스탯, AI, 모델, 오디오, Firebase, Graphics Studio, 타이틀, 스테이지 길이, 보스/마틸다/오버타임 타이밍은 변경하지 않는다.

## 구현 의도

Stage 1의 중후반 진입 직전인 150초에 짧은 밀도 피크를 만들어 플레이어가 무기 성장 상태를 확인하게 한다. E07은 E01 대비 2배 스탯 압박을 주고, E01은 익숙한 기본 추격 밀도로 보강해 새 학습 부담 없이 긴장도를 올린다.

## Acceptance criteria

1. `Developer/r3f_prototype/src/lib/burstEvents.js`의 Stage 1 `BURST_EVENTS`에 `{ sec: 150, type: 'E07', count: 5 }`가 정확히 1개 있다.
2. `Developer/r3f_prototype/src/lib/burstEvents.js`의 Stage 1 `BURST_EVENTS`에 `{ sec: 150, type: 'E01', count: 5 }`가 정확히 1개 있다.
3. `STAGE2_BURST_EVENTS`, `STAGE3_BURST_EVENTS`, `STAGE4_BURST_EVENTS`에는 위 150초 `E07` 5마리 또는 `E01` 5마리 이벤트가 없다.
4. 기존 110초 보강 `{ sec: 110, type: 'E07', count: 3 }`와 `{ sec: 110, type: 'E02', count: 3 }`는 Stage 1~4 모두 유지된다.
5. 런타임 경로 `getRuntimeBurstEventsForStage('stage1')`에서도 150초 E07/E01 이벤트가 보이고, 두 타입은 pooled enemy spawn path로 라우팅된다.
6. Stage 2~4 런타임 경로에는 150초 E07/E01 보강이 없다.

## QA handoff — Balance_QA_Mini

- Stage 1 실제 플레이에서 150초 전후에 기존 스폰이 끊기지 않고 E07 5마리 + E01 5마리가 추가되는지 확인한다.
- Stage 2~4 실제 플레이 또는 런타임 이벤트 로그에서 150초 E07/E01 보강이 발화하지 않는지 확인한다.
- 110초 전 스테이지 보강과 Stage 1 150초 보강이 서로 중복 삭제 없이 모두 발화하는지 확인한다.
- 중후반 밀도 증가가 모바일 Stage 1 루프에서 과도한 즉사감 또는 프레임 급락을 만들지 않는지 확인한다.
