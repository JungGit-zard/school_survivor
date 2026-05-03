# QA Full Game Code Review - 2026-05-03

## Scope Reviewed

- Root project policy and continuity documents.
- `Bang_Rules.md`
- `Planner/` gameplay and weapon planning records.
- `Developer/r3f_prototype/src/` game runtime code.
- `Graphic_designer/` visual direction and asset records.
- Current working tree changes shown by `git status --short --branch`.
- `Quaility_Assurance/subagents/qa-reviewer.toml` criteria.

## Verification Performed

- Ran `npm run build` in `Developer/r3f_prototype`.
- Result: build passed.
- Warning: Vite/Rolldown chunk size warning remains. `dist/assets/index-*.js` is larger than 500 kB after minification.

## Findings By Severity

### High - Boss Is Likely Skipped At 5:00

- `Developer/r3f_prototype/src/components/Game.jsx` clears the stage as soon as `elapsedMs >= 5 * 60 * 1000`.
- `Developer/r3f_prototype/src/components/Enemies.jsx` spawns B01 at `sec: 300`.
- Because both events happen at 300 seconds, the game can enter `cleared` before the boss becomes a playable encounter.
- This conflicts with `Bang_Rules.md`, which records a boss phase before clear, and with planner notes that expect a 5-minute boss or mini-boss finish.

Risk:

- Player may never fight the boss.
- Boss code can appear implemented but remain effectively untested in normal play.

Suggested check:

- Move B01 spawn earlier, for example 240 seconds, or change clear condition to require boss death.

### High - Science Flask Range Is Too Short Compared With Project Rules

- `Bang_Rules.md` records science flask range as `18 units (4.5 blocks)`.
- `Developer/r3f_prototype/src/store/useGameStore.js` sets `scienceFlask.range` to `2`.
- `ScienceFlaskSplash` uses `findBestSplashTarget(w.range ?? 18, ...)`, so the configured `2` overrides the intended fallback.

Risk:

- Flask may fail to target dense groups unless they are already nearly on top of the player.
- This directly matches the user concern that without flask there is no good cluster answer, and it also makes flask itself less reliable than documented.

Suggested check:

- Set `scienceFlask.range` to the documented `18`, or update the design document if the short range is intentional.

### Medium - New Implemented Weapons Are Not Fully Registered In Core Rules

- Code includes `guidedMissile`, `starlink`, and `onigiri`.
- `Bang_Rules.md` weapon reference table does not include these weapons.
- The project rule says new weapons should be recorded in the document before implementation.

Risk:

- Balance values can drift because code becomes the only source of truth.
- QA and future planning cannot tell whether these weapons are approved content or experiments.

Suggested check:

- Add the three weapons to `Bang_Rules.md` or move them behind a clearly marked prototype/disabled plan.

### Medium - Start Loadout Does Not Match Planner Constraint

- Main planning records say the stage starts with one weapon, then up to three additional weapons.
- `useGameStore.js` starts `pencilThrow`, `schoolBag`, and `tumbler` as active.

Risk:

- Early difficulty and level-up pacing are easier than documented.
- Balance results from current playtests will not match the planner's intended 1-start-weapon structure.

Suggested check:

- Confirm whether the current three active weapons are intentional tutorial scaffolding.

### Medium - Starlink Uses 5 Units While UI Says 5 Blocks

- HUD text says Starlink strikes within `5 blocks`.
- `StarlinkWeapon` chooses `Math.random() * 5.0`, which is 5 units, equal to 1.25 blocks under the project standard.

Risk:

- Player-facing text and gameplay range disagree.
- The weapon can feel much shorter-ranged than promised.

Suggested check:

- Use `20.0` units for 5 blocks, or change the HUD description to `1.25 blocks`.

### Medium - Graphic Records Do Not Cover All New Visual Weapons

- `Graphic_designer/` has records for bell and flask visuals.
- Search found no matching visual record for `보조배터리`, `고장난 스타링크`, or `오니기리`.
- Project policy requires graphics direction, art direction, visual QA, and asset decisions to be recorded in `Graphic_designer/`.

Risk:

- New weapon visuals may pass code review but conflict with the game's school/toon visual direction.
- Visual QA has no stable reference for readability or style checks.

Suggested check:

- Add a `Graphic_designer/` visual note for the three new weapon concepts and their readability requirements.

### Low - QA Evidence Files Are Deleted In Working Tree

- `Quaility_Assurance/qa_mini_healthbar_no_border_short_2026-05-01.png`
- `Quaility_Assurance/qa_mini_healthbar_red_bg_2026-05-01.png`

Risk:

- Previous visual QA evidence may be lost if these deletions are committed unintentionally.

Suggested check:

- Restore them if the deletion was accidental, or record why they are obsolete.

## Manual Checks Still Needed

- Play from 0:00 to 5:00 and confirm whether B01 appears and whether clear condition waits for the intended boss outcome.
- Unlock science flask and confirm it targets dense groups at the documented range.
- Unlock guided missile, Starlink, and onigiri and check:
  - damage application,
  - target selection,
  - visual readability on the 390 x 844 phone frame,
  - performance when many enemies are active.
- Confirm level-up choices do not overflow the mobile modal after the expanded upgrade pool.
- Check that deleted QA screenshots are intentionally removed.

## Files Created Or Updated

- Created `Quaility_Assurance/qa_full_game_code_review_2026-05-03.md`.

