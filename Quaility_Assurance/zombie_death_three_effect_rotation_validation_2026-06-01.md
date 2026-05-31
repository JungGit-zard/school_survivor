# 좀비 사망 효과 3종 랜덤 검증 기록

## 검증 목표

- 사망 효과가 3종 중 하나로 선택되는지 확인한다.
- 이전 박살 연출인 산산조각과 와르르 붕괴가 다시 동작하는지 확인한다.
- 기존 테스트와 빌드가 깨지지 않는지 확인한다.

## 확인 항목

- `bodyCollapse`, `scatter`, `crumble` 3종 스타일이 정의되어 있다.
- 랜덤 선택 함수가 3종 중 하나를 반환한다.
- `scatter`는 강한 수평 이동과 낮은 중력으로 박살 느낌을 낸다.
- `crumble`은 강한 중력과 좁은 이동으로 와르르 느낌을 낸다.

## 검증 결과

- `npm.cmd test -- src/lib/enemyDeathCollapse.test.js --run`: 통과, 1개 파일 / 6개 테스트.
- `npm.cmd test -- src/components/Enemies.test.jsx --run`: 통과, 1개 파일 / 6개 테스트.
- `npm.cmd test -- --run`: 통과, 28개 파일 / 170개 테스트.
- `npm.cmd run build`: 통과.
- 빌드 중 번들 크기 경고가 있었지만 이번 사망 효과 3종 복원 실패는 아니다.
