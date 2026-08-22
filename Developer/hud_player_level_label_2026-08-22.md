# HUD 현재 레벨 표기 기록

- 날짜: 2026-08-22
- Kanban: `t_fd62b864` (`uimini`)
- 범위: 게임 HUD 상단의 지속적인 `Lv.{player.level}` 표기만 추가

## 배치

- XP 진행줄은 기존대로 화면 상단 `top: 0`, `height: 9px`를 유지했다.
- 레벨 표기는 화면 중앙 `top: 42px`에 두었다.
- 따라서 중앙 Stage/시간 행(안전영역 상단), 우측 코인, 좌측 44px 일시정지·퀘스트 버튼과 분리되며 377px 폭에서 XP 바를 가리지 않는다.

## 검증

- RED: 레벨 라벨 부재로 `persistent player level label` HUD 테스트 실패.
- GREEN: 같은 집중 테스트에서 `player.level` 7→8 변경이 즉시 `Lv.7`→`Lv.8`로 반영됨을 확인.
- 레벨업 선택지·XP 계산·게임플레이 상태는 수정하지 않았다.
