# Persistent Subagent Lounge Routing

Created: 2026-08-29 KST
Owner: Madang_sue / Agent Room operations
Scope: Escape! zombie school durable expert reuse

## 1. Execution canonical source

The executable source of truth is the local Hermes Agent Room:

```text
C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml
C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/*.toml
C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/<agent-id>/
C:/Users/admin/AppData/Local/hermes/profiles/<profile>/
```

Only these 12 registered Hermes profiles may receive an `escape-zombie-school` Kanban assignment:

```text
threemini uimini levelmini balanceqa bizmini launchmini
backendmini englishgradmini madangsue jabdareminder soundmini corpopsmini
```

Workers remain Terra-only. Advisor work does not change that worker assignment rule.

## 2. GitHub Lounge is a secondary catalog

The reference catalog is pinned to:

```text
https://github.com/JungGit-zard/-subagent_lounge
branch: master
commit: 6daf30956150c54ccc8284b996c2dca5a0315766
```

It is a source of resident-learning methodology and role descriptions, not an executable replacement for Hermes/Kanban. Its `registry.json` and `seats/` are for another project. Do not import its `seats/`, `state/`, `reviews/`, project `SYSTEM_PROMPT.md`, or project knowledge as this project's canonical state.

Remote names such as `jeong_samdi`, `jeong_motion`, and `ko_jaejil` are not Hermes profiles. They must never be Kanban assignees until separately registered in the local Hermes registry and profile set.

## 3. Phase 0: reuse before creation

Before every non-empty Escape! zombie school task:

1. Inspect the local registry and `hermes kanban --board escape-zombie-school assignees`.
2. For the selected local profile, read its TOML `[paths]` and `[learning]`, the configured knowledge base, and the latest relevant redacted iteration.
3. Match the task to an existing real profile and reuse it when its domain covers the work.
4. Only if there is no matching local profile, search the pinned GitHub catalog for a role specification as well as the local catalog.
5. If both catalogs show a real capability gap, record the evidence on the Kanban card. The user's standing authorization is to create and reuse a **durable** role with an explicit name, role, authority, and learning path instead of a one-off agent; do not ask for separate per-gap approval. This does not authorize Hermes registration, installation, or execution in this task. Do not create duplicate or placeholder roles.

Every Kanban card body must include a `Reuse decision` line: the selected existing profile and why it fits, or the exact missing capability and why no registered profile fits.

## 4. Learning and safety boundary

Only verified lessons may be added to a local profile's `knowledge/iterations/`. Each entry must include:

```text
profile, task/Kanban ID, source URL or file, source hash or commit,
tested evidence, negative lesson, reviewer, and redaction result
```

Never store or synchronize secrets, `.env`, tokens, Firebase personal data, raw logs, browser profiles, or unreviewed user data. Do not install, `attach`, schedule, clone into the project worktree, or enable automatic bidirectional synchronization for the GitHub Lounge. Any future installation or import requires a separate explicit approval, dry-run evidence, and scoped review.

## 5. Operating split

- Hermes/Kanban: assignment, execution, status, review, and project-facing evidence.
- Local `global-agent-room`: durable, redacted lessons for registered profiles.
- GitHub Lounge: pinned reference catalog only; a manual, reviewed source for methodology.
