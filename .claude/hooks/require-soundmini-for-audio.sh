#!/bin/bash
# Claude Code PreToolUse hook: surface Terry's mandatory Sound_Mini gate
# before edits that look like Escape! zombie school audio/sound production.

payload="$(cat)"
lower="$(printf '%s' "$payload" | tr '[:upper:]' '[:lower:]')"

if printf '%s' "$lower" | grep -Eq 'public/sfx|sfxregistry|sound_map|\.ogg|\.mp3|\.wav|\.flac|\.m4a|howler|webaudio|zzfx|jsfxr|sfxr|chiptune|8-bit|atari|bgm|voice bark|pseudo-voice|audio licensing|soundmini'; then
  cat >&2 <<'MSG'
SOUNDMINI REQUIRED: Escape! zombie school audio/sound work must involve soundmini / Sound_Mini before finalizing.

Required trail: soundmini Kanban card, soundmini artifact, or .claude/agents/soundmini.md review.
Relevant docs: project_develop_policy.md, AGENTS.md, Developer/agent_room/ide_agent_subagent_autocall_handoff.md.
MSG
  printf '%s\n' '{"permissionDecision":"ask","message":"Sound_Mini gate: confirm soundmini involvement before this audio/sound edit proceeds."}'
  exit 0
fi

printf '%s\n' '{}'
