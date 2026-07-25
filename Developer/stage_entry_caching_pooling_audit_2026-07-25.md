# 스테이지 진입 캐싱·풀링 감사 — 2026-07-25

## 결론

판정은 **부분 양호**다. 전투 중 일반 적·투사체·피해 숫자는 고정 풀과 인스턴싱을 사용해 안정적이다. 반면 스테이지에 들어가는 순간에는 Game Canvas/Physics/시각 풀/정적 프롭을 한 번에 마운트하며, 텍스처·셰이더의 사전 예열이 없다. 따라서 저사양 기기의 첫 입장 또는 스테이지 전환 순간 부하를 충분히 막고 있다고는 판단할 수 없다.

이 문서는 읽기 전용 코드 감사 기록이다. 구현 변경, Firebase 변경, 브라우저 측정은 하지 않았다.

## 확인된 런타임 풀·캐시

| 대상 | 구현 근거 | 판정 |
| --- | --- | --- |
| 일반 적 | `src/lib/enemyEntityPool.js:60-116`의 200 슬롯 typed array/세대 핸들. `refs.js:25-47`에서 단일 런타임 정본으로 생성하고 reset 때 배열을 재생성하지 않는다. | 양호 |
| 적 시뮬레이션 | `enemySimulation.js:92-146, 443-462, 608-639`의 고정 spatial grid, 이벤트 큐, 이웃 최대 24명 제한. | 양호 |
| 좀비 시각 | `ZombieInstanceLayer.jsx:72-76, 79-125`의 200 슬롯 InstancedMesh, zero matrix, DynamicDrawUsage, frustum culling 비활성화. | 전투 중 양호 |
| 적 투사체 | 32 슬롯 `enemyProjectilePool.js:1-31, 80-128`, 2개 InstancedMesh `PooledEnemyProjectileLayer.jsx:13-39`. | 양호 |
| 피해 숫자 | 28 슬롯 CanvasTexture/mesh를 1회 만들고 재활용: `DamageNumbersLayer.jsx:21-86, 97-146`. | 양호 |
| hit/death 예약 | bounded typed queue: `Enemies.jsx:744-865`, hit queue 256. | 양호 |
| 장애물 | stage 전환 때만 정적 자료를 해석하여 ref cache에 저장: `Enemies.jsx:762-775`. sight obstacle Map cache: `StageObjects/stageObjectColliders.js:260-294`. | 양호 |
| 스폰 연기 | `Enemy.jsx:41-51`의 `useLoader.preload`. | 제한적 양호 |

적 데이터 typed-array의 정적 용량은 enemy pool **25,400 B**, projectile pool **1,024 B**, hit queue **4,352 B**다. 모두 작고 모듈/앱 로드 시 생성되므로 스테이지 시작에서 병목이 될 가능성은 낮다.

## 스테이지 진입 위험

### High — cold mount와 GPU 시각 풀 재생성

`ReadyGameApp.jsx:13-17, 150-161`은 GameCanvas를 lazy import하지만, 로비 idle 상태에서 preload/prefetch하지 않는다. 입장 클릭 뒤 `<Canvas>`, `<Physics>`, Game 트리와 모든 무기 모듈(`Game.jsx:18, 162-189`, `Weapons/index.js:3-18`)이 함께 로드·마운트된다.

또한 `useGameStore.js:619-653`은 `gameKey`를 증가시키며, `GameCanvas.jsx:17`의 `<Physics key={gameKey}>` 전체를 매 스테이지 다시 마운트한다. 논리 적 풀은 reset으로 재사용하지만, ZombieInstanceLayer/PooledEnemyProjectileLayer/DamageNumbersLayer의 GPU 시각 풀은 unmount/dispose 후 새로 생성된다(`ZombieInstanceLayer.jsx:92-99`, `PooledEnemyProjectileLayer.jsx:21-27`, `DamageNumbersLayer.jsx:77-86`). 즉 **풀은 존재하지만 시각 풀 자체가 stage mount마다 한꺼번에 생성되는 구조**다.

ZombieInstanceLayer의 정적 matrix buffer 추정은 다음과 같다.

- 33 파트의 body + outline, 6 plane, 12 cue mesh
- matrix buffer 약 **933,888 B (912 KiB)**
- alpha attribute **4,800 B**
- 인스턴스 색상 버퍼가 모두 생성되는 경우 합계 약 **1,020,192 B (996.28 KiB)**

이는 geometry, texture, material, shader program, driver allocation을 제외한 정적 추정치다. 첫 wave에서 body instance color가 활성화된다.

### High — 첫 wave 일괄 스폰

`Enemies.jsx:1011-1055, 1175-1200`은 t=0 wave를 scalar 예약 후 다음 RAF에서 하나의 batch로 `addEnemies`한다. `Enemies.jsx:428-430`에도 intra-wave stagger가 없다고 명시되어 있다.

| 스테이지 | t=0 구조적 수량 | 근거 |
| --- | ---: | --- |
| Stage 1 | 14 | target 24 → 절반 → ×1.15, `Enemies.jsx:438-460`; `waveTimelines.js:9-11` |
| Stage 2 | 27 | target 18 → 절반 9 → opening ×3, `Enemies.jsx:443-460`; `waveTimelines.js:38-40` |
| Stage 3 | 20 | target 20 → 절반 10 → opening ×2, `Enemies.jsx:443-460`; `waveTimelines.js:62-65` |
| Stage 4 | 9 | target 18 → 절반, `Enemies.jsx:438-460`; `waveTimelines.js:98-101` |

Stage 2~4의 실제 final 수량에는 `STAGE_DENSITY_MULTIPLIER`가 추가 적용된다. 표의 Stage 2~4 값은 density multiplier 이전 구조적 수량이다. Stage 2의 opening 27+는 처음 300 ms 연기 중이라도 JS 스폰·인스턴스 matrix 갱신·첫 시각 draw가 짧은 구간에 몰릴 수 있다.

### High — Stage 1 정적 프롭 React/GL mount

StageObjectLayer는 모든 배치를 즉시 React map으로 마운트한다(`StageObjectLayer.jsx:44-69`). StageObjectColliderLayer도 고정 RigidBody/CuboidCollider를 즉시 마운트한다(`StageObjectColliderLayer.jsx:6-33`). 정확한 Stage 1 placement는 **60개(책상 18, 의자 12, 학생 30)**다.

코드 구조상 정적 mesh node 추정:

- StudentBox 20개 × body/outline 2 mesh × 학생 30 = **1,200 mesh node** (`UnconsciousStudent.jsx:39-58, 82-105`)
- DeskBox 13개 × 2 mesh × 책상 18 = **468 mesh node** (`ClassroomDesk.jsx:25-45, 60-77`)
- ChairBox 19개 × 2 mesh × 의자 12 = **456 mesh node** (`ClassroomChair.jsx:25-44, 59-88`)
- 합계 약 **2,124 mesh node**

각 프롭 인스턴스가 `useMemo(toonMat/outlineMat)`로 만드는 material object의 정적 추정은 학생 8×30 + 책상 6×18 + 의자 6×12 = 약 **420개**다. 이는 코드 구조의 mount/GL resource 추정이지, visible draw call이나 실제 GPU 메모리와 동일하다고 단정할 수 없다. 진입 CPU/GL resource 위험은 High로 분류한다.

### Medium — 텍스처 loader와 cleanup/prewarm

`ClassroomFloor.jsx:108-143`은 `new THREE.TextureLoader().load()`를 사용한다. floor texture와 primitive material은 stage mount에 새로 만들며 explicit preload/cache가 없다. 특히 stageId와 무관하게 `ClassroomFloor.jsx:136`에서 Stage 2 end-wall texture를 생성한다. manual TextureLoader와 primitive material/texture cleanup도 충분하지 않다.

three.js의 `Cache.enabled` 기본값은 false다(`node_modules/three/src/loaders/Cache.js:3`). 브라우저 HTTP cache가 다운로드를 완화할 수는 있어도, image decode/GPU upload와 새 Texture 생성이 피할 수 있다고 단정할 수 없다.

### Medium — 풀링되지 않은 VFX

VFXLayer는 MAX_ACTIVE=80 상한과 microtask batching은 갖지만, 이벤트별 React mount/geometry/material 생성 방식이다(`VFXLayer.jsx:14-34, 161-209`). 시작 시 이벤트가 없으므로 직접적인 초기 mount 주원인은 아니지만 첫 전투 wave와 겹치면 hitch 후보가 된다.

### Low — special boss와 첫 보스 텍스처

special React/Rapier 적은 최대 3체 제한(`Enemies.jsx:735-744, 920-941`)이라 일반적인 시작 부하의 주원인은 아니다. 다만 boss face texture는 보스 spawn 시 `useLoader`로 로드되고 사전 preload가 없다(`ZombieMesh.jsx:340-351, 407-418, 479-505`).

## 타이틀 캐시와 Game Canvas의 구분

타이틀은 B01/B02/B03 및 Matilda 모델을 렌더한다(`TitleScene3D.jsx:300-320, 603-611`). 따라서 이들의 이미지 네트워크 요청과 CPU image decode는 타이틀 단계에서 이미 브라우저 캐시에 있을 가능성이 있다. 그러나 새 Game Canvas/WebGL context의 GPU texture upload 및 shader program state는 타이틀 Canvas와 공유되지 않는다. B04는 타이틀에 없으므로 Stage 4 보스 첫 등장은 별도 decode/upload/compile 위험으로 남는다.

## 계측 현황·한계

`r3f-perf`, `stats.js`, `PerformanceObserver`, `performance.mark/measure`, `renderer.info` 기반 계측은 코드/패키지에서 확인되지 않았다. 실제 frame ms, cold/warm load 차이, visible draw calls, GPU memory, texture decode/GPU upload 시점은 브라우저와 실기기 계측 전 확정할 수 없다.

## 권고 우선순위 (감사 제안만, 미구현)

1. **P0**: 로비 idle에 GameCanvas chunk·stage floor/smoke/boss texture preload 및 offscreen/hidden renderer shader warmup을 넣어 첫 입장 cost를 loading 단계로 이동한다.
2. **P1**: Physics key reset과 Canvas/GPU visual pools를 분리하거나 stage transition loading frame에 생성 작업을 분산한다.
3. **P2**: t=0 wave 및 대형 burst를 2~4명/frame budget으로 drain한다.
4. **P3**: Stage 1 프롭의 geometry/material 공유 및 InstancedMesh 전환을 계측 근거로 검토한다. collider 수/비용도 함께 측정한다.
5. **P4**: frame time, `renderer.info.render.calls`, geometry/texture count, active entities/projectiles, queue drops, Rapier body 수를 HUD 또는 profiling 도구로 기록하고 iPhone SE/저사양 Android의 cold/warm Stage 1~4를 비교한다.

## 실행한 읽기 감사와 미실시 항목

실행: `rg --files`, `rg -n`, `nl -ba`, placement count용 `node --input-type=module`, asset byte size용 `find/awk`, package/three Cache 확인.

미실시: 코드 변경, Firebase 접근/변경, 브라우저 실행, 실기기 실행, build, benchmark, commit, push.
