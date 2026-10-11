# 로그인 후 로비·설정 복구

- 사용자 증거: 로그인 없는 플레이는 정상, Google 로그인 후 게임 미표시. 스크린샷 FirebaseProgressError의 Lobby-MgQ1b8Vf.js:18074를 LobbySettingsModal의 loadTitleSettings 초기화로 직접 매핑했다.
- Kanban backendmini: t_e2561741. 초기 작업의 도구 한도 후 동일 카드로 로비 수정 작업을 이어갔다.
- 재현: signedIn + 원격 진행정보 미적용 상태에서 설정 마운트. 실제 Firebase progress/settings 모듈을 사용하는 격리 검사가 동일 메시지와 LobbySettingsModal.jsx:35 스택으로 실패했다.
- 수정: 설정 읽기·저장은 같은 계정의 원격 적용 이후만 실행. 늦은 데이터가 임시 화면 기본값으로 덮어써지지 않도록 읽기 완료를 분리했다. 준비 전 닉네임 변경과 외형 저장은 차단하며 화면과 로그아웃은 유지한다. 진동 피드백도 미준비 상태의 저장값을 읽지 않는다.
- 로비는 원격 진행정보 미도착/실패 시에도 스테이지 모델과 Stage 1 입장을 표시한다. 미확인 기록을 0 또는 잠금으로 확정하지 않고 실제 데이터 도착 시 갱신한다.
- 직접 검증: hydration/settings/Lobby 집중 검사 23 passed, 25 unrelated skipped. 운영 Firebase 데이터에 테스트 쓰기 없음. 인증·Firebase rules·저장 스키마 변경 없음.
- 운영 사전 확인: 새 세션에서 게스트 로비와 실제 Stage 1 도입부 진입 성공. 실제 Google OAuth 후 복구 검증은 아직 미완료이며 위 격리 검사를 실계정 로그인 검증으로 간주하지 않는다.
