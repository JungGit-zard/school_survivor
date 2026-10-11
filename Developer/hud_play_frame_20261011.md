# HUD play-frame containment — 2026-10-11

## Scope
- Target file: `Developer/r3f_prototype/src/components/HUD.jsx`
- User request: keep in-game HUD controls and stats inside the actual portrait play frame on web layouts.

## Change
- Changed the HUD root container from `position: fixed` to `position: absolute` while keeping `inset: 0`.

## Why
- `ReadyGameApp.jsx` already renders `GameplayScreen` inside `styles.phoneFrame`, and `styles.phoneFrame` is `position: 'relative'` with the portrait 9:16 play-frame width.
- `HUD.jsx` renders inside that same frame, so an absolute HUD root uses the phone frame as its containing block.
- With `fixed`, HUD children were anchored to the full browser viewport, allowing score, XP, account/level, pause, and quest controls to spill over the side illustration area on wide web ratios.

## Verification
- Direct file inspection confirmed `HUD.jsx` has no `createPortal`/`document.body` HUD portal path and no additional `position: fixed` HUD child styles after the root change.
- No broad HUD test/build suite was run per the task constraint; advisor/browser QA owns desktop/mobile bounds and pause-click verification.
