$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $PSCommandPath
$checker = Join-Path $scriptDir 'check-required-documents.ps1'
$manifest = Join-Path $scriptDir 'manifest.json'

function Invoke-CheckerJson {
  param(
    [string]$Profile,
    [string]$Domain = 'auto',
    [string]$TaskSummary = $null
  )
  $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$checker,'-Profile',$Profile,'-Domain',$Domain)
  if (![string]::IsNullOrWhiteSpace($TaskSummary)) { $args += @('-TaskSummary', $TaskSummary) }
  $output = & powershell @args
  if ($LASTEXITCODE -ne 0) { throw "checker failed for $Profile/$Domain/$TaskSummary" }
  return ($output | ConvertFrom-Json)
}

function Assert-Contains {
  param([object[]]$Values, [string]$Expected, [string]$Message)
  if (@($Values) -notcontains $Expected) { throw "$Message. Expected '$Expected' in [$(@($Values) -join ', ')]" }
}

function Assert-NotTooManyReadRequired {
  param([object]$Result)
  $count = @($Result.read_required).Count
  if ($count -gt 20) { throw "read_required count must be <= 20, got $count for $($Result.profile)/$($Result.domain)" }
}

$m = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($domainName in $m.domains.PSObject.Properties.Name) {
  $domain = $m.domains.$domainName
  if ($domainName -eq 'common') { continue }
  if (-not ($domain.PSObject.Properties.Name -contains 'taskKeywords')) { throw "domain $domainName missing taskKeywords" }
  $keywords = @($domain.taskKeywords)
  if ($keywords.Count -lt 2) { throw "domain $domainName taskKeywords must contain Korean/English minimum keywords" }
}

$launch = Invoke-CheckerJson -Profile 'launchmini' -TaskSummary 'AAB versionCode upload'
Assert-Contains $launch.resolved_domains 'aab' 'launchmini AAB summary must select aab'
Assert-Contains $launch.matched_domains 'aab' 'launchmini AAB summary must report matched aab'
if (-not (@($launch.match_evidence) | Where-Object { $_.domain -eq 'aab' -and $_.keyword })) { throw 'launchmini AAB summary must include match evidence' }
Assert-NotTooManyReadRequired $launch

$ui = Invoke-CheckerJson -Profile 'uimini' -TaskSummary 'weapon icon HUD'
Assert-Contains $ui.resolved_domains 'ui' 'uimini HUD summary must select ui'
Assert-Contains $ui.matched_domains 'ui' 'uimini HUD summary must report matched ui'
Assert-NotTooManyReadRequired $ui

$qa = Invoke-CheckerJson -Profile 'balanceqa' -TaskSummary 'stage boss QA'
Assert-Contains $qa.resolved_domains 'qa' 'balanceqa boss QA summary must select qa'
Assert-Contains $qa.resolved_domains 'gameplay' 'balanceqa boss QA summary must also select gameplay'
Assert-Contains $qa.matched_domains 'gameplay' 'boss/stage summary must report gameplay match'
Assert-NotTooManyReadRequired $qa

$profiles = @('threemini','uimini','levelmini','balanceqa','bizmini','launchmini','backendmini','englishgradmini','madangsue','jabdareminder','soundmini','corpopsmini')
foreach ($p in $profiles) {
  $defaultResult = Invoke-CheckerJson -Profile $p
  Assert-Contains $defaultResult.resolved_domains 'common' "$p default must include common"
  Assert-NotTooManyReadRequired $defaultResult
  $summaryResult = Invoke-CheckerJson -Profile $p -TaskSummary 'zzznokeyword'
  Assert-Contains $summaryResult.resolved_domains 'common' "$p TaskSummary must include common"
  Assert-NotTooManyReadRequired $summaryResult
}

$badArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$checker,'-Profile','unknown_profile','-Domain','auto')
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$badOutput = & powershell @badArgs 2>&1
$badExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($badExitCode -eq 0) { throw 'unknown profile must exit nonzero' }

'OK tasksummary routing verification passed'
