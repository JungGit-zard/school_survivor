# Stage 1–4 zombie concept package — advisor review

Date: 2026-10-24 update (initial review 2026-10-23)
Review status: **Updated documentation self-check passed. Independent balanceqa review not completed.**

## Scope checked

- `Planner/stage_zombie_concept_plan_20261023.md`
- `Graphic_designer/stage_zombie_visual_method_20261023.md`
- `Graphic_designer/stage_zombie_blockout_20261024/README.md` and four current implementation-reference PNGs
- `Graphic_designer/stage_zombie_concepts_20261023/README.md` and four earlier detailed concept sheets (archived, no longer linked from the current plan)
- Live source references in `stageConfig.js`, `ZombieMesh.jsx`, `Enemy.jsx`, `ZombieInstanceLayer.jsx`, `enemyEntityPool.js`, and `burstEvents.js`

## Self-check findings

- The plan contains four stage sections with three concepts each: **12 total**.
- The stage names match the current `stageConfig.js`: classroom, corridor projectile trial, gym full-scale battle, and cafeteria escape.
- The plan labels behavior mappings as references only; it does not assign new IDs, stats, spawn schedules, attacks, effects, or progression rules.
- Direct source inspection confirmed the ordinary runtime form uses a small set of chamfered box parts: head, torso, arms, legs, hands, feet, and two square eyes. Most ordinary types reuse this form and vary by existing palette, scale, and behavior role. RZC has its existing simple headband and uniform-stripe box parts.
- The plan and visual method were corrected to remove unsupported backpacks, trays, aprons, papers, clothing details, and other new props. Stage 2 and Stage 4 reuse the same E03/E02/E04 forms, matching the current shared runtime types.
- The four current plan image links resolve to the new blockout sheets. Their SHA-256 hashes are:
  - Stage 1: `587a4701c3aa5c2c5e33717394dfc16a03d00f32c316ceb5b25a113bc895d14c`
  - Stage 2 and Stage 4 (same bytes): `c33a4179ed1026f5d4b3a04a532538b9239659f3419ef3a45591070ebe022395`
  - Stage 3: `cad0854a66d6f3c7b2a8150bc10c61cafe1a893ad9eca9298a03754bc9b3a628`
- The earlier detailed sheets remain archived separately and no longer represent the current implementation-reference art.
- The old Stage 4 rooftop proposal is identified as historical; current code and the 2026-10-19 Stage 04 snapshot identify the cafeteria.
- Each plan image link resolves to a file. The archive README records the four current SHA-256 hashes and prompt set:
  - Stage 1: `bfc991fe4f682041147f5ec49d679c7a9beb143dd2ecd9e12628ea94e1e5172b`
  - Stage 2: `34091be9ee3778ca252d32937b511974f6e5640c3413ebe9e8cd5f65beeb9f94`
  - Stage 3: `c18ea80a7fbea9cc7767a4aede29c8d8eeeb7d812a9875238b2c57f77ca0f37d`
  - Stage 4: `632ecb3cefe6f5d4bb34d987096ce8f227607ea9d6ee141957cac8fccc5627e6`

## Routing limitation

Kanban cards `t_242e5ff5` (`levelmini`) and `t_9bd079e2` (`threemini`) were dispatched but each worker crashed twice at startup because the configured `gpt-5.5` model is unsupported by the current Codex account. Their logs show no tool calls, and their output is not treated as worker-reviewed. The `balanceqa` card `t_dfbc70df` depends on those blocked cards and was not dispatched. Exact blocker: `Developer/agent_room/stage_zombie_concepts_20261023/dispatch-blocker.md`.

This record is the Advisor's bounded documentation check, not an independent QA sign-off. The new images intentionally show only simple box-mesh blockouts and are illustrative references, not exact renders or production assets. No runtime tests or builds were run because this task changed planning and graphics documentation only.
