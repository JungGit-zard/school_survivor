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
$installerPath = Join-Path $root 'Install-ZombieSchoolFiveSlotPostingSchedule.ps1'
$installerSource = Get-Content -LiteralPath $installerPath -Raw -Encoding UTF8
Assert-True ($installerSource -match 'PersistentScheduledRun -ScheduledSlot \{1\}' -and $installerSource -match "slot='0200'" -and $installerSource -match "slot='0600'" -and $installerSource -match "slot='1100'" -and $installerSource -match "slot='1700'" -and $installerSource -match "slot='2100'") 'installer creates five slot-specific intake task actions'
Assert-True ($installerSource -match 'taskName=\(\$TaskName \+ ''-0600''\)' -and $installerSource -match 'taskName=\(\$TaskName \+ ''-1100''\)' -and $installerSource -match 'taskName=\(\$TaskName \+ ''-1700''\)' -and $installerSource -match 'taskName=\(\$TaskName \+ ''-2100''\)') 'each additional trigger has its own stable task identity'
Assert-True ($installerSource -match 'retryDelaySeconds=300' -and $installerSource -match 'historicalRunAuthorization=\$false') 'scheduled worker retries queued cycles without historical authorization'

$installer = $installerPath
Assert-True ($installerSource -match "EscapeZombieSchool-SocialPostingFiveSlots" -and $installerSource -match "EscapeZombieSchool-XPosting" -and $installerSource -match "EscapeZombieSchool-FacebookPosting") 'installer defines new task and both old task names'
Assert-True ($installerSource -match 'New-ScheduledTaskPrincipal .*Interactive' -and $installerSource -match 'MultipleInstances Parallel' -and $installerSource -match 'StartWhenAvailable = \$false') 'installer allows trigger intake while preserving no-backfill policy'
Assert-True ($installerSource -match 'ExecutionTimeLimit \(\[TimeSpan\]::Zero\)' -and $installerSource -match "executionLimit.InnerText\) -ne \[TimeSpan\]::Zero") 'installer leaves the persistent retry task without a time limit and verifies readback'
Assert-True ($installerSource -match "Export-ScheduledTask" -and $installerSource -match "failed_restored_old_tasks") 'installer keeps rollback XML/state evidence and restores old enabled tasks on failure'
Assert-True ($installerSource -match 'savedTriggers.Count -ne 1' -and $installerSource -match 'ExpectedTime' -and $installerSource -match "Repetition") 'installer readback validates one non-repeating trigger per slot task'
Assert-True ($installerSource -match 'Get-TaskStateRecord \$_ ''before''' -and $installerSource -match 'Get-TaskStateRecord \$_ ''after''') 'installer preserves immutable before XML separately from after-disable XML'

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('five-slot-social-test-' + [guid]::NewGuid().ToString('N'))
$created = $false
try {
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $created = $true
  . $runner -TestOnly
  $integrationRoot=Join-Path $tmp 'entrypoint';$todayKst=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9));$integrationRunId=$todayKst.ToString('yyyy-MM-dd')+'-0200'
  foreach($platform in @('facebook_posting_receipts','x_posting_receipts')){$dir=Join-Path $integrationRoot $platform;New-Item -ItemType Directory -Path $dir -Force|Out-Null;$receipt=[ordered]@{schema=1;platform=$platform;runId=$integrationRunId;entries=[ordered]@{ja=@{state='publish_intent'};en=@{state='publish_intent'};vi=@{state='publish_intent'};ko=@{state='publish_intent'}}};$receipt|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dir ($integrationRunId+'.json')) -Encoding UTF8}
  $entryOutput=@(& powershell -NoProfile -ExecutionPolicy Bypass -File $runner -TodayOnlyOverride -RunId $integrationRunId -ReceiptRoot $integrationRoot 2>&1);$entryExit=$LASTEXITCODE;$entryJson=($entryOutput|Where-Object{[string]$_ -match '^\{.*\}$'}|Select-Object -Last 1);$entryResult=if($entryJson){$entryJson|ConvertFrom-Json}else{$null}
  Assert-True ($entryExit -eq 0 -and $null -ne $entryResult -and $entryResult.status -eq 'submitted_with_unresolved_intents') 'actual today override entrypoint returns submitted status for existing publish_intent receipts without UI and serializes its captured cutoff safely'
  $prettyRunner=Join-Path $tmp 'pretty-json-runner.ps1';$compactRunner=Join-Path $tmp 'compact-json-runner.ps1'
  Set-Content -LiteralPath $prettyRunner -Encoding UTF8 -Value "[pscustomobject]@{status='pretty';nested=@{count=2}}|ConvertTo-Json -Depth 5"
  Set-Content -LiteralPath $compactRunner -Encoding UTF8 -Value "[pscustomobject]@{status='compact';nested=@{count=3}}|ConvertTo-Json -Depth 5 -Compress"
  $prettyResult=Invoke-JsonRunner -ScriptPath $prettyRunner -Arguments @('fixture') -Name 'pretty JSON fixture';$compactResult=Invoke-JsonRunner -ScriptPath $compactRunner -Arguments @('fixture') -Name 'compact JSON fixture'
  Assert-True ($prettyResult.status -eq 'pretty' -and $prettyResult.nested.count -eq 2 -and $compactResult.status -eq 'compact' -and $compactResult.nested.count -eq 3) 'child PowerShell JSON parser accepts both multiline and compact JSON results'
  $fixedTriggerTime=[DateTimeOffset]::Parse('2026-10-09T11:00:15+09:00')
  Assert-True ((Get-FiveSlotScheduledTriggerRunId -Slot '1100' -NowKst $fixedTriggerTime) -ceq '2026-10-09-1100') 'slot-specific trigger maps to its exact calendar date and RunId'
  $wrongTriggerRejected=$false
  try{$null=Get-FiveSlotScheduledTriggerRunId -Slot '0600' -NowKst $fixedTriggerTime}catch{$wrongTriggerRejected=$true}
  Assert-True $wrongTriggerRejected 'late or mismatched trigger cannot be relabeled as the currently active later slot'
  $overrideNow=[DateTimeOffset]::Parse('2026-10-10T11:27:00+09:00')
  Assert-True ((Get-TodayOverrideStopAtKst -RunId '2026-10-10-0200' -NowKst $overrideNow).ToString('o') -eq '2026-10-11T00:00:00.0000000+09:00') 'same-day override keeps an explicit legacy slot ID and cuts off at next KST midnight'
  $oldOverrideRejected=$false;try{$null=Get-TodayOverrideStopAtKst -RunId '2026-10-09-0200' -NowKst $overrideNow}catch{$oldOverrideRejected=$true}
  Assert-True $oldOverrideRejected 'same-day override refuses a previous-date historical cycle'
  $scheduledId='2026-10-09-1100';$scheduledState=Join-Path $tmp 'scheduled-retry.json';$scheduledCalls=@();$scheduledWaits=@()
  $scheduledRetryRecord=$null
  $scheduledResult=Invoke-FiveSlotPersistentScheduledRun -RunId $scheduledId -StatePath $scheduledState -RunCycle {
    param($id,$attempt)
    $script:scheduledCalls += "$id/$attempt"
    if($attempt -eq 1){return [pscustomobject]@{exitCode=1;output='temporary browser launch timeout'}}
    return [pscustomobject]@{exitCode=0;status='complete';output='{"status":"complete"}'}
  } -Sleep {param($seconds);$script:scheduledWaits += $seconds;$script:scheduledRetryRecord=Get-Content -LiteralPath $scheduledState -Raw -Encoding UTF8|ConvertFrom-Json}
  Assert-True ($scheduledResult.status -eq 'complete' -and $scheduledCalls -join ',' -eq "$scheduledId/1,$scheduledId/2") 'scheduled supervisor retries only the trigger-derived immutable RunId'
  Assert-True ($scheduledWaits.Count -eq 1 -and $scheduledWaits[0] -eq 300) 'scheduled supervisor waits exactly 300 seconds between transient attempts'
  $retryTimestamp=[DateTimeOffset]::MinValue;$hasRetryTimestamp=[DateTimeOffset]::TryParse($scheduledRetryRecord.entries[0].nextRetryUtc,[ref]$retryTimestamp)
  Assert-True ($scheduledRetryRecord.entries[0].status -eq 'retry_wait' -and $hasRetryTimestamp) 'retry state persists retry_wait plus a concrete nextRetryUtc before sleeping'
  $scheduledStateData=Get-Content -LiteralPath $scheduledState -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True (@($scheduledStateData.cycleIds).Count -eq 1 -and $scheduledStateData.cycleIds[0] -ceq $scheduledId -and $scheduledStateData.status -eq 'complete') 'scheduled retry state is durable and scoped to one slot ID'
  $script:overrideClock=[DateTimeOffset]::Parse('2026-10-10T23:55:00+09:00');$overrideCalls=0;$overrideWaits=@();$overrideState=Join-Path $tmp 'same-day-cutoff.json'
  $cutoffRetry=Invoke-FiveSlotPersistentScheduledRun -RunId '2026-10-10-2100' -StatePath $overrideState -StopAtKst '2026-10-11T00:00:00+09:00' -NowKst {$script:overrideClock} -RunCycle {param($id,$attempt);$script:overrideCalls++;[pscustomobject]@{exitCode=1;output='temporary network interruption'}} -Sleep {param($seconds);$script:overrideWaits += $seconds;$script:overrideClock=$script:overrideClock.AddSeconds($seconds)}
  $cutoffState=Get-Content -LiteralPath $overrideState -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($cutoffRetry.status -eq 'stopped_cutoff' -and $overrideCalls -eq 1 -and $overrideWaits.Count -eq 1 -and $overrideWaits[0] -eq 300 -and $cutoffState.entries[0].status -eq 'stopped_cutoff') 'same-day transient retry waits exactly 300 seconds, then does not start another attempt at KST midnight'
  $cutoffQueue=Join-Path $tmp 'same-day-cutoff-queue.json';$cutoffQueueCalls=0
  $cutoffQueueResult=Invoke-FiveSlotScheduledQueue -QueuePath $cutoffQueue -CycleId '2026-10-10-0600' -StopAtKst '2026-10-11T00:00:00+09:00' -NowKst { [DateTimeOffset]::Parse('2026-10-11T00:00:00+09:00') } -RunCycle {param($id,$attempt);$script:cutoffQueueCalls++;[pscustomobject]@{exitCode=0;status='complete'}}
  $cutoffQueueState=Get-Content -LiteralPath $cutoffQueue -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($cutoffQueueResult.status -eq 'stopped_cutoff' -and $cutoffQueueCalls -eq 0 -and $cutoffQueueState.cycles[0].status -eq 'stopped_cutoff') 'same-day queue marks cycles terminal without starting after midnight'
  $unsafeCalls=0;$unsafeWaits=0
  $unsafeStatePath=Join-Path $tmp 'scheduled-unsafe.json'
  $unsafeScheduled=Invoke-FiveSlotPersistentScheduledRun -RunId $scheduledId -StatePath $unsafeStatePath -RunCycle {param($id,$attempt);$script:unsafeCalls++;[pscustomobject]@{exitCode=1;output='UNSAFE publish_intent; never click again'}} -Sleep {param($seconds);$script:unsafeWaits++}
  Assert-True ($unsafeScheduled.status -eq 'stopped_unsafe' -and $unsafeCalls -eq 1 -and $unsafeWaits -eq 0) 'scheduled supervisor visibly stops uncertain publish intent without retry'
  $unsafeAgain=Invoke-FiveSlotPersistentScheduledRun -RunId $scheduledId -StatePath $unsafeStatePath -RunCycle {param($id,$attempt);$script:unsafeCalls++;[pscustomobject]@{exitCode=0;status='complete';output='{"status":"complete"}'}} -Sleep {param($seconds);$script:unsafeWaits++}
  Assert-True ($unsafeAgain.status -eq 'stopped_unsafe' -and $unsafeCalls -eq 1 -and $unsafeWaits -eq 0) 'unsafe stop remains terminal across scheduled supervisor restart'
  $guardedRetryState=Join-Path $tmp 'scheduled-guarded-retry.json';$guardedRetryCalls=0;$guardedRetryWaits=@()
  $guardedRetry=Invoke-FiveSlotPersistentScheduledRun -RunId $scheduledId -StatePath $guardedRetryState -RetryGuardedFailures -RunCycle {param($id,$attempt);$script:guardedRetryCalls++;if($attempt -eq 1){[pscustomobject]@{exitCode=1;output='Expected one existing Chrome X window, found 0'};return};[pscustomobject]@{exitCode=0;status='submitted';output='{"status":"submitted"}'}} -Sleep {param($seconds);$script:guardedRetryWaits += $seconds}
  Assert-True ($guardedRetry.status -eq 'submitted' -and $guardedRetryCalls -eq 2 -and $guardedRetryWaits.Count -eq 1 -and $guardedRetryWaits[0] -eq 300) 'guarded focus/window failures retry after 300 seconds while preserving the immutable cycle ID'
  $challengeState=Join-Path $tmp 'scheduled-challenge-recheck.json';$challengeCalls=0;$challengeWaits=@()
  $challengeRetry=Invoke-FiveSlotPersistentScheduledRun -RunId $scheduledId -StatePath $challengeState -RetryGuardedFailures -RunCycle {param($id,$attempt);$script:challengeCalls++;if($attempt -eq 1){[pscustomobject]@{exitCode=1;output='Authentication/security challenge visible; no credentials submitted'};return};[pscustomobject]@{exitCode=0;status='submitted';output='{"status":"submitted"}'}} -Sleep {param($seconds);$script:challengeWaits += $seconds}
  Assert-True ($challengeRetry.status -eq 'submitted' -and $challengeCalls -eq 2 -and $challengeWaits.Count -eq 1 -and $challengeWaits[0] -eq 300) 'authentication challenge is retried only as a guarded recheck after five minutes'
  $malformedCalls=0;$malformedState=Join-Path $tmp 'scheduled-malformed-receipt.json';$malformedRetry=Invoke-FiveSlotPersistentScheduledRun -RunId $scheduledId -StatePath $malformedState -RetryGuardedFailures -RunCycle {param($id,$attempt);$script:malformedCalls++;[pscustomobject]@{exitCode=1;output='malformed receipt schema'}} -Sleep {param($seconds);throw 'malformed receipt must remain a hard stop'}
  Assert-True ($malformedRetry.status -eq 'stopped_unsafe' -and $malformedCalls -eq 1) 'malformed receipt remains a hard stop even in guarded retry mode'
  $priorGuardStop=Join-Path $tmp 'prior-guard-stop.json';$priorGuardState=[pscustomobject]@{schema=1;cycleIds=@($scheduledId);entries=@([pscustomobject]@{cycleId=$scheduledId;status='stopped_unsafe';attempts=1;lastError='Expected one existing Chrome X window, found 0';updatedUtc=$null});status='stopped_unsafe';currentCycleId=$scheduledId}|ConvertTo-Json -Depth 6
  Set-Content -LiteralPath $priorGuardStop -Value $priorGuardState -Encoding UTF8;$priorGuardCalls=0;$priorGuardWaits=@()
  $priorGuardResume=Invoke-FiveSlotPersistentScheduledRun -RunId $scheduledId -StatePath $priorGuardStop -RetryGuardedFailures -RunCycle {param($id,$attempt);$script:priorGuardCalls++;[pscustomobject]@{exitCode=0;status='submitted';output='{"status":"submitted"}'}} -Sleep {param($seconds);$script:priorGuardWaits += $seconds}
  Assert-True ($priorGuardResume.status -eq 'submitted' -and $priorGuardCalls -eq 1 -and $priorGuardWaits.Count -eq 1 -and $priorGuardWaits[0] -eq 300) 'a previously stopped retryable window guard resumes after five minutes, while hard stops remain terminal'

  $queuePath=Join-Path $tmp 'scheduled-queue.json';$queueCalls=@();$queueWaits=@();$queuedId='2026-10-09-1700'
  $queuedResult=Invoke-FiveSlotScheduledQueue -QueuePath $queuePath -CycleId $scheduledId -RunCycle {
    param($id,$attempt)
    $script:queueCalls += "$id/$attempt"
    if($id -eq $scheduledId -and $attempt -eq 1){$null=Add-ScheduledTriggerCycle -QueuePath $queuePath -CycleId $queuedId;return [pscustomobject]@{exitCode=1;output='temporary network interruption'}}
    return [pscustomobject]@{exitCode=0;status='complete';output='{"status":"complete"}'}
  } -Sleep {param($seconds);$script:queueWaits += $seconds}
  Assert-True ($queuedResult.status -eq 'complete' -and $queueCalls -join ',' -eq "$scheduledId/1,$scheduledId/2,$queuedId/1") 'queue preserves a trigger arriving during retry and drains each immutable ID serially'
  Assert-True ($queueWaits.Count -eq 1 -and $queueWaits[0] -eq 300) 'queued triggers do not change the exact retry delay for the active cycle'
  $queueState=Get-Content -LiteralPath $queuePath -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True (@($queueState.cycles|Where-Object status -ne 'complete').Count -eq 0) 'all queued trigger IDs have durable terminal completion state'
  $boundaryQueue=Join-Path $tmp 'shutdown-boundary-queue.json';$boundaryId='2026-10-09-2100';$boundaryCalls=@();$boundaryAdded=$false
  $boundaryResult=Invoke-FiveSlotScheduledQueue -QueuePath $boundaryQueue -CycleId $scheduledId -RunCycle {param($id,$attempt);$script:boundaryCalls += $id;[pscustomobject]@{exitCode=0;status='complete';output='{"status":"complete"}'}} -BeforeWorkerRelease {
    param($path)
    if(-not $script:boundaryAdded){$script:boundaryAdded=$true;$null=Add-ScheduledTriggerCycle -QueuePath $path -CycleId $boundaryId}
  }
  Assert-True ($boundaryResult.status -eq 'complete' -and $boundaryCalls -join ',' -eq "$scheduledId,$boundaryId") 'trigger enqueued at the empty-queue worker handoff is picked up before worker release'
  $unsafeQueuePath=Join-Path $tmp 'unsafe-scheduled-queue.json';$unsafeQueueCalls=0
  $unsafeQueueResult=Invoke-FiveSlotScheduledQueue -QueuePath $unsafeQueuePath -CycleId $scheduledId -RunCycle {param($id,$attempt);$script:unsafeQueueCalls++;[pscustomobject]@{exitCode=1;output='UNSAFE uncertain publish_intent; never click twice'}} -Sleep {param($seconds);throw 'unsafe queue must not sleep'}
  $unsafeQueueAgain=Invoke-FiveSlotScheduledQueue -QueuePath $unsafeQueuePath -CycleId $scheduledId -RunCycle {param($id,$attempt);$script:unsafeQueueCalls++;[pscustomobject]@{exitCode=0;status='complete';output='{"status":"complete"}'}} -Sleep {param($seconds);throw 'unsafe queue must remain stopped'}
  Assert-True ($unsafeQueueResult.status -eq 'complete' -and $unsafeQueueAgain.status -eq 'complete' -and $unsafeQueueCalls -eq 1) 'unsafe scheduled cycle remains terminal in the durable queue and is never re-clicked'

  $fbLog = Join-Path $tmp 'facebook.jsonl'
  $xLog = Join-Path $tmp 'x.jsonl'
  $fbStub = Join-Path $tmp 'facebook-runner.ps1'
  $xStub = Join-Path $tmp 'x-runner.ps1'
  Set-Content -LiteralPath $fbStub -Encoding UTF8 -Value @'
param([string]$RunId,[string]$ReceiptDirectory,[switch]$TestBypassSlotCheck,[switch]$AuthorizedHistoricalRun,[switch]$ReconcileExistingPosts)
[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
[pscustomobject]@{platform='facebook';runId=$RunId;receiptDirectory=$ReceiptDirectory;bypass=$TestBypassSlotCheck.IsPresent;historical=$AuthorizedHistoricalRun.IsPresent;reconcile=$ReconcileExistingPosts.IsPresent}|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:FB_FIVE_SLOT_LOG -Encoding UTF8
[pscustomobject]@{status='complete';runId=$RunId;languages=@('ja','en','vi','ko')}|ConvertTo-Json -Compress
'@
  Set-Content -LiteralPath $xStub -Encoding UTF8 -Value @'
param([string]$CycleId,[string]$ReceiptDirectory,[switch]$CredentialRecovery,[switch]$ReconcileExistingPosts,[int]$MaxAttempts)
[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
[pscustomobject]@{platform='x';cycleId=$CycleId;receiptDirectory=$ReceiptDirectory;credentialRecovery=$CredentialRecovery.IsPresent;reconcile=$ReconcileExistingPosts.IsPresent;maxAttempts=$MaxAttempts}|ConvertTo-Json -Compress|Add-Content -LiteralPath $env:X_FIVE_SLOT_LOG -Encoding UTF8
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
  Assert-True ($xEntry.credentialRecovery) 'scheduled X runner enables guarded Credential Manager recovery'

  $historical= & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -RunId '2026-10-05-2100' -ReceiptRoot $tmp -FacebookRunnerPath $fbStub -XRunnerPath $xStub -AuthorizedHistoricalRun -ReconcileExistingPosts -PersistentRetryMode 2>&1
  Assert-True ($LASTEXITCODE -eq 0) 'explicit historical authorization runs without TestBypassSlotCheck'
  $historicalFb=Get-Content -LiteralPath $fbLog -Encoding UTF8|Select-Object -Last 1|ConvertFrom-Json
  $historicalX=Get-Content -LiteralPath $xLog -Encoding UTF8|Select-Object -Last 1|ConvertFrom-Json
  Assert-True ($historicalFb.historical -and $historicalFb.reconcile -and -not $historicalFb.bypass) 'historical Facebook run receives explicit authorization and reconciliation, not test bypass'
  Assert-True ($historicalX.reconcile -and $historicalX.maxAttempts -eq 1) 'persistent backlog limits each X child attempt so the outer cycle retries after exactly five minutes'
  $todayDate=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)).ToString('yyyy-MM-dd');$todayOverrideId=$todayDate+'-0200'
  $publishFbStub=Join-Path $tmp 'facebook-publish-actions.ps1';$publishXStub=Join-Path $tmp 'x-publish-only.ps1';$publishLog=Join-Path $tmp 'publish-actions.jsonl'
  Set-Content -LiteralPath $publishFbStub -Encoding UTF8 -Value @'
param([string]$Action,[string]$RunId,[string]$Language,[string]$ReceiptDirectory,[long]$WindowId,[switch]$AuthorizePublish)
$path=Join-Path $ReceiptDirectory ($RunId+'.json');[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
$r=if(Test-Path -LiteralPath $path){Get-Content -LiteralPath $path -Raw|ConvertFrom-Json}else{[pscustomobject]@{entries=[pscustomobject]@{ja=$null;en=$null;vi=$null;ko=$null}}}
if($Action -eq 'DiscoverWindow'){[pscustomobject]@{windowId=1234}|ConvertTo-Json -Compress;exit 0}
if($Action -eq 'SelectSourcePair'){$r.entries.$Language=[pscustomobject]@{state='selected';intent=@{language=$Language}}}
if($Action -eq 'VerifyDraft'){$r.entries.$Language.state='prepared'}
if($Action -eq 'PublishOnce'){if(-not $AuthorizePublish){throw 'missing authorize'};$r.entries.$Language.state='publish_intent'}
if($Action -in @('SelectSourcePair','VerifyDraft','PublishOnce')){$r|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8}
"facebook/$Language/$Action"|Add-Content -LiteralPath $env:PUBLISH_ACTION_LOG -Encoding UTF8
[pscustomobject]@{status='ok';windowId=1234}|ConvertTo-Json -Compress
'@
  Set-Content -LiteralPath $publishXStub -Encoding UTF8 -Value @'
param([string]$Language,[string]$CycleId,[string]$ReceiptDirectory,[string]$StopAtKst,[switch]$Run,[switch]$SinglePost,[switch]$PublishOnly,[switch]$CredentialRecovery)
$path=Join-Path $ReceiptDirectory ($CycleId+'.json');[IO.Directory]::CreateDirectory($ReceiptDirectory)|Out-Null
$r=if(Test-Path -LiteralPath $path){Get-Content -LiteralPath $path -Raw|ConvertFrom-Json}else{[pscustomobject]@{entries=[pscustomobject]@{ja=$null;en=$null;vi=$null;ko=$null}}}
$r.entries.$Language=[pscustomobject]@{state='publish_intent';intent=@{language=$Language}};$r|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8
"x/$Language/$PublishOnly/$CredentialRecovery"|Add-Content -LiteralPath $env:PUBLISH_ACTION_LOG -Encoding UTF8
[pscustomobject]@{status='published_unverified'}|ConvertTo-Json -Compress
'@
  $env:PUBLISH_ACTION_LOG=$publishLog
  $todayFbRoot=Join-Path $tmp 'facebook_posting_receipts';$todayXRoot=Join-Path $tmp 'x_posting_receipts';[IO.Directory]::CreateDirectory($todayFbRoot)|Out-Null;[IO.Directory]::CreateDirectory($todayXRoot)|Out-Null
  $preexistingFb=[pscustomobject]@{entries=[pscustomobject]@{ja=[pscustomobject]@{state='publish_intent'};en=$null;vi=$null;ko=$null}}|ConvertTo-Json -Depth 5
  Set-Content -LiteralPath (Join-Path $todayFbRoot ($todayOverrideId+'.json')) -Value $preexistingFb -Encoding UTF8
  $preexistingX=[pscustomobject]@{entries=[pscustomobject]@{ja=$null;en=[pscustomobject]@{state='publish_intent'};vi=$null;ko=$null}}|ConvertTo-Json -Depth 5
  Set-Content -LiteralPath (Join-Path $todayXRoot ($todayOverrideId+'.json')) -Value $preexistingX -Encoding UTF8
  $todayResult=Invoke-SerializedPublishOnlyCycle -RunId $todayOverrideId -ReceiptRoot $tmp -FacebookActionRunnerPath $publishFbStub -XRunnerPath $publishXStub -StopAtKst ([DateTimeOffset]::Parse(([DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)).Date.AddDays(1).ToString('yyyy-MM-dd')+'T00:00:00+09:00')).ToString('o'))
  Assert-True ($todayResult.status -eq 'submitted_with_unresolved_intents' -and $todayResult.exitCode -eq 0) 'today publish-only cycle records unresolved prior intents separately from submitted completion'
  $attemptSubmitted=New-ScheduledAttemptResult $todayResult
  Assert-True ($attemptSubmitted.exitCode -eq 0 -and (Test-ScheduledSuccessfulTerminal $attemptSubmitted.status)) 'scheduled attempt and outer task both treat submitted outcome as terminal success instead of retrying forever'
  $todayActions=Get-Content -LiteralPath $publishLog -Encoding UTF8
  Assert-True (-not ($todayActions -contains 'facebook/ja/PublishOnce') -and -not ($todayActions -match '^x/en/')) 'pre-existing publish_intent entries are skipped without replay'
  Assert-True (@($todayActions|Where-Object{$_ -match '/PublishOnce$'}).Count -eq 3 -and @($todayActions|Where-Object{$_ -match '^x/.+/(True)/(True)$'}).Count -eq 3) 'fake cycle publishes only the six languages without prior intent and uses PublishOnly plus guarded recovery'
  $todayFbReceipt=Get-Content -LiteralPath (Join-Path $todayFbRoot ($todayOverrideId+'.json')) -Raw -Encoding UTF8|ConvertFrom-Json
  $todayXReceipt=Get-Content -LiteralPath (Join-Path $todayXRoot ($todayOverrideId+'.json')) -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True (@(@('ja','en','vi','ko')|Where-Object{$todayFbReceipt.entries.$_.state -eq 'publish_intent'}).Count -eq 4 -and @(@('ja','en','vi','ko')|Where-Object{$todayXReceipt.entries.$_.state -eq 'publish_intent'}).Count -eq 4) 'new publish actions leave immutable receipts at publish_intent and never mark posts verified'
  $cutoffProbeRoot=Join-Path $tmp 'cutoff-before-publish';$cutoffProbe=0;$probeStop=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)).AddSeconds(20)
  $cutoffProbeResult=Invoke-SerializedPublishOnlyCycle -RunId $todayOverrideId -ReceiptRoot $cutoffProbeRoot -FacebookActionRunnerPath $publishFbStub -XRunnerPath $publishXStub -StopAtKst $probeStop.ToString('o') -NowKst { $script:cutoffProbe++;if($script:cutoffProbe -ge 2){$probeStop}else{$probeStop.AddSeconds(-1)} }
  $cutoffProbeActions=if(Test-Path -LiteralPath $publishLog){@(Get-Content -LiteralPath $publishLog -Encoding UTF8)}else{@()}
  Assert-True ($cutoffProbeResult.status -eq 'stopped_cutoff' -and -not ($cutoffProbeActions -contains 'facebook/ja/PublishOnce')) 'today cycle rechecks the midnight cutoff immediately before Facebook PublishOnce'

  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $bad = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -RunId '2026-10-05-1200' -ReceiptRoot $tmp -FacebookRunnerPath $fbStub -XRunnerPath $xStub -ValidateOnly 2>$null
    $badExit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
  }
  Assert-True ($badExit -ne 0) 'invalid old 12:00 RunId is rejected'
  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $explicitScheduled = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -PersistentScheduledRun -RunId '2026-10-06-0200' -ReceiptRoot $tmp -FacebookRunnerPath $fbStub -XRunnerPath $xStub 2>&1
    $explicitScheduledExit = $LASTEXITCODE
  } finally { $ErrorActionPreference = $oldPreference }
  Assert-True ($explicitScheduledExit -ne 0) 'scheduled persistent mode rejects explicit IDs and cannot infer historical backlog cycles'

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
