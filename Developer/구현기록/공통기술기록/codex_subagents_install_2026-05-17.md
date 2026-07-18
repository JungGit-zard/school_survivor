# Codex Subagents Install Record - 2026-05-17

## Purpose

Install and apply the Codex subagent collection from:

```text
https://github.com/VoltAgent/awesome-codex-subagents
```

## Source

- Source repository: `VoltAgent/awesome-codex-subagents`
- Source commit checked out for install: `5f855c1`
- Install method: shallow clone to a temporary folder, then copy `.toml` agent files.

## Applied Location

Project-specific Codex agent directory:

```text
.codex/agents/
```

This follows the source repository installation guide:

- Global agents: `~/.codex/agents/`
- Project agents: `.codex/agents/`

Project agents have higher precedence for this repository.

## Install Result

- External agent files copied: 136
- Existing project agent files preserved: 1
- Total `.codex/agents/*.toml` after install: 137
- Existing custom project agent preserved:
  - `.codex/agents/graphic-designer.toml`

## Notes

- No existing file in `.codex/agents/` was overwritten.
- Some older agent files still exist in `.codex/` root. They were not moved or deleted because they may be user/project-specific history.
- Codex does not automatically spawn these subagents. The user must explicitly ask to use subagents or name a specific subagent.
- Project policy still applies: role-specific output records must be written to the matching project folder.

## Verification

Commands used:

```powershell
Get-ChildItem .codex\agents -File -Filter *.toml
git status --short --branch
```

Verification result:

- `.codex/agents/` contains the installed Codex-native `.toml` subagent files.
- The local custom `graphic-designer.toml` remains in place.
