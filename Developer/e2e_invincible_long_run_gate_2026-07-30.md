# E2E 장시간 검증 무적 게이트 (2026-07-30)

## 원인

Stage 1의 마틸다는 180초에 플레이어 최대 체력의 3배 피해를 준다. 기존 `e2ehp=9999`는 현재 체력과 최대 체력만 함께 높이므로 마틸다 피해도 29,997로 증가해, 장시간 E2E 런이 180초 직후 종료됐다.

## 수정

- DEV E2E URL에서만 `e2einvincible=1`을 명시적으로 인식한다.
- 파서는 `e2e`가 없거나 값이 `0`/`false`이면 무적 오버라이드를 만들지 않는다.
- 오버라이드는 store의 전용 `e2eInvincible` 상태를 켠다.
- 중앙 `damagePlayer`는 이 상태에서 일반 피해와 `ignoreInvulnerability` 피해를 모두 무시한다.
- 기본 상태와 `resetGame`은 항상 `false`이며, 기존 `Game.jsx`의 `gameKey` effect가 런 시작 후 URL 오버라이드를 다시 적용한다.
- `e2ehp` 단독 사용은 기존처럼 체력 수치만 변경하며 무적을 활성화하지 않는다.

정상 게임의 마틸다 공격력과 일반 피해·피격 무적 로직은 변경하지 않았다. `getE2EOverrides`는 `import.meta.env.DEV`와 `e2e` 쿼리 양쪽으로 보호되어 프로덕션 URL에서는 활성화되지 않는다.

## 검증

- 회귀 테스트는 수정 전 파서, 적용, reset, 중앙 피해 차단의 4개 사례에서 실패했다.
- `npm.cmd test -- src/lib/e2eAuth.test.js src/store/useGameStore.test.js src/store/useGameStore.hitFeedback.test.js src/components/Game.runtimeTime.test.js`
  - 4개 파일, 34개 테스트 통과
- Firebase, Graphics Studio, `localStorage`, `sessionStorage`, IndexedDB에는 접근하지 않았다.
