# Browser Playtest Validation

Date: 2026-06-18

## Scope

Requested check: open the game in a browser, play it, and fix any errors found.

Target:

- `http://127.0.0.1:5178/`
- Local Vite dev server from `Developer/r3f_prototype`

## Browser Play Paths

- Opened the game in the system browser.
- Automated Playwright smoke play on a 390x844 mobile viewport.
- Title screen loaded with the Google account panel, settings button, stage buttons, coin shop button, and debug buttons.
- Started Stage 1.
- Played movement loops with keyboard controls.
- Confirmed player HP changes during zombie contact.
- Confirmed XP/level progression.
- Confirmed level-up selections:
  - `텀블러 획득`
  - `커터칼 획득`
  - `최대 체력 +20`
  - `오니기리 획득`
- Reached approximately 50 seconds of Stage 1 runtime, Lv.6, without a page crash.

## Error Collection

Collected:

- Browser `pageerror`
- Browser `console.error`
- Browser `console.warning`
- Request failures

Result:

- No `pageerror` events.
- No `console.error` events.
- No failed requests observed.
- Repeated Chromium WebGL performance warnings appeared:
  - `GPU stall due to ReadPixels`

The WebGL messages are browser/driver performance warnings, not game exceptions. They did not stop gameplay and did not require a code fix in this pass.

## Automated Verification

- `npm test -- --run`
  - 42 test files passed.
  - 248 tests passed.
- `npm run build`
  - Build passed.
  - Vite emitted the existing large chunk warning.

## Screenshots

- `Quaility_Assurance/browser_play_title_2026-06-18.png`
- `Quaility_Assurance/browser_play_game_start_2026-06-18.png`
- `Quaility_Assurance/browser_play_after_2026-06-18.png`

## Conclusion

No blocking runtime errors were found during the browser playtest. No gameplay code changes were needed.
