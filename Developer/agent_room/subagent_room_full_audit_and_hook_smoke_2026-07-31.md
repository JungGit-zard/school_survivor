# Sub-Agent Room Full Audit and Mandatory Hook Smoke — 2026-07-31

Created: 2026-07-31 22:33 KST
Owner/request: Terry
Project: Escape! zombie school
Project root: `D:/Jungsil/2.Minigame_project/school_survivor-integration`
Board: `escape-zombie-school`
Smoke card: `t_591b583c` (`madangsue`)

## Resident subagent roster

All 12 registered resident subagents in `C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml` were checked.

- `madangsue` — `Madang_sue` / 마당쇠 — reminders, cron, scheduling, ledger management.
- `jabdareminder` — `Jabda_Reminder_Manager` / 잡다알림관리자 — miscellaneous reminders, cron, scheduling, notification hygiene.
- `threemini` — `Three_Mini` / 쓰리미니 — Three.js/R3F/cartoon 3D graphics for Escape! zombie school.
- `levelmini` — `Level_Mini` / 레벨미니 — gameplay loop, levels, difficulty curve, stage/content pacing.
- `balanceqa` — `Balance_QA_Mini` / 밸검미니 — QA, balance, validation, acceptance, regression risk.
- `bizmini` — `Biz_Mini` / 비즈미니 — monetization, product scope, live-ops economy, strategy.
- `englishgradmini` — `English_Grad_Mini` / 영문미니 — English copy, localization readiness, store text.
- `launchmini` — `Launch_Mini` / 런치미니 — Google Play, AAB, Play policy, release readiness.
- `backendmini` — `Backend_Mini` / 백엔드미니 — Firebase/Auth/DB/API/privacy/backend boundaries.
- `uimini` — `UI_Mini` / ui미니 — UI/HUD/responsive/touch/accessibility.
- `soundmini` — `Sound_Mini` / 사운드미니 — SFX/BGM/voice/WebAudio/chiptune/audio licensing hard gate.
- `corpopsmini` — `Corp_Ops_Mini` / 법인운영미니 — corporate ops, VAT/tax/settlement/accountant handoff hard gate.

## Registry audit

Result: PASS.

- Registry parsed as valid TOML.
- All 12 agent TOML files exist.
- All 12 registry workspaces exist.
- All 12 workspaces have ledger/knowledge/manifest coverage.
- Added/verified explicit `hermes_profile` mapping in registry for all 12 profiles:
  - `Madang_sue => madangsue`
  - `Jabda_Reminder_Manager => jabdareminder`
  - `Three_Mini => threemini`
  - `Level_Mini => levelmini`
  - `Balance_QA_Mini => balanceqa`
  - `Biz_Mini => bizmini`
  - `English_Grad_Mini => englishgradmini`
  - `Launch_Mini => launchmini`
  - `Backend_Mini => backendmini`
  - `UI_Mini => uimini`
  - `Sound_Mini => soundmini`
  - `Corp_Ops_Mini => corpopsmini`

Registry path: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml`

## Runnable profile / board audit

Result: PASS with existing board backlog noted.

Command evidence:

```text
hermes profile list
```

Confirmed profiles exist:

```text
backendmini, balanceqa, bizmini, corpopsmini, englishgradmini, jabdareminder,
launchmini, levelmini, madangsue, soundmini, threemini, uimini
```

Command evidence:

```text
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school stats
```

Board assignees show `ON DISK yes` for all required profiles.
Current board state before this smoke completion included:

```text
todo=7, ready=0, running=0, blocked=21, done=60
```

The backlog is existing project work, not a wiring failure.

## Project policy / startup wiring audit

Result: PASS.

Checked:

- `project_develop_policy.md`
- `AGENTS.md`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `.claude/settings.json`
- `.claude/hooks/require-subagent-routing-for-project.sh`
- `.claude/hooks/require-soundmini-for-audio.sh`

Confirmed rule is present in both highest-priority policy and startup instructions:

- Every non-empty Escape! zombie school request must run the routing check before final completion.
- Use only real Hermes/Kanban profiles.
- Audio/sound tasks require `soundmini`.
- Corporate/tax/revenue-settlement tasks require `corpopsmini`.
- Accepted evidence: Kanban card, `Developer/agent_room/` artifact, or `.claude/agents/<profile>.md` review trail.

## Claude resident-agent mirrors

Result: PASS after repair.

Before repair, `.claude/agents/` had only 7 of the 12 required project profiles plus `corpopsmini` and `stabilityscore`.
Created/verified the missing mirrors:

- `.claude/agents/bizmini.md`
- `.claude/agents/launchmini.md`
- `.claude/agents/englishgradmini.md`
- `.claude/agents/madangsue.md`
- `.claude/agents/jabdareminder.md`

Final mirror check:

```text
missing= []
present_count= 12
```

## Hook audit

Result: PASS.

`.claude/settings.json` registers `.claude/hooks/require-subagent-routing-for-project.sh` for:

- `Write`
- `Edit`
- `MultiEdit`

Verification commands/results:

```text
python -m json.tool .claude/settings.json
# valid JSON

bash -n .claude/hooks/require-subagent-routing-for-project.sh
# exit 0

bash -n .claude/hooks/require-soundmini-for-audio.sh
# exit 0
```

Positive trigger dry run:

```json
{"tool_name":"Write","tool_input":{"file_path":"Developer/test.md"}}
```

Output:

```json
{"permissionDecision":"ask","message":"Escape! zombie school mandatory subagent routing gate: confirm relevant specialist involvement/trail before this edit proceeds."}
```

Negative non-edit dry run:

```json
{"tool_name":"Read","tool_input":{"file_path":"Developer/test.md"}}
```

Output:

```json
{}
```

`git check-ignore` produced no ignore match for the hook script or new mirror files, so they are not blocked by `.gitignore`.

## Git status observed

Existing pre-task dirty state was preserved. This audit added/modified only routing/mirror/audit artifacts plus registry mapping.

Pre-existing before this audit:

```text
 M Developer/r3f_prototype/android/app/build.gradle
 M Developer/r3f_prototype/src/lib/firebaseProgress.test.js
?? Developer/agent_room/launchmini_aab_v23_build_2026-07-31.md
?? Developer/r3f_prototype/.firebase/
```

Audit/wiring changes made by this task:

```text
M  C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml
A  .claude/agents/bizmini.md
A  .claude/agents/launchmini.md
A  .claude/agents/englishgradmini.md
A  .claude/agents/madangsue.md
A  .claude/agents/jabdareminder.md
A  Developer/agent_room/subagent_room_full_audit_and_hook_smoke_2026-07-31.md
```

## Conclusion

Mandatory subagent routing is now wired across:

1. Global sub-agent-room registry.
2. Real Hermes profiles.
3. Escape! zombie school Kanban assignees.
4. Project policy/startup documents.
5. Claude Code PreToolUse edit hooks.
6. Claude resident-agent mirror files for all 12 profiles.
7. Project-local audit/smoke trail.

Any future non-empty Escape! zombie school development request should now trip the routing gate before edit completion and can involve the relevant resident specialist profiles through Kanban/card/artifact/mirror trails.
