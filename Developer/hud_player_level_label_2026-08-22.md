# HUD 현재 레벨 표기 기록

- 날짜: 2026-08-22
- Kanban: `t_fd62b864`, `t_6f720ab5` (`uimini`)
- 범위: HUD 지속 레벨 표기와 일시정지 버튼 위치 조정

## 배치

- XP 진행줄은 기존대로 화면 상단 `top: 0`, `height: 9px`를 유지했다.
- 레벨 표기는 `goldChip` 내부에서 `coin icon → Lv.{player.level} → coin amount` 순서로 두어 코인 갯수의 바로 왼쪽 같은 수평선에 배치했다.
- 일시정지는 `right: max(14px, env(safe-area-inset-right, 0px))`, `bottom: calc(100px + env(safe-area-inset-bottom, 0px))`의 우하단 안전영역으로 분리했다. HP 바(`bottom: 30px`)와 무기 아이콘(`bottom: 64px`)보다 위에 둬 겹침을 피한다.
- 퀘스트 가방과 개발 버튼은 기존 좌상단 컨트롤 그룹에 유지했다.

## 검증

- RED: 레벨 라벨 부재로 `persistent player level label` HUD 테스트 실패.
- GREEN: 집중 테스트에서 `player.level` 7→8 변경이 즉시 `Lv.7`→`Lv.8`로 반영되고, 일시정지→재개 aria 및 동작이 유지됨을 확인.
- 레벨업 선택지·XP 계산·게임플레이 상태는 수정하지 않았다.

## 순차 획득 카드 노출 연결

- Kanban: `t_a31b27f1` (`uimini`)
- `HUD.jsx`는 고정된 `UPGRADES` 순서와 현재 사용 가능·중복 제한·보장 대기·기존 노출 ledger를 `selectSequentialLevelupChoices`에 전달한다.
- 반환된 `choiceKeys`만 원래 `UPGRADES` 객체로 복원한다. 같은 `levelUpChoiceSerial` 동안 카드는 고정되고, 표시 후 노출 ledger와 보장 소비는 한 번만 기록한다.
- 검증: HUD 43개, helper/store 64개 테스트 통과. HUD 소스의 `Math.random` 참조는 0개다.
