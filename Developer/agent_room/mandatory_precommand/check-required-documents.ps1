param(
  [Parameter(Mandatory = $true)]
  [string]$Profile,

  [Parameter(Mandatory = $true)]
  [ValidateSet('auto','common','aab','graphics','ui','gameplay','qa','backend','audio','corporate','localization','operations')]
  [string]$Domain,

  [Parameter(Mandatory = $false)]
  [ValidateLength(0, 240)]
  [string]$TaskSummary = ''
)

$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

function Find-RepoRoot {
  param([string]$Start)
  $current = (Resolve-Path -LiteralPath $Start).Path
  while ($true) {
    if (Test-Path -LiteralPath (Join-Path $current '.git')) { return $current }
    $parent = Split-Path -Parent $current
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $current) {
      throw "Could not resolve repository root from $Start"
    }
    $current = $parent
  }
}

function ConvertTo-RepoRelativePath {
  param([string]$Root, [string]$FullPath)
  $trimChars = [char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd($trimChars)
  $full = [System.IO.Path]::GetFullPath($FullPath)
  $uriRoot = New-Object System.Uri(($rootFull + [System.IO.Path]::DirectorySeparatorChar))
  $uriFile = New-Object System.Uri($full)
  return [System.Uri]::UnescapeDataString($uriRoot.MakeRelativeUri($uriFile).ToString()).Replace('\\','/')
}

function Resolve-ManifestEntry {
  param([string]$RepoRoot, [object]$Entry)
  $resolved = @()
  if ($Entry.PSObject.Properties.Name -contains 'path') {
    $full = Join-Path $RepoRoot $Entry.path
    if (!(Test-Path -LiteralPath $full -PathType Leaf)) {
      throw "Missing required file: $($Entry.path)"
    }
    $resolved += [pscustomobject]@{ path = $Entry.path; fullPath = (Resolve-Path -LiteralPath $full).Path; why = $Entry.why }
  } elseif ($Entry.PSObject.Properties.Name -contains 'glob') {
    $globText = [string]$Entry.glob
    $globMatches = @()
    if ($globText -match '^(?<base>.*)/\*\*/(?<leaf>[^/]+)$') {
      $globBase = $Matches.base
      $globLeaf = $Matches.leaf
      $baseDir = Join-Path $RepoRoot $globBase
      if (Test-Path -LiteralPath $baseDir -PathType Container) {
        $globMatches = @(Get-ChildItem -LiteralPath $baseDir -Recurse -File -Filter $globLeaf -ErrorAction SilentlyContinue | Sort-Object FullName)
      }
    } else {
      $pattern = Join-Path $RepoRoot $globText
      $globMatches = @(Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue | Sort-Object FullName)
    }
    if ($globMatches.Count -eq 0) {
      throw "Missing required glob match: $($Entry.glob)"
    }
    if ($Entry.select -eq 'latest') {
      $globMatches = @($globMatches | Sort-Object LastWriteTimeUtc, FullName | Select-Object -Last 1)
    }
    foreach ($match in $globMatches) {
      $resolved += [pscustomobject]@{ path = (ConvertTo-RepoRelativePath -Root $RepoRoot -FullPath $match.FullName); fullPath = $match.FullName; why = $Entry.why }
    }
  } else {
    throw 'Manifest entry must contain path or glob.'
  }
  return $resolved
}

function Get-DomainConfig {
  param([object]$Manifest, [string]$DomainName)
  $config = $Manifest.domains.$DomainName
  if ($null -eq $config) { throw "Manifest has no domain: $DomainName" }
  return $config
}

function Get-DomainRequiredEntries {
  param([object]$DomainConfig)
  if ($DomainConfig.PSObject.Properties.Name -contains 'required') { return @($DomainConfig.required) }
  return @($DomainConfig)
}

function Get-DomainTaskKeywords {
  param([object]$DomainConfig)
  if ($DomainConfig.PSObject.Properties.Name -contains 'taskKeywords') { return @($DomainConfig.taskKeywords) }
  return @()
}

function Add-UniqueDomain {
  param([System.Collections.Generic.List[string]]$List, [string]$DomainName)
  if (!$List.Contains($DomainName)) { $List.Add($DomainName) }
}

$scriptPath = if ($PSCommandPath) { $PSCommandPath } else { $MyInvocation.MyCommand.Path }
$scriptDir = Split-Path -Parent $scriptPath
$repoRoot = Find-RepoRoot -Start $scriptDir
$centralDir = Join-Path $repoRoot 'Developer/agent_room/mandatory_precommand'
$manifestPath = Join-Path $centralDir 'manifest.json'

if (!(Test-Path -LiteralPath $centralDir -PathType Container)) { throw "Missing central directory: Developer/agent_room/mandatory_precommand" }
if (!(Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "Missing manifest: Developer/agent_room/mandatory_precommand/manifest.json" }

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$profileKey = $Profile.ToLowerInvariant()
$selectedDomains = New-Object System.Collections.Generic.List[string]
$matchedDomains = New-Object System.Collections.Generic.List[string]
$matchEvidence = New-Object System.Collections.Generic.List[object]
Add-UniqueDomain -List $selectedDomains -DomainName 'common'

$mapped = $manifest.profileDomains.$profileKey
if ($Domain -eq 'auto' -and [string]::IsNullOrWhiteSpace($mapped)) {
  throw "Unknown profile for auto domain: $Profile"
}

$summary = if ($null -eq $TaskSummary) { '' } else { $TaskSummary.Trim() }
$summaryForMatch = $summary.ToLowerInvariant()
if ($Domain -eq 'auto' -and ![string]::IsNullOrWhiteSpace($summaryForMatch)) {
  foreach ($domainProp in @($manifest.domains.PSObject.Properties)) {
    $domainName = [string]$domainProp.Name
    if ($domainName -eq 'common') { continue }
    $domainConfig = Get-DomainConfig -Manifest $manifest -DomainName $domainName
    foreach ($keyword in @(Get-DomainTaskKeywords -DomainConfig $domainConfig)) {
      $kw = ([string]$keyword).Trim()
      if ([string]::IsNullOrWhiteSpace($kw)) { continue }
      if ($summaryForMatch.Contains($kw.ToLowerInvariant())) {
        Add-UniqueDomain -List $selectedDomains -DomainName $domainName
        Add-UniqueDomain -List $matchedDomains -DomainName $domainName
        $matchEvidence.Add([pscustomobject]@{ domain = $domainName; keyword = $kw })
        break
      }
    }
  }
}

if ($Domain -eq 'auto') {
  if ($mapped -ne 'common') { Add-UniqueDomain -List $selectedDomains -DomainName $mapped }
} elseif ($Domain -ne 'common') {
  Add-UniqueDomain -List $selectedDomains -DomainName $Domain
}

$selected = New-Object System.Collections.Generic.List[object]
foreach ($domainName in @($selectedDomains)) {
  $domainConfig = Get-DomainConfig -Manifest $manifest -DomainName $domainName
  foreach ($entry in @(Get-DomainRequiredEntries -DomainConfig $domainConfig)) {
    foreach ($resolved in @(Resolve-ManifestEntry -RepoRoot $repoRoot -Entry $entry)) {
      $selected.Add([pscustomobject]@{ domain = $domainName; path = $resolved.path; fullPath = $resolved.fullPath; why = $resolved.why })
    }
  }
}

$profileAlwaysRequired = $manifest.profileAlwaysRequired.$profileKey
if ($null -ne $profileAlwaysRequired) {
  foreach ($entry in @($profileAlwaysRequired)) {
    foreach ($resolved in @(Resolve-ManifestEntry -RepoRoot $repoRoot -Entry $entry)) {
      $selected.Add([pscustomobject]@{ domain = ("profile:$profileKey"); path = $resolved.path; fullPath = $resolved.fullPath; why = $resolved.why })
    }
  }
}

$profileCentralizedRequired = $manifest.profileCentralizedRequired.$profileKey
if ($null -ne $profileCentralizedRequired) {
  $centralizedSelected = New-Object System.Collections.Generic.List[object]
  foreach ($entry in @($profileCentralizedRequired)) {
    foreach ($resolved in @(Resolve-ManifestEntry -RepoRoot $repoRoot -Entry $entry)) {
      $centralizedSelected.Add([pscustomobject]@{ domain = ("profile:${profileKey}:centralized"); path = $resolved.path; fullPath = $resolved.fullPath; why = $resolved.why })
    }
  }
  if ($centralizedSelected.Count -eq 0) { throw "Missing centralized required entry for profile: $Profile" }
  $selected = $centralizedSelected
}

$dedup = @{}
foreach ($item in $selected) {
  if (!$dedup.ContainsKey($item.path)) { $dedup[$item.path] = $item }
}
$readRequired = @(
  $dedup.Values |
    Sort-Object path |
    ForEach-Object {
      $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.fullPath).Hash.ToLowerInvariant()
      [pscustomobject]@{
        path = $_.path
        sha256 = $hash
        why = $_.why
        domain = $_.domain
      }
    }
)

$receiptInput = (($readRequired | ForEach-Object { "$($_.path)`t$($_.sha256)" }) -join "`n") + "`n"
$sha = [System.Security.Cryptography.SHA256]::Create()
$receiptBytes = [System.Text.Encoding]::UTF8.GetBytes($receiptInput)
$combined = [System.BitConverter]::ToString($sha.ComputeHash($receiptBytes)).Replace('-','').ToLowerInvariant()

$taskSummaryUsed = ![string]::IsNullOrWhiteSpace($summary)
$jsonObject = New-Object psobject -Property ([ordered]@{
  profile = $Profile
  domain = $Domain
  task_summary_used = $taskSummaryUsed
  repository_root = (Split-Path -Leaf $repoRoot)
  resolved_domains = @($selectedDomains.ToArray())
  matched_domains = @($matchedDomains.ToArray())
  match_evidence = @($matchEvidence.ToArray())
  read_required = $readRequired
  combined_receipt_sha256 = $combined
})
if ($profileKey -eq 'launchmini') {
  $jsonObject | Add-Member -NotePropertyName mandatory_aab_notice -NotePropertyValue 'AAB 생성 후 반드시 Google Play 배포 경로의 실제 Android 기기에서 로그인·타이틀·로비·게임 진입을 테스트해 주세요.'
}
$json = $jsonObject | ConvertTo-Json -Depth 8

$bytes = $utf8NoBom.GetBytes($json + "`n")
[Console]::OpenStandardOutput().Write($bytes, 0, $bytes.Length)
