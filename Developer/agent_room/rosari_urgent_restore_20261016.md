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
Production build and preview verification in progress. Live promotion pending; do not report completion before actual room entry and return evidence.
