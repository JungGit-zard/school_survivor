# Launch_Mini Android AAB v23 build — 2026-07-31

Project: Escape! zombie school  
Role: `launchmini`  
Worktree: `D:/JungSil/2.Minigame_project/school_survivor-integration`  
Scope: local signed release AAB generation only. No Firebase data access/change, Play Console upload, commit, or push.

## Subagent mandatory routing

```text
Subagent mandatory routing
Board: escape-zombie-school
Trigger: Android release AAB generation and Google Play release-readiness gate.
Specialists involved: launchmini
Cards/artifacts/review trail: Developer/agent_room/launchmini_aab_v23_build_2026-07-31.md
Verification: git provenance, title canonical and Firebase Auth focused tests, production web build, Capacitor sync, Gradle release bundle, signature/asset/manifest/resource checks.
Remaining blockers: Android emulator/physical-device WebView and native Google-login smoke were not run; this record makes no visual-parity claim. No Play Console upload is authorized by this build record.
```

`hermes kanban --board escape-zombie-school assignees` and `stats` were run before build work. The launchmini profile is registered. The required profile gstack bin directory exists at `C:/Users/admin/.claude/skills/gstack/bin` and contains the installed gstack helper commands.

## Required gates read

- `AGENTS.md`
- `project_develop_policy.md`
- `SESSION_CONTINUITY.md` and the latest `SESSION_MEMORY.md` entry
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `docs/solutions/integration-issues/capacitor-android-firebase-google-login-aab.md`
- `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`
- `Developer/agent_room/launchmini_aab_v22_readiness_2026-07-27.md`

## Source provenance and intentional diff

Pre-build `git fetch origin` evidence:

```text
branch: zombie_only
HEAD:                 3cd9fb5947f7ba018fab8092d83be8bd4c9c578f
origin/zombie_only:   3cd9fb5947f7ba018fab8092d83be8bd4c9c578f
HEAD...origin count:  0 0
pre-existing untracked path: Developer/r3f_prototype/.firebase/ (not touched)
```

The only source change introduced for this build is the intentional minimal Android version increment in `Developer/r3f_prototype/android/app/build.gradle`:

```diff
- versionCode 22
- versionName "1.0.13"
+ versionCode 23
+ versionName "1.0.14"
```

The AAB does not embed the Git SHA; the source-to-AAB relationship is procedural provenance from this controlled sequence, not binary proof.

## Commands and results

| Command / check | Result |
| --- | --- |
| `npm.cmd run verify:title-canonical` | PASS — title surface and canonical title BGM source gates passed. |
| `npx.cmd vitest run src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js --pool=threads --maxWorkers=1 --no-fileParallelism` | PASS — 2 files, 13 tests. |
| `npm.cmd run build` | PASS — branch guard, title surface/BGM, legacy B02 source/artifact gates, and Vite production build passed. The existing vendor-three chunk-size warning remained non-fatal. |
| `npx.cmd cap sync android` | PASS — Capacitor copied the fresh build. `dist` and Android asset both use `index-DSXqduCa.js`. Capacitor found `@capacitor-firebase/authentication@8.3.0`. |
| `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr; gradlew.bat clean bundleRelease` | PASS — release AAB created. Gradle ran `:app:processReleaseGoogleServices`. |
| AAB ZIP read of all entries | PASS — 758 entries read. |
| `jarsigner -verify -verbose -certs` | PASS — exit `0`; standard upload-key self-signed/chain/timestamp warnings were emitted. |

No Firebase database, Firebase Authentication state, Graphics Studio value, title source/configuration, audio source, or localStorage code was changed by this work.

## Release artifact

```text
Path: Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab
LastWriteTime (UTC): 2026-07-30T22:19:53.286Z
Size: 15,657,621 bytes
SHA-256: 6b04e84c1a04472bc1cb055a1458bd0cf60889b91b08366c048cad292f46cf00
```

## Version and manifest verification

`bundletool` and `apkanalyzer` were not installed on PATH. The Gradle-produced bundle manifest was therefore used as the permitted fallback:

```text
app/build/intermediates/bundle_manifest/release/processApplicationManifestReleaseForBundle/AndroidManifest.xml
package: com.jungyoon.zombieschool
android:versionCode: 23
android:versionName: 1.0.14
```

The same three values were also present in the release merged manifests. `build.gradle` contains the matching version values.

## Canonical title BGM exact-match verification

```text
Source: src/assets/audio/title_bgm.m4a
Source size: 998122 bytes
Source SHA-256: 991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe

AAB entry: base/assets/public/assets/title_bgm-BMjuXxkY.m4a
AAB entry extracted size: 998122 bytes
AAB entry extracted SHA-256: 991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe
```

Result: **exact byte-size and SHA-256 match**. The canonical BGM was not replaced, transformed, or moved.

## Google services release resource presence

`processReleaseGoogleServices` completed successfully. Its generated resource file exists at:

```text
android/app/build/generated/res/processReleaseGoogleServices/values/values.xml
```

Presence-only verification passed for `default_web_client_id`, `google_app_id`, and `project_id`. No `google-services.json` contents, OAuth values, or signing secrets were printed or recorded.

## Release limitations / remaining blockers

- This is a locally generated, signed candidate only; no Play Console upload, internal-test rollout, production rollout, commit, or push was performed.
- The full Vitest suite was not rerun: the release instruction explicitly limits this attempt to the Firebase Auth-focused serial command because the immediately preceding global run had a Firebase test-isolation failure and is not a clean global gate. This candidate must not be treated as satisfying the project policy's full-test requirement for a Play release.
- Android emulator/physical-device WebView verification, first launch, native Google-login round trip, gameplay smoke, and pause/resume/mobile-control checks were not run. Consequently, this record does **not** claim Android visual parity.
- Before any Play upload, perform those device checks and verify the current Play Console versionCode under an explicitly authorized release task.
