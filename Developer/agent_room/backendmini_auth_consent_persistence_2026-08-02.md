# backendmini routing trail — Firebase Auth browser persistence (2026-08-02)

- Scope: Firebase Auth session persistence only. `createFirebaseAuthClient` now calls Firebase Auth's official `setPersistence(auth, browserLocalPersistence)`; no account records, OAuth tokens, Firebase ID tokens, or refresh tokens are copied into app storage or RTDB.
- Consent: canonical storage remains `users/{uid}.consent` through the existing Firebase progress path. No consent data, legal version, or consent UI changed.
- RED: `npx vitest run src/lib/firebaseAuth.test.js` failed before the source change because `setFirebaseAuthBrowserLocalPersistence` was not implemented (2 failures).
- GREEN: `npx vitest run src/lib/firebaseAuth.test.js src/lib/consent.test.js src/components/TitleScreen.settings.test.jsx` passed: 3 files, 32 tests.
