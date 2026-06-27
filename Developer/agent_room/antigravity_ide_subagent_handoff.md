# Antigravity IDE Agent Handoff - Escape! zombie school Subagent/Kanban Usage

Created: 2026-06-27 13:40 KST
Updated: 2026-06-27
Owner: Hana / Agent Room operations
Audience: Antigravity IDE resident agent working inside this repository
Project root: `D:/JungSil/2.Minigame_project/school_survivor-integration`
Durable board: `escape-zombie-school`
Verified smoke test: `t_9629b409` completed by `madangsue` on 2026-06-27

## Read This First

This repository has a standing external subagent system. Do not assume every development request should be handled only inside the Antigravity single-agent context.

When Terry's request is multi-role, milestone-level, review-heavy, QA/release-related, or explicitly mentions subagents/mini agents/Kanban/automatic deployment, route the work through the registered Hermes Kanban subagents on the `escape-zombie-school` board.

This handoff does not replace project policy. It tells Antigravity how to discover and use the existing subagent system safely.

## Authority And Source Order

Read these files before deciding whether to work directly or call subagents:

1. `project_develop_policy.md`
2. `Bang_Rules.md`
3. `AGENTS.md`
4. `SESSION_CONTINUITY.md`
5. `Developer/agent_room/game_development_kanban_process.md`
6. `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
7. This file

If any conflict appears, follow `project_develop_policy.md` first and report the conflict to Terry.

## Verified Smoke Test

A real smoke test was completed before this file was finalized:

- Board: `escape-zombie-school`
- Task: `t_9629b409`
- Title: `smoke: Antigravity IDE subagent auto-call routing test`
- Assignee: `madangsue`
- Result: `done`
- Run: `#36 completed @madangsue`
- Artifact: `Developer/agent_room/antigravity_subagent_smoke_result_2026-06-27.md`

Meaning:

- The project instruction -> Kanban CLI -> Hermes worker route works.
- A worker profile can be spawned and complete a card.
- The worker can write a project artifact and report completion.

Limitation:

- This proves the external Hermes/Kanban route from this repository.
- It does not prove any hidden Antigravity vendor-internal subagent API. Test that separately if needed.

## Triggers

Use the subagent route unless Terry explicitly says not to when the request mentions:

- subagent / sub-agent / agent room
- mini agent / mini-agent
- Hermes / Kanban / board
- automatic agent call / automatic deployment / auto dispatch
- review / QA gate / validation wave
- release readiness / Google Play / internal testing
- milestone / game development process
- Ralph mode / `/goal`
- Korean equivalents such as `서브에이전트`, `미니에이전트`, `자동호출`, `자동투입`, `칸반`, `보드`, `검수`, `QA`, `릴리즈 준비`

Also use subagents when the request spans multiple roles:

- graphics + gameplay + QA
- implementation + review + final validation
- stage/milestone planning plus code changes
- Google Play/internal testing/release readiness
- UI/HUD/menu/interaction changes needing UI implementation or visual QA
- balance, difficulty, weapons, cards, progression
- backend, Firebase, privacy, account deletion, networking
- monetization, product scope, business model
- English store copy, localization, global readiness
- long-running cleanup/refactor needing independent validation

## Real Spawnable Hermes Profiles

Only assign durable Kanban cards to:

- `threemini`: graphics, R3F/Three.js, toon rendering, runtime visuals, VFX.
- `uimini`: UI/HUD/UX, responsive layout, mobile touch targets, menus, overlays, interaction states.
- `levelmini`: gameplay loop, stage flow, leveling, difficulty, weapon/card pool planning.
- `balanceqa`: QA gates, risk register, integration synthesis, browser/mobile validation.
- `bizmini`: business model, monetization, product scope.
- `launchmini`: Google Play, internal testing, policy, AAB/release readiness.
- `backendmini`: Firebase/backend boundaries, privacy, account deletion, future architecture.
- `englishgradmini`: English copy and localization readiness.
- `madangsue`: operations ledger, environment hygiene, smoke-test support.
- `jabdareminder`: reminder and notification hygiene.

Do not assign cards to placeholders such as `planner`, `reviewer`, `researcher`, `game-developer`, `graphic_designer`, `balance_qa`, `qa-reviewer`, or `product-manager`.

## Antigravity Routing Algorithm

1. Read the source-order files if not already loaded.
2. Classify the request.
3. If it is a tiny direct task, do it directly and verify.
4. If it matches the trigger rules, route to Kanban.
5. Run startup checks:

   ```bash
   hermes kanban --board escape-zombie-school stats
   hermes kanban --board escape-zombie-school assignees
   hermes kanban --board escape-zombie-school list
   git status --short --branch
   ```

6. Create independent specialist cards first.
7. Create dependent synthesis/review cards with `--parent` links only where needed.
8. Dispatch and monitor:

   ```bash
   hermes kanban --board escape-zombie-school dispatch
   hermes kanban --board escape-zombie-school stats
   hermes kanban --board escape-zombie-school list
   hermes kanban --board escape-zombie-school show <task_id>
   hermes kanban --board escape-zombie-school runs <task_id>
   ```

9. Report only after real task IDs, statuses, artifacts, and verification results exist.

Completion requires:

```text
todo=0
ready=0
running=0
blocked=0
```

If `blocked>0`, surface the exact blocked decision to Terry.

## No-Code Smoke Test Pattern

If Terry asks to prove subagent operation again:

```bash
hermes kanban --board escape-zombie-school create \
  "smoke: Antigravity IDE subagent route check" \
  --assignee madangsue \
  --body "Project: Escape! zombie school
Workdir: D:/JungSil/2.Minigame_project/school_survivor-integration
Board: escape-zombie-school
SMOKE TEST ONLY - no source code changes, no commits, no push, no store submission.
Goal: verify that IDE instruction -> Kanban -> Hermes worker route still works.
Required output artifact: Developer/agent_room/<dated_smoke_result>.md
Acceptance criteria: confirm task id, assignee, spawned worker/run, files inspected, and blockers."

hermes kanban --board escape-zombie-school dispatch
hermes kanban --board escape-zombie-school show <task_id>
hermes kanban --board escape-zombie-school stats
```

Do not claim success until the card reaches `done` or the blocker is clearly reported.

## Pasteable Antigravity Instruction Block

```text
Escape! zombie school uses a standing Hermes/Kanban subagent workflow.

When Terry gives a command that mentions subagents, mini agents, automatic deployment/call, Kanban, review, QA, release readiness, milestone work, Ralph mode, /goal, or spans multiple roles such as graphics + gameplay + QA, do not handle it silently by yourself.

Read project_develop_policy.md, AGENTS.md, Developer/agent_room/game_development_kanban_process.md, Developer/agent_room/ide_agent_subagent_autocall_handoff.md, and Developer/agent_room/antigravity_ide_subagent_handoff.md, then route the work through the escape-zombie-school Kanban board when the trigger rules match.

Only use real spawnable Hermes profile assignees:
threemini, levelmini, uimini, balanceqa, bizmini, launchmini, backendmini, englishgradmini, madangsue, jabdareminder.

Do not invent assignees like planner, reviewer, researcher, game-developer, or graphic_designer. Map local/project concepts to real profiles.

Use hermes kanban --board escape-zombie-school ... commands to create, dispatch, monitor, and show cards. Preserve uncommitted changes. Do not commit, push, reset, delete, or submit to Google Play unless Terry explicitly asks. Completion requires actual task IDs, artifacts, verification commands/results, and no remaining todo, ready, running, or blocked cards for the wave.
```

## Operator Note

This file is Antigravity-specific. The general IDE handoff remains `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`. The durable execution process remains `Developer/agent_room/game_development_kanban_process.md`.
