# Google Login Account-Bound Progress Check

Date: 2026-07-04

## Result

- Game start is now blocked unless a Google user with `uid` exists.
- First start after Google sign-in still requires nickname input.
- Nickname changes from settings are allowed only for a signed-in Google user.
- Ranking scores are stored per Google uid at `rankings/{seasonId}/entries/{uid}` and update only when the new score is higher.
- Coin total, player records, weapon unlocks, passive upgrades, title settings, and nickname are stored under `users/{uid}`.
- On Google sign-in or auth restore, the app now loads `users/{uid}` from Realtime Database before saving current progress.
- If `users/{uid}` does not exist, local progress is cleared to a fresh account state and then saved for that uid.

## Files

- `src/components/TitleScreen.jsx`
- `src/lib/firebaseProgress.js`
- `src/store/useAuthStore.js`
- `src/store/useGameStore.js`
- `src/lib/firebaseRanking.js`
