# Google Login Title Auth Implementation

Date: 2026-06-15

## Implemented

- Added `firebase` as the web auth dependency.
- Added Firebase env parsing in `Developer/r3f_prototype/src/lib/firebaseAuth.js`.
- Added account auth state in `Developer/r3f_prototype/src/store/useAuthStore.js`.
- Added the title-screen account panel in `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`.
- Mounted the account panel from `Developer/r3f_prototype/src/components/TitleScreen.jsx`.
- Added `Developer/r3f_prototype/.env.example`.
- Updated `.gitignore` so real `.env` files are not committed.

## Notes

The current milestone only authenticates the player. Trusted economy writes still need Cloud Functions, because browser code cannot be trusted to decide permanent coins, passive levels, weapon unlocks, or records.

Required local env keys:

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

Optional env keys:

```txt
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_MEASUREMENT_ID
```
