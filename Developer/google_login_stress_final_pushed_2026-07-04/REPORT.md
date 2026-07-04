# 탈출좀비학교 Google 로그인 반복 테스트 보고서 — 최종 push 버전

작성일: 2026-07-04

## 테스트 대상

- 기준: 원격 최종 push 브랜치 `origin/feature/stage2-corridor-floor-graphics`
- 커밋: `08406ed feat(dev): 치트 UI를 타이틀 커맨드 뒤로 숨김`
- 테스트용 worktree: `C:\Users\admin\AppData\Local\hermes\tmp\escape-zombie-school-origin-test`
- 앱 ID: `com.jungyoon.zombieschool`
- 원격 push 기준 Android 버전: `versionCode 4`, `versionName 1.0.3`
- 주의: 로컬 원본 worktree에는 `1709209 build(android): AAB 버전을 1.0.4로 올림` 등 2개 커밋이 `origin`보다 앞서 있었지만, 사용자의 요청에 따라 원격 최종 push 버전만 별도 worktree에서 테스트했다.

## 사전 검증

- `npm ci`: 성공, 취약점 0개
- `npm run build`: 성공
- `npm test`: 성공
  - 테스트 파일: 76 passed
  - 테스트 케이스: 435 passed
- Android manifest:
  - `android.permission.INTERNET` 있음
  - Capacitor 기본 `BridgeActivity` 사용
- Firebase Auth 구현:
  - `GoogleAuthProvider`
  - `signInWithPopup(auth, provider)` 사용
  - `prompt: select_account`

## 반복 테스트 시나리오

`SCENARIO.md`에 저장함.

핵심 루프:

1. 모바일 Android 유사 viewport/user-agent로 production preview 접속
2. `Google 로그인` 버튼 표시/클릭 가능 여부 확인
3. 버튼 클릭
4. OAuth popup 생성 여부 확인
5. Firebase/Google OAuth URL 진입 여부 확인
6. 즉시 설정 오류(`unauthorized-domain`, Firebase 미설정 등) 노출 여부 확인
7. 실제 계정 입력 전 popup 닫기
8. 앱으로 복귀
9. 로그인 버튼이 다시 보이고 클릭 가능한지 확인
10. 위 과정을 40회 반복

## 실행 결과

- 반복 횟수: 40회
- 통과: 40회
- 실패: 0회
- 평균 소요: 13,809ms
- 최대 소요: 15,926ms
- p95 소요: 14,505ms
- page error: 0회
- console warning: 1회, WebGL `ReadPixels` 성능 경고만 발생. 로그인 기능 오류 아님.

관찰된 정상 취소 플로우:

- popup이 열림
- Firebase OAuth handler URL로 진입
- popup을 닫으면 앱에 `auth/popup-closed-by-user`가 표시됨
- 이후 `Google 로그인` 버튼이 다시 표시되고 재클릭 가능

즉, 테스트한 범위에서는 “구글로그인 하다가 걸려서 멈추는” 현상은 재현되지 않았다.

## 판정

### 웹/Chromium 기준

테스터가 Google 로그인 버튼을 누른 뒤 popup이 열리고, 로그인 도중 취소하거나 창을 닫아도 앱이 멈추지 않는 것은 40회 반복으로 확인했다.

- Firebase 환경변수 누락: 없음
- unauthorized-domain 즉시 오류: 없음
- 로그인 중 버튼 영구 잠김: 없음
- popup 닫은 뒤 앱 복귀 불가: 없음
- JS page error: 없음

### Android 내부테스트/AAB 기준

실제 Android 설치본에서의 최종 판정은 아직 보류다.

이 PC에 연결된 Android 기기/에뮬레이터가 없어 AAB를 설치한 실제 WebView 환경에서 계정 선택/로그인 완료까지는 실행하지 못했다.

추가 리스크:

- 현재 코드는 네이티브 Google Sign-In이 아니라 Firebase Web SDK의 `signInWithPopup` 방식이다.
- Capacitor Android 앱은 WebView 기반이라 실제 설치본에서 popup/OAuth 흐름이 Chrome desktop과 다르게 동작할 수 있다.
- Google 계정 입력 완료 단계는 자동화하지 않았고, 실제 테스터 계정으로 Play 내부테스트 설치본에서 1회 이상 확인해야 한다.

## 권장 조치

내부테스트 배포 전 최소 확인:

1. Play 내부테스트 링크로 실제 Android 기기에 설치
2. 앱 실행
3. `Google 로그인` 터치
4. 계정 선택/로그인 완료
5. 닉네임/시작 플로우 진입 확인
6. 앱 종료 후 재실행 시 로그인 상태 유지 확인
7. 로그아웃/재로그인 확인

만약 실제 기기에서 Google 화면이 열리지 않거나 멈추면, 우선순위 높은 수정 후보는 다음 중 하나다.

1. Capacitor Browser/외부 브라우저 기반 redirect 로그인으로 변경
2. Android 네이티브 Google Sign-In 플러그인 사용
3. 최소한 Android WebView 감지 시 popup 방식 대신 redirect 방식으로 분기

## 저장된 결과 파일

- `SCENARIO.md`: 테스트 시나리오
- `summary.txt`: 요약 수치
- `results.json`: 40회 반복 상세 결과
- `REPORT.md`: 본 보고서
