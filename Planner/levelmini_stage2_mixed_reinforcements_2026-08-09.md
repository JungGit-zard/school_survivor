# Stage 2 timed mixed reinforcements (2026-08-09)

## Scope
- Kanban: `t_08dd9284`
- Target stage: Stage 2
- User rule: starting at `120s`, add `15` ordinary zombies every `30s` before the `240s` stage end.
- Applied event seconds: `120s`, `150s`, `180s`, `210s`.
- This is additional burst spawn. Existing wave, burst, boss, and Stage 2 guard-chase events are preserved.

## Runtime rule
- Reinforcement count per event: exactly `15` ordinary zombies.
- Allowed enemy IDs are only Stage 2 ordinary pool IDs `E01`–`E06` from the active phase.
- Excluded IDs: bosses `B01`–`B04`, `RZT`, `RZG`, and any non-ordinary event monster.
- Active phase pools:
  - `120s`: `E01`, `E02`, `E03`, `E04`, `E05`
  - `150s`: `E02`, `E03`, `E04`, `E05`
  - `180s`: `E02`, `E04`, `E06`
  - `210s`: `E02`, `E04`, `E05`
- Composition is mixed per event: runtime picks from the active pool and guarantees more than one ordinary type when the pool contains more than one type.
- E04 keeps the ranged spawn placement path when selected.
  - Ordinary burst spawn ring currently uses `4.0–6.5 units` (`1.0–1.625 blocks`).
  - E04 ranged burst spawn ring currently uses `5.5–7.5 units` (`1.375–1.875 blocks`).

## Acceptance criteria
1. Stage 2 runtime burst table includes additional reinforcement events exactly at `120s`, `150s`, `180s`, and `210s`.
2. Each reinforcement event has `count: 15` and runtime selection returns `15` spawn types.
3. Each reinforcement pool contains only ordinary `E01`–`E06`; it does not contain bosses, `RZT`, or `RZG`.
4. Runtime batch spawning uses the selected mixed type per spawned enemy, not a single fixed event type.
5. If the selected type is `E04`, runtime uses the ranged placement helper, not the ordinary spawn helper.
6. Existing wave, burst, boss, and guard-chase events remain in the Stage 2 table.

## QA handoff for Balance_QA_Mini / Advisor
- Review files:
  - `Developer/r3f_prototype/src/lib/burstEvents.js`
  - `Developer/r3f_prototype/src/components/Enemies.jsx`
  - `Developer/r3f_prototype/src/components/Enemies.test.jsx`
  - `Planner/levelmini_stage2_mixed_reinforcements_2026-08-09.md`
- Focused test:
  - `npm test -- src/components/Enemies.test.jsx -t 'stage 2 mixed timed reinforcements'`
- Observed result in this run: `1 passed`, `87 skipped`.
- Do not commit or push from this worker; Advisor verifies and pushes.
