# Level_Mini 작업 기록 — 전 스테이지 5:00 이후 혼합 보강/150 상한

날짜: 2026-08-09
작업자: Level_Mini
작업 범위: Enemies 런타임 보강 스케줄, 타입 풀, 동시 좀비 상한, 테스트/기획 기록

## 구현 요약
- 전 스테이지 300초부터 30초마다 혼합 일반 좀비 보강을 요청하는 pure helper를 추가했다.
- 각 보강 타입 선택은 스테이지 풀에서 요청 수량만큼 독립 균등 무작위 추첨하며, 첫 순회에서 모든 타입을 강제 보장하지 않는다.
- 보강 1회는 30마리를 요청하지만 pooled active + special active + deferred queue 합산 기준 150마리를 넘지 않도록 clamp한다.
- Stage 1 타입 풀은 `E01,E02,E03,E05,E06,E07`로 유지해 E04 제외 규칙을 보존했다.
- Stage 2~4 타입 풀은 `E01,E02,E03,E04,E05,E06,E07`이다.
- 적 풀 `MAX_ENEMIES`는 150으로 고정했다.

## 변경 파일
- `Bang_Rules.md`
- `Planner/all_stages_overtime_mixed_30_max_150_2026-08-09.md`
- `Developer/agent_room/levelmini_all_stages_overtime_mixed_30_max_150_2026-08-09.md`
- `Developer/r3f_prototype/src/lib/enemyEntityPool.js`
- `Developer/r3f_prototype/src/lib/enemyEntityPool.test.js`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/Enemies.test.jsx`
- `Developer/r3f_prototype/src/lib/weaponTargeting.test.js`

## 검증
- Focused: `npm test -- src/components/Enemies.test.jsx -t "all-stage overtime mixed ordinary reinforcements"`
  - 결과: 1 file passed, 4 tests passed, 89 skipped.
- Build: `npm run build`
  - 결과: 성공. Legacy B02 artifact gate와 hosting asset verification 통과.
- EnemyEntityPool: `npm test -- src/lib/enemyEntityPool.test.js`
  - 결과: 1 file passed, 19 tests passed.
- Full Enemies vitest: `npm test -- src/components/Enemies.test.jsx`
  - 결과: 1 file failed, 8 failed / 85 passed / 93 total.
  - 분류: 실패 항목은 기존 브랜치의 명시 버스트/보스 호위/문자열 센티널 기대치와 현재 구현 불일치에 걸린 baseline 성격이다. 이번 보강 focused 테스트 4개는 통과했다.

## QA handoff — Balance_QA_Mini
- 5:00 이후 30초마다 새 보강이 체감되는지 장시간 플레이로 확인한다.
- Stage 1 장시간 플레이에서 E04가 스폰되지 않는지 확인한다.
- Stage 2~4에서는 E07까지 포함한 일반 좀비 혼합이 등장하는지 확인한다.
- 150 상한에서 기존 좀비가 삭제되지 않고 신규 보강만 줄어드는지 확인한다.
