# Android Firebase Analytics module — t_023cea87 — 2026-10-11

## 범위

- Android TWA shell(`Developer/r3f_prototype/android`)에 Firebase Analytics SDK를 최소 설치했다.
- 웹 게임/TWA 진입 URL, 로그인 흐름, localStorage, Firebase Auth/Realtime Database 저장 로직, UI, release versionCode/versionName은 변경하지 않았다.
- 실제 Firebase 데이터 쓰기/삭제/원격 mutation 테스트는 수행하지 않았다.

## 확인한 기존 상태

- Android package/applicationId/namespace: `com.jungyoon.zombieschool`.
- `MainActivity`는 `com.google.androidbrowserhelper.trusted.LauncherActivity`를 그대로 상속한다.
- `google-services.json`의 Android package는 `com.jungyoon.zombieschool`로 일치한다.
- Firebase project id는 `escape-zombie-school`이며, Android app id는 기존 등록값을 사용한다.

## 구현

- `android/build.gradle`
  - Google Services Gradle plugin classpath `com.google.gms:google-services:4.4.4` 추가.
- `android/app/build.gradle`
  - `com.google.gms.google-services` plugin 적용.
  - Firebase BoM `com.google.firebase:firebase-bom:35.0.0` 추가.
  - Firebase Analytics `com.google.firebase:firebase-analytics` 추가.

## 의도한 동작

- 앱 네이티브 Android 프로세스에 Firebase Analytics SDK가 포함되고, Google Services plugin이 `google-services.json`을 처리한다.
- Analytics 자동 이벤트 초기화만 기대한다.
- TWA 내부 웹 게임 이벤트는 웹 페이지/웹 SDK 영역이므로 이번 Android 모듈 설치만으로 게임 내부 커스텀 이벤트가 자동으로 연결되는 것은 아니다.

## 검증 메모

- Gradle 검증은 별도 실행 로그에서 `:app:processDebugGoogleServices`, dependency resolution, compile/build task 결과로 확인한다.
- 릴리스 AAB 산출, version bump, Play 업로드/배포는 이 카드 범위에서 제외한다.

## Advisor 독립 검증
- PowerShell에서 :app:processDebugGoogleServices :app:compileDebugJavaWithJavac 성공 (BUILD SUCCESSFUL, 23초).
- 생성된 google_app_id와 기존 Android 등록 ID 일치 확인.
- 병합 Manifest에 FirebaseInitProvider와 AppMeasurementService 포함 확인.
- git diff --check 통과. 실기기 연결 없음: 실제 이벤트 수신은 미검증.
- Android 앱 업데이트가 필요하며 웹 배포만으로 설치된 앱에 이 SDK가 추가되지는 않는다.

