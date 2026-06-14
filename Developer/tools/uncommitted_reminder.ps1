param(
  [string[]]$RepoRoots = @(
    'D:\JungSil\2.Minigame_project\school_survivor',
    'D:\JungSil\2.Minigame_project\school_survivor-claude',
    'D:\JungSil\2.Minigame_project\school_survivor-integration'
  )
)

$ErrorActionPreference = 'SilentlyContinue'
$logDir = Join-Path $env:LOCALAPPDATA 'EscapeZombieSchool'
$logPath = Join-Path $logDir 'uncommitted-reminder.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-ReminderLog {
  param([string]$Text)
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $logPath -Value "[$stamp] $Text" -Encoding UTF8
}

function Get-RepoDirtySummary {
  param([string]$RepoRoot)

  if (-not (Test-Path -LiteralPath $RepoRoot)) { return $null }

  $inside = git -C $RepoRoot rev-parse --is-inside-work-tree 2>$null
  if ($inside -ne 'true') { return $null }

  $branch = git -C $RepoRoot branch --show-current 2>$null
  if ([string]::IsNullOrWhiteSpace($branch)) { $branch = '(detached)' }

  $statusLines = @(git -C $RepoRoot status --porcelain=v1 2>$null)
  if ($statusLines.Count -eq 0) { return $null }

  $modified = @($statusLines | Where-Object { $_ -match '^[ MARC][MD]' -or $_ -match '^M' }).Count
  $added = @($statusLines | Where-Object { $_ -match '^A' -or $_ -match '^[ MARC]A' }).Count
  $deleted = @($statusLines | Where-Object { $_ -match '^[ MARC]D' -or $_ -match '^D' }).Count
  $untracked = @($statusLines | Where-Object { $_ -match '^\?\? ' }).Count

  [pscustomobject]@{
    Name = Split-Path -Leaf $RepoRoot
    Path = $RepoRoot
    Branch = $branch
    Count = $statusLines.Count
    Modified = $modified
    Added = $added
    Deleted = $deleted
    Untracked = $untracked
  }
}

$dirtyRepos = @()
foreach ($repo in $RepoRoots) {
  $summary = Get-RepoDirtySummary -RepoRoot $repo
  if ($summary) { $dirtyRepos += $summary }
}

if ($dirtyRepos.Count -eq 0) {
  Write-ReminderLog 'Clean: no uncommitted changes in configured worktrees.'
  exit 0
}

$lines = @(
  'Escape! zombie school: uncommitted Git changes detected.',
  ''
)

foreach ($repo in $dirtyRepos) {
  $lines += "- $($repo.Name) [$($repo.Branch)]: $($repo.Count) changed (M:$($repo.Modified), A:$($repo.Added), D:$($repo.Deleted), ??:$($repo.Untracked))"
  $lines += "  $($repo.Path)"
}

$lines += ''
$lines += 'Check with: git status --short --branch'
$message = $lines -join [Environment]::NewLine

Write-ReminderLog ($message -replace [Environment]::NewLine, ' | ')

$msgExe = Join-Path $env:WINDIR 'System32\msg.exe'
if (Test-Path -LiteralPath $msgExe) {
  & $msgExe $env:USERNAME /time:60 $message | Out-Null
  if ($LASTEXITCODE -eq 0) { exit 0 }
}

try {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($message, 'Uncommitted Git Changes') | Out-Null
} catch {
  Write-ReminderLog 'Notification UI failed; log-only reminder was recorded.'
}
