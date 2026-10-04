Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$runner = Join-Path $root 'Invoke-ZombieSchoolFiveSlotPosting.ps1'
function Assert-True($Value,[string]$Name){ if(-not $Value){ throw "FAILED: $Name" }; "PASS $Name" }

$source = Get-Content -LiteralPath $runner -Raw -Encoding UTF8
Assert-True ($source -match "'02:00','06:00','11:00','17:00','21:00'") 'orchestrator contains exactly the five requested KST slots'
Assert-True ($source -match "order = @\('facebook','x'\)") 'orchestrator records Facebook before X serial order'
Assert-True ($source -match "facebook_posting_receipts" -and $source -match "x_posting_receipts") 'orchestrator uses distinct platform receipt directories'
Assert-True ($source -notmatch 'WindowsXPosting\.ps1' -and $source -notmatch 'FacebookNative\.ps1' -and $source -notmatch 'FindAll\(') 'orchestrator does not duplicate platform UI posting logic'
$tokens=$null;$errors=$null
[Management.Automation.Language.Parser]::ParseFile($runner,[ref]$tokens,[ref]$errors)|Out-Null
Assert-True ($errors.Count -eq 0) 'orchestrator parses as PowerShell'

$installer = Join-Path $root 'Install-ZombieSchoolFiveSlotPostingSchedule.ps1'
$installerSource = Get-Content -LiteralPath $installer -Raw -Encoding UTF8
Assert-True ($installerSource -match "EscapeZombieSchool-SocialPostingFiveSlots" -and $installerSource -match "EscapeZombieSchool-XPosting" -and $installerSource -match "EscapeZombieSchool-FacebookPosting") 'installer defines new task and both old task names'
Assert-True ($installerSource -match 'New-ScheduledTaskPrincipal .*Interactive' -and $installerSource -match 'MultipleInstances IgnoreNew' -and $installerSource -match 'StartWhenAvailable = \$false') 'installer enforces InteractiveToken IgnoreNew no-backfill policy'
Assert-True ($installerSource -match "Export-ScheduledTask" -and $installerSource -match "failed_restored_old_tasks") 'installer keeps rollback XML/state evidence and restores old enabled tasks on failure'
Assert-True ($installerSource -match "savedTriggers.Count -ne 5" -and $installerSource -match "Repetition") 'installer readback validates five non-repeating triggers'
Assert-True ($installerSource -match 'Get-TaskStateRecord \$_ ''before''' -and $installerSource -match 'Get-TaskStateRecord \$_ ''after''') 'installer preserves immutable before XML separately from after-disable XML'

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('five-slot-social-test-' + [guid]::NewGuid().ToString('N'))
$created = $false
try {
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $created = $true
  $fbLog = Join-Path $tmp 'facebook.jsonl'
  $xLog = Join-Path $tmp 'x.jsonl'
  $fbStub = Join-Path $tmp 'facebook-runner.ps1'
  $xStub = Join-Path $tmp 'x-runner.ps1'
  Set-Content -LiteralPath $fbStub -Encoding UTF8 -Value @'
param([string]$RunId,[string]$ReceiptDirectory,[switch]$TestBypassSlotCheck)
[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
[pscustomobject]@{platform='facebook';runId=$RunId;receiptDirectory=$ReceiptDirectory;bypass=$TestBypassSlotCheck.IsPresent}|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:FB_FIVE_SLOT_LOG -Encoding UTF8
[pscustomobject]@{status='complete';runId=$RunId;languages=@('ja','en','vi','ko')}|ConvertTo-Json -Compress
'@
  Set-Content -LiteralPath $xStub -Encoding UTF8 -Value @'
param([string]$CycleId,[string]$ReceiptDirectory)
[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
[pscustomobject]@{platform='x';cycleId=$CycleId;receiptDirectory=$ReceiptDirectory}|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:X_FIVE_SLOT_LOG -Encoding UTF8
[pscustomobject]@{status='complete';cycleId=$CycleId;attempts=1}|ConvertTo-Json -Compress
'@
  $env:FB_FIVE_SLOT_LOG = $fbLog
  $env:X_FIVE_SLOT_LOG = $xLog

  $validate = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -RunId '2026-10-05-0200' -ReceiptRoot $tmp -FacebookRunnerPath $fbStub -XRunnerPath $xStub -ValidateOnly 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'ValidateOnly exits zero'
  $validateJson = ($validate -join "`n") | ConvertFrom-Json
  Assert-True ($validateJson.uiTouched -eq $false -and $validateJson.published -eq 0) 'ValidateOnly reports no UI and no publish'
  Assert-True (($validateJson.slots -join ',') -eq '02:00,06:00,11:00,17:00,21:00') 'ValidateOnly reports all five slots'
  Assert-True (($validateJson.languages -join ',') -eq 'ja,en,vi,ko') 'ValidateOnly reports all four languages'
  Assert-True (-not (Test-Path -LiteralPath $fbLog) -and -not (Test-Path -LiteralPath $xLog)) 'ValidateOnly does not invoke platform runners'

  $run = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -RunId '2026-10-05-2100' -ReceiptRoot $tmp -FacebookRunnerPath $fbStub -XRunnerPath $xStub -TestBypassSlotCheck 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'mock serial run exits zero'
  $runJson = ($run -join "`n") | ConvertFrom-Json
  Assert-True ($runJson.status -eq 'complete' -and ($runJson.order -join ',') -eq 'facebook,x') 'mock serial run reports complete Facebook then X order'
  $fbEntry = Get-Content -LiteralPath $fbLog -Encoding UTF8 | Select-Object -First 1 | ConvertFrom-Json
  $xEntry = Get-Content -LiteralPath $xLog -Encoding UTF8 | Select-Object -First 1 | ConvertFrom-Json
  Assert-True ($fbEntry.runId -eq '2026-10-05-2100' -and $xEntry.cycleId -eq '2026-10-05-2100') 'same date-slot RunId is passed to both platforms'
  Assert-True ($fbEntry.receiptDirectory -ne $xEntry.receiptDirectory -and $fbEntry.receiptDirectory -match 'facebook_posting_receipts' -and $xEntry.receiptDirectory -match 'x_posting_receipts') 'platform receipt directories are distinct'

  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $bad = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -RunId '2026-10-05-1200' -ReceiptRoot $tmp -FacebookRunnerPath $fbStub -XRunnerPath $xStub -ValidateOnly 2>$null
    $badExit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
  }
  Assert-True ($badExit -ne 0) 'invalid old 12:00 RunId is rejected'

  $fbFailLog = Join-Path $tmp 'facebook-fail.jsonl'
  $xAfterFbFailLog = Join-Path $tmp 'x-after-facebook-fail.jsonl'
  $fbFailStub = Join-Path $tmp 'facebook-fail-runner.ps1'
  $xAfterFbFailStub = Join-Path $tmp 'x-after-facebook-fail-runner.ps1'
  Set-Content -LiteralPath $fbFailStub -Encoding UTF8 -Value @'
param([string]$RunId,[string]$ReceiptDirectory,[switch]$TestBypassSlotCheck)
[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
[pscustomobject]@{platform='facebook';runId=$RunId;receiptDirectory=$ReceiptDirectory}|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:FB_FAIL_FIVE_SLOT_LOG -Encoding UTF8
Write-Error 'mock facebook failure'
exit 44
'@
  Set-Content -LiteralPath $xAfterFbFailStub -Encoding UTF8 -Value @'
param([string]$CycleId,[string]$ReceiptDirectory)
[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
[pscustomobject]@{platform='x';cycleId=$CycleId;receiptDirectory=$ReceiptDirectory}|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:X_AFTER_FB_FAIL_FIVE_SLOT_LOG -Encoding UTF8
[pscustomobject]@{status='complete';cycleId=$CycleId;attempts=1}|ConvertTo-Json -Compress
'@
  $env:FB_FAIL_FIVE_SLOT_LOG = $fbFailLog
  $env:X_AFTER_FB_FAIL_FIVE_SLOT_LOG = $xAfterFbFailLog
  $partial = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -RunId '2026-10-05-0600' -ReceiptRoot $tmp -FacebookRunnerPath $fbFailStub -XRunnerPath $xAfterFbFailStub -TestBypassSlotCheck 2>&1
  $partialExit = $LASTEXITCODE
  Assert-True ($partialExit -ne 0) 'mock Facebook failure returns nonzero overall status'
  $partialJson = ($partial | Where-Object { ([string]$_).Trim().StartsWith('{') } | Select-Object -Last 1) | ConvertFrom-Json
  Assert-True ($partialJson.status -eq 'partial_failed' -and $partialJson.facebook.status -eq 'failed' -and $partialJson.x.status -eq 'complete') 'Facebook failure is reported without hiding X result'
  Assert-True ((Test-Path -LiteralPath $fbFailLog) -and (Test-Path -LiteralPath $xAfterFbFailLog)) 'X runner is attempted independently after Facebook failure'
} finally {
  Remove-Item Env:FB_FIVE_SLOT_LOG -ErrorAction SilentlyContinue
  Remove-Item Env:X_FIVE_SLOT_LOG -ErrorAction SilentlyContinue
  Remove-Item Env:FB_FAIL_FIVE_SLOT_LOG -ErrorAction SilentlyContinue
  Remove-Item Env:X_AFTER_FB_FAIL_FIVE_SLOT_LOG -ErrorAction SilentlyContinue
  if($created -and (Test-Path -LiteralPath $tmp)){ Remove-Item -LiteralPath $tmp -Recurse -Force }
}

'FIVE_SLOT_SOCIAL_POSTING_TEST_OK'
