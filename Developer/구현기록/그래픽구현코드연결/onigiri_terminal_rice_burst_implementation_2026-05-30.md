# Onigiri Terminal Rice Burst Implementation - 2026-05-30

## Files

- `Developer/r3f_prototype/src/lib/onigiri.js`
- `Developer/r3f_prototype/src/lib/onigiri.test.js`
- `Developer/r3f_prototype/src/components/Weapons/Onigiri.jsx`

## Implementation

- `shouldShowRiceBurst(remainingBounces, hasNextTarget = true)`로 마지막 충격 판단을 명확히 했다.
- 남은 튕김 횟수가 `0` 이하이면 즉시 밥풀 터짐을 보여준다.
- 남은 튕김 횟수가 있어도 다음 타깃이 없으면 현재 충돌을 종료 충격으로 보고 밥풀 터짐을 보여준다.
- `OnigiiriProjectile`은 충돌 직후 다음 타깃을 먼저 찾고, 그 결과를 밥풀 터짐 조건에 전달한다.

## Reason

기존 로직은 남은 튕김 횟수가 `-1`이 되어야 밥풀 터짐을 보여줬다. 그래서 마지막 충격보다 한 번 늦게 터지거나, 다음 타깃이 없으면 밥풀 터짐 없이 사라질 수 있었다.
