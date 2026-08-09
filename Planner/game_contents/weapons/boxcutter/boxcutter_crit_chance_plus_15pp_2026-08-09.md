# 커터칼 기본 치명타 확률 +15%p (2026-08-09)

## Scope
- Kanban: `t_7ee62328`
- 대상: `boxCutter` 기본 치명타 확률과 해당 clamp/test 기대값만.
- 목표: 커터칼 기본 치명타 확률을 `0.10`에서 `0.25`로 올려 정확히 **+15 percentage points** 상향한다.
- 제외 범위: 피해, 쿨다운, 사거리, 폭, 넉백, 치명타 배율, 다른 무기, Firebase, Graphics Studio, 타이틀, 비주얼, 오디오.

## Numeric policy
- Base crit chance: `0.25` (기존 `0.10` 대비 +0.15 = +15%p).
- Permanent crit bonus max: `+0.08`.
- Base + permanent max: `0.33`.
- Run upgrade `boxCutterCrit`: `+0.02`씩 4회 = `+0.08`.
- Runtime crit chance cap: `0.41` (= base `0.25` + permanent `0.08` + run picks `0.08`).

## Distance/range note
- 이번 변경은 확률 수치만 변경한다.
- 커터칼 사거리 `1.4 units (0.35 블록, 1블록=4 units)`, 폭 `0.18 units (0.045 블록)`, 넉백 `1.8 units/s`는 변경하지 않는다.

## Acceptance criteria
1. `Developer/r3f_prototype/src/lib/weaponCatalog.js`의 `WEAPON_CATALOG.boxCutter.base.critChance`가 `0.25`다.
2. `Developer/r3f_prototype/src/lib/upgrades.js`의 `UPGRADE_EFFECTS.boxCutterCrit.chanceCap`이 `0.41`이다.
3. `Developer/r3f_prototype/src/lib/weaponCatalog.test.js`는 커터칼 기본 치명타 확률 `0.25`를 기대한다.
4. `Developer/r3f_prototype/src/lib/weaponPermanentUpgrades.test.js`는 커터칼 기본 `0.25`, 영구 치명타 최대 적용 후 `0.33`을 기대한다.
5. 피해, 쿨다운, 사거리, 폭, 넉백, 치명타 배율, 다른 무기, Firebase, Graphics Studio, 타이틀, 비주얼, 오디오는 변경하지 않는다.

## QA handoff for Balance_QA_Mini
- Review files:
  - `Bang_Rules.md`
  - `Planner/game_contents/weapons/boxcutter/boxcutter_crit_chance_plus_15pp_2026-08-09.md`
  - `Developer/r3f_prototype/src/lib/weaponCatalog.js`
  - `Developer/r3f_prototype/src/lib/upgrades.js`
  - `Developer/r3f_prototype/src/lib/weaponCatalog.test.js`
  - `Developer/r3f_prototype/src/lib/weaponPermanentUpgrades.test.js`
- Required verification from `Developer/r3f_prototype`:
  - `npm test -- src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/lib/weaponPermanentUpgrades.test.js src/lib/criticalHits.test.js`
  - `npm run build`
  - `git diff --check`
  - `git status --short --branch`
- Regression focus:
  - `boxCutter` non-crit stats remain unchanged: damage `24`, cooldown `3250 ms`, range `1.4 units (0.35 블록)`, width `0.18 units (0.045 블록)`, knockback `1.8 units/s`, critMultiplier `1.5`.
  - Other weapon crit chances and caps remain unchanged.
