# Rosari urgent restore 2026-10-16

Owner: existing Codex release worker, launchmini routing card t_f35c7674.
Hermes automatic attempts 28884 and 21028 crashed; current owner alone executes release. No other promotion is authorized from this checkout.

Release checkout: C:/Users/admin/AppData/Local/Temp/rosari-hotfix-release-20261016
Baseline: 5e1acde061d25017e75d4fd0ff57460208698814 (latest fetched origin zombie_only).
Source: accepted canonical F checkout RosariRoom and exact dependency files; room-only title/route hunks.
Destination: zombie_only / https://github.com/JungGit-zard/school_survivor.git

Rollback: Firebase channel rosari-rollback-20261016, original live version e08a6598dc247a54.
Rollback command: firebase hosting:clone escape-zombie-school:rosari-rollback-20261016 escape-zombie-school:live

Focused verification: 6 files / 52 tests PASS; mandatory Studio prebuild verification 4 files / 45 tests PASS.
Advisor independently confirmed unchanged baseline bytes/SHA256 for firebaseProgress, useAuthStore, useGameStore, HUD and canonical title BGM.
Canonical title BGM SHA256: 991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe.
No login design, account data, gameplay progress, existing homepage/comics/audio source modifications.

## Frozen source hashes
- Developer/r3f_prototype/src/components/TitleScreen.jsx: 5ab0a4b6255abfc05793e125d6f897b2c7028864d0decf8ba95f779a4d84258e
- Developer/r3f_prototype/src/components/ReadyGameApp.jsx: 662d0cdf184cbd9bbdd8f3d927d7ece9f79c2e61dc3f18765375b1515d6c248b
- Developer/r3f_prototype/src/components/RosariRoom.jsx: 858f546c6ed263536511ad3de56ee6fc301ae4abe67acb3a9297c45debdd99ec
- Developer/r3f_prototype/src/lib/rosariRoom.js: 3429408a8413f30fc7d12931fccbc0c45ff72fcfcfba15d8d0af4ea5d19fba81
- Developer/r3f_prototype/public/assets/rosari-room/PLAYER_wholebody_refined_t_efe49b7c.glb: a341578580d0e2afbefd7a673a8b32cff3a5d0c6ad2119f2d9a230e3df668f7d

## Release status
COMPLETE. No further promotion pending from this hotfix owner or checkout.

## Completed preview-to-live evidence
- Source commit: f4afd760a7d38fc03ee83cb54fb7943cfea80c0c
- Preview: https://escape-zombie-school--rosari-hotfix-20261016-bjfqestc.web.app/game
- Production: https://escapezombie.com/game
- Preview and live Hosting version: d6b5abe3d7bb45aa; live releaseTime 2026-10-16T00:15:00.375Z.
- Production build PASS (24.70s); prebuild gates and postbuild artifact verification PASS. Preview and live remote JavaScript verification: 62 assets PASS each.
- Advisor independent preview: title button click -> room main/3D scene/movement/wardrobe displayed; screenshot visually confirmed room and character; back button returned to title with start/room/homepage. PASS.
- Advisor independent fresh live browser at 390x844: same title button -> room and character visibly rendered -> back to title, start/room/homepage displayed. PASS.
- Existing login/progress core, quest HUD, canonical title BGM bytes and accepted room/lib canonical bytes independently confirmed unchanged/preserved by Advisor.
- Build-frozen title/route/room/lib/model hashes above rechecked after deployment: all unchanged. No persistent test config or source test-time edits.
- Temporary config: Developer/r3f_prototype/firebase.rosari-hotfix-preview.temp.json, SHA256 2f0f3b6aeb66bbdbc17cd3504ef8102144b6f4a3c90ea330fcee913105ef2e27; removed after deployment. Original firebase.json/package.json unchanged. Only duplicate already-passed build command excluded; nonce guard, legal and 76 card predeploy generation all ran.
- Only preview channel deploy and verified preview-to-live clone were performed. No database/auth/account mutation, AAB, or additional production promotion.
- Source restore commit pushed to intended zombie_only origin. Evidence record/screenshots are separately committed below.
- Owner completion UTC: 2026-10-16T00:17:27.198807+00:00

## Visual evidence
- Quaility_Assurance/rosari_urgent_restore_20261016/preview-room.png: 9fe6757313990620a79bbd9eb5abbbfd5a2758fabcb11df8802497a0e525aec7
- Quaility_Assurance/rosari_urgent_restore_20261016/live-mobile-room.png: 3e6a7d7a61ac13d86a8f2cc8add4dadfb00d3308bcc4c9173116c1676b425027
