# Stage 4 B04 주방장 투사체 3배 QA

- Kanban: `escape-zombie-school` / `t_a161e513`
- 사용자 정본: 당근·양파·감자·식칼(kind 1~4) 시각 모델을 정확히 선형 3배. kind 0(E04 구체)은 불변.

## AABB 기준선 → 목표 (x × y × z)

| 모델 | 기준선 | 3배 목표 |
| --- | --- | --- |
| 당근 | .142429 × .292500 × .136870 | .427286 × .877500 × .410609 |
| 양파 | .155067 × .264500 × .157459 | .465201 × .793500 × .472377 |
| 감자 | .202625 × .153489 × .166896 | .607874 × .460468 × .500687 |
| 식칼 | .088000 × .206000 × .020000 | .264000 × .618000 × .060000 |

## 독립 확인

- 재료 body matrix는 `3`, outline은 기존 비율 보존 `3 × 1.22 = 3.66`; kind 0은 body `1`, outline `1.22` 유지.
- mechanics 불변: pool `32`, collider radius `.09`, lifetime `3200ms`, B04 damage `14`, speed `1.6`.
- 4종 geometry 정점/index 수와 재료별 body+outline InstancedMesh 쌍은 불변이며, frame loop에 새 allocation 없음.

## 검증

`npm test -- --run src/lib/enemyProjectilePool.test.js src/components/PooledEnemyProjectileLayer.test.js src/components/Enemy.test.jsx`

결과: **12 tests PASS** (2 test files). 판정: **PASS**.
