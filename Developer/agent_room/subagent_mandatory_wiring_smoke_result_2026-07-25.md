# Subagent mandatory wiring smoke result — 2026-07-25

Task: `t_ea5de488`
Project: Escape! zombie school
Workdir: `D:/Jungsil/2.Minigame_project/school_survivor-integration`
Mode: no-code smoke; game code not edited; cron jobs not scheduled.

## Verdict

PASS — mandatory subagent routing wiring is present and internally consistent for the requested smoke scope.

## Files checked

1. `project_develop_policy.md`
   - Contains the 2026-07-25 mandatory wiring policy under `서브에이전트 무조건 배선 정책`.
   - Lists real profiles including `corpopsmini`.
   - Corporate operations/tax/VAT/settlement work is explicitly routed to `corpopsmini`.

2. `AGENTS.md`
   - Contains `Mandatory Subagent Routing for Escape! zombie school`.
   - Lists real Hermes/Kanban profiles: `threemini`, `uimini`, `levelmini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`, `corpopsmini`.
   - Notes accepted evidence: Kanban card, `Developer/agent_room/` artifact, or `.claude/agents/<profile>.md` review trail.

3. `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
   - Defines the absolute routing rule: every non-empty Escape! zombie school project request must run a subagent routing check before completion.
   - Lists real spawnable Hermes/Kanban profile names including `corpopsmini`.
   - Maps corporate operations / VAT / tax 자료 / Google Play, ONE Store, Toss settlement exports / accountant handoff / sales evidence organization to `corpopsmini`.
   - States the Claude Code hook enforcement path `.claude/hooks/require-subagent-routing-for-project.sh` for `Write`, `Edit`, and `MultiEdit`.

4. `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
   - Refers IDE-side agents to the 2026-07-25 mandatory wiring document as the current rule.
   - Mentions the Claude Code PreToolUse edit hook at `.claude/hooks/require-subagent-routing-for-project.sh`.
   - Lists `corpopsmini` in the real spawnable profiles and maps corporate operations / tax / VAT / settlement exports / accountant handoff to `corpopsmini`.

5. `.claude/settings.json`
   - JSON parse succeeded via `python -m json.tool .claude/settings.json`.
   - `PreToolUse` hook entries exist for `Write`, `Edit`, and `MultiEdit`.
   - Each of those three hook entries calls `.claude/hooks/require-subagent-routing-for-project.sh`.

6. `.claude/hooks/require-subagent-routing-for-project.sh`
   - File exists.
   - `bash -n` syntax check passed.
   - File is executable.
   - Dry run with `{"tool_name":"Write"}` returned permission decision `ask` and printed the routing-required notice.
   - Notice lists real profiles including `corpopsmini` and hard gates for `soundmini` / `corpopsmini`.

7. `C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml`
   - Registry contains active `Corp_Ops_Mini` entry with `hermes_profile = "corpopsmini"`.
   - Registry also contains the mini-agent TOML references for the rest of the relevant project subagents.

## Real profile directory check

Verified profile directories under `C:/Users/admin/AppData/Local/hermes/profiles/`:

- OK `threemini`
- OK `uimini`
- OK `levelmini`
- OK `balanceqa`
- OK `bizmini`
- OK `launchmini`
- OK `backendmini`
- OK `englishgradmini`
- OK `madangsue`
- OK `jabdareminder`
- OK `soundmini`
- OK `corpopsmini`

## Commands run

```bash
pwd
for f in project_develop_policy.md AGENTS.md Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md Developer/agent_room/ide_agent_subagent_autocall_handoff.md .claude/settings.json .claude/hooks/require-subagent-routing-for-project.sh; do test -f "$f"; done
python -m json.tool .claude/settings.json
bash -n .claude/hooks/require-subagent-routing-for-project.sh
test -x .claude/hooks/require-subagent-routing-for-project.sh
printf '{"tool_name":"Write"}' | ./.claude/hooks/require-subagent-routing-for-project.sh
git status --short --branch
```

## Git/status note

`git status --short --branch` showed branch `zombie_only...origin/zombie_only [ahead 1]` with many pre-existing modified/untracked project files. This smoke task did not edit game code; the only intended new artifact from this run is this report file:

`Developer/agent_room/subagent_mandatory_wiring_smoke_result_2026-07-25.md`

## Blockers

None for this smoke verification.

## Remaining caution

None. The older IDE handoff profile list was tidied after the smoke run so it now includes `corpopsmini` directly.
