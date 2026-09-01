# 모바일 렌더링/GPU hotspot 감사 — threemini

- Kanban task: `t_121d6991`
- 작성 시각: 2026-08-31 00:58 KST
- 범위: 읽기 전용 코드/히스토리 감사. 게임 런타임/Graphics Studio/title/Firebase/git 상태는 변경하지 않았고, 산출물로 이 문서만 작성했다.
- 대상 repo/workspace: `D:/JungSil/2.Minigame_project/school_survivor-integration`
- 대상 subproject: `Developer/r3f_prototype`
- 대상 HEAD: `3d759c5c327a72eab5964be9cc60f79a474b10f0` (`Nerf Starlink cadence and rotate LineDraw`)
- Branch gate: `zombie_only`, detached=no, merge/rebase active=no.

## 0. 감사 전제와 제한

이 문서는 Galaxy A24 slowdown 원인을 확정하지 않는다. 현재 launchmini 실기기 baseline은 ADB 연결 기기 없음으로 미측정(`Quaility_Assurance/galaxy_a24_play_v50_performance_baseline_2026-08-31.md`)이고, 따라서 GPU/CPU/frame pacing 병목은 아직 정량 확정 불가다.

이번 산출물은 다음 3가지를 분리한다.

1. 코드/히스토리에서 확인된 사실.
2. 모바일 GPU/R3F 관점의 falsifiable hypothesis.
3. 다음 계측에서 반증하거나 강화할 체크포인트.

## 1. 요약 판정

현재 게임플레이 렌더링은 과거의 가장 큰 GPU/React 위험인 “일반 좀비를 React mesh 수십 개로 렌더”하는 구조를 상당히 줄였다. `ZombieInstanceLayer.jsx`는 E01~E06/러너 계열을 fixed typed-array pool + `InstancedMesh`로 그리며, `frustumCulled=false`, `DynamicDrawUsage`, `instanceMatrix.needsUpdate`를 사용한다. Stage color-zone lighting도 실시간 `SpotLight`에서 baked floor lightMap으로 이동한 기록이 있어 모바일 pixel/shader 부담을 줄이는 방향이다.

다만 Galaxy A24급 모바일에서 GPU/렌더 hotspot으로 가장 먼저 검증할 후보는 아래 순서다.

1. `GameCanvas.jsx`의 gameplay Canvas가 `shadows`를 켜고 있고, scene 일부 mesh가 여전히 `castShadow`/`receiveShadow`를 갖는다.
2. title/Graphics Studio/lobby preview Canvas들은 `antialias:true`, `shadows`, 고강도 directional shadow를 쓴다. title-only 또는 Studio 화면 slowdown이면 gameplay pool보다 이쪽이 우선 후보다.
3. `ZombieInstanceLayer.jsx`는 인스턴싱으로 React fanout은 줄였지만, body/out/bar/cue/smoke/shadow 여러 InstancedMesh를 매 frame 업데이트한다. 일반 적 수가 높을 때 CPU→GPU instance upload와 outline 중복 draw call이 후보가 된다.
4. `Enemies.jsx` useFrame은 sight-blocked refresh, enemy simulation, projectile step, event drain을 한 루프에서 처리한다. GPU-only가 아니라 CPU simulation과 GPU upload가 같은 frame에서 겹치는 mixed bottleneck 가능성이 높다.
5. full-screen postprocessing library는 보이지 않지만, CSS/HUD audit에서 이미 full-screen filters/drop-shadow/backdrop-filter 후보가 발견되었으므로 WebGL GPU만 단독으로 보지 말고 browser compositing과 같이 봐야 한다.

## 2. 확인한 안전한 구조

### 2-1. Gameplay Canvas DPR cap

- `Developer/r3f_prototype/src/components/GameCanvas.jsx:16-25`
- 확인 내용: `dpr={[1, 1.5]}`가 설정되어 있어 모바일 DPR 2+ 픽셀 처리량 폭증을 제한한다.
- 이 항목은 Three_Mini knowledge/mobile checklist와 일치한다.

### 2-2. 일반 좀비 fixed-pool InstancedMesh 렌더링

- `Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx:1-3`
  - simulation typed-array slot을 GPU instance slot으로 직접 사용한다고 명시.
- `ZombieInstanceLayer.jsx:114-119`
  - `new THREE.InstancedMesh(..., POOLED_ENEMY_CAPACITY)`.
  - `x.frustumCulled = false`.
  - `x.instanceMatrix.setUsage(THREE.DynamicDrawUsage)`.
  - matrix/color/alpha update flags를 명시.
- `ZombieInstanceLayer.jsx:129-134`, `:176-203`
  - body/outlines/bars/cue/shadow/smoke를 pooled primitive로 구성.
- 해석: 몬스터 사라짐의 대표 원인인 instanced frustum culling 오판은 코드상 방어되어 있고, 반복 적 렌더를 React mount/unmount가 아니라 fixed pool로 옮긴 점은 안전하다.

### 2-3. Stage lighting 실시간 spotLight 제거와 baked floor lightMap

- `Developer/r3f_prototype/src/components/Game.jsx:181-185`
  - “스테이지 색 구역은 런타임 광원이 아니라 바닥 lightMap으로 굽는다”는 주석과 실시간 SpotLight 재추가 금지 주석 확인.
- `Developer/r3f_prototype/src/lib/stageLightingProfile.js:3-8`
  - stage lighting profile freeze 시 `castShadow: false` 강제.
- History evidence:
  - `dae89862` added theatrical stage lighting with `StageLighting.jsx`.
  - `66498190`, `62dffc10`, `2b77f500` tuned stronger/distinct lighting.
  - `1ed60ab5` removed `StageLighting.jsx` and added `stageFloorLightBake.js` / `ClassroomFloor.jsx` changes.
- 해석: 실시간 multi-spotlight 비용이 있었다가 baked texture/lightMap 쪽으로 회수된 것은 모바일 GPU 관점에서 올바른 방향이다.

### 2-4. Preview/lobby demand frameloop

- `Developer/r3f_prototype/src/components/StageBossPreview.jsx:285-290`
  - interactive가 아니면 `frameloop='demand'`로 상시 RAF/GPU loop를 제거한다.
- 해석: lobby card/preview 화면에서 idle GPU drain을 줄이는 안전한 구조다.

## 3. 위험 후보와 랭크

### H1 / 높음 — gameplay Canvas shadows가 켜져 있고 일부 scene mesh가 shadow path에 남아 있다

증거:
- `GameCanvas.jsx:21-23`: `dpr={[1, 1.5]}`, `shadows`, `gl={{ stencil: true }}`.
- `ClassroomFloor.jsx:230`: floor `receiveShadow`.
- `ClassroomFloor.jsx:350`: wall mesh `castShadow receiveShadow`.
- `DogeMesh.jsx:28`: doge mesh `castShadow receiveShadow`.
- `TreasureChest.jsx:46`: chest mesh `castShadow receiveShadow`.
- `StageObjects/propRendering.js:19-20`: stage prop shared rendering is `castShadow:false`, `receiveShadow:false`, which is good, but not all mesh families follow it.

왜 후보인가:
- 모바일 GPU에서 shadow map render pass는 fill-rate/draw cost를 늘린다.
- stage lighting은 baked로 줄였지만 global Canvas `shadows`가 살아 있으면 shadow-enabled objects and lights가 추가 path를 탄다.
- 일반 적 pool은 그림자가 blob plane이라 괜찮지만, player/doge/chest/wall/title 등 일부 non-pooled meshes가 shadow path를 만들 수 있다.

반증/확인 계측:
- Galaxy A24 remote debugging에서 gameplay 60초 기록: `renderer.info.render.calls`, frame p95, GPU/composite time.
- 임시 dev-only experiment로 `GameCanvas shadows` off 또는 selected `castShadow/receiveShadow=false` override를 적용한 A/B. frame p95가 의미 있게 내려가면 H1 강화.
- 단, 실제 제품 변경은 별도 카드와 시각 회귀 캡처가 필요하다. 그림자를 전부 끄면 toon depth/readability가 바뀐다.

### H2 / 높음 — title/Graphics Studio Canvas가 antialias+shadows+shadow directionalLight 조합을 사용한다

증거:
- `TitleSceneCanvas.jsx:8-12`: `gl={{ stencil: true, antialias: true }}`, `shadows`.
- `TitleScene3D.jsx:641-645`: 3 directional lights + 1 point light, 첫 directionalLight `castShadow`.
- `GraphicsStudioPreview.jsx:720-732`: directionalLight intensity 3.2 with `castShadow` and shadow map size `[1024,1024]`.
- `GraphicsStudioPreview.jsx:746-750`: `gl={{ stencil: true, antialias: true }}`, `shadows`.
- `StageLock.jsx:86-87`: preview Canvas `antialias:true`, `dpr={[1,1.5]}`.

왜 후보인가:
- launchmini baseline 카드의 목표가 title-only였으나 실기기 미측정이다. 만약 신고가 title/lobby/Studio에서 체감되는 slowdown이면 gameplay enemies보다 title/preview Canvas의 antialias/shadow/light 조합을 먼저 의심해야 한다.
- `TitleSceneCanvas`에는 DPR cap이 보이지 않는다. R3F 기본 DPR가 기기 DPR를 그대로 탈 수 있으면 Galaxy A24에서 title pixel cost가 gameplay보다 커질 수 있다.

반증/확인 계측:
- title-only cold/warm 60초 gfxinfo/SurfaceFlinger baseline을 먼저 수집한다.
- title Canvas에 임시 `dpr={[1,1.5]}`를 넣은 실험과 현재 title을 비교한다.
- `antialias:false`, shadow off, pointLight off를 각각 독립 실험해 어떤 항목이 frame p95를 내리는지 분리한다.

### H3 / 중상 — ZombieInstanceLayer의 outline/body/bar/cue 다중 InstancedMesh가 draw call과 instance upload를 만든다

증거:
- `ZombieInstanceLayer.jsx:129-134`: `body`, `out`, `shadow`, `bars`, `smoke`, `cue` pool 생성.
- `ZombieInstanceLayer.jsx:176-203`: frame마다 counts 설정 및 matrix/color/alpha update flags.
- `ZombieInstanceLayer.jsx:114-117`: body part별 InstancedMesh, outline part별 InstancedMesh, cue InstancedMesh 16-slot.

왜 후보인가:
- 인스턴싱은 좋은 방향이지만 “파트 수 × body/outline × material groups” 만큼 draw call은 남는다.
- outline은 back-side duplicate geometry라 동일 part에 대해 추가 draw가 발생한다.
- active enemy가 많을 때 CPU가 matrices를 계산하고 GPU로 instanceMatrix를 업로드하는 비용이 simulation step과 같은 frame에 겹친다.

반증/확인 계측:
- `renderer.info.render.calls`와 active enemy count를 HUD/dev console에 1초 cadence로 로깅한다.
- outline off / healthbar off / smoke off dev-only flags로 60초 A/B. draw calls와 p95 frame time이 어느 항목에 반응하는지 확인한다.
- 일반 적 active count별 계단 테스트: 50/100/150/200에서 frame p50/p95/max와 calls/triangles를 기록한다.

### H4 / 중상 — Enemies useFrame CPU simulation과 rendering upload가 같은 frame 예산을 공유한다

증거:
- `Enemies.jsx:1800-1833`: spawn catch-up, live enemy count, pending spawn calc.
- `Enemies.jsx:1840-1849`: pooled enemy sight blocked refresh tier/generation loop.
- `Enemies.jsx:1868-1884`: dominance swarm eval + enemySimulationRuntime.step.
- `Enemies.jsx:1885-1897`: event drain + projectile pool step.
- `Enemies.jsx:1920-1933`: burst event scheduling.

왜 후보인가:
- 사용자 체감은 “GPU slowdown”처럼 보일 수 있지만, 실제로는 CPU simulation + matrix upload + browser composite가 한 frame 안에서 합쳐진 mixed bottleneck일 가능성이 크다.
- 최근 한 달 history에 spawn/respawn/overtime/reinforcement/boss pressure 작업이 많아 active enemy 수와 scheduling pressure가 올라갔을 수 있다.

반증/확인 계측:
- `enemyPool.activeCount`, queued count, `enemySimulationRuntime.step` duration, `ZombieInstanceLayer` update duration을 performance.mark/measure로 분리한다.
- frame p95 spike 시 active/queued/sight refresh/burst scheduling이 같이 오르는지 확인한다.
- levelmini/balanceqa gameplay/Rapier audit 결과와 합쳐야 한다.

### H5 / 중간 — full-screen postprocessing library는 없지만 CSS compositing 비용이 WebGL과 겹친다

증거:
- 코드 검색에서 `EffectComposer`, `Bloom`, `SSAO`, `SMAA`, `postprocessing` runtime 사용 증거는 발견하지 못했다.
- 별도 UI audit `Quaility_Assurance/mobile_react_hud_performance_audit_2026-08-31.md`는 HUD full-screen radial-gradient animation, backdrop-filter, drop-shadow/filter 후보를 보고했다.

왜 후보인가:
- Android Chrome/WebView에서는 WebGL canvas 위 full-screen CSS overlay/filter가 GPU/compositor 비용으로 같이 잡힌다.
- WebGL renderer.info만 보면 안 잡히는 비용이다.

반증/확인 계측:
- Chrome Performance에서 `Paint`, `Composite Layers`, `Update Layer Tree`를 WebGL frame과 같이 본다.
- low HP vignette/gameover overlay/Matilda contact grayscale 상태를 normal gameplay와 분리 측정한다.

## 4. 최근 1개월 history에서 본 렌더링 관련 변화

명령:

```bash
git log --since='1 month ago' --date=short --pretty=format:'%h %ad %s' -- Developer/r3f_prototype/src
```

주요 후보:

- `886cbe7b` 2026-08-27 `feat(graphics): apply mobile visual polish plan`
  - stage props/pickup/stage lighting profile 조정. 이름은 mobile visual polish지만 정량 모바일 성능 측정 evidence는 이번 감사에서 발견하지 못했다.
- `1ed60ab5` 2026-08-25 `Bake stage lighting into classroom floor`
  - `StageLighting.jsx` 삭제, `stageFloorLightBake.js` 추가. 실시간 light cost 제거 쪽이라 안전 후보.
- `dae89862`~`2b77f500` 2026-08-25 stage theatrical/color zone lighting series
  - 실시간 spotlight 추가/강화 후 baked로 회수된 흐름. 중간 commit 기준의 Play build가 배포되었다면 title/gameplay 성능 차이가 있을 수 있으므로 version/source 확인 필요.
- `b8ba93dc`, `bd6647d8`, `7c71d486` 2026-08-30 spawn/empty-field catch-up 관련
  - 렌더링보다 active count/scheduling pressure를 바꿀 수 있는 gameplay-side 후보.
- `31faa1e9` 2026-08-30 `WIP: start unifying the zombie collider with the player's`
  - 현재 working tree에 `Enemy.jsx`/`EnemyVisual.test.js` 변경과 관련 테스트 실패가 있어, performance audit과 별개로 review blocker다.

## 5. 실행 검증

### 5-1. Targeted render/visual tests

명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm run test -- src/components/Enemies.test.jsx src/components/EnemyVisual.test.js src/lib/stageLightingProfile.test.js src/components/ClassroomFloor.test.jsx
```

결과:

- Pretest gates: branch guard OK, legacy B02 gate OK, dialogue store gate OK, studio-game sync source contract OK.
- Vitest total: 3 files passed, 1 failed.
- Passed: `src/lib/stageLightingProfile.test.js` 6 tests, `src/components/ClassroomFloor.test.jsx` 9 tests, `src/components/Enemies.test.jsx` 125 tests.
- Failed: `src/components/EnemyVisual.test.js` 3 failed / 34.
- Failure cluster: Matilda body-contact tests expected true but received false at lines 447, 453, 463.

해석:
- 이 실패는 GPU hotspot 원인으로 확정할 수 없다.
- 하지만 현재 working tree의 `Enemy.jsx`/`EnemyVisual.test.js` 변경이 functional regression 상태임을 보여준다. 이 task가 read-only audit이므로 수정하지 않았고, 후속 reviewer/fix 카드에서 다뤄야 한다.

### 5-2. Production build

명령:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm run build
```

결과:

- Prebuild gates: branch guard OK, Firebase release env gate PASS, legacy B02 source gate PASS, dialogue store gate PASS, studio-game sync verify 41/41 tests PASS.
- Vite build: 351 modules transformed, built in 2.77s.
- Postbuild: legacy B02 artifact gate passed, hosting JavaScript asset verification passed (56 assets checked).
- Warnings:
  - `vendor-three-9esQIEjV.js` 2,801.43 kB / gzip 967.12 kB.
  - chunks > 500 kB warning.
  - ineffective dynamic imports for `weaponCatalog.js`, `weaponUnlocks.js`.

해석:
- build는 통과하지만, Three vendor payload와 gameplay chunk sizes are relevant to mobile startup/thermal, especially title/gameplay transition.
- runtime FPS/GPU는 build pass만으로 검증되지 않는다.

## 6. 다음 계측 매트릭스

실기기 연결 후 synthesis 전에 최소 아래 표를 채워야 한다.

| Scenario | Required counters | Pass/fail hint |
|---|---|---|
| title cold 60s | gfxinfo framestats, SurfaceFlinger, meminfo, screenshot, title Canvas DPR/shadows variant | title p95 frame > 24ms이면 H2 우선 |
| gameplay 50 enemies 60s | active enemies, renderer.info calls/triangles, JS step duration, frame p95 | baseline |
| gameplay 100/150/200 enemies | same counters | active count와 frame time 선형/급증 여부 |
| shadows off dev-only | same counters + screenshot | p95 15%+ 개선이면 H1 강화 |
| outline off dev-only | calls/triangles/frame p95 + screenshot | draw call/p95 개선이면 H3 강화 |
| low HP overlay on/off | Chrome Paint/Composite + frame p95 | composite 증가 시 H5/UI audit 연동 |

## 7. 수정 후보 우선순위(이번 작업에서는 미수정)

1. TitleSceneCanvas에 gameplay와 같은 DPR cap 적용 여부 실험: `dpr={[1, 1.5]}`.
2. Gameplay shadow budget audit: `GameCanvas shadows`와 remaining `castShadow/receiveShadow` mesh를 actual device A/B로 검증.
3. `ZombieInstanceLayer` dev metrics: active count, draw calls, triangles, instance update duration을 1초 cadence로 수집하는 non-production debug hook.
4. Outline/healthbar/smoke dev-only toggles로 cost attribution.
5. HUD CSS/compositor 후보와 같은 trace에서 합쳐 보기: WebGL renderer counters + Chrome Performance composite events.
6. Current `EnemyVisual.test.js` Matilda contact regression은 별도 fix/review 카드로 처리.

## 8. Source hashes used as evidence

```text
396b263be7ac2e2f25639feb9a60644fd1e521c208b90bfb64a5658cb447f096  Developer/r3f_prototype/src/components/GameCanvas.jsx
8e18b76da6a22e673ba1f2c9b1191f3dfd9de2aad541b52bfa67e32de14f3b97  Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx
b571b9eb61ccdd8e7b11f74961409281647ce8dfcf14368884ee942341b057ff  Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx
e9a13764546a40eac56ef109f858b6e5a17eaec79061ac49d641e4416f6d05b2  Developer/r3f_prototype/src/components/Enemies.jsx
dfb5c9df029167da1621d91d60a6e4569df0c3285a5da549b93368b531b864d9  Developer/r3f_prototype/src/components/Enemy.jsx
7919460d398f600d950ec5a38283befa59093c1062b830ba505eae20e4185a2c  Developer/r3f_prototype/src/components/TitleSceneCanvas.jsx
c6e51c4d248230f484a1118c6f8f2b0d1d5bd6ab7c60697f316277a3c04f0d7c  Developer/r3f_prototype/src/components/TitleScene3D.jsx
47f2cdfb97ccb59b9e46968a0710a8e7f36479d26bdfa7f7b64eb4aed866294f  Developer/r3f_prototype/src/lib/stageLightingProfile.js
ef166bb48a2f25eed3184d47819d754c194fe4d2818b4bd7c1e9b3ce16b94353  Developer/r3f_prototype/package.json
```

## 9. 최종 결론

현재 코드 증거만 보면 가장 위험한 “일반 적 React fanout”은 이미 fixed-pool instancing으로 상당히 완화되어 있다. Galaxy A24 성능 저하의 1차 검증 순서는 title/preview Canvas DPR+antialias+shadow(H2), gameplay shadow path(H1), instanced outline/body/bar upload와 draw calls(H3), 그리고 Enemies simulation pressure(H4)를 같은 trace에서 분리하는 것이다. 실기기 baseline이 없으므로 지금은 원인 확정이나 fix 적용보다 계측 훅/시나리오를 먼저 세우는 것이 안전하다.
