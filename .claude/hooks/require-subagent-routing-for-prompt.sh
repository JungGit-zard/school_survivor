#!/bin/bash
# Claude Code UserPromptSubmit hook: Escape! zombie school mandatory routing gate.
# Runs the central safe-summary document checker for every non-empty project prompt
# and injects the mandatory Kanban/subagent routing context without echoing the raw prompt.

payload="$(cat)"
prompt_text="$({ PAYLOAD="$payload" python - <<'PY'
import json
import os

raw = os.environ.get('PAYLOAD', '')
try:
    data = json.loads(raw) if raw.strip() else {}
except Exception:
    data = {}

for key in ('prompt', 'user_prompt', 'message'):
    value = data.get(key)
    if isinstance(value, str):
        print(value.strip())
        break
else:
    print('')
PY
} 2>/dev/null)"

if [ -z "${prompt_text//[[:space:]]/}" ]; then
  printf '%s\n' '{}'
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
checker="$project_dir/Developer/agent_room/mandatory_precommand/check-required-documents.ps1"
profile="${CLAUDE_AGENT_PROFILE:-madangsue}"

if [ ! -f "$checker" ]; then
  printf '%s\n' "SUBAGENT ROUTING BLOCKED: missing mandatory pre-command checker: $checker" >&2
  exit 2
fi

checker_output="$(powershell -NoProfile -ExecutionPolicy Bypass -File "$checker" -Profile "$profile" -Domain auto -TaskSummary "user-prompt-routing" 2>&1)"
checker_status=$?
if [ $checker_status -ne 0 ]; then
  printf '%s\n' "SUBAGENT ROUTING BLOCKED: mandatory pre-command checker failed for profile $profile." >&2
  printf '%s\n' "$checker_output" >&2
  exit 2
fi

printf '%s\n' 'SUBAGENT ROUTING REQUIRED: every non-empty Escape! zombie school prompt must route through board escape-zombie-school before completion.' >&2
printf '%s\n' 'Real profiles: threemini, uimini, levelmini, balanceqa, bizmini, launchmini, backendmini, englishgradmini, madangsue, jabdareminder, soundmini, corpopsmini.' >&2
printf '%s\n' 'Mandatory gate ran with safe TaskSummary=user-prompt-routing; read the checker READ_REQUIRED paths before commands.' >&2

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"Escape! zombie school mandatory routing gate is active for this non-empty prompt. Run the central pre-command checker with a safe TaskSummary, read its READ_REQUIRED documents, classify specialist domains, and route actual work through Kanban board escape-zombie-school using only real profiles: threemini, uimini, levelmini, balanceqa, bizmini, launchmini, backendmini, englishgradmini, madangsue, jabdareminder, soundmini, corpopsmini. Sound/audio requires soundmini; corporate/tax/settlement requires corpopsmini. Do not silently complete direct work without an accepted Kanban card, Developer/agent_room artifact, or .claude/agents/<profile>.md trail."}}
JSON
