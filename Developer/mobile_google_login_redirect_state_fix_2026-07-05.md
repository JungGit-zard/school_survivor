# Mobile Google Login Redirect State Fix - 2026-07-05

> Superseded by `Developer/native_google_login_capacitor_fix_2026-07-05.md`.
> After the later `localhost ERR_CONNECTION_REFUSED` evidence, popup/redirect web auth was judged insufficient for the Android AAB.

## Symptom

- AAB mobile login opened a Firebase auth handler page and failed with:
  - missing initial state
  - storage-partitioned browser environment

## Root Cause

- `shouldUseRedirectSignIn()` forced `signInWithRedirect()` for mobile and Capacitor shells.
- Firebase redirect auth can lose its stored initial state when the mobile browser context partitions or clears session storage.

## Fix

- Stop selecting redirect login.
- Let the existing Google login flow use `signInWithPopup()` instead.

## Verification

- `npm test -- src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js`
- `npm run build`
