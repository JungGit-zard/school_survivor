# Classroom Desk Stage Object Review · 2026-06-06

## 작업 목적

- 사용자 제공 레퍼런스 `교실 책상_01`을 기준으로 스테이지 배경용 책상 오브젝트를 만든다.
- 앞으로 여러 배경 오브젝트를 계속 추가할 수 있도록 별도 보관 폴더와 배치 구조를 만든다.
- 이번 책상은 장애물이 아니라 시각 소품으로 먼저 배치한다.

## 확인한 근거

### 프로젝트 문서

- `project_develop_policy.md`
- `Graphic_designer/Bang_survivor_Graphic_concept.md`
- `Graphic_designer/Concept_Rules/stage_graphic_cons.md`
- `Graphic_designer/Concept_Rules/color_palette_guide.md`
- `Graphic_designer/Concept_Rules/current_visual_rules.md`
- `Graphic_designer/A.graphic/A-3.background/Environment_Props/prop_visibility_revision.md`
- `Graphic_designer/stage2_corridor_visual_readability_review_2026-06-04.md`
- `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_reverse_design_current_2026-05-09.md`
- `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage2_Corridor_Projectile/stage2_corridor_implementation_plan_2026-06-04.md`

### 사용자 레퍼런스에서 확정된 내용

- 이름: `교실 책상_01`
- 로우폴리, 반복 배치용, 단순 텍스처
- 상판 색: `#D9B27A`
- 프레임 색: `#B0B0B0`
- 수납함 색: `#7A7A7A`
- 발캡 색: `#333333`
- 구조: 나무 상판, 4개 금속 다리, 검은 발캡, 상판 아래 수납함

## 시각 결정

### 1. 모델링 방향

- 외부 3D 파일 없이 Three.js primitive geometry만 사용한다.
- 상판은 2단 박스 구조로 만들어 두꺼운 모서리와 약한 bevel 느낌을 낸다.
- 수납함은 상판 아래 어두운 박스로 단순화한다.
- 다리는 얇은 금속 박스 4개로 유지해 모바일에서 깨끗하게 읽히게 한다.

### 2. 렌더링 방향

- 캐릭터/몬스터 전용 강한 toon 문법을 그대로 복제하지 않고, 동일한 `toonMat` + `outlineMat` 패턴만 재사용한다.
- 외곽선은 플레이어/적보다 약간 부드럽게 두어 배경 소품이 전면으로 튀지 않게 한다.
- 바닥 그림자 원을 약하게 추가해 책상이 공중에 뜬 것처럼 보이지 않게 한다.

### 3. 배치 방향

- Stage 1: 중앙 시작 구역을 비우고, 네 모서리 쪽에 흩어진 교실 잔해처럼 배치한다.
- Stage 2: 복도 중앙 안전 레인을 피하고 좌우 가장자리 쪽에만 배치한다.
- 충돌을 주지 않으므로 플레이 흐름을 방해하지 않는다. 다만 시각적으로도 플레이어 중심 구역은 피한다.

## 가독성 판단

- 플레이어와 적보다 채도와 밝기를 낮춰 배경 소품으로 읽히게 했다.
- 상판, 프레임, 수납함, 발캡이 색으로 즉시 분리되어 작은 화면에서도 책상으로 인식된다.
- Stage 2에서는 레인 오버레이보다 강하지 않게 유지해 복도 읽힘을 깨지 않는다.

## 남은 확인 항목

- 720x1280 세로 화면에서 책상이 너무 작게 보이지 않는지 확인
- Stage 2에서 책상이 E04 탄환 가독성을 해치지 않는지 확인
- 플레이어가 화면 가장자리로 갔을 때 책상 외곽선이 과하게 튀지 않는지 확인
