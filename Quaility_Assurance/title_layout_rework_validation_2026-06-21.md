# Title Layout Rework Validation - 2026-06-21

## 검증 대상

타이틀 화면 레이아웃 개편과 치트 팝업 기능을 확인했다.

## 검증 항목

- `게임 시작` 버튼이 기존 전체 폭보다 좁은 중앙 버튼으로 보이는지 확인.
- `코인상점` 버튼이 `게임 시작` 바로 아래 같은 폭으로 배치되는지 확인.
- 우상단 설정 버튼 왼쪽에 `치트` 버튼이 있는지 확인.
- 메인 화면에 Stage 선택과 개발 치트 버튼이 노출되지 않는지 확인.
- 치트 팝업에 시작 스테이지 선택, 모든 무기 해금, 코인 레벨업 초기화 버튼이 있는지 확인.
- 치트 팝업에서 Stage 2를 선택하면 `게임 시작`이 Stage 2로 시작하는지 테스트로 확인.

## 자동 검증

```text
npm test -- src/components/TitleScreen.settings.test.jsx
Test Files 1 passed (1)
Tests 9 passed (9)

npm test -- src/components/TitleScreen.settings.test.jsx src/components/resultCoinShopFlow.test.jsx
Test Files 2 passed (2)
Tests 12 passed (12)

npm run build
✓ built in 3.19s
```

`npm run build`는 성공했으며, Vite의 기존 500 kB 초과 chunk 경고만 출력했다.

## 브라우저 검증

490 x 612 뷰포트에서 확인했다.

```text
게임 시작: x=133, y=482, width=225, height=60
코인상점: x=133, y=552, width=225, height=44
치트 버튼: x=362, y=16, width=56, height=44
설정 버튼: x=430, y=16, width=44, height=44
메인 Stage 선택 노출: false
메인 개발 기능 노출: false
```

증거 파일:

```text
Quaility_Assurance/title_layout_rework_main_2026-06-21.png
Quaility_Assurance/title_layout_rework_cheat_modal_2026-06-21.png
```
