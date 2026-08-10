# Firebase 그래픽 정보 / 로그인 / AAB 진입 사고 정리 — 2026-08-07~2026-08-10

- 작성일: 2026-08-10 22:22 KST
- 대상 프로젝트: Escape Zombie School / 탈출! 좀비학교
- 범위: 금요일(2026-08-07)부터 오늘(2026-08-10)까지 반복된 Firebase 그래픽 정보 hydrate, Google 로그인, 게임 시작/로비 진입, AAB release 검증 실패 계열
- 작성 목적: 오르카 세션 관리자가 전체 오류 액션을 분배하고, 특히 v31 AAB 생성 세션을 다시 감사하기 위한 실행 문서

---

## 0. 최종 판정

이번 기간의 문제는 단일 버그가 아니라 아래 네 계열이 서로 얽힌 반복 사고다.

1. **게임 시작/로비 진입이 Google 로그인과 Firebase hydrate에 묶임**
2. **타이틀/그래픽 표시가 Firebase Graphics Studio runtime readiness true/false에 묶임**
3. **Graphics Studio/Auth persistence가 로그인 상태를 예측 불가능하게 보이게 함**
4. **AAB 산출 후 release Android 실기기 로그인 검증 없이 주변 형식 검증만으로 완료처럼 보고함**

이 중 AAB release 후보에서 하나라도 남아 있으면 `BLOCKER / NO-GO`다.  
Google 로그인, Firebase Auth, signed-out `게임 시작 → 로비`, AAB 내부 번들, 실제 Android release 설치 검증은 서로 대체할 수 없다.

---

## 1. 확인된 주요 근거 파일

### v31 로그인 감사 실패 반성문

- 파일: `D:/JungSil/2.Minigame_project/school_survivor-integration/false_note/aab_v31_login_audit_failure_reflection_2026-08-10.md`
- 핵심:
  - v31 `TitleScreen.jsx`의 `handleStartClick()`이 미로그인 상태에서 `signInWithGoogle()`을 강제 호출했다.
  - Google 로그인 실패/취소/반환값 없음이면 `enterLobbyFromStart()`가 실행되지 않아 로비 진입이 막혔다.
  - 기존 테스트가 이 잘못된 동작을 정상 사양처럼 고정했다.
  - 일반 게임 경로의 `App.jsx`가 로그인 후 Firebase Graphics Studio hydrate/subscribe를 돌릴 수 있었다.
  - `getFirebaseStudioRuntimeDataset()`이 runtime 미준비 시 빈 데이터 대신 예외를 던져 그래픽/화면 전체 실패 가능성이 있었다.

### v31 실제 Android 로그인 검증 기록

- 파일: `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/aab_v31_actual_android_login_validation_2026-08-10.md`
- 대상 AAB:
  - `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v31-20260810_0059-65678c7aa4df.aab`
  - package: `com.jungyoon.zombieschool`
  - versionCode / versionName: `31` / `1.0.16`
  - SHA-256: `65678c7aa4df4623024e4b8e1a35765e9eb5eb132e7feaabc94016427f86737c`
- 핵심 판정:
  - authorized Android device 없음
  - 등록 AVD 없음
  - system image 없음
  - bundletool 없음
  - 실제 Google/Firebase 로그인, 로비, Stage 1 진입 관찰하지 못함
  - strict Play 판정: `NO-GO`

### Graphics Studio 비의도 로그인 진단

- 파일: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/graphics_studio_unexpected_login_diagnosis_2026-08-08.md`
- 핵심:
  - Firebase Auth가 `browserLocalPersistence`를 사용해 이전 Google 로그인 세션을 자동 복원했다.
  - 그래서 사용자가 별도 로그인을 하지 않았는데도 `signedIn`처럼 보일 수 있었다.
  - 이는 프로젝트 지시의 “클라이언트 인증 지속성은 메모리 전용” 규칙과 충돌했다.

### 신규 AAB release auditor 체크리스트

- 파일: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/구현기록/빌드배포/aab_release_audit_checklist_google_firebase_2026-08-10.md`
- 핵심:
  - release AAB 기준 검증만 인정
  - debug/web/Firebase Hosting 검증으로 대체 금지
  - Google 로그인 / Firebase Auth / signed-out start-to-lobby 미검증은 PASS 금지
  - 확인 불가 항목은 `UNKNOWN`, 실패 항목은 `FAIL`

---

## 2. 확인된 관련 세션

### 2026-08-09 로그인/Firebase true/false 게이트 원문 세션

- session_id: `20260809_024722_a8176d`
- parent_session_id: `20260809_003455_a16f07`
- 핵심 원문/맥락:
  - `studioVisualsReady 삭제해`
  - `그냥 나오게 해`
  - `트루펄스 없어 무조건이야`
  - `studioVisualsReady === false`면 `<TitleScene3D />`가 `null` 처리되어 타이틀 3D가 안 나오는 구조가 문제로 확인됨
  - 게임 시작이 미로그인 상태에서 Google 로그인으로 강제 이동하는 구조도 별도 문제로 확인됨

### 삭제 전 백업 DB에서 확인된 금요일 계열 세션

- DB: `C:/Users/admin/AppData/Local/hermes/state.before-title-session-delete.20260809_005157.db`
- 관련 세션:
  - `20260807_222026_5885fa`
  - `20260807_222744_c53038`
  - `20260807_223539_241e97`
- 핵심 원문 요지:
  - 로그인/파이어베이스/하이드레이트 같은 것이 게임 진입을 막으면 안 된다.
  - 게임 진입이 최우선이다.
  - 로그인 진입에 방해되는 것은 제거해야 한다.
  - 로비로 바로 가야 한다.

### v31 AAB 00:59 생성/검증 세션

- 정확한 session_search hit는 현재 세션 DB 검색에서 직접 식별되지 않았다.
- 대신 파일 근거는 확정됨:
  - `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v31-20260810_0059-65678c7aa4df.aab`
  - `Developer/구현기록/빌드배포/aab_build_v31_2026-08-10.md`
  - `Quaility_Assurance/aab_v31_actual_android_login_validation_2026-08-10.md`
  - `false_note/aab_v31_login_audit_failure_reflection_2026-08-10.md`
- 오르카는 반드시 00:59 v31 AAB를 만든 코덱스 세션을 세션 DB/작업 로그/파일 mtime 기준으로 다시 찾아야 한다.

---

## 3. 반복된 문제 유형 정리

### A. 로그인 강제 때문에 게임 시작/로비 진입 차단

- 위치: `src/components/TitleScreen.jsx`
- 실패 구조:
  - 미로그인 상태에서 `게임 시작`
  - `signInWithGoogle()` 강제 호출
  - 로그인 실패/취소/복귀 실패/반환값 없음
  - `enterLobbyFromStart()` 미실행
  - 로비 진입 실패
- 판정:
  - release AAB에서는 `BLOCKER`
- 원칙:
  - `게임 시작`은 로그인 버튼이 아니다.
  - 로그인은 계정 패널의 선택 기능이어야 한다.
  - signed-out 상태에서도 로비 진입은 fail-open이어야 한다.

### B. Firebase Graphics Studio readiness가 타이틀 3D 표시를 차단

- 위치/개념:
  - `studioVisualsReady`
  - `studioReady`
  - `studioCloudStatus === 'remote-applied'`
  - `isFirebaseStudioRuntimeReady()`
  - `<Canvas>{studioVisualsReady ? <TitleScene3D /> : null}</Canvas>` 계열
- 실패 구조:
  - Firebase canonical graphics hydrate 실패
  - remote-applied 아님
  - runtime ready false
  - title 3D null 처리
  - 타이틀 UI만 보이고 3D 배경/캐릭터가 사라짐
- 판정:
  - release AAB에서는 `BLOCKER`
- 원칙:
  - Firebase Graphics Studio 데이터는 튜닝/향상 데이터다.
  - baseline title 3D는 local/default 데이터로 항상 나와야 한다.
  - readiness false가 `<TitleScene3D />`를 null 처리하면 안 된다.

### C. 일반 게임 루트가 Auth user로 Studio workspace hydrate/subscribe 수행

- 위치: `src/App.jsx`
- 실패 구조:
  - 일반 플레이어 로그인
  - 일반 게임 루트에서 Studio workspace hydrate/subscribe 실행
  - Studio/Firebase runtime 상태가 일반 게임의 표시·진입에 영향
- 판정:
  - 일반 게임 경로에서는 위험 구조
- 원칙:
  - 일반 게임은 public/canonical runtime snapshot만 읽는다.
  - 관리자 Graphics Studio workspace 구독/저장은 editor/master route에 한정한다.

### D. Firebase Studio runtime 미준비 예외

- 위치: `src/lib/studioRuntimeState.js`
- 실패 구조:
  - runtime dataset이 아직 준비되지 않음
  - read helper가 `{}`/default 대신 예외 throw
  - 로비/런타임 그래픽에서 crash 가능
- 판정:
  - release AAB에서 로비/타이틀/게임 시작을 깨면 `BLOCKER`
- 원칙:
  - runtime visual reader는 fail-open이어야 한다.
  - Firebase 데이터 누락은 게임 진입 차단 사유가 아니다.

### E. Firebase Auth persistence로 “로그인하지 않았는데 로그인된 것처럼 보임”

- 위치: `src/lib/firebaseAuth.js`, `src/store/useAuthStore.js`
- 실패 구조:
  - `browserLocalPersistence`가 이전 Google 세션 복원
  - `onAuthStateChanged`가 user 객체 전달
  - UI가 `signedIn` 상태로 반영
  - 사용자는 별도 로그인하지 않았는데 로그인된 것처럼 인식
- 판정:
  - Studio/admin 접근 경계에서는 위험
- 원칙:
  - 프로젝트 지시가 memory-only auth라면 local persistence는 금지.
  - release QA는 fresh install/fresh app data 상태와 existing-session 상태를 분리해서 검증해야 한다.

### F. AAB release 검증을 주변 형식 검증으로 대체

- 위치: v31 AAB 생성/검증 세션
- 실패 구조:
  - SHA/signature/zip/assets/build success를 길게 검사
  - 실제 Android Google 로그인/로비/Stage 1 진입 미검증
  - 그래도 완료처럼 보일 수 있는 보고 생성
- 판정:
  - release process failure
- 원칙:
  - AAB 산출 직후 최우선 검사는 사용자 동선이다.
  - `앱 실행 → 타이틀 → Google 로그인 → 앱 복귀 → user 반영 → 게임 시작 → 로비 → Stage 1`
  - 기기가 없으면 `UNKNOWN/NO-GO`이며 PASS가 아니다.

---

## 4. v32에서 수정된 것으로 보고된 항목

- v32 AAB:
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v32-20260810_7b2f0fd5e2a2.aab`
  - versionCode: `32`
  - versionName: `1.0.17`
  - SHA256: `7b2f0fd5e2a2cfcedb6599a9eb30d1bc3899add25b7d612a8d3c2f1e5d363b11`

수정 보고 항목:

1. `TitleScreen.jsx`
   - `게임 시작`에서 Google 로그인 강제 제거
   - `enterLobbyFromStart()` 직접 실행
2. `TitleScreen.settings.test.jsx`
   - 시작 버튼이 인증 대신 로비 진입해야 한다는 테스트로 수정
   - Firebase/Studio readiness false여도 타이틀 scene이 나와야 하는 기대값으로 수정
3. `App.jsx`
   - 일반 게임 루트의 일반 유저 Studio workspace hydrate/subscribe 제거
4. `studioRuntimeState.js`
   - runtime 미준비 시 fail-open
5. `graphicsStudioConfig.js`
   - 불완전한 `stageBossPreview`는 throw 대신 default 반환
6. `android/app/build.gradle`
   - versionCode `32`, versionName `1.0.17`

검증 보고 항목:

- `npm run build`: 성공
- `cap sync android`: 성공
- `./gradlew bundleRelease`: 성공
- `jarsigner -verify`: 성공
- `bundletool dump manifest`: versionCode 32 / versionName 1.0.17 확인
- AAB 내부 `base/assets/public` 추출 후 모바일 Pixel 5 viewport smoke:
  - 타이틀 표시
  - `게임 시작` 클릭
  - 로비 텍스트 `플레이어`, `시즌`, `무기`, `랭킹`, `상점` 확인
  - 치명적 JS page error 없음

남은 항목:

- 실제 Android 실기기 release 설치
- Google 로그인 완료
- Firebase Auth user 반영
- login 실패/취소 상태에서 signed-out start-to-lobby
- 로비 → Stage 1 실기기 진입

이 남은 항목은 `PASS`가 아니라 `UNKNOWN`이다. Play 업로드 전 확인해야 한다.

---

## 5. 오르카 세션 관리자 액션 분배 지시

오르카는 아래 액션을 각각 독립 감사/검수 작업으로 분배한다.

### Action 1 — v31 AAB 생성 세션 재감사

- 대상:
  - `app-release-v31-20260810_0059-65678c7aa4df.aab`
  - 00:59경 해당 AAB를 만든 코덱스 세션
- 해야 할 일:
  1. 정확한 세션 ID를 찾는다.
  2. 그 세션이 어떤 소스 상태에서 AAB를 만들었는지 확인한다.
  3. `TitleScreen.jsx.handleStartClick()`를 먼저 보지 않은 이유를 기록한다.
  4. 테스트가 잘못된 로그인 강제 동작을 PASS로 고정했는지 확인한다.
  5. 실제 Android 로그인/로비/Stage 1 미검증을 왜 완료처럼 보고했는지 기록한다.
- 산출물:
  - `v31_session_audit_report_<timestamp>.md`

### Action 2 — Firebase graphics readiness 게이트 전수 조사

- 대상:
  - `studioVisualsReady`
  - `studioReady`
  - `remote-applied`
  - `isFirebaseStudioRuntimeReady()`
  - `getFirebaseStudioRuntimeDataset()`
  - `loadStudioTunings()` / boss preview / texture decal / prop placement readers
- 해야 할 일:
  1. 이 값들이 타이틀 3D, 로비, gameplay 진입을 null/return/throw로 막는 곳을 전수 검색한다.
  2. default/local visual fallback이 있는지 확인한다.
  3. readiness false 상태에서도 baseline title/gameplay가 보이는지 테스트한다.
- 산출물:
  - `firebase_graphics_readiness_gate_audit_<timestamp>.md`

### Action 3 — Google 로그인/Auth persistence 감사

- 대상:
  - `firebaseAuth.js`
  - `useAuthStore.js`
  - Google popup/redirect/native login path
  - `onAuthStateChanged`
  - app data fresh state / existing session state
- 해야 할 일:
  1. memory-only persistence 규칙과 실제 구현이 일치하는지 확인한다.
  2. 이전 세션 자동 복원이 Studio/admin 권한처럼 보이게 하는 경로를 분리한다.
  3. fresh install/fresh app data release 상태에서 Google 로그인 성공과 앱 복귀를 검증한다.
- 산출물:
  - `google_firebase_auth_persistence_audit_<timestamp>.md`

### Action 4 — v32 release AAB 실행 검수

- 대상:
  - `app-release-v32-20260810_7b2f0fd5e2a2.aab`
  - 체크리스트: `Developer/구현기록/빌드배포/aab_release_audit_checklist_google_firebase_2026-08-10.md`
- 해야 할 일:
  1. release AAB 내부 번들 기준 검수
  2. signed-out `게임 시작 → 로비`
  3. 실제 Android release 설치
  4. Google 로그인 완료
  5. Firebase Auth user 반영
  6. 로비 → Stage 1 진입
- 산출물:
  - JSON 1개 + 사람 요약
  - BLOCKER가 있으면 최상단 `NO-GO`

### Action 5 — 테스트 계약 재작성 감사

- 대상:
  - `TitleScreen.settings.test.jsx`
  - `App.firebaseBootstrap.test.jsx`
  - `firebaseAuth.test.js`
  - `e2eAuth.test.js`
  - 로그인/진입/타이틀 그래픽 관련 모든 테스트
- 해야 할 일:
  1. “로그인 강제”나 “readiness false면 타이틀 없음”을 정상으로 보는 낡은 테스트를 찾는다.
  2. 사용자 사양과 반대되는 PASS를 제거한다.
  3. release-critical smoke 테스트를 추가/확인한다.
- 산출물:
  - `release_login_graphics_test_contract_audit_<timestamp>.md`

---

## 6. 앞으로 금지할 완료 판정

아래 보고 문구는 금지한다.

- “빌드 성공했으니 로그인도 될 것 같습니다.”
- “AAB 서명이 검증됐으니 release 검증 완료입니다.”
- “웹에서는 되므로 Android도 될 겁니다.”
- “에뮬레이터에서 됐으니 실기기도 된 것으로 봅니다.”
- “로그인 확인은 못 했지만 다른 항목이 통과했습니다.”
- “Firebase hydrate 실패는 경고일 뿐입니다.”

대체 문구:

- “실제 Android release Google 로그인은 `UNKNOWN`입니다. Play 업로드 `NO-GO`입니다.”
- “signed-out start-to-lobby는 PASS이나 Google login 완료는 미검증입니다.”
- “Firebase runtime readiness false에서 baseline title/gameplay 표시 PASS입니다.”
- “release AAB 내부 번들 기준 smoke PASS입니다.”

---

## 7. 오르카에게 전달할 핵심 문장

오르카 세션 관리자는 아래 원칙을 모든 하위 세션에 배포한다.

> AAB를 뽑은 뒤 Google 로그인, Firebase Auth, signed-out 게임 시작→로비, 로비→Stage 1 중 하나라도 release AAB 기준으로 검증되지 않으면 PASS가 아니다.  
> 특히 v31을 만든 세션은 다시 열어, 왜 로그인/로비 진입 문제를 가장 먼저 보지 않았는지 감사 보고서를 작성한다.  
> Firebase Graphics Studio readiness true/false가 타이틀 또는 게임 진입을 막는 구조는 BLOCKER다.  
> 테스트가 잘못된 동작을 PASS로 고정하고 있으면 테스트 통과는 증거가 아니라 결함이다.

---

## 8. 현재 해야 할 다음 순서

1. 이 문서를 오르카 세션 관리자에게 전달한다.
2. 오르카는 Action 1~5를 분배한다.
3. v31 생성 세션은 별도 감사 보고서를 작성한다.
4. v32 AAB는 release auditor 체크리스트로 다시 검수한다.
5. 실제 Android 실기기 Google 로그인 검증 전에는 Play 업로드 후보로 간주하지 않는다.
