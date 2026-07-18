# Pencil Opening Damage Balance - 2026-05-25

## 목적

첫 연필 공격이 첫 등장 좀비(E01)를 즉시 처치하지 않고, 체력의 약 2/3만 깎도록 조정했다.

## 구현 기준

- E01 체력은 8로 유지한다.
- `pencilThrow` Lv.1 기본 피해는 8에서 5로 낮춘다.
- 5 / 8 = 62.5%이므로 "체력의 3분의 2 정도"에 가깝다.
- 기존 연필 피해 업그레이드 `+3`은 유지한다.
- 따라서 연필 피해 강화 1회 후 피해가 8이 되어 E01을 한 방에 처치할 수 있다.

## 수정 파일

- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/lib/weaponCatalog.test.js`
- `Developer/r3f_prototype/src/store/useGameStore.passives.test.js`
- `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_replan_2026-05-06.md`
- `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_reverse_design_current_2026-05-09.md`
- `Planner/game_contents/weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`
- `Bang_Rules.md`

## 검증

- `npm test -- weaponCatalog.test.js useGameStore.passives.test.js --run`: 통과, 25 tests.
- `npm test -- --run`: 통과, 130 tests.
- `npm run build`: 통과.

