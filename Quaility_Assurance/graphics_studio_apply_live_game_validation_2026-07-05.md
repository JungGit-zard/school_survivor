# Graphics Studio Apply Live Game Validation - 2026-07-05

## Check

Confirmed whether Graphics Studio transform changes and the Apply/save path update game-side tuned groups immediately.

## Evidence

- `GraphicsStudio` saves slider and Apply values through `saveStudioTunings`.
- `saveStudioTunings` dispatches `GRAPHICS_STUDIO_TUNING_EVENT`.
- `StudioTunedGroup` listens for that event and reloads item tuning.
- Added a regression test that renders a game-side `StudioTunedGroup`, saves player tuning, and verifies the group transform updates immediately.

## Result

Immediate game-side application is covered for confirmed transform values.

