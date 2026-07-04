# Native Google Login Capacitor Fix - 2026-07-05

## 증상

- Android AAB에서 Google 로그인을 시도하면 외부 브라우저 또는 Firebase auth handler 화면으로 넘어갔다.
- 반환 URL이 `localhost`로 열리며 `ERR_CONNECTION_REFUSED`가 발생하거나, Firebase redirect state 누락 메시지에서 멈췄다.

## 원인

- Capacitor Android 앱은 앱 내부 WebView의 로컬 서버를 사용한다.
- 외부 Chrome에서 보이는 `localhost`는 앱 내부 서버가 아니라 Chrome 자신의 localhost라서 OAuth 반환을 처리할 수 없다.
- 따라서 AAB에서는 Firebase Web SDK의 popup/redirect 방식만으로 안정적인 로그인을 보장할 수 없다.

## 수정

- `@capacitor-firebase/authentication@8.3.0`을 추가했다.
- Capacitor 앱 내부에서는 네이티브 `FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })`로 Google 토큰을 받고, Firebase JS SDK의 `signInWithCredential()`로 기존 웹 인증 상태에 연결한다.
- 웹/개발 서버에서는 기존 `signInWithPopup()` 경로를 유지한다.
- `capacitor.config.json`에 Google provider와 `skipNativeAuth` 설정을 추가했다.
- Android Gradle 변수에 `rgcfaIncludeGoogle = true`를 추가해 Google 로그인 의존성을 포함했다.

## 남은 실제 배포 조건

- Firebase Console에서 Android 앱 패키지명이 `com.jungyoon.zombieschool`인지 확인한다.
- Play Console의 Play App Signing SHA-1/SHA-256, 그리고 필요하면 업로드 키 SHA-1/SHA-256을 Firebase Android 앱에 등록한다.
- Firebase Console에서 최신 `google-services.json`을 내려받아 `Developer/r3f_prototype/android/app/google-services.json`에 둔다.
- Google 로그인 제공자가 Authentication > 로그인 방법에서 활성화되어 있어야 한다.

## 검증

- `npx vitest run src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js --pool=threads --maxWorkers=1 --no-fileParallelism`
- `npm run build`
- `npx cap sync android`
- `JAVA_HOME`과 Android SDK 경로를 잡은 뒤 `.\gradlew.bat assembleDebug`
