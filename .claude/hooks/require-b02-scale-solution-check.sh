#!/bin/bash
# Claude Code PreToolUse hook: surface the mandatory B02 scale regression
# solution note before edits that can affect shared Graphics Studio B02 size.

payload="$(cat)"
lower="$(printf '%s' "$payload" | tr '[:upper:]' '[:lower:]')"

if printf '%s' "$lower" | grep -Eq 'b02|stagebosspreview|stage boss preview|titlebosszombie|titlescene3d|zombiemesh|studio-tuned-group|studiotunedgroup|graphicsstudiob02source|graphicsstudioconfig|zombie-b02-teacher|stage 2 boss|스테이지 2 보스|타이틀.*보스|로비.*보스|보스.*크기|root scale|루트 스케일'; then
  cat >&2 <<'MSG'
B02 SCALE REGRESSION CHECK REQUIRED.

Before changing Stage 2 boss/B02 scale, title boss placement, lobby StageBossPreview,
ZombieMesh, StudioTunedGroup, or Graphics Studio B02 source/config, read:

  docs/solutions/integration-issues/graphics-studio-b02-root-scale-regression.md

Reason: B02 can become oversized through saved Graphics Studio root scale
(`zombie-b02-teacher`), affecting lobby, title, and runtime together.
MSG
  printf '%s\n' '{"permissionDecision":"ask","message":"B02 scale regression gate: confirm docs/solutions/integration-issues/graphics-studio-b02-root-scale-regression.md was checked first."}'
  exit 0
fi

printf '%s\n' '{}'
