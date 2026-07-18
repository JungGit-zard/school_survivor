# 좀비 사망 효과 3종 랜덤 구현 기록

## 요청

- 잘 만들어진 몸체 붕괴 연출을 유지하면서, 이전 박살 연출 두 개도 되살린다.
- 죽을 때 3가지 중 하나가 표현되게 한다.

## 변경

- `ENEMY_DEATH_COLLAPSE_STYLES`에 `bodyCollapse`, `scatter`, `crumble` 3종을 정의했다.
- `pickEnemyDeathCollapseStyle`로 사망 VFX마다 하나의 스타일을 랜덤 선택한다.
- `createCollapseMotion`이 스타일별 움직임을 반환하도록 확장했다.
- `EnemyDeathCollapse`는 선택된 스타일을 모든 파츠에 전달한다.

## 스타일별 동작

- `bodyCollapse`: 현재 몸체 분해형 붕괴. 낮게 벌어지며 아래로 무너진다.
- `scatter`: 예전 박살 느낌 복원. 중력 없이 강하게 사방으로 흩어진다.
- `crumble`: 예전 와르르 느낌 복원. 작은 수평 이동과 강한 중력으로 제자리에서 무너진다.

## 유지한 점

- 기존 처치/드랍 로직은 변경하지 않았다.
- 세 스타일 모두 좀비 몸체 파츠 12개를 사용한다.
