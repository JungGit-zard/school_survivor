# Level_Mini 작업 기록 — Stage 1 150초 E07/E01 보강

날짜: 2026-08-09
프로필: Level_Mini
관련 태스크: t_7524f1f1
필수 문서 receipt: 3d06b10ba75ab4c67969532c7e012930fe2cae5c99d1b4d321208907e0480ee6
matched_domains: gameplay
match_evidence: keyword `stage`

## 요약

Stage 1에서만 정확히 2분 30초 = 150초에 웃는좀비 `E07` 5마리와 녹색좀비 `E01` 5마리를 추가하는 선언형 버스트를 추가했다. Stage 2~4에는 150초 보강을 넣지 않았고, 기존 110초 전 스테이지 `E07` 3마리 + `E02` 3마리 보강과 보스/마틸다/오버타임/스탯/AI/모델/오디오/Firebase/Studio/타이틀은 변경하지 않았다.

## 구현 파일

- `Developer/r3f_prototype/src/lib/burstEvents.js`
  - `STAGE1_150SEC_SMILING_GREEN_REINFORCEMENT_EVENTS` 추가
  - Stage 1 `BURST_EVENTS`에만 150초 `E07` 5마리 + `E01` 5마리 spread 추가
- `Developer/r3f_prototype/src/lib/burstEvents.test.js`
  - Stage 1 150초 type/count 정확성 테스트 추가
  - Stage 2~4 150초 미포함 테스트 추가
  - 기존 110초 보강 보존 테스트 추가
- `Developer/r3f_prototype/src/components/Enemies.test.jsx`
  - `getRuntimeBurstEventsForStage('stage1')` 런타임 선택자와 pooled enemy 라우팅 보존 테스트 추가
- `Bang_Rules.md`
  - 상단 Stage 1 150초 보강 정본 규칙 추가
- `Planner/stage1_150sec_e07_e01_reinforcement_2026-08-09.md`
  - 기획 정본, acceptance criteria, Balance_QA_Mini 인계 기록 추가

## 수치 정리

- 발화 시각: 150초 = 2분 30초
- Stage 1 추가 수량: `E07` 5마리 + `E01` 5마리 = 총 10마리
- 기존 보존 수량: 110초 = 1분 50초의 전 스테이지 `E07` 3마리 + `E02` 3마리
- 거리/범위 수치 변경 없음. 맵 크기, 스폰 반경, 접촉 거리, 적 스탯은 모두 기존 정본 유지.

## 검증

- RED 확인: `npm test -- src/lib/burstEvents.test.js -t "Stage 1 2:30 웃는좀비·녹색좀비 보강"`가 구현 전 `expected [] to have a length of 1`로 실패했다.
- GREEN 확인: 같은 집중 테스트가 구현 후 통과했다.
- 런타임 wiring 확인: `npm test -- src/components/Enemies.test.jsx -t "Stage 1 150s E07/E01"` 통과.
- 추가 집중/빌드/정적 점검 결과는 Kanban 완료/차단 handoff에 기록한다.

## Balance_QA_Mini 인계

1. Stage 1 실제 플레이 또는 이벤트 로그에서 150초에 E07 5마리와 E01 5마리가 추가되는지 확인한다.
2. Stage 2~4에서는 150초 E07/E01 보강이 발화하지 않는지 확인한다.
3. 110초 전 스테이지 보강이 Stage 1 150초 보강 추가 뒤에도 보존되는지 확인한다.
4. 모바일 Stage 1 루프에서 150초 밀도 피크가 과도한 즉사감이나 프레임 급락을 만들지 않는지 확인한다.
