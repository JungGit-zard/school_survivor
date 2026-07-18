# Result Coin Shop Flow Implementation Plan - 2026-05-17

## Source

- Requirements: `Planner/Essential_game_plan/result_coin_shop_flow_requirements_2026-05-17.md`

## Implementation Shape

Keep the current lightweight screen state in `Developer/r3f_prototype/src/App.jsx`.

The shop should remain a separate top-level screen, but its return target should be the game screen. Because the store keeps `phase` as `gameover` or `cleared`, returning to the game screen naturally shows the same result modal again.

## Files

- `Developer/r3f_prototype/src/App.jsx`
  - Remove title-screen shop entry wiring.
  - Pass result-screen shop open callback to HUD.
  - Make coin shop back action return to the game/result screen.

- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
  - Remove `onCoinShop` prop and the coin shop button.

- `Developer/r3f_prototype/src/components/HUD.jsx`
  - Add `onOpenCoinShop` prop.
  - Add result modal coin shop button for `gameover` and `cleared`.

- `Developer/r3f_prototype/src/components/CoinShop.jsx`
  - Make the back button label describe returning to the result screen.

## Tests

- Run `npm test -- --run` in `Developer/r3f_prototype`.
- Run `npm run build` in `Developer/r3f_prototype`.

## Risk Notes

- Returning from the shop remounts the canvas, but the Zustand store preserves result phase and run totals.
- This does not reset the game. Reset still happens only through the result modal restart button.

