# 마틸다 실제 몸 접촉 즉사 1000ms 지연 정본

날짜: 2026-08-09
작업자: Level_Mini
범위: 마틸다 접촉 사망 타이밍, 카운트다운 규칙, QA 인계

## 정본

플레이어가 마틸다의 실제 몸 CuboidCollider 기반 회전 박스에 처음 접촉하면 즉시 사망하지 않는다. 게임플레이 delta 기준 정확히 1000ms = 1초 뒤 `killPlayer('matilda')`를 1회 호출해 기존 회색 전환, 마틸다 대사, 결과 화면을 시작한다.

## 접촉 판정 수치

기존 `getMatildaBodyHalfExtents`와 `isMatildaBodyContact`를 그대로 쓴다.

- 마틸다 B01 scale: 2.00
- halfX: 0.3733 units = 0.0933 블록
- halfZ: 0.2667 units = 0.0667 블록
- 플레이어 접촉 반extent: 0.136 units = 0.034 블록
- x축 접촉 한계: 0.5093 units = 0.1273 블록
- z축 접촉 한계: 0.4027 units = 0.1007 블록

## 카운트다운 규칙

- 첫 실제 몸 접촉에서만 카운트다운을 시작한다.
- 접촉 뒤 떨어져도 카운트다운은 취소하지 않는다.
- 반복 접촉해도 remainingMs를 1000ms로 재설정하지 않는다.
- `playing` phase의 `useFrame` delta로만 진행한다. paused/levelup/gameover에서는 외부 early return 때문에 진행하지 않는다.
- 모든 마틸다 상태(조준 `matildaAim`, 돌진 `charge`, 웃음 `matildaLaugh`)에서 동일한 body-contact wiring을 사용한다.

## 변경 금지 범위

마틸다 스탯, AI, 모델, 오디오, 타이틀, Firebase, Graphics Studio, 일반 적 피격/접촉 의미는 변경하지 않는다.

## Acceptance criteria

1. 첫 접촉 후 999ms까지 플레이어가 살아 있다.
2. 첫 접촉 후 누적 1000ms에 `killPlayer('matilda')`가 1회 호출된다.
3. 첫 접촉 후 이탈해도 카운트다운은 계속 진행된다.
4. 반복 접촉으로 카운트다운이 재시작되지 않는다.
5. 조준/돌진/웃음 상태 모두 동일한 실제 몸 접촉 판정을 공유한다.
6. 기존 회전 인식 몸 판정과 collider half extent 수치를 바꾸지 않는다.

## QA handoff — Balance_QA_Mini

- 마틸다와 접촉 직후 약 1초 동안 회피 입력이 가능한지 실제 플레이로 확인한다.
- 접촉 직후 빠져나와도 1초 뒤 사망 연출이 시작되는지 확인한다.
- 마틸다 웃음 정지 상태와 돌진 중 접촉이 같은 규칙을 따르는지 확인한다.
- 일시정지 중 1초 카운트가 진행되지 않는지 확인한다.
