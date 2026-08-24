# Stage 1~3 조명 런타임 기술 맵 — 2026-08-25

## 범위

- 목적: Stage 1 교실, Stage 2 복도, Stage 3 체육관의 분위기 조명을 **나중에 구현할 수 있는 가장 작은 R3F 경계**를 기록한다.
- 이 문서는 구현 사양이 아니다. 미확정 조명 색·세기·좌표는 그래픽 기획 승인 뒤에만 profile에 넣는다.
- 제품 source, Firebase, Graphics Studio, 브라우저, 테스트는 변경하지 않았다. Stage 4 계획과 타이틀은 변경 대상이 아니다.
- Kanban: `escape-zombie-school` / `t_b6549eb8` (`levelmini`, running) — Developer 기술 조사 카드.

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

## 3. 최소 구현 seam (아직 구현하지 않음)

가장 작은 구현은 `src/lib/stageLightingProfile.js`와 `src/components/Game.jsx` 한 곳이다.

1. `stageLightingProfile.js`는 `stage1`, `stage2`, `stage3`에 대한 **불변 plain-data profile**만 export한다. 항목은 `kind`, `position`, `color`, `intensity`와 Spot을 채택한 경우의 `distance`, `angle`, `penumbra`까지만 가진다. `getStageLightingProfile(stageId)`는 모르는 ID와 `stage4`에서 빈 frozen 배열을 반환한다.
2. `Game.jsx:181-184` 사이에 한 번만 `<StageLighting stageId={currentStageId} />`를 mount한다. 컴포넌트는 profile을 순회해 light JSX만 render한다. `useFrame`, `setState`, mutable per-frame intensity, random, material/geometry 생성은 넣지 않는다.
3. profile은 Stage별 **실제 real light 최대 2개**, 모두 `castShadow={false}`다. `target` object, light helper mesh, visible cone, fog, bloom, environment map, post-processing, extra floor mesh는 만들지 않는다.

이 seam은 Stage 4의 기존 계획과 충돌하지 않는다. Stage 4는 빈 배열이라 현재 공용 3등 결과가 완전히 보존되고, Stage 4 전용 cue는 계속 별도 `Game.jsx` 조건 subtree로만 향후 검토할 수 있다.

다음 경계는 사용하지 않는다.

- `GameCanvas.jsx`: camera/DPR/shadows/stencil/tone mapping 변경 금지.
- `ClassroomFloor.jsx`: tile, CanvasTexture, UV, floor material, court/end-wall/overlay 변경 금지.
- `Enemy.jsx`, `VFXLayer.jsx`, `mathTeacherSpecial.js`, B02/B03 pure state module: 보스 표식 색·opacity·시간·피해·phase 변경 금지.
- `StageObjectLayer.jsx`, prop component, StudioTunedGroup, Firebase adapter: placement/material transform 혹은 저장 연결 금지.
- title scene 및 preview Canvas: 사용자 명시가 없으므로 수정 금지.

## 4. 제안 테스트 seam

후속 구현 카드에서 다음만 추가한다. 현 문서는 테스트를 추가하지 않았다.

| 테스트 | 검증 내용 |
| --- | --- |
| `src/lib/stageLightingProfile.test.js` | Stage 1~3이 승인된 profile만 반환하고, stage4/unknown은 빈 배열임; 각 profile은 2개 이하; `castShadow`가 false; permissive dynamic key나 function을 포함하지 않음. |
| `src/components/Game.stageLighting.test.jsx` | `Game.jsx`가 공용 3광원 값(`0.38`, `3.2`, `0.85`)을 그대로 보존하고, Stage-light subtree가 공용 light 뒤와 `Floor` 앞에 한 번만 존재함; Stage 4 조건 분기나 cauldron logic을 포함하지 않음. |
| 기존 focused regression | `ClassroomFloor.test.jsx`, `EnemyVisual.test.js`, `EnemyMathTeacherSpecial.test.js`, `Game.stage4PressureCauldron.test.js`, `stageConfig.test.js`를 함께 실행해 floor 계약·B01/B02/B03/B04 표식·Stage 4 hazard가 바뀌지 않았음을 확인한다. |

추가 조명은 정적 JSX이므로 per-frame allocation 검사는 source guard로 충분하다. `StageLighting` 내부에 `useFrame`, `new THREE.`, `new Vector3`, `setState`가 들어가면 실패로 처리한다. 구현 완료 뒤에만 동일한 Stage 재현 화면에서 renderer info의 calls/triangles/textures/programs와 frame time을 전후 비교한다. 이 조사에서는 런타임 계측을 하지 않았으므로 현재 절대 수치를 주장하지 않는다.

## 5. 후속 브라우저 검증 경로

브라우저 검증은 코드 구현이 끝난 뒤, 기존 허용된 개발 실행 경로에서 Stage 선택 UI로 `stage1 → stage2 → stage3`을 각각 시작해 수행한다. 새 URL query, localStorage seed, Firebase 쓰기, Admin 튜닝, Studio Apply는 만들거나 사용하지 않는다.

각 Stage에서는 최소 360~430 CSS px 세로 화면과 일반 데스크톱 화면에서 다음을 확인한다.

1. **Stage 1**: B01 800ms `GO!` warn과 320ms 스윙 windup 때 교실 바닥·보스 외곽선·플레이어 이동 공간이 동시에 읽힌다.
2. **Stage 2**: E04 진입 방향과 B02 cyan blockade telegraph/active line이 어두운 floor/프롭과 분리되며, 새 조명이 cyan line 의미를 바꾸지 않는다.
3. **Stage 3**: white court line/red key paint와 B03 yellow shuttle telegraph/outbound/return lane이 혼동되지 않고, 농구공·콘·B03·플레이어 실루엣이 분리된다.
4. **공통**: light 수가 활성 stage별 2개 이하, shadow map이 추가되지 않으며, 적/프롭/발사체를 따라다니는 light가 없다.

브라우저를 열기 전 프로젝트 browser reservation 규칙을 따르고, 검증 결과·캡처·renderer/frame-time 원본은 QA 카드에서만 PASS/FAIL로 판정한다.

## 6. 이번 조사 검증

- 필수 precommand: `check-required-documents.ps1 -Profile levelmini -Domain auto -TaskSummary 'stage1 stage2 stage3 lighting runtime technical map'` 성공. receipt SHA-256: `f334bea3a521c7e009d09678b448c8ca03aff780243ec67f7806fdd4267695ca`.
- Stage 4 technical map/master plan/QA plan, `Game.jsx`, `GameCanvas.jsx`, `ClassroomFloor.jsx`, `stageConfig.js`, Stage prop layers, boss/VFX source, existing regression tests를 정적으로 조사했다.
- 제품 코드·Firebase·Graphics Studio·브라우저 실행 없음. 작성 후 이 문서만 포함한 diff check를 실행한다.
