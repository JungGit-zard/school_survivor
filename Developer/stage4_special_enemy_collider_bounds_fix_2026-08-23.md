# Stage 4 특수 적 콜라이더 경계 고정

## 범위

- Stage 4 React/Rapier 특수 적 경로(B04, 마틸다)에만 적용했다.
- 맵 경계(`getStageBounds('stage4')`)에서 각 적의 실제 `CuboidCollider` 반폭을 뺀 위치를 이동 한계로 사용한다.
- 프레임 시작 시 이미 벗어난 좌표를 복귀시키고, 그 프레임의 외향 x/z 속도를 남은 거리 이내로 제한한다.
- 피격 콜백은 넉백 방향·세기·종료시각만 기록한다. 직접 Rapier 속도를 쓰지 않아 다음 프레임의 같은 경계 제한 경로가 넉백을 처리한다.

## 재현과 회귀

- B04가 오른쪽 경계에서 phase 1 원거리 측면 이동을 하면 한 프레임 뒤 x가 `8.986666…`에서 `9.026666…`으로 넘어갔다.
- 좌·우 B04 경계에서 연필 사거리 경계에 있던 플레이어와 거리가 `2.25`에서 `2.29`가 되어 타깃을 잃는 것을 `src/lib/stage4SpecialEnemyBounds.test.js`로 고정했다. Z축 외향 속도, B04·Stage 4 마틸다(B01 collider)의 넉백, 피격 콜백의 직접 `setLinvel` 부재도 검사한다.
- 수정 전 같은 시나리오는 `2.29 > 2.25`로 실패했고, 수정 후 경계 안에 남아 통과한다.

## 비변경 범위

- pooled 일반 적의 스폰, 속도, AI, 사거리, 피해 및 `enemySimulation` 경로는 변경하지 않았다.
- Stage 4 소품 배치 파일은 수정하지 않았다.

## 검증

```powershell
npm test -- src/lib/stage4SpecialEnemyBounds.test.js
# 7 passed

npm test -- src/lib/enemySimulation.test.js src/lib/pencilRangeBoundary.test.js src/components/EnemyVisual.test.js
# 72 passed (Stage 4 bounds regression 포함)

git diff --check
# passed
```

Kanban: `escape-zombie-school` / `t_d646bf66`.
커밋과 푸시는 수행하지 않았다.
