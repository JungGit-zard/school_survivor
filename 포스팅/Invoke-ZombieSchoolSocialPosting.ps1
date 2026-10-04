<#
Thin Korean operator entrypoint for Escape Zombie School social posting.
All posting logic stays in ../marketing/Invoke-ZombieSchoolSocialPosting.ps1.
Use -DryRun or -Offline for safe validation without live browser/posting.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('X','Facebook','Both')][string]$Platform,
  [Parameter(Mandatory=$true)][ValidateSet('ja','en','vi','ko')][string]$Language,
  [Parameter(Mandatory=$true)][string]$RunId,
  [string]$VariantId = '',
  [string]$ConfigPath = '',
  [string]$ReceiptRoot = '',
  [long]$XWindowId = 0,
  [long]$FacebookWindowId = 0,
  [switch]$DryRun,
  [switch]$Offline,
  [switch]$AuthorizeFacebookPublish
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$canonical = Join-Path (Split-Path -Parent $PSScriptRoot) 'marketing\Invoke-ZombieSchoolSocialPosting.ps1'
if (-not (Test-Path -LiteralPath $canonical -PathType Leaf)) { throw "Canonical social posting wrapper not found: $canonical" }

$args = @('-Platform',$Platform,'-Language',$Language,'-RunId',$RunId)
foreach ($pair in @(
  @('VariantId',$VariantId),
  @('ConfigPath',$ConfigPath),
  @('ReceiptRoot',$ReceiptRoot)
)) {
  if (-not [string]::IsNullOrWhiteSpace([string]$pair[1])) { $args += @('-' + $pair[0], [string]$pair[1]) }
}
if ($XWindowId -ne 0) { $args += @('-XWindowId', $XWindowId) }
if ($FacebookWindowId -ne 0) { $args += @('-FacebookWindowId', $FacebookWindowId) }
if ($DryRun) { $args += '-DryRun' }
if ($Offline) { $args += '-Offline' }
if ($AuthorizeFacebookPublish) { $args += '-AuthorizeFacebookPublish' }

& powershell -NoProfile -STA -ExecutionPolicy Bypass -File $canonical @args
exit $LASTEXITCODE
