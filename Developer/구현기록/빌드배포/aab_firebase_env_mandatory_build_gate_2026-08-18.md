# AAB 빌드 전 Firebase 환경변수 필수 게이트 — 반복 사고 방지 문서

- 작성일: 2026-08-18 KST
- 대상: Escape! zombie school / `Developer/r3f_prototype`
- 적용 범위: Google Play AAB/APK release 빌드, 내부 테스트 업로드 후보, 빌드/출시 담당 에이전트 전체
- 핵심 사고: 2주 전과 2026-08-18 v44가 같은 유형으로 실패했다. 원인은 **빌드 worktree에 `.env`가 없거나 Vite Firebase env가 빠져서 release 웹 번들에 Firebase 설정이 내장되지 않은 것**이다.

## 절대 규칙

AAB/APK release 빌드 담당 에이전트는 빌드 전에 이 문서를 반드시 읽고, 아래 자동 게이트를 통과해야 한다.

```sh
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
node scripts/assert-firebase-release-env.mjs
```

이 명령이 실패하면:

- `npm run build` 금지
- `npx cap sync android` 금지
- `./gradlew bundleRelease` 금지
- AAB/APK 산출물 업로드/전달 금지
- “빌드는 성공했다”라고 보고 금지

## 왜 이 문서가 필요한가

Vite/Capacitor 구조에서는 Android `google-services.json`만 정상이어도 충분하지 않다.

- `src/lib/firebaseAuth.js`는 웹 번들 안의 `import.meta.env.VITE_FIREBASE_*` 값을 읽는다.
- `.env`가 없는 별도 worktree에서 `npm run build`하면 release JS 안에 Firebase project/auth/database/app 값이 빠질 수 있다.
- 그러면 앱은 `isFirebaseAuthConfigured() === false`가 되어 Google/Firebase 로그인 경로가 `unconfigured` 또는 로그인 오류로 떨어진다.
- Android 서명 SHA와 `google-services.json`이 맞아도, 웹 env가 빠진 AAB는 로그인 불가 산출물이다.

## 필수 확인 항목

빌드 담당 에이전트는 아래를 실제 명령 출력으로 확인한다.

1. `.env` 존재
   - 위치: `Developer/r3f_prototype/.env`
   - 없는 경우 즉시 BLOCKER

2. 필수 Vite Firebase env 존재
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`

3. Firebase 프로젝트 일치
   - project id: `escape-zombie-school`
   - auth domain: `escape-zombie-school.firebaseapp.com`
   - database host: `escape-zombie-school-default-rtdb.asia-southeast1.firebasedatabase.app`

4. Android Firebase 설정 일치
   - `android/app/google-services.json` 존재
   - package: `com.jungyoon.zombieschool`
   - release SHA-1: `6f06ba579d08baa098af26a53c499b540a057651`

5. AAB/APK 내부 번들 확인
   - 빌드 후 AAB/APK zip 안의 `assets/public/assets/firebaseAuth-*.js` 또는 `base/assets/public/assets/firebaseAuth-*.js`에 Firebase project/auth/database 값이 들어 있어야 한다.
   - API key는 채팅/문서에 원문 출력하지 말고 `present` 또는 `[REDACTED]`로만 표시한다.

6. 실기기 확인
   - ADB 실기기 설치/실행/Google 계정 선택/Firebase Auth user 반영/로비 진입 전까지 PASS 금지.
   - 기기가 없으면 `UNKNOWN/NO-GO`, 절대 PASS 아님.

## 자동 게이트

이 저장소는 `package.json`의 `prebuild`에 다음 스크립트를 연결한다.

```json
"prebuild": "npm run branch:check && node scripts/assert-firebase-release-env.mjs && ..."
```

따라서 일반적인 release 경로인 `npm run build`는 `.env`/Firebase/Android SHA 확인이 실패하면 자동으로 멈춘다.

## 올바른 빌드 순서

```sh
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype

node scripts/assert-firebase-release-env.mjs
npm run build
npm.cmd exec -- cap sync android

export JAVA_HOME='/c/Program Files/Android/Android Studio/jbr'
export PATH="$JAVA_HOME/bin:$PATH"
cd android
./gradlew bundleRelease
```

빌드 후에는 반드시:

```sh
sha256sum android/app/build/outputs/bundle/release/app-release.aab
unzip -l android/app/build/outputs/bundle/release/app-release.aab | grep 'base/assets/public/assets/firebaseAuth'
unzip -p android/app/build/outputs/bundle/release/app-release.aab base/assets/public/assets/firebaseAuth-*.js \
  | grep -o 'escape-zombie-school-default-rtdb\.asia-southeast1\.firebasedatabase\.app\|escape-zombie-school\.firebaseapp\.com\|AIza[0-9A-Za-z_-]*' \
  | sort -u \
  | sed 's/AIza.*/AIza[REDACTED]/'
```

## 에이전트 보고 형식

빌드 담당 에이전트는 AAB/APK를 보고할 때 최소 아래를 포함한다.

```yaml
firebase_release_env_gate: PASS | FAIL
.env_present: true | false
required_vite_firebase_keys: PASS | FAIL
firebase_project: escape-zombie-school | <wrong>
google_services_package: com.jungyoon.zombieschool | <wrong>
release_sha1_registered: true | false
embedded_firebase_bundle_values: PASS | FAIL
real_device_google_login: PASS | FAIL | UNKNOWN | NOT_RUN
overall_release_status: PASS | FAIL | UNKNOWN
```

## 금지 문장

아래 표현은 증거 없이는 금지한다.

- “빌드 성공했으니 로그인도 될 거야”
- “google-services.json 있으니 Firebase OK”
- “SHA 맞으니 env도 문제 없겠지”
- “웹에서는 되니까 AAB도 됨”
- “기기 없지만 PASS”

## 반복 사고 결론

2주 전과 v44는 같은 종류의 실패다.  
**Firebase release env gate를 통과하지 않은 빌드는 산출물로 취급하지 않는다.**
