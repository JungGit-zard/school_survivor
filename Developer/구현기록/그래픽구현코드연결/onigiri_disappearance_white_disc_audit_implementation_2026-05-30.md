# Onigiri Disappearance White Disc Audit Implementation - 2026-05-30

## Files

- `Developer/r3f_prototype/src/components/Weapons/Onigiri.jsx`
- `Developer/r3f_prototype/src/lib/onigiri.js`
- `Developer/r3f_prototype/src/lib/onigiri.test.js`

## Data Flow Reviewed

1. `OnigiiriProjectile`가 마지막 충돌을 감지한다.
2. `onBounceFlash(t.x, t.z)`가 호출된다.
3. `RiceBurst`가 `createRiceBurstGrains(...)`로 밥알 데이터를 만든다.
4. `RiceGrain`이 각 밥알을 렌더링한다.
5. `RiceBurst`는 620 ms 뒤 `onDone(id)`로 제거된다.

## Root Cause

기존 `createRiceBurstGrains(...)`는 모든 밥알의 시작 좌표를 동일한 `x,z`로 설정했다. 이 때문에 소멸 직후 여러 흰 밥알이 한 점에 겹치며 하얀 원처럼 보였다.

## Fix

- 각 밥알에 `originX`, `originZ`를 남겨 실제 충격 중심은 보존했다.
- 렌더 시작 좌표 `x,z`는 중심점에서 약간 바깥으로 흩어지게 했다.
- 밥알 `delay`를 `0`으로 고정해 일부 밥알이 중심점 근처에서 늦게 나타나는 일을 막았다.

## Gameplay Impact

오니기리 피해량, 튕김 횟수, 타깃 탐색, 소멸 타이밍은 변경하지 않았다.
