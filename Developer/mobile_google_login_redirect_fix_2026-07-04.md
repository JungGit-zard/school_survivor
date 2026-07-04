# Mobile Google Login Redirect Fix - 2026-07-04

## Root Cause

The Firebase Auth client used `signInWithPopup()` for every platform. Firebase's web Google sign-in documentation says redirect sign-in is preferred on mobile devices, and the current Capacitor/mobile flow was getting stuck after Google account selection.

## Change

- Added mobile/Capacitor detection in `firebaseAuth.js`.
- Mobile and Capacitor shells now use `signInWithRedirect()`.
- Auth initialization consumes `getRedirectResult()` so the returned Google user can be restored after the redirect.
- Desktop web keeps `signInWithPopup()`.
