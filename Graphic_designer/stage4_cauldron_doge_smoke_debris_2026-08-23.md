# Stage 4 압력 가마솥 Doge 연기·시각 파편 폭발

작성: 2026-08-23
담당: threemini
범위: Stage 4 pressure cauldron explosion VFX only

## 목표

Stage 4 압력 가마솥의 15초 주기 폭발 순간에 기존 Doge 계열 큰 스폰 연기와 고정 시각 파편을 결합한다.

## 보존한 정본

- 폭발 주기: 15초
- 끓는 예고: 폭발 전 12~15초 구간의 기존 smoke/shake
- 폭발 지속: 250ms
- 피해 반경: 3.2 units
- 피해량: maxHP 20%
- 가마솥 모델 기본 scale seam: 0.4
- Studio item id 및 numeric child path: `stage-object-pressure-cauldron` 기존 경로 유지
- 신규 asset, sound, projectile, physics 추가 없음

## 구현 요약

- 가마솥 폭발 연기는 `Enemy.jsx`의 `BigSpawnSmokeEffect`를 직접 재사용한다.
- `BigSpawnSmokeEffect`는 Doge-class 큰 스폰 연기 경로이며 `BIG_SPAWN_PUFF_GEOMETRY`와 흰 `MeshBasicMaterial` 퍼프를 사용한다.
- Doge-class 큰 스폰 연기에는 별도 outline mesh를 두지 않는다.
- 파편은 `BURST_DEBRIS` 고정 6개 선언형 목록으로 유지한다.
- 파편 그룹은 `pressure-cauldron-burst-debris` 이름으로 렌더되고, 상위 burst group은 `visual.bursting`이 false가 되면 완전히 숨겨진다.
- 파편은 시각 전용 `Box` 조각이다. projectile pool, collision, damage, sound, asset import를 추가하지 않았다.

## TDD 기록

RED:

- `PressureCauldron.test.js`의 burst VFX contract를 먼저 강화했다.
- 강화된 테스트는 가마솥이 `BigSpawnSmokeEffect`를 직접 import/use하고, 6개 고정 debris를 가진다고 요구했다.
- 실행 결과: `PressureCauldron.jsx`가 아직 `SpawnSmokeEffect`를 import/use하고 있어 실패했다.

GREEN:

- `PressureCauldron.jsx`에서 가마솥 burst smoke 호출만 `BigSpawnSmokeEffect` 직접 import/use로 바꿨다.
- focused tests 통과:
  - `src/components/StageObjects/PressureCauldron.test.js`
  - `src/components/BigSpawnSmoke.test.js`
  - `src/lib/stage4PressureCauldronHazard.test.js`
  - `src/components/Game.stage4PressureCauldron.test.js`

## 검증 결과

명령:

```bash
cd Developer/r3f_prototype
npm test -- --run src/components/StageObjects/PressureCauldron.test.js src/components/BigSpawnSmoke.test.js src/lib/stage4PressureCauldronHazard.test.js src/components/Game.stage4PressureCauldron.test.js
```

결과:

- Test Files: 4 passed
- Tests: 22 passed
- Branch guard: ok
- Legacy B02 source gate: passed
- Dialogue store gate: passed
- Studio-game sync source contract: passed

## 범위 제한

- `GraphicsStudio.jsx`는 수정하지 않았다.
- pre-existing Enemy/B02/B03/B04/Stage3 변경은 stage/commit하지 않았고, 이번 작업에서 직접 수정하지 않았다.
- commit/push 없음.
