# Stage 3 running crew six-followers sync (2026-08-09)

## Scope
- Kanban: `t_962babd5`
- Target stage: Stage 3
- Target formation: `RUN_ZOMBIE_CREW_FORMATION` / `runZombieCrew`
- User canonical value: exactly 7 total running zombies per crew burst = leader `RZL` 1 + crew `RZC` 6.

## Acceptance criteria
1. Runtime crew size constant is `RUN_ZOMBIE_CREW_SIZE = 7`.
2. Stage 3 `RZL` burst events using `RUN_ZOMBIE_CREW_FORMATION` have `count: 7` at all existing timings: 35s, 80s, 120s, 150s.
3. Stage 3 crew comment text no longer says 13 total or leader 1 + crew 12; first comment says leader 1 + running crew 6.
4. Timing is unchanged: 35s, 80s, 120s, 150s.
5. Formation geometry is unchanged: diagonal crew direction and row/column trail logic stay as-is.
6. Other waves, enemy stats, Stage 2 guard chase, sound, UI, Firebase, Graphics Studio, tests, build, and browser behavior are not changed.

## Units / blocks note
- This task changes only enemy counts, not distance/range values.
- No units-to-blocks conversion is applicable. Existing formation geometry distances remain unchanged in code.

## QA handoff for Balance_QA_Mini
- In Stage 3 runtime, observe each run-zombie crew event around 35s, 80s, 120s, and 150s.
- Expected visible count per event: 7 total = 1 leader `RZL` + 6 trailing `RZC` crew.
- Confirm no legacy 13-total / 1+12 crew appears.
- Confirm diagonal sweep timing/trajectory feels unchanged except for reduced follower count.
- User ordered tests/build/browser skipped for this card, so QA should treat this as code-inspection handoff until a later playable verification card is created.
