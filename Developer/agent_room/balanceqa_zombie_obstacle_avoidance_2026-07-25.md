# balanceqa — 좀비 장애물 끼임 acceptance 기록

작성일: 2026-07-25

## 승인 기준

- 타입별 반경 스폰은 obstacle overlap 0건이며 안전 후보가 없으면 `null`/개별 spawn skip이다.
- reveal 이전 첫 step부터 obstacle 내부 슬롯은 한 bounded resolution 안에 탈출하고, 경계·복수 AABB에서도 일반 적은 map boundary를 지킨다.
- 벽·모서리에서 축/접선 slide가 가능하고, stuck timer는 세대 재사용 슬롯에 남지 않는다.
- 축과 양접선이 모두 막힌 작은 cavity는 1.2초 hard-stuck 뒤 전역 안전 좌표로 실제 이동하며, 원점 재선택으로 타이머만 초기화하지 않는다.
- RZ 13명은 obstacle을 지나 우회한 뒤 원래 runDir로 복귀하고 `+6`에서 reward 없이 despawn한다.
- 200 mixed active + props, 10,800 frame soak에서 active overlap, NaN, drop, typed-array 교체가 없다.

## 검증 명령

`npm test -- --run src/lib/enemySimulation.test.js src/components/Enemies.test.jsx`

예상 검증 범위: spawn paths, MTV, corner slide, sight/separation 회귀, RZ despawn, typed-array identity, 10,800 frame obstacle soak.
