# Escape! zombie school — Mandatory Subagent Wiring

Created: 2026-07-25
Owner: Hana / Agent Room operations
Project root: `D:/Jungsil/2.Minigame_project/school_survivor-integration`
Board: `escape-zombie-school`
Purpose: every Escape! zombie school work session must route through the durable subagent system instead of silently working alone.

## Absolute rule

For Escape! zombie school, every non-empty project request must run the subagent routing check before completion.

There is no silent direct-work bypass. A tiny one-step edit may be executed by the current agent only after the routing check is recorded mentally or in the response, but the current agent must still decide whether any specialist is relevant. If a specialist domain is touched, that specialist must be involved through at least one accepted trail before final completion.

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

## Required first commands for Hermes agents

```bash
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school stats
git status --short --branch
```

## Claude Code hook enforcement

`.claude/settings.json` registers `.claude/hooks/require-subagent-routing-for-project.sh` for `Write`, `Edit`, and `MultiEdit`.
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
