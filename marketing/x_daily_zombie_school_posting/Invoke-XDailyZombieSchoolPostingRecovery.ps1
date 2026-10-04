[CmdletBinding()]
param(
  [string]$CycleId,
  [string]$ReceiptDirectory = (Join-Path $PSScriptRoot 'receipts'),
  [string]$ReportDirectory = (Join-Path $PSScriptRoot 'reports'),
  [int]$MaxAttempts = 16,
  [int]$RetryDelaySeconds = 300,
  [int]$MaxRunMinutes = 75,
  [switch]$TestOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingReceipt.ps1')

function Get-XRecoveryStopReason([string]$Output) {
  if ($Output -match '(?i)UNCERTAIN|No second click|publish clicked once') { return 'uncertain_publish' }
  if ($Output -match '(?i)Authentication|Sign in|Log in|Verify your identity|passkey|Windows Security|signed-in @jungsilx|Unexpected account') { return 'authentication_or_security' }
  if ($Output -match '(?i)Expected one existing Chrome X window|Target is not Chrome|invalid explicit HWND') { return 'unsafe_desktop_target' }
  return $null
}

function Get-XRecoveryCycleEnd([string]$Id, [string[]]$ScheduleTimes) {
  if ($Id -notmatch '^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})$') { throw 'Recovery requires a date-and-slot cycle ID.' }
  $date = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
  $slot = "$($Matches[2]):$($Matches[3])"
  $times = @($ScheduleTimes | Sort-Object)
  $index = [array]::IndexOf($times, $slot)
  if ($index -lt 0) { throw 'CycleId must use a configured schedule time.' }
  $next = if ($index -lt ($times.Count - 1)) { $times[$index + 1] } else { $times[0] }
  $endDate = if ($index -lt ($times.Count - 1)) { $date } else { $date.AddDays(1) }
  return [DateTimeOffset]::ParseExact("$($endDate.ToString('yyyy-MM-dd')) $next +09:00", 'yyyy-MM-dd HH:mm zzz', [Globalization.CultureInfo]::InvariantCulture)
}

function Test-XRecoveryCompleteReceipt([string]$CycleId, [string]$ReceiptDirectory) {
  $path = Join-Path $ReceiptDirectory ($CycleId + '.json')
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  try { return (Test-CycleComplete (Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json)) }
  catch { return $false }
}

function Invoke-XPostingCycleRecovery {
  param(
    [Parameter(Mandatory)][string]$CycleId,
    [Parameter(Mandatory)][DateTimeOffset]$Now,
    [int]$MaxAttempts = 16,
    [int]$RetryDelaySeconds = 300,
    [int]$MaxRunMinutes = 75,
    [string[]]$ScheduleTimes = @('02:00','06:00','11:00','17:00','21:00'),
    [Parameter(Mandatory)][scriptblock]$RunCycle,
    [scriptblock]$TestComplete = { param($id) $true },
    [scriptblock]$Sleep = { param($seconds) Start-Sleep -Seconds $seconds }
  )
  if ($MaxAttempts -lt 1 -or $RetryDelaySeconds -lt 1 -or $MaxRunMinutes -lt 1) { throw 'Retry limits must be positive.' }
  $cycleEnd = Get-XRecoveryCycleEnd $CycleId $ScheduleTimes
  $deadline = @($cycleEnd, $Now.AddMinutes($MaxRunMinutes) | Sort-Object)[0]
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $response = & $RunCycle $CycleId $attempt
    $output = [string]$response.output
    if ($response.exitCode -eq 0 -and $output -match '"status"\s*:\s*"complete"') {
      if (& $TestComplete $CycleId) { return [pscustomobject]@{ status='complete'; cycleId=$CycleId; attempts=$attempt; deadline=$deadline.ToString('o'); output=$output } }
      return [pscustomobject]@{ status='stopped_unsafe'; cycleId=$CycleId; attempts=$attempt; reason='receipt_not_complete'; deadline=$deadline.ToString('o'); output=$output }
    }
    $stopReason = Get-XRecoveryStopReason $output
    if ($null -ne $stopReason) {
      return [pscustomobject]@{ status='stopped_unsafe'; cycleId=$CycleId; attempts=$attempt; reason=$stopReason; deadline=$deadline.ToString('o'); output=$output }
    }
    if ($attempt -eq $MaxAttempts -or [DateTimeOffset]::Now.ToOffset([TimeSpan]::FromHours(9)).AddSeconds($RetryDelaySeconds) -ge $deadline) {
      return [pscustomobject]@{ status='retry_exhausted'; cycleId=$CycleId; attempts=$attempt; reason='retry_limit_or_slot_end'; deadline=$deadline.ToString('o'); output=$output }
    }
    & $Sleep $RetryDelaySeconds
  }
}

function Write-XDailyPostingReport {
  param([Parameter(Mandatory)]$Recovery, [Parameter(Mandatory)][string]$ReceiptDirectory, [Parameter(Mandatory)][string]$ReportDirectory)
  $date = $Recovery.cycleId.Substring(0, 10)
  $receiptPath = Join-Path $ReceiptDirectory ($Recovery.cycleId + '.json')
  $receipt = if (Test-Path -LiteralPath $receiptPath) { Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
  $verified = @()
  if ($null -ne $receipt -and $null -ne $receipt.entries) {
    foreach ($language in @('ja','en','vi','ko')) {
      $entry = $receipt.entries.$language
      if ($null -ne $entry -and $entry.state -eq 'verified' -and $null -ne $entry.evidence -and $entry.evidence.url -match '^https://x\.com/jungsilx/status/[0-9]+$') {
        $verified += [pscustomobject]@{ language=$language; url=$entry.evidence.url }
      }
    }
  }
  $report = [ordered]@{ dateKst=$date; updatedUtc=[DateTimeOffset]::UtcNow.ToString('o'); cycleId=$Recovery.cycleId; recoveryStatus=$Recovery.status; attempts=$Recovery.attempts; verifiedPosts=@($verified); complete=($Recovery.status -eq 'complete' -and $verified.Count -eq 4); failedLanguage=if($null -ne $receipt){$receipt.failedLanguage}else{$null}; failure=if($Recovery.status -ne 'complete'){$Recovery.output}else{$null} }
  $path = Join-Path $ReportDirectory ($date + '.json')
  Save-CycleReceipt ([pscustomobject]$report) $path
  return $path
}

if ($TestOnly) { return }

$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($CycleId)) { $CycleId = Get-PostingCycleId ([DateTimeOffset]::UtcNow) $config.schedule_times }
$started = [DateTimeOffset]::Now.ToOffset([TimeSpan]::FromHours(9))
$wrapper = Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1'
$powershell = Join-Path $PSHOME 'powershell.exe'
$recovery = Invoke-XPostingCycleRecovery -CycleId $CycleId -Now $started -MaxAttempts $MaxAttempts -RetryDelaySeconds $RetryDelaySeconds -MaxRunMinutes $MaxRunMinutes -ScheduleTimes $config.schedule_times -RunCycle {
  param($id, $attempt)
  $output = & $powershell -NoProfile -STA -ExecutionPolicy Bypass -File $wrapper -FullCycle -CycleId $id -ReceiptDirectory $ReceiptDirectory 2>&1 | Out-String
  [pscustomobject]@{ exitCode=$LASTEXITCODE; output=$output }
} -TestComplete { param($id) Test-XRecoveryCompleteReceipt -CycleId $id -ReceiptDirectory $ReceiptDirectory }
$reportPath = Write-XDailyPostingReport -Recovery $recovery -ReceiptDirectory $ReceiptDirectory -ReportDirectory $ReportDirectory
$recovery | Add-Member -NotePropertyName reportPath -NotePropertyValue $reportPath
$recovery | ConvertTo-Json -Depth 6 -Compress
if ($recovery.status -ne 'complete') { exit 1 }
