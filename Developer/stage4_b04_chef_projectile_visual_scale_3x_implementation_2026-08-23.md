# Stage 4 B04 주방장 발사체 시각 배율 3배 구현

- Kanban: `escape-zombie-school` / `t_20753873` (`threemini`)
- 변경: `PooledEnemyProjectileLayer.jsx`의 공용 인스턴스 변환 지점에서 kind `1..4`(당근·양파·감자·식칼) body 배율을 정확히 `3`으로 설정했다.
- outline은 같은 변환에서 `3 × 1.22 = 3.66`으로 계산해 기존 외곽선 비율을 유지했다. kind `0` E04 구체는 body `1`, outline `1.22`로 유지된다.
- 불변 확인: geometry·재질·InstancedMesh/풀·충돌 반경·피해·속도·발사 주기·회전·종류 순환·Studio·타이틀·Firebase·오디오는 수정하지 않았다.
- TDD: RED로 정확한 `3` 및 `1.22` 결합식을 요구하는 테스트를 추가하고, GREEN으로 공용 변환 지점에 적용했다.
- 검증: `npm.cmd exec -- vitest run src/lib/enemyProjectilePool.test.js src/components/PooledEnemyProjectileLayer.test.js` — 2 files, 12 tests passed.
- Git 커밋·푸시 없음.
