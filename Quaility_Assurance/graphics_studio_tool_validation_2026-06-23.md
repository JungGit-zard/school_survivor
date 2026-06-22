# Graphics Studio Tool Validation (2026-06-23)

## 검증 대상

- `/graphics-studio` 그래픽 테스트 툴 1차 버전
- 그래픽 카탈로그, 조정 슬라이더, Confirm 저장, JSON 내보내기
- 실제 게임 리소스 프리뷰: 플레이어, Stage 2 바닥, Pencil 무기 아이콘
- 확장 프리뷰: Gold Coin, XP Textbook, Lunch Meal, Enemy Death Collapse, Title Scene 3D, Mini Health Bar
- 확정 JSON의 `applyTargets` 포함 여부

## 자동 테스트

- `npx.cmd vitest run src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx --maxWorkers=1 --no-file-parallelism`
  - 결과: 2 files / 7 tests passed
- `npx.cmd vitest run --maxWorkers=1 --no-file-parallelism`
  - 결과: 56 files / 300 tests passed
- `npm.cmd run build`
  - 결과: 성공
  - 참고: 기존 Vite chunk size warning 발생. 빌드 실패는 아님.

## 브라우저 검증

- URL: `http://127.0.0.1:5173/graphics-studio`
- 1280 x 720 스크린샷: `Quaility_Assurance/screenshots/graphics-studio-1280x720.png`
- 390 x 844 스크린샷: `Quaility_Assurance/screenshots/graphics-studio-390x844.png`
- Pencil 아이콘 스크린샷: `Quaility_Assurance/screenshots/graphics-studio-pencil-icon-1280x720.png`
- 확장 카탈로그 스크린샷: `Quaility_Assurance/screenshots/graphics-studio-expanded-1280x720.png`

## 픽셀 및 리소스 확인

- 1280 x 720 캔버스 영역 스크린샷 픽셀 샘플
  - Unique colors: 30
  - Non-dark samples: 211 / 5418
- 390 x 844 캔버스 영역 스크린샷 픽셀 샘플
  - Unique colors: 48
  - Non-dark samples: 434 / 6790
- Stage 2 바닥 텍스처, 복도 끝 벽 텍스처, Pencil 무기 아이콘 응답: 200
- Playwright 추가 클릭 검증 실패 응답: 없음
- 확장 카탈로그 최신 검증
  - 실패 응답: 없음
  - 콘솔 error/warning: 없음
  - 1280 x 720 shell: 1280 x 720
  - 확정 JSON에 `components/GoldCoin.jsx` apply target 포함 확인
  - Gold Coin 프리뷰 캔버스 픽셀 샘플: unique colors 12, non-dark samples 177 / 5418

## 판정

- 1차 그래픽 테스트 툴은 실행, 확인, 저장, JSON 내보내기까지 동작한다.
- 데스크톱 1280 x 720 안에서 주요 레이아웃이 들어오며, 좁은 화면에서는 세로 스크롤 구조로 겹침 없이 표시된다.
- 툴에서 확정한 값은 아직 게임 코드에 자동 반영되지 않는다. Confirmed JSON의 `applyTargets`를 보고 Codex가 후속 작업에서 실제 게임 값으로 옮기는 방식이다.

## 적대적 검수 추가 기록

- 검수 관점
  - 타이틀 3D 씬이 보기만 되고 슬라이더 조정에서 빠지는지 확인했다.
  - 색상 입력이 실제 Confirm JSON에 반영되는지 `input` 이벤트 기준으로 확인했다.
  - 확장 카탈로그 항목 클릭 중 콘솔 error/warning, 4xx 리소스 응답, 1280 x 720 레이아웃 이탈이 있는지 확인했다.
- 발견 및 조치
  - 타이틀 3D 씬이 일반 프리뷰 루트와 분리되어 있어 튜닝 적용이 약했다. `TitleScene3D`에 스튜디오 전용 tuning/ref 연결을 추가했다.
  - color input이 `change`만 듣고 있어 자동 검증의 즉시 입력 시 Confirm JSON에 반영되지 않았다. `onInput`도 처리하도록 수정했다.
- 재검증
  - `npx.cmd vitest run src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/TitleScene3D.test.jsx --maxWorkers=1 --no-file-parallelism`
    - 결과: 3 files / 9 tests passed
  - `npx.cmd vitest run --maxWorkers=1 --no-file-parallelism`
    - 결과: 56 files / 300 tests passed
  - `npm.cmd run build`
    - 결과: 성공
  - Playwright 적대적 검증
    - 확장 항목 클릭 실패 응답: 없음
    - 콘솔 error/warning: 없음
    - Title Scene 3D Confirm JSON: `title-scene`, `components/TitleScene3D.jsx`, `scale: 1.35`, `color: #88ffaa`, `colorStrength: 0.55` 확인
    - 스크린샷: `Quaility_Assurance/screenshots/graphics-studio-adversarial-1280x720.png`
