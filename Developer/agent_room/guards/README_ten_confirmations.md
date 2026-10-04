# Three terminal reviews (supersedes ten-token GUI)

Latest explicit user request replaces ten CONFIRM tokens and Tk popup with
three simple terminal questions. Legacy filenames remain for compatibility.

The guard denies first, then launches CREATE_NEW_CONSOLE with shell=False.
CONIN$/CONOUT$ are opened explicitly rather than taking answers from hook stdin.
The exact command and cwd appear before `[1/3] 할 거예요? [y/N]:`.
Enter y (or yes, 예, 네) each time. Blank/no/arbitrary/bulk answers, EOF, Ctrl+C,
and window close cancel. A final Enter only closes the result window; it is
not a fourth confirmation. A named mutex suppresses duplicate exact requests.

IMPORTANT: three human reviews DO NOT execute/unlock destructive shell commands.
There is no executable shell, persistent grant, or authenticated approval broker.
Root/drive targets stay denied without launching a terminal. Non-Windows hook
calls stay denied without an automatic window. Same-account agents and shell
regex matching are not OS isolation; scripts/APIs outside hooks remain gaps.
Existing canonical script references inherit the change; no profile was modified.
Normal host hook trust/restart may still be needed. No real deletion tests.

Tests:
    python Developer/agent_room/guards/test_destructive_shell_deletion_guard.py
    python Developer/agent_room/guards/test_ten_confirmation_dialog.py
