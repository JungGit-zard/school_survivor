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
  [Parameter(DontShow=$true)][switch]$TestBypassSlotCheck,
  [switch]$AuthorizedHistoricalRun,
  [switch]$ReconcileExistingPosts,
  [switch]$PersistentRetryMode,
  [switch]$CredentialRecovery,
  [Parameter(DontShow=$true)][switch]$TestOnly,
  [switch]$PersistentScheduledRun,
  [string]$ScheduledSlot = '',
  [switch]$TodayOnlyOverride
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

function Get-FiveSlotScheduledTriggerRunId {
  param([Parameter(Mandatory)][string]$Slot,[Parameter(Mandatory)][DateTimeOffset]$NowKst)
  if ($Slot -notin @('0200','0600','1100','1700','2100')) { throw 'ScheduledSlot must identify one configured daily trigger.' }
  $slotTime=$Slot.Insert(2,':')
  $slotStart=[DateTimeOffset]::ParseExact($NowKst.ToString('yyyy-MM-dd')+' '+$slotTime+' +09:00','yyyy-MM-dd HH:mm zzz',[Globalization.CultureInfo]::InvariantCulture)
  $slotAge=$NowKst-$slotStart
  if($slotAge.TotalMinutes -lt 0 -or $slotAge.TotalMinutes -gt 30){throw "Scheduled trigger $Slot is outside its 30-minute intake grace; no historical cycle was inferred."}
  return $NowKst.ToString('yyyy-MM-dd-')+$Slot
}

function Assert-FiveSlotRunId {
  param([Parameter(Mandatory)][string]$Value)
  if ($Value -notmatch '^\d{4}-\d{2}-\d{2}-(0200|0600|1100|1700|2100)$') {
    throw 'RunId must be exactly yyyy-MM-dd-HHmm for one of 02:00, 06:00, 11:00, 17:00, or 21:00 KST.'
  }
}

function Get-TodayOverrideStopAtKst {
  param([Parameter(Mandatory)][string]$RunId,[Parameter(Mandatory)][DateTimeOffset]$NowKst)
  Assert-FiveSlotRunId $RunId
  if($RunId.Substring(0,10) -cne $NowKst.ToString('yyyy-MM-dd')){throw 'TodayOnlyOverride accepts only an explicitly supplied RunId for the current KST date.'}
  $tomorrow=[DateTime]::ParseExact($NowKst.ToString('yyyy-MM-dd'),'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture).AddDays(1)
  return [DateTimeOffset]::ParseExact($tomorrow.ToString('yyyy-MM-dd')+' 00:00 +09:00','yyyy-MM-dd HH:mm zzz',[Globalization.CultureInfo]::InvariantCulture)
}

function Test-TodayOnlyUnsafeFailure([string]$Message) {
  return $Message -match '(?i)UNCERTAIN|publish_intent|invalid receipt|unsupported immutable receipt state|malformed receipt'
}

function New-HiddenPowerShellStartInfo {
  param([Parameter(Mandatory)][string]$ScriptPath,[Parameter(Mandatory)][object[]]$Arguments)
  $ps = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
  if ([string]::IsNullOrWhiteSpace($ps)) { $ps = 'powershell' }
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $ps
  $invokeParts = @("'" + $ScriptPath.Replace("'","''") + "'")
  for($i=0;$i -lt $Arguments.Count;$i++){
    $token=[string]$Arguments[$i]
    if($token -match '^-[A-Za-z][A-Za-z0-9]*$'){
      $invokeParts += $token
      if(($i+1) -lt $Arguments.Count -and [string]$Arguments[$i+1] -notmatch '^-[A-Za-z][A-Za-z0-9]*$'){
        $value=[string]$Arguments[++$i]
        $invokeParts += ("'" + $value.Replace("'","''") + "'")
      }
    } else {
      $invokeParts += ("'" + $token.Replace("'","''") + "'")
    }
  }
  $invokeExpression = '& ' + ($invokeParts -join ' ')
  $bootstrap = '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); ' + $invokeExpression + '; $runnerSucceeded = $?; $runnerExitCode = $LASTEXITCODE; if ($null -ne $runnerExitCode -and $runnerExitCode -ne 0) { exit $runnerExitCode }; if (-not $runnerSucceeded) { exit 1 }; exit 0'
  $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($bootstrap))
  $startInfo.Arguments = "-NoProfile -STA -ExecutionPolicy Bypass -EncodedCommand $encodedCommand"
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.StandardOutputEncoding = [Text.UTF8Encoding]::new($false)
  $startInfo.StandardErrorEncoding = [Text.UTF8Encoding]::new($false)
  return $startInfo
}

function Invoke-HiddenPowerShell {
  param([Parameter(Mandatory)][string]$ScriptPath,[Parameter(Mandatory)][object[]]$Arguments)
  $startInfo = New-HiddenPowerShellStartInfo -ScriptPath $ScriptPath -Arguments $Arguments
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  try {
    if (-not $process.Start()) { throw 'Child PowerShell process did not start.' }
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    return [pscustomobject]@{ exitCode=$process.ExitCode; output=$stdout.TrimEnd(); error=$stderr.TrimEnd(); noWindow=$startInfo.CreateNoWindow }
  } finally { $process.Dispose() }
}

function Invoke-JsonRunner {
  param(
    [Parameter(Mandatory)][string]$ScriptPath,
    [Parameter(Mandatory)][object[]]$Arguments,
    [Parameter(Mandatory)][string]$Name
  )
  if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) { throw "$Name runner not found: $ScriptPath" }
  $child = Invoke-HiddenPowerShell -ScriptPath $ScriptPath -Arguments $Arguments
  $exit = [int]$child.exitCode
  if ($exit -ne 0) { throw "$Name runner failed (exit $exit): $($child.output)`n$($child.error)" }
  $lines = @(([string]$child.output -split "`r?`n") | ForEach-Object { [string]$_ })
  $joined=($lines -join "`n").Trim()
  try { return ($joined | ConvertFrom-Json -ErrorAction Stop) } catch {}
  $starts=@();for($i=0;$i -lt $lines.Count;$i++){if($lines[$i].Trim().StartsWith('{') -or $lines[$i].Trim().StartsWith('[')){$starts+= $i}}
  foreach($start in $starts){
    $candidate=($lines[$start..($lines.Count-1)] -join "`n").Trim()
    try { return ($candidate | ConvertFrom-Json -ErrorAction Stop) } catch {}
  }
  for($i=$starts.Count-1;$i -ge 0;$i--){try{return ($lines[$starts[$i]].Trim()|ConvertFrom-Json -ErrorAction Stop)}catch{}}
  throw "$Name runner returned non-JSON output: $($lines -join "`n")"
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

function New-ScheduledAttemptResult($AttemptResult) {
  $accepted=@('complete','submitted','submitted_with_unresolved_intents','stopped_cutoff')
  $reason=if($null -ne $AttemptResult.PSObject.Properties['reason']){[string]$AttemptResult.reason}else{$null}
  return [pscustomobject]@{exitCode=if($AttemptResult.status -in $accepted){0}else{1};status=$AttemptResult.status;reason=$reason;output=($AttemptResult|ConvertTo-Json -Compress -Depth 10)}
}

function Test-ScheduledSuccessfulTerminal([string]$Status) { return $Status -in @('complete','queued','submitted','submitted_with_unresolved_intents','stopped_cutoff') }

function Invoke-ZombieSchoolFiveSlotPosting {
  param(
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][string]$ReceiptRoot,
    [Parameter(Mandatory)][string]$FacebookRunnerPath,
    [Parameter(Mandatory)][string]$XRunnerPath,
    [switch]$ValidateOnly,
    [switch]$TestBypassSlotCheck,
    [switch]$AuthorizedHistoricalRun,
    [switch]$ReconcileExistingPosts,
    [switch]$PersistentRetryMode,
    [switch]$CredentialRecovery
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
  if ($AuthorizedHistoricalRun) { $fbArgs += '-AuthorizedHistoricalRun' }
  if ($ReconcileExistingPosts) { $fbArgs += '-ReconcileExistingPosts' }
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
  if ($ReconcileExistingPosts) { $xArgs += '-ReconcileExistingPosts' }
  if ($CredentialRecovery -or -not $ValidateOnly) { $xArgs += '-CredentialRecovery' }
  if ($PersistentRetryMode) { $xArgs += @('-MaxAttempts','1') }
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

function Invoke-SerializedPublishOnlyCycle {
  param([Parameter(Mandatory)][string]$RunId,[Parameter(Mandatory)][string]$ReceiptRoot,[Parameter(Mandatory)][string]$FacebookActionRunnerPath,[Parameter(Mandatory)][string]$XRunnerPath,[string]$StopAtKst='',[scriptblock]$NowKst={ [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)) })
  $cutoffReached={ -not [string]::IsNullOrWhiteSpace($StopAtKst) -and (& $NowKst) -ge [DateTimeOffset]::Parse($StopAtKst,[Globalization.CultureInfo]::InvariantCulture) }
  $languages=@('ja','en','vi','ko');$submitted=@();$unresolved=@();$verified=@();$errors=@()
  $fbRoot=Join-Path $ReceiptRoot 'facebook_posting_receipts';$xRoot=Join-Path $ReceiptRoot 'x_posting_receipts'
  [IO.Directory]::CreateDirectory($fbRoot)|Out-Null;[IO.Directory]::CreateDirectory($xRoot)|Out-Null
  foreach($language in $languages){
    if(& $cutoffReached){return [pscustomobject]@{exitCode=0;status='stopped_cutoff';reason='KST midnight reached before starting the next language'} }
    $receiptPath=Join-Path $fbRoot ($RunId+'.json')
    $entry=if(Test-Path -LiteralPath $receiptPath){(Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8|ConvertFrom-Json).entries.$language}else{$null}
    if($null -ne $entry -and $entry.state -eq 'verified'){$verified += "facebook/$language";continue}
    if($null -ne $entry -and $entry.state -eq 'publish_intent'){$unresolved += "facebook/$language";continue}
    if($null -ne $entry -and $entry.state -notin @('selected','prepared')){$errors += "UNSAFE Facebook $language has unsupported receipt state '$($entry.state)'";continue}
    $base=@('-RunId',$RunId,'-Language',$language,'-ReceiptDirectory',$fbRoot)
    try {
      if($null -eq $entry){$null=Invoke-JsonRunner -ScriptPath $FacebookActionRunnerPath -Arguments (@('-Action','SelectSourcePair')+$base) -Name "Facebook $language frozen pair";$entry=(Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8|ConvertFrom-Json).entries.$language}
      $window=Invoke-JsonRunner -ScriptPath $FacebookActionRunnerPath -Arguments (@('-Action','DiscoverWindow')+$base) -Name "Facebook $language window discovery"
      if($null -eq $window.windowId -or [long]$window.windowId -le 0){throw "UNSAFE Facebook $language did not resolve one window"}
      $windowArgs=$base+@('-WindowId',[string][long]$window.windowId)
      if(-not [string]::IsNullOrWhiteSpace($StopAtKst)){$windowArgs+=@('-StopAtKst',$StopAtKst)}
      $null=Invoke-JsonRunner -ScriptPath $FacebookActionRunnerPath -Arguments (@('-Action','OpenProfile')+$windowArgs) -Name "Facebook $language profile"
      if($entry.state -eq 'selected'){
        foreach($action in @('OpenComposer','TypeText','AttachImage','VerifyDraft')){$null=Invoke-JsonRunner -ScriptPath $FacebookActionRunnerPath -Arguments (@('-Action',$action)+$windowArgs) -Name "Facebook $language $action"}
      } else {
        $null=Invoke-JsonRunner -ScriptPath $FacebookActionRunnerPath -Arguments (@('-Action','ResumeOwnDraft')+$windowArgs) -Name "Facebook $language resume draft"
        $null=Invoke-JsonRunner -ScriptPath $FacebookActionRunnerPath -Arguments (@('-Action','VerifyDraft')+$windowArgs) -Name "Facebook $language verify resumed draft"
      }
      if(& $cutoffReached){return [pscustomobject]@{exitCode=0;status='stopped_cutoff';reason="KST midnight reached before Facebook $language PublishOnce"} }
      $null=Invoke-JsonRunner -ScriptPath $FacebookActionRunnerPath -Arguments (@('-Action','PublishOnce')+$windowArgs+@('-AuthorizePublish')) -Name "Facebook $language PublishOnce"
      $after=(Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8|ConvertFrom-Json).entries.$language
      if($null -eq $after -or $after.state -ne 'publish_intent'){throw "UNSAFE Facebook $language PublishOnce returned without a persisted publish_intent"}
      $submitted += "facebook/$language"
    } catch {$message=$_.Exception.Message;if($message -match 'SCHEDULE_CUTOFF'){return [pscustomobject]@{exitCode=0;status='stopped_cutoff';reason=$message}}elseif(Test-TodayOnlyUnsafeFailure $message){return [pscustomobject]@{exitCode=1;status='stopped_unsafe';output=$message}}else{$errors += $message}}
  }
  foreach($language in $languages){
    if(& $cutoffReached){return [pscustomobject]@{exitCode=0;status='stopped_cutoff';reason='KST midnight reached before starting the next language'} }
    $receiptPath=Join-Path $xRoot ($RunId+'.json')
    $entry=if(Test-Path -LiteralPath $receiptPath){(Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8|ConvertFrom-Json).entries.$language}else{$null}
    if($null -ne $entry -and $entry.state -eq 'verified'){$verified += "x/$language";continue}
    if($null -ne $entry -and $entry.state -eq 'publish_intent'){$unresolved += "x/$language";continue}
    try {
      if(& $cutoffReached){return [pscustomobject]@{exitCode=0;status='stopped_cutoff';reason="KST midnight reached before X $language PublishOnly"} }
      $args=@('-Run','-SinglePost','-PublishOnly','-Language',$language,'-CycleId',$RunId,'-ReceiptDirectory',$xRoot,'-CredentialRecovery')
      if(-not [string]::IsNullOrWhiteSpace($StopAtKst)){$args+=@('-StopAtKst',$StopAtKst)}
      $result=Invoke-JsonRunner -ScriptPath $XRunnerPath -Arguments $args -Name "X $language PublishOnly"
      $after=(Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8|ConvertFrom-Json).entries.$language
      if($null -eq $after -or $after.state -ne 'publish_intent'){throw "UNSAFE X $language PublishOnly returned without a persisted publish_intent"}
      if($result.status -notin @('published_unverified','partial_verified','complete')){throw "X $language PublishOnly returned unexpected status '$($result.status)'"}
      $submitted += "x/$language"
    } catch {$message=$_.Exception.Message;if($message -match 'SCHEDULE_CUTOFF'){return [pscustomobject]@{exitCode=0;status='stopped_cutoff';reason=$message}}elseif(Test-TodayOnlyUnsafeFailure $message){return [pscustomobject]@{exitCode=1;status='stopped_unsafe';output=$message}}else{$errors += $message}}
  }
  if($errors.Count -gt 0){return [pscustomobject]@{exitCode=1;status='partial_failed';output=($errors -join ' | ')}}
  $status=if($unresolved.Count -gt 0){'submitted_with_unresolved_intents'}else{'submitted'}
  return [pscustomobject]@{exitCode=0;status=$status;output=([pscustomobject]@{status=$status;runId=$RunId;submitted=$submitted;priorPublishIntentNotReplayed=$unresolved;verifiedSkipped=$verified;verification='intentionally_deferred_to_user'}|ConvertTo-Json -Compress -Depth 6)}
}

function Invoke-FiveSlotPersistentScheduledRun {
  param(
    [Parameter(Mandatory)][string]$RunId,
    [Parameter(Mandatory)][string]$StatePath,
    [Parameter(Mandatory)][scriptblock]$RunCycle,
    [scriptblock]$Sleep = { param($seconds) Start-Sleep -Seconds $seconds },
    [string]$StopAtKst = '',
    [switch]$RetryGuardedFailures,
    [scriptblock]$NowKst = { [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)) }
  )
  $scheduledCycleId = $RunId
  $scheduledStatePath = $StatePath
  . (Join-Path $PSScriptRoot 'Invoke-ZombieSchoolSocialPostingBacklog.ps1') -TestOnly
  $resumeGuardedStop=$false
  if (Test-Path -LiteralPath $scheduledStatePath) {
    $priorState = Get-Content -LiteralPath $scheduledStatePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $priorEntry = @($priorState.entries | Where-Object { $_.cycleId -ceq $scheduledCycleId } | Select-Object -First 1)
    if ($priorState.schema -eq 1 -and $priorEntry.Count -gt 0 -and $priorEntry[0].status -eq 'stopped_unsafe') {
      $reason=[string]$priorEntry[0].lastError
      if(-not $RetryGuardedFailures -or (Test-SocialBacklogHardStop $reason)){return [pscustomobject]@{ status='stopped_unsafe';cycleId=$scheduledCycleId;attempts=[int]$priorEntry[0].attempts;reason=$reason;statePath=$scheduledStatePath }}
      $resumeGuardedStop=$true;$priorEntry[0].status='retry_wait';$priorEntry[0]|Add-Member -Force -NotePropertyName nextRetryUtc -NotePropertyValue ([DateTimeOffset]::UtcNow.AddSeconds(300).ToString('o'));$priorEntry[0].updatedUtc=[DateTimeOffset]::UtcNow.ToString('o');$priorState.status='retry_wait';Save-SocialBacklogState $priorState $scheduledStatePath
    }
  }
  if($resumeGuardedStop){
    if(-not [string]::IsNullOrWhiteSpace($StopAtKst) -and (& $NowKst) -ge [DateTimeOffset]::Parse($StopAtKst,[Globalization.CultureInfo]::InvariantCulture)){$priorEntry[0].status='stopped_cutoff';$priorEntry[0].lastError='KST cutoff reached before guarded failure recheck';$priorEntry[0].nextRetryUtc=$null;$priorEntry[0].updatedUtc=[DateTimeOffset]::UtcNow.ToString('o');$priorState.status='stopped_cutoff';Save-SocialBacklogState $priorState $scheduledStatePath;return [pscustomobject]@{status='stopped_cutoff';cycleId=$scheduledCycleId;reason=$priorEntry[0].lastError;statePath=$scheduledStatePath}}
    & $Sleep 300
  }
  return Invoke-SocialPostingBacklog -CycleIds @($scheduledCycleId) -StatePath $scheduledStatePath -RunCycle $RunCycle -Sleep $Sleep -RetryDelaySeconds 300 -StopAtKst $StopAtKst -RetryGuardedFailures:$RetryGuardedFailures -NowKst $NowKst
}

function Get-ScheduledQueueMutexNames([string]$QueuePath) {
  $bytes = [Text.Encoding]::UTF8.GetBytes([IO.Path]::GetFullPath($QueuePath).ToLowerInvariant())
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $hash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').Substring(0,16) } finally { $sha.Dispose() }
  return [pscustomobject]@{ state="Local\EscapeZombieSchoolQueueState_$hash"; worker="Local\EscapeZombieSchoolQueueWorker_$hash" }
}

function Save-ScheduledQueueState($State, [string]$Path) {
  [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  $temporary = $Path + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
  [IO.File]::WriteAllText($temporary, ($State | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
  if ([IO.File]::Exists($Path)) { [IO.File]::Replace($temporary, $Path, [NullString]::Value) }
  else { [IO.File]::Move($temporary, $Path) }
}

function Add-ScheduledTriggerCycle {
  param([Parameter(Mandatory)][string]$QueuePath,[Parameter(Mandatory)][string]$CycleId)
  if ($CycleId -notmatch '^\d{4}-\d{2}-\d{2}-(0200|0600|1100|1700|2100)$') { throw "Invalid scheduled trigger CycleId: $CycleId" }
  $names = Get-ScheduledQueueMutexNames $QueuePath
  $mutex = [Threading.Mutex]::new($false, $names.state);$locked=$false
  try {
    try { $locked=$mutex.WaitOne() } catch [Threading.AbandonedMutexException] { $locked=$true }
    $state = if (Test-Path -LiteralPath $QueuePath) { Get-Content -LiteralPath $QueuePath -Raw -Encoding UTF8 | ConvertFrom-Json } else { [pscustomobject]@{schema=1;cycles=@();updatedUtc=$null} }
    if ($state.schema -ne 1) { throw 'Scheduled trigger queue has an unsupported schema.' }
    $exists = @($state.cycles | Where-Object { $_.cycleId -ceq $CycleId }).Count -gt 0
    if (-not $exists) { $state.cycles = @($state.cycles) + @([pscustomobject]@{cycleId=$CycleId;status='pending';attempts=0;lastError=$null;updatedUtc=[DateTimeOffset]::UtcNow.ToString('o')}) }
    $state.updatedUtc=[DateTimeOffset]::UtcNow.ToString('o')
    Save-ScheduledQueueState $state $QueuePath
    return [pscustomobject]@{cycleId=$CycleId;added=(-not $exists);status=if($exists){(@($state.cycles|Where-Object{$_.cycleId -ceq $CycleId}|Select-Object -First 1)[0].status)}else{'pending'}}
  } finally { if($locked){$mutex.ReleaseMutex()};$mutex.Dispose() }
}

function Invoke-FiveSlotScheduledQueue {
  param(
    [Parameter(Mandatory)][string]$QueuePath,
    [Parameter(Mandatory)][string]$CycleId,
    [string]$SerialMutexName = '',
    [Parameter(Mandatory)][scriptblock]$RunCycle,
    [scriptblock]$Sleep = { param($seconds) Start-Sleep -Seconds $seconds },
    [scriptblock]$BeforeWorkerRelease,
    [string]$StopAtKst = '',
    [scriptblock]$NowKst = { [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)) }
  )
  $null = Add-ScheduledTriggerCycle -QueuePath $QueuePath -CycleId $CycleId
  $names = Get-ScheduledQueueMutexNames $QueuePath
  $workerMutex = [Threading.Mutex]::new($false, $names.worker);$workerLocked=$false
  try { try { $workerLocked=$workerMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $workerLocked=$true } }
  catch { $workerMutex.Dispose();throw }
  if (-not $workerLocked) { $workerMutex.Dispose();return [pscustomobject]@{status='queued';cycleId=$CycleId;queuePath=$QueuePath} }
  $processed=@()
  try {
    while ($true) {
      $stateMutex=[Threading.Mutex]::new($false,$names.state);$stateLocked=$false
      try {
        try { $stateLocked=$stateMutex.WaitOne() } catch [Threading.AbandonedMutexException] { $stateLocked=$true }
        $state=Get-Content -LiteralPath $QueuePath -Raw -Encoding UTF8|ConvertFrom-Json
        if(-not [string]::IsNullOrWhiteSpace($StopAtKst) -and (& $NowKst) -ge [DateTimeOffset]::Parse($StopAtKst,[Globalization.CultureInfo]::InvariantCulture)){
          foreach($pending in @($state.cycles|Where-Object{$_.status -in @('pending','running')})){$pending.status='stopped_cutoff';$pending.lastError='Same-day override reached its KST midnight cutoff.';$pending.updatedUtc=[DateTimeOffset]::UtcNow.ToString('o')}
          $state.updatedUtc=[DateTimeOffset]::UtcNow.ToString('o');Save-ScheduledQueueState $state $QueuePath
          $terminal=if(@($state.cycles|Where-Object status -eq 'stopped_cutoff').Count){'stopped_cutoff'}elseif(@($state.cycles|Where-Object status -eq 'submitted_with_unresolved_intents').Count){'submitted_with_unresolved_intents'}elseif(@($state.cycles|Where-Object status -eq 'submitted').Count){'submitted'}else{'complete'}
          $workerMutex.ReleaseMutex();$workerLocked=$false
          return [pscustomobject]@{status=$terminal;cycleIds=@($processed);queuePath=$QueuePath}
        }
        $entry=@($state.cycles|Where-Object{$_.status -in @('pending','running')}|Sort-Object cycleId|Select-Object -First 1)
        if($entry.Count -eq 0){
          if($null -ne $BeforeWorkerRelease){& $BeforeWorkerRelease $QueuePath}
          $state=Get-Content -LiteralPath $QueuePath -Raw -Encoding UTF8|ConvertFrom-Json
          $entry=@($state.cycles|Where-Object{$_.status -in @('pending','running')}|Sort-Object cycleId|Select-Object -First 1)
          if($entry.Count -eq 0){
            $workerMutex.ReleaseMutex();$workerLocked=$false
            $terminal=if(@($state.cycles|Where-Object status -eq 'stopped_cutoff').Count){'stopped_cutoff'}elseif(@($state.cycles|Where-Object status -eq 'submitted_with_unresolved_intents').Count){'submitted_with_unresolved_intents'}elseif(@($state.cycles|Where-Object status -eq 'submitted').Count){'submitted'}else{'complete'}
            return [pscustomobject]@{status=$terminal;cycleIds=@($processed);queuePath=$QueuePath}
          }
        }
        $cycleId=[string]$entry[0].cycleId
        $entry[0].status='running';$entry[0].attempts=[int]$entry[0].attempts+1;$entry[0].updatedUtc=[DateTimeOffset]::UtcNow.ToString('o')
        Save-ScheduledQueueState $state $QueuePath
      } finally { if($stateLocked){$stateMutex.ReleaseMutex()};$stateMutex.Dispose() }
      $serialMutex=$null;$serialLocked=$false
      try {
        if(-not [string]::IsNullOrWhiteSpace($SerialMutexName)){
          $serialMutex=[Threading.Mutex]::new($false,$SerialMutexName)
          try{$serialLocked=$serialMutex.WaitOne()}catch [Threading.AbandonedMutexException]{$serialLocked=$true}
        }
        $cycleResult = Invoke-FiveSlotPersistentScheduledRun -RunId $cycleId -StatePath (Join-Path (Split-Path -Parent $QueuePath) (Join-Path 'social_posting_scheduled_retries' ($cycleId+'.json'))) -RunCycle $RunCycle -Sleep $Sleep -StopAtKst $StopAtKst -RetryGuardedFailures -NowKst $NowKst
      } finally {if($serialLocked){$serialMutex.ReleaseMutex()};if($null -ne $serialMutex){$serialMutex.Dispose()}}
      $processed += $cycleId
      $stateMutex=[Threading.Mutex]::new($false,$names.state);$stateLocked=$false
      try {
        try { $stateLocked=$stateMutex.WaitOne() } catch [Threading.AbandonedMutexException] { $stateLocked=$true }
        $state=Get-Content -LiteralPath $QueuePath -Raw -Encoding UTF8|ConvertFrom-Json
        $entry=@($state.cycles|Where-Object{$_.cycleId -ceq $cycleId}|Select-Object -First 1)
        if($entry.Count -ne 1){throw "Scheduled queue lost cycle $cycleId."}
        $entry[0].status=if($cycleResult.status -in @('complete','submitted','submitted_with_unresolved_intents')){$cycleResult.status}elseif($cycleResult.status -in @('stopped_unsafe','stopped_cutoff')){$cycleResult.status}else{throw "Unexpected scheduled cycle result: $($cycleResult.status)"}
        $entry[0].lastError=if($entry[0].status -in @('stopped_unsafe','stopped_cutoff')){[string]$cycleResult.reason}else{$null}
        $entry[0].updatedUtc=[DateTimeOffset]::UtcNow.ToString('o');$state.updatedUtc=$entry[0].updatedUtc
        Save-ScheduledQueueState $state $QueuePath
      } finally { if($stateLocked){$stateMutex.ReleaseMutex()};$stateMutex.Dispose() }
    }
  } finally { if($workerLocked){$workerMutex.ReleaseMutex()};$workerMutex.Dispose() }
}

if ($TestOnly) { return }

if($TodayOnlyOverride -and ($PersistentScheduledRun -or [string]::IsNullOrWhiteSpace($RunId) -or $ValidateOnly -or $TestBypassSlotCheck -or $AuthorizedHistoricalRun)){throw 'TodayOnlyOverride requires one explicit same-day slot RunId; historical authorization is granted internally only.'}
if ($PersistentScheduledRun -and -not [string]::IsNullOrWhiteSpace($RunId)) { throw 'PersistentScheduledRun derives its slot-specific CycleId internally; explicit RunIds are forbidden.' }
if ($TodayOnlyOverride) {
  $StopAtKst=Get-TodayOverrideStopAtKst -RunId $RunId -NowKst ([DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)))
} elseif ($PersistentScheduledRun) {
  $nowKst=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9))
  $RunId=Get-FiveSlotScheduledTriggerRunId -Slot $ScheduledSlot -NowKst $nowKst
} elseif ([string]::IsNullOrWhiteSpace($RunId)) { $RunId = Get-FiveSlotRunId ([DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9))) }
if (-not $PersistentScheduledRun -and -not [string]::IsNullOrWhiteSpace($ScheduledSlot)) { throw 'ScheduledSlot is only valid with PersistentScheduledRun.' }
Assert-FiveSlotRunId $RunId
if ([string]::IsNullOrWhiteSpace($ReceiptRoot)) { $ReceiptRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'Developer\agent_room' }
if ([string]::IsNullOrWhiteSpace($FacebookRunnerPath)) { $FacebookRunnerPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'marketing\facebook_daily_zombie_school_posting\Invoke-FacebookScheduledPosting.ps1' }
if ([string]::IsNullOrWhiteSpace($XRunnerPath)) { $XRunnerPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'marketing\x_daily_zombie_school_posting\Invoke-XDailyZombieSchoolPostingRecovery.ps1' }
if ($PersistentScheduledRun -and $ValidateOnly) { throw 'PersistentScheduledRun cannot be combined with ValidateOnly.' }

$mutex = $null
$locked = $false
try {
  if (-not $ValidateOnly -and -not ($PersistentScheduledRun -or $TodayOnlyOverride)) {
    $mutex = [Threading.Mutex]::new($false, 'Local\EscapeZombieSchoolFiveSlotSerial')
    try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Another scheduled or backlog social cycle owns the five-slot serial lock.' }
  }
$receiptRootFull = [IO.Path]::GetFullPath($ReceiptRoot)
  $facebookRunnerFull = [IO.Path]::GetFullPath($FacebookRunnerPath)
  $xRunnerFull = [IO.Path]::GetFullPath($XRunnerPath)
  if ($PersistentScheduledRun -or $TodayOnlyOverride) {
    $todayCutoffIso=if($TodayOnlyOverride){[string]$StopAtKst.ToString('o')}else{''}
    $queueName=if($TodayOnlyOverride){'social_posting_today_override_queue_'+$RunId.Substring(0,10)+'.json'}else{'social_posting_scheduled_queue.json'}
    $queuePath = Join-Path $receiptRootFull $queueName
    $todayRunCycle = {
      param($cycleId, $attempt)
      try {
        $attemptResult=Invoke-SerializedPublishOnlyCycle -RunId $cycleId -ReceiptRoot $receiptRootFull -FacebookActionRunnerPath (Join-Path (Split-Path -Parent $PSScriptRoot) 'marketing\facebook_daily_zombie_school_posting\Invoke-FacebookDailyZombieSchoolPosting.ps1') -XRunnerPath (Join-Path (Split-Path -Parent $PSScriptRoot) 'marketing\x_daily_zombie_school_posting\Invoke-XDailyZombieSchoolPosting.ps1') -StopAtKst $todayCutoffIso
        New-ScheduledAttemptResult $attemptResult
      } catch {
        [pscustomobject]@{ exitCode=1;status='failed';output=$_.Exception.Message }
      }
    }.GetNewClosure()
    $result = Invoke-FiveSlotScheduledQueue -QueuePath $queuePath -CycleId $RunId -SerialMutexName 'Local\EscapeZombieSchoolFiveSlotSerial' -StopAtKst $todayCutoffIso -RunCycle $todayRunCycle
  } else {
    $result = Invoke-ZombieSchoolFiveSlotPosting -RunId $RunId -ReceiptRoot $receiptRootFull -FacebookRunnerPath $facebookRunnerFull -XRunnerPath $xRunnerFull -ValidateOnly:$ValidateOnly -TestBypassSlotCheck:$TestBypassSlotCheck -AuthorizedHistoricalRun:$AuthorizedHistoricalRun -ReconcileExistingPosts:$ReconcileExistingPosts -PersistentRetryMode:$PersistentRetryMode -CredentialRecovery:$CredentialRecovery
  }
} finally {
  if ($locked) { $mutex.ReleaseMutex() }
  if ($null -ne $mutex) { $mutex.Dispose() }
}
$result | ConvertTo-Json -Depth 10 -Compress
if (-not (Test-ScheduledSuccessfulTerminal $result.status) -and -not $ValidateOnly) { exit 1 }
