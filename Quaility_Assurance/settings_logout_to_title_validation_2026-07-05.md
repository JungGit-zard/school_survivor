# Settings Logout To Title Validation

Date: 2026-07-05

## Checks

- `npm test -- src/components/LobbySettingsModal.test.jsx src/components/Lobby.test.jsx src/store/useAuthStore.cloudProgress.test.js`
  - Passed: 3 files, 6 tests.
- `npm run build`
  - Passed.

## Coverage

- Confirms the settings logout button calls Google sign-out.
- Confirms the same click requests a forced return to the title screen.
