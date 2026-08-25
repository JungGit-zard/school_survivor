# Stage 1~3 조명 런타임 기술 맵 — 2026-08-25

## 범위

- 목적: Stage 1 교실, Stage 2 복도, Stage 3 체육관의 분위기 조명을 위한 가장 작은 R3F 경계와 그 구현 결과를 기록한다.
- 2026-08-25 구현은 그래픽 master plan의 승인값을 `stageLightingProfile`과 정적 `StageLighting`으로 적용했다. Stage 4 계획과 타이틀은 변경 대상이 아니다.
- 제품 코드 변경 범위는 `src/lib/stageLightingProfile.js`, `src/components/StageLighting.jsx`, `src/components/Game.jsx`의 단일 mount와 focused tests뿐이다. Firebase, Graphics Studio, floor, Enemy/VFX/gameplay는 변경하지 않았다.
- Kanban: 기술 조사 `escape-zombie-school` / `t_b6549eb8` (`levelmini`), 구현 `t_1768f94e` (`threemini`).

## 1. 공용 정본: 먼저 보존할 것

| 항목 | 현재 값 / 파일 | 구현 시 규칙 |
| --- | --- | --- |
| gameplay Canvas | `fov 30`, `[0,17,17]`, near `0.1`, far `500`, DPR `[1,1.5]`, `shadows`, `stencil: true` — `src/components/GameCanvas.jsx:16-25` | 카메라, DPR, renderer/gl option, global tone mapping을 바꾸지 않는다. |
| 공용 3광원 | ambient `0.38` / `0x6d6780`, directional `[-10,22,12]` / `3.2`, warm directional `[10,12,-10]` / `0.85` / `0xffe2b0` — `Game.jsx:175-181` | Stage 1~3 분위기 작업의 수정 대상이 아니다. 값 하나를 고치면 Stage 4도 같이 바뀐다. |
| floor mount | `Floor`가 공용 조명 바로 뒤에 mount — `Game.jsx:183-185` | 후속 Stage-light subtree는 공용 3등 뒤, `Floor` 앞에 둔다. |
| 물체/Studio 경계 | `StageObjectLayer`는 Firebase Studio placement version으로만 배치를 다시 읽음 — `StageObjectLayer.jsx:68-91` | 조명을 Studio placement/transform/tuning이나 Firebase 저장 모델로 만들지 않는다. |
| Stage 4 분리 | Stage 4는 별도 계획에서 공용 3등 유지 + 추가 2등 이하를 예정함 — `Developer/stage4_lighting_runtime_technical_map_2026-08-23.md:§5-6` | Stage 1~3 profile은 `stage4`에 대해 빈 배열을 반환한다. Stage 4 구현 seam/가마솥 cue를 합치거나 바꾸지 않는다. |

공용 Canvas는 shadow renderer가 켜져 있어도, 새 Stage-light에는 `castShadow={false}`를 명시한다. Stage별로 dynamic light를 만들면 150 적 pool과 200 visual slot 구조(`lib/enemyEntityPool.js:1-3`, `components/PooledEnemyVisuals.js:1-5`)의 비용 예산을 깨므로 적·발사체·프롭·VFX마다 light를 붙이지 않는다.

## 2. Stage별 현재 배경과 위험 표식

### Stage 1 — 교실 생존

| 관측 | 정확한 현재 값 | 조명 위험 / 보존 결론 |
| --- | --- | --- |
| 공간 | `halfX=10`, `halfZ=14.4` (`20×28.8`), B01, boss warning 150초 — `lib/stageConfig.js:21-36` | 세로로 긴 교실의 북·남 끝을 어둡게 만들면 보스 접근 방향과 출구 이동로가 사라진다. 바닥/테두리의 중간 명도는 유지한다. |
| 바닥 | `tile_stage01.webp`, 약 `6.9`-unit repeat, 정확히 `20×28.8` floor — `ClassroomFloor.jsx:34-42`; Lambert material/`receiveShadow` — `ClassroomFloor.jsx:157-172,213-218` | 바닥의 명암은 공용 directional에 반응한다. 광량을 공용으로 낮추지 않으며, 새 red wash로 B01 경고와 동일한 의미를 만들지 않는다. |
| 소품 | 교실 책상·의자·학생은 `StageObjectLayer.jsx:34-39`, authored placement는 전투 중심을 비우도록 `|x|>=6 OR |z|>=12` 계약을 가진다 — `stageObjectPlacements.js:1-10`, `stageObjectPlacements.test.js:58` | 소품마다 light를 넣지 않는다. 정적 상단/창가 practical 하나가 필요해도 길을 넓게 비추는 역할까지만 허용한다. |
| B01 돌진 | B01은 `warnDist 6.0`, warn `800ms`, charge `2200ms`, `mathTeacherSpecial` — `Enemy.jsx:357-362`; warn 중 3D `GO!` bubble은 흰 `0xfff4d8`, red `0xff392e`, toon emissive와 outline으로 렌더됨 — `Enemy.jsx:415-478`, `1434-1452` | B01의 빨강/흰 말풍선은 이미 자체 명암을 갖는다. stage light는 보스 추적등이나 점멸등이 아니라 배경 분리용 정적 light여야 한다. |
| B01 후속 스윙 | windup `320ms`, recovery `430ms`, 140°, radius `1.575` — `lib/mathTeacherSpecial.js:3-14`; runtime은 돌진 방향을 유지해 휘두름 — `Enemy.jsx:1492-1539` | 짧은 스윙에 별도 flash/light를 추가하면 320ms 판독을 방해할 수 있다. 이 공격의 색·타이머·판정은 조명 카드의 수정 대상이 아니다. |

기술적으로 허용되는 분위기 방향은 **차분한 수업 종료 뒤의 교실**이다. 새 등은 창측의 희미한 냉색 또는 교단 측의 약한 중성 practical처럼, 바닥과 B01의 검은 외곽선을 분리하는 정적 fill만 담당한다. 최종 값은 그래픽 master plan 승인값을 사용한다.

### Stage 2 — 복도 투사체 시험

| 관측 | 정확한 현재 값 | 조명 위험 / 보존 결론 |
| --- | --- | --- |
| 공간 | `halfX=7.5`, `halfZ=19.2`의 긴 복도, B02, E04 intro `72s` — `lib/stageConfig.js:44-60` | 좁고 긴 축의 끝을 black crush하면 투사체 진입 방향을 읽지 못한다. 하지만 통로 전체를 푸른색으로 씻으면 B02 cyan 표식과 합쳐진다. |
| 바닥 | corridor tile, repeat `70`, `200×200` base floor — `ClassroomFloor.jsx:44-50`; 바닥은 Lambert/`receiveShadow` — `ClassroomFloor.jsx:157-172,213-218` | floor만 조명 반응이 있으므로 light가 복도 폭의 안전한 바닥길을 망치지 않게 한다. floor size/UV repeat 변경은 범위 밖이다. |
| 복도 overlay/end wall | end-wall material과 corridor overlays는 `MeshBasicMaterial`; dark overlay `0x2f3942` opacity `.16`, safe lane `0x4e725f` opacity `.07`, `toneMapped` 기본 경로 — `ClassroomFloor.jsx:176-209`; lane 계약은 3개/폭 6 — `ClassroomFloor.jsx:65-69` | Basic material overlay는 real light로 밝아지지 않는다. 조명으로 안전 lane 또는 종단 벽의 의미를 바꾸려 하지 말고, floor·캐릭터 대비만 보조한다. |
| 프롭 | locker/custodian cart/lost-found-board가 toon depth-writing surface 재질을 쓴다 — `StageObjectLayer.jsx:40-42`, `CorridorProps.jsx:1-29` | 금속 프롭마다 작은 point light를 추가하지 않는다. 길게 놓인 정적 practical 한 개면 충분하다. |
| B02 봉쇄 | telegraph surface `#22cbd2` opacity `.48`, outline `#063b46` `.82`; active surface `#24edf0` `.9`, outline `#052f39` `.96` — `Enemy.jsx:552-588`. 전부 `MeshBasicMaterial`, `toneMapped={false}`, `depthWrite={false}` | cyan 표식은 조명과 별도로 노출이 고정된다. cyan/blue Stage light, fog 또는 bloom은 표식의 배경 대비만 낮출 수 있으므로 쓰지 않는다. |
| B02 runtime | B02만 Stage 2에서 blockade 시각을 render하며 `telegraph -> warn`, active -> stun으로 전환 — `Enemy.jsx:1121-1159,1595-1600` | light가 B02 위치를 추적하거나 lane 상태와 함께 깜빡이면 안 된다. 공격 phase/timing은 그대로 둔다. |

기술적으로 허용되는 분위기 방향은 **비상 조명만 남은 긴 복도**다. 단일 중성/약냉색 longitudinal fill과, 필요 시 낮은 강도의 반대쪽 warm rim까지로 제한한다. B02의 cyan을 조명 색으로 복제하지 않는 것이 핵심이다.

### Stage 3 — 체육관 총력전

| 관측 | 정확한 현재 값 | 조명 위험 / 보존 결론 |
| --- | --- | --- |
| 공간 | `halfX=7.5`, `halfZ=19.2`, B03, E04 intro `34s` — `lib/stageConfig.js:68-87` | 넓은 목재 바닥의 중앙/모서리 명도 차가 너무 크면 다방향 전투의 적 실루엣이 사라진다. |
| 바닥 | procedural wood: base `#c79a5b`, light `#d4a866`, dark `#b6873f`, white court line `#f4f1e8`, red key paint `#c1533b` — `ClassroomFloor.jsx:71-84`; texture/material은 stage mount 시 생성·dispose — `ClassroomFloor.jsx:222-251` | 이미 warm wood, white line, red paint가 있다. 새 amber/red wash는 court/위험 색을 뭉개므로 금지한다. floor texture/material lifecycle을 조명으로 바꾸지 않는다. |
| 코트/벽 | court line/paint는 `MeshBasicMaterial` (`paint opacity .22`), wall/stripe만 Lambert; wall은 `2.6` height, `0.4` thickness, stripe `#3b6ea5`; wall meshes only cast/receive shadow — `ClassroomFloor.jsx:257-335` | Basic court markings는 light에 반응하지 않는다. 새 light의 목적은 목재·B03·적의 형태 분리이며 코트 선을 더 밝히는 것이 아니다. |
| 프롭 | hoop은 blue `0x2457a6`, red `0xb53625`, white `0xf2eee4`; basketball는 orange `0xd97424` — `GymProps.jsx:54-88,93-136` | yellow/orange B03 lane와 농구공/콘이 혼동될 수 있다. 프롭별 조명 및 amber flood는 금지한다. |
| B03 왕복 레인 | telegraph `#f5b83d`/.44, outbound `#ffd34e`/.82, returning `#e6a81f`/.86, outline opacity `.82-.98`; `MeshBasicMaterial`, `toneMapped={false}`, `depthWrite={false}` — `Enemy.jsx:596-657` | B03 위험 lane은 조명 영향을 받지 않는다. amber light를 더해도 lane 자체는 밝아지지 않고, 바닥을 황색화해 테두리 대비만 잃는다. |
| B03 runtime | Stage 3에서만 B03 shuttle state가 render되고, telegraph에는 `warn`, active에는 `run` pose를 준다 — `Enemy.jsx:1166-1214,1602-1608` | B03 추적등/phase pulsing은 추가하지 않는다. runner의 model outline과 lane을 독립 신호로 유지한다. |

기술적으로 허용되는 분위기 방향은 **경기 종료 뒤 소등 직전의 체육관**이다. 중성 상단 fill 하나와 차가운 측면 rim 하나 이하로 wood floor와 선수 실루엣을 분리하며, yellow/orange/red를 새 light 색으로 쓰지 않는다.

## 3. 구현된 최소 seam

구현은 `src/lib/stageLightingProfile.js`, `src/components/StageLighting.jsx`, `src/components/Game.jsx`의 세 경계로 끝냈다.

1. `stageLightingProfile.js`는 `stage1`, `stage2`, `stage3`의 승인된 **불변 plain-data profile**만 export한다. 각 stage는 정적 Spot 3개이며, unknown과 `stage4`는 같은 frozen 빈 배열을 반환한다.
2. `StageLighting.jsx`는 profile을 순회해 static JSX만 render하고, `Game.jsx`에서 공용 3광원 뒤·`Floor` 앞에 `<StageLighting stageId={currentStageId} />`를 한 번 mount한다. `useFrame`, `setState`, mutable per-frame intensity, random, material/geometry 생성은 없다.
3. profile은 Stage별 **실제 정적 Spot 3개**, 모두 `castShadow={false}`다. Spot이 승인된 target 좌표를 실제로 향하도록 active Spot당 static `Object3D` target 하나만 연결한다. 이는 visible helper/draw가 아니며 per-frame allocation도 아니다. fog, bloom, environment map, post-processing, extra floor mesh는 만들지 않는다.

이 seam은 Stage 4의 기존 계획과 충돌하지 않는다. Stage 4는 빈 배열이라 현재 공용 3등 결과가 완전히 보존되고, Stage 4 전용 cue는 계속 별도 `Game.jsx` 조건 subtree로만 향후 검토할 수 있다.

다음 경계는 사용하지 않는다.

- `GameCanvas.jsx`: camera/DPR/shadows/stencil/tone mapping 변경 금지.
- `ClassroomFloor.jsx`: tile, CanvasTexture, UV, floor material, court/end-wall/overlay 변경 금지.
- `Enemy.jsx`, `VFXLayer.jsx`, `mathTeacherSpecial.js`, B02/B03 pure state module: 보스 표식 색·opacity·시간·피해·phase 변경 금지.
- `StageObjectLayer.jsx`, prop component, StudioTunedGroup, Firebase adapter: placement/material transform 혹은 저장 연결 금지.
- title scene 및 preview Canvas: 사용자 명시가 없으므로 수정 금지.

## 4. 가시성 보정 승인값

2026-08-25 그래픽 전문가 확정 색-zone안에 따라 각 Stage의 기존 local 2등을 정적 Spot 3개로 교체했다. 각 Spot은 exact position/target/color/intensity/distance/angle/penumbra를 가지며 `castShadow=false`다. Stage 4/unknown frozen 빈 배열과 공용 3광원은 불변이다.

| Stage | 북측 Spot | 서측 Spot | 남측 Spot |
| --- | --- | --- | --- |
| 1 교실 | `[-1,7,-12.5]`→`[0,0,-9]`, `#3CCBFF`, `184/15/.85/.32` | `[-7,6,0]`→`[0,0,0]`, `#B96CFF`, `168/14/.72/.36` | `[1,7,12.5]`→`[0,0,9]`, `#FFD166`, `184/15/.85/.32` |
| 2 복도 | `[0,7,-18]`→`[0,0,-12]`, `#D85CFF`, `190/16/.72/.34` | `[-6,6,0]`→`[0,0,0]`, `#FFB45B`, `164/15/.78/.38` | `[2,7,17]`→`[0,0,12]`, `#5E86FF`, `180/16/.70/.34` |
| 3 체육관 | `[-1,8,-17]`→`[0,0,-11]`, `#54C7FF`, `210/17/.72/.34` | `[-7,7,0]`→`[0,0,0]`, `#A77BFF`, `184/16/.70/.38` | `[1,8,17]`→`[0,0,11]`, `#F08CFF`, `210/17/.72/.34` |

이는 Stage 1의 창가 차가운 키와 따뜻한 교실 보조, Stage 2의 청록 복도 키와 회색 보조, Stage 3의 밝은 체육관 키와 따뜻한 측면 보조를 공용 3광원 위에서도 분명하게 남기기 위한 최소 조정이다. fog, bloom, shadow, per-enemy/per-prop light, per-frame 변경은 추가하지 않았다.

## 5. 구현 테스트와 결과

TDD는 profile/component/Game mount 부재를 확인하는 RED 뒤에 시행했다.

| 테스트 | 검증 내용 |
| --- | --- |
| `src/lib/stageLightingProfile.test.js` | Stage 1~3 승인 profile의 정확한 값, 2개 상한, `castShadow=false`, immutable nested array 및 stage4/unknown의 동일 frozen 빈 배열을 검증한다. |
| `src/components/StageLighting.test.js` | static Spot target `Object3D` 연결과 `useFrame`/`setState`/visible helper/per-frame allocation 부재를 source contract로 검증한다. |
| `src/components/Game.stageLighting.test.js` | `Game.jsx`가 공용 3광원 값(`0.38`, `3.2`, `0.85`)을 그대로 보존하고, Stage-light subtree가 공용 light 뒤와 `Floor` 앞에 한 번만 존재함을 검증한다. |
| 기존 focused regression | `ClassroomFloor.test.jsx`, `EnemyVisual.test.js`, `EnemyMathTeacherSpecial.test.js`, `Game.stage4PressureCauldron.test.js`, `stageConfig.test.js`를 함께 실행해 floor 계약·B01/B02/B03/B04 표식·Stage 4 hazard가 바뀌지 않았음을 확인한다. |

RED는 새 profile/component/Game mount 부재로 3 suite가 실패했다. GREEN focused suite는 3 files / 8 tests PASS, 기존 회귀를 포함한 focused run은 7 files / 63 tests PASS, production build도 PASS했다. 추가 조명은 정적 JSX이므로 per-frame allocation 검사는 source guard로 충분하다. renderer info와 frame time의 전후 계측은 수행하지 않았으므로 현재 절대 수치를 주장하지 않는다.

## 6. 브라우저 시각 검증 상태

사용자 지시로 브라우저 시각 검증은 중단했고 재실행하지 않는다. 임시 R3F harness와 그 캡처는 삭제했으며, Stage 1~3의 실제 화면·모바일·renderer/frame-time PASS는 **주장하지 않는다**. 후속 QA는 별도 사용자 지시와 QA 카드가 있을 때만 진행한다.

## 7. 이번 조사 검증

- 필수 precommand: `check-required-documents.ps1 -Profile levelmini -Domain auto -TaskSummary 'stage1 stage2 stage3 lighting runtime technical map'` 성공. receipt SHA-256: `f334bea3a521c7e009d09678b448c8ca03aff780243ec67f7806fdd4267695ca`.
- Stage 4 technical map/master plan/QA plan, `Game.jsx`, `GameCanvas.jsx`, `ClassroomFloor.jsx`, `stageConfig.js`, Stage prop layers, boss/VFX source, existing regression tests를 정적으로 조사했다.
- 초기 구현 후 RED/GREEN, focused 8 tests, regression 63 tests, production build를 확인했다. 이번 가시성 보정은 새 exact-profile 계약으로 RED를 확인했으며 GREEN focused/build 결과는 아래 실행 결과로 갱신한다. 브라우저 시각 검증은 사용자 지시로 중단·삭제되어 결과를 주장하지 않는다.
