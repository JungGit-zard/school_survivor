# Graphics Studio Runtime Visual Parity - 2026-07-05

## Visual Direction

Graphics Studio is now treated as the same visual source as the game screen. When a catalog item is opened in the studio, its base model, scale path, rotation path, color path, and outline path should match the runtime component used in gameplay.

## Applied Asset Groups

- Floors use the real stage floor component.
- Stage props keep their own tuning instead of being unintentionally scaled by floor tuning.
- VFX, projectiles, health bars, death styles, and the title scene now have direct runtime tuning wrappers.
- The image-only extra battery upgrade icon now reads studio tuning in the HUD path, so it is no longer only a studio preview exception.

## Artist Expectation

Apply in the studio should be interpreted as an immediate in-game visual tuning for the selected real asset group, not a preview-only mockup.
