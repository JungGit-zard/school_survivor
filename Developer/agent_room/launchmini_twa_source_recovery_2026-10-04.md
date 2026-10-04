# October 3 TWA source recovery

- Worker: launchmini; Kanban: `escape-zombie-school / t_b5969d6f`.
- Authority: user requires web updates to apply to the Android web app, without a new AAB. Advisor assigned exact successful-source restoration.
- Source: `C:/Users/admin/.codex/sessions/2026/10/03/rollout-2026-10-03T11-07-00-01a0ff83-c417-79f3-bdaa-7bda858224ae.jsonl`.
- Replayed only successful `item_completed / FileChange` records at 02:09:05, 02:10:08, 02:12:06, 02:14:18, 02:15:16, 02:17:43 UTC. The source transcript also contains a successful 02:12:53 UTC removal of `node scripts/assert-web-landing-preservation.mjs` from `firebase.json`; the local recovery did not apply an additional edit for that record because the target line was already absent in the recovered file.

## Restored behavior

- MainActivity extends Android Browser Helper LauncherActivity. Launcher metadata opens `https://escapezombie.com/game`.
- Gradle uses Android Browser Helper 2.5.0; removes active Capacitor/Cordova project and Google Services integration. `assets.srcDirs = []` excludes bundled game assets.
- Android asset statement targets the web origin. Web assetlinks targets the exact package/certificate from the successful transcript and live website.
- Hosting `ignore: []` includes `.well-known`; `/game` and `/game/**` use `Cache-Control: no-cache` so subsequent launches revalidate the web HTML. Existing hashed asset URLs identify updated JavaScript.
- Restored web manifest link, manifest JSON, and assetlinks JSON.
- No successful capacitor.config.json change exists in this transcript: preserved that file. v68/1.0.35 version increment exists only in the separate AAB build-folder transcript; canonical D versionCode67 was preserved.

## Verification on 2026-10-04

- `git diff --check`: pass.
- Android manifest and strings XML parse: pass.
- Firebase Hosting config and public JSON parse: pass.
- Launcher class, exact live URL, TWA dependency, no active Capacitor project dependency, and empty Android asset source set: pass.
- Live `/game`: HTTP 200; Cache-Control `no-cache`; Last-Modified `Sat, 03 Oct 2026 09:12:55 GMT`.
- Public manifest byte-identical to live: SHA-256 `c9fd98d4bf14c2c90e0b85e533bff22ed130f3193d5ac376e37f49f233eb5652`.
- Public assetlinks byte-identical to live: SHA-256 `d67de7358edd404ef805fc68a6cbb50d33cf925c272e990ca00ca947a8485431`.

## Scope and limits

No AAB/APK build, upload, Hosting deployment, Firebase data/auth write, commit, or push performed by this Worker. Database rules and unrelated dirty files were preserved. The recovered TWA source supports web game updates through Hosting without an Android rebuild. Existing Play-installed version, actual Android TWA launch, certificate trust, and fresh real-device OAuth success remain unverified by this restoration. Native shell changes would still require an Android release.
