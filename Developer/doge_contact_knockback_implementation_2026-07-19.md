# 도지 접촉 넉백 구현 기록 — 2026-07-19

## 변경 범위

- `Developer/r3f_prototype/src/components/DancingDogeEvent.jsx`
- `Developer/r3f_prototype/src/components/DancingDogeEvent.test.jsx`
- `Developer/r3f_prototype/src/lib/dogeEscape.js`
- `Developer/r3f_prototype/src/lib/dogeEscape.test.js`

## 구현

- 기존 도지 몸통의 비센서 `CuboidCollider`는 그대로 유지했다.
- 몸통보다 각 축이 조금 큰 별도 sensor `CuboidCollider`를 추가했다.
- `resolveDogeContactKnockback` 순수 함수가 `_applyKnockback` 함수가 있는 플레이어 RigidBody만 넉백 명령으로 판정한다.
- 게임 진행 중이고 도지가 리빌·생존·미도주·미종료 상태일 때만 도지 중심에서 플레이어 방향으로 `dogeKnockbackVelocity`를 계산해 일반 좀비 피격과 같은 `4 units/s`, `160ms` 넉백 명령을 반환하고, component가 이를 적용한다.
- 300ms 쿨다운으로 같은 접촉의 연속 이벤트를 막는다. 순수 단위 테스트는 방향·지속시간·쿨다운·비플레이어 무시·비활성 상태를 직접 확인한다.
- 피해, HP, SFX, Firebase 데이터, 밸런스 수치는 변경하지 않았다.

## 2026-07-23 조정

- 도지의 과거 과장 넉백(`7 units/s`, `240ms`)을 일반 좀비 피격과 같은 값(`4 units/s`, `160ms`)으로 교체했다.
- 도지 접촉은 여전히 피해를 주지 않고, 센서 크기·도주·쿨다운·SFX는 변경하지 않았다.

## 검증

- `DancingDogeEvent.test.jsx`와 `dogeEscape.test.js` focused test를 실행해 센서/조건/넉백 계산 계약을 확인한다.
