# Title Landing Screen Implementation - 2026-05-17

## Visual Direction

- Mobile portrait title screen for `Escape! zombie school`.
- Background uses a 3D toon school corridor with infected green traces, warning light pools, distant zombie silhouettes, and a ready-to-run player.
- Mood target is infected-school action, not realistic horror.

## Implementation Notes

- `Developer/r3f_prototype/src/components/TitleScreen.jsx` owns DOM title copy and buttons.
- `Developer/r3f_prototype/src/components/TitleScene3D.jsx` owns the R3F background scene.
- The scene reuses existing toon material and outline helpers from `lib/toon.js`.
- Button layout keeps `게임 시작` immediately findable in the lower safe area.
