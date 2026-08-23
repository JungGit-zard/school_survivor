# R3F Canvas `aria-label` crash QA — 2026-08-23

- Kanban: `escape-zombie-school` / `t_edc9b555` (independent BalanceQA evidence)
- Scope: product-code change 없음. B02/B03/B04 궁극기 R3F group의 `undefined.label` Canvas crash 수정본 검증.

## Root cause / focused loop

- Baseline `Enemy.jsx`의 B02 corridor, B03 shuttle, B04 soup group은 R3F `<group>`에 DOM 전용 `aria-label`을 전달했다.
- `@react-three/fiber`의 `applyProps(new THREE.Group(), { 'aria-label': label })`가 화면과 같은 `reading 'label'` 예외를 발생시키며, `name` 전달은 예외 없이 통과한다.
- 수정본은 위 세 group을 각각 같은 문구의 `name`으로 바꾸고, B03/B04의 기존 `userData` 상태를 유지한다. DOM 컴포넌트의 `aria-label`은 범위 밖이며 제거하지 않았다.

## Verification

```text
npm test -- src/components/EnemyVisual.test.js src/components/PooledEnemyProjectileLayer.test.js src/lib/enemyProjectilePool.test.js src/components/Enemies.test.jsx src/lib/gameplaySoak.test.js src/lib/stageMultiHzParity.test.js
6 files / 164 tests passed

inline ESM harness:
PASS: 5 kinds, 10 defined primitives, first-spawn step safe
```

- Projectile harness: sphere + ingredient 4종의 지오메트리 5개, body/outline `InstancedMesh` 10개가 모두 정의됨을 확인했다. 각 kind의 첫 스폰과 첫 `step` 뒤에도 pool activeCount는 5로 유지됐다.
- 기존 focused suite가 ingredient 3x scale, sphere 시야 이탈 despawn, pool reset/generation, soak 및 multi-Hz parity를 함께 통과했다.
- `http://localhost:5173/` 브라우저 실화면: 정상 타이틀 렌더, console/error 출력 없음. 증거: `r3f_label_crash_postfix_localhost_2026-08-23.png`.

## Result

PASS. 재현 고리의 위험 props가 세 궁극기 R3F group에서 제거됐고, 같은 `applyProps` 경로의 green 검증과 projectile 회귀 검증을 통과했다.
