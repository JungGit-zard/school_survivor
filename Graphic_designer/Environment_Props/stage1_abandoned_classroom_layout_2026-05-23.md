# Stage 1 — "Abandoned Classroom" Layout

작성일: 2026-05-23
관련 plan: `docs/plans/2026-05-22-001-feat-stage1-abandoned-classroom-graphics-plan.md`
관련 brainstorm: `docs/brainstorms/2026-05-20-stage-graphic-redesign-requirements.md`
정본 가이드: `Graphic_designer/Concept_Rules/color_palette_guide.md`, `current_visual_rules.md`

---

## 1. 결정 요약

1스테이지 무대를 회색 콘크리트 + 격자선 프로토타입에서 "버려진 교실 장면"으로 재구성. R3F 단일 스택, 정적 무대 (5분 세션 중 시각 변화 없음). 컬러 팔레트 가이드의 Survival Horror 32 마루 계열을 정본으로 채택.

- 무대 톤: 교실·복도 (나무 마루) — `stage_graphic_cons.md`의 "운동장 + 본관"과 충돌 시 교실 톤 우선.
- 격자 라인 완전 제거 — 마루 판자 이음새가 시각 그리드를 대신.
- 접근법: 정본 충실 "버려진 교실 장면" (Approach A — Approach B 가독성 우선·C 시간 변화 아님).

---

## 2. 바닥 — Procedural Plank Texture

`src/components/Floor.jsx`에서 1024×1024 `HTMLCanvasElement`로 plank 패턴을 그려 `THREE.CanvasTexture`로 적용. 텍스처 자산 파일 없이 코드만으로 완결.

| 항목 | 값 |
|---|---|
| 캔버스 크기 | 1024×1024 px |
| plank 줄 수 | 16 줄 (텍스처 1회 반복 안) |
| 텍스처 반복 | `repeat.set(12, 12)` — 96 unit plane을 12회 반복 = 텍스처 1회 폭 8 world unit |
| 결과 plank 폭 (world) | 0.5 unit (TILE_SIZE 4 unit 안에 8 plank) |
| 이음새 굵기 | 2 px (가로) + 줄마다 가변 세로 |

색 팔레트 (`color_palette_guide.md` §2-1):

| 역할 | hex |
|---|---|
| plank 주색 | `#a99a73` |
| plank 밝은 변형 | `#c9cb9f` |
| plank 어두운 변형 | `#805947` |
| 이음새 | `#623333` |

추가 처리: row마다 3 단위로 변형 색 35% alpha 오버레이로 plank 별 톤 변화, 마지막에 GRAIN_ALPHA 0.05의 픽셀 노이즈로 나무결 표현.

---

## 3. Props (외곽 6종) — 충돌 정책 준수

배치 영역: outer 6-12 블록 링 (±24 ~ ±48 world units). 중앙 4 블록 (±16) 회피 공간 비움. 충돌 가능 props의 footprint 합 ≤ 맵 면적의 15% — `stagePropsLayout.test.js`가 자동 검증.

| Key | 한글명 | 충돌 | 색 |
|---|---|---|---|
| `fallen_desk` | 쓰러진 책상 | ○ | 상판 `#805947` + 다리 `#5c6174` |
| `chair_pile` | 의자 더미 | ○ | 좌판 `#805947` + 프레임 `#8c929e` |
| `contaminated_locker` | 오염된 사물함 | ○ | 본체 `#6f779e` + 문짝 `#514a78` + 오염 얼룩 `#41745a` + 손잡이·환풍구 `#2d2738` |
| `safety_cone` | 안전 콘 | ○ | 콘 `#e99039` + 흰띠 `#c9cb9f` + 베이스 `#2d2738` |
| `barricade_small` | 작은 바리케이드 | ○ | 다리 `#9a826b` + 가로대 노란 `#f4e27b` + 줄무늬 검정 `#2d2738` |
| `warning_tape` | 감염 경고 테이프 | × | 노란 `#f4e27b` + 사선 검정 `#2d2738` |

공통 패턴: `XpTextbook.jsx` mirror — multi-mesh group, 각 부위마다 `toonMat` 본체 + `outlineMat()` BackSide inflated hull pair. 충돌 가능 props는 `<RigidBody type="fixed" colliders="cuboid">` + invisible footprint mesh로 감쌈.

---

## 4. Atmosphere Overlays (3종) — 분위기 보강

충돌 없음. 외곽선은 `outlineMat(0.5, 0x3a2a2a)` 부드러운 색 + 낮은 opacity 두 축 모두로 props보다 시각 위계 약하게.

| Key | 한글명 | 핵심 |
|---|---|---|
| `exam_paper` | 찢어진 시험지 | 크림색 본체 + 흐릿한 빨강 줄 + 옆에 회전된 작은 찢김 조각 |
| `pollution_puddle_static` | 환경 오염 웅덩이 (정적) | 채움 `#41745a` 어두운 채도 + 외곽 `#95bf91` 밝은 ring + 작은 spot 2개 |
| `window_shadow_broken` | 깨진 창문 그림자 | 반투명 `#2d2738` 사각 + 격자 가로/세로 + 깨진 조각 2개 |

---

## 5. 환경 오염 vs 보스 오염 장판 시각 구분 — R10 결정

**채도·명도 차원만**으로 구분 (Phase 0.5 사용자 결정). 외곽선 굵기 차이·펄스 애니메이션 미사용.

| 요소 | 채움 | 외곽 | 동작 |
|---|---|---|---|
| 환경 오염 웅덩이 (정적) | `#41745a` (어두운 채도) | `#95bf91` (밝은 ring) | 정적, 항상 화면 |
| 보스 오염 장판 (동적) | 더 선명한 위험 톤 (`vfxPalette.js` 정본) | 더 명확한 위험 외곽 | 보스 spawn 시 동적 출현, 펄스 |

플레이어는 색의 명도·동적 동작으로 즉시 구분 가능 (AE2). `vfxPalette.js`의 보스 장판 색은 본 plan에서 변경 안 함.

---

## 6. Layout 결정 — `stagePropsLayout.js`

18 entry (props 12 + atmosphere 6). 네 변·네 모서리에 분산 배치 — 어느 시작 위치에서도 화면 가장자리에 props가 보이도록.

배치 원칙:
- prop은 outer ring 안 (한 축 |coord| ≥ 24).
- atmosphere overlay는 outer ring 안에서도 prop과 겹치지 않게.
- y 좌표: prop=0 (바닥), atmosphere=0.012 (z-fight 방지로 살짝 띄움).
- 좌표는 디자인 의도에 따라 분산, layout 테스트 통과가 정답.

자동 검증 (`stagePropsLayout.test.js`):
- 6 prop kind + 3 atmosphere kind 모두 최소 1개 등장.
- 중앙 ±16 unit 안 prop 없음.
- 충돌 footprint 합 ≤ 15%.
- 모든 entry가 outer ring 안.

---

## 7. R3F props 시스템 첫 도입 — 인프라 노트

본 plan 이전 R3F 코드에 정적 props 시스템 부재. 이번 작업으로 다음 인프라를 처음 도입:

1. `src/lib/toon.js` `outlineMat(opacity, color)` color 파라미터 확장 — backward compatible (기존 호출 변경 무).
2. `src/components/Props/` 디렉토리 + barrel — 6 props 컴포넌트.
3. `src/components/Atmosphere/` 디렉토리 + barrel — 3 overlay 컴포넌트.
4. `src/lib/stagePropsLayout.js` — 단일 진실 배치 데이터 + pure-function 헬퍼.
5. `src/components/StageProps.jsx` — kind → 컴포넌트 dispatch orchestrator.
6. `src/components/Game.jsx` 마운트: `<Floor />` 바로 뒤, `<LunchItems />` 앞.

향후 2스테이지 무대 톤 변형은 본 인프라(`StageProps` + `stagePropsLayout`)를 재사용해 별 plan으로 추가 가능.

---

## 8. 본 작업 밖 (Brainstorm scope boundaries 그대로)

- 운동장 모티프 (트랙·콘크리트·본관 실루엣)
- 시간 진행에 따른 분위기 변화 (Approach C)
- 보스·엘리트 VFX 신규/보강 — `vfxPalette.js`의 보스 장판 색 변경 안 함
- 캐릭터·적·무기 시각 변경
- 실시간 그림자·정교한 라이팅 변경
- 2스테이지 또는 다른 무대 톤
- HUD·UI 시각 변경

Deferred to Follow-Up:
- `<Stats />` overlay (R12 fps 검증 도구)
- 모바일 중저사양 프레임 측정

---

## 9. 검증

- `npm test` 그린 유지 (회귀 없음).
- `stagePropsLayout.test.js`로 R5·R6·R8·AE1 자동 검증.
- 시각 검증은 dev 서버 + 9:16 모바일 frame(390×844)에서 수동:
  - 첫 30초 화면이 "버려진 교실"로 인식 (success criteria).
  - 격자 라인 사라짐.
  - 외곽 props 12개가 보임.
  - 환경 오염 웅덩이가 보스 등장 시 동적 장판과 명확히 구분.
  - 3-4분 적 ~30마리 + 투사체 동시 표시 시 플레이어 가독성 유지.
  - 0:00과 4:59 무대 그래픽 동일 (정적).

---

## 10. 다음 작업

- `/ce-compound`로 본 인프라를 `docs/solutions/architecture-patterns/`에 적립 (R3F rendering 도메인 첫 학습).
- 수동 시각 검증 후 props 크기·색·정확한 좌표 미세 조정.
- 필요 시 `<Stats />` overlay 별 PR로 추가 → R12 정량 검증.
