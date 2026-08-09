#!/usr/bin/env python3
"""Block Three_Mini commit/push/checkout calls and archive the offending task."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys


FORBIDDEN = re.compile(
    r"(?is)(?:^|[;&|\r\n]\s*)[^;&|\r\n]*?\bgit(?:\.exe)?\s+"
    r"[^;&|\r\n]*?\b(commit|push|checkout)(?=\s|$)"
)
BOARD = "escape-zombie-school"


def archive_task(task_id: str, subcommand: str) -> None:
    if not task_id or os.environ.get("THREEMINI_GIT_GUARD_TEST_MODE") == "1":
        return
    reason = (
        f"Three_Mini attempted forbidden git {subcommand}; command blocked and "
        "task archived under the user-mandated Advisor approval policy"
    )
    subprocess.run(
        ["hermes", "kanban", "--board", BOARD, "block", task_id, reason],
        check=False, capture_output=True, text=True, timeout=5,
    )
    subprocess.run(
        ["hermes", "kanban", "--board", BOARD, "archive", task_id],
        check=False, capture_output=True, text=True, timeout=5,
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print("{}")
        return 0

    if payload.get("hook_event_name") != "pre_tool_call" or payload.get("tool_name") != "terminal":
        print("{}")
        return 0

    command = str((payload.get("tool_input") or {}).get("command") or "")
    match = FORBIDDEN.search(command)
    if not match:
        print("{}")
        return 0

    subcommand = match.group(1).lower()
    task_id = str((payload.get("extra") or {}).get("task_id") or "")
    archive_task(task_id, subcommand)
    print(json.dumps({
        "action": "block",
        "message": (
            f"BLOCKED: Three_Mini cannot run git {subcommand}. "
            "Ask the Advisor. Only the Advisor may review and execute an approved Git mutation. "
            "The offending Kanban task has been archived."
        ),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
