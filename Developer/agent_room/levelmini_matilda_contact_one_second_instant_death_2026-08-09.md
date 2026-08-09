# Level_Mini 작업 기록 — 마틸다 접촉 1000ms 지연 즉사

날짜: 2026-08-09
프로필: Level_Mini
관련 태스크: t_d80fa255

## 요약

마틸다 실제 몸 접촉 즉사 규칙을 즉시 사망에서 첫 접촉 후 1000ms = 1초 gameplay countdown 사망으로 변경했다. 기존 CuboidCollider 기반 회전 body-box contact를 유지하며, 접촉 후 이탈/반복 접촉이 카운트다운을 취소하거나 재시작하지 않도록 했다.

## 구현 파일

- `Developer/r3f_prototype/src/components/Enemy.jsx`
  - `MATILDA_CONTACT_KILL_DELAY_MS = 1000` 추가
  - `createMatildaContactKillCountdown` 추가
  - `advanceMatildaContactKillCountdown` 추가
  - 마틸다 spawn/reset 시 countdown 초기화
  - `matildaAim`, `charge`, `matildaLaugh` 분기보다 앞에서 공통 body contact countdown 처리
  - 기존 charge-only 즉시 `killPlayer('matilda')` 제거

- `Developer/r3f_prototype/src/components/EnemyVisual.test.js`
  - 1000ms 지연, 이탈 후 지속, 반복 접촉 no-reset, 전 상태 wiring 보존 테스트 추가

- `Bang_Rules.md`
  - 최상단 정본 규칙 추가

- `Planner/matilda_contact_one_second_instant_death_2026-08-09.md`
  - 수치, acceptance criteria, QA 인계 문서 추가

## 수치 정리

- 지연 시간: 1000ms = 1초
- 마틸다 B01 scale 2.00 기준 halfX: 0.3733 units = 0.0933 블록
- 마틸다 B01 scale 2.00 기준 halfZ: 0.2667 units = 0.0667 블록
- 플레이어 접촉 반extent: 0.136 units = 0.034 블록
- x축 접촉 한계: 0.5093 units = 0.1273 블록
- z축 접촉 한계: 0.4027 units = 0.1007 블록

## 검증

- RED 확인: 신규 focused 테스트가 구현 전 실패했다.
- GREEN 확인: `npm test -- src/components/EnemyVisual.test.js -t "Matilda body contact delayed instant death countdown"`
  - Test Files: 1 passed (1)
  - Tests: 3 passed | 22 skipped (25)
  - pretest branch guard, Legacy B02 source gate, Dialogue store gate 통과

## Balance_QA_Mini 인계

1. 실제 모바일/플레이 루프에서 마틸다 첫 접촉 뒤 약 1초 후 사망하는지 확인.
2. 접촉 후 분리해도 1초 뒤 사망하는지 확인.
3. 반복 접촉해도 1초 타이머가 리셋되지 않는지 확인.
4. paused/levelup/gameover 중 countdown이 진행되지 않는지 확인.
