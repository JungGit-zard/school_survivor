# AAB v51 Google Play 업로드 후보 빌드 기록

- 빌드 일시: 2026-08-31 KST
- Kanban: `escape-zombie-school` / `t_53d5f81b` / `launchmini`
- 소스 커밋: `35ef77c38748f19c8542746e6c806b55bee6e76a`
- 브랜치: `zombie_only`
- 격리 빌드 경로: `D:\JungSil\2.Minigame_project\aabv50_35ef77c3_clean`
- 소스 대비 변경: `Developer/r3f_prototype/android/app/build.gradle`의 `versionCode`만 `51`
- 패키지: `com.jungyoon.zombieschool`
- versionCode: `51`
- versionName: `1.0.26`
- minSdk: `24`
- targetSdk: `36`

## 산출물

- 경로: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\android\app\build\outputs\bundle\release\app-release-v51-20260831_0023-35ef77c38748.aab`
- 크기: `15,615,490 bytes`
- SHA-256: `cb28f09aed939d64f6dfb2de1445f08ce6271efb6f85f7c7bd6963c9db63b2af`

## 빌드 및 검증

- Firebase 릴리스 환경변수 게이트: PASS
- 집중 테스트 1차: 13 files / 236 tests PASS
- 집중 릴리스 테스트 2차: 8 files / 190 tests PASS
- `npm run build`: PASS
- Capacitor Android sync 및 산출물 freshness: PASS
- Gradle `clean :app:bundleRelease`: PASS (`BUILD SUCCESSFUL`)
- `bundletool validate`: PASS
- bundletool manifest: package/versionCode/versionName/minSdk/targetSdk 모두 지정값과 일치
- `jarsigner -verify`: PASS
- ZIP 무결성: PASS
- 업로드 인증서 SHA-1: `6F:06:BA:57:9D:08:BA:A0:98:AF:26:A5:3C:49:9B:54:0A:05:76:51`
- 업로드 인증서 SHA-256: `FE:18:FA:0E:BD:5C:E7:0F:30:04:6F:25:D3:07:5A:65:8A:2C:33:EA:DD:6F:5E:30:0C:85:FB:6E:E5:54:0F:3B`

## Firebase 및 Google 로그인 회귀 방지 확인

- 최종 AAB 내부의 Firebase project ID, auth domain, Realtime Database URL, API key 존재를 확인했다. 비밀값은 출력하지 않았다.
- `GoogleAuthProvider`, `signInWithGoogle`, `signInWithCredential`, `FirebaseAuthentication` 포함을 확인했다.
- Capacitor 설정의 `skipNativeAuth=true`와 Google provider를 확인했다.
- Android 리소스의 `default_web_client_id`, `google_app_id`, `project_id` 존재를 확인했다.

## 고정 자산

- AAB 내부 타이틀 BGM: `998,122 bytes`
- SHA-256: `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`
- 정본 일치: PASS

## 배포 경계

- Google Play 업로드·출시: 수행하지 않음
- 커밋·푸시: 수행하지 않음
- v51의 Play 배포판 설치와 실제 Google OAuth 로그인·타이틀·로비·게임 진입: NOT_RUN

