# Graphics Studio live game apply - 2026-07-05

## Change

Studio edits now update the game immediately:

- graphics sliders and numeric inputs save to `GRAPHICS_STUDIO_STORAGE_KEY` on change
- part focus and part group edits save on change
- reset and Ctrl+Z also save the restored value immediately
- audio volume and pitch save to `SFX_TUNING_STORAGE_KEY` on change

Apply remains as an explicit confirmation button, but the visible game state is no longer delayed until Apply.

## Verification

- `npm test -- src/components/GraphicsStudio.test.jsx src/components/StudioTunedGroup.test.jsx src/lib/sfxRegistry.test.js`
- `npm run build`
- `npm test`

