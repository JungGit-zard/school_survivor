# Result Coin Shop Flow Requirements - 2026-05-17

## Source

- Compound Engineering workflow applied from the user request.
- Product decision: open the passive coin shop only after a run result.
- Related review: `CEO/product_manager_review_passive_upgrade_catalog_2026-05-17.md`

## Problem

The passive shop currently supports the MVP upgrade loop, but opening it from the title screen weakens the intended beginner rhythm.

The MVP loop should be:

```text
Play one run -> see earned coins -> enter shop -> buy upgrade -> return to result -> choose next action
```

## Requirements

- The title screen must not show a coin shop entry point in MVP.
- The result screen must show a coin shop entry point after both game over and stage clear.
- The player must see earned coins and total coins before choosing to enter the shop.
- Leaving the shop must return to the same result state, not the title screen.
- Existing restart behavior must remain available from the result screen.
- Shop purchases must still subtract from total coins immediately.

## Scope

### MVP

- Result-screen-only shop access.
- Game over result supports shop access.
- Stage clear result supports shop access.
- Shop back action returns to the result screen.

### Not In This Pass

- Opening shop from title screen.
- Opening shop during a live run.
- Direct next-run start from the shop.
- New shop unlock animations or deeper visual polish.

## Acceptance Criteria

- From the title screen, the only primary action is starting the game.
- After game over, the result screen includes a coin shop button.
- After stage clear, the result screen includes a coin shop button.
- Pressing the coin shop button opens the passive shop without resetting run result state.
- Pressing shop back returns to the same game over or stage clear result modal.
- Automated tests and production build pass.

