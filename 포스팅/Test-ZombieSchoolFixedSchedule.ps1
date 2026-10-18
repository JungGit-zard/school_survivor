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

  $script:serializedSteps=@();$script:serializedRoot=Join-Path $temp 'serialized';$script:serializedRun='2026-10-18-0300'
  function Invoke-JsonRunner {
    param([string]$ScriptPath,[object[]]$Arguments,[string]$Name)
    $isX=$Name -like 'X *';$platform=if($isX){'x'}else{'facebook'};$script:serializedSteps += "$platform/$Name"
    $argMap=@{};for($i=0;$i -lt $Arguments.Count;$i++){$key=[string]$Arguments[$i];if($key -match '^-'){if(($i+1) -lt $Arguments.Count -and [string]$Arguments[$i+1] -notmatch '^-'){$argMap[$key]=[string]$Arguments[$i+1];$i++}else{$argMap[$key]=$true}}}
    $language=[string]$argMap['-Language'];$runId=if($argMap.ContainsKey('-RunId')){$argMap['-RunId']}else{$argMap['-CycleId']}
    $receiptRoot=Join-Path $script:serializedRoot ($platform+'_posting_receipts');[IO.Directory]::CreateDirectory($receiptRoot)|Out-Null;$path=Join-Path $receiptRoot ($runId+'.json')
    $langs=@('ja','en','vi','ko');$receipt=if(Test-Path -LiteralPath $path){Get-Content -LiteralPath $path -Raw|ConvertFrom-Json}else{[pscustomobject]@{entries=[pscustomobject]@{ja=$null;en=$null;vi=$null;ko=$null}}}
    if($platform -eq 'x'){
      $receipt.entries.$language=[pscustomobject]@{state='publish_intent';intent=[pscustomobject]@{language=$language}}
      $receipt|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8
      return [pscustomobject]@{status='published_unverified'}
    }
    $action=[string]$argMap['-Action'];if($action -eq 'DiscoverWindow'){return [pscustomobject]@{windowId=901}}
    if($action -eq 'SelectSourcePair'){$receipt.entries.$language=[pscustomobject]@{state='selected';intent=[pscustomobject]@{language=$language}}}
    if($action -eq 'VerifyDraft'){$receipt.entries.$language.state='prepared'}
    if($action -eq 'PublishOnce'){$receipt.entries.$language.state='publish_intent'}
    if($action -in @('SelectSourcePair','VerifyDraft','PublishOnce')){$receipt|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8}
    return [pscustomobject]@{status='ok';windowId=901}
  }
  $serialized=Invoke-SerializedPublishOnlyCycle -RunId $script:serializedRun -ReceiptRoot $script:serializedRoot -FacebookActionRunnerPath $fbStub -XRunnerPath $xStub
  $firstFacebook=[array]::IndexOf([string[]]$script:serializedSteps,(@($script:serializedSteps|Where-Object{$_ -like 'facebook/*'})[0]))
  Assert-True ($serialized.status -eq 'submitted_with_unresolved_intents' -and $firstFacebook -ge 4 -and @($script:serializedSteps|Where-Object{$_ -like 'x/* PublishOnly'}).Count -eq 4) 'scheduled publish-only cycle finishes all four X actions before opening Facebook'

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
}finally{Remove-Item -LiteralPath $temp -Recurse -Force}
'FIXED_SOCIAL_SCHEDULE_TEST_OK'
