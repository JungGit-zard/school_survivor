# Stage Lighting Concept Map — 2026-08-26

## 목적

모바일에서 읽히는 귀엽고 블록감 있는 3D 학교 생존 게임 톤을 기준으로, 현재 구현된 Stage 1~4의 시각 정체성과 바닥 lightMap/프로필 조정 방향을 정리한다. 이 문서는 구현 전 콘셉트/수치 정본 후보이며, 후속 `threemini` 조명 구현 카드가 코드와 테스트를 갱신할 때 입력으로 사용한다.

## 사전 게이트 / 근거

- Mandatory pre-command gate 확인:
  - `matched_domains`: `graphics`, `gameplay`
  - `match_evidence`: `visual` → graphics, `stage` → gameplay
  - `combined_receipt_sha256`: `5e308a586730db9d96bdf095bc234099457fde87f86b538a70489ff8c5f6c025`
- 프로젝트 우선순위: Stage 1 모바일/플레이어블 루프 안정화를 우선하고, 새 콘텐츠 확장보다 기존 스테이지 가독성/성능 회귀 방지가 우선이다.
- 조명 구현 제약: 실시간 `spotLight`를 부활시키지 않는다. 현재 구조처럼 `stageLightingProfile.js`의 정적 색 구역을 `stageFloorLightBake.js`에서 바닥 `lightMap`으로 굽는다.
- 공통 바닥 블록 기준: Stage 4 타일 계약 기준 `1 block = 0.8u`로 환산한다.

## 현재 코드 관찰 요약

- 공통 런타임 조명은 `Game.jsx`의 `ambientLight intensity=0.38` 1개와 `directionalLight` 2개가 유지된다.
- 색 구역은 `stageLightingProfile.js` → `stageFloorLightBake.js` → `ClassroomFloor.jsx`의 `lightMap`으로 들어간다.
- 현재 프로필은 Stage 1~3만 존재하며, Stage 4는 `EMPTY_STAGE_LIGHTING_PROFILE`이다.
- `Game.stageLighting.test.js`는 런타임 `spotLight`/`pointLight` 재도입 금지를 검사한다.
- `stageLightingProfile.test.js`는 현재 Stage 1~3의 정확한 조명 값을 고정하고 Stage 4 empty를 고정한다. Stage 4 조명을 구현한다면 테스트도 명시적으로 갱신해야 한다.

## 스테이지별 맵/블록 환산

| Stage | 현재 제목 | half bounds | 전체 크기 | 블록 환산(1 block = 0.8u) |
|---|---|---:|---:|---:|
| Stage 1 | 교실 생존 | halfX 10u / halfZ 14.4u | 20u × 28.8u | 25 blocks × 36 blocks |
| Stage 2 | 복도 투사체 시험 | halfX 7.5u / halfZ 19.2u | 15u × 38.4u | 18.75 blocks × 48 blocks |
| Stage 3 | 체육관 총력전 | halfX 7.5u / halfZ 19.2u | 15u × 38.4u | 18.75 blocks × 48 blocks |
| Stage 4 | 급식실 대탈출 | halfX 9.36u / halfZ 16u | 18.72u × 32u | 23.4 blocks × 40 blocks |

## 전체 아트 방향

- 밝고 읽히는 학교 생존: 어둡고 공포스러운 조명 금지.
- 모바일 우선: 작은 화면에서 바닥/적/플레이어/소품이 서로 분리되어 보여야 한다.
- 블록감은 유지하되, 일반 큐브 더미처럼 보이지 않도록 색 구역과 상징색으로 스테이지 정체성을 만든다.
- 성능 우선: 스테이지별 분위기는 런타임 광원 증가가 아니라 baked floor lightMap, 바닥 색, 머티리얼 톤으로 해결한다.

## Stage 1 — 따뜻한 교실 위기 / Warm Classroom Survival

### 콘셉트

따뜻한 교실 조명 안에서 장난감 같은 학교 소품이 읽히는 초반 생존 공간. 위기는 있지만 색감은 친근해야 한다. Stage 1은 제품 우선순위상 가장 안정적으로 읽혀야 하는 모바일 기준 스테이지다.

### 현재 프로필

- 북쪽/상단 구역: `#3CCBFF`, position `[-1, 7, -12.5]`, target `[0, 0, -9]`, distance `15u` = `18.75 blocks`
- 중앙 좌측 구역: `#B96CFF`, position `[-7, 6, 0]`, target `[0, 0, 0]`, distance `14u` = `17.5 blocks`
- 남쪽/하단 구역: `#FFD166`, position `[1, 7, 12.5]`, target `[0, 0, 9]`, distance `15u` = `18.75 blocks`

### 조정 방향

- 파란/보라 대비가 교실보다 네온 이벤트장처럼 보이면 Stage 1은 노란 창빛/크림/연분홍 보조 톤으로 낮춘다.
- 추천 색 구역:
  1. 칠판/앞문 쪽: 부드러운 민트-하늘색, 목표 지점 z `-9u` = `-11.25 blocks`
  2. 중앙 책상 군집: 연보라/분홍 보조광, 목표 지점 x `-4u~-6u` = `-5~ -7.5 blocks`
  3. 뒷문/탈출 방향: 따뜻한 노랑, 목표 지점 z `9u` = `11.25 blocks`
- Stage 1에서는 밝기 피크를 과하게 올리지 말고, 캐릭터와 E01/E02 실루엣이 바닥에 묻히지 않는 정도의 부드러운 구역감만 준다.

### 수용 기준

- 390×844 모바일 화면에서 플레이어, E01/E02, 책상/의자 콜라이더가 바닥 조명 때문에 흐려지지 않는다.
- 중앙 플레이존은 최소 `12u × 24u` = `15 blocks × 30 blocks` 범위에서 적/아이템 판독성이 유지된다.
- 실시간 `spotLight` 추가 없음.

## Stage 2 — 복도 추격 / Corridor Chase Readability Lanes

### 콘셉트

긴 복도형 스테이지. 가로가 좁고 세로가 긴 구조를 조명으로 강조하되, 어둡게 몰아넣지 않는다. 투사체와 회피 라인이 잘 보여야 한다.

### 현재 프로필

- 북쪽 복도 끝: `#D85CFF`, position `[0, 7, -18]`, target `[0, 0, -12]`, distance `16u` = `20 blocks`
- 중앙 안전 streak: `#FFB45B`, position `[-6, 6, 0]`, target `[0, 0, 0]`, distance `15u` = `18.75 blocks`
- 남쪽 복도 끝: `#5E86FF`, position `[2, 7, 17]`, target `[0, 0, 12]`, distance `16u` = `20 blocks`

### 조정 방향

- 복도 폭은 전체 `15u` = `18.75 blocks`이므로 좌우 조명보다 Z축 길이감을 우선한다.
- 추천 색 구역:
  1. 먼 복도 끝: 차가운 하늘/파랑, target z `-12u` = `-15 blocks`
  2. 중앙 이동 라인: 따뜻한 노랑/주황, target z `0u`
  3. 탈출 방향: 밝은 파랑/민트, target z `12u` = `15 blocks`
- 기존 `STAGE2_CORRIDOR_LANES`의 safe lane 계열 색과 충돌하지 않도록, 중앙 조명은 바닥 lane을 덮는 강한 채도가 아니라 얇은 streak 느낌이어야 한다.

### 수용 기준

- 가로 폭 `15u` = `18.75 blocks` 전체에서 좌우 벽/복도 장식과 적 투사체가 분리되어 보여야 한다.
- 북/남 끝 조명은 `distance 16u` = `20 blocks` 안에서만 강하고, 중앙 이동 판단을 방해하지 않는다.
- E04 투사체 궤적이 조명색과 섞여 사라지지 않는다.

## Stage 3 — 밝은 체육관/스포츠 데이 / Bright Gym Sports Festival

### 콘셉트

현재 작업 흐름의 핵심 그래픽 목표. 남쪽 농구 골대/공 교체와 함께, 체육관은 밝고 귀여운 스포츠 행사장처럼 보여야 한다. 공포 조명보다 나무마루, 흰 코트 라인, 주황/파랑 스포츠 포인트를 살린다.

### 현재 프로필

- 북쪽: `#54C7FF`, position `[-1, 8, -17]`, target `[0, 0, -11]`, distance `17u` = `21.25 blocks`
- 중앙 좌측: `#A77BFF`, position `[-7, 7, 0]`, target `[0, 0, 0]`, distance `16u` = `20 blocks`
- 남쪽: `#F08CFF`, position `[1, 8, 17]`, target `[0, 0, 11]`, distance `17u` = `21.25 blocks`

### 조정 방향

- Stage 3의 현재 보라/분홍은 체육관보다 무대 조명처럼 읽힐 수 있다. 농구 콘셉트와 맞추려면 남쪽은 주황/노랑, 중앙은 따뜻한 목재광, 북쪽은 청량한 체육관 창빛으로 정리한다.
- 추천 색 구역:
  1. 북쪽 코트/벽: 청량한 하늘색 `#6FD6FF` 계열, target z `-11u` = `-13.75 blocks`
  2. 중앙 코트: 따뜻한 목재 반사광 `#FFD37A` 계열, target `[0,0,0]`
  3. 남쪽 농구 골대: 밝은 주황/핑크가 아니라 스포츠 주황 `#FF9A3D` + 크림 보조, target z `11u~15.8u` = `13.75~19.75 blocks`
- 남쪽 농구 골대가 `z≈15.8~16.2u` = `19.75~20.25 blocks`로 당겨질 수 있으므로, 남쪽 조명 target은 골대보다 약간 안쪽인 `z≈12u~14u` = `15~17.5 blocks`가 안전하다.

### 수용 기준

- 남쪽/6시 농구 골대가 375×667, 393×851, 430×932 모바일 화면에서 검은 덩어리나 깨진 박스가 아니라 rim/backboard/ball로 읽힌다.
- 체육관 바닥 흰 라인은 캐릭터 위에 떠 보이지 않고 바닥에 붙어 보인다.
- 조명 때문에 코트 라인, 농구공 주황, 적 실루엣이 서로 묻히지 않는다.

## Stage 4 — 깨끗한 급식실/주방 민트 옐로우 / Clean Cafeteria Kitchen Accent

### 콘셉트

하얀 세라믹 타일과 급식실/주방 도구가 살아 있는 밝은 후반 스테이지. 위험은 압력 가마솥과 적 패턴에서 오고, 조명은 병원/공포가 아니라 깨끗한 민트·노랑·흰색 주방 톤으로 간다.

### 현재 상태

- Stage 4 floor tile은 `tile_stage04_white_ceramic.webp`를 사용한다.
- 현재 조명 프로필은 없음: `getStageLightingProfile('stage4') === EMPTY_STAGE_LIGHTING_PROFILE`.
- 맵 크기: `18.72u × 32u` = `23.4 blocks × 40 blocks`.
- Stage 4 소품 정책: 중앙에는 압력 가마솥 1개만, 대형 가구는 벽/외곽 위주, 통과 가능한 잡동사니와 blocking 대형 소품 구분.

### 구현 후보 프로필

후속 구현 시 Stage 4에도 3개 baked color-zone 프로필을 추가하는 후보:

1. 북쪽 조리/준비 구역
   - color: 민트 `#7FFFD4` 또는 `#8DEBD1`
   - position 후보: `[0, 7, -13]`
   - target 후보: `[0, 0, -10]`
   - target z `-10u` = `-12.5 blocks`
   - distance 후보: `13u~15u` = `16.25~18.75 blocks`
2. 중앙 압력 가마솥 위험 구역
   - color: 따뜻한 노랑 `#FFE27A` 또는 낮은 채도의 살구색
   - position 후보: `[0, 6.5, 0]`
   - target 후보: `[0, 0, 0]`
   - distance 후보: `10u~12u` = `12.5~15 blocks`
   - 주의: 중심 위험을 너무 강조해 안전지대처럼 보이게 만들지 않는다.
3. 남쪽 배식/탈출 방향 구역
   - color: 깨끗한 크림/하늘빛 `#DFF6FF` 또는 밝은 노랑-흰색
   - position 후보: `[1.5, 7, 12]`
   - target 후보: `[0, 0, 10]`
   - target z `10u` = `12.5 blocks`
   - distance 후보: `13u~15u` = `16.25~18.75 blocks`

### 수용 기준

- Stage 4 전체 폭 `18.72u` = `23.4 blocks`, 깊이 `32u` = `40 blocks` 안에서 타일 반복과 조명 구역이 늘어나거나 찌그러져 보이지 않는다.
- 압력 가마솥 주변 중앙 `±2u` = `±2.5 blocks` 범위가 지나치게 밝아 위험 판독을 방해하지 않는다.
- E04 시야/투사체와 blocking 주방 소품의 판독성이 조명에 묻히지 않는다.
- Stage 4 조명 프로필을 추가한다면 `stageLightingProfile.test.js`의 Stage 4 empty 기대값을 새로운 명시 기대값으로 바꾼다.

## 구현 핸드오프 — threemini

1. `src/lib/stageLightingProfile.js`만 조명 색/좌표/강도의 단일 정본으로 유지한다.
2. `src/lib/stageFloorLightBake.js`에는 색·좌표 값을 복제하지 않는다.
3. `src/components/Game.jsx`에 런타임 `spotLight`/`pointLight`를 추가하지 않는다.
4. Stage 1~3 값을 바꾸거나 Stage 4를 추가하면 다음 테스트를 함께 갱신한다.
   - `src/lib/stageLightingProfile.test.js`
   - `src/lib/stageFloorLightBake.test.js`
   - `src/components/Game.stageLighting.test.js`
5. Stage 3 농구 골대 구현과 조명이 충돌하지 않도록, 남쪽 주황 조명은 골대/공 색을 덮지 않는 범위에서만 사용한다.
6. Stage 4는 프로필이 없던 상태에서 새로 추가되는 변경이므로, 테스트와 스크린샷에서 before/after 차이를 명확히 남긴다.

## QA 핸드오프 — Balance_QA_Mini

모바일 스크린샷/플레이 확인 시 다음을 본다.

- 공통:
  - 375×667, 393×851, 430×932 세 크기에서 플레이어·적·아이템·소품이 바닥색에 묻히지 않는다.
  - 런타임 광원 수가 늘지 않았고 성능 저하/프레임 흔들림이 없다.
  - 스테이지 전환 후 이전 스테이지 lightMap 색이 남지 않는다.
- Stage 1:
  - Stage 1 중앙 `12u × 24u` = `15 × 30 blocks` 플레이존이 가장 안정적으로 읽힌다.
  - 책상/의자 충돌체가 그림자로 과장되어 길막처럼 오독되지 않는다.
- Stage 2:
  - `15u × 38.4u` = `18.75 × 48 blocks` 복도에서 Z축 이동 라인과 투사체가 구분된다.
- Stage 3:
  - 남쪽 농구 골대/공과 조명이 함께 보일 때 모바일에서 rim/backboard/ball 실루엣이 읽힌다.
  - 코트 라인과 조명이 적 히트박스/무기 이펙트 판독을 방해하지 않는다.
- Stage 4:
  - `18.72u × 32u` = `23.4 × 40 blocks` 급식실에서 중앙 압력 가마솥과 외곽 주방 소품이 분리되어 보인다.
  - 중앙 `±2u` = `±2.5 blocks` 압력 가마솥 위험 구역은 예쁘게 보이되 안전 구역처럼 오해되지 않는다.

## 완료 조건

- 이 문서를 기반으로 후속 구현자가 조명 프로필 후보를 코드에 반영할 수 있다.
- 수치가 모두 월드 유닛과 블록 환산을 함께 가진다.
- 조명 방향은 모바일 가독성, 귀여운 블록 스타일, 비공포 톤, 런타임 광원 0개 유지 원칙과 충돌하지 않는다.
- Balance_QA_Mini가 바로 사용할 수 있는 stage별 QA 체크리스트가 포함되어 있다.
