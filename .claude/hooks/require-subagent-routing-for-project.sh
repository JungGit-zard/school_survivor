#!/bin/bash
# Claude Code PreToolUse hook: Escape! zombie school mandatory subagent routing gate.
# This surfaces Terry's rule before project edits are written.

payload="$(cat)"
lower="$(printf '%s' "$payload" | tr '[:upper:]' '[:lower:]')"

# Only gate edit/write tools. Other tools should pass silently.
if ! printf '%s' "$lower" | grep -Eq '"tool_name"[[:space:]]*:[[:space:]]*"?(write|edit|multiedit)"?|"name"[[:space:]]*:[[:space:]]*"?(write|edit|multiedit)"?|"matcher"[[:space:]]*:[[:space:]]*"?(write|edit|multiedit)"?'; then
  printf '%s\n' '{}'
  exit 0
fi

cat >&2 <<'MSG'
SUBAGENT ROUTING REQUIRED: Escape! zombie school project edits must run the mandatory subagent routing check before completion.

Read: Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md
Mandatory first command: powershell -NoProfile -ExecutionPolicy Bypass -File "Developer/agent_room/mandatory_precommand/check-required-documents.ps1" -Profile <name> -Domain auto -TaskSummary "<safe short keyword summary>"
Central README: Developer/agent_room/mandatory_precommand/README.md
Use board: escape-zombie-school
Real profiles: threemini, uimini, levelmini, balanceqa, bizmini, launchmini, backendmini, englishgradmini, madangsue, jabdareminder, soundmini, corpopsmini.
Hard gates: sound/audio -> soundmini; corporate/tax/revenue-settlement -> corpopsmini.
Accepted trail: Kanban card, Developer/agent_room artifact, or .claude/agents/<profile>.md review trail.
MSG
printf '%s\n' '{"permissionDecision":"ask","message":"Escape! zombie school mandatory subagent routing gate: confirm relevant specialist involvement/trail before this edit proceeds."}'
