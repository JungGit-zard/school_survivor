# Title Screen Technical Discussion - 2026-05-23

## Scope

This document records the developer-side discussion for the `Escape! zombie school` title screen concept.

No implementation changes were made for this discussion.

## Current Structure

- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
  - Owns DOM title text, subtitle, button, and the title Canvas.
- `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
  - Owns R3F title background scene, toon objects, player, zombies, warning lights.
- `Developer/r3f_prototype/src/App.jsx`
  - Shows title screen first and transitions to game through `onStart`.

## Recommended Technical Direction

Keep the current split:

- `TitleScreen` = UI and screen transition.
- `TitleScene3D` = non-interactive 3D presentation.

Do not move gameplay physics, enemy AI, collision, or weapon logic into the title screen.

The title screen should remain a lightweight presentation scene. It can reuse visual style, but it should not reuse live gameplay state.

## MVP Technical Additions

Safe additions:

- stronger exit-door glow
- subtle camera drift
- slightly clearer player escape pose
- slow zombie sway
- 1 or 2 school signs such as `비상구`, `감염주의`, `출입금지`
- one or two floor infection streaks
- simple CSS title entrance
- subtle start-button pulse

Avoid postprocessing and heavy particle systems for MVP.

## Risks

- Too many outlined objects increase draw calls on mobile.
- Separate title Canvas can cause a small WebGL reinitialization hitch when entering the game.
- `antialias: true` may be expensive on low-end phones.
- Too many translucent lights or overlays can cause overdraw.
- Audio on title screen must wait for user interaction because mobile browsers block autoplay.

## Verification Points

- Title is readable on first load.
- `게임 시작` enters Stage 1 without delay or black frame.
- Mobile title screen does not show virtual joystick.
- Virtual joystick appears only after entering `playing` on mobile.
- 9:16 mobile layout does not overlap title, character, and button.
- Character and zombies remain 3D toon with outlines.
- g-stack or equivalent browser/mobile validation should be used when implementation begins.

