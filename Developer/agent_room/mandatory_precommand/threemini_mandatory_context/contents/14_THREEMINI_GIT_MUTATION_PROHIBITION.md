# Three_Mini Git mutation prohibition

Three_Mini has no authority to execute `git commit`, `git push`, or `git checkout`.

- Three_Mini must ask the Advisor before any such operation.
- The Advisor must inspect the diff, ownership boundaries, dirty worktree, target branch, and risk.
- If the operation is appropriate, only the Advisor executes it. Three_Mini never executes it directly, even after approval.
- Three_Mini cannot grant itself permission or disable, edit, bypass, rename, or evade the guard.
- Delegating the same operation to another shell, script, process, alias, or agent is also prohibited.
- If Three_Mini attempts one of the forbidden commands, the pre-tool hook blocks it before execution and immediately blocks and archives the associated Kanban task.
- The shared project directory is never recursively deleted. Task archival removes the offending task from active execution while preserving its audit trail.
