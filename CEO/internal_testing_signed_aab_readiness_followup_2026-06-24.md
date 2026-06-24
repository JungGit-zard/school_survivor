# Internal testing signed AAB readiness follow-up — 2026-06-24

프로젝트: Escape! zombie school
역할: Launch_Mini / 런치미니
Kanban task: t_3f6d4caf
범위: Google Play internal testing 전용 Android build 환경, signed AAB, versionCode, admin/cheat 노출 상태 확인
금지 범위: production/global 배포, Play Console 제출, commit/push

## 1. 결론

판정: Internal testing도 아직 No-Go / 조건부 대기.

이유:

1. 현재 쉘에서 `java`가 없고 `JAVA_HOME`이 설정되지 않아 Gradle/Android release bundle을 새로 생성하거나 검증할 수 없다.
2. 기존 `app-release.aab` 파일은 존재하지만 2026-06-21 산출물이며, 오늘 실행한 최신 `npm run build`의 웹 번들 파일명과 AAB 내부 웹 번들 파일명이 달라 최신 산출물로 보기 어렵다.
3. JS/Vite 웹 빌드는 통과했지만, 전체 Vitest는 1개 테스트 실패로 clean exit가 아니다.
4. `/admin` 라우트와 타이틀 치트 메뉴/`unlockall` 키 입력 경로가 release build에서 코드상 차단되어 있지 않다.
5. 실제 Android/WebView 설치 smoke, Play internal-test install, privacy/Data safety/account deletion gate는 아직 닫히지 않았다.

추천: Terry가 명시적으로 Play Console 제출을 지시하기 전까지 production/global은 절대 금지. 다음 단계는 JDK 환경 복구 후 internal-testing 후보 AAB를 새로 빌드하고, 내부 테스트 트랙에서만 설치 검증하는 것이다.

## 2. 읽은 필수 문서

작업 전 확인한 문서:

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `CEO/current_product_priorities.md`
- `SESSION_MEMORY.md` 최근 tail 구간
- `CEO/auto_deploy_google_play_readiness_gate_2026-06-24.md`
- `Quaility_Assurance/auto_deploy_integration_gate_2026-06-24.md`

중요 정책 요약:

- CEO/제품/출시 판단은 `CEO/`에 기록한다.
- production/global rollout은 고위험이며 Terry의 명시 승인 없이 진행하지 않는다.
- Stage 1 기준 시간은 240초이며 Android/WebView 1판 루프 미검증은 release blocker다.
- signed AAB/internal test install은 production 이전의 안전한 확인 단계로만 취급한다.

## 3. 현재 식별 정보와 versionCode

근거 파일:

- `Developer/r3f_prototype/capacitor.config.json`
- `Developer/r3f_prototype/android/app/build.gradle`
- `Developer/r3f_prototype/android/variables.gradle`

확인값:

| 항목 | 값 | 판정 |
|---|---:|---|
| Capacitor appId | `com.jungyoon.zombieschool` | Play package와 일치 |
| Android namespace | `com.jungyoon.zombieschool` | 적합 |
| Android applicationId | `com.jungyoon.zombieschool` | 적합 |
| appName | `Escape Zombie School` | 공개 표시명 최종 확인 필요 |
| versionCode | `2` | Play Console에 이미 올라간 artifact보다 커야 함. 현재 콘솔 비교는 미검증 |
| versionName | `1.0.1` | 내부 테스트 후보명으로는 가능 |
| minSdk | `24` | 확인됨 |
| compileSdk | `36` | 확인됨 |
| targetSdk | `36` | 확인됨 |
| explicit permission | 이전 gate 기준 `INTERNET`만 확인 | 최종 manifest 재검증 필요 |

versionCode gate:

- 코드상 현재 `versionCode 2`.
- Play Console에 `versionCode 2` 이상이 이미 업로드되어 있으면 다음 internal test AAB는 `versionCode 3` 이상으로 올려야 한다.
- Play Console 업로드 전 반드시 Console의 최신 artifact versionCode와 비교해야 한다.

## 4. 실행한 명령과 실제 결과

### 4-1. Git/worktree 상태

명령:

```bash
git status --short --branch
```

결과 요약:

- 브랜치: `feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 6]`
- 다수의 tracked modified 파일과 untracked 산출물이 있다.
- 이 작업에서는 commit/push를 하지 않았다.
- release 후보를 만들기 전 변경 소유권/리뷰/QA 증거를 분리해야 한다.

### 4-2. Node/npm/JDK 확인

명령:

```bash
node --version
npm --version
java -version
```

실제 결과:

```text
node: v24.15.0
npm: 11.12.1
java: command not found
```

주의:

- `npm --version` 실행 중 Git Bash fork retry 메시지가 한 번 나타났지만 최종적으로 `11.12.1`을 출력했다.
- Android Gradle build에는 JDK가 필요하므로 현재 환경은 Android build 불가다.

### 4-3. 웹 빌드

명령:

```bash
cd Developer/r3f_prototype
npm run build
```

실제 결과:

```text
> escape-zombie-school-r3f@0.1.0 build
> vite build

vite v8.0.10 building client environment for production...
✓ 710 modules transformed.
✓ built in 778ms
```

판정:

- 웹/Vite build는 exit code 0.
- 단, Vite large chunk warning이 존재한다.
- 빌드 출력의 주요 JS asset은 실행 로그상 `dist/assets/index-oQGBBoHK.js`, 이후 파일 확인 시 현재 dist에는 `index-CNFocfz3.js`가 있었다. 기존 AAB 내부 asset과 일치하지 않으므로 AAB는 최신 dist 반영본으로 보지 않는다.

### 4-4. JS test clean exit

명령:

```bash
cd Developer/r3f_prototype
npx vitest run --maxWorkers=1 --no-file-parallelism
```

실제 결과:

```text
Test Files  1 failed | 57 passed (58)
Tests       1 failed | 307 passed (308)
exit code   1
```

실패 테스트:

```text
src/components/EnemyVisual.test.js > Enemy charge warning cue > keeps E05 and B01 charge warning readable with a non-HTML 3D toon cue
AssertionError: expected 1.75 to be greater than 2
```

판정:

- clean JS test exit는 실패.
- Android internal testing 후보로 올리기 전 최소 이 테스트 실패를 해결하거나, 테스트 기대값/구현값 중 어느 쪽이 정본인지 담당 구현/QA 리뷰가 필요하다.

### 4-5. Gradle/JDK build attempt

명령:

```bash
cd Developer/r3f_prototype/android
java -version
./gradlew --version
./gradlew :app:bundleRelease
```

실제 결과:

```text
java: command not found

ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
Please set the JAVA_HOME variable in your environment to match the
location of your Java installation.
```

판정:

- Android Gradle wrapper와 `bundleRelease` 모두 JDK/JAVA_HOME 부재로 실패.
- 오늘 기준 signed release AAB를 새로 생성하지 못했다.

### 4-6. AAB 존재 여부와 stale 여부

명령:

```bash
python - <<'PY'
from pathlib import Path
for p in Path('Developer/r3f_prototype').glob('**/*.aab'):
    print(p, p.stat().st_size)
PY
sha256sum Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab
unzip -l Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab | head -40
```

실제 확인:

```text
Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab
size: 7562549
mtime: 2026-06-21T23:34:19.602132
sha256: 7a77c3f203d91798c1e5acae639760a8f1cda055cc1e684d10b851169480998f

Developer/r3f_prototype/android/app/build/intermediates/intermediary_bundle/release/packageReleaseBundle/intermediary-bundle.aab
size: 15108241
mtime: 2026-06-21T23:34:19.007544
```

AAB 내부 asset evidence:

```text
base/assets/public/assets/index-jvzk6-5N.js
```

현재 dist evidence:

```text
Developer/r3f_prototype/dist/assets/index-CNFocfz3.js
```

판정:

- `app-release.aab` 파일은 존재한다.
- `android/keystore.properties`도 존재하므로 build.gradle상 release signing config를 적용할 수 있는 구조다.
- 그러나 현재 JDK가 없어 오늘 재생성/서명 검증을 못 했고, AAB 내부 asset이 현재 dist와 달라 stale artifact로 분류한다.
- 이 파일을 Play internal testing에 올리면 안 된다. JDK 복구 후 최신 소스/빌드로 새 AAB를 생성해야 한다.

## 5. Admin / cheat UI release-build 상태

검사 근거:

- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/lib/adminConfig.js`
- `Developer/r3f_prototype/src/components/AdminPage.jsx`

코드상 확인:

```text
App.jsx:
- pathname이 `/admin`으로 시작하면 `<AdminPage />` 렌더링
- pathname이 `/graphics-studio`로 시작하면 `<GraphicsStudio />` 렌더링

adminConfig.js:
- DEFAULT_ADMIN_CONFIG.operations.cheatMenuButtonVisible = true

TitleScreen.jsx:
- UNLOCK_ALL_WEAPONS_CHEAT_CODE = 'unlockall'
- cheatMenuButtonVisible이 true면 타이틀 상단 치트 메뉴 버튼 노출
- `unlockall` 키 입력으로 non-starter weapon unlock 가능
- 치트 모달에서 Stage selection 및 unlock all weapons 동작 존재
```

판정:

- release/prod 빌드에서 `/admin`과 `/graphics-studio` 라우트를 차단하는 evidence가 없다.
- 기본 admin config가 `cheatMenuButtonVisible: true`라 공개-facing 빌드에서 치트 메뉴 노출 위험이 있다.
- hidden key sequence `unlockall`도 공개-facing 빌드에서 차단되어 있지 않다.
- 따라서 admin/cheat 노출은 internal testing 전에도 리스크이며, closed/open/production 전에는 반드시 blocker다.

Internal testing에서만 허용 가능한 임시 조건:

- 테스터에게 “admin/cheat 노출 확인용 내부 빌드”라고 명시한다.
- Play Console store listing/copy에는 일반 유저용 기능처럼 표현하지 않는다.
- production/closed/open으로 승격하기 전 `cheatMenuButtonVisible` 기본값 false, release build route guard, hidden key sequence guard 중 최소 하나 이상의 확실한 차단이 필요하다.

## 6. Internal-test-only 실행 순서 제안

아래는 production/global이 아니라 internal testing 후보 생성까지만의 안전한 순서다.

### 6-1. JDK 복구

Windows Git Bash 기준 예시:

```bash
# 실제 설치 경로는 PC에 설치된 JDK 경로로 바꿀 것
export JAVA_HOME='/c/Program Files/Android/Android Studio/jbr'
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

또는 Temurin/Adoptium JDK 17 이상 설치 후:

```bash
export JAVA_HOME='/c/Program Files/Eclipse Adoptium/jdk-17.x.x.x-hotspot'
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

Android Gradle Plugin과 Play target 정책에 맞춰 최종적으로는 프로젝트가 요구하는 JDK 버전을 `./gradlew --version`으로 확인한다.

### 6-2. clean JS test + web build

```bash
cd Developer/r3f_prototype
npx vitest run --maxWorkers=1 --no-file-parallelism
npm run build
```

현재 상태에서는 Vitest 1개 실패가 있으므로 먼저 green으로 만들어야 한다.

### 6-3. Capacitor Android sync

```bash
cd Developer/r3f_prototype
npx cap sync android
```

목적:

- 최신 `dist/`를 Android assets에 반영한다.
- 현재 기존 AAB가 stale로 보이므로 sync/build 순서 재실행이 필요하다.

### 6-4. signed release AAB 생성

```bash
cd Developer/r3f_prototype/android
./gradlew clean
./gradlew :app:bundleRelease
```

예상 산출물:

```text
Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab
```

검증 명령:

```bash
sha256sum app/build/outputs/bundle/release/app-release.aab
unzip -l app/build/outputs/bundle/release/app-release.aab | head -60
```

JDK 사용 가능 시 추가 권장:

```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

주의:

- `android/keystore.properties` 내용은 민감정보이므로 채팅/문서에 비밀번호를 기록하지 않는다.
- Play App Signing 사용 여부와 upload key 정책은 Play Console에서 최종 확인한다.

### 6-5. internal testing upload 전 checklist

1. `versionCode`가 Play Console 최신 업로드 artifact보다 큰지 확인.
2. `npx vitest run --maxWorkers=1 --no-file-parallelism` exit code 0.
3. `npm run build` exit code 0.
4. `npx cap sync android` 성공.
5. `./gradlew :app:bundleRelease` 성공.
6. 새 `app-release.aab` mtime이 오늘 빌드 시간과 일치.
7. AAB 내부 `base/assets/public/assets/index-*.js`가 최신 `dist/assets/index-*.js`와 일치.
8. `/admin`, `/graphics-studio`, `cheatMenuButtonVisible`, `unlockall` 노출 의도 명확화.
9. 실제 Android 기기/에뮬레이터 설치 후 smoke:
   - 앱 실행
   - 타이틀 표시
   - 닉네임 설정
   - Stage 1 시작
   - 모바일 조이스틱 이동
   - level-up 카드 터치
   - pause/resume
   - restart/result 확인
10. Google login/cloud save를 켜는 경우 privacy/Data safety/account deletion/Firebase rules gate 선행.

## 7. Play Console recommendation

현재 추천:

- Production: No-Go.
- Global rollout: No-Go.
- Open/closed testing: No-Go.
- Internal testing: 아직 No-Go, JDK/test/AAB/admin gate 해결 후 제한적으로 가능.

Terry가 명시적으로 internal testing 업로드를 승인한 뒤의 Play Console 경로:

```text
Play Console > Test and release > Testing > Internal testing > Create new release
```

안전 가드:

- internal testing은 country targeting 대상이 아니며 tester access로 제한된다.
- production track으로 release를 만들지 않는다.
- `Send for review`, `Publish changes`, `Roll out to production` 류 버튼은 Terry의 명시 승인 없이는 누르지 않는다.
- managed publishing이 켜져 있어도 production/global 변경과 섞지 않는다.

## 8. Blockers to close before internal test upload

P0:

1. JDK/JAVA_HOME 복구.
2. `npx vitest run --maxWorkers=1 --no-file-parallelism` green.
3. 최신 dist 반영 후 새 signed `app-release.aab` 생성.
4. 기존 stale AAB 사용 금지.
5. `versionCode` Play Console 최신 artifact 대비 증가 확인.
6. admin/cheat 노출 의도와 차단 정책 결정.

P1 but required before public-facing track:

1. 실제 Android/WebView 240초 또는 자연 game over 1판 루프.
2. privacy policy URL.
3. Data safety source evidence.
4. account deletion route/request process.
5. Firebase rules/App Check 확인.
6. store listing claims 축소: cloud save/ranking/multiplayer/liveops 등 미검증 기능 claim 금지.

## 9. Final gate statement

오늘 확인된 상태만 기준으로는 `app-release.aab` 파일이 존재하더라도 internal test에 바로 업로드할 수 없다.

가장 안전한 다음 액션은 다음 4개를 순서대로 닫는 것이다:

1. JDK/JAVA_HOME 복구.
2. 실패 중인 `EnemyVisual.test.js` 정리 후 JS test green.
3. `npm run build` → `npx cap sync android` → `./gradlew :app:bundleRelease`로 새 signed AAB 생성.
4. 새 AAB를 internal testing 트랙에서만 설치 smoke하고, production/global은 계속 차단.
