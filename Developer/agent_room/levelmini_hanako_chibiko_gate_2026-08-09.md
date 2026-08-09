# levelmini implementation note — Hanako Chibiko gate (2026-08-09)

## Kanban
- Task: `t_e376f44f`
- Profile: `levelmini`
- Mandatory precommand receipt: `6384fb4eb9574aad736cb1456d0c8e62de12ba8e68151312e611a9f88179f5f4`
- Matched domains: `gameplay`
- Match evidence: keyword `weapon`

## Implemented scope
- Added `hanako` to `WEAPON_CATALOG` as gameplay data only.
- Added `acquireHanako` to `UPGRADE_EFFECTS`.
- Added generic acquire prerequisite support via `requiresActiveWeapon`.
- Added account-unlock bypass support via `skipAccountUnlock` for this dependent runtime-only acquire card.
- Added focused tests for:
  - unavailable before Chibiko,
  - available after Chibiko,
  - unavailable once Hanako is already acquired,
  - no independent `minLevel` on `acquireHanako`.

## Data contract
- `hanako.label`: `하나코`
- `healIntervalMs`: `20000 ms` (`20초`)
- `healPercent`: `0.05` (`최대 HP의 5%`)
- `followDistance`: `1.44 units` (`0.36 블록`, 1블록=4 units)
- Initial active state: inactive (`startsActive` 없음)
- Account unlock: not required for `acquireHanako`
- Independent min level: none on `acquireHanako`
- Dependency: `weapons.chibiko.active === true`
- Capacity: existing `MAX_OWNED_WEAPONS = 8` check remains after dependency/account checks.

## Explicit non-scope preserved
- No visual, Studio, HUD, locale, Game runtime, title, sound, Firebase write, server, or port 5173 changes.
- No commit or push.

## QA handoff
- Run focused tests from `Developer/r3f_prototype`:
  - `npm test -- src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/lib/weaponPermanentUpgrades.test.js`
- Check diff remains limited to gameplay data/tests and these two notes.

## 2026-08-09 conflict reapply note
- After the Three_Mini conflict erased gameplay source, reapplied the reviewed Hanako catalog/acquire gate.
- `hanako.unlockConditions` uses the existing `STARTER` constant exactly, while `acquireHanako` also has `skipAccountUnlock: true` and `requiresActiveWeapon: 'chibiko'`.
- `hanako` and `acquireHanako` keep no independent `minLevelToAppear` / `minLevel` gate.
- Focused verification target remains the 3 lib test files above.
