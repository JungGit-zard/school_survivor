# levelmini implementation note — all stages 110sec smiling+tanker reinforcement (2026-08-09)

## Kanban
- Task: `t_c146dfdf` correction for rejected `t_7b561a31` work.
- Profile: `levelmini`
- Mandatory precommand receipt: `df5ad9e8dc9ce707a6cd349da32c525ad815ea943aee97e06f1735115c673bfb`
- Resolved domains: `common`, `gameplay`
- Matched domains: none emitted by checker for safe summary `110sec minimal diff correction`.
- Match evidence: none emitted by checker.

## Implemented scope
- Kept the policy record in `Bang_Rules.md` as one new top paragraph only.
- Kept planning/QA handoff at `Planner/all_stages_110sec_smiling_tanker_reinforcement_2026-08-09.md` and corrected its verification claims.
- Updated `Developer/r3f_prototype/src/lib/burstEvents.js` with one shared list:
  - `ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS`
  - spread into `BURST_EVENTS`, `STAGE2_BURST_EVENTS`, `STAGE3_BURST_EVENTS`, and `STAGE4_BURST_EVENTS`.
- Updated `Developer/r3f_prototype/src/lib/burstEvents.test.js` by preserving every HEAD pre-existing test byte/content and adding only one focused describe block for the new 110초 reinforcement coverage.

## Numeric contract
- Time: `110초 = 1분 50초`.
- Per stage added count: `E07` 3 + `E02` 3.
- Stage coverage: Stage 1, Stage 2, Stage 3, Stage 4.
- No distance/range values are introduced by this change. Existing unit policy remains `1블록 = 4 units`.
- Non-scope preserved: every existing wave/burst, stage duration, portal timing, boss timing, Matilda, enemy stats/model/AI, Firebase, Graphics Studio, title, audio.

## Commands/results
- Mandatory precommand gate:
  - Command: `powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile levelmini -Domain auto -TaskSummary "110sec minimal diff correction"`
  - Result: exit `0`; receipt `df5ad9e8dc9ce707a6cd349da32c525ad815ea943aee97e06f1735115c673bfb`; resolved domains `common`, `gameplay`; matched domains `[]`; match evidence `[]`.
- gstack gate:
  - Command: `test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING`
  - Result: `GSTACK_OK`.
- Focused new test filter:
  - Command: `npm test -- src/lib/burstEvents.test.js -t "전 스테이지 1:50 웃는좀비·탱커 보강"`
  - Result: exit `0`; `1` file passed; `5` tests passed, `20` skipped.
- Whole-file baseline attempt:
  - Command: `npm test -- src/lib/burstEvents.test.js`
  - Result: exit `1`; `12` stale pre-existing assertions failed outside the new describe block, `13` passed. These stale tests remain baseline and were not updated by this correction.
- Build:
  - Command: `npm run build`
  - Result: exit `0`; Vite build passed; legacy B02 artifact gate and hosting asset verification passed.

## QA handoff
- Balance_QA_Mini should verify that the added `110초` events are additive only and that existing Stage 2 E07 smiling zombie events at `60초 count 5` and `82초 count 10` remain present.
- Treat any failures from HEAD pre-existing stale `burstEvents.test.js` assertions as baseline unless they occur inside the focused `전 스테이지 1:50 웃는좀비·탱커 보강` describe block.
- Browser/advisor verification should focus on whether runtime scheduling consumes `getRuntimeBurstEventsForStage(stageId)` for all four stages and whether the dev build/test environment starts cleanly enough for visual confirmation.
- No commit or push performed by this worker.
