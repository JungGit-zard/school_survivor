# Escape! zombie school — Subagent Auto-Input Handoff

Created: 2026-07-17
Owner: Hana / Agent Room operations
Audience: Hermes, Codex, Claude Code, Antigravity, IDE-side resident agents, Kanban workers
Project root: `D:/JungSil/2.Minigame_project/school_survivor-integration`
Board: `escape-zombie-school`

## Purpose

This handoff tells every agent working on Escape! zombie school when to stop working alone and auto-involve the durable Hermes/Kanban subagent team.

Terry's intent: Escape! zombie school work should not silently bypass the registered mini agents. A tiny direct path remains for narrow one-step edits, but any multi-role, milestone, review, release, UI/graphics/gameplay/audio/backend/localization/product work must run the routing check and involve all relevant specialists.

## Source order

1. `project_develop_policy.md` — highest priority project policy.
2. `AGENTS.md`.
3. `SESSION_CONTINUITY.md`.
4. `Developer/agent_room/subagent_system_wiring_2026-07-03.md`.
5. `Developer/agent_room/game_development_kanban_process.md`.
6. `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`.
7. This handoff.

If files conflict, follow `project_develop_policy.md` first and report the conflict.

## Mandatory routing check

For any Escape! zombie school request, classify the work before acting:

- If it is a tiny one-step edit or one-file read-only answer, direct work is allowed.
- If it mentions subagents/Kanban/automatic deployment/QA/review/milestone/release, use Kanban.
- If it spans more than one role, use Kanban.
- If it touches sound/audio/voice, `soundmini` is mandatory even for tiny edits.
- If uncertain whether multiple roles are involved, run the Agent Room/Kanban routing check rather than guessing.

## Real spawnable profiles only

Use only these Hermes profile names as Kanban assignees:

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
```

Do not use placeholders such as `planner`, `reviewer`, `researcher`, `game-developer`, `graphic_designer`, `balance_qa`, `qa-reviewer`, or `product-manager` as assignees. Map them to the real profiles above.

## Role mapping

- Graphics / Three.js / R3F / toon shading / visual implementation / asset pipeline -> `threemini`.
- UI / HUD / menus / responsive layout / touch targets / interaction state / accessibility -> `uimini`.
- Gameplay loop / stage design / leveling / difficulty / weapon/card pools / content pacing -> `levelmini`.
- QA / risk / balance validation / regression / final acceptance -> `balanceqa`.
- Business model / monetization / product scope / strategy -> `bizmini`.
- Google Play / AAB / internal testing / policy / release readiness -> `launchmini`.
- Firebase / auth / DB / API / privacy / account deletion / anti-cheat boundary -> `backendmini`.
- English copy / store text / localization readiness -> `englishgradmini`.
- Operations / agent-room hygiene / smoke cards / ledgers -> `madangsue`.
- Reminder/schedule/notification hygiene -> `jabdareminder`.
- Sound / SFX / BGM / voice / pseudo-voice / Animalese / 8-bit / chiptune / WebAudio / Howler / ZzFX / jsfxr / `SOUND_MAP` / `public/sfx/**` / audio licensing -> `soundmini`.

## Sound_Mini hard gate

Any Escape! zombie school audio task must involve `soundmini` before final completion. This includes:

- SFX, BGM, voice bark, pseudo-voice, Animalese, chiptune, 8-bit, basic machine sound.
- WebAudio, ZzFX, jsfxr/sfxr, Howler, `sfxRegistry.js`, `SOUND_MAP`, `public/sfx/**`.
- Audio volume, mix, cooldown, polyphony, fallback format, compression, file budget, license/provenance.

Valid evidence of involvement:

- a `soundmini` Kanban card, or
- a project artifact by Sound_Mini under `Developer/agent_room/`, or
- `.claude/agents/soundmini.md` review trail in a Claude Code session.

For `놀러와요 동물의 숲` / Animal Crossing-style voice work, Sound_Mini must read:

- `Developer/agent_room/soundmini_animalese_voice_methodology_2026-07-15.md`
- global knowledge iteration `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_sound_voice_rnd_specialist/knowledge/iterations/20260717_1232_animalese_autorouting_reinforcement.md`

Rule: Animalese is a design/implementation method reference only. Do not copy Nintendo audio. Use short token banks, event token plans, pitch/rhythm/envelope variation, and non-blocking playback.

## Default fan-out graph

For milestone/multi-role work, create independent cards first and a validation/synthesis card after the relevant parents:

```text
T1 graphics/visual -> threemini
T2 UI/HUD/UX -> uimini
T3 gameplay/leveling -> levelmini
T4 sound/audio/voice -> soundmini
T5 backend/privacy -> backendmini, if relevant
T6 release/store -> launchmini, if relevant
T7 product/BM -> bizmini, if relevant
T8 English/localization -> englishgradmini, if relevant
T9 operations/smoke/ledger -> madangsue or jabdareminder, if relevant
T10 synthesis/final QA -> balanceqa, parents=[relevant cards]
```

Only use parent links when the child truly needs the parent's output.

## CLI skeleton

Run from project root:

```bash
hermes kanban --board escape-zombie-school stats
hermes kanban --board escape-zombie-school assignees
git status --short --branch
```

Create cards:

```bash
hermes kanban --board escape-zombie-school create "<title>" --assignee <real_profile> --body "<body>"
hermes kanban --board escape-zombie-school dispatch
hermes kanban --board escape-zombie-school stats
```

Completion for a wave requires the relevant wave to have no unfinished cards:

```text
todo=0
ready=0
running=0
blocked=0
```

## Card body minimum

```text
Project: Escape! zombie school
Workdir: D:/JungSil/2.Minigame_project/school_survivor-integration
Board: escape-zombie-school

Required reads:
- project_develop_policy.md
- AGENTS.md
- SESSION_CONTINUITY.md
- Developer/agent_room/subagent_system_wiring_2026-07-03.md
- Developer/agent_room/game_development_kanban_process.md
- Developer/agent_room/ide_agent_subagent_autocall_handoff.md
- Developer/agent_room/escape_zombie_school_subagent_autoinput_handoff_2026-07-17.md
- role-specific latest docs

Guard:
- Preserve uncommitted Terry/agent changes.
- Do not reset/delete/commit/push/submit stores unless Terry explicitly asks.
- Record exact files read/changed, artifacts, verification commands/results, blockers.

Goal: <specific objective>
Output artifact: <role folder>/<dated file>.md
Acceptance: <concrete evidence>
```

## Report format

```text
Subagent auto-input result
Board: escape-zombie-school
Trigger: <why routing was required>
Cards: <task_id> -> <assignee> -> <status>
Artifacts: <paths>
Verification: <commands and actual output>
Blockers: <exact questions or none>
Final state: todo=<n>, ready=<n>, running=<n>, blocked=<n>, done=<n>
```

## Pasteable instruction for future agents

When working in Escape! zombie school, first classify whether the request should use the durable Hermes/Kanban subagent team. Use direct work only for tiny one-step tasks. For multi-role, milestone, review, release, or explicit subagent/Kanban requests, create cards on board `escape-zombie-school` using only real profiles: `threemini`, `uimini`, `levelmini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`. Sound/audio/voice/Animalese work always requires `soundmini` before completion. Preserve uncommitted changes and verify with real outputs before reporting success.
