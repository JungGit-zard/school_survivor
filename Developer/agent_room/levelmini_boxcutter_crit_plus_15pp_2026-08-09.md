# levelmini implementation note — boxCutter crit chance +15pp (2026-08-09)

## Kanban
- Task: `t_7ee62328`
- Profile: `levelmini`
- Mandatory precommand receipt: `78e76d16e3ffb1896ffbbc8bd8d26c47e1523e8c45e68240d0bdf7dc3c11f1cc`
- Resolved domains: `common`, `gameplay`
- Matched domains: none (`[]`)
- Match evidence: none (`[]`)

## Implemented scope
- Recorded the numeric policy in `Bang_Rules.md` before changing code.
- Added planning/QA handoff at `Planner/game_contents/weapons/boxcutter/boxcutter_crit_chance_plus_15pp_2026-08-09.md`.
- Updated TDD expectations before source code:
  - `weaponCatalog.test.js`: `boxCutter.base.critChance` expects `0.25`.
  - `weaponPermanentUpgrades.test.js`: base expects `0.25`; permanent max expects `0.33`.
- Updated gameplay data:
  - `weaponCatalog.js`: `boxCutter.base.critChance` `0.10 -> 0.25`.
  - `upgrades.js`: `boxCutterCrit.chanceCap` `0.26 -> 0.41`.

## Numeric contract
- Base crit chance: `0.25`.
- Increase: `+0.15` = `+15 percentage points` from previous `0.10`.
- Permanent crit max: `0.33` = base `0.25` + permanent `0.08`.
- Run upgrade cap: `0.41` = base `0.25` + permanent `0.08` + four run picks `0.08`.
- Non-scope preserved: damage `24`, cooldown `3250 ms`, range `1.4 units (0.35 블록)`, width `0.18 units (0.045 블록)`, knockback `1.8 units/s`, critMultiplier `1.5`, other weapons, Firebase, Graphics Studio, title, visual, audio.

## Commands/results
1. Mandatory precommand gate:
   - Command: `powershell -NoProfile -ExecutionPolicy Bypass -File Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile levelmini -Domain auto -TaskSummary "boxCutter-critical-chance"`
   - Result: exit `0`; receipt `78e76d16e3ffb1896ffbbc8bd8d26c47e1523e8c45e68240d0bdf7dc3c11f1cc`; resolved domains `common`, `gameplay`; matched domains/evidence empty.
2. gstack gate:
   - Command: `test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"`
   - Result: `GSTACK_OK`.
3. TDD red check after expectation-only edits:
   - Command: `npm test -- src/lib/weaponCatalog.test.js src/lib/weaponPermanentUpgrades.test.js`
   - Result: exit `1`; expected failures only on old source values: `0.1` vs `0.25`, and permanent `0.18` vs `0.33`.
4. Focused verification:
   - Command: `npm test -- src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/lib/weaponPermanentUpgrades.test.js src/lib/criticalHits.test.js`
   - Result: exit `0`; 4 files passed; 102 tests passed.
5. Production build:
   - Command: `npm run build`
   - Result: exit `0`; Vite built successfully; legacy B02 artifact gate passed; hosting asset verification passed (`55 assets checked`). Existing Vite warnings: ineffective dynamic imports and chunk size over 500 kB.
6. Exact diff check requested by card:
   - Command: `git diff --check`
   - Result: exit `2`; failed on pre-existing unrelated Hanako/GraphicsStudio/upgrades.test dirty hunks with CRLF/trailing-whitespace diagnostics (`Game.jsx`, `GraphicsStudioPreview.jsx`, `upgrades.test.js`). Current scoped files are not in the failure list after fixing `Bang_Rules.md` line-ending noise.
7. Scoped diff check for files changed by this card:
   - Command: `git diff --check -- Bang_Rules.md Developer/r3f_prototype/src/lib/weaponCatalog.js Developer/r3f_prototype/src/lib/upgrades.js Developer/r3f_prototype/src/lib/weaponCatalog.test.js Developer/r3f_prototype/src/lib/weaponPermanentUpgrades.test.js`
   - Result: exit `0`.
8. Status:
   - Command: `git status --short --branch`
   - Result: branch `zombie_only...origin/zombie_only`; shared dirty worktree still contains many unrelated existing Hanako/Graphics Studio/agent-room changes plus this card's scoped edits/docs.

## Blockers / review notes
- No code/test/build blocker for the scoped boxCutter change.
- Repository-wide `git diff --check` remains blocked by unrelated pre-existing dirty hunks. I did not normalize or rewrite those unrelated files because the card explicitly required preserving existing Hanako/user/agent hunks.
- No commit or push performed.
