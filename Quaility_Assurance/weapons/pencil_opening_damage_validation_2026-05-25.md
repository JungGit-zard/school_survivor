# Pencil Opening Damage Validation - 2026-05-25

## 검증 대상

첫 연필 공격이 E01을 한 방에 죽이지 않고, E01 체력 8 기준 약 2/3 피해만 주는지 자동 테스트 기준을 갱신했다.

## 자동 검증

- `npm test -- weaponCatalog.test.js useGameStore.passives.test.js --run`
  - 결과: 통과
  - 범위: 연필 Lv.1 기본 피해 5, 패시브 공격력 보정 후 5.4, 기본 런 시작 피해 5
- `npm test -- --run`
  - 결과: 통과
  - 범위: 전체 Vitest 회귀 테스트 18 files / 130 tests
- `npm run build`
  - 결과: 통과

## 남은 수동 QA

- 실제 플레이에서 첫 E01이 연필 1타 후 바로 죽지 않고 체력이 남는지 확인한다.
- 연필 피해 강화 1회 후 E01이 한 방에 죽는지 확인한다.
- 반복 플레이 패시브 `might` 성장 시 초반 처치 체감이 의도보다 빨리 1방으로 당겨지는지 확인한다.

