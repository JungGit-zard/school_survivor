# Round 3 UI — Escape 일시정지 및 설정 터치 영역 수정

## 실측 결함

- 320×568 로비의 `설정 열기` 버튼이 42×42px로, 최소 터치 영역 44×44px에 미달했다.
- Stage 1 `playing`에서 `P`는 pause/resume했지만 `Escape`는 반응하지 않았다.

## 최소 수정

- `Developer/r3f_prototype/src/components/Lobby.jsx`: 기존 설정 버튼의 너비/높이만 42에서 44로 변경했다. 구조·배치·동작은 그대로여서 새 겹침 경로를 만들지 않는다.
- `Developer/r3f_prototype/src/components/HUD.jsx`: 기존 `P` keydown과 동일한 `togglePause()` 호출에 `Escape`만 허용했다. `repeat` 차단과 Zustand의 `playing ↔ paused` phase guard는 그대로다. 따라서 level-up 및 terminal phase는 기존처럼 전환되지 않는다.
- 레벨업 카드는 확인 결과 이미 네이티브 `<button>`이며 `aria-label`과 `onClick`이 존재한다. 명백한 구현 결함이 없어 변경하지 않았다.

## 검증 계약

- `HUD.test.jsx`: `P`로 playing→paused, `Escape`로 paused→playing, level-up에서 `Escape`가 phase를 바꾸지 않음을 검증한다.
- `Lobby.test.jsx`: `설정 열기` 버튼의 inline width/height가 각각 `44px`임을 검증한다.

## 경계

- Firebase/RTDB, Graphics Studio/Apply, localStorage 및 인증 저장소에는 접근·변경하지 않았다.
- 이 문서는 UI 역할 기록이며, 실제 viewport 재측정은 상위 Advisor의 연결된 in-app browser에서 수행한다.
