Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# This is deliberately a no-UI fixture. It exercises only the retry policy seam.
. (Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPostingRecovery.ps1') -TestOnly
function Assert-True($Value, [string]$Name) { if (-not $Value) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }

# The recovery deadline compares the live clock. Keep this no-sleep fixture's
# slot end in the future instead of letting a historical date expire forever.
$now = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9))
$cycleId = $now.ToString('yyyy-MM-dd') + '-1800'
$script:calls = @()
$run = {
  param($id, $attempt)
  $script:calls += $id
  if ($attempt -lt 3) { return [pscustomobject]@{ exitCode = 1; output = 'X_POSTING_FAILED: Chrome X tab not ready' } }
  return [pscustomobject]@{ exitCode = 0; output = '{"status":"complete","cycleId":"2026-09-09-0900","newlyPublished":0}' }
}
$result = Invoke-XPostingCycleRecovery -CycleId $cycleId -Now $now -MaxAttempts 4 -RetryDelaySeconds 1 -RunCycle $run -Sleep { param($seconds) }
Assert-True ($result.status -eq 'complete' -and $result.attempts -eq 3) 'temporary failure retries to completion'
Assert-True ((@($script:calls | Select-Object -Unique)).Count -eq 1 -and $script:calls[0] -eq $cycleId) 'every retry pins one cycle ID'

$script:completeCalls = 0
$complete = Invoke-XPostingCycleRecovery -CycleId $cycleId -Now $now -MaxAttempts 4 -RetryDelaySeconds 1 -RunCycle {
  param($id, $attempt)
  $script:completeCalls++
  return [pscustomobject]@{ exitCode = 0; output = '{"status":"complete","cycleId":"2026-09-09-0900","newlyPublished":0}' }
} -Sleep { param($seconds) }
Assert-True ($complete.status -eq 'complete' -and $script:completeCalls -eq 1) 'complete receipt causes no additional post attempt'

$falseComplete = Invoke-XPostingCycleRecovery -CycleId $cycleId -Now $now -MaxAttempts 4 -RetryDelaySeconds 1 -RunCycle {
  param($id, $attempt)
  return [pscustomobject]@{ exitCode = 0; output = '{"status":"complete","cycleId":"2026-09-09-0900"}' }
} -TestComplete { param($id) $false } -Sleep { param($seconds) }
Assert-True ($falseComplete.status -eq 'stopped_unsafe' -and $falseComplete.reason -eq 'receipt_not_complete') 'printed completion without four verified receipts is rejected'

$script:authCalls = 0
$auth = Invoke-XPostingCycleRecovery -CycleId $cycleId -Now $now -MaxAttempts 4 -RetryDelaySeconds 1 -RunCycle {
  param($id, $attempt)
  $script:authCalls++
  return [pscustomobject]@{ exitCode = 1; output = 'X_POSTING_FAILED: Authentication dialog visible' }
} -Sleep { param($seconds) }
Assert-True ($auth.status -eq 'stopped_unsafe' -and $auth.reason -eq 'authentication_or_security' -and $script:authCalls -eq 1) 'authentication failure stops without retry'

$uncertain = Invoke-XPostingCycleRecovery -CycleId $cycleId -Now $now -MaxAttempts 4 -RetryDelaySeconds 1 -RunCycle {
  param($id, $attempt)
  return [pscustomobject]@{ exitCode = 1; output = 'X_POSTING_FAILED: UNCERTAIN ja: prior publish intent; no matching new status visible. No second click.' }
} -Sleep { param($seconds) }
Assert-True ($uncertain.status -eq 'stopped_unsafe' -and $uncertain.reason -eq 'uncertain_publish') 'uncertain publish stops without another click'

$temp = Join-Path ([IO.Path]::GetTempPath()) ('x-posting-recovery-test-' + [guid]::NewGuid().ToString('N'))
try {
  $receipt = [pscustomobject]@{ failedLanguage='ko'; entries=[pscustomobject]@{
    ja=[pscustomobject]@{state='verified';evidence=[pscustomobject]@{url='https://x.com/jungsilx/status/100'}}
    en=[pscustomobject]@{state='verified';evidence=[pscustomobject]@{url='https://x.com/jungsilx/status/101'}}
    vi=[pscustomobject]@{state='selected';evidence=$null}
    ko=[pscustomobject]@{state='publish_intent';evidence=$null}
  }}
  Save-CycleReceipt $receipt (Join-Path $temp ('receipts/' + $cycleId + '.json'))
  $reportPath = Write-XDailyPostingReport -Recovery ([pscustomobject]@{cycleId=$cycleId;status='stopped_unsafe';attempts=1;output='X_POSTING_FAILED: Authentication dialog visible'}) -ReceiptDirectory (Join-Path $temp 'receipts') -ReportDirectory (Join-Path $temp 'reports')
  $report = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-True ($report.complete -eq $false -and $report.verifiedPosts.Count -eq 2 -and $report.failedLanguage -eq 'ko') 'daily report records only verified URLs and actual failure'
} finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse } }

Write-Output 'RECOVERY_TEST_OK'
