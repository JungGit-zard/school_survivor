# 좀비 격렬한 파편 박살 연출 복원 구현 기록

## 요청

- 이전에 파편이 격렬하게 날리던 사망 연출을 다시 살린다.

## 원인

- `scatter` 스타일은 복원되어 있었지만, 파편 이동 계산에 `visualScale`이 곱해졌다.
- 일반 좀비의 `visualScale`은 작기 때문에 파편 이동량이 줄어 예전보다 얌전하게 보일 수 있었다.

## 변경

- `scatter` 모션에 `distanceScale: 1`을 추가해 일반 좀비에서도 이동량이 줄지 않게 했다.
- `scatter` 수평 속도와 상승 속도를 키웠다.
- `scatter` 회전 속도를 키웠다.
- `scatter` 이동/회전 감쇠를 낮춰 더 오래 힘 있게 날아가게 했다.
- `EnemyDeathCollapse`는 모션별 `distanceScale`, `linearDamping`, `spinDamping`을 읽어 적용한다.

## 결과

- `scatter` 사망 효과는 다시 강한 파편 박살 연출로 보인다.
- 나머지 `bodyCollapse`, `crumble` 스타일은 기존 성격을 유지한다.
