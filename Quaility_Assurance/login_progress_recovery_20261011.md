# 로그인 후 로비·설정 복구

## 자물쇠 복원 — 23:25 KST
- 사용자 명시 병렬 요청으로 uimini t_5a64f716(복원)과 backendmini t_82161e0d(책 오류 독립 검토)를 동시에 실행했다.
- 앞선 복구의 `!recordsReady` 전체 해제 표시를 제거하고, 미준비 상태에서는 Stage 1만 입장 가능하게 유지한다. 기존 StageLockPreview와 자산은 변경하지 않는다.
- 직접 집중 검사 2개 통과(나머지 27개 생략): 데이터 loading/error에서도 Stage 1 실제 진입 callback 정상, Stage 2~4 자물쇠 3개 표시, 실제 모든 클리어 기록 도착 후 자물쇠 0개·기록·입장 버튼 4개 반영.
- 기존 대량 반복 테스트의 기대값만 새로운 사용자 표시 요구에 맞췄으며 반복 테스트는 실행하지 않았다.
- backendmini는 책 오류 경로의 변경과 저장 경계 보존을 별도로 검토했다. 실기기 Google 로그인 성공을 대신 검증한 것은 아니다.

## 후속 플레이 중 오류 — 23:19 KST
- 사용자 재현: 책 획득 순간. 제공된 HUD-CxZavvnQ.js:36068 → useGameStore-CqcoFjom.js:6326/6155는 HUD 레벨업 선택지의 isUnlocked → readRaw 호출로 직접 매핑했다.
- 운영 자동 오류 수집은 playtestLogger의 DEV 조건으로 비활성화되어 있다. Firebase functions:log 최근 25개 조회도 No log entries found였다. 과거 서버 로그를 확보했다고 주장하지 않는다. 사용자 오류 스택이 원인 증거다.
- 실제 HUD + 실제 store에 로그인 UID만 있고 원격 진행도가 없는 상태를 넣고 gainXp를 실행하자 같은 스택으로 실패했다. 직전 복구는 이 레벨업 경로를 누락했다.
- weaponUnlocks.isUnlocked의 guest-only 조건 한 곳을 수정: 모든 미준비 상태에서 계정 전용 해금을 조회하지 않는다. Starter 판정과 도착 후 실제 해금 조회, 저장 경로는 그대로 유지한다.
- 집중 검사 15개 통과. 게스트/로그인 미준비 상태 모두 책 XP → 4개 카드 표시 → 실제 카드 클릭 → playing 복귀를 확인했다. 전후 Firebase runtime snapshot 전체 동일, progress=null 유지. 운영 Firebase 데이터 쓰기 없음.
- 실제 대상 기기의 OAuth 이후 플레이 확인은 아직 필요하다. 추가 기능과 일반 배포는 진행하지 않으며 이 변경은 최소 오류 복구다.

- 사용자 증거: 로그인 없는 플레이는 정상, Google 로그인 후 게임 미표시. 스크린샷 FirebaseProgressError의 Lobby-MgQ1b8Vf.js:18074를 LobbySettingsModal의 loadTitleSettings 초기화로 직접 매핑했다.
- Kanban backendmini: t_e2561741. 초기 작업의 도구 한도 후 동일 카드로 로비 수정 작업을 이어갔다.
- 재현: signedIn + 원격 진행정보 미적용 상태에서 설정 마운트. 실제 Firebase progress/settings 모듈을 사용하는 격리 검사가 동일 메시지와 LobbySettingsModal.jsx:35 스택으로 실패했다.
- 수정: 설정 읽기·저장은 같은 계정의 원격 적용 이후만 실행. 늦은 데이터가 임시 화면 기본값으로 덮어써지지 않도록 읽기 완료를 분리했다. 준비 전 닉네임 변경과 외형 저장은 차단하며 화면과 로그아웃은 유지한다. 진동 피드백도 미준비 상태의 저장값을 읽지 않는다.
- 로비는 원격 진행정보 미도착/실패 시에도 스테이지 모델과 Stage 1 입장을 표시한다. 미확인 기록을 0 또는 잠금으로 확정하지 않고 실제 데이터 도착 시 갱신한다.
- 직접 검증: hydration/settings/Lobby 집중 검사 23 passed, 25 unrelated skipped. 운영 Firebase 데이터에 테스트 쓰기 없음. 인증·Firebase rules·저장 스키마 변경 없음.
- 운영 사전 확인: 새 세션에서 게스트 로비와 실제 Stage 1 도입부 진입 성공. 실제 Google OAuth 후 복구 검증은 아직 미완료이며 위 격리 검사를 실계정 로그인 검증으로 간주하지 않는다.
