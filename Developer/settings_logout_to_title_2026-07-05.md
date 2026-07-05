# Settings Logout To Title

Date: 2026-07-05

## Change

- Added a logout button to the lobby settings modal.
- Reused the existing `signOutOfGoogle` auth-store action.
- Routed logout completion up through `Lobby` to `App`, then forced the screen state back to `title`.
