# Firebase progress save warning false-positive fix - 2026-08-22

## Scope

Kanban task `t_0132b55c` fixed false progress-save warning paths around Firebase personal progress saves.

## Decision

`requestCloudProgressSave()` now distinguishes two false outcomes:

1. No-op / not-ready paths that must stay quiet:
   - Firebase progress is not configured.
   - Progress is not hydrated.
   - A queued save flushes after the same uid is no longer hydrated.
   - Background callers such as activity saves have nothing valid to persist.
2. Real transport failure path that may show a warning:
   - The request started from a hydrated same-uid runtime and `client.save()` rejects.

The public return value remains boolean for existing callers. The internal queue result carries `{ saved, shouldWarn }`, and only `shouldWarn === true` creates the pending `save-failed` warning.

## Store boundary

`useGameStore` does not treat every `false` save result as a UI warning. It calls the save path only for a configured, hydrated runtime with a current UID, then sets `progressSaveWarning: 'save-failed'` only when Firebase exposes a pending same-account transport-failure warning. A rejected injected/mock promise follows the same guarded warning seam.

This keeps initialization, unconfigured, unhydrated, and background no-op paths silent while retaining the actual same-UID transport failure seam.

## Verification

Ran from `Developer/r3f_prototype`:

```text
npm.cmd exec -- vitest run src/lib/firebaseProgress.test.js src/lib/weaponUnlockMigration.test.js src/lib/weaponUnlocks.test.js src/lib/databaseRules.test.js src/store/useGameStore.unlocks.test.js src/store/useGameStore.cloudProgress.test.js --maxWorkers=1 --no-file-parallelism
```

Result: 6 test files passed, 97 tests passed.

The local database rules test additionally verifies that the four shipped boss passive keys (`b01SetSquare`, `b02CorridorPass`, `b03GymWhistle`, `b04ServingLadle`) are true-only and all unknown keys remain denied. No Firebase rules deploy was performed.

Also ran targeted diff whitespace check:

```text
git diff --check -- Developer/r3f_prototype/src/lib/firebaseProgress.js Developer/r3f_prototype/src/lib/firebaseProgress.test.js Developer/r3f_prototype/src/store/useGameStore.js Developer/r3f_prototype/src/store/useGameStore.cloudProgress.test.js
```

Result: no whitespace errors. Git emitted the pre-existing line-ending notice for `useGameStore.js` (`CRLF will be replaced by LF the next time Git touches it`).
