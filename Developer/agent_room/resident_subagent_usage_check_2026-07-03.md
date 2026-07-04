# Resident subagent usage check - 2026-07-03

## Scope

- Checked whether the Agent Room resident subagent/Kanban route is discoverable and usable.
- No new Kanban work cards were created for the tiny title-scene edit because project policy allows direct handling for small one-step changes.

## Current Board State

- Board: `escape-zombie-school`
- `todo=0`
- `ready=0`
- `running=0`
- `blocked=0`
- `done=22`

## Profile Readiness

All real spawnable Hermes profiles are present on disk and gstack-ready:

- `threemini`
- `levelmini`
- `uimini`
- `balanceqa`
- `bizmini`
- `launchmini`
- `backendmini`
- `englishgradmini`
- `madangsue`
- `jabdareminder`

## Evidence Commands

- `hermes kanban --board escape-zombie-school stats`
- `hermes kanban --board escape-zombie-school assignees`
- `hermes kanban --board escape-zombie-school list`
- profile HOME `~/.claude/skills/gstack/bin` existence check for all 10 real profiles

## Assessment

- The resident subagent route is wired and currently clean: no stuck todo, ready, running, or blocked cards.
- Real profile usage is distributed across graphics, UI, gameplay, QA, release, backend, business, English, operations, and reminder roles.
- Latest smoke card `t_9e2bd23a` confirms the Kanban -> Hermes worker route.
- Continue using direct IDE work for tiny scoped edits; use Kanban for multi-role, milestone, review-heavy, release, QA-gate, or explicit subagent requests.

