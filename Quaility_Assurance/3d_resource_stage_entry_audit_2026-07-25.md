# 3D 리소스·스테이지 진입 QA 감사 — 2026-07-25

## QA 판정

**부분 양호.** 전투 도중의 200 적 슬롯, 32 적 투사체 슬롯, 28 피해 숫자 슬롯은 고정 풀로 안정화되어 있다. 하지만 스테이지 cold entry와 stage transition은 Canvas/Physics 재마운트, GPU 시각 풀 생성, 정적 프롭 mount, 텍스처/셰이더 예열 부족이 겹친다. 실제 성능 수치는 아직 계측하지 않았으므로 통과 판정은 불가하다.

## 확인된 안정화 항목

- enemy pool: 200 fixed slots, typed array와 generation protection (`src/lib/enemyEntityPool.js:60-116`). 데이터 typed array 정적 합계 **25,400 B**.
- enemy projectile pool: 32 fixed slots (`src/lib/enemyProjectilePool.js:13-31`). typed array 정적 합계 **1,024 B**.
- enemy hit queue: 256 fixed event slots (`src/lib/enemyHitEventQueue.js:1-39`). typed array 정적 합계 **4,352 B**.
- enemy simulation은 fixed spatial grid와 neighbor cap 24을 사용한다 (`src/lib/enemySimulation.js:92-146, 608-639`).
- pooled visual renderer는 200 capacity의 InstancedMesh와 DynamicDrawUsage를 사용한다 (`src/components/ZombieInstanceLayer.jsx:72-76, 102-125`).
- pooled projectile renderer도 32 capacity InstancedMesh다 (`src/components/PooledEnemyProjectileLayer.jsx:13-39`).
- damage number pool은 28개의 canvas texture/mesh를 재활용한다 (`src/components/DamageNumbersLayer.jsx:21-86`).

## 스테이지 진입 QA 위험

| 심각도 | 근거 | 검증 결론 |
| --- | --- | --- |
| High | GameCanvas는 입장 클릭 시 lazy load되며 (`ReadyGameApp.jsx:13-17,150-161`), gameKey 변경은 `<Physics key>` 전체 재마운트다 (`GameCanvas.jsx:17`, `useGameStore.js:619-653`). | 논리 풀은 재사용하지만 GPU 시각 풀은 매 stage mount에 새로 생성. first-entry/transition spike 위험. |
| High | t=0 wave는 하나의 batch, intra-wave stagger 없음 (`Enemies.jsx:428-430,1011-1055,1175-1200`). | Stage 1 14, Stage 2 구조적 27, Stage 3 구조적 20, Stage 4 구조적 9. Stage 2~4는 final 수량에 density multiplier가 추가된다. |
| High | Stage 1 placement 60개: desk18/chair12/student30. | 정적 코드상 StudentBox/DeskBox/ChairBox의 body+outline mesh node가 약 2,124개, material object가 약 420개 생성될 수 있다. visible draw call/실제 GPU memory와 같다고 단정하지 않는다. |
| Medium | ClassroomFloor가 direct `new TextureLoader().load()`를 사용하고 Stage 2 end-wall texture를 stageId와 무관하게 생성한다 (`ClassroomFloor.jsx:108-143`). | 명시 preload/cache 및 cleanup이 미흡. three `Cache.enabled` 기본 false. |
| Medium | VFXLayer는 상한 80과 batch는 있으나 이벤트마다 React mount 방식이다 (`VFXLayer.jsx:161-209`). | 첫 전투 wave와 겹칠 때 hitch 후보. |
| Low | B01/B02/B03/Matilda의 title image decode는 이미 캐시되어 있을 가능성이 있다. B04는 title에 없다. | Game Canvas의 GPU upload/shader state는 별도이므로 첫 boss에 runtime 확인 필요. |

## ZombieInstanceLayer 정적 버퍼 추정

33 parts의 body+outline, 6 planes, 12 cue meshes, capacity 200을 기준으로 matrix buffer 약 **933,888 B (912 KiB)**, alpha attribute **4,800 B**다. all instance color까지 생성되면 총 buffer 약 **1,020,192 B (996.28 KiB)**다. geometry/material/texture/shader program/driver memory는 제외한 추정이며, 현 코드에서는 stage mount 시 만들어진다.

## 미실시 계측과 release gate

다음 진단은 아직 없다: r3f-perf, stats.js, PerformanceObserver, performance mark/measure, `renderer.info`, pool usage/queue drop/Rapier body HUD. 따라서 실제 ms, visible draw calls, GPU memory, image decode 및 shader compile 시점은 확정하지 못했다.

릴리스/성능 통과 전에 다음을 실행한다.

1. cold/warm Stage 1~4 진입의 frame time과 long task를 기록한다.
2. `renderer.info.render.calls`, geometry, texture count와 Rapier body 수를 기록한다.
3. iPhone SE급 및 저사양 Android에서 첫 입장, 재시작, Stage 1→2 전환을 비교한다.
4. Stage 2 opening wave와 첫 B04 등장에서 frame drop/pool drop/GC spike를 확인한다.

## 감사 범위

읽기 전용 정적 감사만 수행했다. 코드 변경, Firebase 변경, build, 브라우저/실기기 실행, benchmark, commit, push는 하지 않았다. 권고 P0~P4(사전 preload/warmup, visual pool 유지·분산, wave budget, prop instancing, instrumentation)는 구현 항목이 아니라 후속 QA 우선순위다.
