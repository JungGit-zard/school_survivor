# AAB v33 로그인 게이트 경우의 수 / 업로드 보류 기록

- 작성 시각: 2026-08-10 22:48:01 +0900
- 대상 빌드: AAB v33
- versionCode: 33
- versionName: 1.0.18
- AAB 경로: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\android\app\build\outputs\bundle\release\app-release.aab`
- SHA256: `0b9f3c83ca95ed2a0f35413e21977dba38cc929658705b0be416f8d2174b0db0`
- 상태: **업로드 보류 / 권실 기계 테스트 대기**

## 결론

미로그인 사용자가 타이틀에서 `게임 시작`을 눌렀을 때 게임/로비에 바로 들어가면 안 된다. 상식적인 게임 진입 흐름은 다음이다.

1. 로그인 상태 확인
2. 미로그인이면 Google 로그인 UI 또는 Google 로그인 플로우 표시
3. 로그인 성공 시에만 다음 화면으로 진입
4. 로그인 실패/취소/미설정이면 시작 차단
5. 실패 후에는 pending-start 상태를 남겨 자동 진입하지 않게 정리

v33은 이 동작으로 수정되어 빌드되었지만, 실제 권실 기계 테스트 전까지 Google Play 업로드를 보류한다.

## 로그인 화면 경우의 수

### 1. 이미 로그인된 사용자

- 조건: `authUser.uid` 존재
- 사용자 행동: `게임 시작` 클릭
- 기대 결과:
  - Google 로그인 UI를 다시 띄우지 않음
  - pending-start 플래그 제거
  - 로비/게임 진입
- 테스트 포인트:
  - 기존 로그인 세션 유지 상태에서 바로 진입되는지 확인
  - 불필요한 실패 모달이 뜨지 않는지 확인

### 2. 미로그인 사용자 + Google 로그인 성공

- 조건: `authUser` 없음 / signed out
- 사용자 행동: `게임 시작` 클릭 후 Google 로그인 완료
- 기대 결과:
  - Google 로그인 플로우가 먼저 실행됨
  - 로그인 성공 후에만 로비/게임 진입
  - pending-start 플래그 제거
  - 닉네임/동의 UI가 이 진입을 조용히 막지 않음
- 테스트 포인트:
  - 로그인 성공 전에는 로비에 들어가지 않는지 확인
  - 성공 직후 한 번만 진입하는지 확인

### 3. 미로그인 사용자 + Google 로그인 취소

- 조건: `authUser` 없음 / signed out
- 사용자 행동: `게임 시작` 클릭 후 Google 로그인 창 닫기 또는 취소
- 기대 결과:
  - 로비/게임 진입 금지
  - 실패 UI 표시
  - pending-start 플래그 제거
  - 다시 `게임 시작` 또는 `재시도`를 눌러야만 로그인 재시도
- 테스트 포인트:
  - 취소 후에도 게임 화면/로비로 넘어가지 않는지 확인
  - 앱 재개/뒤로가기 후 자동 진입하지 않는지 확인

### 4. 미로그인 사용자 + Google 로그인 실패

- 조건: 네트워크 실패, Firebase 오류, 인증 만료, 기타 sign-in 오류
- 사용자 행동: `게임 시작` 클릭
- 기대 결과:
  - 로비/게임 진입 금지
  - 중앙 실패 모달 표시
  - 에러 메시지 표시
  - pending-start 플래그 제거
- 테스트 포인트:
  - 실패 모달의 닫기/재시도 버튼 동작 확인
  - 실패 뒤 재시도 성공 시에만 진입되는지 확인

### 5. Redirect/native 로그인처럼 클릭 직후 user가 즉시 반환되지 않는 경우

- 조건: `signInWithGoogle()` 호출 결과가 즉시 user를 반환하지 않고, 이후 Firebase auth state change로 로그인 완료됨
- 사용자 행동: `게임 시작` 클릭 후 외부/네이티브 로그인 완료
- 기대 결과:
  - pending-start 플래그 유지
  - auth user가 돌아오면 pending-start를 소비하고 로비/게임 진입
  - 진입 후 pending-start 플래그 제거
- 테스트 포인트:
  - 로그인 완료 전에는 진입하지 않는지 확인
  - 로그인 완료 후 한 번만 진입하는지 확인
  - pending-start가 남아서 다음 실행 때 오작동하지 않는지 확인

### 6. Firebase/Auth 미설정 또는 환경 누락

- 조건: Firebase Auth 환경값 누락 또는 `unconfigured`
- 사용자 행동: `게임 시작` 클릭
- 기대 결과:
  - 로비/게임 진입 금지
  - 로그인 실패 UI 표시
  - pending-start 플래그 제거
- 테스트 포인트:
  - 미설정 상태가 개발 편의용으로 로비 진입을 허용하지 않는지 확인

### 7. 반복 클릭 / 중복 로그인 시도

- 조건: 로그인 시도 중 사용자가 `게임 시작` 또는 `재시도`를 반복 클릭
- 기대 결과:
  - Google 로그인 팝업/네이티브 요청이 중복 폭발하지 않아야 함
  - 최종 로그인 성공 시 한 번만 진입
  - 실패 시 진입하지 않음
- 테스트 포인트:
  - `signInWithGoogle` in-flight guard 동작 확인
  - 중복 onEnterLobby 호출이 없는지 확인

## 실제 v33 코드/테스트 검증

### 통과한 로그인 게이트 관련 테스트

명령:

```bash
npm test -- --run src/components/TitleScreen.settings.test.jsx src/store/useAuthStore.test.js src/lib/firebaseAuth.test.js
```

결과:

- Test Files: 2 passed
- Tests: 30 passed

추가 반복 실행:

- LOGIN GATE REGRESSION RUN 1: 30 passed
- LOGIN GATE REGRESSION RUN 2: 30 passed
- LOGIN GATE REGRESSION RUN 3: 30 passed

### 빌드 검증

- `npm run build`: 성공
- `npx cap sync android`: 성공
- `./gradlew bundleRelease`: BUILD SUCCESSFUL
- manifest 산출물 확인:
  - package: `com.jungyoon.zombieschool`
  - versionCode: `33`
  - versionName: `1.0.18`
- `jarsigner -verify`: exit code 0
- AAB 내부 TitleScreen chunk에서 로그인 게이트 관련 문자열 확인:
  - `eszs:pending-start-after-google-login`
  - `signInWithGoogle`
  - `title-auth-failure-heading`

## 전체 테스트 참고

전체 `npm test`는 실행했으나 로그인 게이트와 무관한 기존/다른 영역 실패가 남아 있다.

- 전체 결과: 25 failed / 191 passed
- 주요 실패 영역 예:
  - `burstEvents`
  - `graphicsStudioConfig`
  - `stagePropPlacements`
  - `studentProximity`
  - `StageObjects`
  - `LobbySettingsModal`

따라서 v33 업로드 판단은 로그인 게이트 관련 테스트 + 실제 권실 기계 테스트 결과를 기준으로 별도 결정한다.

## “미로그인도 무조건 로비” 흐름의 출처 추적

Git 이력 기준으로 문제 흐름을 명시적으로 도입한 커밋:

- commit: `2244e38174dd4c0afdacf2d78ed4d8ed5ede59c5`
- short: `2244e38`
- 날짜: `2026-08-07 22:25:34 +0900`
- author: `JungGit-zard <zard5388@gmail.com>`
- subject: `fix: make game entry independent of login`

해당 커밋에서 들어간 핵심 주석/동작:

```text
게임 시작은 로그인·동의·닉네임·클라우드 진행도·Studio 그래픽 준비와 무관하게
무조건 로비로 들어간다. Google 로그인은 좌상단 계정 패널의 선택 기능일 뿐,
라이브 게임 진입을 막는 게이트가 되어서는 안 된다.
```

이 커밋은 로그인/동의/닉네임/클라우드 게이트를 제거하고 `onEnterLobby?.()`를 즉시 호출하도록 변경했다.

이후 복구 시도 커밋:

- commit: `c634e02c57b79ada96409e89cddfb564d55aacfb`
- short: `c634e02`
- 날짜: `2026-08-07 22:33:07 +0900`
- author: `JungGit-zard <zard5388@gmail.com>`
- subject: `fix: restore Google login gate`

복구 시도 내용:

- `signInWithGoogle`를 다시 호출하도록 일부 복구
- 로그인 실패 시 `title.loginRequired` 계열 에러 처리 추가

하지만 이후 현재 v33 이전 상태에서는 실패/취소/redirect/pending-start 경우의 수가 충분히 정리되지 않았고, “로그인 실패 시 시작 차단” 보장이 불명확했다. v33에서 이 경우의 수를 테스트로 고정했다.

## 업로드 보류

v33 AAB는 생성 완료됐지만, 사용자가 권실 기계에서 실제 Google 로그인 플로우를 확인한 뒤 업로드한다.

업로드 전 필수 수동 확인:

1. 앱 신규 설치 또는 앱 데이터 삭제
2. 타이틀에서 미로그인 상태 확인
3. `게임 시작` 클릭
4. Google 로그인 UI/네이티브 로그인 플로우가 나오는지 확인
5. 로그인 취소 시 로비/게임 진입이 차단되는지 확인
6. 다시 `게임 시작` 또는 재시도 후 로그인 성공
7. 성공 후에만 로비/게임에 들어가는지 확인
8. 앱 종료/재실행 후 로그인 유지 상태에서 바로 진입되는지 확인
9. 로그아웃 후 다시 `게임 시작` 시 로그인 요구가 재현되는지 확인

## 업로드 판단

- 위 권실 기계 테스트가 모두 통과하면 v33 업로드 가능
- 하나라도 실패하면 v33 업로드 금지, 원인 수정 후 v34로 재빌드
