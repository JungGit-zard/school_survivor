# Launch_Mini AAB v22 readiness review — 2026-07-27

Project: Escape! zombie school  
Role: launchmini  
Kanban task: `t_9d793986`  
Workdir: `D:/JungSil/2.Minigame_project/school_survivor-integration`  
Scope: prerequisites and safe sequence for a new signed Android AAB after the existing 2026-07-23 `versionCode 21` artifact.  
Explicit limits: no Play Console upload, no production/global rollout, no secrets exposed, no commit/push.

## Executive decision

판정: **Conditional Go for local AAB generation only after the version bump/worktree state is intentionally accepted and the safe build sequence is run from a clean or deliberately documented tree.**

- **Recommended next versionCode:** `22`.
- **Recommended versionName:** `1.0.13`, if keeping the existing sequential naming after HEAD `1.0.12`.
- **Do not upload to Play Console from this review alone.** Internal testing upload is still a separate release decision and must wait for AAB freshness/provenance checks, Android device/AVD smoke, Google login smoke, QA sign-off, and Terry's explicit instruction.
- **Production/global release: No-Go.** This task did not inspect Play Console country targeting, managed publishing, Data safety final state, pre-launch report, or production rollout controls.

Important current-state caveat:

- The task body describes current clean `zombie_only` HEAD `dbf8b1a`, and `git fetch origin` confirmed local HEAD equals upstream `origin/zombie_only` at `dbf8b1af764710da9c3cad2361161a0b0e01811d`.
- However, during this review the working tree was observed as not clean: `Developer/r3f_prototype/android/app/build.gradle` is modified from HEAD `versionCode 21` / `versionName "1.0.12"` to working-tree `versionCode 22` / `versionName "1.0.13"`.
- I did not reset, commit, push, upload, or expose signing secrets. Treat the `build.gradle` bump as an observed local change that must be intentionally accepted or reverted by the owner before declaring a clean-source release build.

## Required documents read

- `project_develop_policy.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `CEO/current_product_priorities.md`
- `Developer/agent_room/game_development_kanban_process.md`
- `Developer/agent_room/launchmini_enhancement_result_2026-07-04.md`
- `Developer/구현기록/빌드배포/aab_build_v20_2026-07-17.md`
- `Quaility_Assurance/full_game_content_audit_2026-07-25.md` latest AAB-related section
- `Quaility_Assurance/google_play_version_ledger.md`
- `Quaility_Assurance/aab_v19_release_validation_2026-07-16.md`
- `SESSION_MEMORY.md` latest entry only, per session continuity rule

## Policy gates extracted from project docs

- Every new AAB must increase Android `versionCode` over the previous artifact.
- AAB release before production requires full tests, production build, desktop/mobile actual screen validation, clean Capacitor sync, `versionCode` increase, local/remote Git SHA match, AAB hash/size/signature validation, and recorded provenance.
- If Git SHA is not embedded in the AAB, source SHA to AAB linkage is procedural provenance, not binary proof.
- Never claim AAB visual parity from dev-server or bundle contents alone; Android emulator or real-device WebView evidence is required.
- Never produce a production AAB from unpushed source or source whose SHA differs from remote.
- Do not commit/push or submit to Google Play without Terry's explicit instruction.

## Evidence observed in this review

### Git and branch provenance

Command evidence:

```text
pwd
/d/JungSil/2.Minigame_project/school_survivor-integration

git status --short --branch
## zombie_only...origin/zombie_only

git rev-parse HEAD
dbf8b1af764710da9c3cad2361161a0b0e01811d

git log -1 --oneline
dbf8b1a Update investigation rewards and stage 4 tile

git fetch origin
HEAD:    dbf8b1af764710da9c3cad2361161a0b0e01811d
@{u}:    dbf8b1af764710da9c3cad2361161a0b0e01811d
rev-list HEAD...@{u}: 0 0
```

After fetch, the observed working tree had one modified file:

```text
## zombie_only...origin/zombie_only
 M Developer/r3f_prototype/android/app/build.gradle
```

Diff evidence:

```diff
-        versionCode 21
-        versionName "1.0.12"
+        versionCode 22
+        versionName "1.0.13"
```

Interpretation:

- Source HEAD/upstream provenance is good for `dbf8b1a`.
- The working tree is not currently clean because the Android version bump is present locally.
- For a release-quality v22 build, either:
  1. explicitly accept this local version bump and record it as part of the release build provenance, or
  2. return to clean HEAD and re-apply the bump in the controlled build sequence.

### Existing latest AAB artifact

Current files under `Developer/r3f_prototype`:

```text
Developer/r3f_prototype/android/app/build/intermediates/intermediary_bundle/release/packageReleaseBundle/intermediary-bundle.aab|25519833|2026-07-23 02:20:35
Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab|15287436|2026-07-23 02:20:36
```

Current output AAB hash:

```text
537efeb0f86d104752378e287f9778b04f4b26c5ba0503e610dc996cebd59640 *app/build/outputs/bundle/release/app-release.aab
```

This matches the QA audit record for the 2026-07-23 artifact:

- size: `15,287,436 bytes`
- SHA-256: `537efeb0f86d104752378e287f9778b04f4b26c5ba0503e610dc996cebd59640`
- Android-copied web entry: `index-DKxigqU8.js`

Freshness evidence observed now:

```text
Android package asset:
index-DKxigqU8.js|12068|2026-07-23 02:18:12

Current dist asset:
index-CYTGtwQt.js|12085|2026-07-27 01:53:13

AAB internal entry:
base/assets/public/assets/index-DKxigqU8.js
```

Interpretation:

- The existing 2026-07-23 AAB is not fresh for current `dist` and must not be reused as a current-source artifact.
- A v22 AAB must run `npm run build` and `npx cap sync android` before `bundleRelease`, then verify the AAB internal `base/assets/public/assets/index-*.js` matches the Android-copied web assets from the same build.

### Toolchain and signing prerequisites

Global `java` on PATH:

```text
java -version
/usr/bin/bash: line 3: java: command not found
```

Android Studio bundled JBR works when explicitly selected:

```text
/c/Program Files/Android/Android Studio/jbr/bin/java -version
openjdk version "21.0.10" 2026-01-20
```

Gradle works with explicit `JAVA_HOME`:

```text
cd Developer/r3f_prototype/android
JAVA_HOME='/c/Program Files/Android/Android Studio/jbr' ./gradlew --version
Gradle 8.14.3
Launcher JVM: 21.0.10
OS: Windows 11 10.0 amd64
```

Prerequisite file presence was checked without printing secrets:

```text
FOUND Developer/r3f_prototype/android/keystore.properties size=178
FOUND Developer/r3f_prototype/android/app/upload-keystore.jks size=2270
FOUND Developer/r3f_prototype/android/local.properties size=56
FOUND Developer/r3f_prototype/android/app/google-services.json size=1448
```

Existing AAB integrity/signing checks:

```text
unzip -t app/build/outputs/bundle/release/app-release.aab
No errors detected in compressed data of app/build/outputs/bundle/release/app-release.aab.

jarsigner -verify app/build/outputs/bundle/release/app-release.aab
jar verified.
JARSIGNER_EXIT=0
```

Caveat:

- `jarsigner` reports the expected self-signed/certificate-chain and no-timestamp warnings for the upload key; it still exits `0` and prints `jar verified`.
- The review did not print keystore passwords, key aliases, or private signing material.

## Version recommendation

### Why `versionCode 22`

- Project policy requires every new AAB to use a higher `versionCode` than the previous artifact.
- Current HEAD has `versionCode 21`, `versionName "1.0.12"`.
- Latest existing artifact recorded from 2026-07-23 is the `versionCode 21` generation.
- Therefore the next AAB candidate must be **at least `versionCode 22`**.

Recommended values:

```gradle
versionCode 22
versionName "1.0.13"
```

Do not reuse `21` even if the local artifact is deleted; Play Console versionCode reuse is not allowed once uploaded, and project policy requires monotonic increase over previous AAB artifacts.

## Exact safe local build sequence for v22

Run from `D:/JungSil/2.Minigame_project/school_survivor-integration` in the POSIX/bash shell used by this environment.

### 0. Preflight: confirm branch/source and avoid dirty accidental release

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration

git fetch origin
git status --short --branch
git rev-parse HEAD
git rev-parse @{u}
git rev-list --left-right --count HEAD...@{u}
git diff -- Developer/r3f_prototype/android/app/build.gradle
```

Gate:

- Require branch `zombie_only`.
- Require HEAD and upstream to match for any release-intended build.
- If the only diff is the intentional `versionCode 22` / `versionName "1.0.13"` bump, record that fact before building.
- If any unrelated source diff exists, stop or document it as an intentional included change before building.

### 1. Confirm Android version bump

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration
python - <<'PY'
from pathlib import Path
p = Path('Developer/r3f_prototype/android/app/build.gradle')
text = p.read_text(encoding='utf-8')
assert 'versionCode 22' in text, 'versionCode 22 missing'
assert 'versionName "1.0.13"' in text, 'versionName 1.0.13 missing'
print('ANDROID_VERSION_OK versionCode=22 versionName=1.0.13')
PY
```

### 2. Confirm JDK/Gradle/signing files without exposing secrets

```bash
'/c/Program Files/Android/Android Studio/jbr/bin/java' -version
cd /d/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/android
JAVA_HOME='/c/Program Files/Android/Android Studio/jbr' ./gradlew --version
for f in keystore.properties app/upload-keystore.jks local.properties app/google-services.json; do
  test -f "$f" && printf 'FOUND %s size=%s\n' "$f" "$(wc -c < "$f")" || { echo "MISSING $f"; exit 1; }
done
```

### 3. Web test/build gate

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm run branch:check
npm run test -- --maxWorkers=1 --no-file-parallelism
npm run build
```

Gate:

- All commands must exit `0`.
- Existing `vendor-three` chunk-size warning alone is not a blocker if unchanged and already documented.
- Do not use prohibited project URLs `127.0.0.1:5173` or `172.22.41.219:5173` in any manual test note.

### 4. Capacitor sync freshness gate

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npx cap sync android

printf 'dist index: '
find dist/assets -maxdepth 1 -type f -name 'index-*.js' -printf '%f %s\n'
printf 'android copied index: '
find android/app/src/main/assets/public/assets -maxdepth 1 -type f -name 'index-*.js' -printf '%f %s\n'
sha256sum dist/index.html android/app/src/main/assets/public/index.html
```

Gate:

- Android-copied `index-*.js` should correspond to the fresh `dist` build, not the old `index-DKxigqU8.js` from 2026-07-23.
- `dist/index.html` and `android/app/src/main/assets/public/index.html` should match after sync.

### 5. Signed AAB build

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/android
JAVA_HOME='/c/Program Files/Android/Android Studio/jbr' ./gradlew clean :app:bundleRelease
```

Expected output requirement:

- `BUILD SUCCESSFUL`.
- New file at `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`.

### 6. AAB integrity, signature, hash, and freshness validation

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/android
AAB=app/build/outputs/bundle/release/app-release.aab

stat -c '%n|%s|%y' "$AAB"
sha256sum "$AAB"
unzip -t "$AAB"
JAVA_HOME='/c/Program Files/Android/Android Studio/jbr' '/c/Program Files/Android/Android Studio/jbr/bin/jarsigner' -verify "$AAB"
unzip -l "$AAB" | grep 'base/assets/public/assets/index-'
```

Gate:

- Record exact size and SHA-256.
- `unzip -t` must report no compressed data errors.
- `jarsigner` must print `jar verified` and exit `0`.
- AAB internal `base/assets/public/assets/index-*.js` must match the fresh Android-copied asset from step 4.

### 7. Provenance record

Create/update a build record under `Developer/구현기록/빌드배포/`, including:

- branch and HEAD SHA
- upstream SHA match evidence
- whether `build.gradle` version bump was local or committed
- command log and exit status
- test count/result
- `npm run build` result
- `npx cap sync android` result
- AAB path, size, SHA-256
- `unzip -t` result
- `jarsigner -verify` result
- AAB internal web asset name and matching Android-copied/dist asset names
- release limitations and not-uploaded status

Because this project does not currently prove Git SHA embedded inside the AAB, describe source-to-AAB linkage as **procedural provenance**, not binary proof.

## Validation checklist for the v22 AAB before any Play Console consideration

Minimum local checks:

- [ ] `git fetch origin` completed.
- [ ] Local HEAD equals `origin/zombie_only` or any included local diff is explicitly documented.
- [ ] `versionCode 22` and `versionName "1.0.13"` confirmed.
- [ ] `npm run test -- --maxWorkers=1 --no-file-parallelism` exits `0`.
- [ ] `npm run build` exits `0`.
- [ ] `npx cap sync android` exits `0`.
- [ ] Android-copied web assets are fresh and no longer point to the 2026-07-23 `index-DKxigqU8.js` unless that is unexpectedly regenerated by the current build.
- [ ] `JAVA_HOME='/c/Program Files/Android/Android Studio/jbr' ./gradlew clean :app:bundleRelease` exits `0`.
- [ ] New AAB size and SHA-256 recorded.
- [ ] `unzip -t` passes.
- [ ] `jarsigner -verify` passes with `jar verified` / exit `0`.
- [ ] AAB internal `base/assets/public/assets/index-*.js` matches the freshly synced Android assets.
- [ ] Build record is written under `Developer/구현기록/빌드배포/`.

Before Play internal testing upload:

- [ ] Terry explicitly asks to upload or continue to Play Console.
- [ ] Play Console latest artifact/versionCode is checked directly; if Play has already seen `22`, rebuild with `23` or higher.
- [ ] Android real device or AVD install/smoke is performed.
- [ ] First launch works.
- [ ] Google login round trip works in Android WebView/internal app context.
- [ ] One gameplay loop or targeted release smoke passes.
- [ ] Pause/resume and mobile controls pass.
- [ ] Data safety/privacy/account-deletion declarations remain consistent with implemented login/data behavior.
- [ ] Pre-launch report is reviewed after upload if an internal-test upload is performed.

## Release limitations

- This review did not build a new v22 AAB.
- This review did not upload anything to Play Console.
- This review did not inspect live Play Console state, managed publishing, track countries, tester lists, Data safety form, or latest uploaded versionCode directly.
- Existing AAB from 2026-07-23 is stale versus current `dist` and should not be treated as current-source output.
- Current working tree is not clean because of the observed `build.gradle` version bump to 22/1.0.13.
- No Android device/AVD smoke was run in this review.

## Final recommendation

- **Local v22 AAB generation:** Go only after Terry/owner accepts the current `build.gradle` bump or the build operator reapplies it intentionally in a clean controlled sequence.
- **Version:** use `versionCode 22`, `versionName "1.0.13"`.
- **Existing v21 artifact:** do not reuse; stale versus current `dist`.
- **Play Console upload:** No-Go until a newly generated v22 AAB passes all validation gates and Terry explicitly requests upload.
- **Production/global:** No-Go.
