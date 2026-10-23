Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$runner=Join-Path $PSScriptRoot 'Invoke-ZombieSchoolFiveSlotPosting.ps1'
. $runner -TestOnly
function Assert-True($value,[string]$name){if(-not $value){throw "FAILED: $name"};"PASS $name"}

Assert-True (($script:FiveSlotTimes -join ',') -ceq '03:00,12:00,18:00,21:00') 'configured schedule exposes only 03:00, 12:00, 18:00, 21:00 KST'
foreach($pair in @(@('0300','2026-10-18T03:10:00+09:00'),@('1200','2026-10-18T12:10:00+09:00'),@('1800','2026-10-18T18:10:00+09:00'),@('2100','2026-10-18T21:10:00+09:00'))){
  $actual=Get-FiveSlotScheduledTriggerRunId -Slot $pair[0] -NowKst ([DateTimeOffset]::Parse($pair[1]))
  Assert-True ($actual -ceq ('2026-10-18-'+$pair[0])) "slot $($pair[0]) maps to its own date-slot RunId"
}
$oldSlotRejected=$false;try{$null=Get-FiveSlotScheduledTriggerRunId -Slot '0600' -NowKst ([DateTimeOffset]::Parse('2026-10-18T06:10:00+09:00'))}catch{$oldSlotRejected=$true}
Assert-True $oldSlotRejected 'retired 06:00 trigger cannot create a RunId'
Assert-True ((Get-FiveSlotCutoffKst '2026-10-18-0300').ToString('o') -eq '2026-10-18T03:30:00.0000000+09:00') 'scheduled retry cutoff stays inside the current slot grace'

$temp=Join-Path ([IO.Path]::GetTempPath()) ('fixed-social-schedule-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($temp)|Out-Null
try{
  $xLog=Join-Path $temp 'order.log';$fbStub=Join-Path $temp 'facebook.ps1';$xStub=Join-Path $temp 'x.ps1'
  Set-Content -LiteralPath $fbStub -Encoding UTF8 -Value "param([string]`$RunId,[string]`$ReceiptDirectory); 'facebook'|Add-Content -LiteralPath '$xLog';[pscustomobject]@{status='complete';runId=`$RunId}|ConvertTo-Json -Compress"
  Set-Content -LiteralPath $xStub -Encoding UTF8 -Value "param([string]`$CycleId,[string]`$ReceiptDirectory,[switch]`$CredentialRecovery); 'x'|Add-Content -LiteralPath '$xLog';[pscustomobject]@{status='complete';cycleId=`$CycleId}|ConvertTo-Json -Compress"
  $normal=Invoke-ZombieSchoolFiveSlotPosting -RunId '2026-10-18-0300' -ReceiptRoot $temp -FacebookRunnerPath $fbStub -XRunnerPath $xStub -TestBypassSlotCheck
  Assert-True (($normal.order -join ',') -ceq 'x,facebook' -and (Get-Content -LiteralPath $xLog -Raw).Trim() -ceq "x`r`nfacebook") 'platform runner executes X before Facebook'

  $script:xFixtureError='';$script:fbFixtureError='';$script:fbFailureAction='PublishOnce';$script:cleanupFixtureError='';$script:serializedSteps=@();$script:serializedRoot=Join-Path $temp 'serialized';$script:serializedRun='2026-10-18-0300'
  function Invoke-JsonRunner {
    param([string]$ScriptPath,[object[]]$Arguments,[string]$Name)
    $isX=$Name -like 'X *';$platform=if($isX){'x'}else{'facebook'};$script:serializedSteps += "$platform/$Name"
    $argMap=@{};for($i=0;$i -lt $Arguments.Count;$i++){$key=[string]$Arguments[$i];if($key -match '^-'){if(($i+1) -lt $Arguments.Count -and [string]$Arguments[$i+1] -notmatch '^-'){$argMap[$key]=[string]$Arguments[$i+1];$i++}else{$argMap[$key]=$true}}}
    $language=[string]$argMap['-Language'];$runId=if($argMap.ContainsKey('-RunId')){$argMap['-RunId']}else{$argMap['-CycleId']}
    $receiptRoot=Join-Path $script:serializedRoot ($platform+'_posting_receipts');[IO.Directory]::CreateDirectory($receiptRoot)|Out-Null;$path=Join-Path $receiptRoot ($runId+'.json')
    $langs=@('ja','en','vi','ko');$receipt=if(Test-Path -LiteralPath $path){Get-Content -LiteralPath $path -Raw|ConvertFrom-Json}else{[pscustomobject]@{entries=[pscustomobject]@{ja=$null;en=$null;vi=$null;ko=$null}}}
    if($platform -eq 'x'){
      if($script:xFixtureError){throw $script:xFixtureError}
      $receipt.entries.$language=[pscustomobject]@{state='publish_intent';intent=[pscustomobject]@{language=$language}}
      $receipt|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8
      return [pscustomobject]@{status='published_unverified'}
    }
    if($argMap['-Action'] -eq 'CancelOwnDraft' -and $script:cleanupFixtureError){throw $script:cleanupFixtureError}
    if($argMap['-Action'] -eq $script:fbFailureAction -and $script:fbFixtureError){throw $script:fbFixtureError}
    $action=[string]$argMap['-Action'];if($action -eq 'DiscoverWindow'){return [pscustomobject]@{windowId=901}}
    if($action -eq 'SelectSourcePair'){$receipt.entries.$language=[pscustomobject]@{state='selected';intent=[pscustomobject]@{language=$language}}}
    if($action -eq 'VerifyDraft'){$receipt.entries.$language.state='prepared'}
    if($action -eq 'PublishOnce'){$receipt.entries.$language.state='publish_intent'}
    if($action -in @('SelectSourcePair','VerifyDraft','PublishOnce')){$receipt|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8}
    return [pscustomobject]@{status='ok';windowId=901;publishClick=[pscustomobject]@{clickedUtc='fixture-click'}}
  }
  $serialized=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  $firstFacebook=[array]::IndexOf([string[]]$script:serializedSteps,(@($script:serializedSteps|Where-Object{$_ -like 'facebook/*'})[0]))
  Assert-True ($serialized.status -eq 'submitted' -and $firstFacebook -ge 4 -and @($script:serializedSteps|Where-Object{$_ -like 'x/* PublishOnly'}).Count -eq 4) 'scheduled publish-only cycle finishes all four X actions before opening Facebook'

  $script:serializedRoot=Join-Path $temp 'x-content-blocked';$script:serializedSteps=@();$script:xFixtureError='IMAGE_POOL_EXHAUSTED: all unique SHA256 images are already used for X/en.'
  $blocked=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  $blockedOutput=$blocked.output|ConvertFrom-Json
  Assert-True (($script:serializedSteps[0..3] -join ',') -ceq 'x/X ja PublishOnly,x/X en PublishOnly,x/X vi PublishOnly,x/X ko PublishOnly' -and @($script:serializedSteps|Where-Object {$_ -like 'facebook/* PublishOnce'}).Count -eq 4) 'safe X content blockers still attempt X4 before Facebook4'
  Assert-True ($blocked.status -eq 'partial_failed' -and $blockedOutput.errors.Count -eq 4 -and $blockedOutput.submitted.Count -eq 4 -and $blockedOutput.publishClicks.Count -eq 4) 'aggregate failure retains X errors and Facebook native click results in existing attempt output'
  $path=Join-Path $script:serializedRoot ('x_posting_receipts/'+$script:serializedRun+'.json')
  [pscustomobject]@{entries=[pscustomobject]@{ja=[pscustomobject]@{state='publish_intent'};en=$null;vi=$null;ko=$null}}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8
  $script:serializedSteps=@();$retry=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  Assert-True (-not ($script:serializedSteps -contains 'x/X ja PublishOnly') -and @($script:serializedSteps|Where-Object {$_ -like 'facebook/*'}).Count -eq 0) 'existing X and Facebook intents are never replayed on retries'
  $script:serializedRoot=Join-Path $temp 'facebook-failure';$script:serializedSteps=@();$script:fbFixtureError='fixture Facebook attachment not ready'
  $fbFailed=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  Assert-True ($fbFailed.status -eq 'partial_failed' -and $fbFailed.output -match 'fixture Facebook attachment not ready') 'Facebook failures remain visible alongside blocked X errors'
  Assert-True (@($script:serializedSteps|Where-Object {$_ -like '*text-only cleanup'}).Count -eq 0) 'prepared drafts never enter selected text-only cleanup'
  $script:fbFailureAction='AttachImage';$script:cleanupFixtureError='fixture cleanup refusal';$script:serializedRoot=Join-Path $temp 'cleanup-refused';$script:serializedSteps=@()
  $cleanupRefused=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  Assert-True ($cleanupRefused.output -match 'fixture Facebook attachment not ready' -and $cleanupRefused.output -match 'fixture cleanup refusal' -and @($script:serializedSteps|Where-Object {$_ -like '*text-only cleanup'}).Count -eq 4) 'cleanup refusal preserves original failure and only follows this attempt owned composer'
  $script:fbFailureAction='OpenComposer';$script:serializedRoot=Join-Path $temp 'composer-not-owned';$script:serializedSteps=@()
  $notOwned=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  Assert-True (@($script:serializedSteps|Where-Object {$_ -like '*text-only cleanup'}).Count -eq 0) 'failed OpenComposer never authorizes cleanup of an unknown draft'
  $script:fbFailureAction='PublishOnce';$script:cleanupFixtureError=''
  $script:fbFixtureError='';$script:xFixtureError='X website card is not ready: twitter:card must be summary_large_image.';$script:serializedRoot=Join-Path $temp 'public-card-blocked';$script:serializedSteps=@()
  $cardBlocked=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  Assert-True ($cardBlocked.status -eq 'partial_failed' -and $cardBlocked.output -match 'X website card is not ready:' -and @($script:serializedSteps|Where-Object {$_ -like 'facebook/* PublishOnce'}).Count -eq 4) 'known pre-UI public card readiness failure retains X errors and allows Facebook4'
  $script:fbFixtureError='';$script:xFixtureError='fixture native editor ownership unknown';$script:serializedRoot=Join-Path $temp 'unknown-x';$script:serializedSteps=@()
  $unknownX=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  Assert-True ($unknownX.status -eq 'partial_failed' -and @($script:serializedSteps|Where-Object {$_ -like 'facebook/*'}).Count -eq 0) 'unknown native failures do not authorize Facebook UI continuation'
  $script:xFixtureError='UNCERTAIN publish_intent';$script:serializedRoot=Join-Path $temp 'unsafe-x';$script:serializedSteps=@()
  $unsafeX=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  Assert-True ($unsafeX.status -eq 'stopped_unsafe' -and $script:serializedSteps.Count -eq 1) 'unsafe X failures still stop immediately before any Facebook action'
  $script:xFixtureError='';$script:serializedRoot=Join-Path $temp 'expired';$script:serializedSteps=@()
  $expired=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub -StopAtKst '2026-10-18T03:30:00+09:00' -NowKst {[DateTimeOffset]::Parse('2026-10-18T03:31:00+09:00')}
  Assert-True ($expired.status -eq 'stopped_cutoff' -and $script:serializedSteps.Count -eq 0) 'expired slots perform no X or Facebook action'

  $script:evidenceClock=[DateTimeOffset]::Parse('2026-10-18T21:20:00+09:00');$evidenceState=Join-Path $temp 'attempt-evidence.json'
  $evidenceResult=Invoke-FiveSlotPersistentScheduledRun -RunId '2026-10-18-2100' -StatePath $evidenceState -StopAtKst '2026-10-18T21:30:00+09:00' -NowKst {$script:evidenceClock} -RunCycle {
    param($id,$attempt)
    [pscustomobject]@{exitCode=1;status='partial_failed';output=([pscustomobject]@{errors=@('X original content blocker');publishClicks=@(if($attempt -eq 1){[pscustomobject]@{clickedUtc='first-attempt-click'}})}|ConvertTo-Json -Compress)}
  } -Sleep {param($seconds);$script:evidenceClock=$script:evidenceClock.AddSeconds($seconds)}
  $evidenceSaved=Get-Content -LiteralPath $evidenceState -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($evidenceResult.status -eq 'stopped_cutoff' -and $evidenceSaved.entries[0].attemptResults.Count -eq 2 -and $evidenceSaved.entries[0].attemptResults[0].output -match 'first-attempt-click' -and $evidenceSaved.entries[0].attemptResults[1].output -match 'X original content blocker') 'later retries and cutoff retain original errors and earlier Facebook click evidence in the existing ledger'

  $queuePath=Join-Path $temp 'social_posting_scheduled_queue.json'
  $now=[DateTimeOffset]::Parse('2026-10-18T12:10:00+09:00')
  $queue=[pscustomobject]@{schema=1;cycles=@(
    [pscustomobject]@{cycleId='2026-10-17-2100';status='running';attempts=1;lastError=$null;updatedUtc='2026-10-17T12:05:00+00:00'},
    [pscustomobject]@{cycleId='2026-10-18-1200';status='pending';attempts=0;lastError=$null;updatedUtc='2026-10-18T03:05:00+00:00'}
  );updatedUtc=$now.ToString('o')}
  $queue|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $queuePath -Encoding UTF8
  $script:called=@()
  $queueResult=Invoke-FiveSlotScheduledQueue -QueuePath $queuePath -CycleId '2026-10-18-1200' -NowKst {$now} -RunCycle {param($id,$attempt);$script:called+= $id;[pscustomobject]@{exitCode=0;status='complete';output='{}'}}
  $saved=Get-Content -LiteralPath $queuePath -Raw -Encoding UTF8|ConvertFrom-Json
  if($queueResult.status -ne 'complete' -or ($script:called -join ',') -cne '2026-10-18-1200'){Write-Output ($queueResult|ConvertTo-Json -Depth 5);Write-Output ($saved|ConvertTo-Json -Depth 5);Write-Output "called=$($script:called -join ',')"}
  Assert-True ($queueResult.status -eq 'complete' -and ($script:called -join ',') -ceq '2026-10-18-1200') 'queue runs only the current in-grace slot and never replays stale running work'
  Assert-True ((@($saved.cycles|Where-Object cycleId -eq '2026-10-17-2100')[0].status) -ceq 'stopped_cutoff' -and (@($saved.cycles|Where-Object cycleId -eq '2026-10-18-1200')[0].status) -ceq 'complete') 'stale queue entry expires without backfill while the current entry completes'

  $cancelPath=Join-Path $temp 'cancel-queue.json'
  $cancelState=[pscustomobject]@{schema=1;cycles=@(
    [pscustomobject]@{cycleId='2026-10-18-0300';status='pending';attempts=0;lastError=$null;updatedUtc=$now.ToString('o')},
    [pscustomobject]@{cycleId='2026-10-18-1200';status='stopped_unsafe';attempts=1;lastError='old failure';updatedUtc=$now.ToString('o')},
    [pscustomobject]@{cycleId='2026-10-17-2100';status='complete';attempts=1;lastError=$null;updatedUtc=$now.ToString('o')},
    [pscustomobject]@{cycleId='2026-10-17-1800';status='submitted_with_unresolved_intents';attempts=1;lastError=$null;updatedUtc=$now.ToString('o')}
  );updatedUtc=$now.ToString('o')}
  $cancelState|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $cancelPath -Encoding UTF8
  $cancelled=Cancel-ScheduledQueueBacklogByUser $cancelPath
  $cancelSaved=Get-Content -LiteralPath $cancelPath -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($cancelled.cancelled.Count -eq 2 -and @($cancelSaved.cycles|Where-Object status -eq 'canceled_by_user').Count -eq 2 -and @($cancelSaved.cycles|Where-Object status -eq 'complete').Count -eq 1 -and @($cancelSaved.cycles|Where-Object status -eq 'submitted_with_unresolved_intents').Count -eq 1) 'user cancellation terminalizes unfinished states but preserves terminal submission evidence'
  Assert-True ((@($cancelSaved.cycles|Where-Object cycleId -eq '2026-10-18-1200')[0].lastError) -ceq 'old failure' -and -not [string]::IsNullOrWhiteSpace([string](@($cancelSaved.cycles|Where-Object cycleId -eq '2026-10-18-1200')[0].cancellationReason))) 'cancellation preserves the original failure and records user reason separately'

  $retryDir=Join-Path $temp 'retry-states';[IO.Directory]::CreateDirectory($retryDir)|Out-Null
  $retryState=[pscustomobject]@{schema=1;cycleIds=@('2026-10-18-1200');entries=@(
    [pscustomobject]@{cycleId='2026-10-18-1200';status='retry_wait';attempts=2;lastError='original worker error';updatedUtc=$now.ToString('o')},
    [pscustomobject]@{cycleId='2026-10-17-2100';status='submitted_with_unresolved_intents';attempts=1;lastError='publish intent recorded';updatedUtc=$now.ToString('o')}
  );status='retry_wait';currentCycleId='2026-10-18-1200'}
  $retryPath=Join-Path $retryDir '2026-10-18-1200.json';$retryState|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $retryPath -Encoding UTF8
  $retryCancelled=Cancel-SocialPostingRetryStatesByUser $retryDir;$retrySaved=Get-Content -LiteralPath $retryPath -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($retryCancelled.cancelled.Count -eq 1 -and $retrySaved.entries[0].status -eq 'canceled_by_user' -and $retrySaved.entries[1].status -eq 'submitted_with_unresolved_intents' -and $retrySaved.entries[0].lastError -eq 'original worker error') 'retry-state cancellation preserves errors and terminal submission evidence'
}finally{Write-Output "Fixture evidence retained: $temp"}
'FIXED_SOCIAL_SCHEDULE_TEST_OK'
