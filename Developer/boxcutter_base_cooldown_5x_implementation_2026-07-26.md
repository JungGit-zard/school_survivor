# 커터칼 기본 쿨다운 5배 구현 기록

## 변경

- `WEAPON_CATALOG.boxCutter.base.cooldown`: `650ms` → `3250ms`
- 업그레이드가 없는 초기 상태의 재사용 대기시간은 `3.25초`다.

## 불변 확인 대상

- 기본 피해, 사거리, 폭, 넉백, 치명타 수치
- `upgrades.js`의 커터칼 업그레이드 정의

## 검증

`weaponCatalog.test.js`에서 정확한 값 `3250`과 기존 `650 * 5`를 함께 검증한다.
