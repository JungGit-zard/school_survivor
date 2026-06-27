# Ralph /goal Auto-Agent Activation - 2026-06-27

## Summary

Ralph `/goal` and goal-mode work should use the same durable Hermes/Kanban subagent route when the request is multi-role, milestone-level, review-heavy, or explicitly asks for automatic agent deployment.

## Verified Project Route

- Board: `escape-zombie-school`
- Process doc: `Developer/agent_room/game_development_kanban_process.md`
- General IDE handoff: `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
- Antigravity handoff: `Developer/agent_room/antigravity_ide_subagent_handoff.md`
- Hermes control room: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/escape-zombie-school-deployment`
- Verified smoke task: `t_9629b409`
- Verified smoke worker/run: `madangsue`, run `#36`

## Real Profiles

Use only:

```text
threemini
levelmini
uimini
balanceqa
bizmini
launchmini
backendmini
englishgradmini
madangsue
jabdareminder
```

## Activation Rule

For Ralph `/goal` work:

1. Read `project_develop_policy.md`, `AGENTS.md`, and `Developer/agent_room/game_development_kanban_process.md`.
2. Run:

   ```bash
   hermes kanban --board escape-zombie-school stats
   hermes kanban --board escape-zombie-school assignees
   git status --short --branch
   ```

3. If the goal is multi-role, create a fan-out/fan-in card graph.
4. Dispatch with:

   ```bash
   hermes kanban --board escape-zombie-school dispatch
   ```

5. Do not declare the goal complete until `todo=0`, `ready=0`, `running=0`, and `blocked=0` for the relevant wave.

## Notes

- `.codex/hooks.json` points the gstack pre-tool hook at this integration repo path.
- No worker may commit, push, reset, delete, or submit to Google Play unless Terry explicitly asks.
- If a worker blocks with `review-required`, the operator must verify with focused tests/build/static checks before completing the card.
