# Subagent Lounge Routing Schedule — Stage Visual Quality — 2026-08-26

## Terry Instruction Interpreted
Hana should act as advisor/team lead, not as a single all-purpose worker. Large visual/code tasks must be routed through the sub-agent lounge / Kanban board first, using existing real Hermes profiles. Repetitive lookup, visual audit, implementation, and final QA should be separated. Project-facing artifacts must live inside the project under `Developer/agent_room`, while lounge-facing coordination artifacts may be mirrored under the global `sub-agent-room`.

## Board / Workspace
- Kanban board: `escape-zombie-school`
- Project workspace: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype`
- Project agent room: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/Developer/agent_room`
- Global lounge sync: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/escape-zombie-school-deployment`

## Real Spawnable Profiles Found
- `threemini`: Three.js/R3F cartoon graphics, mobile WebGL, lighting/materials.
- `levelmini`: stage progression/concept/pacing, stage identity.
- `uimini`: UI/mobile readability and screen-level inspection.
- `balanceqa`: final QA, gameplay friction, acceptance review.
- `backendmini`: available if auth/data/backend issues appear; not primary for this visual batch.

## Role Mapping for This Work
- Advisor / Team lead: Hana in Telegram, summarizes, gates, reports to Terry.
- Concept lane: `levelmini` — stage concept and lighting concept extraction.
- Graphics implementation lane: `threemini` — Stage 3 hoop/ball replacement, EXP textbook visual effect, lighting implementation.
- Mobile visual audit lane: `uimini` — mobile viewport readability, edge clipping, screenshot checklist.
- Final acceptance lane: `balanceqa` — verify evidence, tests, screenshots, and gameplay friction.

## Task Graph
1. `levelmini` — produce stage visual/lighting concept map from existing assets and Terry direction. Independent.
2. `uimini` — produce mobile readability audit checklist for Stage 3/EXP/lighting. Independent.
3. `threemini` — implement Stage 3 basketball hoop/ball replacement. Depends on concept direction already drafted by Hana; can start now but must respect the visual direction docs.
4. `threemini` — audit/restore EXP textbook smooth attraction. Can run parallel logically but same profile queue may serialize.
5. `threemini` — lighting implementation after concept map is available. Depends on task 1.
6. `balanceqa` — final visual/gameplay acceptance review. Depends on implementation/audit tasks.

## Existing Project Docs Workers Must Read
- `Developer/agent_room/stage_visual_quality_work_schedule_2026-08-26.md`
- `Developer/agent_room/stage_visual_direction_mobile_blocky_cute_2026-08-26.md`
- `Developer/agent_room/stage3_basketball_hoop_ball_concept_2026-08-26.md`

## Guardrails
- Do not make visuals dark/horror.
- Do not blindly simplify into generic boxes.
- Mobile gameplay readability is the primary acceptance target.
- Use existing project architecture and tests.
- Run focused tests/build and produce screenshot evidence when implementing.
- Avoid concurrent edits to the same files unless the worker is explicitly assigned that lane.

## Sync Rule
This file is mirrored in both:
- Project: `Developer/agent_room/subagent_lounge_routing_schedule_2026-08-26.md`
- Lounge: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/escape-zombie-school-deployment/subagent_lounge_routing_schedule_2026-08-26.md`

Hana updates the project copy first, then mirrors to the lounge copy if routing changes.


## Kanban Cards Created / Started
- `t_93dea1c7` (`levelmini`, running): concept stage visual and lighting map.
- `t_caf9ecce` (`uimini`, running): mobile viewport readability checklist.
- `t_2355f0f6` (`threemini`, running): Stage 3 south basketball hoop/ball replacement.
- `t_31b15f0d` (`threemini`, running): EXP textbook smooth attraction audit/fix.
- `t_94152aa8` (`threemini`, todo, parent `t_93dea1c7`): stage-specific lighting/lightMap refinements.
- `t_d7f5169d` (`balanceqa`, todo, parents implementation/audit tasks): final acceptance QA.

## Orchestration Capability Note
Hermes Kanban `swarm` is available on this machine. It supports parallel `--worker PROFILE:TITLE[:SKILL]` lanes, one `--verifier`, and one `--synthesizer`. For future large batches, Hana can create a swarm graph directly instead of manual cards.
