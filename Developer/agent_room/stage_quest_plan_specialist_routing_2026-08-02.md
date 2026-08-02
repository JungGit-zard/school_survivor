# Stage quest plan specialist routing — 2026-08-02

## Request

Plan two continuous, stage-themed quests for each of the four Escape! zombie school stages and define the pink randoseru quest-inventory button beside pause.

## Routing

- Board: `escape-zombie-school`
- Trigger: multi-role gameplay + UI + balance/QA planning request
- `levelmini`: inspected current stage placements and proposed stage-native quest targets and fallback rules.
- `uimini`: inspected `HUD.jsx` and `PlayerMesh.jsx`, then reviewed the bag-button placement, panel behavior, mobile layout, and accessibility.
- `balanceqa`: inspected the current stage-transition/store behavior and reviewed softlocks, duplicate rewards, restart/refresh behavior, optionality, and reward pressure.

This artifact is the accepted involvement trail required by the project routing policy. No Hermes card was created because the requested output is a single planning document with no implementation or release work.

## Findings incorporated

- Stage 3 and Stage 4 currently have no `unconsciousStudent` placements, so the plan explicitly requires two quest students in each stage.
- Stage 2 can use palette/Firebase placement overrides; objectives use prop types with ordered fallbacks instead of one absolute object id.
- Quest chains are narratively continuous but never hard prerequisites, preventing a missed early quest from blocking later content.
- Quest items are run-scoped, non-droppable, and automatically consumed at their return/install target.
- The bag UI reuses the existing paused state with `pauseSource: 'quest'`; it does not add a new game phase or auto-open during combat.
- The current `PlayerMesh.jsx` bag is teal/blue, not pink. The plan preserves the requested pink randoseru as the quest UI identity and records the visual mismatch.
- Rewards are immediate, small, non-modal, and idempotent. Quests never gate bosses, portals, stage unlocks, or required survival power.

## Verification

- Inspected `Developer/r3f_prototype/src/lib/studentProximity.js`.
- Inspected `Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.js`.
- Inspected `Developer/r3f_prototype/src/components/HUD.jsx`.
- Inspected `Developer/r3f_prototype/src/components/PlayerMesh.jsx`.
- Compared all eight proposed objectives against currently named stage props and documented the new Stage 3/4 student placements.
- Planning-only request: no runtime tests were required or run.

## Blockers

None for planning. Before visual implementation, decide separately whether the in-world 3D bag should also be recolored from teal/blue to pink.
