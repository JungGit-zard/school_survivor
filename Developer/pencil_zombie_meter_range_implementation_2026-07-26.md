# 연필 Zombie Meter 범위 구현 기록 (2026-07-26)

## 구현 경로

- `src/lib/gameplayUnits.js`에 data-only 정본을 추가했다: `ZOMBIE_METER_WORLD_UNITS=0.75`, Pencil 지름 6zm/반지름 3zm, world radius 2.25.
- `src/lib/weaponCatalog.js`의 Pencil Base Range는 공용 `PENCIL_FIRE_RANGE_WORLD_UNITS`를 사용한다.
- `src/components/Weapons/Pencil.jsx`은 같은 공용 상수를 fallback으로 사용하며 명시적 `w.range`를 계속 우선한다.
- `src/lib/weaponTargeting.test.js`는 production targeting 코드를 바꾸지 않고 pooled target의 2.25 포함, 2.250001 제외, sight blocker 제외를 검증한다.

## RED → GREEN

RED:

```text
npx vitest run src/lib/gameplayUnits.test.js src/lib/weaponCatalog.test.js src/components/Weapons/Pencil.test.jsx
30 tests | 4 failed
- gameplayUnits.js 부재
- Pencil catalog range 22 != 2.25
- Catalog/Pencil shared range import와 canonical scanner fallback 부재
```

GREEN:

```text
npx vitest run src/lib/gameplayUnits.test.js src/lib/weaponCatalog.test.js src/components/Weapons/Pencil.test.jsx src/lib/weaponTargeting.test.js src/lib/upgrades.test.js src/lib/e2eAuth.test.js
Test Files  6 passed (6)
Tests  131 passed (131)
```

## 비변경 사항

`weaponTargeting.js` production, projectile homing/speed/3.5초 수명/pierce sweep, frame allocation/state, Firebase, Graphics Studio, browser storage는 변경하지 않았다.
