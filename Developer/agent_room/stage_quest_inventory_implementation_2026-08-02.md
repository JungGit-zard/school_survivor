# Stage quest and inventory implementation trail — 2026-08-02

## Routing

- Board: `escape-zombie-school`
- Trigger: gameplay state, in-world interaction, HUD inventory, and balance/QA implementation
- `levelmini`: implemented and reviewed the eight quest definitions, run-scoped state transitions, idempotent collection/completion, and stage-transition behavior.
- `uimini`: implemented and reviewed the pink randoseru HUD button, inventory panel, badge, toast, mobile layout, keyboard handling, and focus restoration.
- `balanceqa`: implemented and reviewed quest students, world item placement, collision-safe pickup positions, authored-placement fallbacks, and completion targets.

## Delivered behavior

- Two independent quests are available in each of Stages 1–4.
- Quest state follows `undiscovered -> active -> item-acquired -> completed`.
- Items appear only after accepting their quest, enter a run-scoped quest inventory, and are automatically consumed at the return or installation target.
- A 44×44 pink randoseru button sits immediately beside pause and opens the inventory through the existing `paused` state with `pauseSource: 'quest'`.
- Each completion awards 2 gold exactly once. Quests do not gate stage clear, portals, bosses, or later-stage quests.
- Stage 3 and Stage 4 include two quest-giver students each.

## Review corrections

- Stage 2 copied giver placement IDs are accepted for quest completion.
- Failed world interactions are retryable; they are marked handled only after the store accepts the action.
- Return completion is handled by the world layer so another nearby investigation target cannot block it.
- Fallback collection IDs are accepted only when every authored target and type fallback is absent.
- Inventory counts exclude completed quests, item/status labels match the current state, and focus returns to the bag button when the dialog closes.

## Verification

- Focused quest/HUD/world/store regression run: 9 files, 118 tests passed.
- Final quest-focused run after copy review: 4 files, 23 tests passed.
- Production build passed, including repository prebuild and postbuild gates; only the existing chunk-size warning remains.
- Full suite reached 1603/1604 tests. The single timing-sensitive runtime diagnostics failure passed immediately in isolation (3/3).
- Browser verification covered the empty inventory, keyboard focus, accepting a quest, collecting an item, held-item display, one-time completion reward, and an in-world quest-item marker.

## Blockers

None.
