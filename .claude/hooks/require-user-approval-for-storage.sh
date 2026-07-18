#!/usr/bin/env bash
# 데이터 저장 방식(localStorage/Firebase/보안규칙 등) 관련 변경은 무조건 사용자 확인.
# 배경: 2026-07-18 그래픽 스튜디오 Firebase 저장 지시 무시 사건 — 저장 방식은 AI가 임의 판단 금지.
exec python -c '
import sys, json, re
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
ti = d.get("tool_input") or {}
s = " ".join(str(ti.get(k) or "") for k in ("file_path", "content", "new_string"))
if re.search(r"localStorage|sessionStorage|indexedDB|firebase|firestore|database\.rules|\.rules\.json", s, re.I):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask", "permissionDecisionReason": "데이터 저장 방식 관련 변경 감지 - 저장 방식은 임의 판단 금지, 사용자 확인 필수 (2026-07-18 지시)"}}))
'
