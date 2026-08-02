# launchmini note — Google Play deobfuscation file warning resolved

Context: Google Play Console showed a warning for versionCode 24 that no deobfuscation/readability file was associated with the App Bundle.

Resolution applied:
- Project: `Developer/r3f_prototype`
- Enabled R8 for release builds in `android/app/build.gradle`:
  - `minifyEnabled true`
  - default ProGuard file changed to `proguard-android-optimize.txt`
- Added R8 `-dontwarn` rules in `android/app/proguard-rules.pro` for optional Facebook SDK classes referenced by `@capacitor-firebase/authentication` but not bundled by this app.

Verification:
- `npm run build` succeeded.
- `npx cap sync android` succeeded.
- `cd android && ./gradlew bundleRelease --no-daemon` succeeded after adding the optional Facebook SDK `-dontwarn` rules.
- AAB generated: `android/app/build/outputs/bundle/release/app-release.aab`
- Mapping file generated: `android/app/build/outputs/mapping/release/mapping.txt`
- Generated manifest confirmed:
  - `android:versionCode="24"`
  - `android:versionName="1.0.15"`
- `jarsigner -verify -verbose -certs` contains `jar verified.` and signer certificate expiry `2053-11-06`.

Downloads copies for Play Console upload:
- AAB: `C:\Users\admin\Downloads\escape-zombie-school-v1.0.15-code24-r8-release.aab`
- Mapping: `C:\Users\admin\Downloads\escape-zombie-school-v1.0.15-code24-mapping.txt`

Hashes:
- AAB SHA-256: `071dbddf57099ea5282ae4c875d019e1c4a2c17c51df31da91027716acc604b1`
- mapping.txt SHA-256: `d0c3181a3693c3384ae713e896146ac5d097372e159635fbe2f6410a88a7bb6c`

Play Console instruction:
- Upload the new `*-r8-release.aab` as the app bundle.
- Upload `*-mapping.txt` as the deobfuscation/ReTrace mapping file for the same versionCode 24 release.

Remaining caveat:
- Real-device installed-AAB runtime smoke was not performed because `adb` was not on PATH in the prior AAB build session.
