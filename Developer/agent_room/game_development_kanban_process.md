# Escape! zombie school Kanban Subagent Game Development Process

Created: 2026-06-25
Updated: 2026-07-03
Owner: Hana / Agent Room operations
Board: `escape-zombie-school`
Workdir: `D:/JungSil/2.Minigame_project/school_survivor-integration`

## Purpose

Escape! zombie school uses a durable Hermes/Kanban subagent workflow for milestone-level game development. Use this process when a request spans multiple roles, needs independent review, touches release readiness, or asks for subagents/mini agents/automatic agent deployment.

Small one-step edits can be handled directly by the IDE agent. Multi-role work should be split into Kanban cards and dispatched to real Hermes profiles.

## Mandatory Startup Checks

Before creating or dispatching cards:

1. Read `project_develop_policy.md`, `Bang_Rules.md`, `AGENTS.md`, `SESSION_CONTINUITY.md`, `Developer/agent_room/subagent_system_wiring_2026-07-03.md`, and the role-relevant docs.
2. Verify the board exists:

   ```bash
   hermes kanban --board escape-zombie-school stats
   ```

3. Verify the real assignee list:

   ```bash
   hermes kanban --board escape-zombie-school assignees
   ```

4. Verify worker profile gstack readiness:

   ```bash
   for p in threemini levelmini uimini balanceqa bizmini launchmini backendmini englishgradmini madangsue jabdareminder soundmini; do
     h="/c/Users/admin/AppData/Local/hermes/profiles/$p/home"
     test -d "$h/.claude/skills/gstack/bin" && echo "$p GSTACK_OK" || echo "$p GSTACK_MISSING"
   done
   ```

5. If a profile returns `GSTACK_MISSING`, fix the profile before dispatching work.
6. Run `git status --short --branch` and preserve all existing user/agent changes.

## Real Spawnable Profiles

Use only these Hermes profile names for durable Kanban cards:

- `threemini`: Three.js/R3F graphics, toon rendering, runtime visuals, VFX, graphics regression guards.
- `uimini`: UI/HUD/UX, responsive layout, mobile touch targets, menus, overlays, interaction states, accessibility, small safe UI fixes. Also serves as the Mobile Optimization Resident; read `Developer/agent_room/uimini_mobile_optimization_resident_2026-07-03.md` for mobile QA/optimization tasks.
- `levelmini`: gameplay loop, stage flow, leveling, difficulty, weapon/card pool planning.
- `balanceqa`: QA gates, risk register, integration synthesis, browser/mobile validation, final acceptance.
- `bizmini`: business model, product scope, monetization, strategic tradeoffs.
- `launchmini`: Google Play, internal testing, policy, AAB/release readiness.
- `backendmini`: Firebase/backend boundaries, privacy, account deletion, future architecture.
- `englishgradmini`: English copy, store text, localization readiness, no invented unimplemented features.
- `madangsue`: operations ledger, environment hygiene, smoke-test support, agent-room records.
- `jabdareminder`: reminder hygiene, schedule cleanliness, notification-related agent-room hygiene.
- `soundmini`: free/low-size game SFX, BGM loop direction, 8-bit/chiptune audio, WebAudio/ZzFX/jsfxr pipeline, voice bark/pseudo-voice design, and audio licensing checks.

Do not assign durable cards to placeholder names such as `planner`, `reviewer`, `researcher`, `game-developer`, `graphic_designer`, `balance_qa`, `qa-reviewer`, or `product-manager`. Map those concepts to the closest real profile.

## Default Fan-Out / Fan-In Graph

For a milestone-level request, create independent cards first, then synthesis and validation cards:

```text
T1  graphics/visual audit or implementation guidance -> threemini
T1b UI/HUD/interaction audit or implementation guidance -> uimini
T1c sound/SFX/BGM/voice/audio licensing audit or implementation guidance -> soundmini
T2  gameplay/level/content plan -> levelmini
T3  QA/risk/acceptance gate -> balanceqa
T4  release/store gate, if relevant -> launchmini
T5  backend/privacy gate, if relevant -> backendmini
T6  product/scope/BM gate, if relevant -> bizmini
T7  English/localization pass, if relevant -> englishgradmini
T8  operations/ledger/smoke support, if relevant -> madangsue or jabdareminder

T9  integration synthesis -> balanceqa, parents=[relevant T1-T8]
T10 implementation follow-up(s) -> closest matching profile, parents=[T9]
T11 final validation -> balanceqa, parents=[implementation cards]
```

Only add parent links when the child truly needs the parent's output.

## Required Card Body

Use this body shape for new cards:

```text
Project: Escape! zombie school
Workdir: D:/JungSil/2.Minigame_project/school_survivor-integration
Board: escape-zombie-school

Required startup reads before action:
- project_develop_policy.md
- Bang_Rules.md
- AGENTS.md
- SESSION_CONTINUITY.md
- Developer/agent_room/game_development_kanban_process.md
- Developer/agent_room/ide_agent_subagent_autocall_handoff.md
- Developer/agent_room/subagent_system_wiring_2026-07-03.md
- Developer/agent_room/antigravity_ide_subagent_handoff.md
- latest relevant role/project docs

Important guard:
- Current git tree may contain uncommitted Terry/agent changes.
- Do not overwrite, delete, reset, commit, push, or submit to Google Play unless Terry explicitly asks.
- Keep source-code changes scoped to this card.
- Record outputs in the project-local role folder required by policy.
- Include exact files read, files changed, commands/tests run, blockers, risks, and handoff notes.

Role: <profile display name>
Goal: <specific objective>
Required output artifact: <role_folder>/<dated_file>.md
Acceptance criteria:
- <concrete evidence required>
- <role-specific policy checks>
- no unverified claims
```

## Dispatch And Monitoring

Useful commands:

```bash
hermes kanban --board escape-zombie-school create "<title>" --assignee <profile> --body "<body>"
hermes kanban --board escape-zombie-school dispatch
hermes kanban --board escape-zombie-school stats
hermes kanban --board escape-zombie-school list
hermes kanban --board escape-zombie-school show <task_id>
hermes kanban --board escape-zombie-school runs <task_id>
```

Completion is not declared until the relevant wave has:

```text
todo=0
ready=0
running=0
blocked=0
```

If `blocked>0`, surface the exact blocked decision to Terry.

## Review-Required Handling

If a worker blocks with a reason starting with `review-required:`:

1. Inspect the worker comments and handoff.
2. Run the narrowest relevant verification available: focused test, build, static scan, browser/mobile smoke check, or file inspection.
3. If verification passes, complete or unblock according to board policy and record exact commands/results.
4. If verification fails, create a new fix card linked from the review card and assign it to the correct real profile.

## Output Records

Every wave should leave role records under the project folders:

- `CEO/` for product, launch, BM, policy, strategic gates.
- `Planner/` for gameplay, loop, level, difficulty, content structure.
- `Developer/` for implementation, technical handoffs, code notes.
- `Graphic_designer/` for art direction, visual audits, graphics handoffs.
- `Quaility_Assurance/` for tests, screenshots, risk register, validation.
- `Developer/agent_room/` for operations ledger, agent deployment records, reminder hygiene.
- `marketing/` for store copy/localization readiness.

## Current Verified Baseline

As of 2026-06-27:

- Board: `escape-zombie-school`
- `todo`: 0
- `ready`: 0
- `running`: 0
- `blocked`: 0
- `done`: 21
- Verified smoke task: `t_9629b409`
- Verified worker/run: `madangsue`, run `#36`

This file is the canonical project-local process for durable Hermes/Kanban subagent work.
