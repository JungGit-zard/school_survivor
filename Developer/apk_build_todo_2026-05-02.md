# BangBang Survivor — APK 빌드 투두리스트
작성일: 2026-05-02

## 개요

현재 스택: React + R3F + Vite (웹앱)
목표: 구글 플레이 등록 가능한 `.aab` 파일 생성
채택 방법: **Capacitor** (웹앱을 그대로 안드로이드 앱으로 패키징)

---

## PHASE 1 — 개발 환경 설치

> PC(윈도우/맥)에서 진행. 이 서버에서는 불가능.

- [ ] **1-1.** Node.js 18 이상 설치 확인
  ```
  node -v   # v18 이상이어야 함
  ```

- [ ] **1-2.** Java JDK 17 설치
  - 다운로드: https://adoptium.net (Eclipse Temurin 17)
  - 설치 후 확인: `java -version`

- [ ] **1-3.** Android Studio 설치
  - 다운로드: https://developer.android.com/studio
  - 설치 시 "Android SDK", "Android SDK Platform", "Android Virtual Device" 체크

- [ ] **1-4.** Android SDK 설정
  - Android Studio 실행 → SDK Manager 열기
  - **SDK Platforms 탭**: Android 14 (API 34) 체크 후 설치
  - **SDK Tools 탭**: Android SDK Build-Tools, Android Emulator 체크 후 설치

- [ ] **1-5.** 환경변수 설정
  - `ANDROID_HOME` = Android SDK 경로
    - 윈도우: `C:\Users\이름\AppData\Local\Android\Sdk`
    - 맥: `~/Library/Android/sdk`
  - PATH에 `$ANDROID_HOME/tools` 와 `$ANDROID_HOME/platform-tools` 추가
  - 설치 확인: `adb --version`

---

## PHASE 2 — 웹앱 빌드 준비

> 이 서버(r3f_prototype 폴더)에서 진행

- [ ] **2-1.** 모바일 필수 기능 확인
  - 터치 조이스틱 정상 동작
  - 레벨업 선택 버튼 터치 가능
  - 게임오버/재시작 동작
  - 5분 생존 루프 완주 가능

- [ ] **2-2.** `index.html` viewport 설정 확인
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0,
    maximum-scale=1.0, user-scalable=no">
  ```

- [ ] **2-3.** 프로덕션 빌드 생성
  ```bash
  cd Developer/r3f_prototype
  npm run build
  ```
  - `dist/` 폴더 생성 확인

- [ ] **2-4.** 빌드 크기 확인
  ```bash
  du -sh dist/
  ```
  - 목표: 50MB 이하
  - 초과 시: Three.js tree-shaking, 텍스처 압축 검토

- [ ] **2-5.** 빌드 미리보기로 최종 확인
  ```bash
  npm run preview
  ```

---

## PHASE 3 — Capacitor 설치 및 초기화

> `Developer/r3f_prototype` 폴더에서 진행

- [ ] **3-1.** Capacitor 패키지 설치
  ```bash
  npm install @capacitor/core @capacitor/cli @capacitor/android
  ```

- [ ] **3-2.** Capacitor 초기화
  ```bash
  npx cap init
  ```
  입력값:
  - App name: `BangBang Survivor`
  - App Package ID: `com.bangbang.survivor`
  - Web asset directory: `dist`

- [ ] **3-3.** `capacitor.config.json` 내용 확인 및 수정
  ```json
  {
    "appId": "com.bangbang.survivor",
    "appName": "BangBang Survivor",
    "webDir": "dist",
    "server": {
      "androidScheme": "https"
    }
  }
  ```

- [ ] **3-4.** Android 플랫폼 추가
  ```bash
  npx cap add android
  ```
  - `android/` 폴더 생성 확인

- [ ] **3-5.** 웹 빌드를 Android에 동기화
  ```bash
  npx cap sync android
  ```

---

## PHASE 4 — Android 앱 설정

> `Developer/r3f_prototype/android/` 폴더 및 Android Studio에서 진행

- [ ] **4-1.** 화면 방향 고정 (세로 고정)
  - 파일: `android/app/src/main/AndroidManifest.xml`
  - `<activity>` 태그에 추가:
  ```xml
  android:screenOrientation="portrait"
  ```

- [ ] **4-2.** 앱 아이콘 교체
  - 512×512px PNG 이미지 준비
  - Android Studio → Resource Manager → + → Image Asset
  - 또는 `android/app/src/main/res/` 폴더의 `mipmap-*` 폴더에 직접 교체

- [ ] **4-3.** 버전 정보 설정
  - 파일: `android/app/build.gradle`
  ```gradle
  versionCode 1
  versionName "0.1.0"
  ```

- [ ] **4-4.** 최소/목표 SDK 설정 확인
  - 파일: `android/app/build.gradle`
  ```gradle
  minSdkVersion 24    // Android 7.0 이상
  targetSdkVersion 34 // Android 14
  ```

- [ ] **4-5.** WebGL 허용 설정 확인
  - WebView에서 WebGL이 기본 활성화되어 있는지 확인
  - `android/app/src/main/java/.../MainActivity.java` 에 필요시 추가:
  ```java
  // Capacitor가 자동으로 처리하므로 보통 불필요
  ```

---

## PHASE 5 — APK/AAB 빌드

### 디버그 APK (테스트용)

- [ ] **5-1.** Android Studio로 열기
  ```bash
  npx cap open android
  ```

- [ ] **5-2.** 디버그 APK 빌드
  - Android Studio 메뉴: `Build → Build Bundle(s) / APK(s) → Build APK(s)`
  - 또는 터미널에서:
  ```bash
  cd android
  ./gradlew assembleDebug
  ```
  - APK 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

### 릴리즈 AAB (플레이 스토어용)

- [ ] **5-3.** 키스토어(서명 키) 생성 — **한 번만 생성, 절대 분실 금지**
  ```bash
  keytool -genkey -v -keystore bangbang-release.jks \
    -alias bangbang -keyalg RSA -keysize 2048 -validity 10000
  ```
  - 생성된 `.jks` 파일을 안전한 곳에 백업 (클라우드 + 로컬)
  - 비밀번호 반드시 기록해 둘 것

- [ ] **5-4.** `android/app/build.gradle`에 서명 설정 추가
  ```gradle
  android {
    signingConfigs {
      release {
        storeFile file('../../bangbang-release.jks')
        storePassword '비밀번호'
        keyAlias 'bangbang'
        keyPassword '비밀번호'
      }
    }
    buildTypes {
      release {
        signingConfig signingConfigs.release
        minifyEnabled false
      }
    }
  }
  ```

- [ ] **5-5.** 릴리즈 AAB 빌드
  ```bash
  cd android
  ./gradlew bundleRelease
  ```
  - AAB 위치: `android/app/build/outputs/bundle/release/app-release.aab`

---

## PHASE 6 — 실기기 테스트

- [ ] **6-1.** 안드로이드 기기에 디버그 APK 설치
  - USB로 기기 연결 후: `adb install app-debug.apk`
  - 또는 APK 파일을 기기로 전송 후 직접 설치 (설정 → 알 수 없는 앱 허용)

- [ ] **6-2.** 터치 컨트롤 테스트
  - 화면 아무데나 터치 → 조이스틱 생성 확인
  - 캐릭터 이동 확인

- [ ] **6-3.** 성능 테스트
  - 30fps 이상 유지 확인
  - 발열 없는지 3분 이상 플레이

- [ ] **6-4.** 화면 방향 확인
  - 세로 고정 확인 (가로로 돌렸을 때 회전 안 되는지)

- [ ] **6-5.** 저사양 기기 테스트 (가능하면)
  - RAM 3GB 이하 기기에서 테스트

---

## PHASE 7 — 구글 플레이 등록 준비

- [ ] **7-1.** 구글 플레이 개발자 계정 등록
  - URL: https://play.google.com/console
  - 비용: $25 (1회, 평생)

- [ ] **7-2.** 스토어 등록 자산 준비
  - 앱 아이콘: 512×512px PNG
  - 피처드 이미지: 1024×500px
  - 스크린샷: 세로형 최소 2장 (320~3840px)
  - 짧은 설명: 80자 이내
  - 전체 설명: 4000자 이내

- [ ] **7-3.** 개인정보처리방침 페이지 만들기
  - 무료 방법: GitHub Pages 또는 notion.site에 업로드
  - 내용: 수집 데이터 없음(또는 광고 ID 수집 시 명시)

- [ ] **7-4.** 콘텐츠 등급 설문 완료
  - 구글 플레이 콘솔 내에서 진행
  - 폭력 수위: 만화적 폭력 → 만 7세 또는 만 12세 등급 예상

- [ ] **7-5.** AAB 파일 업로드
  - 구글 플레이 콘솔 → 내부 테스트 트랙 → 새 버전 → AAB 업로드

---

## 전체 흐름 요약

```
웹앱 완성
  ↓
npm run build  →  dist/ 폴더
  ↓
npx cap sync   →  android/ 폴더 동기화
  ↓
./gradlew assembleDebug  →  app-debug.apk  →  실기기 테스트
  ↓
./gradlew bundleRelease  →  app-release.aab  →  플레이 스토어 업로드
```

---

## 주의사항

- 키스토어(.jks) 파일은 **절대 분실하거나 깃허브에 올리면 안 됨** — 잃어버리면 같은 패키지명으로 업데이트 불가
- 매번 빌드 전 `npm run build` → `npx cap sync` 순서 필수
- `capacitor.config.json`의 `webDir`가 `dist`로 맞는지 항상 확인
