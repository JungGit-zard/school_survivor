# 전기충격기 2차·3차 generation strict 검증 (2026-07-26)

## RED

`src/lib/stunGunChainNearestRegression.test.js`는 이미 맞은 pooled slot이 새 generation으로 재사용된 뒤 근접 후보가 되어도, 기존 객체 참조 hitSet 때문에 더 먼 3차 후보가 선택되는 문제를 재현했다.

## GREEN 기준

- 2차는 첫 impact-nearest를 선택한다.
- 3차는 두 번째 impact-nearest를 선택한다.
- 재사용된 `rb`는 generation이 달라지면 새 후보가 된다.
- production projectile의 그래픽 이동, `applyEnemyHit`, `onHit` callback은 같은 `{ rb, generation }`을 받는다.

## 비대상

피해, 쿨다운, 체인 수, 4.5 범위, SFX, Firebase와 Graphics Studio는 검증 중 변경하지 않는다.
