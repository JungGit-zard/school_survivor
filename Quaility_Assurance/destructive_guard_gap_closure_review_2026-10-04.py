"""Independent synthetic QA for t_bc09f049 deletion-guard gap closure.

This script never executes the sample commands. It imports the guard and feeds
strings/payload dictionaries into classifier/evaluator functions only.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
GUARD_PATH = ROOT / "Developer/agent_room/guards/destructive_shell_deletion_guard.py"

spec = importlib.util.spec_from_file_location("guard_gap_closure_qa", GUARD_PATH)
guard = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = guard
spec.loader.exec_module(guard)

blocked_samples = [
    "git --git-dir=C:/work/.git --work-tree=C:/work clean -fdx",
    "git -c alias.x=!rm -rf / clean -fdx",
    "git -C \"C:/work tree\" --work-tree \"C:/other tree\" rm file.txt",
    "git.exe -C C:/work -c core.quotePath=false clean -fdx",
    "cmd.exe /c rmdir /s /q D:\\",
]

safe_samples = [
    "git --git-dir=C:/work/.git --work-tree=C:/work status --short",
    "git -C \"C:/work tree\" log --oneline -1",
    "python -m py_compile Developer/agent_room/guards/destructive_shell_deletion_guard.py",
]

sample_results = []
for command in blocked_samples:
    decision = guard.classify_command(command)
    sample_results.append({"command": command, "blocked": decision.blocked, "reason": decision.reason})
    assert decision.blocked, command

for command in safe_samples:
    decision = guard.classify_command(command)
    sample_results.append({"command": command, "blocked": decision.blocked, "reason": decision.reason})
    assert not decision.blocked, command

payload_keys = ["cmd", "command", "bash", "powershell", "script"]
for key in payload_keys:
    result = guard.evaluate_payload({
        "tool_name": "exec_command",
        "tool_input": {key: "git -C C:/work clean -fdx"},
    })
    assert result.get("action") == "block", key
    assert result["hookSpecificOutput"]["permissionDecision"] == "deny", key

hooks_path = Path("C:/Users/admin/.codex/hooks.json")
hooks = json.loads(hooks_path.read_text(encoding="utf-8"))
matchers = [entry.get("matcher", "") for entry in hooks.get("hooks", {}).get("PreToolUse", [])]
required = {"Bash", "PowerShell", "shell_command", "terminal", "exec_command"}
seen = set()
for matcher in matchers:
    seen.update(part for part in re.split(r"\|", matcher) if part)
missing = sorted(required - seen)
assert not missing, missing

print(json.dumps({
    "independentBlocked": len(blocked_samples),
    "independentSafe": len(safe_samples),
    "payloadKeys": payload_keys,
    "globalCodexMatchers": matchers,
    "globalCodexMissing": missing,
    "sampleResults": sample_results,
}, ensure_ascii=False, indent=2))
