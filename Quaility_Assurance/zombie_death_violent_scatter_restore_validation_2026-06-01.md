# 좀비 격렬한 파편 박살 연출 복원 검증 기록

## 검증 목표

- `scatter` 사망 효과가 일반 좀비 크기에 눌리지 않고 강하게 날아가는지 확인한다.
- 기존 3종 랜덤 사망 효과와 테스트/빌드가 깨지지 않는지 확인한다.

## 확인 항목

- `scatter` 모션은 `distanceScale: 1`을 가진다.
- `scatter` 수평 이동량은 충분히 크다.
- `scatter` 상승 속도는 1.5보다 크다.
- `scatter` 감쇠는 낮아 격렬한 움직임을 유지한다.

## 검증 결과

- `npm.cmd test -- src/lib/enemyDeathCollapse.test.js --run`: 통과, 1개 파일 / 6개 테스트.
- `npm.cmd test -- src/components/Enemies.test.jsx --run`: 통과, 1개 파일 / 6개 테스트.
- `npm.cmd test -- --run`: 통과, 28개 파일 / 170개 테스트.
- `npm.cmd run build`: 통과.
- 빌드 중 번들 크기 경고가 있었지만 이번 `scatter` 강화 실패는 아니다.
