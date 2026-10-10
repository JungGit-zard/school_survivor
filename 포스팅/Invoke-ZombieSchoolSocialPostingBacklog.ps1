[CmdletBinding()]
param(
  [string[]]$CycleIds = @(),
  [string]$StatePath = '',
  [string]$ReceiptRoot = '',
  [string]$FiveSlotRunnerPath = '',
  [switch]$TestOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-SocialBacklogCycleIds([string[]]$Ids) {
  $validSlots = @('0200','0600','1100','1700','2100')
  foreach ($id in $Ids) {
    if ($id -notmatch '^\d{4}-\d{2}-\d{2}-(0200|0600|1100|1700|2100)$') { throw "Invalid scheduled cycle ID: $id" }
    $null = [datetime]::ParseExact($id.Substring(0,10), 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
  }
  return @($Ids | Sort-Object -Unique)
}

function Test-SocialBacklogUnsafe([string]$Message) {
  return $Message -match '(?i)UNSAFE|UNCERTAIN|publish_intent|malformed receipt|invalid receipt|unsupported receipt state|Authentication|Sign in|Log in|Security|Challenge|Captcha|Unexpected account|wrong account|unsafe desktop|receipt does not reconcile|Expected one existing Chrome|focus changed|foreground.*changed|no input sent|Credential Manager|X login|login form|account session|ambiguous|Expected one visible|found [2-9]'
}

function Test-SocialBacklogHardStop([string]$Message) {
  return $Message -match '(?i)UNCERTAIN|publish_intent|invalid receipt|unsupported receipt state|malformed receipt'
}

function Save-SocialBacklogState($State, [string]$Path) {
  [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
  $temporary = $Path + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
  [IO.File]::WriteAllText($temporary, ($State | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
  if ([IO.File]::Exists($Path)) { [IO.File]::Replace($temporary, $Path, [NullString]::Value) }
  else { [IO.File]::Move($temporary, $Path) }
}

function Invoke-SocialPostingBacklog {
  param(
    [Parameter(Mandatory)][string[]]$CycleIds,
    [Parameter(Mandatory)][string]$StatePath,
    [Parameter(Mandatory)][scriptblock]$RunCycle,
    [scriptblock]$Sleep = { param($seconds) Start-Sleep -Seconds $seconds },
    [int]$RetryDelaySeconds = 300,
    [string]$StopAtKst = '',
    [switch]$RetryGuardedFailures,
    [scriptblock]$NowKst = { [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(9)) }
  )
  if ($RetryDelaySeconds -ne 300) { throw 'Persistent social backlog retries are fixed at exactly 300 seconds.' }
  $orderedIds = @(Get-SocialBacklogCycleIds $CycleIds)
  if ($orderedIds.Count -eq 0) { throw 'At least one explicit cycle ID is required.' }
  $idsDigest = [string]::Join(',', $orderedIds)
  $state = if (Test-Path -LiteralPath $StatePath) { Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json } else { [pscustomobject]@{ schema=1; cycleIds=@($orderedIds); entries=@(); status='pending'; currentCycleId=$null } }
  if ($state.schema -ne 1 -or ([string]::Join(',', @($state.cycleIds)) -cne $idsDigest)) { throw 'Backlog state does not match the explicit immutable cycle ID list.' }
  foreach ($id in $orderedIds) {
    $matches = @($state.entries | Where-Object { $_.cycleId -ceq $id } | Select-Object -First 1)
    if ($matches.Count -eq 0) { $entry = [pscustomobject]@{ cycleId=$id; status='pending'; attempts=0; lastError=$null; nextRetryUtc=$null; updatedUtc=$null }; $state.entries = @($state.entries) + @($entry) }
    else { $entry = $matches[0] }
    $state.currentCycleId = $id
    $state.status = 'running'
    while ($true) {
      if (-not [string]::IsNullOrWhiteSpace($StopAtKst)) {
        $cutoff = [DateTimeOffset]::Parse($StopAtKst, [Globalization.CultureInfo]::InvariantCulture)
        if ((& $NowKst) -ge $cutoff) {
          $entry.status='stopped_cutoff';$entry.lastError='Same-day override reached its KST midnight cutoff before another attempt.';$entry | Add-Member -Force -NotePropertyName nextRetryUtc -NotePropertyValue $null;$entry.updatedUtc=[DateTimeOffset]::UtcNow.ToString('o');$state.status='stopped_cutoff';Save-SocialBacklogState $state $StatePath
          return [pscustomobject]@{ status='stopped_cutoff';cycleId=$id;attempts=$entry.attempts;reason=$entry.lastError;statePath=$StatePath }
        }
      }
      $entry.attempts = [int]$entry.attempts + 1
      $entry.status='running'
      $entry | Add-Member -Force -NotePropertyName nextRetryUtc -NotePropertyValue $null
      $entry.updatedUtc = [DateTimeOffset]::UtcNow.ToString('o')
      Save-SocialBacklogState $state $StatePath
      $response = $null
      try { $response = & $RunCycle $id ([int]$entry.attempts) }
      catch { $response = [pscustomobject]@{ exitCode=1; output=$_.Exception.Message } }
      $output = if($null -ne $response.PSObject.Properties['output']){[string]$response.output}else{''}
      $status = if ($null -ne $response.PSObject.Properties['status']) { [string]$response.status } else { '' }
      if($response.exitCode -eq 0 -and $status -eq 'stopped_cutoff'){$entry.status='stopped_cutoff';$entry.lastError=[string]$response.reason;$entry.nextRetryUtc=$null;$state.status='stopped_cutoff';Save-SocialBacklogState $state $StatePath;return [pscustomobject]@{status='stopped_cutoff';cycleId=$id;attempts=$entry.attempts;reason=$entry.lastError;statePath=$StatePath}}
      $complete = ($response.exitCode -eq 0 -and ($status -in @('complete','submitted','submitted_with_unresolved_intents') -or $output -match '"status"\s*:\s*"(?:complete|submitted|submitted_with_unresolved_intents)"'))
      if ($complete) { $entry.status=$status;if([string]::IsNullOrWhiteSpace($entry.status)){$entry.status='complete'};$entry.lastError=if($entry.status -eq 'submitted_with_unresolved_intents'){$output}else{$null};$entry.nextRetryUtc=$null;Save-SocialBacklogState $state $StatePath;break }
      $message = if (-not [string]::IsNullOrWhiteSpace($output)) { $output } else { [string]$response.error }
      if (Test-SocialBacklogUnsafe $message) {
        $guardedRetry=$RetryGuardedFailures -and $message -match '(?i)wrong account|Expected one existing Chrome|focus changed|foreground.*changed|no input sent|Expected one visible|found [2-9]|window.*changed|not the fixed .* profile|Authentication|Sign in|Log in|Security|Challenge|Captcha|Credential Manager|login form|account session|ambiguous'
        if((Test-SocialBacklogHardStop $message) -or -not $guardedRetry){
          $entry.status='stopped_unsafe';$entry.lastError=$message;$entry.nextRetryUtc=$null;$state.status='stopped_unsafe';Save-SocialBacklogState $state $StatePath
          return [pscustomobject]@{ status='stopped_unsafe';cycleId=$id;attempts=$entry.attempts;reason=$message;statePath=$StatePath }
        }
      }
      $entry.status='retry_wait';$entry.lastError=$message;$entry.nextRetryUtc=[DateTimeOffset]::UtcNow.AddSeconds(300).ToString('o');$state.status='retry_wait';Save-SocialBacklogState $state $StatePath
      & $Sleep 300
    }
  }
  $terminalStatuses=@($state.entries|Where-Object{$_.status -in @('submitted_with_unresolved_intents')})
  $state.status=if($terminalStatuses.Count -gt 0){'submitted_with_unresolved_intents'}elseif(@($state.entries|Where-Object{$_.status -eq 'submitted'}).Count -gt 0){'submitted'}else{'complete'}
  $state.currentCycleId=$null;Save-SocialBacklogState $state $StatePath
  return [pscustomobject]@{ status=$state.status;cycleIds=@($orderedIds);statePath=$StatePath;attempts=(@($state.entries | Measure-Object -Property attempts -Sum)[0].Sum) }
}

if ($TestOnly) { return }
$CycleIds = @(Get-SocialBacklogCycleIds $CycleIds)
if ($CycleIds.Count -eq 0) { throw 'Supply the explicitly authorized historical or missed scheduled -CycleIds.' }
if ([string]::IsNullOrWhiteSpace($ReceiptRoot)) { $ReceiptRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'Developer\agent_room' }
if ([string]::IsNullOrWhiteSpace($StatePath)) { $StatePath = Join-Path $ReceiptRoot 'social_posting_backlog_state.json' }
if ([string]::IsNullOrWhiteSpace($FiveSlotRunnerPath)) { $FiveSlotRunnerPath = Join-Path $PSScriptRoot 'Invoke-ZombieSchoolFiveSlotPosting.ps1' }
$ReceiptRoot = [IO.Path]::GetFullPath($ReceiptRoot)
$StatePath = [IO.Path]::GetFullPath($StatePath)
$FiveSlotRunnerPath = [IO.Path]::GetFullPath($FiveSlotRunnerPath)
$powershell = Join-Path $PSHOME 'powershell.exe'
 $backlogMutex = [Threading.Mutex]::new($false, 'Local\EscapeZombieSchoolSocialPostingBacklog')
 $backlogLocked = $false
 try {
   try { $backlogLocked = $backlogMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $backlogLocked = $true }
   if (-not $backlogLocked) { throw 'Another persistent social backlog runner is already active.' }
   $result = Invoke-SocialPostingBacklog -CycleIds $CycleIds -StatePath $StatePath -RunCycle {
     param($id, $attempt)
     $runnerArgs = @('-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',$FiveSlotRunnerPath,'-RunId',$id,'-ReceiptRoot',$ReceiptRoot,'-AuthorizedHistoricalRun','-ReconcileExistingPosts','-PersistentRetryMode','-CredentialRecovery')
     $output = & $powershell @runnerArgs 2>&1 | Out-String
     $exitCode = $LASTEXITCODE
     $json = $null
     if ($output -match '(?m)^\s*(\{.*\})\s*$') { try { $json = $Matches[1] | ConvertFrom-Json } catch {} }
     [pscustomobject]@{ exitCode=$exitCode;status=if($null -ne $json){$json.status}else{$null};output=$output }
   }
 } finally {
   if ($backlogLocked) { $backlogMutex.ReleaseMutex() }
   $backlogMutex.Dispose()
 }
$result | ConvertTo-Json -Depth 6 -Compress
if ($result.status -ne 'complete') { exit 1 }
