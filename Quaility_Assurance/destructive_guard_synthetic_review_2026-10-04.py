"""Synthetic classifier/payload checks only; never execute the command samples."""
import importlib.util
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
path = root / 'Developer/agent_room/guards/destructive_shell_deletion_guard.py'
spec = importlib.util.spec_from_file_location('guard_qa', path)
guard = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = guard
spec.loader.exec_module(guard)
blocked = [
    'cmd.exe /c rmdir /s /q D:\\', 'cmd /c rd /s cache',
    'Remove-Item -LiteralPath C:\\tmp -Recurse -Force',
    'rm -rf /', 'rm -f -r ./cache', 'cmd /c del /s /q cache\\*',
    'git clean -fdx', 'git.exe -n clean -fd', 'git rm file',
    'rm -rf /d/', 'rm -rf //d/', 'Remove-Item D:/ -Recurse',
    'Remove-Item \\\\?\\D:\\ -Recurse',
    'cmd.exe /c r^m^dir /s /q cache',
    'powershell -Command "cmd.exe /c rd /s cache"',
]
safe = ['git status --short --branch', 'Get-ChildItem .', 'Get-Content AGENTS.md', 'npm test', 'python -m unittest']
for command in blocked:
    assert guard.classify_command(command).blocked, command
for command in safe:
    assert not guard.classify_command(command).blocked, command
for event in ('PreToolUse', 'pre_tool_call'):
    for tool in ('Bash', 'PowerShell', 'terminal', 'shell_command', 'exec_command'):
        result = guard.evaluate_payload({'hook_event_name': event, 'tool_name': tool, 'tool_input': {'cmd': blocked[0]}})
        assert result.get('action') == 'block', (event, tool)
        assert result['hookSpecificOutput']['permissionDecision'] == 'deny'
for tool in ('Bash', 'PowerShell', 'terminal', 'shell_command'):
    assert guard.evaluate_payload({'tool_name': tool, 'tool_input': {}}).get('action') == 'block'
gaps = {
    'exec_command_without_event': guard.evaluate_payload({'tool_name': 'exec_command', 'tool_input': {'cmd': blocked[0]}}),
    'git_C_path_clean': guard.classify_command('git -C C:/work clean -fdx').blocked,
    'encoded_shell': guard.classify_command('powershell -EncodedCommand ZABlAGwA').blocked,
    'indirect_script': guard.classify_command('python destructive_script.py').blocked,
    'safe_documentation_false_positive': guard.classify_command('Write-Output "rm example"').blocked,
}
print(json.dumps({'blockedSamples': len(blocked), 'safeSamples': len(safe), 'payloadVariants': 10, 'gapObservations': gaps}, indent=2))
