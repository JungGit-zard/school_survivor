# Common Enemy Hit Spark Implementation - 2026-05-30

## Files

- `Developer/r3f_prototype/src/lib/enemyHitVfx.js`
- `Developer/r3f_prototype/src/lib/enemyHitVfx.test.js`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/VFXLayer.jsx`

## Implementation

- `COMMON_ENEMY_HIT_SPARK` 설정을 추가했다.
- `COMMON_ENEMY_HIT_KNOCKBACK` 설정을 추가했다.
- `createEnemyHitSparkEvent(...)`로 적중 위치 기반 VFX 이벤트를 만든다.
- `resolveEnemyHitKnockback(...)`로 무기별 넉백이 없을 때 기본 약한 넉백을 적용한다.
- 모든 무기가 통과하는 `Enemy.jsx`의 `_enemyHit`에서 `emitVfx(...)`를 호출한다.
- 모든 무기가 통과하는 `Enemy.jsx`의 `_enemyHit`에서 기본 넉백을 처리한다.
- `VFXLayer`의 기존 `HitSpark`가 `baseScale`, `growScale` 옵션을 받아 작게 터지는 크기로 렌더링할 수 있게 했다.
- `HitSpark`는 중심 octahedron과 짧은 조각 4개를 함께 렌더링해 `팍` 터지는 느낌을 강화했다.

## Scope

피해량, 판정, 사망, 경험치/드랍 로직은 변경하지 않았다. 다만 피격 시 기본 약한 넉백을 추가해, 넉백을 명시하지 않은 공격도 조금씩 좀비를 뒤로 밀게 했다.
