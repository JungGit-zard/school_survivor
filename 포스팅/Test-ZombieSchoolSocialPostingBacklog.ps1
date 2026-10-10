Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-ZombieSchoolSocialPostingBacklog.ps1') -TestOnly
function Assert-True($Value,[string]$Name){if(-not $Value){throw "FAILED: $Name"};Write-Output "PASS $Name"}

$temp = Join-Path ([IO.Path]::GetTempPath()) ('social-backlog-test-' + [guid]::NewGuid().ToString('N'))
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$tempFull = [IO.Path]::GetFullPath($temp)
if(-not $tempFull.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($tempFull) -notmatch '^social-backlog-test-[0-9a-f]{32}$'){throw "Refusing unexpected test cleanup path: $tempFull"}
try {
  New-Item -ItemType Directory -Path $tempFull | Out-Null
  $statePath = Join-Path $tempFull 'state.json'
  $cycleA='2026-10-06-0200';$cycleB='2026-10-06-0600'
  $script:calls=@();$script:waits=@()
  $result=Invoke-SocialPostingBacklog -CycleIds @($cycleB,$cycleA,$cycleA) -StatePath $statePath -RunCycle {
    param($id,$attempt)
    $script:calls += "$id/$attempt"
    if($id -eq $cycleA -and $attempt -eq 1){return [pscustomobject]@{exitCode=1;output='temporary network timeout'}}
    return [pscustomobject]@{exitCode=0;status='complete';output='{"status":"complete"}'}
  } -Sleep {param($seconds);$script:waits += $seconds}
  Assert-True ($result.status -eq 'complete' -and $script:calls -join ',' -eq "$cycleA/1,$cycleA/2,$cycleB/1") 'chronological cycle processing deduplicates IDs and retries same ID to success'
  Assert-True ($script:waits.Count -eq 1 -and $script:waits[0] -eq 300) 'retry waits exactly 300 seconds once after retryable failure'
  $state=Get-Content -LiteralPath $statePath -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($state.status -eq 'complete' -and @($state.entries|Where-Object status -ne 'complete').Count -eq 0) 'durable state records completed cycles'

  $resumeCalls=0
  $resumed=Invoke-SocialPostingBacklog -CycleIds @($cycleB,$cycleA) -StatePath $statePath -RunCycle {param($id,$attempt);$script:resumeCalls++;[pscustomobject]@{exitCode=0;status='complete';output='{"status":"complete"}'}} -Sleep {param($seconds);throw 'completed backlog must not sleep'}
  Assert-True ($resumed.status -eq 'complete' -and $script:resumeCalls -eq 2) 'resume rechecks already-complete cycles for live reconciliation instead of trusting state alone'

  $unsafeState=Join-Path $tempFull 'unsafe.json';$unsafeCalls=0;$unsafeSleeps=0
  $unsafe=Invoke-SocialPostingBacklog -CycleIds @($cycleA) -StatePath $unsafeState -RunCycle {param($id,$attempt);$script:unsafeCalls++;[pscustomobject]@{exitCode=1;output='UNCERTAIN publish_intent; no second click'}} -Sleep {param($seconds);$script:unsafeSleeps++}
  Assert-True ($unsafe.status -eq 'stopped_unsafe' -and $script:unsafeCalls -eq 1 -and $script:unsafeSleeps -eq 0) 'uncertain publish intent stops visibly without retry'
  $state=Get-Content -LiteralPath $unsafeState -Raw -Encoding UTF8|ConvertFrom-Json
  Assert-True ($state.entries[0].status -eq 'stopped_unsafe') 'unsafe stop is durable and visible in state'
} finally {if(Test-Path -LiteralPath $tempFull){Remove-Item -LiteralPath $tempFull -Recurse -Force}}
Write-Output 'SOCIAL_BACKLOG_TEST_OK'
