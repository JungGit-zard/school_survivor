# Google Play 내부테스트 Android 빌드 기록

## 목표

- R3F/Vite 웹 게임을 Google Play 내부테스트에 업로드할 수 있는 Android App Bundle로 만든다.

## 적용

- Capacitor 8을 도입해 웹 빌드를 Android WebView 앱으로 포장했다.
- 앱 ID는 2026-06-21 Play Console 비공개 테스트 앱 기준에 맞춰 `com.jungyoon.zombieschool`로 변경했다.
- 앱 이름은 `Escape Zombie School`로 설정했다.
- Android 프로젝트는 `Developer/r3f_prototype/android/`에 생성했다.
- `android/local.properties`에는 로컬 SDK 경로를 설정했다.
- release bundle 서명을 위해 로컬 업로드 keystore를 생성했다.

## 보안

- `android/keystore.properties`는 커밋하지 않는다.
- `android/app/upload-keystore.jks`는 커밋하지 않는다.
- `android/local.properties`는 커밋하지 않는다.
- 생성된 `.aab` 산출물은 커밋하지 않는다.

## 산출물

- 내부테스트용 AAB: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- 패키지명: `com.jungyoon.zombieschool`
- versionCode: `1`
- versionName: `1.0`

## 재빌드 명령

```powershell
cd Developer/r3f_prototype
npm.cmd run build
npx.cmd cap sync android
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME='C:\Users\admin\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
.\gradlew.bat :app:bundleRelease
```
