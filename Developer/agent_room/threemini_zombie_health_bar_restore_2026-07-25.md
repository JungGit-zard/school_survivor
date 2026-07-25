# 일반 좀비 체력 게이지 복원 — threemini 시각 검토

## 원인

`ZombieInstanceLayer`는 일반 E01~E06 및 RZ를 React 개별 컴포넌트가 아닌 고정 인스턴스 풀로 렌더한다. 본체 전용 축소값 `visualScale * 0.333`을 체력 게이지에도 다시 적용해, 게이지 폭·높이·Y 위치가 모두 축소되어 본체 안쪽에 묻혔다.

## 복원 시각 계약

일반 좀비의 체력 게이지는 기존 `EnemyVisual`의 `MiniHealthBar` 계약을 유지한다.

- 폭: `0.32 * cs`
- 높이: `0.045`
- Y 위치: `0.72 * cs`
- `cs`: 풀의 `visualScale`

체력 비율, 피해 후행(trail), 플래시 알파와 카메라 빌보드 처리는 기존 고정 풀 계산을 유지한다. 개별 적 React 체력바로 되돌리지 않는다.

## 검증

`PooledEnemyVisuals.test.js`에서 기본 E01 시각 스케일 `4 / 3`에 대해 폭·높이·Y 위치가 위 계약과 같은지 확인한다. 기존 health visual state 테스트는 HP ratio와 trail 상태가 슬롯 재사용 시에도 유지·초기화되는지 계속 검증한다.
