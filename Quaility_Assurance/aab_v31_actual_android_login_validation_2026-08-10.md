# AAB v31 실제 Android Google 로그인 검증 기록

## 대상

- Kanban: `t_3cac24f0`
- AAB: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v31-20260810_0059-65678c7aa4df.aab`
- Package: `com.jungyoon.zombieschool`
- Expected versionCode / versionName: `31` / `1.0.16`
- Bytes: `15,774,455`
- SHA-256: `65678c7aa4df4623024e4b8e1a35765e9eb5eb132e7feaabc94016427f86737c`
- 검증 시각: `2026-08-10 20:43 KST` 재확인

## 필수 게이트 확인

- mandatory pre-command checker 실행 완료: profile `launchmini`, domain `auto`, resolved domains `common`, `aab`, `backend`.
- matched_domains: `aab`, `backend`.
- match_evidence: `aab` keyword `aab`, `backend` keyword `login`.
- combined_receipt_sha256: `a4da0c28f97d85e186a3725666c7a90de4bb5c4f89f523011e3a0d5372b357a0`.
- launchmini 필수 preflight 문서 `Developer/agent_room/launchmini_aab_physical_android_google_login_mandatory_preflight.md`가 checker `read_required`에 포함됨을 확인하고 읽음.

## 직전 AAB/소스 재확인

| 확인 | 결과 |
| --- | --- |
| `android/app/build.gradle` | `versionCode 31`, `versionName "1.0.16"` |
| AAB stat | `15774455` bytes, mtime `2026-08-10 00:57:18.976973000 +0900` |
| AAB SHA-256 | `65678c7aa4df4623024e4b8e1a35765e9eb5eb132e7feaabc94016427f86737c` |
| ZIP integrity | `No errors detected in compressed data` |
| jarsigner | `jar verified.`, exit `0`; upload-key self-signed/chain/timestamp/JarInputStream warnings recorded, not treated as login evidence |
| bundletool | unavailable in known SDK/Android Studio/Gradle paths, so official bundle manifest/resource dump not rerun |
| current workspace fallback bundle manifest | `package="com.jungyoon.zombieschool"`, `android:versionCode="30"`, `android:versionName="1.0.16"`; this fallback intermediate is stale/current-workspace evidence, not a successful v31 AAB manifest dump |
| prior v31 build record | `Developer/구현기록/빌드배포/aab_build_v31_2026-08-10.md` records manifest verified as `com.jungyoon.zombieschool`, `versionCode=31`, `versionName=1.0.16` |

## 실제 기기/AVD 확인

| 확인 | 명령 | 결과 |
| --- | --- | --- |
| gstack | `test -d ~/.claude/skills/gstack/bin` | `GSTACK_OK` |
| adb 존재 | `/c/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe version` | adb `1.0.41`, version `37.0.0-14910828` |
| adb 연결 | `adb.exe devices -l` | `List of devices attached` 뒤에 authorized device가 없음 |
| 등록 AVD | `emulator.exe -list-avds` | 출력 없음 |
| 실행 중 AVD | `ps -W | grep -Ei 'emulator|qemu-system|qemu'` | 없음 |
| SDK system image | `C:\Users\admin\AppData\Local\Android\Sdk\system-images` 확인 | 디렉터리 없음 (`SYSTEM_IMAGES_DIR_MISSING`) |
| Android SDK 관리자 | SDK 아래 `sdkmanager*`, `avdmanager*` 검색 | 없음 |
| bundletool | SDK, Android Studio, Gradle cache에서 `bundletool*.jar` 검색 | 없음 |

## 실행하지 않은 항목

- 설치 가능한 APK 생성 및 설치: 연결된 Android 기기/AVD가 없고, AAB를 APK set으로 만들 bundletool도 없어 실행하지 않음.
- 임시 AVD 생성·부팅: 등록 AVD, system image, `avdmanager`, `sdkmanager`가 없어 생성할 수 없음.
- 앱 데이터 삭제·uninstall: 권한 없는 파괴적 조작이므로 실행하지 않음.
- Google/Firebase 로그인, native chooser, 리디렉션 복귀, 계정 진행도, 로비, Stage 1 진입: 실제 Android 실행 환경이 없어 관찰하지 못함.
- Play Console upload, Firebase 변경, 코드 변경, 커밋, 푸시: 실행하지 않음.

## Git 상태 주의

현재 작업 트리는 깨끗하지 않다. 확인 시점의 변경:

```text
 M Developer/r3f_prototype/android/app/build.gradle
 M Developer/r3f_prototype/src/App.jsx
 M Developer/r3f_prototype/src/components/TitleScreen.jsx
 M Developer/r3f_prototype/src/components/TitleScreen.settings.test.jsx
 M Developer/r3f_prototype/src/lib/graphicsStudioConfig.js
 M Developer/r3f_prototype/src/lib/studioRuntimeState.js
 M Quaility_Assurance/google_play_version_ledger.md
?? Developer/구현기록/빌드배포/aab_build_v31_2026-08-10.md
?? Quaility_Assurance/aab_v31_actual_android_login_validation_2026-08-10.md
```

이 검증 작업은 위 코드/Play/Firebase 상태를 변경하지 않았고, QA 기록 파일만 현재 관측 증거로 정리했다.

## 판정

- 실제 Android/AVD Google-Firebase 로그인: **BLOCKED / 미검증**.
- 로비 진입: **BLOCKED / 미검증**.
- Stage 1 진입: **BLOCKED / 미검증**.
- Play 배포 기준 strict 로그인 판정: **NO-GO**. authorized Android device/AVD 및 Play test track 설치 증거가 없다.
- production/global rollout: **NO-GO**. 사용자 명시 지시가 없고 실제 Android 로그인·로비·게임 진입 증거가 없다.

## 재개 조건

1. USB debugging 승인된 실제 Android 기기 또는 실행 가능한 AVD를 연결한다.
2. AVD 경로라면 Google APIs/Google Play system image, `avdmanager`, `sdkmanager`, bundletool을 설치한 뒤 생성한다.
3. strict Play 판정이면 Play internal/closed test에서 설치한 동일 versionCode 31 빌드와 tester 권한을 준비한다.
4. 새 로그인 상태가 필요하면 앱 데이터 삭제 승인을 별도로 받는다.
