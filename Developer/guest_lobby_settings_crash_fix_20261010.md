# 게스트 로비 설정 오류 수정 (2026-10-10)

- Kanban: `escape-zombie-school` 카드 `t_f30cd133` (`uimini`), `t_c69b69d4` (`backendmini`). 기존 D 경로 검사기 차단으로 현재 F 경로 검사기를 실행하고 별도 깨끗한 `zombie_only` 복제본에서 작업했다.
- 재현: 로그아웃 상태로 게임 시작 → 로비 설정 버튼. `LobbySettingsModal`의 `loadTitleSettings()`가 인증된 Firebase 진행 상태를 요구하여 `FirebaseProgressError`로 화면이 중단됐다.
- 수정: 게스트 모달은 `DEFAULT_SETTINGS`를 메모리에만 담아 표시하고 일반 설정 자동 저장을 건너뛴다. 외형 저장 시도에는 기존 저장 불가 안내를 표시한다. 모달이 게스트로 열린 뒤 인증 상태가 바뀌어도 그 메모리 값을 계정에 쓰지 않도록 최초 소유자 UID를 고정한다. 인증된 계정은 기존 Firebase 읽기·저장 경로를 그대로 사용한다.
- Firebase 정본, 로그인 코드, 타이틀 그래픽 및 브라우저 저장소 사용은 변경하지 않았다.
