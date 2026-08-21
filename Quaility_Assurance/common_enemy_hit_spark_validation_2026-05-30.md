# Common Enemy Hit Spark Validation - 2026-05-30

## Scope

모든 적 피해에 공통 작은 타격 효과가 연결되었는지 검증한다.

## Checks

- 공통 VFX 설정이 짧고 작은 값인지 테스트한다.
- 기본 피격 넉백 값이 적용되는지 테스트한다.
- 무기별 강한 넉백 값이 보존되는지 테스트한다.
- 적 피해 공통 함수 `_enemyHit`에서 `emitVfx(...)`가 호출되는지 코드 검수한다.
- `VFXLayer`가 작은 크기 옵션을 받아 렌더링하는지 코드 검수한다.
- 전체 테스트와 빌드로 회귀를 확인한다.

## Result

- `npm.cmd test -- src/lib/enemyHitVfx.test.js --run`: passed, 4 tests.
- `rg -n "createEnemyHitSparkEvent|emitVfx|baseScale|growScale" ...`: confirmed `Enemy.jsx`, `VFXLayer.jsx`, `enemyHitVfx.js` wiring.
- `npm.cmd test -- src/lib/boxCutter.test.js --run`: passed, 4 tests. This was rerun because one parallel full-test output briefly showed stale box-cutter failure text.
- `npm.cmd test -- --run`: passed, 27 files / 166 tests.
- `npm.cmd run build`: passed. Vite large chunk warning only.

## Conclusion

모든 무기 타격이 통과하는 `Enemy.jsx`의 `_enemyHit`에서 작은 `hitSpark` VFX와 기본 약한 넉백을 발생시키므로, 적 좀비에게 피해가 들어가는 모든 공격에 공통 타격 표시와 약한 밀림이 적용된다.
