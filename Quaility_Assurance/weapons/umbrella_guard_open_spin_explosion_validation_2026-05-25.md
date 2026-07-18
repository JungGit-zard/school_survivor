# Umbrella Guard Open Spin Explosion Validation - 2026-05-25

## Validation Target

우산 방어막이 원화형 3D 우산으로 펼쳐지고, 제자리에서 회전한 뒤 마지막에만 범위 피해와 폭발 연출을 내는지 확인한다.

## Checks

- 우산이 발동 위치에 남아 플레이어를 따라 이동하지 않는다.
- 우산이 즉시 피해를 주지 않고, 펼침과 회전 후 마지막에 피해를 준다.
- 폭발 반경은 `weaponCatalog`와 `upgrades`의 수치를 사용한다.
- 레벨업 피해 카드는 폭발 피해를 +6 올린다.
- 레벨업 범위 카드는 폭발 반경을 +0.15 올리고 최대 1.85에서 멈춘다.
- 폭발 연출은 밝은 컬러 파편과 링이며, 검은 연기나 불필요한 먹구름 효과는 없다.

## Verification Run

- `npm.cmd test -- weaponCatalog.test.js upgrades.test.js HUD.test.jsx --run`: passed, 48 tests.
- `npm.cmd run build`: passed.
- Local dev server smoke check: `http://127.0.0.1:5174/` returned HTTP 200.
- Manual combat timing and readability should still be checked in play because the weapon is a visual timing change.
