# Stage 4 급식실 조명 런타임 기술 맵 — 2026-08-23

## 범위와 근거

- 목적: Stage 4 급식실의 **현재** Three.js/R3F 조명·카메라·바닥·소품·보스 VFX·Studio 연결 지점을 구현 없이 기록한다.
- Kanban 근거: `escape-zombie-school` 보드의 `t_0174575b` — *Stage 4 kitchen theatrical lighting atmosphere master plan* (상태 `ready`, 담당 `threemini`, 2026-08-23 확인). 이 문서는 그 카드가 구현을 시작하기 전 참조할 기술 기준선이다.
- 제품 코드, Firebase, Graphics Studio 값, 브라우저 상태는 변경하지 않았다. 이 문서의 성능 수치는 현황 또는 향후 구현 수용 한도이며, 조명 사양을 새로 승인하는 문서가 아니다.

## 1. 현재 런타임 조명·렌더러 정본

| 항목 | 현재 값 | 정확한 seam | Stage 4 영향 |
| --- | --- | --- | --- |
| Canvas 카메라 | perspective `fov: 30`, 위치 `[0,17,17]`, near `0.1`, far `500` | `components/GameCanvas.jsx:16-25` | 모든 스테이지 공유 |
| DPR | `[1, 1.5]` | `GameCanvas.jsx:21` | 모바일/데스크톱 GPU 상한. 변경 금지 |
| stencil / shadows | `gl={{ stencil: true }}`, Canvas `shadows` | `GameCanvas.jsx:22-23` | 툰 외곽선 stencil 및 전역 shadow renderer 활성화 |
| ambient | `intensity=0.38`, `color=0x6d6780` | `components/Game.jsx:175-181` | Stage 1~4 공용 |
| key directional | 위치 `[-10,22,12]`, `intensity=3.2`, 색상 기본 흰색 | `Game.jsx:177-180` | Stage 1~4 공용 |
| warm directional | 위치 `[10,12,-10]`, `intensity=0.85`, `color=0xffe2b0` | `Game.jsx:181` | Stage 1~4 공용 |
| fog/environment | gameplay Canvas에는 명시적 `fog`, `Environment`, environment map 없음 | `GameCanvas.jsx:16-41`, `Game.jsx:173-224` | Stage 4 전용 안개/IBL이 현재 존재하지 않음 |
| tone mapping/color space | gameplay Canvas에 `toneMapping`, `outputColorSpace`, `physicallyCorrectLights` 명시 없음 | `GameCanvas.jsx:16-41` 및 `src/` 정적 검색 | R3F/Three 기본 renderer 동작에 의존. 임의 전역 변경은 전 스테이지 회귀 위험 |

`Game.jsx`의 세 광원은 `currentStageId` 분기가 없는 공용 트리에 있다. 즉 현재 Stage 4의 조명 정체성은 별도 광원이 아니라 흰색 세라믹 바닥·주방 소품 색·가마솥/보스 텔레그래프가 공용 조명을 받는 결과다.

## 2. 카메라·Stage 4 전투 경계

- Stage 4 정본 경계는 `halfX=9.36`, `halfZ=16` (전체 `18.72×32` units)이다. `lib/stageConfig.js:95-124`, `158-163`.
- 게임 카메라는 높이 `17`, 뒤 오프셋 `17`이고 45도 내려다본다. 화면 지면 도달범위는 `fov`, aspect로 계산하고, Stage 4의 반경계에 맞춰 focus/zoom을 매 프레임 clamp한다: `Game.jsx:32-59`, `128-154`.
- `screenBounds`는 위 camera reach 및 `getStageBounds(currentStageId)`에서 매 프레임 갱신된다 (`Game.jsx:131-150`). 풀 적 시각 LOD와 화면 밖 culling이 이를 사용하므로, 조명으로 인해 카메라·bounds·floor 크기를 바꾸는 것은 허용되지 않는다.
- 좁은 화면에서 `reachSide > halfX`이면 `camera.zoom`을 올려 가로 빈 바닥이 보이지 않게 한다 (`Game.jsx:133-144`). Stage 4 조명 수용샷은 최소한 일반 가로 화면과 이 zoom 분기를 모두 확인해야 한다.

## 3. 바닥·머티리얼·소품 렌더링

### 바닥

- Stage 4는 `tile_stage04_white_ceramic.webp` 한 장을 loader cache로 읽고, 한 장의 `FloorPlane`에 UV 반복만 적용한다: `components/ClassroomFloor.jsx:7, 51-57, 157-173, 213-218`.
- 정확한 타일 계약은 0.8-unit 정사각, `repeatX=23.4`, `repeatZ=40`, 바닥 `18.72×32`이다 (`ClassroomFloor.jsx:16-32`). 텍스처는 `RepeatWrapping`, anisotropy `8`, sRGB, mipmap + `LinearMipmapLinearFilter`/`LinearFilter`를 사용한다 (`ClassroomFloor.jsx:138-147`).
- 바닥 머티리얼은 `MeshLambertMaterial({ map: floorTex })`, 바닥 mesh만 `receiveShadow`다 (`ClassroomFloor.jsx:163-165, 213-218`). 반사/광택을 표현하기 위해 별도 물리 기반 재질, post-processing, 추가 타일 mesh를 쓰지 않는다.

### 주방 소품과 툰 재질

- Stage 4는 9종 주방 프랍과 압력 가마솥, 학생 배치를 `StageObjectLayer`가 동일한 위치/회전/스케일로 렌더한다 (`components/StageObjects/StageObjectLayer.jsx:34-92`). 현재 authored Stage 4 배치는 총 34개이며, 그중 최근 재배치된 것은 23개(solid 19 + 통과형 clutter 4)다 (`stageObjectPlacements.test.js:514-516`, `stage4PropLayout.static.test.js`). 기본 배열의 중심 가마솥은 정확히 `[0,0,0]`, scale `1`이다 (`stageObjectPlacements.js:713-722`).
- 주방 프랍 표면은 `getStagePropDepthWritingToonMaterial`을 사용한다. 이는 `MeshToonMaterial` cache의 `depthWrite=true` 경로이며, 프랍 표면 자체는 그림자를 cast/receive 하지 않는다: `StageObjects/propRendering.js:18-31, 51-64`; `KitchenProps.jsx:13-26`.
- 모든 툰 표면은 5단계 gradient map, 같은 색의 emissive, stencil write를 쓴다. 외곽선은 back-side, transparent, `depthWrite=false`, stencil NotEqual의 inverted hull이다 (`lib/toon.js:5-18, 31-50, 61-78`). 따라서 분위기용 투명 평면이나 광량 효과가 소품 외곽선/깊이 순서를 깨지 않아야 한다.
- 주방 프랍은 소품당 outline을 2~5개로 제한하고, 공유 unit box geometry/material cache를 사용한다 (`KitchenProps.jsx:13-15, 53-74`). 조명 작업이 소품별 mesh·material·point light를 생성하면 이 전제를 깨게 된다.

### 가마솥과 현재 위험 텔레그래프

- 가마솥 root base scale은 정확히 `0.4`이며, 표면은 depth-writing toon 재질, hazard 시각은 같은 컴포넌트 안에 있다 (`StageObjects/PressureCauldron.jsx:24-44, 203-301`).
- Stage 4 `playing`에서만 15,000ms 주기, 마지막 3,000ms는 boiling, 폭발 표시 250ms이며, 피해 반경은 3.2 units / max HP 20%이다 (`lib/stage4PressureCauldronHazard.js:1-35`). boiling은 root shiver `±0.04`, 3개 연기 puff, 폭발은 8개 ring box와 6개 debris를 재사용한다 (`PressureCauldron.jsx:94-195`).
- 가마솥 폭발의 추가 spotlight/point light는 현재 없다. 따라서 현재 안전한 시각 신호는 material 색(white/yellow/red)과 고정 geometry이며, 이 동작·반경·주기·피해는 조명 작업에서 바꾸면 안 된다.

### B04와 전투 VFX

- B04는 Stage 4에서만 `B04SoupBlastVisual`을 렌더한다 (`components/Enemy.jsx:1592-1596`). 텔레그래프는 surface `#f4ad32`/opacity `0.46`, outline `#663507`/`0.86`; 폭발은 `#ff6b1f`/`0.92`, `#751a05`/`1.0`이다 (`Enemy.jsx:596-624`).
- 해당 바닥 원은 transparent `MeshBasicMaterial`, `depthWrite=false`, `toneMapped=false`다 (`Enemy.jsx:613-620`). 전역 tone mapping을 바꾸거나 이 VFX 위에 depth-writing 조명 overlay를 두면 위험 표시 가독성이 달라진다.
- B04 전투 수치/행동은 `Enemy.jsx:365-372`에 있고, 조명 문서의 범위 밖이다.

## 4. Studio 연결과 공용/Stage별 경계

### 현재 연결

- 런타임 StageObjectLayer는 `getStageObjectPlacements(stageId)`를 읽고, Studio Apply 때 placement version 변경으로 다시 렌더한다 (`StageObjectLayer.jsx:68-91`). Stage 4 override가 있으면 그것을 쓰고, 없으면 authored 기본 배치를 사용한다 (`stageObjectPlacements.js:915-939`).
- placement 런타임 데이터는 Firebase Studio runtime dataset만 읽고/쓰며 storage adapter는 금지한다 (`lib/stagePropPlacements.js:144-162`). 이 조명 조사에서는 그 데이터를 읽거나 쓰지 않았다.
- 9종 주방 프랍은 `stage-object-kitchen-*`, 가마솥은 `stage-object-pressure-cauldron` item ID로 `StudioTunedGroup`에 연결된다. catalog ↔ component ↔ preview 경로는 `lib/graphicsStudioConfig.js:511-604`, `KitchenProps.jsx:164-673`, `PressureCauldron.jsx:214-216`, `GraphicsStudioPreview.jsx:574-583`이다.
- `StudioTunedGroup`은 현재 tuning에서 position/rotation/scale을 합성하고, 선택 시에만 재질 clone/tuning을 적용한다 (`StudioTunedGroup.jsx:46-56, 176-222, 487-538`). 조명은 이 item tuning 모델의 입력값이 아니다.

### 공용과 Stage 4 전용의 위험

| 구분 | 현재 소유자 | 위험 | 보존 규칙 |
| --- | --- | --- | --- |
| 공용 런타임 조명 | `Game.jsx:175-181` | 수치 하나를 바꾸면 Stage 1~4 전부 변경 | 공용 세 값은 Stage 4 분위기 작업의 수정 대상이 아님 |
| Studio preview 조명 | `GraphicsStudioPreview.jsx:720-733` | 런타임과 같은 세 값이지만 첫 directional만 `castShadow`, 1024 shadow map/camera를 가짐 | Studio preview를 runtime 조명 정본으로 오해하지 않음 |
| Stage 4 소품 transform/material | Studio item ID 및 Firebase dataset | 조명 작업이 placement, model material tuning, revision을 건드리면 Studio 정본을 훼손 | transform/material/placement/Firebase write 없음 |
| Stage 4 위험 시각 | `PressureCauldron.jsx`, `Enemy.jsx` | 장식 조명이 gameplay telegraph를 가릴 수 있음 | 가마솥·B04 색/불투명도/시간/피해 경로 보존 |
| 타이틀 | 별도 Title Canvas/scene | Game 공용 코드 변경으로 타이틀까지 포함시키는 범위 확장 위험 | 타이틀 source/조명/Studio 연결 절대 변경 없음 |

## 5. 최소 구현 seam (구현하지 않음)

향후 사용자가 Stage 4 조명 값을 명시해 승인할 경우, 가장 작은 런타임 삽입 위치는 `components/Game.jsx:173-185`의 World 시작부다. 공용 3광원(`175-181`)은 그대로 두고, `currentStageId === 'stage4'` 조건의 **한 Stage 4 전용 light subtree**만 Floor mount 전(`184`)에 두는 것이 코드 영향 범위를 Stage 4 gameplay Canvas로 한정한다.

이 seam 밖의 변경은 현재 근거상 최소가 아니다.

- `GameCanvas.jsx`의 camera/DPR/shadows/gl 설정을 바꾸지 않는다.
- `ClassroomFloor.jsx`의 단일 texture/material/UV repeat를 바꾸지 않는다.
- `KitchenProps.jsx`, `PressureCauldron.jsx`, `Enemy.jsx`의 mesh, material, VFX, gameplay timer를 조명 구현 수단으로 바꾸지 않는다.
- Studio/Firebase 저장 경로나 `StudioTunedGroup` transform 합성식을 조명 값 저장 경로로 재사용하지 않는다.

Studio 미리보기의 패리티가 향후 명시 요구되면, runtime 후보를 확정한 뒤에만 `GraphicsStudioPreview.jsx:718-739`의 별도 preview-light seam을 같은 값으로 검토한다. 현재 이 문서는 두 경로를 통합하거나 바꾸지 않는다.

## 6. 성능 한도와 검증 기준

### 이미 존재하는 상한/절감 경로

- 게임플레이 적 pool은 최대 150 (`lib/enemyEntityPool.js:1-3`), 인스턴스 시각 buffer는 200 slots (`components/PooledEnemyVisuals.js:1-5`), 적 투사체 pool은 32 (`lib/enemyProjectilePool.js:1-60`).
- 적 시각은 camera `screenBounds`로 cull하고, near/mid/far 거리 제곱 `36`/`121` 및 animation cadence를 낮춘다 (`PooledEnemyVisuals.js:33-81`).
- Stage 4 static world는 바닥 1 mesh/1 material, cached UV texture와 cache된 toon geometry/material을 전제로 한다 (`ClassroomFloor.jsx:157-173`, `toon.js:87-126`).

### 후속 조명 작업의 수용 한도

다음은 현재 구조를 보존하기 위한 **상한**이며, 아직 구현된 수치가 아니다.

1. `GameCanvas` DPR `[1,1.5]`, 현재 Canvas shadow/stencil 설정, 전역 tone mapping 기본값을 유지한다.
2. Stage 4용 새 shadow-map light는 **0개**다. 현재 Stage 4 prop surfaces도 cast/receive shadow가 false이므로, shadow map을 켜도 비용만 늘고 근거 있는 읽기성 개선이 없다.
3. prop/placement/B04 원/가마솥 연기마다 point/spot light를 만들지 않는다: per-prop dynamic light **0개**, per-frame new light/material/geometry allocation **0개**.
4. 승인된 Stage 4 조명이 필요할 때도 stage-local static real light 수는 공용 3개 외 **최대 2개**, 모두 `castShadow=false`여야 한다. 폭발 강조는 새 real light가 아니라 기존 가마솥/B04의 고정 mesh·emissive/색 신호를 우선 보존한다.
5. 새 post-processing pass, environment map, extra floor tile mesh, 새 texture source는 **0개**다. Stage 4 추가 draw-call 예산은 조명 노드 자체 외 **0 draw call**(새 visible mesh 없음)이다.

검증은 구현 후 한 번의 같은 Stage 4 재현에서 `renderer.info.render.calls`, triangles, textures, programs를 변경 전/후 비교해야 한다. 이 조사에는 renderer 계측이나 브라우저 실행이 허용되지 않았으므로 현재 절대 draw-call 수를 주장하지 않는다.

## 7. 반드시 유지할 항목

- Stage 1~3 렌더링, 공용 Game lighting 값, Canvas camera/DPR/stencil/shadow 설정.
- Stage 4 bounds `9.36/16`, 카메라 clamp/zoom, floor `18.72×32`, 0.8-unit 타일, `23.4×40` UV repeat.
- 34개 authored Stage 4 placement(최근 재배치 23개), 중앙 가마솥 `[0,0,0]`/scale `1`, 각 Studio item ID, Firebase-only Studio dataset/Apply 경로.
- 주방 표면의 depth-writing toon 재질, transparent stencil outline, `castShadow=false`/`receiveShadow=false` prop 정책, geometry/material cache.
- 가마솥 15초/3초/250ms/3.2u/20% 계약과 B04 국물 대폭발의 색·opacity·`toneMapped=false` 위험 표시.
- 타이틀의 모든 source, 조명, 카메라, BGM, Studio 연결. 이 작업은 title과 무관하다.

## 검증 기록

- 필수 precommand: `check-required-documents.ps1 -Profile levelmini -Domain auto -TaskSummary 'stage4 current lighting technical map'` 성공. receipt SHA-256: `28066a1a6cbae997ea192fac7c8dcf488b2b21b14a17ea9ad0c74191fca85c17`.
- `escape-zombie-school` Kanban `t_0174575b`의 본문/이력을 읽어 계획 전용·Stage 1~3/타이틀/Firebase 보존 조건을 확인했다.
- 제품 코드·Firebase·브라우저 실행 없음. 문서 작성 뒤 scoped diff check를 실행한다.
