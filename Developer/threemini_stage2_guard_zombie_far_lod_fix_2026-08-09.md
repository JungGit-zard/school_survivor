# threemini 구현 기록 — Stage 2 경비원 좀비 far LOD 하체 연결 수정

- 일시: 2026-08-09 01:14 KST
- 작업자: threemini
- 범위: Stage 2 추격 이벤트 `RZG` 보안 경비원 좀비의 실제 런타임 fixed-pool 렌더러 far LOD 파트 표시 계약.

## 원인

`Developer/r3f_prototype/src/components/PooledEnemyVisuals.js`의 `shouldRenderPooledEnemyPart(type === 14, ENEMY_RENDER_FAR)`가 경비원 좀비 하체 세부 파트 중 신발 슬롯 63/65까지 far LOD에 남겼다. 근거리/중거리 전용 세부 파트가 원거리 LOD에 연결되어 실제 런타임 pooled renderer에서 경비원 실루엣이 불필요한 shoe-only 하체 디테일을 계속 그리는 상태였다.

## 수정

- `RZG` far LOD 표시 슬롯을 머리/모자/몸통/조끼/양팔/양다리 코어 파트 `[49, 50, 55, 56, 58, 60, 62, 64]`로 제한했다.
- 동시 편집으로 빠져 있던 기존 health bar height 상수 `ENEMY_HEALTH_BAR_HEIGHT = 0.045`를 같은 파일에 복원해 기존 health bar 계약 테스트를 보존했다.
- 모델 원천, 스케일, 위치/회전/색상, Graphics Studio itemId, numeric path 매핑, RZT/RZG 타입 코드, Firebase/asset/타이틀 파일은 변경하지 않았다.

## 검증

RED:

```bash
npm test -- src/components/PooledEnemyVisuals.test.js
```

결과: 신규 테스트 `keeps Stage 2 guard far LOD connected to body limbs instead of drawing shoe-only lower parts`가 실패. Received 배열에 `63`, `65`가 포함됨.

GREEN:

```bash
npm test -- src/components/PooledEnemyVisuals.test.js
```

결과: Test Files 1 passed, Tests 22 passed.

회귀 범위:

```bash
npm test -- src/components/ZombieMesh.test.js src/components/PooledEnemyVisuals.test.js src/components/Enemies.test.jsx src/lib/enemyEntityPool.test.js
```

결과: Test Files 4 passed, Tests 152 passed.
