# 연기 외곽선 제거·가마솥 폭발 QA 기준

작성: 2026-08-23 KST
Kanban: `escape-zombie-school` / `t_3b9bf66e`
역할: balanceqa (읽기 전용 독립 검증)

## 변경 전 전수조사

| 경로 | 현재 구현 | 외곽선 상태 | 판정 |
| --- | --- | --- | --- |
| `components/Enemy.jsx` `BillboardSpawnSmokeEffect` | `spawn_smoke_puff.webp` 카메라 빌보드 | 텍스처 단일 메시, 코드상 외곽선 메시 없음 | 기준 충족 후보 |
| `components/Enemy.jsx` `BigSpawnSmokeEffect` | 큰 적/도지 출현용 6개 구형 퍼프 | `BackSide` 별도 `outline` 메시와 `studioRenderOutline: true` 존재 | **불합격** |
| `components/ZombieInstanceLayer.jsx` | 풀링된 적 출현용 `spawn_smoke_puff.webp` InstancedMesh | 연기 전용 `MeshBasicMaterial`, 외곽선 인스턴스 없음 | 기준 충족 후보 |
| `components/StageObjects/PressureCauldron.jsx` | 가마솥 예고 3개 증기 퍼프 | `userData.studioRenderOutline: false`, 표면 메시만 존재 | 기준 충족 후보 |
| `components/Weapons/Missile.jsx` | 유도 미사일 배기 연기 | 단일 `MeshBasicMaterial`, 외곽선 메시 없음 | 기준 충족 후보 |

`cloud` 검색 결과 중 Firebase/랭킹의 cloud는 VFX가 아니므로 제외했다. 가마솥 본체의 외곽선은 연기 효과가 아니므로 이번 기준의 제거 대상이 아니다.

## 수용 기준 및 독립 테스트 표

| 항목 | 합격 조건 | 검증 방법 | 변경 전 상태 |
| --- | --- | --- | --- |
| 모든 게임 연기 | smoke/steam VFX에 `BackSide` 외곽선, `outlineMat`, `STAGE_PROP_OUTLINE_RENDERING`, `studioRenderOutline: true`가 없음 | 대상 파일 정적 검색과 렌더 트리 확인 | BigSpawnSmoke 불합격 |
| 도지 출현 연기 재사용 | 가마솥 폭발 연기가 `SpawnSmokeEffect`/동일 퍼프 정의를 직접 재사용하고, 별도 모방 연기 구현이 없음 | import/호출 및 공유 정의 확인 | 미구현 |
| 가마솥 폭발 파편 | 폭발 순간에만 소수의 고정 개수 파편이 보이고 종료 뒤 숨김/재사용됨 | 상수 개수·프레임 갱신·수명 확인 | 미구현 |
| 프레임 안정성 | `useFrame`에서 배열/객체/재질/지오메트리 생성 및 React state 반복 갱신이 없음; 파편은 고정 풀 또는 고정 JSX | 코드 검토 | 미구현 |
| 피해·타이밍 불변 | 15,000ms 간격, 3,000ms 예고, 250ms burst, 피해 최대 HP 20%, 반경 3.2가 보존됨 | `stage4PressureCauldronHazard.test.js` 실행 | 기준값 확인됨 |
| Studio 경로 불변 | `PressureCauldron`의 `StudioTunedGroup itemId="stage-object-pressure-cauldron"`, 구성 등록/프리뷰 경로 유지 | 정적 검색 및 관련 테스트 | 기준 경로 확인됨 |

## 구현 반영 후 실행할 최소 검증

```text
npx vitest run src/components/BigSpawnSmoke.test.js src/components/EnemyVisual.test.js src/components/StageObjects/PressureCauldron.test.js src/components/Game.stage4PressureCauldron.test.js src/lib/stage4PressureCauldronHazard.test.js --maxWorkers=1 --no-file-parallelism
```

제품 코드, Firebase, Studio 값은 이 QA 작업에서 수정하지 않는다.

## 2026-08-23 후속 검증 결과

### 실행 전 상태

- 브랜치: `zombie_only...origin/zombie_only`
- 작업트리는 이미 다수 수정/신규 파일이 있는 상태였다. QA 작업에서 제품 코드는 수정하지 않았고, 이 기록 파일만 갱신했다.
- 관련 변경 확인 명령:
  - `git diff -- Developer/r3f_prototype/src/components/Enemy.jsx Developer/r3f_prototype/src/components/StageObjects/PressureCauldron.jsx Developer/r3f_prototype/src/components/BigSpawnSmoke.test.js Developer/r3f_prototype/src/components/EnemyVisual.test.js Developer/r3f_prototype/src/components/StageObjects/PressureCauldron.test.js Developer/r3f_prototype/src/lib/stage4PressureCauldronHazard.test.js`

### 정적 검증 관찰

| 항목 | 관찰 | 판정 |
| --- | --- | --- |
| BigSpawnSmoke 외곽선 제거 | `BigSpawnSmokeEffect` 구간에서 `BackSide`, `studioRenderOutline: true`, `outlineMat`가 검출되지 않음. 렌더 JSX는 흰 구형 퍼프 `mesh`만 유지. | 합격 후보 |
| Billboard/풀링/미사일 연기 외곽선 | `BillboardSpawnSmokeEffect`는 텍스처 빌보드만 유지. `ZombieInstanceLayer`의 `BackSide`는 좀비 본체 아웃라인 생성 함수이고, smoke 인스턴스는 `MeshBasicMaterial` 단일 plane. `Missile.jsx`의 smoke는 단일 `MeshBasicMaterial` 원통. | 합격 후보 |
| 가마솥 폭발 연기 재사용 | `PressureCauldron.jsx`가 `SpawnSmokeEffect`를 import하고, burst edge에서 `burstSmokeId`를 증가시켜 `<SpawnSmokeEffect key={burstSmokeId} position={[0, 1.8, 0]} visualScale={2.2} />`를 렌더. `visualScale=2.2`는 `isBigSpawnSmoke` 경로에 해당하므로 도지급 3D spawn smoke를 재사용한다. | 합격 후보 |
| 가마솥 파편 | `BURST_DEBRIS`는 6개 고정 `Object.freeze` 배열이고, JSX도 고정 map으로 생성된다. burst 중에만 `burstRef.current.visible = visual.bursting`로 표시된다. | 합격 후보 |
| 프레임 할당/상태 위험 | `useFrame` 안에서는 `BURST_DEBRIS` 고정 배열과 기존 ref를 갱신한다. `setBurstSmokeId`는 `visual.bursting && !wasBurstingRef.current`인 상승 에지에서만 호출되어 매 프레임 반복 state 갱신은 아니다. 단, React state를 useFrame에서 쓰므로 향후 회귀 방지를 위해 테스트/리뷰 포인트로 유지한다. | 관찰 필요 |
| 피해·타이밍 | `stage4PressureCauldronHazard.js` 기준값은 15,000ms interval, 3,000ms boil lead, 250ms burst, 20% damage ratio, radius 3.2로 유지됨. | 합격 후보 |
| Graphics Studio 경로 | `PressureCauldronModel`의 `StudioTunedGroup itemId="stage-object-pressure-cauldron"` 및 preview/layer 경로 테스트가 유지됨. | 합격 후보 |

### 실행 검증

명령:

```text
npx vitest run src/components/BigSpawnSmoke.test.js src/components/EnemyVisual.test.js src/components/StageObjects/PressureCauldron.test.js src/components/Game.stage4PressureCauldron.test.js src/lib/stage4PressureCauldronHazard.test.js --maxWorkers=1 --no-file-parallelism
```

결과:

```text
Test Files  5 passed (5)
Tests       52 passed (52)
Duration    7.08s
```

### 블로커

- 없음.

### 미검증/주의

- 실제 브라우저 플레이 화면·스크린샷으로 폭발 연기/파편의 시각 품질은 확인하지 않았다. 이번 판정은 코드 구조와 단위/정적 테스트 기반이다.
- 작업트리에 B02/B03/B04 보스 로직, 투사체 풀, 디자인 문서 등 본 과제 범위를 넘어 보이는 변경이 함께 존재한다. 본 기록은 연기 외곽선 제거 및 가마솥 폭발 VFX 기준만 다룬다.

## 최종 독립 QA — PASS (2026-08-23 KST)

집중 검증 명령은 통과했다: 5 test files, 52 tests passed.

| 요구 | 결과 | 근거 |
| --- | --- | --- |
| BigSpawnSmokeEffect 외곽선 0건 | PASS | `outline` 재질/메시/`studioRenderOutline: true`가 함수 범위에 없다. |
| 나머지 smoke·steam VFX 외곽선 0건 | PASS | 빌보드·인스턴스 스폰 연기·가마솥 증기·미사일 배기에는 VFX 외곽선 렌더 경로가 없다. 가마솥 본체 외곽선은 연기 효과가 아니므로 제외했다. |
| 가마솥이 `SpawnSmokeEffect`를 rising edge key로 재사용 | PASS | `PressureCauldron.jsx`는 `SpawnSmokeEffect`를 import하고, `visual.bursting && !wasBurstingRef.current` 상승 에지에서 `burstSmokeId`를 갱신해 `<SpawnSmokeEffect key={burstSmokeId} ... visualScale={2.2} />`를 렌더한다. |
| 파편 정확히 6개·고정 선언형 | PASS | `BURST_DEBRIS = Object.freeze([...])`에 6개 항목이 있고, JSX가 이 배열만 map한다. |
| 250ms 동안 방사 이동 후 숨김 | PASS | `visual.bursting`과 `PRESSURE_CAULDRON_BURST_DURATION_MS` 기반 진행률로 위치·회전을 갱신하고 burst 그룹의 visible을 제어한다. |
| 12~15초 증기/흔들림, 15초 주기, 반경 3.2, 최대HP 20% | PASS | 상수 및 hazard/game 호출 경로가 유지되었고 관련 테스트가 통과했다. |
| base scale 0.4·Studio numeric path·7개 주 그룹 순서 | PASS | 기존 `stage-object-pressure-cauldron` StudioTunedGroup/position multiplier와 7개 그룹 순서를 focused test로 통과했다. |
| B02/B03/B04 기존 dirty hunks 보존 | PASS | 초기 감사 후 관련 미커밋 diff가 유지되었고, 이번 QA는 제품 코드를 수정하지 않았다. |

남은 차단 사유는 없다. 단, 실제 브라우저 플레이 화면의 미감/가독성은 별도 시각 QA로만 확정 가능하다.

### 재검증 갱신

- `PressureCauldron.jsx`의 공용 `SpawnSmokeEffect` import/렌더와 `visualScale={2.2}`를 다시 확인했다.
- focused Vitest 재실행: 5 files / 52 tests PASS (2026-08-23 10:34 KST).
- `git diff --check` 통과. 기존 B02/B03/B04 dirty diff도 유지되었다.
