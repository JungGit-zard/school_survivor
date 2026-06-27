# UI Style Tokens, Title, and HUD Implementation

## Scope

Implemented the first phase of the "infected school survival notebook UI" direction.

Changed code:

- `Developer/r3f_prototype/src/lib/uiStyle.js`
- `Developer/r3f_prototype/src/lib/uiStyle.test.js`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
- `Developer/r3f_prototype/src/components/HUD.jsx`

## Implementation

- Added shared UI tokens: `uiPalette`, `uiBorders`, `uiShadows`, `uiType`.
- Added reusable style helpers: `schoolPanel`, `schoolButton`, `warningSticker`.
- Reworked title screen styling around chalkboard, worn paper, reward sticker, and warning sticker materials.
- Reworked Google account panel so login state uses the same paper/chalk outline language as the title.
- Reworked HUD top bar, coin chip, HP bar, XP bar, and pause/game-over modal surfaces around the same school badge/chart visual language.

## Boundaries

- No gameplay logic was changed.
- No Shark Missile code was touched in this UI pass.
- Admin and Graphics Studio were not restyled in this phase, by design. They were screenshot-checked to confirm the new game UI tokens did not leak into tool screens.
- Existing uncommitted explosive scatter and shark missile related files were preserved.

## Notes For Next Pass

- Level-up cards and game-over reward screens should consume the same tokens next.
- Coin shop and ranking should use reward/danger/paper button intents instead of bespoke button colors.
- Admin should adopt only restrained token use: consistent save/danger buttons, clearer numeric fields, and no heavy decorative paper/chalk panels.
