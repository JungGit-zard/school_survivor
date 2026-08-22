# Stage 4 가로 절반·X 전용 배치 이동 사전 감사

- 일시: 2026-08-23 KST
- Kanban: `t_1a2a4c45` (`escape-zombie-school`, `balanceqa`)
- 범위: 읽기 전용. Stage 4의 사용자 지정값과 현재 정본 소비처·프랍·콜라이더·카메라·스폰·B04/투사체를 매핑했다.
- 변경 금지 준수: source, Studio/Firebase 데이터, 자산, 5173, 커밋, push를 변경하지 않았다.

## 사용자 지정 정본과 판정

| 항목 | 현재 | 사용자 지정값 | 이행 규칙 |
| --- | ---: | ---: | --- |
| Stage 4 `mapHalfX` | 14.4 | **7.2** | 정확히 적용 |
| Stage 4 `mapHalfZ` | 16 | **16** | 변경 금지 |
| 바닥 폭 × 깊이 | 28.8 × 32 | **14.4 × 32** | bounds 단일 정본에서 파생 |
| 타일 repeatX × repeatZ | 36 × 40 | **18 × 40** | 0.8 world-tile 정본을 유지해 파생 |
| 모든 Stage 4 authored placement X | 현재 X | **현재 X × 0.5** | Y/Z/rotation/scale/props/blocking은 절대 불변 |

이 감사는 위 값을 다른 값으로 바꾸지 않는다. 다만 X만 절반으로 줄이면 콜라이더의 실제 크기는 줄지 않으므로, 구현 전 검증에서 확인해야 할 물리 위험을 아래에 명시한다.

## 실제 배치 집합: authored 38개 / runtime 34개

`stageObjectPlacements.js` authored `stage4`에는 주방 프랍 35개, 압력 가마솥 1개, 학생 2개가 있다. runtime `getStageObjectPlacements('stage4')`는 legacy 중앙 prep-table 4개를 제거하고 가마솥 1개를 정본으로 보장하므로 34개를 렌더/충돌 경로에 보낸다. 사용자의 “모든 소품 X×0.5”는 authored 38개 모두에 적용해야 하며, runtime 제거 대상 4개도 authored 값 자체는 동일 규칙을 따른다.

| ID | type / variant | 현재 X | 새 X (=×0.5) | runtime | Z·rotation·scale·props |
| --- | --- | ---: | ---: | --- | --- |
| stage4-cookline-north-center | kitchenCookLine | -0.6 | -0.3 | 사용 | 불변 |
| stage4-refrigerator-north-west-closed | kitchenRefrigerator / closed | -12.6 | -6.3 | 사용 | 불변 |
| stage4-refrigerator-north-west-open | kitchenRefrigerator / open | -9.6 | -4.8 | 사용 | 불변 |
| stage4-crates-north-west-corner | kitchenCrateStack / 3 | -13.05 | -6.525 | 사용 | 불변 |
| stage4-clutter-north-cookline-spill | kitchenClutter / pots | 3.6 | 1.8 | 사용 | 불변 |
| stage4-sink-north-east | kitchenSinkCounter | 7.4 | 3.7 | 사용 | 불변 |
| stage4-crates-north-east-corner | kitchenCrateStack / 2 | 10.8 | 5.4 | 사용 | 불변 |
| stage4-trayrack-north-east-inner | kitchenTrayRack | 9.2 | 4.6 | 사용 | 불변 |
| stage4-shelfcart-east-north | kitchenShelfCart | 12.6 | 6.3 | 사용 | 불변 |
| stage4-shelfcart-east-upper | kitchenShelfCart | 12.9 | 6.45 | 사용 | 불변 |
| stage4-preptable-east-side-counter | kitchenPrepTable / side | 12.5 | 6.25 | 사용 | 불변 |
| stage4-trash-east-wheelie | kitchenTrashBins / wheelie | 13.1 | 6.55 | 사용 | 불변 |
| stage4-trayrack-east-mid | kitchenTrayRack | 12.7 | 6.35 | 사용 | 불변 |
| stage4-crates-east-mid | kitchenCrateStack / 4 | 13.05 | 6.525 | 사용 | 불변 |
| stage4-clutter-east-trays | kitchenClutter / trays | 12.2 | 6.1 | 사용 | 불변 |
| stage4-preptable-east-south-counter | kitchenPrepTable / side | 12.8 | 6.4 | 사용 | 불변 |
| stage4-shelfcart-west-north | kitchenShelfCart | -12.7 | -6.35 | 사용 | 불변 |
| stage4-clutter-west-pots | kitchenClutter / pots | -13.2 | -6.6 | 사용 | 불변 |
| stage4-trash-west-wheelie | kitchenTrashBins / wheelie | -13.1 | -6.55 | 사용 | 불변 |
| stage4-sink-west-mid | kitchenSinkCounter | -13.65 | -6.825 | 사용 | 불변 |
| stage4-trash-west-round | kitchenTrashBins / round | -13 | -6.5 | 사용 | 불변 |
| stage4-clutter-west-bags | kitchenClutter / bags | -12.4 | -6.2 | 사용 | 불변 |
| stage4-shelfcart-west-south | kitchenShelfCart | -12.9 | -6.45 | 사용 | 불변 |
| stage4-crates-south-west-corner | kitchenCrateStack / 3 | -13.05 | -6.525 | 사용 | 불변 |
| stage4-preptable-south-serving-left | kitchenPrepTable / side | -3.4 | -1.7 | 사용 | 불변 |
| stage4-preptable-south-serving-right | kitchenPrepTable / side | 1.8 | 0.9 | 사용 | 불변 |
| stage4-crates-south-west-stack | kitchenCrateStack / 3 | -10.8 | -5.4 | 사용 | 불변 |
| stage4-crates-south-center-stack | kitchenCrateStack / 2 | -7.2 | -3.6 | 사용 | 불변 |
| stage4-clutter-south-trays | kitchenClutter / trays | 5.8 | 2.9 | 사용 | 불변 |
| stage4-trash-south-round | kitchenTrashBins / round | 8.6 | 4.3 | 사용 | 불변 |
| stage4-trayrack-south-east | kitchenTrayRack | 11.6 | 5.8 | 사용 | 불변 |
| stage4-preptable-center-north | kitchenPrepTable / cutting | -0.3 | -0.15 | legacy 제거 | 불변 |
| stage4-preptable-center-mid-west | kitchenPrepTable / pans | -5.9 | -2.95 | legacy 제거 | 불변 |
| stage4-preptable-center-mid-east | kitchenPrepTable / bare | 5.6 | 2.8 | legacy 제거 | 불변 |
| stage4-preptable-center-south | kitchenPrepTable / pans | 0 | 0 | legacy 제거 | 불변 |
| stage4-pressure-cauldron-center | pressureCauldron | 0 | **0** | 사용 | 불변 |
| stage4-student-serving-south | unconsciousStudent / faceUp | 4.2 | 2.1 | 사용 | 불변 |
| stage4-student-kitchen-northeast | unconsciousStudent / sideLeft | 9.1 | 4.55 | 사용 | 불변 |

## 콜라이더·겹침·플레이어 시작점

- Stage 4 실제 blocking 경로는 `stageObjectColliders.js`의 8개 주방 type + `pressureCauldron`이며, `kitchenClutter`와 학생은 blocking이 아니다.
- 가마솥은 `stage4-pressure-cauldron-center`, position `[0,0,0]`, scale `1`이며 X×0.5 후에도 정확히 `[0,0,0]`이다. 현재 collider footprint는 vessel 1.144×1.144 및 front-step z=0.646으로, start `[0,0,7]`과 Z 간격이 최소 6.282이므로 시작 즉시 충돌하지 않는다.
- 새 player movement X 범위는 `[-5.2, 5.2]` (`halfX - PLAYER_INSET_X`)다. start X=0은 안전하다. Z 범위는 `[-12, 15.2]`로 불변이다.
- X만 압축하면 같은 Z lane의 가까운 blocker 사이 간격은 줄어든다. 특히 북서 냉장고 2대의 center 거리 X=1.5, 남쪽 serving prep-table 2대의 center 거리 X=2.6으로 줄어든다. 현 collider footprint 기준으로 양쪽 모두 양의 여유가 남지만, 회전 반영 AABB를 구현 후 반드시 다시 검증해야 한다.
- **확정 물리 위험:** `stage4-sink-west-mid`의 새 center X=-6.825이다. 회전·scale 반영 sink collider halfX는 약 0.59이므로 left extent 약 -7.41로 새 wall X=-7.2를 약 0.21 넘는다. 이는 사용자 지정 X×0.5와 unchanged scale/rotation의 직접 결과다. 값을 보정하지 말고, 구현 시 Stage 4 collider-in-bounds test의 기대를 사용자 지정 결과에 맞춰 검토해야 한다.
- 다른 edge blocker는 새 center가 ±6.55 이하이고 현 footprint를 포함해 새 경계 안쪽으로 남는 것으로 정적 계산됐다. source 수정 뒤에는 `getStageObjectSightObstacles('stage4')` 및 Rapier collider로 전수 재계산해야 한다.

## bounds 소비처 전수 지도

| 영역 | 현재 소비처 | halfX=7.2 영향 | 후속 구현 시 처리 |
| --- | --- | --- | --- |
| 정본 | `lib/stageConfig.js:117-118`, `getStageBounds` | 14.4→7.2 | 이 값만 변경하는 단일 경계 정본 |
| 바닥 텍스처 | `components/ClassroomFloor.jsx:21-32,51-56` | width 14.4, repeatX 18; depth/repeatZ 32/40 유지 | 코드 추가 불필요; literal test 갱신 |
| 물리 바닥/벽 | `components/Floor.jsx:20-40` | ground plane·4 wall collider가 자동 축소 | 추가 하드코딩 없음 |
| 카메라 | `components/Game.jsx:111-133` | `fitZoom`·focus clamp·screenBounds 자동 재계산, 가로 zoom-in | 추가 하드코딩 없음 |
| 플레이어 | `lib/playerMovementBounds.js:16-35` | X ±12.4→±5.2 | 추가 하드코딩 없음; start `[0,0,7]` 불변 |
| 배치 런타임 | `StageObjects/stageObjectPlacements.js:452-765,914-928` | 모든 authored X를 정확히 절반 | 38개 모두; Y/Z/rotation/scale/props 유지 |
| Rapier/시야 | `stageObjectColliders.js:350-430`, `StageObjectColliderLayer.jsx` | 새 placement를 자동 반영 | wall 밖 sink extent를 회귀 검증에 명시 |
| 일반/formation spawn | `components/Enemies.jsx:156-166,242-247,389-511,1485,1735-1736` | spawn X limit `halfX-SPAWN_INSET`: 12.9→5.7 | 코드 추가 불필요, 좁아진 공간에서 spawn test 필요 |
| 적 이동/회피 | `lib/enemySimulation.js:320-328,333-465,502-520,545-764` | position clamp, obstacle resolve, grid, runner despawn 자동 축소 | Stage4 obstacle/좁은 폭 focused simulation 필요 |
| B04 Soup Blast | `components/Enemy.jsx:1203-1220`, `lib/b04SoupBlast.js:31-50` | x clamp가 ±6.1(7.2-1.1)로 축소 | 로직은 자동 추종; 3개 원형 생성 회귀 필요 |
| E04/B04 projectile | `Enemy.jsx:1287-1301`, `enemySimulation.js:294-300` | 발사 gate는 bounds 직접 소비 안 함; shooter 위치만 영향 | 별도 값 수정 없음 |
| portal | `EscapePortal.jsx:29-49` | 후보 X ±11.4→±4.2 | bounds 자동 추종. authored placement origin을 참조하므로 새 X 배치 뒤 portal 거리 검증 필요 |
| quest fallback | `QuestWorldLayer.jsx:82-90` | fallback 위치 자동 축소 | 추가 값 없음 |
| Studio editor | `StagePropPlacementEditor.jsx:111-113,266-269`; `stagePropEditorGeometry.js:55-99` | viewport / clamp 자동 축소 | Firebase/Studio 저장값은 수정 금지 |
| 검증 simulator | `stageBalanceProbe.js:181-202`, `gameplaySoak.js:351-356`, `stageMultiHzParity.js:73-76,144-155,271-341` | bounds를 자동 소비 | Stage4 결과는 새 폭 기준으로 재검증 |

## 갱신이 필요한 고정 기대/설명

- `lib/stageConfig.test.js:141`: Stage 4 bounds `14.4` → `7.2`.
- `components/ClassroomFloor.test.jsx:47,52`: floor width `28.8` → `14.4`, repeatX `36` → `18`; depth 32 / repeatZ 40은 불변.
- `lib/b04SoupBlast.test.js:23,25`: literal halfX `14.4` → `7.2`.
- `stageObjectPlacements.js:8,452`와 `burstEvents.js:198`의 기존 halfX 14.4 설명도 사용자 지정 정본과 동기화가 필요하다.
- `stageObjectColliders.test.js:292-303`는 모든 Stage4 blocker extent가 `±halfX` 안이라는 기존 계약이다. X-only 변환 시 sink-west-mid만 약 0.21을 넘으므로, 이 테스트의 새 사용자 지정 계약을 명시적으로 결정·검증해야 한다. 값/배치/회전/scale을 임의 보정하면 안 된다.

## 구현 후 최소 검증 기준

1. `getStageBounds('stage4') === { halfX: 7.2, halfZ: 16 }`.
2. 바닥 `floorWidth=14.4`, `floorDepth=32`, `repeatX=18`, `repeatZ=40`.
3. authored Stage 4 38개 각각의 `newX === oldX * 0.5`; 그 외 placement 필드는 byte/semantic 동일.
4. runtime 가마솥은 정확히 한 개, `[0,0,0]`; player start는 정확히 `[0,0,7]`.
5. 새 bounds로 Stage4 collider/sight obstacle, spawn/formation, B04 Soup Blast 3-circle, portal 후보, game camera frame을 확인한다. sink-west-mid wall extent는 사용자 지정값 그대로의 known case로 남기고 테스트가 무엇을 보장하는지 명확히 기록한다.
