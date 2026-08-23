# kind0 구체 화면 이탈 despawn QA — 2026-08-23

- Kanban: `escape-zombie-school` / `t_e8d2bed8`
- 역할: Balance_QA_Mini 독립 QA. 제품 코드 수정 없음.
- 기준: kind0은 화면에 한 번 보인 뒤 외곽선 반지름까지 화면 밖으로 완전히 나가야만 제거한다. 화면에 들어오지 않은 kind0은 기존 3,200ms 안전 수명을 유지한다.

## 최종 확인

- `Enemies.jsx`가 매 프레임 갱신되는 실제 `screenBounds`를 pool `step`에 전달한다.
- `enemyProjectilePool.js`의 8개 화면 경계 비교가 모두 `E04_PROJECTILE_VISUAL_EXIT_RADIUS`를 사용한다. 값은 본체 반지름 `0.09 × 1.22`이며 외곽선까지 보존한다.
- 고정 `seenOnScreen: Uint8Array(32)`가 spawn, despawn, reset에서 초기화된다. 프레임마다 새 배열·객체를 만들지 않는다.
- kind0: 화면 안에서 3,200ms 초과 생존, 완전 이탈 때 제거, 화면 밖에서 안으로 날아오는 탄환 보호, 끝까지 미진입·멀어짐 시 안전 수명 회수를 단위 테스트로 확인했다.
- kind1~4: 기존 3,200ms 수명 유지. pool 32, 본체 반지름 0.09, 피해·속도는 변경되지 않았고, 재료 시각 3배는 `PooledEnemyProjectileLayer` 회귀 테스트로 유지 확인했다.

## 실행 결과

```text
npx vitest run src/lib/enemyProjectilePool.test.js src/components/Enemies.test.jsx src/components/PooledEnemyProjectileLayer.test.js src/lib/gameplaySoak.test.js src/lib/stageMultiHzParity.test.js
5 files / 133 tests passed
git diff --check passed
```

판정: PASS. 브라우저 실화면은 실행하지 않았으며, 이 범위는 pool/연결 집중 테스트로 검증했다.
