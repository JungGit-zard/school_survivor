# ESZS v32 AAB Session Handoff for Orca Session Manager

- 작성 시각: 2026-08-10 22:13:39
- 프로젝트: Escape Zombie School / 탈출! 좀비학교
- 작업 위치: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype`
- 요청: v31 AAB에서 `게임 시작` 클릭 후 로비로 넘어가지 않는 문제 수정 후 v32 AAB 재생성

## 핵심 결과

1. `게임 시작` 버튼이 Google 로그인/Firebase 상태에 묶여 로비 진입이 막히던 문제를 수정했다.
2. 일반 게임 시작은 로그인 여부와 무관하게 바로 로비로 진입하도록 바꿨다.
3. 로비 진입 후 Firebase Graphics Studio runtime hydrate 미준비로 터질 수 있는 2차 문제를 fail-open으로 처리했다.
4. v32 AAB를 새로 생성했다.
5. AAB 내부 웹 번들을 직접 추출해 모바일 Pixel 5 뷰포트에서 `게임 시작 → 로비` 진입을 확인했다.

## 생성된 AAB

- 파일: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v32-20260810_7b2f0fd5e2a2.aab`
- versionCode: `32`
- versionName: `1.0.17`
- SHA256: `7b2f0fd5e2a2cfcedb6599a9eb30d1bc3899add25b7d612a8d3c2f1e5d363b11`
- size: `15,774,034 bytes`

## 검증

- `npm run build`: 성공
- `cap sync android`: 성공
- `./gradlew bundleRelease`: 성공
- `jarsigner -verify`: 성공
- `bundletool dump manifest`: `android:versionCode="32"`, `android:versionName="1.0.17"` 확인
- AAB 내부 `base/assets/public` 추출 후 로컬 smoke:
  - 클릭 전: `게임 시작` 표시 확인
  - 클릭 후: 로비 텍스트 `플레이어`, `시즌`, `무기`, `랭킹`, `상점` 확인
  - 치명적 JS page error 없음

## 수정 파일

- `src/components/TitleScreen.jsx`: 시작 버튼에서 `signInWithGoogle()` 요구 제거, `enterLobbyFromStart()` 직접 호출.
- `src/components/TitleScreen.settings.test.jsx`: 시작 버튼이 인증을 시작하지 않고 로비로 진입해야 한다는 테스트로 수정.
- `src/App.jsx`: 일반 게임 루트에서 일반 유저가 Firebase Studio workspace를 hydrate/subscribe하던 effect 제거.
- `src/lib/studioRuntimeState.js`: Studio runtime read가 준비 전에도 `{}`를 반환하도록 fail-open.
- `src/lib/graphicsStudioConfig.js`: `stageBossPreview`가 불완전하면 throw 대신 `DEFAULT_STAGE_BOSS_PREVIEW` 반환.
- `android/app/build.gradle`: `versionCode 32`, `versionName "1.0.17"`.

## 관련 기록 문서

- v32 AAB 재빌드 사유 문서:
  - `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/구현기록/빌드배포/aab_rebuild_reason_v32_2026-08-10.md`

## 오르카 세션 관리자에게 요청

약 3시간 뒤에 아래를 추가로 확인해 주세요.

1. Play Console 업로드 전 AAB 파일 경로와 SHA256이 위 값과 일치하는지 확인.
2. 실제 업로드 후보가 v32인지, 예전 v31 AAB를 실수로 올리지 않았는지 확인.
3. 가능하면 실제 Android 기기/에뮬레이터 설치 테스트로 `타이틀 → 게임 시작 → 로비 → 스테이지 진입`까지 확인.
4. 현재 작업트리에 이전 QA 문서/false_note 변경도 함께 남아 있으므로, 커밋/정리 전에 관련 없는 변경이 섞이지 않았는지 확인.

## 현재 git 상태 요약

수정됨:

- `android/app/build.gradle`
- `src/App.jsx`
- `src/components/TitleScreen.jsx`
- `src/components/TitleScreen.settings.test.jsx`
- `src/lib/graphicsStudioConfig.js`
- `src/lib/studioRuntimeState.js`
- `../../Quaility_Assurance/google_play_version_ledger.md`

새 파일:

- `Developer/구현기록/빌드배포/aab_build_v31_2026-08-10.md`
- `Developer/구현기록/빌드배포/aab_rebuild_reason_v32_2026-08-10.md`
- `../../Quaility_Assurance/aab_v31_actual_android_login_validation_2026-08-10.md`
- `../../false_note/aab_v31_login_audit_failure_reflection_2026-08-10.md`

민감정보는 포함하지 않았다.

## 추가 지시 — 2026-08-10 22:15 KST

Terry 추가 지시:

1. 오늘 아침 AAB를 뽑은 관련 세션들에 별도 보고서를 작성하게 할 것.
2. 특히 `versionCode 31` AAB를 뽑은 세션은 아주 면밀하게 확인할 것.
3. 특히 어제/오늘 00:59경 v31 AAB(`app-release-v31-20260810_0059-65678c7aa4df.aab`)를 다룬 코덱스 세션을 찾아, 해당 세션의 판단/검증/누락을 전부 면밀히 볼 것.
4. 앞으로 AAB를 뽑은 뒤 로그인/로비 진입 문제가 남아 있으면 절대 안 된다. 로그인 문제가 있으면 출시 후보로 올리지 말고 즉시 전체 원인 보고서를 작성할 것.
5. 2026-08-09 로그인/Firebase true/false 게이트 관련 원문 세션으로 `20260809_024722_a8176d` / parent `20260809_003455_a16f07`가 확인됐다. 여기에는 `studioVisualsReady 삭제해`, `그냥 나오게 해`, `트루펄스 없어 무조건이야` 취지의 지시와 “로그인/Firebase 게이트가 타이틀/진입을 막으면 안 된다”는 핵심 맥락이 있다.

오르카 세션 관리자는 위 세션들을 연결해서 “왜 v31에서 같은 계열의 로그인/진입 문제가 다시 남았는지” 감사 보고서를 작성해야 한다.
