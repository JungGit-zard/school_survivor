# book XP recovery boundary review — backendmini

Date: 2026-10-11
Task: t_82161e0d
Scope: read-only review of current HEAD `285f2f8e` book XP → HUD level-up crash recovery path.

## Mandatory gate

- Command summary: `book-xp-review`
- matched_domains: `qa`
- match_evidence: `qa` keyword `review`
- resolved domains also included backendmini default `backend` and common documents.
- combined_receipt_sha256: `f8240c16e15f9860b356babb1a8eecf440f9743ae452115256e8e51ae1ba3e82`

## Files inspected

- `Developer/r3f_prototype/src/lib/weaponUnlocks.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/HUD.guestProgress.test.jsx`
- `Developer/r3f_prototype/src/lib/upgrades.js`
- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Quaility_Assurance/login_progress_recovery_20261011.md`

## Review result

The one-line runtime boundary in `weaponUnlocks.isUnlocked()` is correct for the reported path: starter weapons still return `true` before any Firebase read, invalid/runtime-only/non-account weapons stay `false`, and non-starter account unlocks now return `false` while Firebase progress is not hydrated. Therefore HUD line 949 can filter `getAccountUnlockableWeaponIds()` during signed-in-but-unhydrated level-up without reaching `readRaw()` / `readFirebasePlayerProgress()` and without throwing `FirebaseProgressError('progress-not-hydrated')`.

Immediate regression risk appears low for the book XP recovery boundary. The tradeoff is intentionally conservative: signed-in users may temporarily not see account-gated non-starter acquisition cards until the verified remote snapshot arrives, but gameplay continues and starter card availability is preserved. Once `isFirebaseProgressHydrated()` is true, the existing `readRaw()[id] === 1` path and storage semantics are unchanged.

## Boundaries not claimed

- I did not run tests, deploy, commit, or write production/Firebase data; this was review-only per card scope.
- Actual device Google OAuth recovery is still not verified here and must not be claimed as successful.
- Existing dirty `Lobby.jsx` / `Lobby.test.jsx` workspace edits were not touched.
