# Destructive shell deletion guard incident prevention · 2026-10-04

## Incident classification

- 2026-10-03 23:17 KST unauthorized deletion impact is classified as a critical internal agent-safety bug with hacking-class project impact; Korean acceptance wording: `해킹으로 분류`.
- This classification records the impact and required prevention boundary. It is not proof of an external attacker or account compromise.
- The trigger class was a malformed nested PowerShell/cmd.exe cleanup command intended for `marketing/google_playstore_image/store_20261003/__pycache__` whose quoting could traverse toward broad drive/root paths.

## User order preserved

- Never allow that action again.
- Require TEN separate explicit user approvals before ANY destructive cleanup.
- Because Codex/Claude/Hermes hook layers cannot reliably collect ten independent prompts inside a pre-execution hook, the implemented policy is deny outright and report the ten-confirmation requirement.
- No automatic bypass is allowed.
- Tests must never execute destructive probes; only synthetic JSON/string classification is allowed.

## Implemented guard

- Guard script: `Developer/agent_room/guards/destructive_shell_deletion_guard.py`
- Synthetic test harness: `Developer/agent_room/guards/test_destructive_shell_deletion_guard.py`
- Codex hook wiring: `.codex/hooks.json` PreToolUse for `Bash|PowerShell|shell_command`, inserted before the existing Stage 2 boss gate.
- Claude hook wiring: `.claude/settings.json` PreToolUse for `Bash|PowerShell|shell_command`, inserted before existing mandatory-precommand and Stage 2 boss gates.
- Hermes live profile wiring: `C:/Users/admin/AppData/Local/hermes/config.yaml` plus registered mini profiles `backendmini`, `bizmini`, `englishgradmini`, `jabdareminder`, `corpopsmini`, `launchmini`, `levelmini`, `balanceqa`, `uimini`, `threemini`, `madangsue`, and `soundmini` now have `hooks.pre_tool_call` terminal guard entries. Existing `threemini` git mutation guard was preserved after this guard.
- Codex user-global hook wiring: `C:/Users/admin/.codex/hooks.json` now has a user-level `PreToolUse` guard for `Bash|PowerShell|shell_command`; because Codex hook-definition changes require trust/restart, current already-running Codex sessions may need user trust/restart before that global hook is active.
- Codex direct-command rules second layer: `C:/Users/admin/.codex/rules/default.rules` now forbids direct destructive command prefixes such as `rm`, `rmdir`, `rd`, `del`, `erase`, `Remove-Item`, `git clean`, and `git rm`. Rules load at Codex startup and do not replace full-string PreToolUse inspection.

## Blocked command classes

- `cmd.exe` / `cmd` `rmdir` or `rd`, especially recursive `/s` forms.
- PowerShell `Remove-Item` / aliases, including both recursive `-Recurse` and single-file delete forms, because policy requires TEN approvals before any cleanup.
- POSIX `rm`, including `rm -rf` / equivalent combined recursive-force flags and single-file deletion.
- `cmd del` / `erase`, including recursive `/s`.
- `git clean` and `git rm`.
- Deletion commands aimed at broad drive/root targets such as `/`, `D:\`, `D:/`, `/d/`, or `//d/`.

## Hook semantics

- The guard emits fail-closed deny JSON with both `permissionDecision: "deny"` and `action: "block"` so Codex/Claude-style PreToolUse and Hermes pre_tool_call can both understand the denial path.
- It exits `0` after printing explicit denial JSON. This avoids hook failure being treated as allow by clients where hook errors are not fail-closed.
- It never emits `ask` because task requirements state ask is unsupported/unreliable for this path.

## Verification performed

- RED first: `python Developer/agent_room/guards/test_destructive_shell_deletion_guard.py` failed before guard implementation because the guard file did not exist.
- GREEN: same command passed after implementation.
- Compile: `python -m py_compile Developer/agent_room/guards/destructive_shell_deletion_guard.py Developer/agent_room/guards/test_destructive_shell_deletion_guard.py` passed.
- Direct synthetic hook probes were run with JSON stdin only; no destructive shell command was executed.

## Coverage limitations

- This guard covers agent shell tool commands that pass through Codex/Claude PreToolUse or Hermes `pre_tool_call` terminal hooks for the wired profiles above.
- User-global Codex hook and Codex rules may require new/restarted sessions and normal Codex hook trust flow; this card did not forge trust hashes.
- It does not change OS ACLs, filesystem permissions, Git history, Play/Firebase state, browser state, or recovery files.
- It does not claim that ten-prompt automation is implemented. The supported behavior is deny outright and report the ten-confirmation requirement.
- Hermes coverage was applied to the observed registered profiles listed above; any future newly-created Hermes profile must receive the same hook before use.
