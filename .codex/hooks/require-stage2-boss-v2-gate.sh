#!/bin/bash
# Fail closed when a tool request tries to recover an obsolete Stage 2 boss.

payload="$(cat)"
lower="$(printf '%s' "$payload" | tr '[:upper:]' '[:lower:]')"

if printf '%s' "$lower" | grep -Eq 'b02|stage[ -]?2 boss|스테이지 ?2 보스'; then
  if printf '%s' "$lower" | grep -Eq 'restore|recover|revive|legacy|old commit|git show|git checkout|copy from|구형|복구|과거|이전 커밋|되살|재사용|가져오'; then
    printf '%s\n' '{"permissionDecision":"deny","message":"Stage 2 boss v2 gate: obsolete implementation recovery is forbidden. Read docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md."}'
    exit 0
  fi

  printf '%s\n' '{"permissionDecision":"ask","message":"Stage 2 boss v2 gate: confirm docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md was checked and the change uses only the current v2 path."}'
  exit 0
fi

printf '%s\n' '{}'

