#!/bin/bash
# Codex/Claude-compatible PreToolUse hook: remind agents to read the B02
# scale regression solution before edits that can affect shared B02 sizing.

payload="$(cat)"
lower="$(printf '%s' "$payload" | tr '[:upper:]' '[:lower:]')"

if printf '%s' "$lower" | grep -Eq 'b02|stagebosspreview|stage boss preview|titlebosszombie|titlescene3d|zombiemesh|studio-tuned-group|studiotunedgroup|graphicsstudiob02source|graphicsstudioconfig|zombie-b02-teacher|stage 2 boss|스테이지 2 보스|타이틀.*보스|로비.*보스|보스.*크기|root scale|루트 스케일'; then
  cat >&2 <<'MSG'
B02 SCALE REGRESSION CHECK REQUIRED.

Read first:
  docs/solutions/integration-issues/graphics-studio-b02-root-scale-regression.md

This prevents repeating the lobby-only zoom mistake when the real issue is
saved Graphics Studio root scale on `zombie-b02-teacher`.
MSG
  printf '%s\n' '{"permissionDecision":"ask","message":"B02 scale regression gate: confirm the solution note was checked first."}'
  exit 0
fi

printf '%s\n' '{}'
