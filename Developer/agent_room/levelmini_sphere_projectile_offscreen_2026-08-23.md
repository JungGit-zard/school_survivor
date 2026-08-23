# 구형 적 발사체 화면 이탈 회수

- Kanban: `t_e88ed6e8` (`levelmini`)
- 대상: `enemyProjectilePool` kind 0 기본 구체(E04 계열).
- 화면과 한 번 겹친 구체는 3,200ms로 제거하지 않고, 외곽선 반경 `0.09 × 1.22`까지 화면 밖으로 완전히 나가면 회수한다.
- 화면 밖에서 시작한 구체는 화면 진입 전 즉시 제거하지 않으며, 진입하지 못하고 멀어지는 경우만 기존 3,200ms 안전 수명을 유지한다.
- kind 1~4 주방 재료의 수명·피해·속도·충돌 반경·풀 크기·시각 크기는 변경하지 않았다.
- 런타임은 `Enemies.jsx`에서 기존 `screenBounds` 객체를 그대로 전달한다. 프레임 루프 새 객체 생성 없음.
- 검증: `npm test -- src/lib/enemyProjectilePool.test.js src/components/Enemies.test.jsx src/components/PooledEnemyProjectileLayer.test.js` — 3 files, 128 tests passed.
