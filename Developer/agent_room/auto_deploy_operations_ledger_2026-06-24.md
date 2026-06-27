# Auto-Deploy Operations Ledger - 2026-06-24

Project: Escape! zombie school
Board: `escape-zombie-school`
Workspace: `D:/JungSil/2.Minigame_project/school_survivor-integration`
Ledger owner: `madangsue`
Updated for readability: 2026-06-27

## Purpose

This ledger records the first durable Hermes/Kanban specialist wave for Escape! zombie school. It documents which profiles were deployed, what each role owned, and which operational follow-ups mattered.

This is an operations artifact. It did not create game-code changes, commits, pushes, store submissions, or reminder jobs.

## Startup Reads

The original operations run inspected:

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md`
- `Developer/agent_room/subagent_auto_deployment_2026-06-24.toh`
- Kanban task context for `t_6d57e24a`
- Kanban integration context for `t_15da5170`

## Initial Wave Map

| Card | Assignee | Purpose |
|---|---|---|
| `t_79cf323b` | `threemini` | Stage 1 graphics and runtime visual audit |
| `t_97c86822` | `levelmini` | Stage 1 loop and leveling stabilization plan |
| `t_c1f02269` | `balanceqa` | P0/P1 gameplay QA gate and risk register |
| `t_ab6b62bf` | `bizmini` | Product/BM scope guard |
| `t_5ed1e4e2` | `launchmini` | Google Play readiness and policy gate |
| `t_d23c6210` | `backendmini` | Backend deferral boundary and future architecture guard |
| `t_ee07b9a0` | `englishgradmini` | English copy and localization readiness |
| `t_6d57e24a` | `madangsue` | Operations ledger and coordination hygiene |
| `t_c12f27a3` | `jabdareminder` | Notification/reminder hygiene |
| `t_15da5170` | `balanceqa` | Integration synthesis after specialist cards |

## Historical Gstack Finding

Some worker shells originally checked:

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
```

In Hermes worker shells, `$HOME` may point to:

```text
C:/Users/admin/AppData/Local/hermes/profiles/<profile>/home
```

Therefore `~/.claude/skills/gstack/bin` can differ from the user-global install at:

```text
C:/Users/admin/.claude/skills/gstack/bin
```

Current process docs require checking profile gstack readiness before dispatch and fixing any missing profile gate before treating the worker as ready.

## Git/Worktree Observation From Original Run

The original run observed a dirty feature branch and preserved all unrelated changes. No code files were intentionally changed by this ledger run.

## Files Changed By This Ledger Run

- `Developer/agent_room/auto_deploy_operations_ledger_2026-06-24.md`

## Handoff Notes

- Preserve the dirty worktree during agent waves.
- Separate implementation-ready work from policy or Terry-decision blockers.
- Treat `review-required` as an operator verification gate, not as completion.
- Use the current canonical docs for future waves:
  - `Developer/agent_room/game_development_kanban_process.md`
  - `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
  - `Developer/agent_room/antigravity_ide_subagent_handoff.md`
