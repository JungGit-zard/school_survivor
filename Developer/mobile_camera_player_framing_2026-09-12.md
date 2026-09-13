# 모바일 게임 카메라 플레이어 프레이밍 (2026-09-12)

`Game.jsx`의 원근 카메라가 먼 쪽 바닥 폭으로만 가로 follow를 멈추던 문제를 수정했다. 플레이어가 가까운 쪽 행에서 좌우 화면 밖으로 잘릴 수 있었다.

`src/lib/gameCameraFraming.js`은 카메라 높이·뒤쪽 거리에서 near/far ground reach를 계산하고, 플레이어 상단과 collider 반폭의 실제 원근 가로 폭을 기준으로 focus X를 보정한다. landscape fit zoom도 near reach 기준이다.

플레이어 이동 경계, 스테이지/NPC 모델 좌표·크기·회전, Firebase Studio 데이터, 타이틀은 바꾸지 않았다. 회귀 테스트는 375×667, 360×800, 800×360의 최대 이동 위치를 Three `PerspectiveCamera.project`로 검사한다.

## 화면 안전 여백 보완

카메라 안전영역은 화면 폭의 8%를 남기며, 375px 세로 화면의 한쪽 여백은 30px이다. `PlayerVisual`의 실제 양팔 outline 폭을 계산해 collider 대신 가시성 판정에 사용했다. lerp 뒤 실제 투영값이 안전영역을 벗어난 프레임에만 카메라 target pose를 즉시 적용한다. NPC·Studio 위치·플레이어 월드 이동 경계·모델 transform은 변경하지 않았다.
