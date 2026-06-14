# Google Login Secure Cloud Save QA TODO

Date: 2026-06-14

## Goal

Verify that permanent player progress is account-bound and cannot be changed by editing browser local storage.

## Test Matrix

- [ ] Logged-out user sees Google login requirement.
- [ ] Logged-out user cannot start a permanent-progress run.
- [ ] Google login succeeds.
- [ ] Progress loads from `userProgress/{uid}` after login.
- [ ] Missing progress document creates safe default progress through server flow.
- [ ] Coin gain after run end is added by `finishRun`, not by direct client write.
- [ ] Passive purchase is processed by `purchasePassive`, not direct client write.
- [ ] Weapon unlocks are recalculated from trusted server records.
- [ ] Editing `school_survivor:goldTotal` in localStorage does not affect cloud `goldTotal`.
- [ ] Editing `school_survivor:passiveUpgrades` in localStorage does not affect cloud passive levels.
- [ ] Editing `school_survivor:weaponUnlocks` in localStorage does not affect cloud weapon unlocks.
- [ ] Duplicate `runId` does not pay coins twice.
- [ ] Impossible run result is rejected.
- [ ] Firestore direct write to `userProgress/{uid}` is denied.
- [ ] Firestore direct write to `userRuns/{uid}/runs/{runId}` is denied.
- [ ] Production build does not expose development reset or cheat write paths.

## Required Evidence Before Release

- [ ] Unit test output for React client storage/auth adapters.
- [ ] Unit test output for Cloud Functions validation.
- [ ] Firestore rules test output or emulator verification log.
- [ ] Browser screenshot of logged-out title screen.
- [ ] Browser screenshot of logged-in title screen with loaded progress.
- [ ] Browser screenshot of coin shop after successful server purchase.
- [ ] Manual tamper test note showing localStorage edits do not alter cloud progress.

