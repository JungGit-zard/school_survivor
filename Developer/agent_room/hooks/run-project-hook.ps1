param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('resume', 'advisor', 'deletion', 'stage2', 'gstack')]
    [string] $Hook
)

$ErrorActionPreference = 'Stop'
$taskRepoRoot = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($taskRepoRoot)) {
    Write-Error 'Project hooks require a Git repository root.'
    exit 1
}
$taskRepoRoot = $taskRepoRoot.Trim()
$env:CODEX_PROJECT_DIR = $taskRepoRoot

switch ($Hook) {
    'resume' { & (Join-Path $taskRepoRoot '.codex/hooks/require-today-resume-summary.ps1') }
    'advisor' { & (Join-Path $taskRepoRoot 'Developer/agent_room/hooks/require-advisor-worker-mode.ps1') }
    'deletion' {
        & python (Join-Path $taskRepoRoot 'Developer/agent_room/guards/destructive_shell_deletion_guard.py')
        exit $LASTEXITCODE
    }
    'stage2' {
        & (Join-Path ${env:ProgramFiles} 'Git/bin/bash.exe') (Join-Path $taskRepoRoot '.codex/hooks/require-stage2-boss-v2-gate.sh')
        exit $LASTEXITCODE
    }
    'gstack' {
        & (Join-Path ${env:ProgramFiles} 'Git/bin/bash.exe') (Join-Path $taskRepoRoot '.codex/hooks/check-gstack.sh')
        exit $LASTEXITCODE
    }
}
