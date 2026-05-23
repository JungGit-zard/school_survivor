# Virtual Joystick Mobile Validation - 2026-05-23

## Scope

- Target files:
  - `Developer/r3f_prototype/src/App.jsx`
  - `Developer/r3f_prototype/src/components/VirtualJoystick.jsx`
  - `Developer/r3f_prototype/src/components/VirtualJoystick.test.jsx`
  - `Developer/r3f_prototype/src/lib/mobileInput.js`
  - `Developer/r3f_prototype/src/lib/mobileInput.test.js`
- User requirement:
  - The virtual joystick must not exist on desktop/web mouse environments.
  - The virtual joystick may appear only on mobile touch environments.
  - On mobile, it appears only after a touch starts on the game canvas during active play.

## Validation Criteria

1. Desktop browser and touch-capable desktop browser must not enable the virtual joystick.
2. Mobile touch browser may enable the virtual joystick only when all conditions are true:
   - mobile-like touch environment
   - game screen is active
   - game phase is `playing`
   - touch begins on the canvas inside the phone frame
3. HUD, buttons, modal panels, title, coin shop, gameover, cleared, paused, and level-up states must not create joystick input.
4. `touchend`, `touchcancel`, unmount, or phase change must reset `joystickDir`.
5. Touch movement should not force a React state update for every raw `touchmove` event.

## Automated Checks Added

- `src/lib/mobileInput.test.js`
  - rejects desktop browsers
  - rejects touch-capable desktop browsers
  - allows mobile browsers with coarse touch input
  - allows iPad desktop-mode Safari as mobile touch
- `src/components/VirtualJoystick.test.jsx`
  - disabled desktop/web mode stays hidden and does not activate input
  - mobile playing canvas touch shows joystick at the touch point
  - outside play area and HUD/UI touches are ignored
  - non-playing phase stays hidden
  - active input resets when phase leaves `playing`
  - `touchcancel` resets active input
  - unmount removes touch listeners
- `src/App.virtualJoystick.test.jsx`
  - desktop web app does not mount the joystick
  - mobile touch app mounts the joystick on the game screen

## Verification Run

- `npm test -- src/components/VirtualJoystick.test.jsx`
  - 7 tests passed
- `npm test -- src/lib/mobileInput.test.js`
  - 4 tests passed
- `npm test -- src/App.virtualJoystick.test.jsx`
  - 2 tests passed
- `npm test -- --run`
  - 17 files passed
  - 143 tests passed
- `npm run build`
  - passed
  - existing Vite chunk-size warning remains

## Remaining Manual QA

- iPhone Safari:
  - canvas touch creates joystick at the touch point
  - HUD touch does not create joystick
  - pause/level-up/result modal touch does not create joystick
  - app background/return clears joystick input
- Android Chrome:
  - same checks as iPhone Safari
  - `touchcancel` clears movement
- Desktop Chrome/Edge:
  - mouse and keyboard play without joystick DOM
  - touch-capable Windows laptop does not enable joystick

## Status

Automated validation passes. Manual device/browser checks are still required before marking this as fully QA complete.
