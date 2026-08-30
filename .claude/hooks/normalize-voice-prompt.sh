#!/bin/bash
# Claude Code UserPromptSubmit hook: project-aware microphone dictation normalizer.
# It preserves the raw prompt and only injects normalized context for the agent.

payload="$(cat)"
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
normalizer="$project_dir/Developer/voice_input/prompt_normalizer.py"
lexicon="$project_dir/Developer/voice_input/escape_zombie_school_voice_lexicon.json"

if [ ! -f "$normalizer" ] || [ ! -f "$lexicon" ]; then
  printf '%s\n' '{}'
  exit 0
fi

output="$(printf '%s' "$payload" | python "$normalizer" --lexicon "$lexicon" --hook-json 2>/dev/null)"
if [ $? -ne 0 ]; then
  printf '%s\n' '{}'
  exit 0
fi

printf '%s\n' "$output"
