# Stage 4 급식실 대탈출 — 그래픽 개선 제안서

- 작성: 2026-11-01 · threemini (Three.js/R3F 카툰 3D) · 라우팅 게이트 receipt `7af28611`
- 기준 소스: `C:\Users\admin\AppData\Local\Temp\ezs-cf` (origin/zombie_only 동기 클론, HEAD `07b93e41`)
- 성격: **제안서 전용.** 코드·Firebase·Studio 값·브라우저·테스트 실행 없음. 아래 수치 중 "실측"이라고 적지 않은 draw call·머티리얼 수는 **소스 정적 집계 추정**이다.
- 경로 약어: `src/` = `Developer/r3f_prototype/src/`. 거리 표기는 units(블록 병기, 1블록 = 4 units).

---

## 1. 현재 상태 진단 (코드 근거)

### 1.1 바닥
- 단일 이미지 `tile_stage04_white_ceramic.webp`를 0.8 units(0.2블록) 정사각 타일로 23.4×40 반복, 바닥 크기는 맵 경계와 같은 18.72×32 units(4.68×8블록) — `src/components/ClassroomFloor.jsx:17-33, 52-58`.
- 재질은 `MeshLambertMaterial(map + 굽힌 lightMap)` — `ClassroomFloor.jsx:169-189`. 툰 재질이 아니고 roughness 같은 조절값도 없다.
- 굽힌 lightMap의 정본은 `stageLightingProfile.js`의 stage4 스팟 3개이며, 256px 캔버스에 스테이지 진입 때 한 번 굽는다 — `src/lib/stageFloorLightBake.js:1-18`. 굽는 memo의 의존값은 `stageId`와 바닥 크기뿐이다(`ClassroomFloor.jsx:245-248`). 그래서 **배치(Studio override)가 바뀌어도 다시 굽지 않는다.**
- 바닥 텍스처 자체의 교체안(A/B/C 팔레트)은 10-24 제안(`Graphic_designer/stage4_cafeteria_floor_upgrade_20261024.md`)이 승인 대기 중이다. 이 문서는 그 안을 다시 제안하지 않는다.

### 1.2 벽·경계
- Stage 4에는 **보이는 벽이 없다.** `Floor.jsx:45-59`의 경계 벽 4개는 `visible={false}` 물리 전용이다. Stage 3만 `Stage3Arena`로 보이는 벽과 줄을 그린다(`ClassroomFloor.jsx:283-363`).
- 카메라는 시야가 맵 밖으로 나가지 않도록 초점을 클램프한다(`Game.jsx:136-160`). 그래서 화면 가장자리가 곧 맵 끝이다. 벽이 없어도 빈 공간이 보이지는 않지만, 바닥이 경계에서 아무 처리 없이 잘린다(Canvas 배경 `#c8c4bc`, `GameCanvas.jsx:40`). 그래서 "이 끝이 벽"이라는 신호가 약하다.

### 1.3 소품 (KitchenProps 9종 + 가마솥)
- 배치: stage4 authored 34개 = 쿡라인 1, 냉장고 2, 크레이트 6, clutter 5, 싱크 2, 트레이랙 3, 선반카트 4, 조리대(side) 4, 쓰레기통 4, 가마솥 1, 학생 2 — `src/components/StageObjects/stageObjectPlacements.js:470-760`.
- 렌더 방식: 배치마다 React 컴포넌트를 따로 그리고(`StageObjectLayer.jsx:68-93`), 부품마다 개별 `<mesh>`를 쓴다. 외곽선 부품은 inverted-hull 메시를 하나 더 둔다(`KitchenProps.jsx:55-75`). **InstancedMesh나 병합이 없다.**
- **draw call 정적 집계(표면+외곽선 mesh 수, 실측 아님):**

| 타입 | mesh/개 | 배치 수 | 소계 |
|---|---:|---:|---:|
| 조리대 side | 27 | 4 | 108 |
| 선반카트 | 27 | 4 | 108 |
| 트레이랙 | 21 | 3 | 63 |
| 크레이트(2/3/4층) | 8/11/14 | 2/3/1 | 63 |
| 싱크 | 30 | 2 | 60 |
| clutter(pots/bags/trays) | 6/10/13 | 2/1/2 | 48 |
| 쿡라인 | 34 | 1 | 34 |
| 쓰레기통(wheelie/round) | 8/5 | 2/2 | 26 |
| 냉장고(닫힘/열림) | 10/12 | 1/1 | 22 |
| **주방 소품 합계** | | | **약 532** |
| 압력 가마솥(상시) | 약 84 | 1 | 84 |
| 가마솥 증기·파편(비등·폭발 때만) | 9 | | +9 |
| 가마솥 바닥 경고(3초 비등 + 250ms) | 23 | | +23 |

  frustum culling으로 실제 화면 안에 그려지는 수는 이보다 적다. 그래도 정적 배경만으로 수백 단위라 모바일 1순위 예산에서 가장 큰 항목이다.
- 머티리얼: `getCachedToonMat` 캐시(색·emissive·side·depthWrite 조합)로 주방 표면 약 25~30종과 공유 외곽선 1종이다(`propRendering.js:57-65`, `src/lib/toon.js:123-138`). 개수는 적당하다.
- 지오메트리: 박스는 공유 유닛 박스 하나를 쓴다(`propRendering.js:12`). 그런데 `PropCylinder`·`OutlinedCylinder`·`PropBlob`·`MagnetTag`는 JSX 안에서 `<cylinderGeometry>`·`<icosahedronGeometry>`·`<boxGeometry>`를 **mesh마다 새로 만든다**(`KitchenProps.jsx:78-110, 205-211`). 가마솥은 같은 일을 `getCachedCylinderGeo`로 처리한다(`PressureCauldron.jsx:62-72`). 캐스터만 해도 32개가 각자 버퍼를 갖는다.
- 그림자/접지: 모든 소품이 `castShadow:false / receiveShadow:false`다(`propRendering.js:18-21`). 장면의 방향광 2개에도 `castShadow`가 없다(`Game.jsx:211-216`). **밝은 회색 세라믹 위에서 가구가 바닥에 닿은 흔적이 전혀 없어 떠 보이고, 통과 가능한 clutter와 막힌 가구가 바닥에서 같은 모습이다.**
- 재질 상태: 08-22 투명 감사 P0 이후 주방 표면은 depth를 쓰는 불투명 toon이고, 외곽선만 `depthWrite:false` 0.96이다(`propRendering.js:55-65`). 이 상태는 유지해야 한다.

### 1.4 조명
- 런타임 광원은 공용 3개뿐이다: ambient `#6D6780` 0.38, 주광 `[-10,22,12]` 3.2, 따뜻한 보조 `[10,12,-10]` 0.85 — `Game.jsx:211-220`. 실시간 SpotLight 3개는 모바일 필레이트 문제로 제거됐고, `Game.stageLighting.test.js:29-46`이 `spotLight`/`pointLight`가 0개임을 잠근다.
- stage4 색 구역 3개(민트 `#8DEBD1` 북 / 노랑 `#FFE27A` 중앙 / 하늘 `#DFF6FF` 남, `stageLightingProfile.js:28-32`)는 **바닥 lightMap에만** 들어간다. toon 재질인 소품·적·보스는 이 색을 받지 않는다. 그래서 색 구역이 바닥에만 칠해진 얼룩으로 보이고 공간감과 연결되지 않는다.
- **위험색 충돌(계산 근거):** 중앙 노랑 스팟(높이 6.5, angle 0.62, penumbra 0.48, distance 11)은 가마솥 경고 링 반경 3.2 units(0.8블록)에서 원뿔 감쇠 약 0.67이 남는다. 이 값은 `stageFloorLightBake.js:26-102`와 같은 식으로 계산했고, 조사도는 약 1.07(×`#FFE27A`)이다. 경고 링 색 `#FFE576`(`Stage4CauldronGroundWarning.jsx:49-56`)이 **노랗게 물든 바닥 위에 노랑으로** 그려지는 구조라서, 3초 비등 텔레그래프의 대비가 바닥 조명 때문에 깎인다.
- 같은 이유로 북쪽 민트 구역은 E04 투사체 `#34D6B8`(`PooledEnemyProjectileLayer.jsx:35`)·녹색 좀비 피부와 색상이 겹친다. 이것은 가설이며 캡처로 확인해야 한다.
- 08-23 연극 조명 마스터 플랜은 Point/Spot 2개를 새로 넣는 안이었다. 이 안은 현재 테스트 잠금과 정면으로 충돌한다(4장 참조).

### 1.5 해저드 VFX
- 가마솥: 15초 주기, 3초 비등, 250ms 폭발, 반경 3.2 units(0.8블록) — `src/lib/stage4PressureCauldronHazard.js:1-5`. 바닥 경고는 scene portal의 월드 원점 링이다(`Stage4CauldronGroundWarning.jsx:15-74`). 연속 테두리 1개, 진행 눈금 12개, 화염 테두리 1개, 스포크 8개로 **mesh 23개와 JSX `<meshBasicMaterial>` 23개**(각각 별도 인스턴스)를 쓴다.
- 비등 증기: 8각 실린더 3개에 불투명 toon(`whiteShade`)을 씌워 위로 늘린다(`PressureCauldron.jsx:31-35, 105, 171-176`). 증기라기보다 흰 깡통처럼 읽힐 수 있다. 08-23 투명 감사 이후 일부러 불투명으로 둔 결정이다.
- 비등 중 가마솥 몸체는 ±0.04 흔들림만 있다(`PressureCauldron.jsx:115-119`). 압력계 바늘·빨간 표시등은 **정지 상태**다. `flash={red}` prop이 전달되지만 쓰이지 않는다(`PressureCauldron.jsx:297`).
- 폭발: 큰 스폰 연기 재사용과 고정 파편 6개(`PressureCauldron.jsx:36-43, 141-194`)로 처리한다. 바닥 섬광은 없다.
- B04 국물 대폭발: 원 최대 3개 × (분절 호 8 + 채움 1 + 그릇 1 + 김 3) = **mesh 최대 39개, JSX 머티리얼 39개** — `src/components/Enemy.jsx:737-773`. 텔레그래프 1200ms 동안 **모양이 고정**돼 있어 "언제 터지는지"를 알려주지 않는다. B03 셔틀런 표식은 useFrame으로 깜빡임을 준다(`Enemy.jsx:784-810`).

### 1.6 적·보스
- 일반 적 E01~E07은 공용 InstancedMesh 레이어(`GameCanvas.jsx:51-56`)를 쓰고, stage4 웨이브는 E01/E02/E04/E05 위주다(`src/lib/waveTimelines.js`의 `STAGE4_WAVE_PHASES`). E04 기본 투사체(kind 0)는 "색·크기·거동 변경 금지" 정본이다(`PooledEnemyProjectileLayer.jsx:4`). 반지름 0.09의 작은 청록 구체이고 바닥 접지 표시가 없다.
- B04: `ZBlock` 44개 × (외곽선+표면) + 얼굴 webp 평면 + 절차적 얼굴 오버레이로 **약 90 draw**다(`src/components/ZombieMesh.jsx:740-755, 940-1040`). 보스 1기라 허용 범위다.
- B04 격노(phase2): 1000ms 텔레그래프 동안만 hitFlash 붉은 신호를 켜고, phase2에 들어가면 **끈다**(`Enemy.jsx:1508-1520`). 이후 phase2 내내 phase1과 외형이 같다.
- 얼굴은 이미 `BossFacePartsOverlay` SDF 셰이더(uBrow/uEye/uNose/uMouth)를 갖고 있다(`src/components/BossFacePartsOverlay.jsx:12-40`). 이것이 "절차적 그리기" 표준의 기존 진입점이다.

### 1.7 포스트프로세싱
- 없다. EffectComposer·bloom·전체 화면 outline이 없고, `dpr [1,1.5]`, Canvas `shadows`는 켜져 있지만 그림자를 만드는 광원은 0개다(`GameCanvas.jsx:31-41`). 해저드 메시는 `toneMapped={false}`다. 모바일 기준으로 맞는 상태이니 유지한다.
- 알려진 미결 "헐 틈 → 스크린스페이스 아웃라인"과의 연결: 주방 외곽선 mesh 약 150개(추정)가 inverted-hull이다. 스크린스페이스 outline을 **전역 정책으로** 채택하면 이 비용이 사라진다. 다만 그것은 스테이지 4 범위가 아니라 전역 결정이고, 기존 문서가 "화면 전체 outline 신설 제외"를 유지하고 있다. 그래서 이 제안서에서는 의존성만 기록한다. "오니기리 분신 stencilRef"는 Stage 4와 관련이 없어 제외한다.

---

## 2. 개선안 목록 (11개)

표기: 효과 1~5 / 비용 S·M·L / 성능 = draw call·머티리얼·텍스처 증감(추정) / 회귀 리스크.

### P1. 정적 소품 접지 음영(AO)과 경계 띠를 바닥 lightMap에 함께 굽기
- 내용: 이미 있는 stage4 lightMap 굽기 단계에서 **solid 가구 콜라이더 OBB 발자국**(`stageObjectColliders.js`가 정본) 아래에 부드러운 어두운 사각 블롭을 곱한다. 가마솥 원형 발자국도 포함한다. 통과형 `kitchenClutter`에는 AO를 넣지 않거나 아주 약하게 넣는다. 그러면 막힌 가구는 바닥에 붙어 보이고, clutter는 떠 있는 잡동사니로 읽혀 이동 가능 여부가 형태로 전달된다(10-22 문서 A04 해결). 맵 네 변에는 0.3~0.5 units 폭의 어두운 걸레받이 띠를 같은 캔버스에 굽는다. 해상도는 256→512로 올리는 비교를 권장한다.
- [효과 4] [비용 M] [성능: draw 0, 머티리얼 0, 텍스처 512² RGBA로 올리면 +약 0.75MB, 스테이지 진입 때 1회 CPU 굽기 몇 ms]
- [건드릴 파일] `src/lib/stageFloorLightBake.js`, `src/components/ClassroomFloor.jsx`(memo 의존에 `useStagePropPlacementsVersion` 추가), 읽기 전용 `src/components/StageObjects/stageObjectColliders.js`, `stageObjectPlacements.js`
- [회귀 리스크 중하] stage1~3의 lightMap 결과가 1바이트라도 바뀌면 안 된다(`stageId === 'stage4'` 게이트). Studio/Firebase 배치 override가 오면 다시 구워야 한다(굽기 입력은 **resolved placements**이고 소스 기본값으로 대체하지 않는다). lightMap은 바닥 albedo에 곱해지므로, 경고 링(`toneMapped=false` 기본 재질)에는 영향이 없다.

### P2. stage4 색 구역 재조정 — 위험색과 겹치지 않게 (먼저 할 1개)
- 내용: `stageLightingProfile.js` stage4 3개 중 **색만** 바꾼다. 중앙 `#FFE27A` 노랑은 중성 냉백(예: `#EEF3F6`)으로 바꿔 경고 링 `#FFE576`·폭발 `#FF6B24`·국물 `#F4AD32`가 유일한 따뜻한 색이 되게 한다. 북쪽 `#8DEBD1` 민트는 6500K 냉청백(예: `#CFE3FF`)으로 바꿔 E04 `#34D6B8`·녹색 좀비와 색상을 분리한다. 남쪽 `#DFF6FF`는 유지한다. 위치·intensity·각도는 그대로 둔다. 08-23 마스터 플랜의 색온도 문법(작업등 = 차가운 청백, 위험 = 앰버만)과 일치한다.
- [효과 4] [비용 S] [성능: 0 — 굽기 입력 데이터만 변경, 광원·draw·머티리얼 증감 없음]
- [건드릴 파일] `src/lib/stageLightingProfile.js`, `src/lib/stageLightingProfile.test.js`(stage4 기대값 갱신)
- [회귀 리스크 하] 데이터 2줄이라 롤백이 쉽다. 단, **현재 hex가 사용자 확정값인지 Advisor 확인이 먼저**다. 확정값이면 사용자 승인 없이는 진행하지 않는다. stage1~3 프로파일은 변경하지 않는다.

### P3. 정적 주방 소품 런타임 배칭 (Studio 적용 후 InstancedMesh 묶기)
- 내용: `StudioTunedGroup`이 Firebase 값을 적용한 **결과 트리**(layout effect 이후 world matrix·머티리얼)를 순회한다. (geometry, material) 쌍마다 InstancedMesh를 만들고 원본 mesh는 숨긴다. Studio revision이나 배치 version이 바뀌면 다시 묶는다. 박스 외곽선은 유닛 박스와 공유 외곽선 머티리얼이 같아서 **InstancedMesh 1개**로 합쳐진다. Studio Preview 경로는 배칭하지 않는다(편집·선택 경로 보존). 가마솥은 흔들림·애니메이션이 있어 제외한다.
- [효과 5(성능)] [비용 L] [성능: 주방 소품 약 532 draw → 약 45~60 draw(표면 머티리얼 수 + 원기둥 형상 키 수 + 외곽선 1~2, 추정), 머티리얼 증감 0, InstancedMesh 버퍼 몇 십 KB]
- [건드릴 파일] 신규 `src/components/StageObjects/StaticPropBatcher.jsx`, `StageObjectLayer.jsx`(stage4만 감쌈), `KitchenProps.jsx`(P4 형상 캐시 선행)
- [회귀 리스크 상] (a) Studio 값이 "같은 컴포넌트를 import했다"만으로 동일성 통과가 금지되므로, 배칭 전후 같은 revision에서 world matrix·색을 일치 비교해야 한다. (b) Studio 재질 clone이 있는 부품은 고유 머티리얼이라 배칭 효율이 떨어진다(정상 동작). (c) **소유 InstancedMesh primitive에 `dispose={null}`을 주면 안 된다**(10-24 cleanup-repair 교훈). (d) raycast·조사 트리거가 소품 mesh를 참조하는지 확인해야 한다. **2.11의 계측으로 실제 render.calls가 예산을 넘는 것을 확인한 뒤에만 착수한다.**

### P4. 주방 소품 형상 캐시 + 정적 행렬 고정 (P3의 저위험 선행판)
- 내용: `PropCylinder`/`OutlinedCylinder`/`PropBlob`/`MagnetTag`의 JSX 인라인 geometry를 `getCachedCylinderGeo` 등 `toon.js` 캐시로 바꾼다. icosahedron 캐시는 같은 패턴으로 추가한다. Studio 적용 layout effect 뒤에 stage4 주방 소품 서브트리를 `matrixAutoUpdate=false`로 두고 `updateMatrix()`를 한 번 호출한다. 이렇게 하면 매 프레임 수백 개 객체의 행렬 재조립이 사라진다.
- [효과 2] [비용 S] [성능: draw 0, 머티리얼 0, geometry 객체·GPU 버퍼 약 100개 이상 감소(추정), 프레임당 CPU 행렬 계산 감소]
- [건드릴 파일] `src/components/StageObjects/KitchenProps.jsx`, `src/lib/toon.js`(icosahedron 캐시 추가 시), `StageObjectLayer.jsx` 또는 신규 훅
- [회귀 리스크 하~중] 공유 geometry를 unmount 때 dispose하면 안 된다(`STAGE_PROP_SHARED_*`의 `dispose:null` 패턴 사용, `propRendering.js:33-43`). Studio Apply로 transform이 바뀌면 `updateMatrix()`를 다시 불러야 한다. 이 처리가 빠지면 "Studio 값이 게임에 안 먹는" 치명 버그가 된다. **mesh 수와 child 순서는 바꾸지 않는다**(Studio numeric child path 보존).

### P5. 해저드 표식 머티리얼·메시 통합 (가마솥 바닥 경고 + B04 국물)
- 내용: JSX `<meshBasicMaterial>`을 모듈 수준 공유 머티리얼 4~5종(테두리 어둠·경고 노랑·화염 주황·국물 채움·김 흰색)으로 바꾼다. 가마솥 진행 눈금 12개는 링 1개와 `uProgress` 셰이더(각도 기준 discard) 또는 병합 geometry + `drawRange`로 처리한다. 스포크 8개도 병합 1개로 만든다. 국물 분절 호 8개는 원마다 병합 geometry 1개로 만든다. **연속 원 = 솥, 분절 원 = 국물이라는 형태 의미는 그대로 유지**한다(`ko.js` `stage4Guide.markers/soupMarkers`).
- [효과 2(위험 순간의 프레임 스파이크 완화)] [비용 S~M] [성능: 가마솥 경고 23→약 5 draw, 국물 최대 39→약 9 draw, 머티리얼 62→약 5]
- [건드릴 파일] `src/components/StageObjects/Stage4CauldronGroundWarning.jsx`, `src/components/Enemy.jsx`(`B04SoupBlastVisual`)
- [회귀 리스크 중] `Stage4Hazards.runtime.test.jsx`·`EnemyVisual.test.js`가 눈금 12개·호 8개를 mesh 구조로 확인하므로 의미 수준 단언으로 고쳐야 한다. 10-24 교훈대로, 테스트를 문자열 부재 확인으로 약화하지 말고 반경·개수·각도 간격을 geometry 수준에서 검증한다. 반경 3.2 / 1.1 units(0.8 / 0.275블록)와 월드 원점 portal 구조는 바꾸지 않는다.

### P6. B04 국물 텔레그래프 진행 채움
- 내용: 1200ms 텔레그래프 동안 기존 채움 원판(`Enemy.jsx:750-753`)의 scale을 0에서 내부 반경까지 useFrame으로 키운다. 마지막 약 300ms에는 분절 테두리 opacity를 올린다. B03이 쓰는 "리렌더 없이 useFrame에서 머티리얼만 조작" 패턴(`Enemy.jsx:784-810`)을 재사용한다. 그러면 "어디"와 함께 "언제"가 형태로 전달된다.
- [효과 4] [비용 S] [성능: draw 0, 머티리얼 0(P5 이후에는 채움 머티리얼 1개를 원마다 clone하거나 scale만 사용)]
- [건드릴 파일] `src/components/Enemy.jsx`
- [회귀 리스크 하] 채움이 피해 반경 1.1 units(0.275블록)를 **넘으면 안 된다**(현재 채움 반경 = 1.1 - 0.22). 일시정지 중 진행이 멈춰야 하고, 게임시간 기준으로 동작해야 한다. 판정·타이밍 상수(`b04SoupBlast.js:121-124`)는 변경하지 않는다.

### P7. 가마솥 자체 발광 큐 (광원 없이) — 압력계 바늘·표시등·안전밸브
- 내용: 3초 비등 동안 압력계 바늘(`PressureCauldron.jsx:253`)을 정상 각도에서 빨간 영역으로 회전시킨다(Studio part offset은 기존 파편과 같은 방식인 `studioPartRotationOffset`으로 합산). 빨간 표시등(`:254`)과 안전밸브 캡(`:231`)은 **가마솥 전용 clone 머티리얼**의 emissiveIntensity를 0.12→0.9로 올리고 마지막 0.45초에 3회 펄스를 준다. 이것이 08-23 플랜의 "중앙 practical/hazard 겸용 PointLight"를 대체한다. 지금 쓰이지 않는 `flash={red}` 경로를 정리하는 일도 포함한다.
- [효과 4] [비용 S~M] [성능: draw 0, 머티리얼 +2~3(가마솥 전용 clone), 실시간 광원 0]
- [건드릴 파일] `src/components/StageObjects/PressureCauldron.jsx`, `PressureCauldron.test.js`
- [회귀 리스크 중] **공유 캐시 toon 머티리얼의 emissive를 직접 바꾸면 같은 색을 쓰는 모든 소품이 같이 깜빡인다**. 반드시 가마솥 소유 clone을 쓰고 unmount 때 dispose한다. Studio의 해당 part 재질 튜닝(clone 격리)과 충돌하지 않는지 확인해야 한다. 바늘 회전은 Studio 회전값을 덮어쓰지 않고 더한다.

### P8. 가마솥 폭발 바닥 섬광 데칼 (광원 대체)
- 내용: 250ms 폭발 동안 world portal(`Stage4CauldronGroundWarning`) 안에 반경 3.2 units 원판 1개를 둔다. AdditiveBlending, `#FF6B1F`, opacity 0→0.35→0 곡선이다. 파편 비행 거리가 아니라 **실제 피해 반경만** 밝힌다(10-22 문서 3.3 "파편 끝을 피해로 오인 금지"). reduced-effects 설정에서는 끈다.
- [효과 3] [비용 S] [성능: +1 draw(250ms 동안만), +1 머티리얼, 투명 1장 오버드로우는 반경 3.2 원 면적에 한정]
- [건드릴 파일] `src/components/StageObjects/Stage4CauldronGroundWarning.jsx`
- [회귀 리스크 하] HUD나 국물 표식을 하얗게 날리지 않도록 opacity 상한을 단언 테스트로 고정한다. 모델 하위가 아니라 portal 안에 둬서 0.4 base scale을 상속하지 않게 한다.

### P9. 비등 증기를 절차적 SDF 퍼프로 교체 (불투명 유지)
- 내용: 현재 증기 3개(8각 실린더 + 불투명 toon)의 **mesh 노드 수와 순서는 그대로 두고** geometry와 material만 바꾼다. 카메라를 향한 quad에 SDF 구름 셰이더(원 3~4개 합성, E07 얼굴과 같은 `softCircle` 방식)를 쓰고, `alphaTest` discard로 **불투명 패스를 유지**한다. 툰 2단 명암은 셰이더 안에서 처리한다.
- [효과 3] [비용 M] [성능: draw 3 그대로(또는 instanced 1), 머티리얼 +1(ShaderMaterial), 텍스처 0]
- [건드릴 파일] `src/components/StageObjects/PressureCauldron.jsx`, 신규 `src/lib/proceduralSteamMaterial.js`
- [회귀 리스크 중] 08-22 투명 감사 교훈상 **alpha blending을 쓰면 안 된다**(정렬·깊이 문제 재발). Studio가 증기 노드를 part로 튜닝하고 있으면(`studioPartPositionOffset` 사용, `:130-136`) 노드 identity를 보존해야 한다. 같은 머티리얼을 P10의 보스 김과 공유할 수 있다.

### P10. B04 격노(phase2) 지속 신호
- 내용: phase2 동안 (a) 기존 `BossFacePartsOverlay` 셰이더에 **덧셈형** `uRage` 유니폼(눈썹 각도·입 모양 편향)을 넣는다. Studio의 `bossFaceRecipe`는 바꾸지 않는다. (b) 모자 위에 P9 퍼프 1~2개를 둬 김이 오르는 표시를 한다. 텔레그래프 1000ms 붉은 flash는 그대로 두고, 이후에는 "화난 얼굴과 머리 김"으로 상태가 계속 보이게 한다.
- [효과 3] [비용 M] [성능: +1~2 draw(보스 1기), 머티리얼 0~1]
- [건드릴 파일] `src/components/BossFacePartsOverlay.jsx`, `src/components/ZombieMesh.jsx`(B04 분기 prop 전달), `src/components/Enemy.jsx`(isChefPhase2 전달)
- [회귀 리스크 중] Studio Preview·보스 카드 프리뷰는 phase1 표정이어야 한다(`uRage` 기본값 0). Studio recipe를 런타임이 덮어쓰면 절대법칙 위반이다. **08-23 롤백된 faceted 형상(`toNonIndexed`, geometryKind 별칭)은 재적용하지 않는다.**

### P11. E04 투사체 바닥 접지 점 (승인 필요)
- 내용: `PooledEnemyProjectileLayer`의 기존 풀 루프에서 투사체 XZ 아래 y=0.03에 작은 어두운 원판을 InstancedMesh 1개로 함께 쓴다. 밝은 세라믹 위에서 높이와 궤적을 읽게 하려는 것이다. 투사체 kind 0의 색·크기·거동은 그대로 둔다.
- [효과 3] [비용 S] [성능: +1 instanced draw(전 스테이지 공통), 머티리얼 +1]
- [건드릴 파일] `src/components/PooledEnemyProjectileLayer.jsx`
- [회귀 리스크 중] kind 0이 "정본, 변경 금지" 계약이라 **요소 추가라도 사용자 승인이 먼저**다. 이 레이어는 stage2·3에서도 쓰므로 stage4 전용으로 할지 전역으로 할지 결정해야 한다. 승인이 나지 않으면 진행하지 않는다.

---

## 3. 우선순위 추천 Top 5

1. **P2 색 구역 재조정 — 먼저 할 1개.** 경고 링이 노랗게 물든 바닥 위에 노랑으로 그려지는 문제는 굽기 식으로 계산해 확인했다(반경 3.2 units에서 원뿔 감쇠 약 0.67). 데이터 2줄만 바꾸면 되고 런타임 비용은 0이며, 기존 `stageLightingProfile.test.js`·`stageFloorLightBake.test.js`가 그대로 지킨다. 밝기 위계 1순위(위험 텔레그래프)를 바로 개선하고, 이후 P1의 AO가 곱해질 **바닥 기준색을 먼저 확정**하므로 캡처를 두 번 할 필요가 없다. 선행 조건은 현재 hex가 사용자 확정값인지 1회 확인하는 것이다. 확정값이라 거부되면 P1부터 시작한다.
2. **P1 접지 AO와 경계 띠 굽기.** draw·머티리얼 증감 없이 "떠 있는 가구", "solid와 clutter 구분 불가", "맵 끝이 잘린 느낌"을 한 번에 해결한다. 기존 굽기 경로를 그대로 쓰고 stage4에만 적용된다.
3. **P6 B04 국물 진행 채움.** 비용이 S이고 draw는 0이다. 보스 패턴의 "언제"를 형태로 전달하므로 회피 판독에 직접 효과가 있다. 판정 상수는 건드리지 않는다.
4. **P7 가마솥 자체 발광 큐.** 금지된 실시간 광원 없이 08-23 플랜의 의도(비등에서 폭발로 이어지는 연출)를 머티리얼 2~3개로 구현한다. 10-22 문서 3.3의 "압력계 방향 변화" 제안도 함께 충족한다.
5. **P3 정적 소품 배칭 (계측 게이트).** 모바일 성능에서 가장 큰 효과(약 532 → 약 50 draw, 추정)지만 비용 L과 리스크 상이다. P4(형상 캐시, S)를 먼저 하고 2.11 계측으로 실제 `render.calls`를 확인한 뒤 착수 여부를 정한다.

이 순서는 "런타임 비용 0인 판독 개선 → 보스·해저드 판독 → 성능 구조 개선" 흐름이다. P5·P8·P9·P10·P11은 Top 5 이후 묶음 후보다.

---

## 4. 하지 말아야 할 것 (이전 제안·롤백 이력과 충돌)

- **실시간 SpotLight/PointLight 추가 금지.** 08-23 마스터 플랜의 "북쪽 practical Spot 1 + 중앙 Point 1"도 포함한다. 모바일 필레이트 때문에 제거된 이력이 있고, `Game.jsx:217-220` 주석과 `Game.stageLighting.test.js:29-46`이 0개를 잠근다. 위험 연출은 P7/P8처럼 머티리얼·데칼로 한다.
- **스테인리스를 PBR로 바꾸지 않는다.** metalness, 환경맵, SSR, 실시간 반사는 금지한다. 4톤 toon 명도 분리가 정본이다(`KitchenProps.jsx:9-11`).
- **전면 bloom이나 전체 화면 후처리 outline을 Stage 4 해결책으로 쓰지 않는다**(10-22 문서 A11, 08-23 플랜 4장). 스크린스페이스 outline은 전역 미결 사안이라 따로 결정한다.
- **가마솥 주변에 영구 장식 링이나 "안전지대" 바닥 표시를 두지 않는다**(10-24 바닥 제안 3장, 10-22 문서 3.2). P1의 가마솥 AO는 원형 발자국 음영이며 반경 3.2 테두리를 그리지 않는다.
- **바닥 경고 링을 가마솥 모델 하위로 되돌리지 않는다.** 모델 스케일 0.4·Studio scale을 상속하던 8-box 링을 10-24에 제거한 회귀 이력이 있다. 반경, 주기, 원점, `PRESSURE_CAULDRON_BASE_SCALE 0.4`, Studio itemId·numeric child path는 변경하지 않는다.
- **주방 표면을 `depthWrite:false`나 투명으로 되돌리지 않는다**(08-22 P0 회귀). 증기·김도 alpha blending이 아니라 alphaTest 불투명을 쓴다.
- **공유 캐시 toon 머티리얼을 직접 애니메이트하지 않는다.** 같은 색의 모든 소품이 같이 변한다.
- **소유 InstancedMesh primitive에 `dispose={null}`을 주지 않는다**(10-24 cleanup-repair).
- **faceted 형상(`toNonIndexed`, `geometryKind` 별칭 wedge/flatDisc)을 B04에 재적용하지 않는다**(08-23 롤백). 새 원화와 Player 1종 vertical slice 승인 없이는 보스 재모델링도 하지 않는다.
- **바닥 텍스처 A/B/C 재제안 중복 금지.** 10-24 안이 승인 대기 중이며, 전역 반복 타일에 북·남 구역 색면을 굽지 않는다.
- **새 미로·식탁 군집·중앙 조리대 복귀·맵 크기 변경·폐기된 신규 좀비(C4_*) 부활 금지**(10-22 문서 7.3).
- **E04 kind 0의 색·크기·거동을 바꾸지 않는다.** P11도 승인 전에는 진행하지 않는다.
- **Studio 값을 로컬 시드·localStorage·소스 기본값으로 대체하거나, Firebase 준비 여부로 그래픽을 숨기지 않는다.** P1·P3 재굽기·재배칭 입력은 Firebase에서 hydrate된 resolved 배치와 적용 결과만 쓴다.
- `GraphicsStudio.jsx` 수정 금지. 타이틀 장면, Stage 1~3, 초안 단계인 Stage 6~10은 범위 밖이다.

---

## 5. 검증 방법

### 5.1 자동 테스트 (항목별 필수 범위)
| 항목 | 기존 테스트(유지·갱신) | 새로 추가할 단언 |
|---|---|---|
| P1 | `src/lib/stageFloorLightBake.test.js`, `src/components/ClassroomFloor.test.jsx` | stage1~3 lightMap 픽셀 해시 불변. stage4 solid 발자국 중심이 주변보다 어둡고 clutter 발자국은 아님. placement version이 바뀌면 재굽기 |
| P2 | `src/lib/stageLightingProfile.test.js`, `src/components/Game.stageLighting.test.js` | 반경 3.2 지점 굽기 색의 채도·색상이 경고 `#FFE576`과 일정 거리 이상 떨어짐(색 거리 단언) |
| P3·P4 | `StageObjects/stageObjectAssets.test.jsx`, `stage4PropLayout.static.test.js`, `authoredPlacementSafety.test.js`, `GraphicsStudio.gameSync.test.js` | 배칭 전후 같은 Studio 스냅샷에서 모든 부품 world matrix·색 일치. unmount 2회 시 dispose 각 1회. shared geometry가 dispose되지 않음 |
| P5·P6·P8 | `Stage4Hazards.runtime.test.jsx`, `EnemyVisual.test.js`, `stage4HazardLifecycle.test.js`, `src/lib/b04SoupBlast.test.js` | 눈금 12구간·분절 8호의 각도·간격(geometry 수준). 채움 반경 ≤ 1.1-0.22. 섬광 opacity ≤ 0.35. 일시정지 시 진행 정지 |
| P7·P9 | `PressureCauldron.test.js`, `Game.stage4PressureCauldron.test.js`, `src/lib/stage4PressureCauldronHazard.test.js` | 비등 구간에만 바늘 회전·emissive 상승. 공유 캐시 머티리얼 인스턴스 불변. 증기 노드 수·순서 불변. ShaderMaterial `transparent=false`, alphaTest>0 |
| P10 | `BossFace*` 관련 테스트, `GraphicsStudioPreview.test.js` | Preview/카드에서 `uRage=0`. phase2에서만 1. recipe 객체 불변 |

모든 실행은 정상 `npm test -- <파일>` lifecycle로 한다. pretest의 branch guard, legacy-B02, dialogue, studio-game-sync 게이트를 우회하지 않는다. 같은 대상의 집중 테스트는 Worker 1명만 실행한다(08-08 회고).

### 5.2 성능 계측 (P3 착수 게이트와 전 항목 회귀 감시)
- `StageEntryRuntimeDiagnostics`가 발행하는 `escape-zombie-school:stage-entry-metric` 이벤트(`src/lib/stageEntryMetrics.js:12-21`, `render.calls`/`triangles`/`geometries`/`textures`)로 stage4 진입 직후 baseline을 기록한다. 같은 위치 3곳(시작 `[0,0,7]`, 중앙 남측, 북쪽 쿡라인 앞)에서 항목 적용 전후를 비교한다.
- 수용 기준은 `Quaility_Assurance/stage4_theatrical_lighting_acceptance_plan_2026-08-23.md`의 성능 행을 재사용한다. 저사양 Android에서 일반 웨이브 30초 + B04·국물·가마솥 30초 동안 p95 frame time ≤ 33.3ms, 최장 < 100ms, context loss 0. 측정 없이 "최적화됨"이나 "성능 PASS"라고 쓰지 않는다.

### 5.3 실제 화면·Studio 패리티 확인 (Advisor/balanceqa 수행, 이 문서에서는 미실행)
- 캡처 목록은 08-23 플랜 7장의 7개 shot을 재사용한다. 광각 시작, 가마솥 -3초/-0.45초/+0.1초, B04 P1, 국물 텔레그래프, 격노 전환, 360×800·430×932 세로, 성능 비교다. P2는 회색조와 색각 이상 모의 캡처를 추가해 "솥 연속 원 vs 국물 분절 원"이 색 없이도 구분되는지 본다.
- P3·P4·P7·P10은 Studio 값에 닿는 경로라 **같은 Firebase revision을 RAM 전용으로 읽어** Studio Preview와 게임 화면의 소품·가마솥·B04를 나란히 비교한다. 원격 쓰기 0건, 테스트 전후 Firebase 값·revision 해시 동일 증명(AGENTS "테스트 전후 상태 절대 동일성 법칙")을 지킨다.
- 브라우저 실행은 `npm run browser:reserve` 가드와 최대 3개 인스턴스 상한을 따른다. dev 서버는 `http://localhost:5173/`만 쓴다.
- 해저드 판독 변경(P2·P5·P6·P7·P8)은 balanceqa 수용 판정을 함께 받는다. 안내 문구의 형태 의미("연속 원 = 솥, 분절 원 = 국물")가 바뀌는 변경이 생기면 uimini를 함께 참여시킨다.

---

### 부록 — 이번 작성의 근거와 한계
- 읽은 소스: `KitchenProps.jsx`, `PressureCauldron.jsx`, `Stage4CauldronGroundWarning.jsx`, `propRendering.js`, `StageObjectLayer.jsx`, `stageObjectPlacements.js`(stage4 블록), `ClassroomFloor.jsx`, `Floor.jsx`, `Game.jsx`(조명·카메라), `GameCanvas.jsx`, `stageLightingProfile.js`, `stageFloorLightBake.js`, `stage4PressureCauldronHazard.js`, `hazardWarningBoundary.js`, `b04SoupBlast.js`, `stage4CauldronFeedback.js`, `Enemy.jsx`(B04 구간), `ZombieMesh.jsx`(B04), `BossFacePartsOverlay.jsx`(머리), `PooledEnemyProjectileLayer.jsx`, `StudioTunedGroup.jsx`(적용 시점), `stageConfig.js`(stage4), `stageEntryMetrics.js`.
- 브리프에 적힌 `src/lib/b04SoupBlastBoundaryVisual.js`와 `src/components/Stage4GameplayGuide.jsx`는 HEAD `07b93e41`에 **존재하지 않는다**. 실제 대응 파일은 `Enemy.jsx`의 `B04SoupBlastVisual`과 `Stage4HazardGuide.jsx`다.
- 참고 문서: `Developer/agent_room/stage4_upgrade_20261024/*`, `stage4_floor_proposal_20261024/*`, `stage4_theatrical_lighting_director_persona_2026-08-23.toh`, `Developer/lowpoly_player_b01_b04_faceted_geometry_implementation_2026-08-23.md`, `Graphic_designer/stage4_kitchen_theatrical_lighting_master_plan_2026-08-23.md`, `stage4_graphics_and_zombies_20261022.md`(3·7장), `stage4_cafeteria_floor_upgrade_20261024.md`, `Quaility_Assurance/stage4_prop_transparency_abnormal_visual_audit_2026-08-22.md`, `stage4_theatrical_lighting_acceptance_plan_2026-08-23.md`. `stage4_upgrade_20261024/advisor-review.md`는 인코딩이 깨져 한국어 본문을 읽을 수 없었다.
- 미실행: 테스트, 빌드, 브라우저, dev 서버, Firebase, Git. 모든 draw call·머티리얼 수치는 소스 정적 집계 추정이다. 해저드 색 충돌은 굽기 식으로 계산했으며 화면 캡처 검증은 아직 하지 않았다.
