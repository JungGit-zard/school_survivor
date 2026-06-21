# 게임오버 흑백 전환 구현 기록

날짜: 2026-06-21

## 구현

- `HUD.jsx`에서 `phase === 'gameover'`일 때 흑백 전환 레이어를 표시한다.
- 게임오버 모달은 `GAMEOVER_TRANSITION_MS` 1000ms 타이머가 끝난 뒤 표시한다.
- 전환 레이어는 `backdrop-filter: grayscale(1)`과 `gameoverGrayscaleFade` 키프레임을 사용한다.
- 게임 정지는 기존 `gameover` phase 정지 흐름을 그대로 사용한다.

## 테스트

- `HUD.test.jsx`에 게임오버 직후 모달이 숨겨지고 1000ms 뒤 표시되는 테스트를 추가했다.
