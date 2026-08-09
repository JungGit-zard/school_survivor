param()

$ErrorActionPreference = "Stop"

$ProjectRoot = "D:/JungSil/2.Minigame_project/school_survivor-integration"
$OperationsDir = Join-Path $ProjectRoot "Developer/agent_room/operations"
$LogDir = Join-Path $OperationsDir "logs"
$LogPath = Join-Path $LogDir "jabdareminder_hourly_subagent_routing_monitor.log"
$LastStatusPath = Join-Path $OperationsDir "jabdareminder_hourly_subagent_routing_monitor.last.json"
$HermesExe = "C:/Users/admin/AppData/Local/hermes/hermes-agent/venv/Scripts/hermes.exe"
$RequiredProfiles = @(
  "threemini",
  "uimini",
  "levelmini",
  "balanceqa",
  "bizmini",
  "launchmini",
  "backendmini",
  "englishgradmini",
  "madangsue",
  "jabdareminder",
  "soundmini",
  "corpopsmini"
)

function New-CheckResult {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Detail,
    [string]$Severity = "critical"
  )
  [pscustomobject]@{
    name = $Name
    ok = $Ok
    severity = $Severity
    detail = $Detail
  }
}

function ConvertTo-ProcessArgumentString {
  param([string[]]$ArgumentList)
  $quoted = foreach ($arg in $ArgumentList) {
    if ($null -eq $arg) { '""'; continue }
    if ($arg -notmatch '[\s"]') { $arg; continue }
    '"' + ($arg -replace '([\\]*)"', '$1$1\"' -replace '([\\]+)$', '$1$1') + '"'
  }
  $quoted -join ' '
}

function Invoke-Captured {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory = $ProjectRoot
  )
  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $FilePath
  $psi.Arguments = ConvertTo-ProcessArgumentString -ArgumentList $ArgumentList
  $psi.WorkingDirectory = $WorkingDirectory
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  [pscustomobject]@{
    exit_code = $p.ExitCode
    stdout = $stdout
    stderr = $stderr
  }
}

New-Item -ItemType Directory -Force -Path $OperationsDir, $LogDir | Out-Null
$started = Get-Date
$checks = New-Object System.Collections.Generic.List[object]
$limitations = New-Object System.Collections.Generic.List[string]

$paths = @(
  "AGENTS.md",
  "Bang_Rules.md",
  "CLAUDE.md",
  "project_develop_policy.md",
  "SESSION_CONTINUITY.md",
  "SESSION_MEMORY.md",
  "Developer/agent_room/mandatory_precommand/README.md",
  "Developer/agent_room/mandatory_precommand/manifest.json",
  "Developer/agent_room/mandatory_precommand/check-required-documents.ps1",
  "Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md",
  "Developer/agent_room/game_development_kanban_process.md",
  "Developer/agent_room/subagent_system_wiring_2026-07-03.md",
  "Developer/agent_room/ide_agent_subagent_autocall_handoff.md",
  "Developer/agent_room/escape_zombie_school_subagent_autoinput_handoff_2026-07-17.md",
  "Developer/agent_room/antigravity_ide_subagent_handoff.md",
  ".claude/settings.json",
  ".claude/hooks/require-subagent-routing-for-project.sh",
  ".claude/hooks/require-subagent-routing-for-prompt.sh"
)

foreach ($rel in $paths) {
  $full = Join-Path $ProjectRoot $rel
  $checks.Add((New-CheckResult -Name "path:$rel" -Ok (Test-Path -LiteralPath $full) -Detail $full))
}

$settingsPath = Join-Path $ProjectRoot ".claude/settings.json"
if (Test-Path -LiteralPath $settingsPath) {
  $settings = Get-Content -Raw -LiteralPath $settingsPath
  $hasPrecommand = $settings -like "*mandatory_precommand/check-required-documents.ps1*"
  $hasRoutingHook = $settings -like "*require-subagent-routing-for-project.sh*"
  $hasUserPromptRoutingHook = ($settings -like "*UserPromptSubmit*") -and ($settings -like "*require-subagent-routing-for-prompt.sh*")
  $checks.Add((New-CheckResult -Name "hook-config:mandatory-precommand" -Ok $hasPrecommand -Detail ".claude/settings.json references mandatory_precommand/check-required-documents.ps1"))
  $checks.Add((New-CheckResult -Name "hook-config:subagent-routing" -Ok $hasRoutingHook -Detail ".claude/settings.json references require-subagent-routing-for-project.sh"))
  $checks.Add((New-CheckResult -Name "hook-config:user-prompt-submit-routing" -Ok $hasUserPromptRoutingHook -Detail ".claude/settings.json UserPromptSubmit references require-subagent-routing-for-prompt.sh"))
}

$checkerPath = Join-Path $ProjectRoot "Developer/agent_room/mandatory_precommand/check-required-documents.ps1"
if (Test-Path -LiteralPath $checkerPath) {
  $pre = Invoke-Captured -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $checkerPath,
    "-Profile", "jabdareminder",
    "-Domain", "auto",
    "-TaskSummary", "hourly-subagent-routing-monitor"
  )
  $preOk = $pre.exit_code -eq 0
  $preDetail = ($pre.stdout + $pre.stderr).Trim()
  $checks.Add((New-CheckResult -Name "mandatory-precommand-checker" -Ok $preOk -Detail $preDetail))
  if ($preOk) {
    try {
      $preJson = $pre.stdout | ConvertFrom-Json
      $matched = @($preJson.matched_domains) -join ","
      $evidence = ($preJson.match_evidence | ConvertTo-Json -Compress)
      $checks.Add((New-CheckResult -Name "mandatory-precommand-domain-match" -Ok ($matched -like "*operations*") -Detail "matched_domains=$matched; match_evidence=$evidence; combined_receipt_sha256=$($preJson.combined_receipt_sha256)"))
    } catch {
      $checks.Add((New-CheckResult -Name "mandatory-precommand-json-parse" -Ok $false -Detail $_.Exception.Message))
    }
  }
}

$checks.Add((New-CheckResult -Name "hermes-exe" -Ok (Test-Path -LiteralPath $HermesExe) -Detail $HermesExe))

$kanbanStats = $null
$kanbanAssignees = $null
$hermesStatus = $null
$gatewayStatus = $null
if (Test-Path -LiteralPath $HermesExe) {
  $kanbanStats = Invoke-Captured -FilePath $HermesExe -ArgumentList @("kanban", "--board", "escape-zombie-school", "stats")
  $checks.Add((New-CheckResult -Name "kanban-board:stats" -Ok ($kanbanStats.exit_code -eq 0) -Detail (($kanbanStats.stdout + $kanbanStats.stderr).Trim())))

  $kanbanAssignees = Invoke-Captured -FilePath $HermesExe -ArgumentList @("kanban", "--board", "escape-zombie-school", "assignees")
  $assigneeText = ($kanbanAssignees.stdout + $kanbanAssignees.stderr)
  $checks.Add((New-CheckResult -Name "kanban-board:assignees" -Ok ($kanbanAssignees.exit_code -eq 0) -Detail $assigneeText.Trim()))
  if ($kanbanAssignees.exit_code -eq 0) {
    foreach ($profile in $RequiredProfiles) {
      $present = $assigneeText -match "(?m)^$([regex]::Escape($profile))\s+yes\b"
      $checks.Add((New-CheckResult -Name "assignee:on-disk:$profile" -Ok $present -Detail "Expected real profile '$profile' with ON DISK yes in escape-zombie-school assignees."))
    }
  }

  $hermesStatus = Invoke-Captured -FilePath $HermesExe -ArgumentList @("status", "--all")
  $statusText = ($hermesStatus.stdout + $hermesStatus.stderr)
  $checks.Add((New-CheckResult -Name "hermes-status-command" -Ok ($hermesStatus.exit_code -eq 0) -Detail $statusText.Trim()))
  if ($hermesStatus.exit_code -eq 0) {
    $codexReady = $statusText -match "OpenAI Codex\s+.*logged in"
    $localBackend = $statusText -match "Backend:\s+local"
    $checks.Add((New-CheckResult -Name "hermes-routing:openai-codex-auth" -Ok $codexReady -Detail "OpenAI Codex OAuth should be logged in for configured provider."))
    $checks.Add((New-CheckResult -Name "hermes-routing:terminal-backend-local" -Ok $localBackend -Detail "Terminal backend should be local for Windows scheduled audit."))
  }

  $gatewayStatus = Invoke-Captured -FilePath $HermesExe -ArgumentList @("gateway", "status")
  $gatewayText = ($gatewayStatus.stdout + $gatewayStatus.stderr)
  $checks.Add((New-CheckResult -Name "hermes-gateway-status-command" -Ok ($gatewayStatus.exit_code -eq 0) -Detail $gatewayText.Trim()))
  if ($gatewayStatus.exit_code -eq 0) {
    $gatewayPidMatches = [regex]::Matches($gatewayText, "PID\s+(\d+)")
    $gatewayPids = @($gatewayPidMatches | ForEach-Object { [int]$_.Groups[1].Value } | Sort-Object -Unique)
    $runningGatewayPids = @()
    foreach ($gatewayPid in $gatewayPids) {
      $proc = Get-Process -Id $gatewayPid -ErrorAction SilentlyContinue
      if ($null -ne $proc) { $runningGatewayPids += $gatewayPid }
    }
    $gatewayPidText = if ($gatewayPids.Count -gt 0) { $gatewayPids -join ", " } else { "<none>" }
    $runningGatewayPidText = if ($runningGatewayPids.Count -gt 0) { $runningGatewayPids -join ", " } else { "<none>" }
    $checks.Add((New-CheckResult -Name "hermes-gateway:actual-process-running" -Ok ($runningGatewayPids.Count -gt 0) -Detail ("PIDs reported by 'hermes gateway status': {0}; running PIDs: {1}" -f $gatewayPidText, $runningGatewayPidText)))
  }

  try {
    $scheduledGatewayTask = Get-ScheduledTask -TaskName "Hermes_Gateway" -ErrorAction Stop
    $checks.Add((New-CheckResult -Name "windows-task:Hermes_Gateway-running" -Ok ($scheduledGatewayTask.State -eq "Running") -Detail ("Hermes_Gateway Scheduled Task state={0}" -f $scheduledGatewayTask.State)))
  } catch {
    $checks.Add((New-CheckResult -Name "windows-task:Hermes_Gateway-running" -Ok $false -Detail $_.Exception.Message))
  }
}

$criticalFailures = @($checks | Where-Object { -not $_.ok -and $_.severity -eq "critical" })
$result = if ($criticalFailures.Count -eq 0) { "PASS" } else { "FAIL" }
$finished = Get-Date

$status = [pscustomobject]@{
  result = $result
  started_at = $started.ToString("o")
  finished_at = $finished.ToString("o")
  project_root = $ProjectRoot
  board = "escape-zombie-school"
  task_name = "EscapeZombieSchool-Hourly-Subagent-Routing-Monitor"
  script_path = (Join-Path $OperationsDir "jabdareminder_hourly_subagent_routing_monitor.ps1")
  log_path = $LogPath
  last_status_path = $LastStatusPath
  checks = $checks
  limitations = $limitations
}

$status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $LastStatusPath -Encoding UTF8
$summaryLine = "{0}`t{1}`tchecks={2}`tfailures={3}`tlast_status={4}" -f $finished.ToString("yyyy-MM-dd HH:mm:ssK"), $result, $checks.Count, $criticalFailures.Count, $LastStatusPath
Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value $summaryLine

if ($result -eq "PASS") {
  Write-Output $summaryLine
  exit 0
}

Write-Output $summaryLine
foreach ($failure in $criticalFailures) {
  Write-Output ("FAIL {0}: {1}" -f $failure.name, $failure.detail)
}
exit 1
