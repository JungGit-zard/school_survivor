# 커터칼 기본 쿨다운 5배 조정

## 결정

업그레이드가 전혀 없는 커터칼의 기본 재사용 대기시간을 `650ms`에서 정확히 5배인 `3250ms`로 변경한다. 게임에서의 표시는 `3.25초`다.

## 적용 범위

- 대상: `weaponCatalog.js`의 `boxCutter.base.cooldown`만
- 변경: `650ms (0.65초)` → `3250ms (3.25초)`

## 유지 항목

- 기본 `damage`, `range`, `width`, `knockback`, `critChance`, `critMultiplier`는 변경하지 않는다.
- `upgrades.js`의 커터칼 피해·사거리·치명타 업그레이드는 변경하지 않는다. 쿨다운 업그레이드는 존재하지 않는다.

## 정본

실행 수치는 `Developer/r3f_prototype/src/lib/weaponCatalog.js`를 따른다.
