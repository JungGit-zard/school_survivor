# AAB v62 릴리스 QA 기록 (2026-09-13 KST)

## 대상

- AAB: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v62-20260913_1836-6f7872a48683.aab`
- 패키지: `com.jungyoon.zombieschool`
- versionCode: `62`
- versionName: `1.0.33`
- 크기: `15,627,427` bytes
- SHA-256: `9a9ade0caa8182b31b4e0e7aa87b36abaa1fc7fae8411e2d534a68694307c8d6`

## 정적·번들 검증

- `node scripts/assert-firebase-release-env.mjs`: PASS. `.env` 필수 Firebase 키 존재, Firebase 프로젝트·인증 도메인·Android 패키지·릴리스 SHA-1 등록을 확인했다. 민감값은 출력하거나 기록하지 않았다.
- `firebaseAuth.test.js` 및 `useAuthStore.cloudProgress.test.js`: 2개 파일, 20개 테스트 PASS.
- AAB의 `base/manifest/AndroidManifest.xml`에서 `com.jungyoon.zombieschool`, `versionCode 62`, `versionName 1.0.33`을 확인했다.
- AAB 내부 Capacitor 설정: `skipNativeAuth: true`, Google 공급자만 포함. 플러그인 목록에 `@capacitor-firebase/authentication`과 Android Firebase Authentication 플러그인 클래스가 포함됐다.
- AAB의 게임 인증 번들에서 `setPersistence(..., inMemoryPersistence)`와 네이티브 `skipNativeAuth` 자격 증명 경로를 확인했다. 해당 게임 인증 번들에는 `browserLocalPersistence`가 없다. Firebase vendor 라이브러리의 공개 심볼명은 포함될 수 있으나 앱 인증 경로에서 사용되지 않는다.
- AAB 내 Firebase 프로젝트·인증 도메인·Realtime Database 호스트 식별자를 확인했다. `.env` 파일은 포함되지 않았다.
- `title_bgm`은 AAB에 1개 포함됐으며 `998122` bytes, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`로 영구 정본과 일치한다.

## 서명

- `jarsigner -verify -certs -verbose`: `jar verified.` 확인.
- 인증서 SHA-256: `fe18fa0ebd5ce70f30046f25d3075a658a2c33eadd6f5e300c85fb6ee5540f3b`.
- `jarsigner -strict`는 자체 서명 인증서 체인, 타임스탬프 부재 및 AAB/JAR 입력 스트림 호환성 경고로 실패한다. 일반 검증의 서명 무결성 결과와 Firebase 환경 게이트의 등록 SHA-1은 PASS이며, 이 경고는 Google Play 업로드 또는 설치 검증 결과가 아니다.

## 실제 기기 로그인

- `adb devices`에 연결 기기가 없어, 로그아웃 상태의 실제 Google OAuth 팝업/복귀와 로그인 후 게임 진입은 **NOT RUN / UNKNOWN**이다.
- 따라서 이 기록은 AAB 정적·아카이브 검증 PASS이며, 실제 대상 환경 Google 로그인 성공 판정 또는 배포 승인으로 사용하면 안 된다.

## 결론

- AAB 정적·환경·번들·서명 기본 검증: **PASS**.
- 실제 Android Google 로그인: **UNKNOWN (연결 기기 없음)**.
