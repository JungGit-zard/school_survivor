# threemini critical hit visual feedback record — 2026-08-09

## Scope
- Task: critical-hit damage number visual feedback only.
- Preserved unrelated dirty files and did not touch title, Firebase auth, audio, weapon balance, crit chance/multiplier, damage models, or assets.

## Mandatory pre-command gate
- Profile: threemini
- TaskSummary: critical-hit-visual
- matched_domains: graphics
- match_evidence: graphics / visual
- combined_receipt_sha256: 025b5257856d64e97485d369787f88022d92aa0abe2a3c2a7d2d0c79c52d68a3
- Required documents were read before code work, including the latest single SESSION_MEMORY.md entry only.

## Visual implementation result
- Critical damage-number events now keep the existing pooled billboard path and get a visible scale multiplier through `slot.criticalScale`.
- Ordinary damage numbers keep the original scale path because slots default/reset to `criticalScale: 1`.
- Reduced-effects mode still suppresses normal numbers, but `event.isCritical === true` continues through the damage-number renderer so critical color/size feedback remains visible.
- Critical color fallback uses the existing `DAMAGE_NUMBER_COLORS.critical` when a critical event does not provide an explicit color.

## Exact files changed for this task
- `Developer/r3f_prototype/src/lib/damageNumbers.js`
- `Developer/r3f_prototype/src/components/DamageNumbersLayer.jsx`
- `Developer/r3f_prototype/src/lib/damageNumbers.test.js` was restored to its pre-task HEAD contents and left unchanged in the final scoped diff.

## Verification / command boundary
- Per user override, no further tests, builds, browser checks, QA runs, or `git diff --check` were executed in this run.
- The scoped diff was read after the change; it shows only the two code files above and no remaining diff for `damageNumbers.test.js`.

## 2026-08-09 right-down-return update
- Kanban task: `t_0bdce653`.
- User canonical critical-hit screen motion: exact origin → right → down → origin sequence, scale fixed at `1` at every keyframe.
- Normal amplitude: right `6px`, down `3px`. Strong amplitude: right `9px`, down `5px`.
- No sound, damage, critical chance, title, Firebase, build, test, browser, commit, or push work belongs to this visual update.
