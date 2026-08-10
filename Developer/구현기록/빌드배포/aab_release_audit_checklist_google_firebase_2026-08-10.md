# AAB 출시 검수 체크리스트 — Google 로그인 + Firebase 안드로이드 게임

- 작성일: 2026-08-10 22:17:40
- 대상 프로젝트: Escape Zombie School / 탈출! 좀비학교
- 대상 산출물 예시: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v32-20260810_7b2f0fd5e2a2.aab`
- versionCode 예시: `32`
- versionName 예시: `1.0.17`

> 에이전트용 문서. 사람이 읽는 안내문이 아니라 실행 명세다.  
> 이 파일을 저장소에 커밋하고, AAB 산출 직후 에이전트에게 이 파일 경로를 주고 실행시킨다.

---

## AGENT CONTRACT

```yaml
role: release_auditor
scope: 이 저장소에서 산출된 릴리스 AAB 1개
authority: 읽기 + 로컬 검증 명령 실행. 소스 수정 금지. 업로드 금지.
output: 아래 OUTPUT SCHEMA 형식의 JSON 1개 + 사람이 읽는 요약
stop_condition: severity=BLOCKER 항목이 1개라도 FAIL이어도 즉시 중단하지 말 것. 반드시 나머지도 전부 검사한 뒤, 최종 보고서 최상단에 BLOCKER를 표시한다.
forbidden:
  - 체크 항목을 "아마 괜찮을 것"으로 PASS 처리
  - 확인하지 못한 항목을 PASS로 표기. 반드시 UNKNOWN 처리
  - debug 빌드로 검증하고 release로 간주
  - 에뮬레이터 검증 결과를 실기기 검증으로 간주
  - 웹 dist 또는 Firebase Hosting만 보고 AAB 내부 번들이 검증됐다고 주장
  - Google 로그인 미검증 상태를 출시 가능으로 판단
  - Firebase env 누락 또는 OAuth 실패를 경고로 낮춰서 PASS 처리
```

## 핵심 원칙

모든 검증은 `release` 빌드 타입, Play가 재서명한 실제 배포 산출물 기준으로 한다.  
이 게임에서 지금까지 발생한 사고는 전부 “debug에서는 되는데 release에서 안 되는” 부류다.

**로그인 / Firebase / 로비 진입 중 하나라도 실제 release AAB에서 깨지면 severity=BLOCKER다.**  
이 경우 출시 후보로 올리면 안 된다.

---

## 입력값

에이전트는 실행 전에 아래 값을 확정해야 한다.

```yaml
aab_path: <검수할 .aab 절대경로>
previous_release_versionCode: <Play Console 또는 ledger 기준 이전 출시 versionCode>
expected_application_id: com.jungyoon.zombieschool
google_services_json_path: Developer/r3f_prototype/android/app/google-services.json
bundletool_jar: C:/Users/admin/AppData/Local/Temp/bundletool-all-1.18.3.jar
java_home_if_needed: C:/Program Files/Android/Android Studio/jbr
real_device_required: true
```

---

## PRE-0. 산출물 신원 확인

| ID | severity | 검사 | 명령/방법 | PASS 기준 |
|---|---|---|---|---|
| P0-1 | BLOCKER | AAB 파일 존재 및 경로 기록 | `find . -name "*.aab" -newermt "-2 hours"` 또는 명시 경로 확인 | 검수 대상이 정확히 1개로 확정되고 빌드 시각이 최근 |
| P0-2 | BLOCKER | versionCode 증가 | `bundletool dump manifest --bundle=<AAB>` | 이전 출시본보다 큼 |
| P0-3 | BLOCKER | applicationId 일치 | `bundletool dump manifest --bundle=<AAB>` | manifest package가 `google-services.json`의 `package_name` 및 기대값과 일치 |
| P0-4 | BLOCKER | versionName 기록 | `bundletool dump manifest --bundle=<AAB>` | 실제 표시 버전이 release note/ledger와 일치 |
| P0-5 | BLOCKER | release 서명 검증 | `jarsigner -verify -certs -verbose <AAB>` | exit code 0, release 서명 존재 |
| P0-6 | MAJOR | SHA256 기록 | `sha256sum <AAB>` | SHA256을 출력 JSON에 기록 |

---

## PRE-1. AAB 내부 웹 번들 확인

| ID | severity | 검사 | 명령/방법 | PASS 기준 |
|---|---|---|---|---|
| P1-1 | BLOCKER | AAB 내부 `base/assets/public` 존재 | AAB zip 목록 확인 | `base/assets/public/index.html` 및 assets chunk 존재 |
| P1-2 | BLOCKER | 최신 수정 반영 여부 | AAB 내부 JS에서 start/lobby 관련 chunk 확인 | `TitleScreen`, `Lobby`, `App`, `ReadyGameApp` chunk가 존재하고 빌드 시각이 최신 |
| P1-3 | BLOCKER | dist와 Android assets sync 여부 | `npm run build` 결과와 `android/app/src/main/assets/public` 비교 또는 cap sync 로그 확인 | AAB 내부가 최신 web build 기반임을 증명 |
| P1-4 | MAJOR | JS asset count 기록 | zip 목록 집계 | asset count를 JSON에 기록 |

---

## PRE-2. Google / Firebase 구성 확인

| ID | severity | 검사 | 명령/방법 | PASS 기준 |
|---|---|---|---|---|
| F0-1 | BLOCKER | `google-services.json` 존재 | 파일 존재 확인 | release app module에 존재 |
| F0-2 | BLOCKER | package_name 일치 | `google-services.json` 파싱 | `com.jungyoon.zombieschool`와 일치 |
| F0-3 | BLOCKER | Firebase web env 누락 경고 여부 | AAB 내부 번들 실행 후 화면/console 확인 | `Firebase .env 설정 필요`, `Google 로그인 설정 필요` 같은 release-blocking 경고 없음 |
| F0-4 | BLOCKER | OAuth domain/SHA 설정 가능성 | 실제 Android release 설치 후 Google 로그인 시도 | Google 로그인 플로우가 정상 시작되고 앱으로 복귀 가능 |
| F0-5 | BLOCKER | Firebase Auth provider 동작 | 실제 release 앱에서 로그인 | 로그인 성공 후 user 상태가 앱에 반영됨 |
| F0-6 | MAJOR | Firebase progress/profile read | 로그인 후 진행정보/프로필 읽기 | 실패해도 게임 진입은 막지 않되, 오류는 기록 |

---

## PRE-3. 타이틀 / 시작 / 로비 진입 검증

| ID | severity | 검사 | 명령/방법 | PASS 기준 |
|---|---|---|---|---|
| S0-1 | BLOCKER | AAB 내부 번들 모바일 smoke | AAB의 `base/assets/public` 추출 → local server → Pixel 5 viewport | 타이틀 화면 표시, 흰 화면 아님 |
| S0-2 | BLOCKER | 타이틀 3D 표시 | screenshot + canvas/DOM 확인 | 타이틀 3D/캐릭터/배경이 표시됨. Firebase true/false readiness 때문에 null 처리되면 FAIL |
| S0-3 | BLOCKER | `게임 시작` 클릭 | extracted bundle + 모바일 viewport | 로그인 여부와 무관하게 로비 화면으로 진입 |
| S0-4 | BLOCKER | 로비 crash 여부 | 클릭 후 console/pageerror 수집 | 치명적 JS error 없음 |
| S0-5 | BLOCKER | 로비 UI 표시 | 클릭 후 body text/screenshot | `플레이어`, `시즌`, `무기`, `랭킹`, `상점` 등 로비 텍스트 확인 |
| S0-6 | BLOCKER | Firebase/Studio 런타임 fail-open | signed-out / Firebase hydrate 실패 조건에서 로비 진입 | 로비 진입이 Studio runtime readiness에 막히지 않음 |

---

## PRE-4. 실제 Android release 검증

> 이 섹션은 에뮬레이터와 실기기를 구분해서 기록한다.  
> 에뮬레이터 PASS는 실기기 PASS가 아니다.

| ID | severity | 검사 | 명령/방법 | PASS 기준 |
|---|---|---|---|---|
| A0-1 | BLOCKER | release AAB에서 APK 생성 | bundletool build-apks | release 서명/배포 조건으로 APK set 생성 |
| A0-2 | BLOCKER | 실제 Android 기기 설치 | bundletool install-apks 또는 Play internal track | 설치 성공 |
| A0-3 | BLOCKER | 앱 실행 | 실기기 실행 + logcat | splash 후 타이틀 진입, crash 없음 |
| A0-4 | BLOCKER | Google 로그인 | 실기기 release 앱에서 로그인 | 계정 선택/인증/앱 복귀/user 반영 성공 |
| A0-5 | BLOCKER | 로그인 실패 시 게임 진입 | 로그아웃/실패 상태에서 `게임 시작` | 로그인 실패가 로비 진입을 막지 않음 |
| A0-6 | BLOCKER | 로비 → 스테이지 진입 | 실기기에서 스테이지 시작 | 실제 gameplay canvas 진입, crash 없음 |
| A0-7 | MAJOR | logcat 오류 기록 | `adb logcat` | Firebase/Auth/WebView fatal error 없음 |

---

## PRE-5. Play Console 업로드 전 금지 조건

아래 중 하나라도 해당하면 출시 후보로 업로드 금지.

| ID | severity | 조건 | 처리 |
|---|---|---|---|
| G0-1 | BLOCKER | Google 로그인 실패 | 원인 보고서 작성 후 수정 AAB 재빌드 |
| G0-2 | BLOCKER | `게임 시작`이 로비로 안 넘어감 | 출시 중지, start/lobby fail-open 수정 |
| G0-3 | BLOCKER | Firebase env 누락 경고가 release 화면에 노출 | 출시 중지, env/빌드 파이프라인 수정 |
| G0-4 | BLOCKER | AAB 내부 번들이 최신 dist가 아님 | `npm run build` + `cap sync android` + AAB 재빌드 |
| G0-5 | BLOCKER | versionCode가 이전 출시본 이하 | versionCode 증가 후 재빌드 |
| G0-6 | BLOCKER | debug build 결과만 있음 | release 검증 다시 수행 |
| G0-7 | BLOCKER | 에뮬레이터만 검증하고 실기기 미검증 | 실기기 미검증은 UNKNOWN/BLOCKER로 보고 |

---

## OUTPUT SCHEMA

에이전트는 최종 출력에 반드시 JSON 1개와 사람이 읽는 요약을 포함한다.

```json
{
  "artifact": {
    "aab_path": "",
    "sha256": "",
    "size_bytes": 0,
    "versionCode": null,
    "versionName": "",
    "applicationId": ""
  },
  "overall_status": "PASS | FAIL | UNKNOWN",
  "blockers": [
    {
      "id": "",
      "title": "",
      "evidence": "",
      "required_action": ""
    }
  ],
  "checks": [
    {
      "id": "P0-1",
      "severity": "BLOCKER | MAJOR | MINOR",
      "status": "PASS | FAIL | UNKNOWN",
      "evidence": "실제 명령 출력 또는 관찰 증거",
      "notes": ""
    }
  ],
  "device_validation": {
    "emulator": "PASS | FAIL | UNKNOWN | NOT_RUN",
    "real_device": "PASS | FAIL | UNKNOWN | NOT_RUN",
    "notes": ""
  },
  "login_validation": {
    "google_login": "PASS | FAIL | UNKNOWN | NOT_RUN",
    "firebase_auth_user_reflected": "PASS | FAIL | UNKNOWN | NOT_RUN",
    "signed_out_start_to_lobby": "PASS | FAIL | UNKNOWN | NOT_RUN",
    "notes": ""
  },
  "summary_for_human": ""
}
```

---

## 오르카 세션 관리자 추가 지시

1. 오늘 아침 AAB를 뽑은 관련 세션들에 대해 별도 보고서를 작성한다.
2. 특히 `versionCode 31` AAB를 뽑은 세션은 아주 면밀하게 감사한다.
3. 특히 00:59경 v31 AAB `app-release-v31-20260810_0059-65678c7aa4df.aab`를 다룬 코덱스 세션을 찾아, 판단/검증/누락을 전부 확인한다.
4. 앞으로 AAB 산출 후 Google 로그인 또는 Firebase/Auth/로비 진입 문제가 남아 있으면 출시 후보로 올리지 않는다.
5. `studioVisualsReady`, `studioReady`, `remote-applied`, `isFirebaseStudioRuntimeReady()` 같은 true/false readiness가 타이틀 3D 또는 게임 시작/로비 진입을 막으면 BLOCKER다.
6. 로그인 검증이 안 되면 “확인 못 함”이 아니라 `UNKNOWN` 또는 `FAIL`로 보고한다. PASS 금지.

Terry의 의도: **AI가 AAB를 뽑은 뒤 로그인/로비 진입 문제를 놓치면 안 된다. 이 항목은 최우선 BLOCKER다.**
