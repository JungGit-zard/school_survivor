# Escape! zombie school AAB Google login readiness check — 2026-07-04

## Scope

Checked the latest generated Android App Bundle and the Firebase/Google login wiring for Play/internal-test readiness.

AAB checked:

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- Size: 9,474,046 bytes
- Build timestamp seen in filesystem: 2026-07-04 15:43

## AAB/package facts

From Android build files and merged release manifest:

- Package/applicationId: `com.jungyoon.zombieschool`
- Version code: `5`
- Version name: `1.0.4`
- minSdk: `24`
- targetSdk: `36`
- INTERNET permission: present
- Capacitor config embedded in AAB:
  - appId: `com.jungyoon.zombieschool`
  - appName: `Escape Zombie School`
  - webDir: `dist`

## Signing facts

The release build uses:

- Keystore file: `android/app/upload-keystore.jks`
- Alias: `upload`
- Upload certificate SHA-1: `6F:06:BA:57:9D:08:BA:A0:98:AF:26:A5:3C:49:9B:54:0A:05:76:51`
- Upload certificate SHA-256: `FE:18:FA:0E:BD:5C:E7:0F:30:04:6F:25:D3:07:5A:65:8A:2C:33:EA:DD:6F:5E:30:0C:85:FB:6E:E5:54:0F:3B`

Note: no passwords or secret values were written into this report.

## Firebase/Auth wiring

Source code:

- `src/lib/firebaseAuth.js`
- `src/store/useAuthStore.js`
- `src/components/GoogleAccountPanel.jsx`

Current implementation:

- Firebase Web SDK is used.
- `GoogleAuthProvider` is used.
- Login call in source/built bundle is `signInWithPopup(auth, provider)`.
- `signInWithRedirect` is not present in the built AAB JavaScript bundle.
- `google-services.json` is not present in the Android app folder or AAB, which is expected for this current Web-SDK-based implementation but means this is not native Android Google Sign-In / Play Games Sign-In.

Firebase project authorized domains fetched via Identity Toolkit:

- `localhost`
- `escape-zombie-school.firebaseapp.com`
- `escape-zombie-school.web.app`

This is important because Capacitor Android normally serves the local web app from a localhost origin, so the required `localhost` authorization exists.

## Local browser verification

Ran production preview from `Developer/r3f_prototype` and tested the Google login button.

Results:

- `http://127.0.0.1:4173/` login click returned Firebase error `auth/unauthorized-domain`.
  - This is expected because `127.0.0.1` is not in Firebase authorized domains.
- `http://localhost:4173/` login click opened the Google account login page for `escape-zombie-school.firebaseapp.com`.
  - This confirms Firebase env values are compiled into the production build and the provider/domain path works for the localhost origin.

## Automated test result

Command:

```bash
npm test
```

Result:

- Test files: 77 passed / 77
- Tests: 450 passed / 450

Auth-focused subset:

```bash
npx vitest run src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js --reporter=dot
```

Result:

- Test files: 2 passed / 2
- Tests: 5 passed / 5

## Runtime limitation

No Android device/emulator was attached on this machine:

```text
adb devices
List of devices attached
```

Therefore I could not complete a real installed-AAB Google-account login all the way through on Android/Google Play from this machine.

## Risk assessment

### Looks OK

- AAB exists at the expected path.
- Package/version are coherent for Play upload.
- INTERNET permission is present.
- Firebase production env config is compiled into the built web assets.
- Firebase authorized domains include `localhost`.
- Localhost web login reaches the official Google login page.
- Unit tests pass.

### Needs real-device confirmation before saying “100% OK”

The app uses Firebase Web SDK `signInWithPopup` inside a Capacitor Android WebView. Local desktop Chrome can open the Google login page, but Android WebView / Play-installed behavior may differ. Possible Android-only risks:

1. Popup handling may be blocked or behave differently in Capacitor WebView.
2. Google OAuth may reject embedded user-agent flows on some Android WebView paths.
3. If Play App Signing changes the installed signing certificate, native Android SHA settings would matter only if switching to native Google Sign-In later. For the current Web SDK popup flow, the main relevant check is the authorized domain/origin.

## Recommendation

Before publishing beyond internal/closed testing:

1. Upload this AAB to internal testing.
2. Install from Play internal test link on a real Android device.
3. Tap `Google 로그인`.
4. Confirm one of these outcomes:
   - Success: account chooser/login completes and the app returns to signed-in state.
   - Failure: capture exact error text/screenshot/logcat.
5. If it fails with popup/disallowed-user-agent behavior, change the login implementation to a Capacitor-friendly flow:
   - either Firebase `signInWithRedirect` with Capacitor-compatible redirect handling, or
   - native Google Sign-In via a Capacitor plugin / credential bridge, then `signInWithCredential` in Firebase.

## Current conclusion

The AAB and Firebase configuration are structurally ready enough for Play internal testing, and the web OAuth path works from `localhost`. However, I cannot honestly mark the Android installed login as fully proven until a real device/internal-test install completes the Google login flow.
