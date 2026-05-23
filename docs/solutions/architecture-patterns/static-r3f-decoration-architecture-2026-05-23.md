---
title: "3-layer architecture for static R3F decorations"
date: 2026-05-23
category: architecture-patterns
module: stage-graphics
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "Adding multiple static visual elements to a React Three Fiber scene (props, decorations, atmosphere overlays)"
  - "Elements share a visual style but vary in collision, hierarchy, or palette role"
  - "AGENTS.md or similar policy requires a companion design note alongside code"
  - "Visual hierarchy must distinguish element classes without per-component conventions"
applies_when_not:
  - "One-off visual element with no sibling kinds — direct component file is enough"
  - "Dynamic spawning is required (combat VFX, particles) — use the event-driven VFX layer instead"
tags: [r3f, stage-graphics, static-decorations, toon, outline, canvas-texture, layered-architecture]
related_components: [floor, stage-props, toon, atmosphere]
---

# 3-layer architecture for static R3F decorations

## Context

Stage 1 그래픽 재구성에서 6 prop 종류(`fallen_desk` · `chair_pile` · `contaminated_locker` · `safety_cone` · `barricade_small` · `warning_tape`) + 3 atmosphere overlay(`exam_paper` · `pollution_puddle_static` · `window_shadow_broken`)를 R3F 게임에 처음 도입했다. 도메인은 무대 시각이지만 구조 문제는 익숙한 것이었다: **여러 종류의 정적 요소를 단일 진실 데이터에서 분기하여 렌더링하면서, 시각 위계·충돌·정책이 element class별로 달라야 한다.**

기존 게임플레이 카탈로그(passiveCatalog · weaponCatalog)가 같은 모양으로 잘 작동하고 있었지만 — 시각 도메인은 추가 제약이 있다: 충돌 vs 장식 분류, 외곽선 위계, AGENTS.md §41(그래픽 작업의 companion 디자인 노트 필수), procedural texture 채택 여부. 4-layer 아키텍처를 그대로 가져오되 시각 도메인 specifics를 layer 안으로 흡수하는 방식이 가장 깔끔했다.

## Guidance

### 3 레이어 분리 — 게임플레이 카탈로그와 동일 패턴

```
┌─ Layer 1: data (catalog) ─────────────────────────────────────────┐
│  src/lib/stagePropsLayout.js                                       │
│   • PROP_KINDS: { kind → { category, collidesDefault, footprint }} │
│   • PROP_LAYOUT: array of { kind, pos, rot, scale, collides? }     │
│   • pure helpers: isCollidable / getBlockerAreaRatio / ...         │
└─────────────────────────────────────────────────────────────────────┘
                ↓ data 읽음                  ↓ kind 매핑
┌─ Layer 2: dispatch (orchestrator) ────────────────────────────────┐
│  src/components/StageProps.jsx                                     │
│   PROP_LAYOUT.map(e => <KIND_TO_COMPONENT[e.kind] {...e} />)       │
│   — Game.jsx에서 <Floor /> 바로 뒤 마운트 1회                       │
│   — Dev-only 가드: PROP_KINDS와 KIND_TO_COMPONENT drift 시 warn    │
└─────────────────────────────────────────────────────────────────────┘
                ↓ 단일 컴포넌트 mount
┌─ Layer 3: components ──────────────────────────────────────────────┐
│  src/components/Props/* (6 files + barrel)                         │
│  src/components/Atmosphere/* (3 files + barrel)                    │
│  각 컴포넌트 props: { pos, rot, scale, collides }                  │
│  — multi-mesh group + 부위별 toonMat + outlineMat 페어              │
│  — collides:true → RigidBody fixed + invisible footprint mesh      │
│  — collides:false → group only                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**병행 정책** (코드 아키텍처는 아니지만 같이 lands): AGENTS.md §41이 그래픽 작업의 companion 디자인 노트를 `Graphic_designer/` 폴더에 요구. plan에 별 implementation unit으로 묶어 PR과 함께 lands하게 한다. 잊혀지면 review에서 차단되는 governance — 소프트웨어 layer가 아니라 정책.

### 핵심 규칙

1. **데이터는 한 곳, 컴포넌트는 한 종류당 한 파일.** `stagePropsLayout.js`가 모든 entry의 진실. 9 kind × ~30 줄 컴포넌트가 부담스럽지 않다 — 게임플레이 카탈로그도 같은 양이다.
2. **컴포넌트 props는 4개로 고정**: `{ pos, rot, scale, collides }`. dispatch가 자동으로 채울 수 있는 최소 표면.
3. **충돌 정책은 데이터 레벨에서 결정·검증.** `PROP_KINDS[kind].collidesDefault` 기본값 + entry별 override. 충돌 footprint 합·중앙 영역 비움·outer ring 배치는 모두 pure-function 헬퍼 + vitest로 강제. 시각 컴포넌트 자체에는 정책 로직 없음.
4. **dispatch는 kind→Component map 한 줄.** orchestrator가 분기 로직을 짊어지지 않는다. 새 kind 추가 = 데이터에 entry + 컴포넌트 + map 한 줄.

### 서브 패턴 1 — outlineMat dual-axis로 시각 위계

기존 `toon.js`의 `outlineMat(opacity=0.96)`은 색이 `0x050209`로 하드코딩. **color 파라미터를 추가하여 (opacity, color) 두 축으로 시각 위계를 만든다.**

```
outlineMat(0.96)                       → 캐릭터·props: 진한 외곽선 (기본)
outlineMat(0.96, 0x050209)             → ↑ 동일 (backward compatible)
outlineMat(0.5,  0x3a2a2a)             → atmosphere: 부드럽고 약한 외곽선
```

**둘 다 변경하는 게 중요하다.** opacity만 낮추면 색은 여전히 진해서 약하게 안 보임. color만 부드럽게 하면 두께는 같아 시각 위계 차이가 미세. 두 축이 동시에 변할 때 "props는 1차 시선, atmosphere는 배경 분위기"가 한눈에 읽힌다.

### 서브 패턴 2 — Procedural CanvasTexture for parameterizable backgrounds

배경 텍스처(마루 plank 패턴)에 외부 자산 파일을 도입하는 대신, **`HTMLCanvasElement`로 코드에서 그려 `THREE.CanvasTexture`로 적용**한다.

```js
function buildPlankTexture() {
  if (typeof document === 'undefined') return null   // jsdom-less Vitest / SSR 가드
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1024
  const ctx = canvas.getContext('2d')
  // plank row × column 그리기, 이음새, 미세 노이즈
  // ...
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(12, 12)
  return tex
}

// 사용처
const floorMat = useMemo(() => new THREE.MeshLambertMaterial({
  color: 0xffffff,
  map: buildPlankTexture(),    // null이어도 MeshLambertMaterial이 안전하게 흰색으로 fallback
}), [])
```

**SSR/test 환경 가드**가 첫 줄에 있어야 한다 — `document`가 없는 환경에서 `null` 반환. `MeshLambertMaterial.map = null`은 흰색 fallback으로 안전.

장점:
- 자산 파일 의존 없음 — repo에 텍스처 추가 안 됨.
- 파라미터 변경이 코드 변경 → 디자인 토큰(plank 폭·이음새 굵기·색·노이즈 양)을 변수로 노출 가능.
- `color_palette_guide.md`의 hex를 직접 참조해 컬러 가이드 위반이 코드 리뷰에서 가시화됨.

단점·트레이드오프:
- 1024² canvas 한 번에 그리는 부담 — `useMemo`로 1회만 계산하지만 첫 mount에 ms 단위 비용. 16384² 같은 큰 텍스처는 부적합.
- 디자이너가 직접 텍스처를 손볼 수 없음 (개발자 매개).

복잡한 텍스처(인물 초상화·세밀한 패턴)는 자산 파일이 정답. **파라미터화 가능한 단순 반복 패턴(마루·격자·노이즈)에만 CanvasTexture 적용.**

### 서브 패턴 3 — Invisible footprint mesh로 정적 collider 정의

R3F + Rapier의 정적 RigidBody에 충돌체 모양을 줄 때, `Floor.jsx`의 boundary wall 패턴을 그대로 따른다:

```jsx
<RigidBody type="fixed" position={pos} colliders="cuboid">
  <mesh visible={false}>
    <boxGeometry args={[footprint.w, footprint.h, footprint.d]} />
    <meshBasicMaterial />
  </mesh>
  {/* 시각 group은 sibling */}
  <group>...visual meshes...</group>
</RigidBody>
```

- `colliders="cuboid"` 자동 collider가 invisible mesh의 boxGeometry 크기를 사용.
- 시각 group과 충돌 footprint를 분리할 수 있음 — 책상 다리는 시각적으로 4개지만 충돌은 단일 box로 추상화.
- footprint 크기는 `PROP_KINDS[kind].footprint`가 정본. pure-function 테스트가 layout 정책(≤15%)을 자동 검증.

### 서브 패턴 4 — AGENTS.md §41 companion 디자인 노트 강제

이 프로젝트의 AGENTS.md §41은 "그래픽 작업은 `Graphic_designer/`에 기록" 정책이 있다. **plan의 별 implementation unit으로 등록**해 개발 PR과 함께 lands하게 한다.

- 컴패니언 노트는 데이터·컴포넌트 외 사용자(디자이너·기획자) 관점에서 결정을 기록.
- 정본 가이드(`color_palette_guide.md` 등)의 어느 부분을 어떻게 적용했는지 cross-link.
- 향후 2스테이지 변형이 본 인프라를 재사용할 때 진입점.

코드 리뷰에서 컴패니언 노트가 빠지면 차단. plan의 IU로 명시하지 않으면 잊혀진다.

## Why This Matters

### 패턴 재사용 — 도메인이 달라도 구조는 같다

게임플레이 카탈로그(passive · weapon)와 동일한 data/dispatch/component 모양이라 기존 컨트리뷰터가 멘탈 모델을 즉시 옮길 수 있다. 사변적 미래 도메인 광고는 빼 둔다 — 다음 시각 element 종류 추가가 실제로 들어오면 그때 패턴이 자기 정당화한다.

### 시각 위계는 material 파라미터로 — per-component 컨벤션이 아니라

자연스러운 첫 시도: 각 atmosphere 컴포넌트 안에서 자체적으로 외곽선 약하게 그리기. 그러면 컴포넌트마다 "분위기는 외곽선 약하게" 규칙을 반복 적용해야 함 — 일관성이 흔들림.

대신: `outlineMat(opacity, color)`을 확장해 **재료 레벨에서 위계를 정의**. 각 컴포넌트는 어느 위계인지만 선택. 일관성은 helper에서 보장.

이 원칙은 R3F·Three.js를 넘어 일반화 가능: 시각 위계는 컴포넌트 시그니처가 아니라 재료·테마 토큰에서 결정.

### Procedural texture는 컬러 가이드 위반을 가시화한다

자산 파일은 어떤 색을 쓰는지 코드 리뷰에서 보이지 않는다. CanvasTexture는 hex가 코드에 있어 grep 가능 — 컬러 팔레트 가이드와 텍스처의 동기화가 PR 단위로 검증됨. 디자인 시스템 정합성을 enforce하는 부차적 효과.

### Footprint 추상화는 시각·물리를 디커플링

책상 잔해를 정확히 다리 4개로 충돌체로 만들면 충돌 형태가 비현실적으로 복잡. 단일 box footprint로 추상화하면 "이 영역을 막는다"는 의도가 명확. 시각 디테일(다리 4개·상판)이 충돌체와 독립적으로 변경 가능.

## When to Apply

- R3F 씬에 **3개 이상의 정적 시각 element 종류**를 추가할 때 (1-2 종이면 직접 컴포넌트가 더 단순).
- 종류별로 **충돌·시각 위계·정책이 달라야** 할 때 — 데이터 레벨에서 분기.
- AGENTS.md 같은 정책 파일이 **companion 디자인 노트를 요구**할 때 — IU에 명시.
- 단순 반복 패턴 텍스처(마루·격자·타일)가 필요할 때 — procedural CanvasTexture.

다음 경우엔 과한 패턴:
- 1-2 종 정적 element만 — 데이터 레이어 만들 가치 없음.
- 동적 spawn이 핵심인 element (combat VFX, 파티클) — 이벤트 기반 VFX 레이어가 더 적합.
- 복잡한 텍스처(세밀한 패턴·인물·풍경) — 자산 파일이 정답.
- 시각 위계가 단 한 종(모두 같은 외곽선) — `outlineMat` 확장 불필요.

## Examples

### Layer 1 — Catalog data

```js
// src/lib/stagePropsLayout.js
export const PROP_KINDS = {
  fallen_desk:         { category: 'prop',       collidesDefault: true,  footprint: { w: 1.6, d: 1.0 } },
  warning_tape:        { category: 'prop',       collidesDefault: false, footprint: { w: 2.0, d: 0.2 } },
  exam_paper:          { category: 'atmosphere', collidesDefault: false, footprint: { w: 0.6, d: 0.6 } },
  // ...9 kinds total
}

export const PROP_LAYOUT = [
  { kind: 'fallen_desk', pos: [-32, 0, -28], rot: 0.3 },
  { kind: 'exam_paper',  pos: [-25, 0.012, -10], rot: 0.4 },
  // ...18 entries total
]

export function isCollidable(entry) {
  const def = PROP_KINDS[entry.kind]
  if (!def) return false
  return entry.collides !== undefined ? entry.collides : def.collidesDefault
}

export function getBlockerAreaRatio(layout) { /* sum collidable footprint / map area */ }
```

### Layer 2 — Dispatch orchestrator

```jsx
// src/components/StageProps.jsx
const KIND_TO_COMPONENT = {
  fallen_desk: FallenDesk,
  warning_tape: WarningTape,
  exam_paper:  ExamPaper,
  // ...
}

export default function StageProps() {
  return (
    <group>
      {PROP_LAYOUT.map((e, i) => {
        const C = KIND_TO_COMPONENT[e.kind]
        if (!C) return null
        return <C key={i} pos={e.pos} rot={e.rot ?? 0} scale={e.scale ?? 1} collides={isCollidable(e)} />
      })}
    </group>
  )
}
```

### Layer 3 — Component (collides=true)

```jsx
// src/components/Props/FallenDesk.jsx
export default function FallenDesk({ pos, rot = 0, scale = 1, collides = true }) {
  const topMat = useMemo(() => toonMat(0x805947), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  // 핵심: 각 시각 메시는 outline(BackSide, inflateScale) + toon(FrontSide) 쌍으로 그린다.
  // outline 메시가 inflated가 아니면 toon과 같은 크기 → stencil 차단으로 안 보임.
  const inner = (
    <group scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 책상 상판 — outline 페어 */}
      <mesh material={outMat} scale={inflateScale([1.05, 1.18, 1.06])} position={[0, 0.45, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.7]} />
      </mesh>
      <mesh material={topMat} position={[0, 0.45, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.7]} />
      </mesh>
      {/* ... 다리 4개도 같은 패턴 */}
    </group>
  )

  if (!collides) return <group position={pos}>{inner}</group>
  return (
    <RigidBody type="fixed" position={pos} colliders="cuboid">
      {/* invisible footprint: colliders="cuboid"가 첫 자식 mesh의 geometry로 자동 collider 생성 */}
      <mesh visible={false}><boxGeometry args={[1.6, 0.4, 1.0]} /><meshBasicMaterial /></mesh>
      {inner}
    </RigidBody>
  )
}
```

위 outline 페어를 빠뜨리면 stencil 차단이 아니라 단순 깊이 비교로 외곽선이 안 보인다 — `inflateScale`은 inverted-hull outline의 두께를 만드는 핵심.

### Layer 3 — Component (atmosphere, softer outline)

```jsx
// src/components/Atmosphere/ExamPaper.jsx
export default function ExamPaper({ pos, rot = 0, scale = 1 }) {
  const paperMat = useMemo(() => toonMat(0xf2eddc), [])
  const outMat   = useMemo(() => outlineMat(0.5, 0x3a2a2a), [])  // ← dual-axis softening
  return <group position={pos} scale={[scale, scale, scale]} rotation={[0, rot, 0]}>{/* meshes */}</group>
}
```

### Pure-function 테스트가 충돌 정책 강제

```js
// src/lib/stagePropsLayout.test.js
it('R6 / AE1: 충돌 가능 prop의 footprint 합 ≤ 맵 면적의 15%', () => {
  expect(getBlockerAreaRatio(PROP_LAYOUT)).toBeLessThanOrEqual(0.15)
})

it('R6 정책: 중앙 ±16 unit 안 prop 없음', () => {
  expect(hasPropInCentralRadius(PROP_LAYOUT, 16)).toBe(false)
})

it('R6 정책: 모든 prop entry는 outer ring (한 축 |coord| ≥ 24)', () => {
  for (const e of PROP_LAYOUT) {
    expect(isInOuterRing(e.pos)).toBe(true)
  }
})
```

## Known gaps (post-review)

ce-compound Phase 3 리뷰어가 짚은 항목 — 본 적립과 같이 적용한 것 + 별 PR로 정리할 후보.

### 본 적립과 함께 정정

- ✅ 4-layer → 3-layer 재구성. "governance"는 코드 아키텍처가 아닌 정책이므로 별도 박스로 분리.
- ✅ Sub-pattern 2 (CanvasTexture) 예제에 `if (typeof document === 'undefined') return null` SSR/test 가드 시연 추가.
- ✅ Layer 3 컴포넌트 예제에 `inflateScale` outline 페어 완전 시연 — inverted-hull outline의 핵심 페어링 시각화.
- ✅ "Why This Matters / 패턴 재사용" 사변적 미래 도메인 광고(사운드·토스트·도감) 삭제.
- ✅ `StageProps.jsx`에 dev-mode 가드 추가 — `PROP_KINDS`와 `KIND_TO_COMPONENT` drift 시 `console.warn` 1회. 미지정 kind가 silent never-render 되지 않음.

### 추가 적용 (post-review 2차 정정)

- ✅ `outlineMat(0.5, 0x3a2a2a)` 튜플 → `softOutlineMat()` 헬퍼 + `OUTLINE_PRESETS = { PROP, ATMOSPHERE }` 상수. 위계 페어링을 prose가 아닌 코드로 강제. 4 분위기 컴포넌트(ExamPaper · PollutionPuddleStatic · WindowShadowBroken · WarningTape) 모두 새 헬퍼로 전환.
- ✅ `StagePropProps` JSDoc `@typedef`를 `stagePropsLayout.js`에 한 곳 정의, 9 컴포넌트(props 6 + atmosphere 3) 모두 `/** @param {import('...').StagePropProps} props */` 한 줄 주석으로 시그니처 명시. TS 없이도 IDE 자동완성·의도 명확화. atmosphere 컴포넌트는 collides prop을 무시한다는 주석도 같이 명시.

### 남은 강화 후보 (별 PR)

- **Per-instance `useMemo(toonMat)` → module-level singleton**: 9 kind × 평균 6 mesh × 2 자료(useMemo로 매 instance 재생성) = 동일 kind의 prop 2개 이상 등장 시 GPU 재료 중복. Stage 2 무대 확장 시 한 화면 prop 수가 늘어나면 성능 영향 가시화. `getToonGradient()` 싱글톤 패턴(`toon.js`) 그대로 따라 props/atmosphere 각 컴포넌트의 재료를 module-level 상수로 hoist.
- **`<RigidBody colliders="cuboid">` + invisible mesh → 명시적 `<CuboidCollider />`**: 현재는 첫 자식 mesh 순서에 의존 (Rapier 자동 collider 규칙). 자식 reorder/추가 시 silent breakage 위험. Stage 2 시점에 명시 collider로 전환.
- **9 컴포넌트 × ~30 LOC → `StaticProp` 베이스 + 9 thin config**: 현재 ~270 LOC 중 ~50% 반복 (useMemo mats 패턴, optional RigidBody wrap, group/scale/rot). Stage 2 추가 무대에서 kind가 18+로 늘어나면 베이스 컴포넌트로 응축. 현재는 9 kind 정도라 직접 컴포넌트가 가독성 좋아 유지.

## Related

- [`phase-gated-persistent-meta-progression-2026-05-17.md`](phase-gated-persistent-meta-progression-2026-05-17.md) — 동일 data/dispatch/component 패턴을 gameplay 카탈로그(passive upgrades)에 적용. 본 문서가 mirror.
- Plan + origin: `docs/plans/2026-05-22-001-feat-stage1-abandoned-classroom-graphics-plan.md` (U1-U7 구현), `docs/brainstorms/2026-05-20-stage-graphic-redesign-requirements.md` (R1-R13, AE1-AE4).
- 컴패니언 디자인 노트: `Graphic_designer/Environment_Props/stage1_abandoned_classroom_layout_2026-05-23.md` — AGENTS.md §41 산출물.
- 구현 코드: `Developer/r3f_prototype/src/lib/{toon,stagePropsLayout}.js`, `src/components/{StageProps,Floor,Props/*,Atmosphere/*}.jsx`.
