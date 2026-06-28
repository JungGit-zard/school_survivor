# 레벨업 업그레이드 컴팩트 레이아웃 구현 기록

## 변경 요약

- `HUD.jsx`의 레벨업 UI를 기존 전체 화면 `overlay`에서 전용 `levelupOverlay`로 분리했다.
- `levelupOverlay`는 하단 고정, 최대 폭 760px, 전체 화면 높이를 덮지 않는 위치형 패널이다.
- 업그레이드 선택지는 `levelupChoices` 3열 grid로 표시한다.
- 선택 버튼은 `levelupChoiceBtn`으로 분리하고, 작은 모바일 폭에서도 카드가 3개 나란히 유지되도록 `minWidth: 0`과 `gridTemplateColumns: repeat(3, minmax(0, 1fr))`를 적용했다.
- 기존 게임오버, 클리어, 일시정지 오버레이는 그대로 유지했다.

## 수정 파일

- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/HUD.test.jsx`
