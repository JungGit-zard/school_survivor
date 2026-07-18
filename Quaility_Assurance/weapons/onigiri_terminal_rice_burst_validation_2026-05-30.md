# Onigiri Terminal Rice Burst Validation - 2026-05-30

## Scope

오니기리의 마지막 충격과 동시에 밥풀 터짐이 발생하는지 검증한다.

## Checks

- 남은 튕김 횟수가 1이면 아직 터지지 않는다.
- 남은 튕김 횟수가 0이면 즉시 터진다.
- 남은 튕김 횟수가 있어도 다음 타깃이 없으면 종료 충격으로 보고 즉시 터진다.
- 기존 밥풀 입자 생성 테스트는 유지한다.

## Result

- `npm.cmd test -- src/lib/onigiri.test.js --run`: passed, 4 tests.
- `npm.cmd test -- --run`: passed, 25 files / 160 tests.
- `npm.cmd run build`: passed. Vite large chunk warning only.

## Remaining Risk

브라우저 시각 확인은 아직 별도로 수행하지 않았다. 코드 단위에서는 마지막 충격 조건과 밥풀 터짐 호출 타이밍을 검증했다.
