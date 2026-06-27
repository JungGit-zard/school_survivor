# Explosive Scatter Variants - 2026-06-27

## Request

- 좀비가 폭발성 데미지로 죽을 때 파편 흩날림 가짓수를 3가지로 늘린다.

## Implementation

- `strong` 사망 강도는 기존처럼 `scatter` 스타일을 사용한다.
- `scatter` 내부에 `burst`, `spiral`, `wave` 3가지 파편 모션 변형을 추가했다.
- 기본 `scatter` 호출은 기존 감각을 유지하도록 `burst`로 폴백한다.
- 실제 게임 렌더링에서는 collapse id와 사망 위치를 섞은 seed로 사망 1회당 scatter 변형 1개를 고른다.

## Files

- `Developer/r3f_prototype/src/lib/enemyDeathCollapse.js`
- `Developer/r3f_prototype/src/components/EnemyDeathCollapse.jsx`
- `Developer/r3f_prototype/src/lib/enemyDeathCollapse.test.js`

## Verification

- `npm test -- enemyDeathCollapse.test.js`
- `npm run build`
