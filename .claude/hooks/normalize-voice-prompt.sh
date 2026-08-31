#!/bin/bash
# Claude Code UserPromptSubmit hook: workspace-level microphone dictation normalizer.
# The normalizer is intentionally outside the game repo; it is a developer/agent input tool,
# not an Escape Zombie School runtime or build asset.

payload="$(cat)"
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
voice_home="${VOICE_NORMALIZER_HOME:-C:/Users/admin/AppData/Local/hermes/voice_input}"
normalizer="$voice_home/prompt_normalizer.py"
lexicon="$voice_home/escape_zombie_school_voice_lexicon.json"
ledger="$voice_home/korean_personal_pronunciation_ledger.json"

if [ ! -f "$normalizer" ] || [ ! -f "$lexicon" ]; then
  printf '%s
' '{}'
  exit 0
fi

output="$(printf '%s' "$payload" | python "$normalizer" --lexicon "$lexicon" --personal-ledger "$ledger" --hook-json 2>/dev/null)"
if [ $? -ne 0 ]; then
  printf '%s
' '{}'
  exit 0
fi

printf '%s
' "$output"
