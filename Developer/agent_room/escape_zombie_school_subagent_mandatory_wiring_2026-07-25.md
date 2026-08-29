# Escape! zombie school — Mandatory Subagent Wiring

Created: 2026-07-25
Owner: Hana / Agent Room operations
Project root: `D:/Jungsil/2.Minigame_project/school_survivor-integration`
Board: `escape-zombie-school`
Purpose: every Escape! zombie school work session must route through the durable subagent system instead of silently working alone.

## Absolute rule

For Escape! zombie school, every non-empty project request must run the subagent routing check before completion.

Updated operating rule: every non-empty Escape! zombie school task goes through the `escape-zombie-school` Kanban board. Hana/default assistant is the Advisor/orchestrator: she classifies scope, decomposes work, creates or references Kanban cards, reviews worker output, and gives the final user-facing report. Actual Worker execution must be assigned to the registered Agent Room Hermes/Kanban subagent profiles listed below.

There is no silent direct-work bypass. Even a tiny one-step edit must be routed through the Kanban board first. Hana/default assistant may perform advisor-level classification, card creation, result review, and final reporting, but implementation/work execution belongs to the registered worker profiles. If Kanban is temporarily blocked, record the blocker explicitly and leave a secondary project artifact/review trail rather than claiming silent completion.

Accepted involvement trail:
- Kanban card on board `escape-zombie-school` assigned to the real profile.
- Project artifact under `Developer/agent_room/` written by or explicitly for that specialist.
- Claude Code local mirror review trail under `.claude/agents/<profile>.md` when working inside Claude Code.

## Real spawnable Hermes/Kanban profiles

Use only real profile names as Kanban assignees:

```text
threemini
uimini
levelmini
balanceqa
bizmini
launchmini
backendmini
englishgradmini
madangsue
jabdareminder
soundmini
corpopsmini
```

Do not use placeholder assignees such as `planner`, `reviewer`, `game-developer`, `graphic_designer`, `balance_qa`, `tax`, or `accountant`. Map to the profiles above.

## Existing expert reuse decision

Before creating a new role or assigning a task, first inspect the local Hermes registry and `hermes kanban --board escape-zombie-school assignees`, then reuse the matching real profile. The Phase 0 rules and the pinned reference-only GitHub Lounge boundary are in `Developer/agent_room/persistent_subagent_lounge_routing_2026-08-29.md`.

Every new Kanban card body must state `Reuse decision: <existing profile and reason>` or `Reuse decision: no registered profile fits because <exact capability gap>`. Reference-catalog names are not assignees unless they are registered local Hermes profiles.

## Mandatory role routing map

- Graphics / Three.js / R3F / toon shading / visual implementation / asset pipeline -> `threemini`.
- UI / HUD / menus / responsive layout / touch targets / interaction states / accessibility -> `uimini`.
- Gameplay loop / stage design / leveling / difficulty / weapon/card pools / content pacing -> `levelmini`.
- QA / risk / balance validation / regression / acceptance / synthesis -> `balanceqa`.
- Business model / monetization / product scope / strategy -> `bizmini`.
- Google Play / AAB / internal testing / policy / release readiness -> `launchmini`.
- Firebase / auth / DB / API / privacy / account deletion / anti-cheat boundary -> `backendmini`.
- English copy / store text / localization readiness -> `englishgradmini`.
- Operations / agent-room hygiene / smoke cards / ledgers -> `madangsue`.
- Reminder / schedule / notification hygiene -> `jabdareminder`.
- Sound / SFX / BGM / voice / pseudo-voice / Animalese / 8-bit / chiptune / WebAudio / Howler / ZzFX / jsfxr / `SOUND_MAP` / `public/sfx/**` / audio licensing -> `soundmini`.
- Corporate operations / VAT / tax 자료 / Google Play, ONE Store, Toss settlement exports / accountant handoff / sales evidence organization -> `corpopsmini`.

## Default action by request type

1. Single-role task: route to the matching specialist and current agent verifies the output.
2. Multi-role or milestone task: create one Kanban card per relevant specialist and a final `balanceqa` synthesis/acceptance card.
3. Any audio/sound task: `soundmini` is mandatory even if the task is tiny.
4. Any corporate/tax/revenue-settlement task: `corpopsmini` is mandatory and remains separately managed from game-development agents.
5. Any uncertain task: prefer `madangsue` for routing/smoke plus the likely specialist rather than bypassing the room.

## Required pre-command document index

Before any task command, every Escape! zombie school subagent must use the central mandatory pre-command repository at `Developer/agent_room/mandatory_precommand/README.md` and run the checker below. Read the exact `READ_REQUIRED` paths emitted by the checker: common documents for all agents, only the latest `SESSION_MEMORY.md` entry, profile-default documents, and conditional domain documents matched from the safe `TaskSummary`.

## Required first commands for Hermes agents

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "Developer/agent_room/mandatory_precommand/check-required-documents.ps1" -Profile <name> -Domain auto -TaskSummary "<safe short keyword summary>"
```

Then run the normal repository state checks:

```bash
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school stats
git status --short --branch
```

## Claude Code hook enforcement

`.claude/settings.json` registers `Developer/agent_room/mandatory_precommand/check-required-documents.ps1` for `SessionStart` and PreToolUse `Bash|PowerShell|shell_command|Write|Edit|MultiEdit`, while preserving the subagent routing hook for edit tools.
The hook does not complete the routing by itself; it forces the current agent to acknowledge the mandatory routing gate before project edits proceed.

## Reporting format

```text
Subagent mandatory routing
Board: escape-zombie-school
Trigger: <why routing was required>
Specialists involved: <profile list>
Cards/artifacts/review trail: <ids or paths>
Verification: <actual commands/results>
Remaining blockers: <none or exact blocker>
```
