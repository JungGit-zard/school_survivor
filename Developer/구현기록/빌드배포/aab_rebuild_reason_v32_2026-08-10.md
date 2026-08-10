# v32 AAB 재빌드 사유 기록

- 작성일: 2026-08-10 22:10:51
- 대상 프로젝트: 탈출! 좀비학교 / Escape Zombie School
- 재빌드 산출물: `app-release-v32-20260810_7b2f0fd5e2a2.aab`
- versionCode: `32`
- versionName: `1.0.17`

## 오늘 AAB를 다시 뽑은 이유

1. **기존 v31 AAB에서 `게임 시작` 버튼을 눌러도 로비로 넘어가지 않는 문제가 확인됨**
   - 모바일 smoke 검사 중 타이틀 화면은 정상 표시됐지만, `게임 시작` 클릭 후 로비 진입이 되지 않았다.
   - 사용자가 직접 “게임시작 눌러도 안넘어간다”고 보고했고, 검사 결과와 일치했다.

2. **게임 시작 버튼이 Google 로그인/Firebase 상태에 묶여 있었음**
   - 기존 `TitleScreen.jsx`의 시작 버튼 흐름은 미로그인 상태에서 `signInWithGoogle()`을 먼저 요구했다.
   - Firebase/Google 설정이 불완전하거나 로컬/테스트 환경에서 로그인 시도가 실패하면 `return`되어 로비 진입이 막혔다.

3. **게임 시작은 로그인 여부와 무관하게 즉시 로비로 진입해야 하는 UX로 정리함**
   - Google 로그인은 상단 계정 패널에서 선택적으로 처리하고, `게임 시작`은 바로 로비 진입하도록 수정했다.
   - 진행정보 클라우드 저장은 부가 기능이어야 하며, 기본 게임 진입을 막으면 안 된다.

4. **로비 진입 후에도 Graphics Studio 런타임 데이터 미준비로 터질 수 있는 2차 문제를 발견함**
   - 시작 버튼만 고치면 타이틀은 벗어나지만, 로비가 `FirebaseStudioRuntime` hydrate를 요구하면서 예외를 낼 수 있었다.
   - Studio 런타임 read는 준비 전에도 빈 데이터셋으로 fail-open 하도록 수정했다.

5. **로비 보스 프리뷰 데이터가 없을 때 throw하지 않고 기본값을 쓰도록 수정함**
   - `stageBossPreview` 데이터가 비어 있으면 기존에는 incomplete payload 예외가 발생했다.
   - 기본값 `DEFAULT_STAGE_BOSS_PREVIEW`로 대체하여 로비가 열리도록 수정했다.

6. **일반 게임 루트에서 인증된 일반 유저가 Firebase Studio workspace를 읽으려던 흐름을 제거함**
   - 일반 플레이어 게임 루트는 Studio 편집 workspace를 읽거나 구독할 필요가 없다.
   - 이 흐름이 남아 있으면 로그인 상태에 따라 불필요한 Firebase Studio 접근과 장애 가능성이 생긴다.

7. **Play Console 업로드를 위해 versionCode 증가가 필요함**
   - 기존 업로드 후보가 v31이므로, 수정 반영 AAB는 `versionCode 32`로 올렸다.
   - `versionName`은 `1.0.17`로 갱신했다.

8. **수정된 웹 번들을 Android AAB 안에 반영해야 했음**
   - Vite 웹 빌드만으로는 Play용 AAB가 바뀌지 않는다.
   - `npm run build` 후 `cap sync android`로 `dist`를 Android assets에 복사하고, `bundleRelease`로 새 AAB를 생성했다.

## 수정 요약

- `src/components/TitleScreen.jsx`
  - `게임 시작` 버튼을 Google 로그인/Firebase hydrate와 무관하게 로비 진입하도록 변경.

- `src/components/TitleScreen.settings.test.jsx`
  - 시작 버튼이 인증을 시작하지 않고 로비로 진입해야 한다는 테스트 기대값으로 변경.

- `src/lib/studioRuntimeState.js`
  - Studio runtime read가 준비 전에도 `{}`를 반환하도록 fail-open 처리.

- `src/lib/graphicsStudioConfig.js`
  - `stageBossPreview`가 불완전할 때 예외 대신 기본 프리뷰 값을 사용하도록 변경.

- `src/App.jsx`
  - 일반 게임 루트에서 Firebase Studio workspace를 hydrate/subscribe하던 흐름 제거.

- `android/app/build.gradle`
  - `versionCode 32`
  - `versionName "1.0.17"`

## 검증 결과

1. **웹 프로덕션 빌드 성공**
   - `npm run build` 성공.
   - Legacy B02 artifact gate 통과.
   - Hosting JavaScript asset verification 통과: 55개 assets 확인.

2. **Capacitor Android sync 성공**
   - `cap sync android` 성공.
   - `dist`가 `android/app/src/main/assets/public`로 복사됨.

3. **Android release AAB 빌드 성공**
   - `./gradlew bundleRelease` 성공.

4. **AAB manifest 버전 확인 완료**
   - `android:versionCode="32"`
   - `android:versionName="1.0.17"`

5. **AAB 서명 검증 완료**
   - `jarsigner -verify` 성공.

6. **AAB 내부 웹 번들 모바일 smoke 확인 완료**
   - AAB의 `base/assets/public`를 직접 추출하여 로컬 서버로 실행.
   - Pixel 5 모바일 뷰포트에서 `게임 시작` 클릭 확인.
   - 클릭 전: `게임 시작` 버튼 표시.
   - 클릭 후: 로비 진입 확인.
   - 로비에서 `플레이어`, `시즌`, `무기`, `랭킹`, `상점` 텍스트 확인.
   - 치명적인 JS page error 없음.

## 최종 결론

v32 AAB는 v31에서 확인된 **게임 시작 버튼이 로비로 넘어가지 않는 문제**를 수정하기 위해 다시 빌드했다.  
수정 후 AAB 내부 번들 기준 모바일 smoke에서 **타이틀 → 게임 시작 → 로비 진입**이 확인되었으므로, v32는 Play Console 업로드 후보로 사용할 수 있다.
