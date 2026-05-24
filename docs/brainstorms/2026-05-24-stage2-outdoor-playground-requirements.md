---
date: 2026-05-24
topic: stage2-outdoor-playground
status: draft
---

# Stage 2 — "감염된 운동장" (Outdoor Playground / Schoolyard)

> Stage 1 "버려진 교실"을 빠져나온 학생이 본관 뒷문을 통과해 학교 운동장 영역에 도달한다. 5분 세션 단위의 같은 서바이버라이크 핵을 운영하되, **무대 톤·외곽 props·바닥 패턴이 모두 실외 톤으로 전환**되어 "탈출의 다음 단계"가 시각적으로 즉시 읽힌다.

---

## Problem Frame

현재 게임은 Stage 1 한 종류뿐이다. [stage1_replan_2026-05-06.md](../../Planner/Stage1_Balance/stage1_replan_2026-05-06.md)는 5분 보스(교장 감염체)를 클리어하면 1스테이지가 끝나는 흐름을 정의하지만, 이후 단계가 없다. 동시에 [stage_graphic_cons.md](../../Graphic_designer/Concept_Rules/stage_graphic_cons.md) §4는 원래 "감염된 학교 운동장과 본관 주변"을 1스테이지로 잡았으나, 2026-05-22 사용자 결정으로 1스테이지가 "버려진 교실"로 변경되었다 (see [2026-05-20-stage-graphic-redesign-requirements.md](2026-05-20-stage-graphic-redesign-requirements.md) Scope Boundaries — "운동장 모티프는 본 구성안 밖").

즉 **운동장 모티프는 한 번 의도적으로 디퍼된 자산**이며, 본 문서가 그 자산을 Stage 2 정체성으로 정식 회수한다.

Stage 1 그래픽 작업으로 [stagePropsLayout.js](../../Developer/r3f_prototype/src/lib/stagePropsLayout.js) + [StageProps.jsx](../../Developer/r3f_prototype/src/components/StageProps.jsx) + [Floor.jsx](../../Developer/r3f_prototype/src/components/Floor.jsx)의 3-layer 정적 데코레이션 아키텍처가 자리잡았으므로, Stage 2는 이 인프라를 그대로 재사용해 **데이터·컴포넌트 추가**만으로 무대 톤 전환을 달성할 수 있다.

---

## Stage Transition Framing

| 축 | Stage 1 (현재) | Stage 2 (본 안) |
|---|---|---|
| 공간 | 버려진 교실 (실내·닫힌 공간) | 학교 운동장 (실외·열린 공간) |
| 바닥 | 마루 판자 (`0xa99a73` 계열, 따뜻한 갈색) | 흙 트랙 + 콘크리트 패드 (`0x9e6363`/`0x805947` 흙톤 + `0xb7c0c7` 회청 콘크리트) |
| 시간대 인상 | 흐릿한 형광등 잔광 | 회색 하늘·황혼 / 안개 |
| 외곽 props | 책상·의자·사물함·시험지·창문 그림자 | 벤치·철봉·축구 골대·관중석 그림자·구령대 |
| 분위기 overlay | 시험지·오염 웅덩이·창문 그림자 | 트랙 라인·먼지/모래 자국·국기 그림자 |
| 적 동향 (제안) | 근접·돌진형만 | E04 침뱉개(원거리) 정식 도입 가능 (1스테이지에서 디퍼) |
| 보스 (제안) | 교장 감염체 | 별 보스 또는 교장 2페이즈 — 본 문서 밖, 별 plan |

> **핵심 서사**: 플레이어가 교실 마룻바닥을 벗어나 "정문 / 본관 뒷문 → 운동장"으로 발걸음을 옮긴 직후의 화면이다. 같은 게임의 다음 챕터로 읽혀야 하지 운동장 = 안전 = 클리어 단계로 읽혀서는 안 된다 (탈출이 끝난 게 아님).

---

## Requirements

### 바닥 (Floor)

- **R1.** Stage 2의 `Floor` 컴포넌트는 **흙 트랙 + 콘크리트 패드 이중 영역** 패턴을 표현한다. 트랙(외곽 링)은 `0x9e6363`/`0x805947` 계열 흙톤, 중앙 패드는 `0xb7c0c7`/`0x96a5bc` 회청 콘크리트.
- **R2.** 트랙 영역은 **흰색 레인 라인**(`0xc9cb9f` 또는 `0xb7c0c7` 라이트 톤)이 동심원/타원으로 보인다. Stage 1 마루 이음새가 시각 그리드 역할을 했던 것과 동일하게 트랙 라인이 시각적 거리감을 준다.
- **R3.** 바닥은 단일 plane mesh + procedural CanvasTexture로 구현 (Stage 1 패턴 재사용). 외부 텍스처 자산 추가 없음.
- **R4.** 기존 4개 boundary 충돌체 구조 유지. 맵 크기(±48 unit), 중앙 회피 공간(±16 unit) 정책 유지 — `Bang_Rules.md` §1 그대로.

### Stage 무대 데이터 (Layout)

- **R5.** Stage 2 전용 layout 데이터는 별 파일에 정의하되, Stage 1과 같은 `PROP_LAYOUT` 스키마(`{ kind, pos, rot, scale, collides }`)와 같은 helper 함수(`isCollidable`, `hasPropInCentralRadius`, `getBlockerAreaRatio`, `isInOuterRing`)를 재사용한다.
- **R6.** Stage 2의 `PROP_KINDS`는 운동장 props 6종 + 분위기 overlay 3종으로 새로 정의된다 (아래 R7·R8). Stage 1 kinds는 Stage 2 layout에 등장하지 않는다 (시각 톤이 섞이지 않게).
- **R7.** 외곽 props 6종:
  - `wooden_bench` — 운동장 벤치, 충돌 있음, 가로 폭이 길어 회피 경로의 자연스러운 좁힘 역할
  - `pull_up_bar` — 철봉, 충돌 있음, 두 기둥 + 가로봉 구조
  - `soccer_goal` — 작은 축구 골대 (Lv.1 사이즈, 골대 그물 가운데가 비어 회피 가능), 골대 기둥만 충돌
  - `flag_pole` — 국기 게양대, 충돌 있음, 깃발은 시각만
  - `podium_small` — 구령대 / 단상, 충돌 있음
  - `chalk_line_marker` — 석회 라인 마커 (트랙 그리는 도구), 충돌 없음 (장식)
- **R8.** 분위기 overlay 3종:
  - `dirt_patch` — 모래·흙 자국 (트랙 위 정적 패치), `0x9e6363` 계열
  - `crack_concrete` — 콘크리트 균열 (중앙 패드용), 어두운 균열 라인
  - `bleacher_shadow` — 관중석 그림자 (외곽 boundary 안쪽으로 길게 떨어지는 직사각형 그림자)
- **R9.** props/atmosphere 충돌 정책은 Stage 1과 동일 — 완전 막힘 금지, 충돌체 footprint 합 ≤ 맵 면적의 15%, 중앙 ±16 unit 안에 collides:true 없음.
- **R10.** 외곽 6-12 블록 링(±24 ~ ±48 unit) 위주 배치 + 시작 가시권 외곽(±2 unit 부근)에 비충돌 축소 prop 2-3개 배치 (Stage 1의 "한 화면 안에 prop 2개 이상 보이게" 정책 미러).

### 시각 위계 / 카툰 일관성

- **R11.** 모든 prop·overlay는 Stage 1과 동일한 `toon.js`의 `toonMat` + `outlineMat` 페어 패턴을 사용한다. 외곽선 색은 props는 기본(`0x050209`), atmosphere overlay는 `softOutlineMat()` (= `outlineMat(0.5, 0x3a2a2a)`).
- **R12.** 캐릭터·드랍·VFX·UI·HUD 시각 정책은 무변경 — 본 작업은 무대 톤만 바꾼다.

### 모바일 가독성 / 성능

- **R13.** 9:16 모바일(390×844 / 375×812)에서 플레이어·적·드랍이 새 props·overlay에 묻히지 않는다.
- **R14.** Stage 1 대비 측정 가능한 프레임 저하 없음. mesh·draw call 추가량은 Stage 1과 같은 규모(≈ +200 mesh) 유지.

### 5분 세션 정합성

- **R15.** Stage 2도 5분 세션을 유지한다. 무대 그래픽은 정적(0:00 ~ 4:59 동안 동일).
- **R16.** Stage 1 → Stage 2 전환 방식은 본 문서 범위 밖 — Outstanding Question Q3 참조.

---

## Acceptance Examples

- **AE1.** **Covers R1, R2.** Stage 2 첫 30초 화면에 흙 트랙의 곡선 라인 + 중앙 회청 콘크리트 패드가 즉시 보여, 플레이어가 "교실이 아니라 운동장에 있다"를 1초 안에 인식한다.
- **AE2.** **Covers R7, R9.** 플레이어가 외곽 어디로 이동해도 벤치·철봉·축구 골대에 의해 4 방향 회피 경로가 모두 막히는 폐쇄 구역이 발생하지 않는다.
- **AE3.** **Covers R8, R12.** 트랙 위에 정적 `dirt_patch`가 보이는 동안 보스 또는 침뱉개의 동적 오염 장판이 같은 화면에 겹치면, 두 요소는 색·동작(정적 vs 펄스)으로 즉시 구분된다.
- **AE4.** **Covers R13.** 모바일 9:16 화면에서 4분 구간 적 ~30마리 + 투사체 + XP 오브 + 새 운동장 props 동시 표시 시, 플레이어 silhouette과 적 5종이 모두 구분 가능.
- **AE5.** **Covers R15.** Stage 2 0:00 시작 화면과 4:59 화면의 무대 그래픽(바닥·props·overlay)이 동일하다.
- **AE6.** **Covers stage progression framing.** Stage 1을 클리어한 사용자가 Stage 2 첫 화면을 봤을 때 "다음 스테이지" / "교실에서 운동장으로 나왔다"를 자연어로 설명할 수 있다.

---

## Success Criteria

- **인간 결과**: Stage 1 완주 직후 Stage 2 첫 화면을 본 플레이어가 "교실 → 운동장" 전환을 즉시 인지하고, 새 콘텐츠가 시작됐다는 동기를 느낀다.
- **다운스트림 핸드오프**: `/ce-plan`이 본 문서를 origin으로 받아 구현 유닛 분해 시 무대 톤·범위·접근법·시각 정책 어느 것도 invent하지 않는다. Stage 1 plan과 같은 IU 구조(`Floor` 변경 / `stage2PropsLayout.js` / props 6종 / atmosphere 3종 / orchestrator / 컴패니언 doc)가 가능.
- **인프라 재사용 검증**: Stage 2 작업이 끝났을 때, `toon.js`·`StageProps.jsx` orchestrator·layout helper 어느 것도 시그니처가 변경되지 않는다 (Stage 1과 동일한 helper로 Stage 2 layout이 검증된다).

---

## Scope Boundaries

### 본 문서에 포함

- 운동장 무대 톤(바닥 + props 6종 + atmosphere 3종) 정의
- Stage 1 인프라 재사용 방식 명시
- 5분 세션·맵 크기·중앙 회피 공간 정책 유지

### 본 문서 밖

- **Stage 2 게임플레이 밸런스** (적 스폰 곡선, HP·데미지 수치, 보스 변경, 5분 흐름 재조정) — Outstanding Question Q2 참조. 별 brainstorm/plan 필요.
- **E04 침뱉개(원거리 적) 도입 여부 및 구현** — 1스테이지에서 명시적으로 디퍼된 적. Stage 2가 자연스러운 도입 시점이지만, 본 문서는 도입 가능성만 명시. 실제 도입 결정은 Q2 게임플레이 plan에서.
- **Stage 1 → Stage 2 전환 UX** (스테이지 클리어 화면, 다음 스테이지 진입 버튼, 메타 진행 저장 등) — Outstanding Question Q3 참조.
- **운동장 외 다른 Stage 2 후보 톤** (복도·옥상·도서관 등) — 본 문서는 "교실 → 운동장" 전환 단일 안만 다룸.
- **시간 진행에 따른 무대 변화** (Stage 1과 동일한 Approach A 유지 — 정적).
- **캐릭터·적·무기 시각 변경**, **HUD·UI 변경**, **실시간 그림자·라이팅 변경**.
- **사운드 추가** — 본 문서는 무음 정책 유지.

---

## High-Level Approach

### Approach A (Recommended): 인프라 그대로, 데이터·컴포넌트만 추가

```
src/lib/
  stagePropsLayout.js         ← Stage 1 layout (변경 없음)
  stage2PropsLayout.js        ← 신규: Stage 2 PROP_KINDS + PROP_LAYOUT + helper re-export
  toon.js                     ← 변경 없음 (Stage 1 작업으로 이미 OUTLINE_PRESETS 보유)

src/components/
  Floor.jsx                   ← stageId props로 분기 (Stage 1 마루 / Stage 2 트랙+패드)
  StageProps.jsx              ← layout 인자를 prop으로 받아 dispatch (Stage 1·2 공용)
  Props/                      ← Stage 1 6종 유지
  Props2/                     ← 신규: WoodenBench / PullUpBar / SoccerGoal /
                                       FlagPole / PodiumSmall / ChalkLineMarker
  Atmosphere/                 ← Stage 1 3종 유지
  Atmosphere2/                ← 신규: DirtPatch / CrackConcrete / BleacherShadow

src/store/useGameStore.js     ← stageId 상태 추가 (1 | 2)
src/components/Game.jsx       ← stageId 기반 Floor/StageProps 분기
```

장점: Stage 1 코드 무변경, Stage 1 회귀 위험 0, Stage 1 테스트 그대로 통과. Stage N 추가가 같은 패턴으로 즉시 확장 가능.
단점: kind 네임스페이스가 두 벌이 됨 (`fallen_desk` vs `wooden_bench`). 단, 이는 의도된 분리 (시각 톤이 섞이지 않게).

### Approach B: 단일 layout 파일 + stageId 필드

`stagePropsLayout.js`의 `PROP_KINDS`에 Stage 2 6+3종을 추가하고, 각 LAYOUT entry에 `stageId: 1 | 2` 필드 추가. `StageProps`가 `stageId`로 필터.

장점: 단일 진실 유지.
단점: Stage 1 데이터 파일이 비대해짐. Stage 3·4 추가 시 더 비대해짐. Stage 1 helper 테스트가 Stage 2 entry까지 검사하게 됨 (테스트 분리 곤란).

→ **Approach A 권장**. Stage가 의도된 시각 단절을 갖는 콘텐츠이므로 파일 분리가 자연스럽다. Stage 1 plan의 [stagePropsLayout.test.js](../../Developer/r3f_prototype/src/lib/stagePropsLayout.test.js) 패턴은 Stage 2 layout에 그대로 mirror된다.

### Approach C: Stage 2를 완전 별도 씬 (별 Floor·별 Game)

[Game.jsx](../../Developer/r3f_prototype/src/components/Game.jsx)를 stageId 별로 분기시키지 않고 `Game1.jsx` / `Game2.jsx` 두 컴포넌트로 분리.

장점: 두 스테이지가 완전 격리됨.
단점: 게임 로직 코드 중복 (적·무기·HUD·물리 시스템). 본 작업은 무대 톤만 바꾸므로 과한 분리.

→ **Approach C 미선택.**

---

## Outstanding Questions (Resolve Before Planning)

### Q1. 운동장 props 6종이 위 R7 목록으로 확정인가?

후보:
- ✅ `wooden_bench`, `pull_up_bar`, `soccer_goal`, `flag_pole`, `podium_small`
- 🤔 `chalk_line_marker` — 운동장 정체성을 강조하지만 시각적으로 미세할 수 있음.
- 대안 후보: `tire_obstacle` (체육 활동용 타이어 더미), `volleyball_net` (배구 네트), `parallel_bars` (평행봉), `sand_pit_border` (모래밭 경계)

**Q1 결정 필요**: 6종 확정 또는 위 대안 후보로 1-2종 교체.

### Q2. Stage 2 게임플레이 밸런스는 별도 plan으로 진행하는가?

본 문서는 무대 톤만 다루지만, 실제 "Stage 2"가 의미를 가지려면 적 구성·스폰 곡선·보스 변형이 결정돼야 한다. 후보:
- (a) **무대 톤만** — Stage 2는 Stage 1과 동일 밸런스·적·보스, 무대만 운동장으로 바뀐 모드. 가벼움.
- (b) **무대 톤 + E04 침뱉개 정식 도입** — 1스테이지 디퍼된 원거리 적이 Stage 2에서 등장. 새로운 회피 패턴 도입.
- (c) **풀 Stage 2** — 적 구성 재설계, 스폰 곡선 재설계, 새 보스(또는 교장 2페이즈), 5분 흐름 재조정. 별 brainstorm 필요.

**Q2 결정 필요**: (a)/(b)/(c) 중 택1. (c) 선택 시 본 문서는 graphics-only로 좁히고, 게임플레이 brainstorm을 별도 작성.

### Q3. Stage 1 → Stage 2 전환 UX는 어떻게 처리하는가?

후보:
- (i) **Stage 1 클리어 후 결과 화면 → "다음 스테이지" 버튼 → Stage 2 자동 시작** (선형 진행)
- (ii) **메뉴에서 Stage 선택** (자유 진입, Stage 1 클리어 시 Stage 2 잠금 해제)
- (iii) **Stage 1·2 둘 다 메뉴에서 항상 선택 가능** (잠금 없음)
- (iv) **이번 작업에서는 미결정** — Stage 2 진입은 디버그용 토글만, 정식 진행 UX는 별 작업

**Q3 결정 필요**: (i)/(ii)/(iii)/(iv) 중 택1.

### Q4. Stage 2 보스는 누구인가?

(Q2가 (c)일 때만 의미 있음)
- (α) **교장 감염체 2페이즈** — Stage 1과 같은 보스, 2페이즈/광폭 모드. 캐릭터 자산 재활용.
- (β) **새 보스: 감염된 체육 교사 거대형** — 운동장 정체성에 부합. `stage_graphic_cons.md` §7-3 기존 디자인 확장.
- (γ) **새 보스: 감염된 운동부 주장** — 빠른 돌진 + 무리 소환. 운동장 모티프 강함.
- (δ) **이번 작업에서는 미결정** — Stage 2는 보스 없이 5분 생존 모드, 보스 디자인은 별 작업.

**Q4 결정 필요**: Q2 결정에 종속.

### Q5. 바닥 패턴 — 트랙은 어떤 곡선 형태인가?

- (1) **타원형 표준 운동장 트랙** (가로 96 unit 안에 4-6 레인) — 시각적으로 가장 "운동장답다"
- (2) **직선 + 코너 단순화** — 구현 비용 낮음, 모바일 가독성 좋음
- (3) **트랙 + 중앙 풋살장 라인** — 트랙 안쪽에 직사각형 풋살 필드 라인 추가

**Q5 결정 필요**: (1)/(2)/(3) 중 택1. 본 문서는 (1) 가정.

### Q6. 분위기 톤은 황혼 / 새벽 / 흐림 / 안개 중 무엇인가?

- (A) **회색 흐린 하늘 + 약한 안개** (Stage 1의 어둠과 연속, 가장 무거움)
- (B) **황혼·노을** (붉은 톤 추가로 위험감 강조)
- (C) **새벽·푸르스름** (희망/탈출 직전 분위기, 게임 정체성과 다소 충돌)
- (D) **무특정** — Stage 1과 같은 평이한 라이팅, 색 톤만으로 구분

**Q6 결정 필요**: (A)/(B)/(C)/(D) 중 택1.

---

## Related Documents

- **Stage 1 정본**:
  - [Planner/Stage1_Balance/stage1_replan_2026-05-06.md](../../Planner/Stage1_Balance/stage1_replan_2026-05-06.md) — Stage 1 게임플레이 밸런스
  - [docs/brainstorms/2026-05-20-stage-graphic-redesign-requirements.md](2026-05-20-stage-graphic-redesign-requirements.md) — Stage 1 그래픽 origin
  - [docs/plans/2026-05-22-001-feat-stage1-abandoned-classroom-graphics-plan.md](../plans/2026-05-22-001-feat-stage1-abandoned-classroom-graphics-plan.md) — Stage 1 그래픽 implementation plan
- **Concept Rules**:
  - [Graphic_designer/Concept_Rules/stage_graphic_cons.md](../../Graphic_designer/Concept_Rules/stage_graphic_cons.md) — 원본 §4가 "운동장 + 본관"을 1스테이지로 잡았던 안 (본 문서가 Stage 2로 회수)
  - [Graphic_designer/Concept_Rules/color_palette_guide.md](../../Graphic_designer/Concept_Rules/color_palette_guide.md) — Survival Horror 32 팔레트
- **Policy**:
  - [Bang_Rules.md](../../Bang_Rules.md) §1 (맵 크기·블록 단위), §4 (적 기준 — E04 "1스테이지 제외, 2스테이지 이후 보류")
- **Stage 1 infra (재사용 대상)**:
  - [Developer/r3f_prototype/src/lib/stagePropsLayout.js](../../Developer/r3f_prototype/src/lib/stagePropsLayout.js)
  - [Developer/r3f_prototype/src/components/StageProps.jsx](../../Developer/r3f_prototype/src/components/StageProps.jsx)
  - [Developer/r3f_prototype/src/components/Floor.jsx](../../Developer/r3f_prototype/src/components/Floor.jsx)
  - [Developer/r3f_prototype/src/lib/toon.js](../../Developer/r3f_prototype/src/lib/toon.js) (`OUTLINE_PRESETS`, `softOutlineMat()` 재사용)

---

## Next Steps

1. 사용자 Q1-Q6 결정 (특히 Q2가 본 문서의 폭을 결정).
2. Q2 결정 후 본 문서를 origin으로 `/ce-plan` 실행 — Stage 1 plan의 IU 분해 패턴을 mirror한 구현 plan 생성.
3. 구현 후 `Graphic_designer/Environment_Props/stage2_outdoor_playground_layout_YYYY-MM-DD.md` 컴패니언 doc 작성 (AGENTS.md §41 정책).
4. (Q2가 (b) 또는 (c)이면) Stage 2 게임플레이 별 brainstorm 작성 — `Planner/Stage2_Balance/` 폴더 신설 권장.
