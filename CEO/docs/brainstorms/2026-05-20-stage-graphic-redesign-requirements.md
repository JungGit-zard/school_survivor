---
date: 2026-05-20
topic: stage-graphic-redesign
---

# Stage Graphic Redesign — Stage 1 "Abandoned Classroom"

## Summary

1스테이지 그래픽을 회색 콘크리트 + 격자선의 프로토타입 화면에서 **"버려진 교실 장면"**으로 재구성한다. 바닥은 `color_palette_guide.md`의 Survival Horror 32 마루 계열로 교체하고, 외곽 영역에 책상 잔해·의자 더미·오염된 사물함·경고 테이프 등 props와 찢어진 시험지·오염 웅덩이·깨진 창문 그림자 등 분위기 요소를 배치해 감염된 학교 서사를 화면에서 즉시 인식시킨다.

---

## Problem Frame

현재 `Floor.jsx`는 회색 콘크리트 단색(`0xc8c4bc`)과 격자선(`0x7f7a70`)만으로 구성된 24×24 타일 평면이다. 카툰 캐릭터·VFX·UI가 위에 얹혀 게임 자체는 동작하지만, **첫 30초 화면 인상이 "미완성 프로토타입"으로 읽힌다.** 출근길 직장인 타깃이 짧은 세션을 처음 켰을 때 "지금 무엇을 하는 게임인가"가 즉시 보이지 않으면 이탈하기 쉽다.

기존 `Graphic_designer/` 정본은 이 문제를 두 방향에서 접근해 왔다 — `stage_graphic_cons.md`는 "감염된 학교 운동장과 본관 주변"을 제시했고, `tile_revision_notes.md` + `prop_removal_floor_only.md`는 "교실 마루 단일 톤으로 통일"을 결정했다. 두 정본이 무대 톤에서 충돌해 어느 쪽도 R3F 코드에 도달하지 못한 상태다. 동시에 `color_palette_guide.md`는 Survival Horror 32 팔레트의 마루 계열을 정본으로 못 박았으나 현재 `Floor.jsx` 색은 이 가이드와 어긋난다.

---

## Requirements

**바닥 (Floor)**

- R1. `Floor.jsx`의 바닥 색은 `color_palette_guide.md` §2-1의 마루 계열(`0xa99a73` 주색, `0xc9cb9f` 밝은 변형, `0x805947` 어두운 변형, `0x623333` 이음새)을 사용한다.
- R2. 마루 판자 패턴은 시각적으로 인식되는 이음새(grout/seam)를 가지며, 판자 단위 크기는 기존 4 unit 타일 안에 자연스럽게 분할된다.
- R3. 현재의 `<lineSegments>` 격자 오버레이는 완전히 제거한다. 마루 판자 이음새가 시각 그리드 역할을 대신한다.
- R4. 바닥 단일 평면 + boundary 충돌체(현재 `Floor.jsx`의 4개 invisible wall) 구조는 유지한다. props는 별도 컴포넌트로 추가하며 바닥 평면 자체를 분할하지 않는다.

**외곽 장식 props**

- R5. 다음 props가 외곽 영역(중앙 비움)에 배치되어 "버려진 교실" 서사를 형성한다: 쓰러진 책상(`fallen_desk`), 의자 더미(`chair_pile`), 오염된 사물함(`contaminated_locker`), 안전 콘(`safety_cone`), 작은 바리케이드(`barricade_small`), 감염 경고 테이프(`warning_tape`).
- R6. props는 충돌체를 갖는 종류(책상·사물함·바리케이드)와 장식 전용(경고 테이프) 두 분류로 나뉘며, `stage_graphic_cons.md` §4 충돌 정책(완전 막힘 금지, 전체 맵의 15% 이하 이동 방해, 중앙부 회피 공간 유지)을 준수한다.
- R7. props는 카툰 렌더링 정책(`current_visual_rules.md` §1)에 따라 `toon.js`의 공용 toon 재질 + outlined hull 외곽선을 적용한다. 배경 자산처럼 보이지 않고 캐릭터·드랍과 동일한 시각 언어를 가진다.

**분위기 요소 (atmosphere overlays)**

- R8. 다음 분위기 요소가 외곽 영역에 정적으로 배치되어 감염 서사를 강화한다: 찢어진 시험지(`exam_paper`), 환경 오염 웅덩이(`pollution_puddle_static`), 깨진 창문 그림자(`window_shadow_broken`).
- R9. 분위기 요소는 모두 충돌이 없는 장식이며, props보다 시각적으로 미세하게(채도·외곽선 굵기 감소) 처리되어 props와 충돌하지 않는 시각 우선순위를 가진다.
- R10. 환경 오염 웅덩이(R8)와 보스의 동적 오염 장판(`current_visual_rules.md` §4) 은 모두 녹색 계열이므로 **명시적 시각 구분 정책이 결정·구현되어야 한다** (자세한 차원 결정은 Outstanding Questions 참조).

**모바일 가독성·성능**

- R11. 9:16 모바일(390×844 / 375×812)에서 플레이어·적·드랍 아이템이 props·분위기 요소에 묻히지 않는다.
- R12. 4분 이후 적 밀도가 높은 상황에서도 그래픽 추가로 인한 프레임 저하가 측정 가능한 수준으로 일어나지 않는다 (구체 임계는 plan-time 결정).

**5분 세션 정합성**

- R13. 5분 세션 중 무대 그래픽은 정적이다 (시간 진행에 따른 분위기 변화 없음 — Approach C 미선택의 의도).

---

## Acceptance Examples

- AE1. **Covers R6.** 플레이어가 외곽 영역 어디로 이동하더라도 props에 막혀 통과할 수 없는 폐쇄 구역은 생기지 않는다. 임의 시작 위치에서 맵 4 boundary 4 방향 모두로 회피 경로가 존재한다.
- AE2. **Covers R10.** 환경 오염 웅덩이가 화면에 보이는 동안 보스 오염 장판이 같은 화면에 새로 생성되면, 플레이어는 즉시 둘을 구분할 수 있다 — 환경 오염 위에 서 있어도 피해 없고, 보스 장판은 진입 시 즉시 피해.
- AE3. **Covers R11.** 모바일 9:16 화면에서 보스 등장 직전(3분-4분 구간) 적 ~30마리 + 투사체 + XP 오브 동시 표시 상태에서, 플레이어 silhouette과 적 5종은 서로 시각적으로 구분 가능하며 props에 의해 가려지지 않는다.
- AE4. **Covers R13.** 0:00 게임 시작 화면과 4:59 게임 종료 직전 화면을 비교해, 무대 그래픽(바닥·props·분위기)은 동일하다 (동적 VFX·캐릭터·드랍·보스만 다름).

---

## Success Criteria

- **인간 결과**: 출근길 직장인 타깃이 처음 게임을 켠 후 30초 안에 "감염된 학교 교실에서 도망친다"는 게임 정체성을 시각으로 인식한다 — "프로토타입 화면 같다"는 인상이 사라진다.
- **다운스트림 핸드오프**: `/ce-plan`이 본 문서를 origin으로 받아 구현 유닛 분해를 진행할 때, 무대 톤·범위·접근법·시각 정책 어느 것도 invent하지 않는다. 충돌/장식 분류, 외곽 배치 정책, 시각 우선순위가 모두 명시되어 있다.
- **시각 가독성**: `current_visual_rules.md` §5 검증 항목(모바일 가독성·HUD 안전 영역·캐릭터 분리·경고선 일치)이 본 변경 후에도 모두 통과한다.

---

## Scope Boundaries

- 운동장 모티프(트랙 라인·콘크리트·외부 본관 실루엣)는 본 구성안에 포함하지 않는다 — 무대 톤 결정으로 교실·복도 단일 톤 채택.
- 시간 진행에 따른 분위기 변화(Approach C: 0분 깨끗→5분 완전 오염)는 본 구성안에 포함하지 않는다 — 사용자가 Approach A를 선택.
- 보스·엘리트 VFX 신규 또는 보강(`current_visual_rules.md` §4 "보강 필요" 항목들)은 별 작업.
- 캐릭터·적·무기 시각 변경은 본 구성안 밖.
- 실시간 그림자·정교한 라이팅 변경은 본 구성안 밖. 기존 `MeshToonMaterial` + 고정 그림자 정책 유지.
- 2스테이지 이후 또는 다른 무대 톤(운동장·복도 변형 등) 추가는 본 구성안 밖.
- HUD·UI 시각 변경(`current_visual_rules.md` §3 위험 항목들)은 별 작업.

---

## Key Decisions

- **무대 톤: 교실·복도 (나무 마루)**. `stage_graphic_cons.md` §4의 "운동장 + 본관"과 `tile_revision_notes.md`의 "교실 마루" 충돌을 후자로 해소. 근거: 현재 floor 레퍼런스가 마루이고, 컬러 팔레트 가이드가 마루 계열을 정본화했고, 사용자가 명시적으로 마루 톤을 선택.
- **Approach A: "버려진 교실 장면"** (vs B 가독성 우선 · C 시간 변화). 정본 충실 + props·분위기 풍부 방향. 구현량 가장 크지만 게임 정체성을 화면에 가장 강하게 전달.
- **격자 라인 완전 제거**. 사용자가 현재 화면을 "맨 그리드 바닥판" 부정적 표현으로 시작. 마루 판자 이음새가 자연스러운 시각 그리드 역할을 대신한다.
- **컬러 팔레트: Survival Horror 32 마루 계열 정본 채택**. `color_palette_guide.md` §2-1 그대로. 다른 톤(예: 더 어두운 공포)으로 가지 않는다.
- **정적 무대**. 5분 세션 중 바닥·props·분위기는 변하지 않는다. 동적인 것은 VFX·드랍·캐릭터·적·보스 패턴뿐.

---

## Dependencies / Assumptions

- R3F 단일 스택. `stage_graphic_cons.md`의 Phaser 4 + Three.js 합성 모델은 historical로 취급한다 (코드에 없음). 모든 시각 요소는 R3F 컴포넌트로 구현.
- `current_visual_rules.md` §1의 정책(`MeshToonMaterial`, 외곽선, 좌표 일치, 2D 픽셀 캐릭터 금지)은 props에도 그대로 적용된다.
- 보스 오염 장판 시각 표현은 이미 VFX 계층에 구현되어 있다(`current_visual_rules.md` §4) — 본 변경은 환경 오염을 별도 정적 자산으로 추가하는 작업이며, 기존 보스 장판은 변경하지 않는다.
- 무한 맵 효과(카메라 따라 배경 재배치)는 현재 `Floor.jsx`에 구현되어 있지 않다 — boundary collider 안에 24×24 타일 평면이 정적으로 존재한다. props도 같은 정적 boundary 안에 배치한다. lazy spawn / 무한 맵 보강은 별 작업.
- 출근길 직장인 타깃·9:16 모바일·5분 세션 제약은 `Planner/Essential_game_plan/commuter_target_planning_2026-05-14.md` 정본을 따른다.

---

## Outstanding Questions

### Resolve Before Planning

- **[Affects R10][User decision]** 환경 오염 웅덩이(정적 분위기)와 보스 오염 장판(동적 위험)을 어떤 차원으로 시각 구분할 것인가? 후보: (a) 외곽선 굵기 차이, (b) 내부 채도/명도 차이, (c) 미세 펄스 애니메이션 유무, (d) 위 셋의 조합. 결정에 따라 R10·AE2 구현 방식이 달라진다.

### Deferred to Planning

- **[Affects R5, R6][Technical]** R3F에서 props 시스템 첫 도입 — `PropMesh.jsx` 같은 공용 컴포넌트 + RigidBody 패턴, 정적 배치 데이터 구조, 카메라 외 영역 culling 여부.
- **[Affects R6][Technical]** "15% 이하 이동 방해"를 R3F 정적 배치에서 어떻게 측정·강제할지 (육안 검증 vs 자동 라이드 검사).
- **[Affects R7][Technical]** props 외곽선 굵기를 캐릭터와 어떻게 차별할지 — 같으면 시각적으로 같은 위계, 얇으면 배경처럼 보임. `outlineMat` 매개변수 조정 범위.
- **[Affects R12][Needs research]** props 추가 후 모바일(중저사양) 프레임 측정 — 기준선 fps 대비 어느 수준이 허용 가능한가.
- **[Affects R11][Needs research]** props가 플레이어 silhouette을 가리지 않는 시각 우선순위 — z-order 또는 모바일에서 props 투명도 조정 정책.
