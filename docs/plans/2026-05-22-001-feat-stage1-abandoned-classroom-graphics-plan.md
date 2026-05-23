---
title: "Stage 1 graphics — abandoned classroom (floor + props + atmosphere)"
type: feat
status: active
date: 2026-05-22
origin: docs/brainstorms/2026-05-20-stage-graphic-redesign-requirements.md
---

# Stage 1 graphics — abandoned classroom (floor + props + atmosphere)

## Summary

회색 콘크리트 + 격자선의 `Floor.jsx`를 Survival Horror 32 마루 팔레트의 procedural plank 텍스처로 교체하고, 외곽 6-12 블록 링에 6종 props(책상 잔해·의자 더미·사물함·안전 콘·바리케이드·경고 테이프)와 3종 분위기 overlay(시험지·환경 오염 웅덩이·창문 그림자)를 정적으로 배치해 1스테이지 "버려진 교실" 화면 정체성을 완성한다.

---

## Problem Frame

현재 `Developer/r3f_prototype/src/components/Floor.jsx`는 회색 단색 평면 + 격자선만으로 구성되어 첫 30초 인상이 "미완성 프로토타입"으로 읽힌다. `Graphic_designer/Concept_Rules/color_palette_guide.md`는 이미 마루 팔레트를 정본화했고 `current_visual_rules.md`는 toon + outlined hull 패턴을 못 박았지만, 현재 코드는 두 가이드 모두에 어긋난 상태다. 본 plan은 origin brainstorm의 Approach A "정본 충실"을 R3F 단일 스택에서 그대로 구현한다. (see origin: `docs/brainstorms/2026-05-20-stage-graphic-redesign-requirements.md`)

---

## Requirements

**바닥 (Floor)**
- R1. `Floor.jsx`의 바닥은 Survival Horror 32 마루 계열(`0xa99a73`/`0xc9cb9f`/`0x805947`/`0x623333`)을 procedural CanvasTexture로 적용한다. (see origin: R1)
- R2. 마루 판자 패턴은 시각적으로 인식되는 이음새를 가지며, 4 unit 타일 안에서 자연스럽게 분할된다. (see origin: R2)
- R3. 기존 `<lineSegments>` 격자 오버레이는 완전히 제거. 판자 이음새가 시각 그리드 역할을 대신한다. (see origin: R3)
- R4. 바닥 단일 평면 + 4개 boundary 충돌체 구조는 유지. props는 별도 컴포넌트. (see origin: R4)

**외곽 장식 props**
- R5. 6종 props가 외곽 6-12 블록 링에 배치: `fallen_desk` · `chair_pile` · `contaminated_locker` · `safety_cone` · `barricade_small` · `warning_tape`. (see origin: R5)
- R6. props는 충돌체 보유(책상·사물함·바리케이드·콘·의자 더미)와 장식 전용(경고 테이프) 두 분류. `stage_graphic_cons.md` §4 정책 준수(완전 막힘 금지, 이동 방해 ≤15%, 중앙 4 블록 반경 비움). (see origin: R6)
- R7. props는 `toon.js`의 `toonMat` + `outlineMat`로 카툰 렌더링. 외곽선 색은 기본(`0x050209`). (see origin: R7)

**분위기 overlay**
- R8. 3종 overlay 정적 배치: `exam_paper` · `pollution_puddle_static` · `window_shadow_broken`. (see origin: R8)
- R9. overlay는 충돌 없음. `outlineMat(opacity=0.5, color=0x3a2a2a)` — opacity 낮춤 + 색 부드러움 두 축으로 props보다 시각적으로 약함. (see origin: R9)
- R10. 환경 오염 웅덩이는 `0x41745a` 어두운 채도 채움 + `0x95bf91` 테두리(`color_palette_guide.md` §2-4 정적 오염). 보스 동적 장판은 더 선명한 위험 톤으로 명확히 구분 (Phase 0.5 결정: 채도·명도 차원). (see origin: R10)

**모바일 가독성·성능**
- R11. 9:16 모바일(390×844 / 375×812)에서 플레이어·적·드랍이 props·overlay에 묻히지 않는다. (see origin: R11)
- R12. 4분 이후 적 30+ 상황에서 그래픽 추가로 인한 측정 가능한 프레임 저하 없음. (see origin: R12)

**5분 세션 정합성**
- R13. 5분 세션 중 무대 그래픽은 정적이다. (see origin: R13)

**Origin acceptance examples:** AE1 (외곽 props 사이 회피 경로), AE2 (환경 오염 vs 보스 장판 구분), AE3 (3-4분 적 ~30마리 + 투사체 동시 가독성), AE4 (0:00 vs 4:59 무대 정적). 모두 본 plan의 IU 테스트 시나리오로 매핑.

---

## Scope Boundaries

- 운동장 모티프(트랙 라인·콘크리트·본관 실루엣)는 본 plan 밖. (origin scope)
- 시간 진행에 따른 분위기 변화는 본 plan 밖. (origin scope, Approach C 미선택)
- 보스·엘리트 VFX 신규 또는 보강은 본 plan 밖. (origin scope)
- 캐릭터·적·무기 시각 변경은 본 plan 밖. (origin scope)
- 실시간 그림자·정교한 라이팅 변경은 본 plan 밖. 기존 `MeshToonMaterial` + 고정 그림자 정책 유지. (origin scope)
- HUD·UI 시각 변경은 본 plan 밖. (origin scope)

### Deferred to Follow-Up Work

- `<Stats />` overlay 추가(`@react-three/drei`) — R12 성능 측정용 디버그 도구. 본 plan은 수동 검증으로 진행하고, 측정 필요 시 별 PR.
- 2스테이지 무대 톤 변형 — 본 plan 인프라(`StageProps` + `stagePropsLayout`)를 재사용해 별 plan에서 추가.

---

## Context & Research

### Relevant Code and Patterns

- `Developer/r3f_prototype/src/components/Floor.jsx` — 현재 회색 단색 + 격자선. R1-R4 교체 대상.
- `Developer/r3f_prototype/src/components/XpTextbook.jsx` — 가장 깔끔한 multi-mesh + toonMat + outlineMat 템플릿. props 6종이 mirror할 패턴.
- `Developer/r3f_prototype/src/components/LunchItems.jsx` — 정적 배치 + 그룹 렌더의 가장 가까운 템플릿. `StageProps.jsx`가 spawn timer 없이 mirror.
- `Developer/r3f_prototype/src/lib/toon.js` — `toonMat(hex, ei)`, `outlineMat(opacity)`, `inflateScale(s)`. **outline 색이 `0x050209` 하드코딩**, U1에서 color 파라미터 추가.
- `Developer/r3f_prototype/src/components/Game.jsx` — 마운트 순서(`<Floor />` → `<LunchItems />` → `<Player />` → weapons → `<VFXLayer />` → `<Enemies />`). `<StageProps />`는 `<Floor />` 바로 뒤.
- `Developer/r3f_prototype/src/lib/refs.js` — 정적 props는 cross-frame state 없으므로 추가하지 않음.

### Institutional Learnings

`docs/solutions/`에 R3F 렌더링/시각 패턴 관련 적립 학습 없음. 본 plan이 첫 rendering-domain 적립 기회 — 완료 후 `/ce-compound`로 (a) 정적 prop 컴포넌트 아키텍처, (b) outlineMat 확장 패턴, (c) procedural CanvasTexture 패턴 적립 권장.

### External References

외부 리서치 미수행. R3F + toon 패턴이 repo에 명확하고 third-party 도입 없음.

---

## Key Technical Decisions

- **마루 패턴: procedural CanvasTexture** (vs shader onBeforeCompile vs mesh grid). 단일 plane mesh 유지, JS에서 1024×1024 canvas에 plank 패턴 그려 `THREE.CanvasTexture`로 `.map` 적용. 텍스처 자산 파일 없이 코드만으로 완결되어 repo의 procedural 컨벤션과 정합. shader 패치는 복잡도 높고 mesh grid는 mesh 수 증가.
- **분위기 outline 차원: opacity 낮춤 + 색 부드러움 둘 다**. U1에서 `outlineMat(opacity=0.5, color=0x3a2a2a)`로 두 축 동시 적용. 단일 축만 사용하면 차이가 약함. 펄스 애니메이션은 도입하지 않음 (Phase 0.5 결정).
- **환경 오염 vs 보스 장판: 채도·명도만**. `color_palette_guide.md` §2-4 정본 그대로 환경 오염은 `0x41745a`/`0x95bf91`, 보스 장판은 기존 선명한 위험 톤 유지. 외곽선 굵기·펄스 차이 미사용.
- **props 외곽 6-12 블록 링 배치**. 적 스폰 링(2.1-3.1 블록) 밖이며 9:16 카메라 가시 범위(±3.25 블록 가로) 자연 오프스크린이라 R11 가독성 자동 충족. Bang_Rules §4.
- **충돌 정책 강제는 pure-function 테스트로**. R6 ≤15% + 중앙 비움을 `stagePropsLayout.js` 데이터에 대한 vitest로 검사. R3F 라이브 라이드 검사는 도입하지 않음.
- **시각 컴포넌트는 수동 검증, layout 데이터는 자동 검증**. 기존 repo 패턴 따름 — `PlayerMesh`/`ZombieMesh`/`GoldCoin`/`XpTextbook`/`LunchItems` 모두 render test 없음.
- **InstancedMesh 미사용**. 피크 draw call 추정 500-700, props +~200으로 안전. 도입은 향후 성능 측정 후.
- **AGENTS.md §41 준수**: `Graphic_designer/Environment_Props/stage1_abandoned_classroom_layout_2026-05-22.md` 컴패니언 디자인 노트가 U7 산출물.

---

## Open Questions

### Resolved During Planning

- **환경 오염 vs 보스 장판 시각 구분 차원 (origin R10)**: 채도·명도. 외곽선 굵기·펄스 미사용. (Phase 0.5 사용자 결정)
- **마루 판자 구현 방식**: procedural CanvasTexture. (Phase 5.1.5)
- **분위기 outline 차원**: opacity + 색 둘 다. (Phase 5.1.5)
- **R6 충돌 정책 측정 방식**: layout 데이터 pure-function 테스트.
- **prop 컴포넌트 패턴**: `XpTextbook.jsx` 형태 mirror (multi-mesh group + 각 메시별 toonMat + outlineMat 페어).
- **마운트 위치**: `Game.jsx`에서 `<Floor />`와 `<LunchItems />` 사이.

### Deferred to Implementation

- 6종 props의 정확한 메시 구성·크기·각 부위 색 조합 — `XpTextbook.jsx` 패턴 따르되 시각 검증 후 미세 조정.
- procedural CanvasTexture의 plank 폭·이음새 굵기·노이즈 양 — 1차 구현 후 모바일 9:16에서 가독성 보며 튜닝.
- 12-16 props의 정확한 좌표 — outer ring 분포 안에서 디자인 의도에 따라 배치, layout 테스트 통과가 정답.
- atmosphere overlay의 z-fight 방지 — 바닥보다 0.01-0.02 위 띄움, 정확한 값은 구현 시 시각 검증.
- props의 receiveShadow on/off — 시각 검증 후 결정.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌─ src/lib/toon.js ─────────────────────────────────────────────────┐
│  outlineMat(opacity=0.96, color=0x050209)  ← color 파라미터 추가  │
│  toonMat(hex, ei) · inflateScale(s) — 변경 없음                  │
└────────────────────────────────────────────────────────────────────┘
                ↓ 사용                       ↓ 사용
┌─ src/components/Floor.jsx ──────┐  ┌─ src/components/Props/* ─────────┐
│  CanvasTexture 생성:             │  │  FallenDesk · ChairPile ·         │
│   plank 폭=0.5u, 이음새=0.04u    │  │  ContaminatedLocker ·             │
│   색 4종 brick-row 배열          │  │  SafetyCone · BarricadeSmall ·    │
│  ─                               │  │  WarningTape                       │
│  단일 plane mesh + .map = canvas │  │  ─                                 │
│  격자 lineSegments 제거          │  │  XpTextbook 패턴 (multi-mesh +     │
│  boundary walls 4개 유지         │  │   per-mesh outlineMat 페어)        │
└──────────────────────────────────┘  │  collides:true는 RigidBody fixed   │
                                       │   + invisible collider box         │
                                       └────────────────────────────────────┘
                                                    ↑
                                       ┌─ src/components/Atmosphere/* ─────┐
                                       │  ExamPaper · PollutionPuddleStatic │
                                       │   · WindowShadowBroken             │
                                       │  outlineMat(0.5, 0x3a2a2a) 사용    │
                                       │  RigidBody 없음                    │
                                       │  PollutionPuddle 색:               │
                                       │   채움 0x41745a / 테두리 0x95bf91  │
                                       └────────────────────────────────────┘
                                                    ↑
┌─ src/lib/stagePropsLayout.js (pure data) ────────────────────────┐
│  PROP_LAYOUT = [                                                   │
│   { kind:'fallen_desk', pos:[-9, 0, -8], rot:0.3, collides:true } │
│   { kind:'exam_paper', pos:[-7, 0.01, -5], scale:0.5,             │
│     collides:false }                                               │
│   … 12-16 entries, outer ring 6-12 block radius                   │
│  ]                                                                 │
│  enforceCollisionPolicy(layout) — pure helper for tests           │
└────────────────────────────────────────────────────────────────────┘
                ↓ 읽음
┌─ src/components/StageProps.jsx ──────────────────────────────────┐
│  PROP_LAYOUT.map(p => <PropComponentByKind {…p} />)               │
│  Game.jsx에서 <Floor /> 바로 뒤 마운트                            │
└────────────────────────────────────────────────────────────────────┘
```

**CanvasTexture plank 생성 흐름:**

```
new HTMLCanvasElement(1024,1024) → ctx
for row in 0..rows:
  rowColor = (row % 2 === 0) ? 0xa99a73 : 0xc9cb9f
  for plank in row:
    fillRect(plankColor, slight darkening at row ends)
    strokeRect(0x623333, width=2px)  // seam
draw subtle noise for wood grain (Math.random alpha 0.05)
new THREE.CanvasTexture(canvas)
  .wrapS = .wrapT = RepeatWrapping
  .repeat.set(MAP_SIZE/2, MAP_SIZE/2)  // 12×12 tile mapping over 96-unit plane
```

---

## Implementation Units

### U1. `outlineMat` color parameter

**Goal:** `toon.js`의 `outlineMat()`이 optional color 파라미터를 받게 확장. 분위기 overlay가 부드러운 외곽선을 쓸 수 있는 기반.

**Requirements:** R9

**Dependencies:** None

**Files:**
- Modify: `Developer/r3f_prototype/src/lib/toon.js`

**Approach:**
- `outlineMat(opacity=0.96)` → `outlineMat(opacity=0.96, color=0x050209)` 시그니처 확장.
- 기본 색을 현재 하드코딩 값(`0x050209`)으로 유지 → 모든 기존 호출 (`PlayerMesh`, `ZombieMesh`, `XpTextbook` 등) backward compatible.
- 다른 변경 없음. `toonMat`/`inflateScale` 손대지 않음.

**Patterns to follow:**
- 같은 파일의 `toonMat(hex, emissiveIntensity=0.08)`이 동일한 default-param 패턴.

**Test scenarios:**
- Test expectation: none — pure default-parameter extension, behavior identical for existing call sites. 시각 검증은 U5에서 새 색이 실제로 적용되는지 확인.

**Verification:**
- 기존 `npm test` 통과 (회귀 없음).
- 기존 캐릭터 외곽선이 시각적으로 동일.

---

### U2. Floor: procedural plank texture + grid removal

**Goal:** `Floor.jsx`의 회색 평면 + 격자선을 마루 팔레트 procedural CanvasTexture로 교체.

**Requirements:** R1, R2, R3, R4

**Dependencies:** None

**Files:**
- Modify: `Developer/r3f_prototype/src/components/Floor.jsx`

**Approach:**
- `useMemo`로 `HTMLCanvasElement` 생성, ctx에 plank 패턴 그려서 `THREE.CanvasTexture` 만듦.
- plank 폭 = 0.5 world units, 이음새 0.04 units. 게임의 TILE_SIZE(4 unit) 안에 8 plank.
- 4색 팔레트: `0xa99a73`(주색) base, `0xc9cb9f`(밝은) 교차 row, `0x805947`(어두운) accent, `0x623333` 이음새.
- `MeshLambertMaterial`에 `.map = canvasTexture`, `RepeatWrapping`, `repeat.set(12, 12)` — 96 unit plane을 12회 반복 = **텍스처 1회 반복당 8 world unit 폭**, 그 안에 plank 16줄(`rows=16`). Technical Design 섹션과 같이 보면 일관.
- 기존 `gridLines`/`lineMat`/`<lineSegments>` 블록 완전 제거.
- 기존 4개 boundary walls는 그대로.

**Technical design:** *(directional)*

```
canvasTexture():
  canvas 1024×1024
  rows = 16 (=> plank 굵기 64px at canvas, 0.5u in world via repeat=12)
  for row in 0..16:
    base = (row % 2) ? lightCream : warmTan
    for x in 0..16 along row:
      randomShade = base ± small variation
      fillRect, strokeStyle = seamBrown, lineWidth=2
  return CanvasTexture
```

**Patterns to follow:**
- 현재 `Floor.jsx`의 `useMemo` 패턴 유지.
- 단일 mesh + 보이지 않는 boundary 4개 구조.

**Test scenarios:**
- Test expectation: none — 시각적 변경. 회귀는 기존 `useGameStore.test.js` 등 비-Floor 테스트가 그린 유지로 검증.

**Verification:**
- dev 서버에서 9:16 모바일 frame(390×844)으로 첫 화면이 "교실 마루"로 읽힌다.
- 격자선이 보이지 않는다.
- 플레이어가 맵 외곽까지 이동했을 때 boundary 충돌이 기존과 동일.
- `npm test` 그린.

---

### U3. `stagePropsLayout.js` + tests

**Goal:** props 배치 좌표·종류·충돌 여부의 단일 진실. layout 정책(R6) 자동 검증.

**Requirements:** R5, R6, AE1

**Dependencies:** None

**Files:**
- Create: `Developer/r3f_prototype/src/lib/stagePropsLayout.js`
- Create: `Developer/r3f_prototype/src/lib/stagePropsLayout.test.js`

**Approach:**
- `PROP_LAYOUT`은 12-16개 entry 배열. 각 entry `{ kind, pos:[x,y,z], rot, scale, collides }`.
- `KIND_COLLIDES` map — 각 kind의 기본 충돌 여부 (FallenDesk·ChairPile·ContaminatedLocker·SafetyCone·BarricadeSmall=true, WarningTape=false). entry의 `collides`는 override 가능.
- `KIND_FOOTPRINT` map — 각 kind의 충돌체 대략적 footprint(`{w, d}`) 추정치. R6 ≤15% 검사용.
- pure helper exports:
  - `getCentralEmpty(layout, radius=4*4)` — 중앙 radius 안 prop 없음을 검사.
  - `getBlockerAreaRatio(layout)` — 충돌 props footprint 합 / 맵 전체 면적.
  - `getOuterRingProps(layout)` — outer 6-12 블록 링에 있는 prop들.
- 좌표는 outer 6-12 블록 링(±24-±48 units, x/z 한 축이 절댓값 24 초과) 안에 배치.

**Patterns to follow:**
- `Developer/r3f_prototype/src/lib/passiveCatalog.js` — 데이터 + 헬퍼 + 테스트의 깔끔한 패턴.

**Test scenarios:**
- Happy path: `getCentralEmpty(PROP_LAYOUT, 16)` → 중앙 ±16 unit 안 prop 0개.
- Happy path: `getBlockerAreaRatio(PROP_LAYOUT)` ≤ 0.15 (전체 맵 96² unit²의 15% 이하). **Covers AE1.**
- Happy path: 모든 entry의 `kind`가 `KIND_FOOTPRINT` map에 존재.
- Happy path: 모든 entry의 `pos`가 boundary(±48) 안.
- Edge case: 모든 entry의 `pos`가 outer 6-12 블록 링 안 (한 축 |coord| ≥ 24 AND |coord| ≤ 48).
- Edge case: `WarningTape` kind entry의 `collides`는 모두 `false`.
- Edge case: 정적 props 6종 모두 layout에 최소 1개 등장 (R5의 6종 완전 cover).

**Verification:**
- 7+ 시나리오 vitest 그린.

---

### U4. Prop components (6종)

**Goal:** R5의 6종 props를 R3F 카툰 컴포넌트로 구현. 충돌체는 collides:true에만.

**Requirements:** R5, R6, R7, R11

**Dependencies:** U1

**Files:**
- Create: `Developer/r3f_prototype/src/components/Props/FallenDesk.jsx`
- Create: `Developer/r3f_prototype/src/components/Props/ChairPile.jsx`
- Create: `Developer/r3f_prototype/src/components/Props/ContaminatedLocker.jsx`
- Create: `Developer/r3f_prototype/src/components/Props/SafetyCone.jsx`
- Create: `Developer/r3f_prototype/src/components/Props/BarricadeSmall.jsx`
- Create: `Developer/r3f_prototype/src/components/Props/WarningTape.jsx`
- Create: `Developer/r3f_prototype/src/components/Props/index.js` (barrel)

**Approach:**
- 각 컴포넌트는 `{ pos, rot, scale, collides }` props 받음.
- multi-mesh group: 책상은 다리 4개 + 상판; 사물함은 본체 + 문짝 + 손잡이 등.
- 각 부위마다 `toonMat(hex)` mesh + `outlineMat()` (기본 색) backside hull mesh 페어 (`XpTextbook.jsx` 패턴).
- 색은 Survival Horror 32 팔레트의 무채색·금속 계열 (정확한 hex는 구현 시 시각 검증으로 결정 — Open Questions Deferred).
- `collides=true`면 `<RigidBody type="fixed" position={pos}>` 안에 invisible `CuboidCollider` + 시각 group; `collides=false`면 RigidBody 없이 group만.
- `WarningTape`는 plane geometry + 줄무늬 패턴, 항상 `collides:false`.

**Patterns to follow:**
- `Developer/r3f_prototype/src/components/XpTextbook.jsx` (multi-mesh + outline 페어 템플릿).
- `Developer/r3f_prototype/src/components/Floor.jsx` (RigidBody fixed + invisible collider 패턴).
- `Developer/r3f_prototype/src/lib/toon.js` `toonMat`/`outlineMat`/`inflateScale` 헬퍼.

**Test scenarios:**
- Test expectation: 컴포넌트별 자동 테스트 없음 — 시각 컴포넌트는 repo 기존 패턴(`PlayerMesh`/`ZombieMesh`/`GoldCoin`/`XpTextbook`/`LunchItems`) 따라 수동 검증. layout 데이터 검증은 U3, 통합 검증은 U6.

**Verification:**
- 6개 컴포넌트 import 후 storybook 없이 dev 서버에서 외곽 영역에 props 표시.
- 충돌체 props 위로 플레이어가 통과 못 함 (`fallen_desk`, `contaminated_locker` 등).
- `warning_tape` 위로 플레이어 통과 가능.
- 외곽선이 카탑된 캐릭터와 동일한 시각 위계.
- `npm test` 회귀 없음.

---

### U5. Atmosphere overlay components (3종)

**Goal:** R8의 3종 분위기 overlay를 충돌 없는 R3F 컴포넌트로 구현. 외곽선은 부드러운 색·낮은 opacity.

**Requirements:** R8, R9, R10, AE2

**Dependencies:** U1

**Files:**
- Create: `Developer/r3f_prototype/src/components/Atmosphere/ExamPaper.jsx`
- Create: `Developer/r3f_prototype/src/components/Atmosphere/PollutionPuddleStatic.jsx`
- Create: `Developer/r3f_prototype/src/components/Atmosphere/WindowShadowBroken.jsx`
- Create: `Developer/r3f_prototype/src/components/Atmosphere/index.js` (barrel)

**Approach:**
- 모든 overlay는 `<RigidBody>` 없음.
- 위치는 바닥 평면(y=0)에서 +0.01-0.02 띄움 (z-fight 방지, 정확한 offset은 시각 검증).
- 외곽선은 `outlineMat(0.5, 0x3a2a2a)` — opacity·색 두 축 모두 부드럽게 (U1 확장 사용).
- `ExamPaper`: 작은 plane(시험지 한 장 모양), 흰색 + 빨간 줄.
- `PollutionPuddleStatic`: 둥근 plane, **채움 `0x41745a`** (어두운 채도) + 테두리 mesh `0x95bf91` (밝은 외곽). 보스 동적 장판과 채도·명도 차이로 명확히 구분 (R10).
- `WindowShadowBroken`: 깨진 창문 모양 plane, 어두운 회색 톤(`0x2d2738` 계열) 반투명 alpha 약 0.4.

**Patterns to follow:**
- `Developer/r3f_prototype/src/components/XpTextbook.jsx` (plane + outline 페어 단순 버전).
- `Developer/r3f_prototype/src/lib/toon.js` 확장된 `outlineMat`.

**Test scenarios:**
- Test expectation: 컴포넌트 자동 테스트 없음 — 시각 검증.
- U3 layout 테스트가 R8 모든 kind cover를 검사.

**Verification:**
- dev 서버에서 환경 오염 웅덩이가 보스 오염 장판과 시각적으로 명확히 구분된다(보스 등장 시 4분 구간에서 두 요소 동시 화면). **Covers AE2.**
- props 컴포넌트보다 시각적으로 약하다(R9 위계).
- 플레이어가 overlay 위로 자유롭게 이동 (충돌 없음).

---

### U6. `StageProps.jsx` orchestrator + `Game.jsx` mount

**Goal:** layout 데이터를 읽어 kind별 컴포넌트로 렌더링, `Game.jsx`에 마운트.

**Requirements:** R5, R8, AE1, AE3, AE4

**Dependencies:** U3, U4, U5

**Files:**
- Create: `Developer/r3f_prototype/src/components/StageProps.jsx`
- Modify: `Developer/r3f_prototype/src/components/Game.jsx`

**Approach:**
- `StageProps`는 `PROP_LAYOUT`을 `.map`해서 entry의 `kind`에 따라 props 또는 atmosphere 컴포넌트를 렌더.
- kind → component 매핑 객체로 dispatch.
- `Game.jsx`에서 `<Floor />` 바로 뒤, `<LunchItems />` 앞에 `<StageProps />` 마운트.
- 다른 변경 없음 (lighting·player·weapons·enemies 등).

**Patterns to follow:**
- `Developer/r3f_prototype/src/components/LunchItems.jsx` (정적 배치 + 그룹 렌더).
- `Developer/r3f_prototype/src/components/Game.jsx`의 마운트 순서.

**Test scenarios:**
- Test expectation: 통합 검증은 수동 dev 서버 + U3 layout 테스트로 cover. `Game.jsx` 변경은 한 줄 마운트라 자동 회귀 안 함.

**Verification:**
- dev 서버에서 12-16 props·atmosphere가 외곽에 표시. **Covers AE1.**
- 3-4분 구간 적 ~30마리 + 투사체 동시 표시 시 플레이어 silhouette과 적 5종이 모두 구분 가능. **Covers AE3.**
- 0:00 게임 시작과 4:59 종료 직전 화면의 무대 그래픽(바닥·props·overlay)이 동일. **Covers AE4.**
- 모바일 9:16(390×844)에서 prop이 플레이어를 가리지 않음. **Covers R11.**

---

### U7. Companion design doc

**Goal:** AGENTS.md §41 준수 — 그래픽 작업의 결과를 `Graphic_designer/` 폴더에 기록.

**Requirements:** None (project policy)

**Dependencies:** U2-U6 (구현 완료 후 결과 기록)

**Files:**
- Create: `Graphic_designer/Environment_Props/stage1_abandoned_classroom_layout_2026-05-22.md`

**Approach:**
- 본 plan의 핵심 결정·구현 결과를 시각 자산 관점에서 요약.
- 12-16 props의 종류·위치·색·외곽선 차원 명시.
- 컬러 팔레트 가이드 참조 + 본 작업이 가이드 §2-1·§2-4를 어떻게 적용했는지.
- 향후 2스테이지 무대 톤 변형이 재사용할 인프라(`StageProps` + `stagePropsLayout`) 안내.
- 운동장 모티프와 시간 변화 무대는 본 작업 밖이라는 scope 메모.

**Test scenarios:**
- Test expectation: none — 문서.

**Verification:**
- 마크다운 렌더링 정상.
- `Graphic_designer/Environment_Props/` 폴더 안에 위치.
- `Graphic_designer/Concept_Rules/current_visual_rules.md`와 충돌 없음.

---

## System-Wide Impact

- **Interaction graph**: `Game.jsx`가 `<StageProps />`를 마운트 → `StageProps`가 `PROP_LAYOUT`을 읽어 6 props + 3 atmosphere 컴포넌트 렌더 → 충돌 prop은 Physics tree의 fixed RigidBody로 진입.
- **State lifecycle**: 정적 무대. `gameKey` reset 시 `<Physics>` 재마운트로 props도 함께 재생성 — 동일 layout, 추가 상태 없음.
- **API surface parity**: `outlineMat` 시그니처 확장(U1)은 backward compatible. 기존 호출 점(`PlayerMesh`, `ZombieMesh`, `XpTextbook`, weapon meshes) 모두 default color로 동작.
- **Integration coverage**: AE1·AE3·AE4가 unit test 단독으로 입증 안 됨 — dev 서버 수동 검증이 정답. U3가 AE1 입증을 layout pure-function 테스트로 보조.
- **Unchanged invariants**: 5분 세션, 9:16 모바일, 카툰 렌더링, gameKey ratchet, boundary walls, 적 spawn 링, 충돌 정책. 본 plan이 위 어느 것도 바꾸지 않음.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CanvasTexture 렌더링 비용이 모바일에서 측정 가능한 fps 저하를 일으킴 | 1024×1024 single texture는 일반적으로 안전. 측정 필요 시 `<Stats />` overlay(Deferred to Follow-Up) 추가하여 확인. 임계 fps 저하 시 텍스처 크기 512로 축소. |
| props 12-16개 + 각 multi-mesh + outline 페어로 mesh 수가 ~200 추가됨 | 피크 draw call 추정 500-700 + ~200 = ~700-900. R3F + WebGL의 일반적 안전 범위. InstancedMesh 도입은 향후 측정 후 별 PR. |
| 환경 오염 웅덩이가 보스 장판과 색 톤 차이만으로 구분 어려움 (모바일 작은 화면) | 채도 차이(`0x41745a` 어두움 vs 보스 선명 위험톤)에 더해 보스 장판은 동적 spawn/timer + 펄스(기존 VFX 정책), 환경 오염은 정적. 동작 차이가 자연스러운 추가 구분. 측정 후 부족하면 별 plan에서 보스 장판 외곽선 강화. |
| props가 적 추격·돌진 경로와 시각적으로 겹쳐 위험 신호(E05 돌진 예고선)를 가림 | outer 6-12 블록 링 배치라 중앙 회피 공간은 비어 있음. E05 돌진은 중앙부에서 주로 발생. 그래도 외곽에서 발생 시 예고선이 prop 위로 렌더 순서가 보장되어야 함 — 시각 검증 시 z-order 확인. |
| outlineMat 시그니처 확장이 회귀 일으킴 | default 파라미터로 기존 모든 호출 동일 동작. `npm test`로 회귀 검증. |
| AGENTS.md §41 컴패니언 doc(U7) 작성 누락 | U7을 별 IU로 분리해 코드 PR과 함께 lands. 빠짐 시 review에서 차단. |

---

## Documentation / Operational Notes

- 본 plan 완료 후 `/ce-compound`로 (a) 정적 prop 컴포넌트 아키텍처 패턴, (b) `outlineMat` color/opacity 확장으로 시각 위계 만드는 패턴, (c) procedural CanvasTexture 패턴 적립 권장. `docs/solutions/`에 R3F rendering-domain 첫 학습들이 됨.
- `Graphic_designer/Concept_Rules/current_visual_rules.md`의 §2 "현재 준수 확인" 섹션은 본 plan 완료 후 갱신 — 회색 콘크리트 / 격자 항목 제거.
- `Graphic_designer/Environment_Props/prop_removal_floor_only.md`는 historical Phaser proto 기준이므로 본 plan과 충돌 없음. R3F 환경에서 props 첫 도입을 명시하는 별 노트는 U7이 담당.
- `Planner/Index/planner_documents_by_field_2026-05-14.md`에 본 plan과 U7 doc 추가 권장 (별 PR).

---

## Sources & References

- **Origin document:** [`docs/brainstorms/2026-05-20-stage-graphic-redesign-requirements.md`](../brainstorms/2026-05-20-stage-graphic-redesign-requirements.md)
- **Visual rules:** [`Graphic_designer/Concept_Rules/current_visual_rules.md`](../../Graphic_designer/Concept_Rules/current_visual_rules.md)
- **Color palette:** [`Graphic_designer/Concept_Rules/color_palette_guide.md`](../../Graphic_designer/Concept_Rules/color_palette_guide.md)
- **Stage concept:** [`Graphic_designer/Concept_Rules/stage_graphic_cons.md`](../../Graphic_designer/Concept_Rules/stage_graphic_cons.md) (historical Phaser model; visual identity §3 + character/VFX §7-9 still authoritative)
- **Prop history:** [`Graphic_designer/Environment_Props/prop_removal_floor_only.md`](../../Graphic_designer/Environment_Props/prop_removal_floor_only.md), [`Graphic_designer/Environment_Props/tile_revision_notes.md`](../../Graphic_designer/Environment_Props/tile_revision_notes.md)
- **Block/unit rules:** `Bang_Rules.md` §1-4 (block=4 units, map ±48 units, outer ring 6-12 blocks)
- **Repo code:**
  - `Developer/r3f_prototype/src/components/Floor.jsx`
  - `Developer/r3f_prototype/src/components/Game.jsx`
  - `Developer/r3f_prototype/src/components/XpTextbook.jsx` (multi-mesh + outline 템플릿)
  - `Developer/r3f_prototype/src/components/LunchItems.jsx` (정적 배치 템플릿)
  - `Developer/r3f_prototype/src/lib/toon.js` (toonMat/outlineMat 헬퍼 — U1에서 확장)
- **Project policy:** `AGENTS.md` §41 (그래픽 작업은 `Graphic_designer/` 폴더에 기록)
