# threemini 그래픽 기록 — Stage 2 경비원 좀비 far LOD 실루엣 복구

- 일시: 2026-08-09 01:14 KST
- 대상: Stage 2 Chase · 경비원 (`RZG`) 실제 런타임 pooled graphics path

## 시각 판정

보안 경비원 좀비는 Graphics Studio/런타임 공유 모델 경로에서 navy cap, uniform body, safety vest, arms, legs가 연결된 3D 카툰 실루엣으로 유지되어야 한다. 원거리 LOD에서는 눈/입/배지/손/신발 같은 작은 디테일을 줄일 수 있지만, 세부 신발 파트만 하체 디테일로 남아 실루엣을 혼탁하게 만들면 안 된다.

## 적용한 시각 경계

- 유지: `RZG` 전용 모델, 팔레트, 스케일, 타입 코드, `zombie-rzg` Studio item, shared numeric path transform mapping.
- 수정: far LOD에서 경비원 신발 세부 슬롯 63/65를 렌더 목록에서 제외.
- 결과: far LOD 코어는 `[head, cap, body, vest, armL, armR, legL, legR]`만 남아 경비원 좀비의 몸통-사지 연결이 깨지지 않는다.
- 금지 준수: 2D sprite 대체 없음, debug proxy 없음, MeshToonMaterial 기반 fixed-pool toon material/outline 경로 유지, asset/Firebase/title 변경 없음.

## 검증 근거

- `npm test -- src/components/PooledEnemyVisuals.test.js`: 22/22 passed.
- `npm test -- src/components/ZombieMesh.test.js src/components/PooledEnemyVisuals.test.js src/components/Enemies.test.jsx src/lib/enemyEntityPool.test.js`: 152/152 passed.
