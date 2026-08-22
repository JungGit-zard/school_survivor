# Stage 4 주방 프랍 투명·비정상 표현 읽기 전용 감사

- 일시: 2026-08-22 KST
- Kanban: `t_46da8772` — `escape-zombie-school`, assignee `balanceqa`
- 범위: Stage 4에 실제 배치되는 모든 3D 프랍의 배치·렌더·재질·Studio/Firebase 연결 정적 감사. 코드·자산·Firebase·Studio 값은 변경하지 않았다.
- 화면 증거: 기존 캡처 `Quaility_Assurance/screenshots/stage4_topdown_tilefix_2026-07-26.png`, `stage4_gamecam_tilefix_2026-07-26.png`를 확인했다. 이 캡처는 현상 신고 이전의 구형 바닥/배치 시점이라 현재 회귀의 PASS 증거가 아니다. 당시에는 프랍 표면이 불투명하게 보이며, 알파 텍스처가 프랍을 지우는 증거는 없다.

## 결론

### P0 — Stage 4 주방 표면 전체가 깊이 버퍼에 기록되지 않음

`KitchenProps.jsx`의 9개 모델은 모두 `getStagePropToonMaterial()`을 사용한다. 이 함수는 `propRendering.js:51-53`에서 `getCachedToonMat(..., false)`를 호출하므로 모든 표면의 `depthWrite`가 `false`다. 표면은 `MeshToonMaterial`이며 `transparent`를 명시하지 않아 실제 알파 투명 재질은 아니지만, renderOrder `18`으로 강제된 복합 메시들이 서로 깊이를 기록하지 않아 뒤쪽 메시/세부·인접 프랍과의 정상적인 가림이 무너질 수 있다. 이는 사용자가 말한 “투명하거나 비정상” 현상과 정확히 맞는 가장 우선 원인이다.

대조적으로, 같은 종류의 복합 고정 프랍인 Stage 2 복도와 쓰러진 학생은 `getStagePropDepthWritingToonMaterial()`을 사용해 `depthWrite: true`를 보장한다. 이미 존재하는 해당 함수(`propRendering.js:57-59`)가 정확한 수정 경로다.

**정확한 수정 대상(구현은 본 감사에서 하지 않음):** `Developer/r3f_prototype/src/components/StageObjects/KitchenProps.jsx`의 import 및 `stainlessPalette()`와 각 모델 내부의 `getStagePropToonMaterial` 호출을 `getStagePropDepthWritingToonMaterial`로 교체하고, `stageObjectAssets.test.jsx`에 Stage 4 주방 복합 프랍도 opaque depth pass를 사용한다는 회귀 검증을 추가한다. `STAGE_PROP_OUTLINE_RENDERING`의 `depthWrite:false`는 투명 outline/inverted-hull 용도이므로 바꾸면 안 된다.

### P1 — Studio 개별 재질 clone이 P0 상태를 그대로 복제

`StudioTunedGroup.jsx`는 비기본 material tuning이 있을 때 각 mesh material을 `clone()`한다. clone은 원본 `depthWrite:false`를 그대로 갖는다. 즉 Studio가 원인이 아니라, Studio 조정이 있는 프랍도 P0의 깊이 상태를 유지하는 증폭 경로다. 현재 Studio 코드는 surface `opacity`나 `transparent`를 바꾸지 않으므로 “알파 투명”의 직접 원인은 아니다.

### P1 — 의도된 outline 투명 패스는 원인으로 오인하면 안 됨

모든 outline은 `MeshBasicMaterial`, `transparent:true`, opacity `0.96`, `depthWrite:false`, `BackSide`와 stencil을 사용하는 의도된 inverted-hull이다. outline만의 투명성은 정상이며 surface와 혼동해 수정하면 실루엣이 망가진다.

## 실제 렌더 경로·조건 감사

| 항목 | 확인 결과 |
| --- | --- |
| 배치 정본 | `StageObjects/stageObjectPlacements.js:454-765`의 authored `stage4` 배열. 기본 37개. |
| 렌더 연결 | `Floor.jsx:7-14` → `StageObjectLayer.jsx:65-91`. `stageId`에 맞는 모든 배치를 map하며 Stage 4별 숨김·LOD·거리 culling 조건은 없다. |
| 컴포넌트 등록 | `StageObjectLayer.jsx:15-62`가 Stage 4의 9개 주방 type과 `unconsciousStudent`를 모두 등록한다. 누락 component는 없다. |
| Firebase/Studio | `stagePropPlacements.js`는 Firebase runtime hydrate 배열이 있을 때만 기본 배치 전체를 그 배열로 교체한다. null/미도착이면 authored 기본 배치를 렌더한다. Firebase 상태는 그래픽 표시 gate가 아니다. Studio transform/material tuning은 각 model root에 적용되나 본 감사에서 데이터는 읽거나 변경하지 않았다. |
| 텍스처/알파 | KitchenProps 표면은 bitmap texture/alpha map을 사용하지 않는다. toon gradient는 `toon.js`의 불투명 canvas gradient + `SRGBColorSpace`다. texture alpha/colorSpace가 원인일 경로 없음. |
| `transparent`/`opacity` | Surface: `transparent` 미설정(Three 기본 false), opacity 미설정(기본 1). Outline만 transparent true/0.96. |
| `depthTest`/`depthWrite` | Surface `depthTest` 기본 true, **depthWrite false(P0)**. Outline depthWrite false(정상). |
| `renderOrder` | Surface 18, outline 19. 플레이어는 별도 90/91 안전층이므로 프랍 위에서 보이는 것은 의도된 player-occlusion 정책이며 프랍 투명화가 아니다. |
| resource/dispose | Kitchen box geometry와 cached toon/outline material을 공유하며 JSX dispose는 null이다. Studio만 필요한 경우 재질 clone/소유 dispose한다. 공유재질을 placement별로 dispose하는 경로는 없다. |

## Stage 4 배치 전수 표

공통 source: 배치 `stageObjectPlacements.js`; renderer `StageObjectLayer.jsx`; 주방 component `KitchenProps.jsx`; surface flags `DoubleSide`, opaque, opacity 1, depthTest true, **depthWrite false**, renderOrder 18; outline flags `BackSide`, transparent 0.96, depthWrite false, renderOrder 19. “필요 수정”은 P0을 의미하는 주방 surface의 depth-writing material 전환이며, 배치·scale·rotation·Studio/Firebase 값 변경은 포함하지 않는다.

| ID | 이름/type·variant | source component | type 총 배치수 | 비정상 가능성 | 필요한 정확한 수정 |
| --- | --- | --- | ---: | --- | --- |
| stage4-cookline-north-center | kitchenCookLine | KitchenCookLine | 1 | 매우 높음 | P0 공통 전환 |
| stage4-refrigerator-north-west-closed | kitchenRefrigerator / open false | KitchenRefrigerator | 2 | 매우 높음 | P0 공통 전환 |
| stage4-refrigerator-north-west-open | kitchenRefrigerator / open true | KitchenRefrigerator | 2 | 매우 높음 | P0 공통 전환 |
| stage4-crates-north-west-corner | kitchenCrateStack / count 3 | KitchenCrateStack | 6 | 매우 높음 | P0 공통 전환 |
| stage4-clutter-north-cookline-spill | kitchenClutter / pots | KitchenClutter | 5 | 높음 | P0 공통 전환 |
| stage4-sink-north-east | kitchenSinkCounter | KitchenSinkCounter | 2 | 매우 높음 | P0 공통 전환 |
| stage4-crates-north-east-corner | kitchenCrateStack / count 2 | KitchenCrateStack | 6 | 매우 높음 | P0 공통 전환 |
| stage4-trayrack-north-east-inner | kitchenTrayRack | KitchenTrayRack | 3 | 매우 높음 | P0 공통 전환 |
| stage4-shelfcart-east-north | kitchenShelfCart | KitchenShelfCart | 4 | 매우 높음 | P0 공통 전환 |
| stage4-shelfcart-east-upper | kitchenShelfCart | KitchenShelfCart | 4 | 매우 높음 | P0 공통 전환 |
| stage4-preptable-east-side-counter | kitchenPrepTable / side | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-trash-east-wheelie | kitchenTrashBins / wheelie | KitchenTrashBins | 4 | 높음 | P0 공통 전환 |
| stage4-trayrack-east-mid | kitchenTrayRack | KitchenTrayRack | 3 | 매우 높음 | P0 공통 전환 |
| stage4-crates-east-mid | kitchenCrateStack / count 4 | KitchenCrateStack | 6 | 매우 높음 | P0 공통 전환 |
| stage4-clutter-east-trays | kitchenClutter / trays | KitchenClutter | 5 | 높음 | P0 공통 전환 |
| stage4-preptable-east-south-counter | kitchenPrepTable / side | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-shelfcart-west-north | kitchenShelfCart | KitchenShelfCart | 4 | 매우 높음 | P0 공통 전환 |
| stage4-clutter-west-pots | kitchenClutter / pots | KitchenClutter | 5 | 높음 | P0 공통 전환 |
| stage4-trash-west-wheelie | kitchenTrashBins / wheelie | KitchenTrashBins | 4 | 높음 | P0 공통 전환 |
| stage4-sink-west-mid | kitchenSinkCounter | KitchenSinkCounter | 2 | 매우 높음 | P0 공통 전환 |
| stage4-trash-west-round | kitchenTrashBins / round | KitchenTrashBins | 4 | 높음 | P0 공통 전환 |
| stage4-clutter-west-bags | kitchenClutter / bags | KitchenClutter | 5 | 높음 | P0 공통 전환 |
| stage4-shelfcart-west-south | kitchenShelfCart | KitchenShelfCart | 4 | 매우 높음 | P0 공통 전환 |
| stage4-crates-south-west-corner | kitchenCrateStack / count 3 | KitchenCrateStack | 6 | 매우 높음 | P0 공통 전환 |
| stage4-preptable-south-serving-left | kitchenPrepTable / side | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-preptable-south-serving-right | kitchenPrepTable / side | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-crates-south-west-stack | kitchenCrateStack / count 3 | KitchenCrateStack | 6 | 매우 높음 | P0 공통 전환 |
| stage4-crates-south-center-stack | kitchenCrateStack / count 2 | KitchenCrateStack | 6 | 매우 높음 | P0 공통 전환 |
| stage4-clutter-south-trays | kitchenClutter / trays | KitchenClutter | 5 | 높음 | P0 공통 전환 |
| stage4-trash-south-round | kitchenTrashBins / round | KitchenTrashBins | 4 | 높음 | P0 공통 전환 |
| stage4-trayrack-south-east | kitchenTrayRack | KitchenTrayRack | 3 | 매우 높음 | P0 공통 전환 |
| stage4-preptable-center-north | kitchenPrepTable / cutting | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-preptable-center-mid-west | kitchenPrepTable / pans | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-preptable-center-mid-east | kitchenPrepTable / bare | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-preptable-center-south | kitchenPrepTable / pans | KitchenPrepTable | 8 | 매우 높음 | P0 공통 전환 |
| stage4-student-serving-south | unconsciousStudent / faceUp(런타임 flipped 가능) | UnconsciousStudent | 2 | 낮음 | 수정 불필요: 이미 depthWrite true |
| stage4-student-kitchen-northeast | unconsciousStudent / sideLeft(런타임 flipped 가능) | UnconsciousStudent | 2 | 낮음 | 수정 불필요: 이미 depthWrite true |

## 배치·가시성 보조 확인

- 35개 주방 프랍: cook line 1, refrigerator 2, crate stack 6, clutter 5, sink 2, tray rack 3, shelf cart 4, prep table 8, trash bins 4.
- 쓰러진 학생 2개는 `UnconsciousStudent.jsx`가 이미 `getStagePropDepthWritingToonMaterial`을 사용한다.
- `kitchenClutter` 5개만 `blocking:false`이며, 이는 물리 충돌 설정일 뿐 visibility/material/opacity와 연결되지 않는다.
- Stage 4에는 Stage 1 전용 visible-envelope filter, LOD, conditional `visible={false}`, alphaTest, material map, dynamic opacity animation이 없다.

## 읽기 전용 검증

실행:

```text
npm.cmd test -- src/components/StageObjects/stageObjectAssets.test.jsx src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectColliders.test.js
```

- pretest gates: branch guard, legacy B02, dialogue store, Studio-game sync contract 모두 통과.
- `stageObjectColliders.test.js`: 14 tests 통과.
- 전체 67개 중 60개 통과, 7개 실패. Stage 4 renderer 원인과 직접 관련 없는 기존 불일치다: Stage 1/2 authored placement 기대값 6건, `ClassroomDesk.jsx`가 이미 depth-writing material로 전환됐는데 test가 과거 `getStagePropToonMaterial`을 요구하는 1건. 본 감사는 파일을 수정하지 않아 이 실패들을 고치지 않았다.

## 비범위/금지 보존

- 바닥, 가마솥, 타이틀, Studio 값, Firebase 데이터, 오디오, 5173 서버를 변경하거나 실행하지 않았다.
- 수정 작업은 별도 `threemini` 구현 카드에서 P0 변경만 수행하고 Stage 4 실제 화면 RED/GREEN 캡처로 확인해야 한다.
