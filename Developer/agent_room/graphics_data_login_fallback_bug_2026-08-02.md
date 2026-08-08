# Graphics Data Login Fallback Bug QA Note

Date: 2026-08-02
Board: escape-zombie-school

## User report

When logging in with another Google account, the title flow displayed the now-deleted readiness failure banner.

## Root cause

The regular game start path called `ensureStudioCloudReady(user)` after login. For any signed-in user, it tried to hydrate only the per-user Graphics Studio workspace:

```text
studioWorkspaces/v1/users/{uid}/current
```

New or non-master player accounts do not necessarily have a personal Graphics Studio workspace, so Firebase returned `missing-remote`. The title start button treated that as fatal and displayed the now-discarded graphics-readiness failure banner.

This was correct for `/graphics-studio` editing, but too strict for the normal game route. Regular players should be allowed to use the public canonical Studio revision instead of requiring their own editor workspace.

## Fix

- Normal game route:
  - If signed-in user workspace hydration returns `missing-remote`, fall back to public canonical Studio hydration.
  - If pre-login canonical runtime is already ready, reuse it and allow the game start gate to continue.
  - Do not subscribe to user workspace updates when the runtime source is canonical fallback.
- `/graphics-studio` route:
  - Keeps requiring signed-in per-user workspace hydration.
  - Does not use canonical fallback for editor access.

## Specialists

Subagent mandatory routing
Board: escape-zombie-school
Trigger: Firebase/auth + R3F/Graphics Studio boot bug on account switch/login.
Specialists involved: backendmini, threemini, balanceqa
Cards/artifacts/review trail: `Developer/agent_room/graphics_data_login_fallback_bug_2026-08-02.md`

## Verification

```text
npm test -- src/App.firebaseBootstrap.test.jsx
Test Files  1 passed (1)
Tests  15 passed (15)
```

```text
npm test -- src/App.firebaseBootstrap.test.jsx src/App.virtualJoystick.test.jsx src/components/TitleScreen.settings.test.jsx src/components/ReadyGameApp.test.jsx
Test Files  4 passed (4)
Tests  40 passed (40)
```

```text
npm run build
branch guard: ok
Title surface canonical gate passed.
Canonical title BGM source gate passed.
Legacy B02 source gate passed.
✓ built
Legacy B02 artifact gate passed (dist).
Canonical title BGM artifact gate passed.
```
