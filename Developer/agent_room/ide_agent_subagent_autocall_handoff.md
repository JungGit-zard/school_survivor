# IDE Agent Handoff - Subagent Auto-Call For Escape! zombie school

Created: 2026-06-25
Updated: 2026-07-05
Owner: Hana / Agent Room operations
Audience: IDE-side resident agents, including Codex, Claude, Antigravity, or similar project assistants
Project root: `D:/JungSil/2.Minigame_project/school_survivor-integration`
Durable board: `escape-zombie-school`
Primary process doc: `Developer/agent_room/game_development_kanban_process.md`

## Purpose

Terry's project commands are not always meant to be handled by one IDE agent alone. When a request is multi-role, milestone-level, review-heavy, release-facing, or explicitly asks for subagents/mini agents/Kanban/automatic deployment, route it through the registered Hermes/Kanban subagent team.

Tiny one-step edits can be handled directly, but the IDE agent must still preserve user changes, follow project policy, and verify when possible.

## Source Order

Before deciding whether to work directly or call subagents, read and obey:

1. `project_develop_policy.md`
2. `Bang_Rules.md`
3. `AGENTS.md`
4. `SESSION_CONTINUITY.md`
5. `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
6. `Developer/agent_room/game_development_kanban_process.md`
7. This file
8. `Developer/agent_room/antigravity_ide_subagent_handoff.md` when the IDE is Antigravity

If there is a conflict, `project_develop_policy.md` wins.

## Explicit Triggers

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

## Implicit Triggers

Use subagents even without trigger words when the request clearly spans multiple roles:

- graphics + gameplay + QA
- implementation + review + final validation
- stage/milestone planning plus code changes
- Google Play/internal testing/release readiness
- UI/HUD/menu/interaction changes needing UI implementation or visual QA
- balance, difficulty, weapons, cards, progression
- backend, Firebase, privacy, account deletion, networking
- monetization, product scope, business model
- English store copy, localization, global readiness
- sound/SFX/BGM/voice/chiptune/WebAudio/audio licensing work
- long-running cleanup or multi-file refactor needing independent validation

## Mandatory Sound_Mini Hook

Any Escape! zombie school sound production or audio implementation task must involve `soundmini` / Sound_Mini / 사운드미니 before finalizing changes. This overrides the small direct-work exception.

Trigger this hook for:

- SFX, BGM loops, voice barks, pseudo-voice, chiptune, 8-bit, Atari-grade/basic machine sound, WebAudio, ZzFX, jsfxr, sfxr, Howler, `SOUND_MAP`, `sfxRegistry.js`, `public/sfx/**`, OGG/MP3 fallback, audio volume/mix/cooldown/polyphony/performance, and audio asset licensing.

Required trail before completion:

- create or use a `soundmini` Kanban card, or
- call/read the Claude Code mirror `.claude/agents/soundmini.md`, or
- cite an existing current `soundmini` artifact such as `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md` and record why it covers the change.

If code implementation is also needed, pair `soundmini` with the relevant implementation profile and finish with `balanceqa` validation when the change is more than a trivial documented parameter adjustment.

## Direct Work Is Allowed For Small Tasks

Do not create Kanban cards for tiny one-step work unless Terry explicitly asks.

Examples:

- Fix one typo in one known file.
- Read or summarize one known file.
- Answer a narrow code question without file changes.
- Make a small scoped edit with no cross-role judgment.

## Real Spawnable Profiles

Only assign durable cards to:

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

Map placeholder concepts to real profiles:

- graphics / `graphic_designer` -> `threemini`
- UI / HUD / UX / `ui-designer` -> `uimini`
- gameplay / planner / `game-developer` -> `levelmini`
- reviewer / QA / `balance_qa` -> `balanceqa`
- release / store -> `launchmini`
- backend / privacy -> `backendmini`
- product / BM -> `bizmini`
- English / localization -> `englishgradmini`
- operations / smoke / ledger -> `madangsue`
- reminders / notification hygiene -> `jabdareminder`
- sound / SFX / BGM / voice / chiptune / WebAudio / audio licensing -> `soundmini`

## Routing Algorithm

1. Classify the request.
2. If it is direct small work, handle it directly.
3. If it matches explicit or implicit triggers, route to Kanban.
4. Run startup checks:

   ```bash
   hermes kanban --board escape-zombie-school stats
   hermes kanban --board escape-zombie-school assignees
   git status --short --branch
   ```

5. Create independent specialist cards first.
6. Create dependent synthesis/review cards with parent links only where needed.
7. Dispatch and monitor:

   ```bash
   hermes kanban --board escape-zombie-school dispatch
   hermes kanban --board escape-zombie-school stats
   hermes kanban --board escape-zombie-school list
   ```

8. Report only after real task IDs, statuses, artifacts, and verification results exist.

Completion requires `todo=0`, `ready=0`, `running=0`, and `blocked=0` for the relevant wave.

## Report Shape

Use this shape when reporting a subagent wave:

```text
Subagent routing result

Board: escape-zombie-school
Workdir: D:/JungSil/2.Minigame_project/school_survivor-integration
Trigger: <why this used subagents>

Created/used cards:
- <task_id> -> <assignee> -> <title> -> <status>

Artifacts:
- <path>

Verification:
- <command> -> <actual result>

Blocked decisions:
- <task_id>: <exact question>

Final state:
- todo=<n>
- ready=<n>
- running=<n>
- blocked=<n>
- done=<n>
```

Never claim success without real outputs and fresh verification evidence.

## 2026-07-17 Subagent Auto-Input Update

Latest handoff: `Developer/agent_room/escape_zombie_school_subagent_autoinput_handoff_2026-07-17.md`.

IDE-side resident agents must read it before deciding to work alone on Escape! zombie school. Use direct work only for tiny one-step tasks. For non-tiny, multi-role, milestone, review, release, UI/graphics/gameplay/backend/localization/product/sound work, route through `escape-zombie-school` and auto-involve the relevant real profiles. Sound/audio/voice/Animalese always requires `soundmini` before completion.
