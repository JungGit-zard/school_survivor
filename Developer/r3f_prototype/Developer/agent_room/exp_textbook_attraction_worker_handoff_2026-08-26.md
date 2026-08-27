# EXP textbook smooth attraction audit/fix handoff — 2026-08-26

## Scope
- Kanban task: `t_31b15f0d`
- Worker/profile: `threemini`
- Workspace: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype`
- Files inspected first per task: `src/components/XpTextbook.jsx`, `src/lib/pickup.js`

## Verdict
The EXP textbook smooth suck-in effect existed structurally in `XpTextbook.jsx` through `stepMagnetPull(pRef, delta)`, but it was effectively disabled/visually bypassed by `src/lib/pickup.js`.

Root cause:
- `COLLECT_RADIUS_SQ` had been expanded to `1.2 * 1.2` for gameplay recovery.
- `BASE_PULL_RADIUS` remained `0.75`.
- `stepMagnetPull()` returned `collected` before checking magnet pull, so any item within 1.2 units disappeared immediately.
- Magnet pull at multiplier 1.0/1.16 was still inside the 1.2 collect radius, so the returned state was `collected` or `idle`, not `pulled`.

## Change made
Updated `src/lib/pickup.js` so the 1.2 unit radius is the pickup attraction/start radius, not the final disappearance radius:
- `BASE_PULL_RADIUS` is now `1.2`, so passive magnet scaling expands from the actual pickup start radius.
- Added `FINAL_COLLECT_RADIUS = 0.22` so collection only completes once the pickup has reached the player closely.
- `stepMagnetPull()` now uses `Math.max(COLLECT_RADIUS_SQ, _pullRadiusSq)` as the attraction radius.
- When inside attraction range but outside final collect range, it returns `pulled` and moves the pickup smoothly toward `playerPos`.
- Movement step is clamped to avoid overshooting the player center.

Updated `src/lib/pickup.test.js` with focused deterministic tests:
- Level 0 item at 1.0 units returns `pulled`, moves toward player, and does not disappear immediately.
- Close item at 0.18 units returns `collected`.
- Magnet multiplier 1.16 pulls an item at 1.3 units, proving upgrade expansion works beyond the base 1.2 radius.
- Existing multiplier tests updated from historical 0.75 base to current 1.2 base.

## Visual/effect interpretation
`XpTextbook.jsx` already applies the visual flourish after landing:
- toss arc and spin before landing
- `stepMagnetPull()` position update after landing
- bobbing and Y rotation every frame while the item is alive

After this fix, the textbook no longer snaps away at the outer 1.2 radius. It remains visible and travels through the existing bob/spin presentation until the final close collection radius.

## Verification commands and results
1. RED check before implementation:
   - Command: `npm.cmd exec -- vitest run src/lib/pickup.test.js`
   - Result: failed as expected, 5 failed / 7 total.
   - Evidence: base radius expected 1.2 but actual 0.75; level-0 1.0-unit pickup returned `collected`; 1.3-unit magnet pickup returned `idle`.

2. Focused GREEN check:
   - Command: `npm.cmd exec -- vitest run src/lib/pickup.test.js`
   - Result: passed, 7 tests / 7 passed.

3. Focused project test script check with pretest gates:
   - Command: `npm.cmd run test -- src/lib/pickup.test.js`
   - Result: branch guard, legacy B02 source gate, dialogue store gate, Studio-game sync source contract all passed; pickup test passed, 7 tests / 7 passed.

4. Regression probe check:
   - Command: `npm.cmd exec -- vitest run src/lib/stageBalanceProbe.test.js src/components/GoldCoin.test.jsx src/components/XpTextbook.test.jsx`
   - Result: Vitest ran available matching suite `src/lib/stageBalanceProbe.test.js`; passed, 5 tests / 5 passed.
   - Note: no matching `GoldCoin.test.jsx` or `XpTextbook.test.jsx` files were present in this workspace, so Vitest only executed the existing stage balance probe file.

## Files changed by this worker
- `src/lib/pickup.js`
- `src/lib/pickup.test.js`
- `Developer/agent_room/exp_textbook_attraction_worker_handoff_2026-08-26.md`

## Files explicitly not touched
- `src/components/XpTextbook.jsx` — inspected only; existing outer-motion/bob/spin path was sufficient after fixing shared pickup logic.
- `src/components/GraphicsStudio.jsx` — not read or modified.
- Existing Stage 3 basketball files already dirty in the worktree were not edited for this task.

## Remaining review notes
- This is a code-changing worker handoff and should receive reviewer approval before being treated as merged/done.
- Runtime screenshot/video was not produced in this run; deterministic code-level tests prove the previously unreachable `pulled` state now occurs before collection.
