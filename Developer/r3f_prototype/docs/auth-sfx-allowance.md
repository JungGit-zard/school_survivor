# Login/Auth Overlay SFX Allowance

Purpose: prevent gameplay/combat/result sounds from firing while an interactive Google auth overlay is active, so account selection/login feedback is not masked by stale game SFX.

## State table

- Auth state: `checking`
  - Overlay active: no
  - Allowed SFX: all normal SFX
  - Rationale: passive Firebase session restore should not mute the title/game.

- Auth state: `signedOut`
  - Overlay active: no
  - Allowed SFX: all normal SFX
  - Rationale: player can browse title UI normally.

- Auth state: `signingIn === true`
  - Overlay active: yes, represented in code as `authOverlayActive`
  - Allowed SFX: `buttonClick` only
  - Blocked SFX: gameplay, combat, enemy, pickup, level/result, portal, boss, and milestone SFX
  - Rationale: only intentional auth/UI tap acknowledgement may play during the Google account overlay; stale game events must be silent.

- Auth state: `signedIn`
  - Overlay active: no
  - Allowed SFX: all normal SFX
  - Rationale: auth overlay has closed and normal game feedback resumes.

- Auth state: `error` / `unconfigured`
  - Overlay active: no
  - Allowed SFX: all normal SFX
  - Rationale: error/setup panels are in-app UI, not external auth overlays.

## Implementation seam

`SfxLayer` reads the latest `useAuthStore.getState().signingIn` value at SFX event time and passes it to `playSfx` as `authOverlayActive`.
`playSfx` owns the allow-list so the rule is unit-testable without rendering React.
