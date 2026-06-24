# Google Play Readiness and Policy Gate — 2026-06-24

Project: Escape! zombie school
Role: Launch_Mini / 런치미니
Scope: private/internal testing readiness, Play Console policy/data safety/store listing risks, and safe launch checklist.
Submission status: No Play Console submission performed. No production/global rollout recommended.

## 0. Gate decision

Current gate: NOT READY for production. CONDITIONALLY READY only for a very small private/internal test after the blockers below are resolved or explicitly accepted as test-only limitations.

Recommended release path:

1. Internal testing only first.
2. Do not use production release yet.
3. Do not use open testing yet unless country/region targeting and Data safety/privacy policy are confirmed.
4. Keep managed publishing on in Play Console if available.
5. Before any public test or production release, run a fresh Android build on a machine with Java/JDK configured and upload only a signed Android App Bundle (.aab).

Risk level summary:

| Area | Status | Reason |
|---|---|---|
| Android package identity | PASS | `applicationId`/namespace/appId use `com.jungyoon.zombieschool`, matching known private Play link package. |
| Web build | PASS WITH WARNING | `npm run build` succeeds; main JS chunk is very large at about 3.33 MB uncompressed / 1.12 MB gzip. |
| JS tests | BLOCKED/WARN | 299 tests passed, but Vitest exits 1 due to worker VirtualAlloc failure/unhandled worker exit. Treat as environment/memory blocker until rerun cleanly. |
| Android build | BLOCKED | `./gradlew :app:assembleDebug` cannot run because `JAVA_HOME`/`java` is missing from PATH. |
| Signed AAB | BLOCKED | No `.aab` found in repo; release signing not verified. |
| Data safety | BLOCKED | Google login + Firebase progress storage can collect uid, displayName, email, photoURL, nickname, progress, records, unlocks, settings. Privacy policy and Data safety declarations not found. |
| Account deletion | BLOCKED | No privacy/account deletion document or in-app deletion path found. Required if account creation/login exists. |
| Store listing | WARN | English marketing copy exists, but screenshots, feature graphic, privacy URL, and actual Play listing alignment are not verified here. |
| Debug/admin/cheat exposure | BLOCKED/WARN | Admin route and cheat menu infrastructure exist; default admin config has `cheatMenuButtonVisible: true`. Must be disabled/hidden for public-facing builds unless intentionally test-only. |
| Ranking claims | WARN | Ranking appears local/client-derived; public competitive leaderboard claims should be avoided until server-side validation exists. |

## 1. Evidence read before action

Startup and policy docs read:

- `AGENTS.md`
- `project_develop_policy.md`
- `Bang_Rules.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `CEO/current_product_priorities.md`
- latest `SESSION_MEMORY.md` entry: `Session 5 · Entry 3 · 2026-06-21 1947 KST`

Release/policy relevant files inspected:

- `Developer/r3f_prototype/package.json`
- `Developer/r3f_prototype/capacitor.config.json`
- `Developer/r3f_prototype/android/app/src/main/AndroidManifest.xml`
- `Developer/r3f_prototype/android/app/build.gradle`
- `Developer/r3f_prototype/android/variables.gradle`
- `Developer/r3f_prototype/android/app/src/main/res/values/strings.xml`
- `Developer/r3f_prototype/src/lib/firebaseAuth.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/store/useAuthStore.js`
- `Developer/firebase_realtime_database_security_review_2026-06-21.md`
- `marketing/auto_deploy_english_copy_readiness_2026-06-24.md` was found through search and used as supporting context for listing/copy risks.

Searches performed:

- `.aab` files: none found.
- Android manifest: found at `Developer/r3f_prototype/android/app/src/main/AndroidManifest.xml`.
- Gradle files: found Android project Gradle files.
- Capacitor config: found app config and generated Android asset config.
- `google-services.json`, `keystore.properties`, `.jks`, `.keystore`: none found under `Developer/r3f_prototype`.
- privacy/data safety/account deletion docs: none found by filename search.
- Firebase/login/ranking/admin/cheat references: found Google login, Firebase progress save, ranking, `/admin` route, and cheat/admin config references.

## 2. Commands/tests run

All commands were run in `D:/JungSil/2.Minigame_project/school_survivor-integration` or its `Developer/r3f_prototype` Android/web subfolders.

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING && git status --short --branch
python - <<'PY'
from pathlib import Path
p=Path('SESSION_MEMORY.md')
lines=p.read_text(encoding='utf-8', errors='replace').splitlines()
print(len(lines))
for i,l in enumerate(lines,1):
    if l.startswith('## Session '): print(i,l)
PY
npm test
npm run build
./gradlew :app:assembleDebug
date '+%Y-%m-%d %H:%M %Z' && git status --short --branch
```

Observed results:

- gstack gate: `GSTACK_OK`.
- Git tree before this artifact already had many uncommitted user/agent changes; this task did not modify code.
- `npm run build`: success.
- `npm run build` warning: main chunk exceeds 500 kB. Largest output shown: `dist/assets/index-BD7GkOHM.js` at 3,333.11 kB, gzip 1,121.92 kB.
- `npm test`: 56 test files / 299 tests passed, but command exit code was 1 because Vitest caught an unhandled worker error after a `VirtualAlloc failed` message.
- Android Gradle build: failed immediately because `JAVA_HOME` is not set and no `java` command is found in PATH.

## 3. Android/package readiness

Evidence:

- `Developer/r3f_prototype/capacitor.config.json`
  - `appId`: `com.jungyoon.zombieschool`
  - `appName`: `Escape Zombie School`
  - `webDir`: `dist`
- `Developer/r3f_prototype/android/app/build.gradle`
  - `namespace`: `com.jungyoon.zombieschool`
  - `applicationId`: `com.jungyoon.zombieschool`
  - `versionCode`: `2`
  - `versionName`: `1.0.1`
  - release signing only applies if `keystore.properties` exists.
- `Developer/r3f_prototype/android/variables.gradle`
  - minSdk 24
  - compileSdk 36
  - targetSdk 36
- `AndroidManifest.xml`
  - only explicit permission found: `android.permission.INTERNET`
  - launcher `MainActivity` is exported, expected for launcher activity.

Assessment:

- Package identity is consistent and appropriate for the known Play package `com.jungyoon.zombieschool`.
- Target SDK 36 is forward-looking and should satisfy current target API expectations, but final Play Console validation must be checked at upload time.
- No signed release AAB is present or verified.
- JDK is missing in the current shell, so Android build and bundle generation cannot be verified here.

Required before Play upload:

1. Configure Java/JDK in the build environment.
2. Run Android build from `Developer/r3f_prototype/android`.
3. Generate a signed release `.aab`, not only a debug APK.
4. Confirm `versionCode` is higher than the currently uploaded Play artifact.
5. Confirm app label/display name is the intended public title.
6. Upload to internal testing first, never production first.

## 4. Play Console track recommendation

Recommended now: Internal testing only.

Why:

- Internal testing is the safest track for verifying installability, app startup, login, data save, and Android WebView behavior.
- Country targeting does not apply to internal testing; only tester access matters.
- This avoids accidental public or global release while the Data safety, privacy policy, account deletion, test flake/memory failure, JDK build, and debug/admin exposure items are unresolved.

Do not proceed to closed/open/production until:

- A signed AAB has uploaded and installed successfully through internal test.
- Privacy policy URL is live and matches actual collected data.
- Data safety form is filled from source evidence, not guesswork.
- Account deletion route/request process is documented.
- Admin/cheat UI is disabled or inaccessible in public-facing builds.
- Mobile play loop QA is green on physical Android devices.

If Terry explicitly wants Korea-only closed/open/production later:

- Closed/open testing path: `Test > Closed testing/Open testing > Manage track > Countries/regions`, unsync if needed, leave only South Korea / Korea, Republic of / 대한민국.
- Production path: `Release > Production > Countries/regions`, leave only South Korea / Korea, Republic of / 대한민국.
- With managed publishing, do not click `Publish changes` until the country/region change and release artifact are both ready to publish.

## 5. Data safety and privacy policy risk

Current code indicates the app may collect or process the following when Firebase login/progress is configured:

- Google/Firebase auth user id: `uid`
- Google display name
- Google email
- Google photo URL
- saved nickname
- local/progress data: gold total, records, weapon unlocks, passive upgrades, title settings
- possible ranking/local score data depending on ranking flow

Evidence:

- `firebaseAuth.js` maps `uid`, `displayName`, `email`, `photoURL`.
- `firebaseProgress.js` writes `profile` and `progress` to `users/{uid}`.
- `firebase_realtime_database_security_review_2026-06-21.md` already warns that email/photoURL are not needed for game progress and should be minimized.

Play Console Data safety draft direction, pending final implementation confirmation:

| Data category | Likely declaration | Notes |
|---|---|---|
| Personal info: name | Yes, if displayName/nickname stored | Used for profile/ranking/display. |
| Personal info: email | Yes, if email stored | Strongly consider removing from cloud save if not necessary. |
| Photos/videos: profile photo URL | Possibly personal info/photo-related depending declaration interpretation | Avoid storing if not displayed. |
| User IDs | Yes | Firebase UID stored and path uses UID. |
| App activity / game progress | Yes | Records, unlocks, gold, settings are gameplay/progress data. |
| Diagnostics/crash | Not confirmed | No analytics/crash SDK evidence found in inspected files. |
| Location | No evidence | Do not declare unless additional SDKs collect it. |
| Ads | No evidence in inspected files | Future rewarded ads would change declaration. |
| Purchases | No evidence in inspected files | Future IAP would change declaration. |

Blockers:

1. No privacy policy document/URL found.
2. No account deletion method found.
3. Current profile save includes email/photoURL even though the security review recommends minimizing them.
4. Firebase Realtime Database security rules cannot be verified from repo files.
5. App Check status cannot be verified.

Recommended data minimization before public testing:

- Store only `uid`, `displayName` or `nickname`, and required progress data.
- Do not store email unless there is a clear user-facing need.
- Do not store photoURL unless the app actually displays it.
- Add privacy policy page covering Google login, Firebase Auth, Realtime Database, local storage, data retention, account deletion/contact method, and children/age policy posture.
- Add a simple account deletion request route or in-app instructions before public release.

## 6. Store listing risk

Known package/private link:

- `https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool`

Current naming evidence:

- Android label/app name: `Escape Zombie School`.
- Project name: `Escape! zombie school`.

Store listing recommendations:

- Use one consistent public title across Play listing, launcher label, screenshots, and marketing copy.
- Avoid claiming official online/global leaderboard until server-validated ranking exists.
- Avoid claiming multiplayer, account sync, cloud backup, ads, IAP, or Stage 2 release content unless those are actually enabled in the uploaded build.
- Use screenshots from the exact internal-test build. Do not include admin/debug/cheat UI in store screenshots unless clearly test-only and never public.
- Feature graphic size should be 1024 x 500.
- App icon and screenshots should avoid third-party school/zombie/trademark imagery unless owned/licensed.

Suggested short positioning for a private/internal test listing:

```text
Escape Zombie School is a short survival action game where you dodge and fight waves of cartoon school zombies, collect XP, choose upgrades, and try to survive the Stage 1 loop.
```

Claims to avoid now:

- Official ranked PvP or global competitive leaderboard.
- Secure cloud save if Firebase security rules and deletion/privacy flows are not verified.
- Production-ready live service.
- Ads/IAP/rewards unless implemented and declared.

## 7. Policy/content safety gate

Content category:

- Cartoon zombie/school survival game.
- Violence appears stylized/fantasy based on project context.

Policy risks to check before public release:

1. Age rating questionnaire must reflect zombie violence, weapons, and school setting accurately.
2. Store text/screenshots should not imply real-world school violence or realistic harm.
3. If children are a target audience, Google Play Families policy becomes a major additional gate. Current recommendation: do not declare as child-directed unless the full Families policy, ads, data collection, and content obligations are intentionally met.
4. If Google login is used, privacy policy and account deletion are mandatory operationally even for tests that include real users.
5. If public ranking/rewards are added, anti-cheat/server validation becomes a policy/trust requirement, not just a gameplay feature.

## 8. Debug/admin/cheat exposure gate

Evidence:

- `App.jsx` contains an `/admin` route check.
- `adminConfig.js` default operations include `cheatMenuButtonVisible: true`.
- Tests reference cheat menu, unlock all weapons, stage selection, and admin balance controls.
- QA screenshot filenames include admin/cheat visibility checks.

Risk:

- Public-facing builds that expose admin/cheat controls can confuse testers, distort Data safety/ranking behavior, and invalidate gameplay QA.

Required before any public-facing release track:

1. Confirm `/admin` is not reachable in public builds, or is protected by authentication/role checks.
2. Confirm title cheat menu is hidden by default in the release build.
3. Confirm store screenshots do not show admin/cheat UI.
4. Confirm internal-test release notes explicitly label any remaining debug/admin functionality as test-only.

## 9. Safe internal testing checklist

Before creating the internal-test release:

- [ ] Install/configure JDK so Gradle can run.
- [ ] Re-run `npm test` and get exit code 0, not only passing assertions with unhandled worker errors.
- [ ] Run `npm run build` and accept or reduce the large chunk warning.
- [ ] Run Capacitor sync/build as appropriate after web build.
- [ ] Generate signed `.aab` with correct keystore.
- [ ] Verify `versionCode` is higher than the last uploaded artifact.
- [ ] Upload to Play Console internal testing only.
- [ ] Add a small tester list and release notes.
- [ ] Install through Play on at least one Android device.
- [ ] Verify first launch, mobile controls, pause/resume, Stage 1 loop, result flow, coin/shop flow, Google login state, progress save behavior, and no unintended admin/cheat UI.
- [ ] Keep production inactive.

Play Console internal-test steps:

1. Go to `Test > Internal testing`.
2. Create or edit internal testing release.
3. Upload signed AAB.
4. Add clear release notes: `Private internal test build. Do not publish to production.`
5. Review warnings, especially SDK/API/data safety warnings.
6. Save/submit internal test only.
7. Do not click production release controls.

## 10. Production/global rollout hard gates

Do not publish production until all are true:

- [ ] Signed AAB uploaded and internally installed successfully.
- [ ] Android build is reproducible in a clean environment.
- [ ] Full JS test suite exits 0.
- [ ] Android smoke test passes on physical device.
- [ ] Privacy policy URL is live.
- [ ] Account deletion method is live and documented.
- [ ] Data safety form exactly matches data actually collected/shared.
- [ ] Firebase rules restrict users to their own `uid` path.
- [ ] Email/photoURL storage is removed or explicitly justified/disclosed.
- [ ] App Check decision is made for Firebase abuse protection.
- [ ] Admin/cheat UI is disabled/protected in release builds.
- [ ] Store listing text/screenshots match actual build features.
- [ ] Age rating questionnaire is completed honestly.
- [ ] Country/region availability is intentionally set before publishing.
- [ ] Managed publishing overview shows all critical changes ready before pressing publish.

## 11. Files changed by this task

Created/updated:

- `CEO/auto_deploy_google_play_readiness_gate_2026-06-24.md`

No code files were intentionally edited. No commit/push performed.

## 12. Handoff notes

- The earlier gstack blocker is resolved in this run: `GSTACK_OK`.
- Current shell cannot verify Android build because Java/JDK is not configured.
- Current full test run cannot be considered clean because Vitest exits 1 despite all listed tests passing.
- The safest next operational card is a build-environment/JDK + signed AAB verification task, followed by a privacy/data-safety/account-deletion task.
- Production/global launch remains high risk; use internal testing only until gates above are green.
