# Quest giver and start popup local-worker record

## Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: Stage quest runtime, Graphics Studio Props UI, and HUD popup changes.
- Requested cards: `t_56003a64` (`levelmini`) crashed twice; accepted route `t_4a18fe67` (`uimini`).
- Execution: local Worker fallback after the accepted `uimini` route could not complete in time.

## Implemented scope

- Quest giver identity is derived only from `QUEST_DEFINITIONS[].giver.placementId`, including generated `-copy-` placement IDs.
- Props list and map markers label quest givers as `퀘스트 제공자`, use a different stable color per quest, and provide an explicit restore action for each canonical runtime placement.
- Deleting a giver does not regenerate it; the restore action is the only restoration path.
- The existing `questToast` `started` event now renders a large, centered, non-blocking popup. Item and completion toasts remain compact.

## Root cause and verification

- Firebase Studio prop overrides replace a stage placement list. A removed giver therefore is absent from `StudentDialogueTrigger` targets, so the quest correctly cannot start.
- Added a deterministic mounted-trigger test for the present and absent giver states, Studio presentation/restore tests, and HUD popup tests.
- Focused tests: 37 passed. Production build: passed.
- Browser reached the Firebase-auth-gated entry only; no auth or stage-entry bypass was added.
