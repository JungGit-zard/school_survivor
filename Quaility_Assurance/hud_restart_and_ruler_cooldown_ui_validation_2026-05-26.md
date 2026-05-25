# HUD Restart and Ruler Cooldown UI Validation - 2026-05-26

## Scope

- Confirm the HUD change does not break tests or production build.
- Confirm the ruler cooldown UI is removed from the visible gameplay screen.
- Confirm one quick restart button exists in the gameplay HUD.

## Verification

- `npm.cmd test -- --run`
  - Result: pass
  - 22 test files passed
  - 144 tests passed
- `npm.cmd run build`
  - Result: pass
  - Vite reported the existing large chunk size warning, but the build completed.

## Visual QA

- Browser screenshot verification was not performed because no browser automation tool was exposed in this session.
- Code inspection confirms `styles.cdWrap.display` is `none`, so the ruler cooldown UI is not visible.
- Code inspection confirms the `R` restart button renders next to the pause button during `playing` and `paused` phases.

