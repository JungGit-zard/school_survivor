<#
Serial five-slot scheduler entrypoint for Escape Zombie School social posting.
Runs one date-slot RunId through Facebook full four-language cycle first, then X full four-language cycle.
No live posting occurs with -ValidateOnly.
#>
[CmdletBinding()]
param(
  [string]$RunId = '',
  [string]$ReceiptRoot = '',
  [string]$FacebookRunnerPath = '',
  [string]$XRunnerPath = '',
  [switch]$ValidateOnly,
  [Parameter(DontShow=$true)][switch]$TestBypassSlotCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:FiveSlotTimes = @('02:00','06:00','11:00','17:00','21:00')
$script:Languages = @('ja','en','vi','ko')

function Get-FiveSlotRunId {
  param([DateTimeOffset]$NowKst)
  $eligible = @($script:FiveSlotTimes | Where-Object { [TimeSpan]::Parse($_) -le $NowKst.TimeOfDay })
  if ($eligible.Count -eq 0) { throw 'No current KST slot; never backfill before the first configured slot.' }
  $slot = $eligible[-1]
  $scheduled = [DateTimeOffset]::ParseExact($NowKst.ToString('yyyy-MM-dd') + ' ' + $slot + ' +09:00', 'yyyy-MM-dd HH:mm zzz', [Globalization.CultureInfo]::InvariantCulture)
  $age = $NowKst - $scheduled
  if ($age.TotalMinutes -lt 0 -or $age.TotalMinutes -gt 30) { throw 'Outside 30-minute schedule grace; never backfill.' }
  return $NowKst.ToString('yyyy-MM-dd-') + $slot.Replace(':','')
}

function Assert-FiveSlotRunId {
  param([Parameter(Mandatory)][string]$Value)
  if ($Value -notmatch '^\d{4}-\d{2}-\d{2}-(0200|0600|1100|1700|2100)$') {
    throw 'RunId must be exactly yyyy-MM-dd-HHmm for one of 02:00, 06:00, 11:00, 17:00, or 21:00 KST.'
  }
}

function Invoke-JsonRunner {
  param(
    [Parameter(Mandatory)][string]$ScriptPath,
    [Parameter(Mandatory)][object[]]$Arguments,
    [Parameter(Mandatory)][string]$Name
  )
  if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) { throw "$Name runner not found: $ScriptPath" }
  $ps = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
  if ([string]::IsNullOrWhiteSpace($ps)) { $ps = 'powershell' }
  $output = & $ps -NoProfile -STA -ExecutionPolicy Bypass -File $ScriptPath @Arguments 2>&1
  $exit = $LASTEXITCODE
  if ($exit -ne 0) { throw "$Name runner failed (exit $exit): $($output -join "`n")" }
  $lines = @($output | ForEach-Object { [string]$_ })
  $jsonLines = @($lines | Where-Object { $_.Trim().StartsWith('{') -or $_.Trim().StartsWith('[') })
  $jsonText = if ($jsonLines.Count -gt 0) { $jsonLines[-1] } else { ($lines -join "`n") }
  try { return ($jsonText | ConvertFrom-Json) } catch { throw "$Name runner returned non-JSON output: $($lines -join "`n")" }
}

function New-RunnerFailureResult {
  param(
    [Parameter(Mandatory)][string]$Platform,
    [Parameter(Mandatory)][string]$Message
  )
  return [pscustomobject]@{
    platform = $Platform
    status = 'failed'
    error = $Message
  }
}

function Invoke-ZombieSchoolFiveSlotPosting {
  param(
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][string]$ReceiptRoot,
    [Parameter(Mandatory)][string]$FacebookRunnerPath,
    [Parameter(Mandatory)][string]$XRunnerPath,
    [switch]$ValidateOnly,
    [switch]$TestBypassSlotCheck
  )
  Assert-FiveSlotRunId $RunId
  $facebookReceiptDirectory = Join-Path $ReceiptRoot 'facebook_posting_receipts'
  $xReceiptDirectory = Join-Path $ReceiptRoot 'x_posting_receipts'
  if ($ValidateOnly) {
    return [pscustomobject]@{
      status = 'validated_only'
      runId = $RunId
      slots = @($script:FiveSlotTimes)
      languages = @($script:Languages)
      order = @('facebook','x')
      facebookReceiptDirectory = [IO.Path]::GetFullPath($facebookReceiptDirectory)
      xReceiptDirectory = [IO.Path]::GetFullPath($xReceiptDirectory)
      uiTouched = $false
      published = 0
    }
  }
  [IO.Directory]::CreateDirectory($facebookReceiptDirectory) | Out-Null
  [IO.Directory]::CreateDirectory($xReceiptDirectory) | Out-Null
  $fbArgs = @('-RunId', $RunId, '-ReceiptDirectory', $facebookReceiptDirectory)
  if ($TestBypassSlotCheck) { $fbArgs += '-TestBypassSlotCheck' }
  $facebook = $null
  $x = $null
  $errors = @()
  try {
    $facebook = Invoke-JsonRunner -ScriptPath $FacebookRunnerPath -Arguments $fbArgs -Name 'Facebook full-cycle'
    if ($facebook.status -ne 'complete') { $errors += "Facebook full-cycle did not complete: $($facebook | ConvertTo-Json -Compress -Depth 6)" }
  } catch {
    $errors += $_.Exception.Message
    $facebook = New-RunnerFailureResult -Platform 'facebook' -Message $_.Exception.Message
  }
  $xArgs = @('-CycleId', $RunId, '-ReceiptDirectory', $xReceiptDirectory)
  try {
    $x = Invoke-JsonRunner -ScriptPath $XRunnerPath -Arguments $xArgs -Name 'X full-cycle'
    if ($x.status -ne 'complete') { $errors += "X full-cycle did not complete: $($x | ConvertTo-Json -Compress -Depth 6)" }
  } catch {
    $errors += $_.Exception.Message
    $x = New-RunnerFailureResult -Platform 'x' -Message $_.Exception.Message
  }
  $overallStatus = if ($errors.Count -eq 0) { 'complete' } else { 'partial_failed' }
  return [pscustomobject]@{
    status = $overallStatus
    runId = $RunId
    order = @('facebook','x')
    languages = @($script:Languages)
    facebook = $facebook
    x = $x
    errors = @($errors)
    facebookReceiptDirectory = [IO.Path]::GetFullPath($facebookReceiptDirectory)
    xReceiptDirectory = [IO.Path]::GetFullPath($xReceiptDirectory)
  }
}

if ([string]::IsNullOrWhiteSpace($RunId)) { $RunId = Get-FiveSlotRunId ([DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9))) }
Assert-FiveSlotRunId $RunId
if ([string]::IsNullOrWhiteSpace($ReceiptRoot)) { $ReceiptRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'Developer\agent_room' }
if ([string]::IsNullOrWhiteSpace($FacebookRunnerPath)) { $FacebookRunnerPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'marketing\facebook_daily_zombie_school_posting\Invoke-FacebookScheduledPosting.ps1' }
if ([string]::IsNullOrWhiteSpace($XRunnerPath)) { $XRunnerPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'marketing\x_daily_zombie_school_posting\Invoke-XDailyZombieSchoolPostingRecovery.ps1' }

$result = Invoke-ZombieSchoolFiveSlotPosting -RunId $RunId -ReceiptRoot ([IO.Path]::GetFullPath($ReceiptRoot)) -FacebookRunnerPath ([IO.Path]::GetFullPath($FacebookRunnerPath)) -XRunnerPath ([IO.Path]::GetFullPath($XRunnerPath)) -ValidateOnly:$ValidateOnly -TestBypassSlotCheck:$TestBypassSlotCheck
$result | ConvertTo-Json -Depth 10 -Compress
if ($result.status -ne 'complete' -and -not $ValidateOnly) { exit 1 }
