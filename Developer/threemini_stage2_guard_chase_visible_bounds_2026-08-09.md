# Stage 2 guard chase visible-bounds runtime fix (2026-08-09)

- Kanban: `t_8f459fee`
- Scope: `Developer/r3f_prototype/src/components/Enemies.jsx`
- Requirement: Stage 2 guard-chase formation must spawn the RZT fugitive and all six RZG security guards inside the current visible screen unconditionally.
- Runtime decision: pass current `screenBounds` into `createStage2GuardChaseEntries` at the `STAGE2_GUARD_CHASE_FORMATION` branch.
- Placement decision: when visible bounds are supplied, use those bounds instead of arena/cache bounds, set `outer` to `0`, then shift the whole 1+6 formation anchor so trailing rows fit inside `visibleBounds` with `0.8` unit inset. This preserves count, timing, stats, and formation direction while avoiding individual clamp collapse.
- Not changed: Studio/model files, title, Firebase/readiness gates, Stage 3 crew count work, sound, UI, tests/build/browser.
- Verification: code diff and direct file inspection only; user explicitly skipped tests/build/browser.
