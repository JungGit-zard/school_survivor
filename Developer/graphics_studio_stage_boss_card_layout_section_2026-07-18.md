# Graphics Studio 스테이지 보스 카드 레이아웃 섹션 구분

## 목적

Inspector에서 스테이지 보스 카드의 미리보기 구도를 조정하는 항목을 일반 모델 변형 항목과 명확히 구분한다.

## 구현

- 섹션 제목을 `Stage Boss Card Layout`으로 구체화했다.
- 보스 미리보기와 `Preview Zoom`, `Preview Pan X`, `Preview Pan Y`를 하나의 의미 있는 섹션으로 묶었다.
- 녹색 상단 강조선, 전체 테두리, 전용 배경, 둥근 모서리와 약한 그림자를 적용했다.
- 접근성 이름과 테스트 식별자를 추가했다.

## 변경 파일

- `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudio.test.jsx`

## 검증

- `npm.cmd exec -- vitest run src/components/GraphicsStudio.test.jsx`
- 결과: 테스트 파일 1개, 테스트 26개 통과
- 데스크톱 1280×720 및 모바일 390×844 Chrome 화면 확인
