# Stage Lighting Worker Handoff — 2026-08-26

## 작업 범위
- Kanban task: `t_94152aa8`
- 역할: `threemini` lighting implementation lane
- 기준 콘셉트: `D:/JungSil/2.Minigame_project/school_survivor-integration/Planner/stage_lighting_concept_map_2026-08-26.md`
- 구현 파일: `src/lib/stageLightingProfile.js`
- 검증 파일: `src/lib/stageLightingProfile.test.js`, `src/lib/stageFloorLightBake.test.js`, `src/components/Game.stageLighting.test.js`

## 구현 원칙
- 런타임 `spotLight`/`pointLight`는 추가하지 않았다.
- `stageLightingProfile.js`를 색/좌표/강도 단일 정본으로 유지했다.
- 기존 `stageFloorLightBake.js` → `ClassroomFloor.jsx` baked floor `lightMap` 경로를 그대로 사용했다.
- 색은 더 명확하게 하되 어둡거나 공포스럽지 않게 조정했다.

## Stage 1 — 따뜻한 교실 위기
- 앞쪽 칠판/문 구역: `#78DDE8`, target `[0, 0, -9]`, distance `15u` = `18.75 blocks`.
- 중앙 책상 군집 보조광: `#E9A6FF`, target `[-4.5, 0, 0]`, distance `13.5u` = `16.875 blocks`.
- 뒷문/탈출 방향: `#FFE08A`, target `[0, 0, 9]`, distance `15u` = `18.75 blocks`.
- 의도: 기존 네온 파랑/보라를 더 부드러운 민트/연보라/노랑 교실 톤으로 낮춰 모바일 판독성을 우선한다.

## Stage 2 — 복도 추격 가독성 라인
- 북쪽 복도 끝: `#7EC8FF`, target `[0, 0, -12]`, distance `16u` = `20 blocks`.
- 중앙 이동 streak: `#FFC56E`, target `[0, 0, 0]`, distance `14.5u` = `18.125 blocks`, angle `0.58`로 폭을 줄였다.
- 남쪽 복도 끝: `#7FE7D4`, target `[0, 0, 12]`, distance `16u` = `20 blocks`.
- 의도: 보라 무대감 대신 파랑/민트 끝점과 얇은 따뜻한 중앙 라인으로 복도 진행 방향을 읽게 한다.

## Stage 3 — 밝은 체육관/스포츠 데이
- 북쪽 코트/벽 창빛: `#6FD6FF`, target `[0, 0, -11]`, distance `17u` = `21.25 blocks`.
- 중앙 나무마루 반사광: `#FFD37A`, target `[0, 0, 0]`, distance `15.5u` = `19.375 blocks`.
- 남쪽 농구 골대 포인트: `#FF9A3D`, target `[0, 0, 13]`, distance `16.5u` = `20.625 blocks`.
- 의도: 기존 보라/핑크 무대 조명을 스포츠 주황/목재광/하늘빛으로 교체해 남쪽 농구 골대와 충돌하지 않게 했다.

## Stage 4 — 깨끗한 급식실/주방 민트 옐로우
- 북쪽 조리/준비 구역: `#8DEBD1`, target `[0, 0, -10]`, distance `14u` = `17.5 blocks`.
- 중앙 압력 가마솥 위험 구역: `#FFE27A`, target `[0, 0, 0]`, distance `11u` = `13.75 blocks`, intensity `142`로 낮춰 안전지대처럼 과장하지 않았다.
- 남쪽 배식/탈출 방향: `#DFF6FF`, target `[0, 0, 10]`, distance `14u` = `17.5 blocks`.
- 의도: Stage 4 empty profile을 밝은 민트/노랑/크림 baked lightMap으로 교체해 흰 세라믹 타일과 주방 소품을 살린다.

## 검증 결과
- `npm.cmd exec -- vitest run src/lib/stageLightingProfile.test.js src/lib/stageFloorLightBake.test.js src/components/Game.stageLighting.test.js`
  - PASS: 3 files, 30 tests.
- `npm run build`
  - PASS: prebuild gates, studio-game sync tests 41개, production build, postbuild B02 artifact/hosting asset verification.
  - 기존 빌드 경고: 큰 chunk 경고 및 ineffective dynamic import 경고가 출력됐으나 빌드는 성공했다.
- `Game.stageLighting.test.js`가 runtime `spotLight`/`pointLight` 재도입 없음과 ambient 1 + directional 2 유지를 확인했다.

## 스크린샷 상태
- 이 구현 카드에서는 브라우저 스크린샷을 새로 캡처하지 않았다. 변경은 runtime light 추가가 아닌 baked floor lightMap 프로필/테스트 갱신이고, 최종 모바일 스크린샷 판정은 이미 의존 child `t_d7f5169d` Balance_QA acceptance lane에서 수행하도록 그래프가 잡혀 있다.

## 변경 파일
- `src/lib/stageLightingProfile.js`
- `src/lib/stageLightingProfile.test.js`
- `src/lib/stageFloorLightBake.test.js`
- `Developer/agent_room/stage_lighting_worker_handoff_2026-08-26.md`

## 보존/주의
- `src/components/GraphicsStudio.jsx`는 읽거나 수정하지 않았다.
- `src/components/Game.jsx`, `src/components/ClassroomFloor.jsx`, `src/lib/stageFloorLightBake.js`의 runtime/lightMap architecture는 변경하지 않았다.
- 작업 전부터 있던 다른 dirty 파일은 건드리지 않았다.
