# Graphics Studio Tool Implementation (2026-06-23)

## 구현 요약

- `/graphics-studio` 라우트를 추가해 게임과 분리된 그래픽 테스트 화면을 열 수 있게 했다.
- `graphicsStudioConfig.js`에 그래픽 카탈로그, 기본 조정값, localStorage 저장, JSON 내보내기 로직을 추가했다.
- `GraphicsStudio.jsx`에 카탈로그, 슬라이더 인스펙터, 확정 버튼, JSON 확인 영역을 구현했다.
- `GraphicsStudioPreview.jsx`에서 실제 게임 그래픽 컴포넌트와 에셋을 three.js 캔버스에 렌더링한다.
- 픽업, 타이틀 3D 씬, UI 체력바, 적 사망 분해 연출까지 카탈로그 범위를 넓혔다.
- 각 카탈로그 항목에 `applyTargets`를 추가해 확정 JSON만 보고도 실제 적용 후보 파일을 찾을 수 있게 했다.
- 타이틀 3D 씬도 스튜디오 안에서는 `studioTuning`과 `studioGroupRef`를 통해 스케일, 회전, 색감 조정이 반영되도록 연결했다.
- 컬러 입력도 `input` 이벤트를 받아 슬라이더처럼 즉시 draft tuning에 반영되도록 했다.

## 적용 파일

- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
- `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
- `Developer/r3f_prototype/src/components/LunchItems.jsx`
- `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
- `Developer/r3f_prototype/index.html`

## 테스트

- `graphicsStudioConfig.test.js`: 카탈로그 범위, 값 정규화, 저장/로드, JSON 직렬화를 검증한다.
- `GraphicsStudio.test.jsx`: UI 목록, 슬라이더, 확정 저장, JSON 반영을 검증한다.

## 후속 반영 방식

- 툴에서 Confirm한 JSON을 사용자 또는 Codex가 확인한다.
- 승인된 값과 `applyTargets`를 함께 확인한 뒤 실제 게임 상수와 컴포넌트 재질값으로 옮긴다.
- 값 적용 후에는 게임 플레이 화면에서 별도 QA를 진행한다.
