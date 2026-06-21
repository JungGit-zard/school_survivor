# Title Layout Rework Implementation - 2026-06-21

## 구현 범위

타이틀 화면의 시작/상점/치트 UI 배치를 개편했다.

변경 파일:

```text
Developer/r3f_prototype/src/components/TitleScreen.jsx
Developer/r3f_prototype/src/components/TitleScreen.settings.test.jsx
```

## 구현 내용

- 메인 하단에는 `게임 시작`과 `코인상점`만 남겼다.
- `게임 시작` 버튼은 기존 전체 폭보다 좁은 중앙 버튼으로 조정했다.
- `코인상점` 버튼은 `게임 시작` 바로 아래에 같은 가로 폭으로 배치했다.
- 우상단 설정 버튼 왼쪽에 `치트` 버튼을 추가했다.
- 기존 하단 노출형 개발 치트 영역은 제거했다.
- 치트 팝업 안에 시작 스테이지 선택, 모든 무기 해금, 코인 레벨업 초기화 버튼을 배치했다.
- 치트 팝업의 Stage 2 선택은 개발 확인용으로 잠금 조건 없이 시작 스테이지를 바꾼다.

## 검증

```text
npm test -- src/components/TitleScreen.settings.test.jsx
npm test -- src/components/TitleScreen.settings.test.jsx src/components/resultCoinShopFlow.test.jsx
npm run build
```

브라우저 확인:

```text
Quaility_Assurance/title_layout_rework_main_2026-06-21.png
Quaility_Assurance/title_layout_rework_cheat_modal_2026-06-21.png
```
