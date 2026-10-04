# Ten independent human reviews / fail-closed deletion harness

User request: prevent recurrence of the Hypatia store-image cleanup incident; require ten separate Terry confirmations and push the harness to GitHub.

## Enforced behavior

The hook classifies destructive shell strings, emits explicit deny JSON first, and keeps raw shell execution denied regardless of UI result, approval fields, or external counter files. On Windows, a bounded non-root attempt launches a separate local desktop dialog with the exact command, working directory, and SHA-256 request fingerprint. The dialog requires ten sequential fresh CONFIRM tokens. Nine steps, a bulk answer, a replayed token, cancellation, window close, timeout, missing Tk, or a launcher error cannot authorize execution. No deletion or shell execution code exists in the collector. Broad drive/root targets do not launch a confirmation dialog: they remain permanently blocked.

The dialog is on the Windows PC, NOT this Telegram chat. It collects human review, NOT cryptographically authenticated Terry approval. A same-account agent with desktop/file access is not isolated from the user. Therefore even ten collected reviews NEVER unlock raw shell commands. An authenticated approval broker with separate privileges is required before any execution exception can safely be implemented. No such broker is claimed here.

## Wiring

.codex/hooks.json and .claude/settings.json register the guard first for Bash, PowerShell, shell_command, terminal, and exec_command. Existing hooks are preserved. Previously configured Hermes/global hook references to the canonical guard inherit the updated script; no other Hermes profile was edited in this task. Existing Codex/Claude sessions may need normal hook trust/restart before newly registered settings apply. No restart or trust bypass was performed.

## Tests

Run from the canonical repository:

    python Developer/agent_room/guards/test_destructive_shell_deletion_guard.py
    python Developer/agent_room/guards/test_ten_confirmation_dialog.py

Five prior synthetic guard tests plus eleven new ceremony/deny tests passed. A real Windows Tk root creation/update/destruction smoke check passed. No real destructive probes, actual approval collection, deployment, posting, Firebase changes, or process shutdown occurred. The game needs no build for these Python hooks.

## Limits

Shell text matching is not an OS sandbox and is not a universal parser. Encoded programs, script-file contents, arbitrary Python/Node filesystem APIs, processes not passing through these hooks, edits to the guard, and hooks not trusted by the host are not comprehensively contained. Long commands above 4096 characters or non-Windows environments receive denial without a dialog. Do not claim that every possible deletion path is prevented. There is no CLI approve/count override or persistent grant file.

## Routing and scope

Kanban board escape-zombie-school card t_37905d3f assigned to madangsue records safety operations and the authentication boundary. Reuse decision: madangsue operations, balanceqa acceptance. Orca is reachable, but supervised start is blocked by no_active_sender_terminal from the Telegram shell; no other terminal identity was impersonated and no worker output is claimed. The card stays blocked for trusted approval-broker integration. Only harness scripts, focused tests, hook wiring, existing safety policy and incident documentation are staged. Unrelated recovery/game changes are preserved.
