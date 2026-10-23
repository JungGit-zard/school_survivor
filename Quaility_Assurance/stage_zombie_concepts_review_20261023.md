# Stage 1–4 zombie concept package — advisor review

Date: 2026-10-23
Review status: **Documentation self-check passed. Independent balanceqa review not completed.**

## Scope checked

- `Planner/stage_zombie_concept_plan_20261023.md`
- `Graphic_designer/stage_zombie_visual_method_20261023.md`
- `Graphic_designer/stage_zombie_concepts_20261023/README.md` and four PNGs
- Live source references in `stageConfig.js`, `ZombieMesh.jsx`, `Enemy.jsx`, `ZombieInstanceLayer.jsx`, `enemyEntityPool.js`, and `burstEvents.js`

## Self-check findings

- The plan contains four stage sections with three concepts each: **12 total**.
- The stage names match the current `stageConfig.js`: classroom, corridor projectile trial, gym full-scale battle, and cafeteria escape.
- The plan labels behavior mappings as references only; it does not assign new IDs, stats, spawn schedules, attacks, effects, or progression rules.
- The visual method record describes the existing chamfered-block, toon-material, shared-outline, shoulder/hip-pivot, and pooled-instancing approach and warns that shared E IDs can change visuals in multiple stages.
- The old Stage 4 rooftop proposal is identified as historical; current code and the 2026-10-19 Stage 04 snapshot identify the cafeteria.
- Each plan image link resolves to a file. The archive README records the four current SHA-256 hashes and prompt set:
  - Stage 1: `bfc991fe4f682041147f5ec49d679c7a9beb143dd2ecd9e12628ea94e1e5172b`
  - Stage 2: `34091be9ee3778ca252d32937b511974f6e5640c3413ebe9e8cd5f65beeb9f94`
  - Stage 3: `c18ea80a7fbea9cc7767a4aede29c8d8eeeb7d812a9875238b2c57f77ca0f37d`
  - Stage 4: `632ecb3cefe6f5d4bb34d987096ce8f227607ea9d6ee141957cac8fccc5627e6`

## Routing limitation

Kanban cards `t_242e5ff5` (`levelmini`) and `t_9bd079e2` (`threemini`) were dispatched but each worker crashed twice at startup because the configured `gpt-5.5` model is unsupported by the current Codex account. Their logs show no tool calls, and their output is not treated as worker-reviewed. The `balanceqa` card `t_dfbc70df` depends on those blocked cards and was not dispatched. Exact blocker: `Developer/agent_room/stage_zombie_concepts_20261023/dispatch-blocker.md`.

This record is the Advisor's bounded documentation check, not an independent QA sign-off. The images are concept references with richer detail than the current game mesh; they still need an approved simplification/modeling pass before production use. No runtime tests or builds were run because this task changed planning and graphics documentation only.
