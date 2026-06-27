# Explosive Scatter Variants Validation - 2026-06-27

## Scope

- 폭발성 데미지로 인한 `strong -> scatter` 사망 연출의 파편 모션 변형 추가 검증.

## Checks

- `SCATTER_COLLAPSE_VARIANTS`가 `burst`, `spiral`, `wave` 3종인지 확인.
- 세 변형이 서로 다른 이동 서명을 만드는지 단위 테스트로 확인.
- 기존 scatter 기본값은 `burst`로 남겨 기존 테스트 기대값을 유지.
- production build가 통과하는지 확인.

## Results

- `npm test -- enemyDeathCollapse.test.js`: 통과, 13 tests.
- `npm run build`: 통과.

## Residual Risk

- 브라우저 시각 확인은 이번 범위에서 수행하지 않았다. 실제 플레이 중 폭발 무기 빈도가 높은 구간에서 체감 검수하면 더 좋다.
