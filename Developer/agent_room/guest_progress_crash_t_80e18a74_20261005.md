# 게스트 진행정보 오류 수정 — t_80e18a74

- Kanban: `t_80e18a74`; Advisor가 backendmini/balanceqa 검증 흐름으로 라우팅. backendmini mandatory precommand와 diagnosing-bugs, Firebase 로그인 solution을 확인했다.
- Reuse decision: backendmini의 Firebase 계정 경계 검토와 balanceqa의 실제 게스트 게임 회귀 검증 범위다. 기존 그래픽 작업과 별도 원인으로 처리했다.
- 로컬 코드만 수정했다. Worker는 commit/push/deploy 또는 실제 Firebase 읽기/쓰기·계정 로그인·원격 상태 변경을 수행하지 않았다.

## 재현 원인

1. 실제 게스트 진행 약 35초 후 HUD 레벨업에서 `getAccountUnlockableWeaponIds().filter(isWeaponUnlocked)` → `weaponUnlocks.readRaw` → `readFirebasePlayerProgress` → `ensureHydrated`가 호출됐다. 계정이 없는 게스트의 계정 진행정보를 요구해 사용자 화면과 같은 FirebaseProgressError/ErrorBoundary가 발생했다.
2. 게임오버/클리어의 다음 무기 미리보기도 같은 `isWeaponUnlocked` 호출 때문에 실패했다.
3. 진동을 지원하는 브라우저에서는 일반 화면 클릭 → TapFeedbackBurst → vibrateFeedback → loadTitleSettings가 게스트 계정설정을 요구해 별도 pageerror를 냈다.

인증 성공/실패, 저장 transport, 그래픽 표시 문제가 아니라 비로그인 호출자가 계정 전용 읽기 함수를 호출한 경계 오류다.

## 최소 변경

- `weaponUnlocks.isUnlocked`: starter 규칙은 그대로 유지한다. 진행정보가 hydrate되지 않았고 runtime uid도 없는 게스트는 계정 소유 해금권한이 없으므로 비starter 조회에 false를 반환한다. uid가 있는 계정은 기존 원격 snapshot 요구를 유지한다.
- `titleSettings.vibrateFeedback`: uid 없는 게스트에게 계정 진동설정을 읽지 않고 진동 호출을 생략한다. 로그인 계정의 hydrate 실패는 숨기지 않으며, hydrate된 true/false 설정은 그대로 준수한다.
- `firebaseProgress.js`, 인증/session 코드, Firebase payload, localStorage, 타이틀 UI/그래픽은 변경하지 않았다. 게스트용 가짜 진행정보나 기본 계정 snapshot도 생성하지 않았다.

## Worker 검증

- 수정 전 HUD.guestProgress 3 fail/1 pass: XP 획득→실제 HUD levelup 및 gameover/cleared preview가 동일 오류로 실패했다.
- 수정 전 titleSettings.guest 1 fail/2 pass: navigator.vibrate를 지원하는 게스트 클릭만 같은 오류로 실패했다.
- 수정 후 아래 4개 파일 총 23/23 통과:
  `npx vitest run src/components/HUD.guestProgress.test.jsx src/lib/titleSettings.guest.test.js src/lib/weaponUnlocks.test.js src/components/WeaponModal.test.jsx --reporter=dot`
- guest snapshot은 검사 전후 uid 없음/progress=null을 포함해 동일했다. 로그인된 미hydrate 계정은 기존 예외를 발생시켰고, hydrate된 계정의 진동 true/false는 보존됐다. 테스트 Firebase client는 기존 Vitest fake만 사용했다.
- Advisor 실제 로컬 게스트 브라우저 35초 재검증 PASS: `errors: []`. Stage 1 `00:22` 게임오버 이후 다시시작/타이틀/코인상점/랭킹 버튼이 있는 정상 결과 UI에 도달했고, 기존 ensureHydrated ErrorBoundary 및 클릭 진동 pageerror는 재발하지 않았다.
- 인증/Firebase 구현은 변경하지 않았다. 이번 게스트 재검증을 실제 OAuth 로그인 검증으로 주장하지 않는다.
