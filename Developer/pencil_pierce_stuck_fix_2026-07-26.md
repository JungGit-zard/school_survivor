# 연필 관통 후 첫 적 고착 수정 (2026-07-26)

## 원인

1. 연필은 최초 target을 `targetRef`로 계속 homing했지만, 명중 후 관통이 남아도 target을 해제하지 않았다. 중복 피해는 hit history가 막아도 다음 프레임 조향은 같은 적에게 계속 적용되어 연필이 그 적과 겹쳐 보였다.
2. sweep 후보 수를 `hitsLeftRef.current`로 제한했다. 이미 맞은 A가 다음 sweep의 첫 후보면 중복이라 피해를 주지 않지만, pierce=2에서 A가 유일한 반환 후보가 되어 B가 검사되지 않았다.

## 수정

- `releasePencilHomingTargetAfterHit`는 successful `applyEnemyHit` 직후 호출된다.
  - pooled target은 index와 generation이 모두 현재 최초 homing target과 같을 때만 해제한다.
  - special target은 같은 rigid-body 객체일 때만 해제한다.
  - 다른 sweep victim은 최초 target 조향을 해제하지 않는다.
- 해제된 target은 `index=-1`, `generation=null`, `special=null`이 된다. steering은 target이 남아 있을 때만 `resolveWeaponTarget`을 호출하므로 마지막 velocity로 직진한다.
- sweep 후보 budget은 `min(scratch capacity, remaining pierce + prior hit count)`다. 이미 맞은 후보를 다시 만났을 때도 다음 유효 적을 포함하면서, 전체 scratch capacity를 정렬하지 않는다. `upgrades.js`의 pierce cap은 3이다.

## TDD 검증

RED:

```text
npx vitest run src/components/Weapons/Pencil.test.jsx
6 tests | 3 failed
- homing release helper 없음
- successful hit 이후 release/cleared steering guard 없음
- scanSweptCapsuleEnemiesInto(..., hitsLeftRef.current)로 duplicate A가 B를 가림
```

GREEN:

```text
npx vitest run src/components/Weapons/Pencil.test.jsx src/lib/weaponTargeting.test.js src/lib/weaponCollision.test.js
Test Files  3 passed (3)
Tests  42 passed (42)
```

## 미변경 범위

모델 scale, `StudioTunedGroup`, Firebase/Graphics Studio, projectileCount 분산, sweep 순서, SFX·피해·crit 규칙 및 `weaponTargeting.js`는 변경하지 않았다.
