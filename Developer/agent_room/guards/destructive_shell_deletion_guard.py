#!/usr/bin/env python3
"""Fail-closed guard for destructive shell deletion commands.

This hook is intentionally conservative for agent shells. It denies first, can launch
a separate human review terminal on Windows, and never auto-bypasses. If a command looks like deletion/cleanup, it returns deny JSON shapes
compatible with Codex/Claude-style PreToolUse and Hermes pre_tool_call.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import re
import sys
from typing import Any

REVIEW_TEXT = (
    'Destructive cleanup is blocked. Terry requests THREE terminal confirmations (y/N). '
    'A separate terminal collects review only; raw shell execution remains denied. '
    'Broad root/drive targets are permanently denied. This is internal incident risk, '
    'not proof of an external attacker.'
)


def deny_payload(message: str) -> dict[str, Any]:
    """Return all supported deny shapes instead of relying on one client dialect.

    Codex official PreToolUse docs use hookSpecificOutput.permissionDecision=deny.
    Claude-style hooks accept legacy decision=block. Hermes pre_tool_call currently
    understands action=block/message. Emitting all of them is intentional fail-closed
    redundancy; none is an approval or bypass.
    """
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": message,
        },
        "decision": "block",
        "reason": message,
        "permissionDecision": "deny",
        "action": "block",
        "message": message,
    }


@dataclass(frozen=True)
class Decision:
    blocked: bool
    reason: str = ""


SHELL_TOOL_NAMES = {
    "terminal",
    "bash",
    "Bash",
    "PowerShell",
    "powershell",
    "shell_command",
    "Shell",
}


def normalize_command(command: str) -> str:
    """Normalize only enough for conservative pattern matching."""
    lowered = command.replace("\x00", " ")
    lowered = re.sub(r"[`^]", "", lowered)
    lowered = lowered.lower()
    lowered = re.sub(r"[\r\n]+", " ; ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def has_broad_root_target(text: str) -> bool:
    """Detect drive/root targets that are too broad for agent cleanup."""
    patterns = [
        r"(?<![\w.-])/[\"']?(?:\s|$|[;&|])",  # POSIX root
        r"(?<![\w.-])[a-z]:[\\/][\"']?(?:\s|$|[;&|])",  # C:\ or D:/
        r"(?<![\w.-])[a-z]:[\"']?(?:\s|$|[;&|])",  # C: current dir on drive
        r"(?<![\w.-])//[a-z]/[\"']?(?:\s|$|[;&|])",  # MSYS drive root //d/
        r"(?<![\w.-])/[a-z]/[\"']?(?:\s|$|[;&|])",  # MSYS drive root /d/
        r"(?<![\w.-])\\\\[?]\\[a-z]:[\\/][\"']?(?:\s|$|[;&|])",  # \\?\D:\
    ]
    return any(re.search(pattern, text) for pattern in patterns)


def classify_command(command: str) -> Decision:
    text = normalize_command(command)
    if not text:
        return Decision(False)

    # Git clean can delete untracked work and must never run from agents without the
    # user's explicit three-confirmation destructive-cleanup ceremony.
    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\bgit(?:\.exe)?\s+(?:-[^;&|\s]+\s+)*clean\b", text):
        return Decision(True, "git clean")

    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\bgit(?:\.exe)?\s+(?:-[^;&|\s]+\s+)*rm\b", text):
        return Decision(True, "git rm deletion")

    # POSIX rm recursive+force family. Match combined flags and split flags first so
    # the reason records the high-risk form instead of the generic deletion class.
    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\brm\s+(?=[^;&|]*-[^;&|\s]*r)(?=[^;&|]*-[^;&|\s]*f)", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via rm -rf")
        return Decision(True, "rm -rf")

    # Terry's policy is THREE reviews before ANY destructive cleanup. The hook cannot
    # safely collect three independent reviews, so direct deletion commands are blocked
    # even when they are single-file/non-recursive.
    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\brm\b", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via rm")
        return Decision(True, "rm deletion command")

    # cmd.exe recursive directory removal. Handles rmdir/rd with /s, including nested
    # powershell -> cmd.exe malformed quotes.
    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\b(?:rmdir|rd)\b(?=[^;&|]*/s\b)", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via cmd rmdir recursive")
        return Decision(True, "cmd rmdir recursive")

    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\b(?:rmdir|rd)\b", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via cmd rmdir")
        return Decision(True, "cmd rmdir deletion command")

    # cmd.exe recursive file deletion.
    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\bdel\b(?=[^;&|]*/s\b)", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via cmd del /s")
        return Decision(True, "cmd del /s")

    if re.search(r"(?:^|[;&|]\s*)[^;&|]*\b(?:del|erase)\b", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via cmd del")
        return Decision(True, "cmd del deletion command")

    # PowerShell recursive deletion.
    if re.search(r"\b(?:remove-item|rm|ri|del|erase)\b(?=[^;&|]*-(?:recurse|r)\b)", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via PowerShell Remove-Item -Recurse")
        return Decision(True, "PowerShell Remove-Item -Recurse")

    if re.search(r"\b(?:remove-item|ri)\b", text):
        if has_broad_root_target(text):
            return Decision(True, "broad root/drive target via PowerShell Remove-Item")
        return Decision(True, "PowerShell Remove-Item deletion command")

    # Non-recursive deletion commands aimed at drive/root targets are still too broad.
    if has_broad_root_target(text) and re.search(r"\b(?:rm|del|erase|remove-item|rmdir|rd)\b", text):
        return Decision(True, "broad root/drive target")

    return Decision(False)


def extract_command(payload: dict[str, Any]) -> str:
    tool_input = payload.get("tool_input") or payload.get("input") or {}
    if isinstance(tool_input, str):
        return tool_input
    if not isinstance(tool_input, dict):
        return ""
    for key in ("command", "cmd", "script", "powershell", "bash"):
        value = tool_input.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def is_shell_payload(payload: dict[str, Any]) -> bool:
    tool_name = payload.get("tool_name") or payload.get("tool") or payload.get("name")
    if tool_name in SHELL_TOOL_NAMES:
        return True
    command = extract_command(payload)
    return bool(command and payload.get("hook_event_name") in {"pre_tool_call", "PreToolUse"})


def evaluate_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not is_shell_payload(payload):
        return {}
    command = extract_command(payload)
    if not command:
        return deny_payload('BLOCKED: missing or invalid shell command. ' + REVIEW_TEXT)
    decision = classify_command(command)
    if not decision.blocked:
        return {}
    message = f"BLOCKED destructive shell command ({decision.reason}). {REVIEW_TEXT}"
    return deny_payload(message)


def launch_human_review(payload: dict[str, Any]) -> bool:
    import base64
    import os
    from pathlib import Path
    import subprocess
    command = extract_command(payload)
    if os.name != 'nt' or not command or len(command) > 4096:
        return False
    if has_broad_root_target(normalize_command(command)):
        return False  # Broad root/drive targets are permanently denied.
    try:
        request = {'command': command, 'cwd': str(payload.get('cwd') or os.getcwd())}
        encoded = base64.urlsafe_b64encode(json.dumps(request, ensure_ascii=False).encode()).decode()
        dialog = Path(__file__).with_name('ten_confirmation_dialog.py')
        if not dialog.is_file():
            return False
        subprocess.Popen([sys.executable, str(dialog), encoded], stdin=subprocess.DEVNULL,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         creationflags=getattr(subprocess, 'CREATE_NEW_CONSOLE', 0), shell=False)
        return True
    except Exception:
        return False


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        # Fail closed on malformed hook input. Hook failure can allow in some clients,
        # so emit explicit deny JSON and exit 0 instead of crashing.
        print(json.dumps(deny_payload(f"BLOCKED: malformed hook input. {REVIEW_TEXT}"), ensure_ascii=False))
        return 0

    if not isinstance(payload, dict):
        print(json.dumps(deny_payload('BLOCKED: hook input must be an object.'), ensure_ascii=False))
        return 0
    result = evaluate_payload(payload)
    # Emit the denial BEFORE starting any optional human interface. Console failure,
    # completion, cancellation, and forged approval fields can never unlock it.
    print(json.dumps(result, ensure_ascii=False), flush=True)
    if result.get('action') == 'block' and extract_command(payload):
        launch_human_review(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
