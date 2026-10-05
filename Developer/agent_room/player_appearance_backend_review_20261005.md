# Player appearance Firebase boundary review — 2026-10-05

- Board: `escape-zombie-school`, backendmini card `t_c79db86d`.
- Routing limitation: registered Hermes backendmini execution was blocked by its obsolete hard-coded D: repository path. Advisor explicitly assigned this focused Codex review against the current F: checkout; this is secondary fallback evidence, not a claim of successful Hermes execution.
- Mandatory checker: `-Profile backendmini -Domain auto -TaskSummary "player appearance toggle review"`; common/qa/backend documents resolved, receipt `6052ca78b86e883fc27e50894837998487bbae43a3d3fb53fef1001277dd5c7b`.
- Scope: read-only production-code review of LobbySettingsModal, Player, titleSettings, firebaseProgress, database.rules. Only this review record was written. No tests, Firebase access, authentication changes, deployment, commit or push were performed by this reviewer.

## Findings delivered to implementation worker and Advisor

1. Keep `playerAppearance` optional: loading/opening settings and unrelated saves must preserve its absence. Current normalizers do so; V9 is only the display choice when absent. This avoids sending an unrecognized key under the old deployed rules.
2. Failed explicit selection must restore the prior enum value or prior absence. `undefined` is removed by current normalization; the partial settings write merges current unrelated settings instead of replacing them with a captured snapshot.
3. Initial implementation mutated runtime before the try block. Worker moved the mutation into try after review, so a thrown mutation can enter failure handling.
4. Pending cloud-save appearance existed in runtime while modal close/backdrop/logout remained enabled. This can expose an unconfirmed gameplay choice before eventual failure. Worker was asked to prevent exiting the pending selection or otherwise prevent this leak.
5. On account switch during await, initial catch skipped runtime rollback but still restored old React settings. That triggered the settings effect and could overwrite the new account's unrelated preferences. Worker was asked to guard all stale-account UI writes, not only the runtime rollback.
6. Both model branches are available in production; F8 remains development-only and does not save its override. This diff does not edit Studio model/transform data or title presentation.

## Deployment boundary

`database.rules.json` adds validation for `v9` and `legacy`. The existing deployed `$other: false` rule rejects explicit selection until the revised rules are deployed. No live rules inspection or deployment was done. Rules deployment requires the separate authorization boundary specified by the Advisor; source-code review alone does not establish live feature availability.

## Status

Final code reread confirmed findings 4 and 5 repaired: close/backdrop/logout/delete are disabled while the save is pending, and the catch returns immediately on a changed UID before restoring any React settings. The mutation remains within try. Advisor subsequently ran nine files / 98 focused tests successfully and verified desktop/mobile UI with an isolated fake Firebase client, including failed-save restoration. Evidence is recorded in `Quaility_Assurance/player_appearance_settings_20261005.md`; this reviewer did not rerun those tests. No remaining blocker was found in the reviewed scoped diff. Live rules deployment and live feature operation remain unverified.
