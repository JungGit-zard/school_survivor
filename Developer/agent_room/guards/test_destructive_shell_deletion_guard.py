#!/usr/bin/env python
"""Synthetic tests for destructive shell deletion guard.

These tests do not execute destructive commands. They only feed command strings into
classifier helpers and the hook JSON entrypoint.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
GUARD_PATH = ROOT / "Developer" / "agent_room" / "guards" / "destructive_shell_deletion_guard.py"


def load_guard():
    spec = importlib.util.spec_from_file_location("destructive_shell_deletion_guard", GUARD_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


DESTRUCTIVE_CASES = [
    (
        "logged malformed cmd rmdir incident",
        "powershell -NoProfile -Command \"cmd.exe /c \"rmdir /s /q marketing\\google_playstore_image\\store_20261003\\__pycache__\"\"",
        "cmd rmdir recursive",
    ),
    ("cmd rd recursive", "cmd.exe /c rd /s /q C:\\tmp\\cache", "cmd rmdir recursive"),
    ("powershell remove item recurse", "PowerShell -Command Remove-Item -LiteralPath C:\\tmp\\cache -Recurse -Force", "PowerShell Remove-Item -Recurse"),
    ("rm rf", "bash -lc 'rm -rf ./dist-cache'", "rm -rf"),
    ("del slash s", "cmd /c del /s /q build\\*.tmp", "cmd del /s"),
    ("git clean", "git clean -fdx", "git clean"),
    ("git rm", "git rm cached-file.txt", "git rm deletion"),
    ("drive root target", "cmd.exe /c rmdir /s /q D:\\", "broad root/drive target"),
    ("posix root target", "rm -rf /", "broad root/drive target"),
    ("single file rm blocked by three review policy", "rm -f ./single-file.tmp", "rm deletion command"),
    (
        "single file powershell remove item blocked by three review policy",
        "Remove-Item -LiteralPath $env:TEMP\\single-file.tmp -Force -ErrorAction SilentlyContinue",
        "PowerShell Remove-Item deletion command",
    ),
]


BENIGN_CASES = [
    "git status --short --branch",
    "python -m py_compile Developer/agent_room/guards/destructive_shell_deletion_guard.py",
    "powershell -NoProfile -Command Get-ChildItem .",
    "cmd.exe /c dir D:\\JungSil\\2.Minigame_project",
]


def assert_official_deny_shapes(result):
    assert result["hookSpecificOutput"]["hookEventName"] == "PreToolUse"
    assert result["hookSpecificOutput"]["permissionDecision"] == "deny"
    assert "BLOCKED" in result["hookSpecificOutput"]["permissionDecisionReason"]
    assert result["decision"] == "block"
    assert result["permissionDecision"] == "deny"
    assert result["action"] == "block"
    assert result["reason"] == result["message"]


def test_destructive_patterns_are_blocked():
    guard = load_guard()
    for name, command, expected_reason in DESTRUCTIVE_CASES:
        decision = guard.classify_command(command)
        assert decision.blocked, name
        assert expected_reason in decision.reason, (name, decision.reason)


def test_benign_reads_are_allowed():
    guard = load_guard()
    for command in BENIGN_CASES:
        decision = guard.classify_command(command)
        assert not decision.blocked, (command, decision.reason)


def test_hook_payload_blocks_terminal_command_with_fail_closed_json():
    guard = load_guard()
    payload = {
        "hook_event_name": "pre_tool_call",
        "tool_name": "terminal",
        "tool_input": {"command": "cmd.exe /c rd /s /q C:\\tmp\\cache"},
    }
    result = guard.evaluate_payload(payload)
    assert_official_deny_shapes(result)
    assert "THREE terminal" in result["message"]


def test_codex_claude_bash_payload_shape_blocks():
    guard = load_guard()
    payload = {
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "tool_input": {"command": "git clean -fdx"},
    }
    result = guard.evaluate_payload(payload)
    assert_official_deny_shapes(result)


def test_unrelated_payload_allows_empty_json():
    guard = load_guard()
    assert guard.evaluate_payload({"tool_name": "Read", "tool_input": {"file_path": "AGENTS.md"}}) == {}


def test_git_global_option_operands_cannot_bypass():
    guard = load_guard()
    for command in [
        "git -C C:/work clean -fdx",
        'git -C "C:/work tree" clean -fdx',
        "git -C 'C:/work tree' -c core.bare=false clean -fdx",
        "git --git-dir C:/work/.git --work-tree C:/work rm file.txt",
        "git.exe -C C:/work -C nested clean -fdx",
        "git -c core.bare=false rm file.txt",
        'git -C "C:/work&tree" clean -fdx',
        'git -C "C:/work;tree" clean -fdx',
        "git -C 'C:/work&tree' clean -fdx",
        "git -C 'C:/work;tree' clean -fdx",
    ]:
        assert guard.classify_command(command).blocked, command
    for command in [
        "git -C C:/work status", "git -C C:/work log", "git -c core.bare=false status",
        'git -C "C:/work&tree" status', 'git -C "C:/work;tree" status',
        "git -C 'C:/work&tree' status", "git -C 'C:/work;tree' status",
    ]:
        assert not guard.classify_command(command).blocked, command


def test_eventless_exec_command_is_guarded():
    guard = load_guard()
    assert_official_deny_shapes(guard.evaluate_payload({
        "tool_name": "exec_command", "tool_input": {"cmd": "git -C C:/work clean -fdx"},
    }))
    assert_official_deny_shapes(guard.evaluate_payload({"tool_name": "exec_command", "tool_input": {}}))
    assert guard.evaluate_payload({"tool_name": "exec_command", "tool_input": {"cmd": "git status"}}) == {}


if __name__ == "__main__":
    for test in [
        test_destructive_patterns_are_blocked,
        test_benign_reads_are_allowed,
        test_hook_payload_blocks_terminal_command_with_fail_closed_json,
        test_codex_claude_bash_payload_shape_blocks,
        test_unrelated_payload_allows_empty_json,
        test_git_global_option_operands_cannot_bypass,
        test_eventless_exec_command_is_guarded,
    ]:
        test()
        print(f"PASS {test.__name__}")
