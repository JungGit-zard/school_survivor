[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [Parameter(Mandatory = $true)][string]$AssetId,
  [ValidateSet('optional', 'required', 'forbid')][string]$Armature = 'optional',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$scriptRoot = $PSScriptRoot
$normalizer = Join-Path $scriptRoot 'normalize_export.py'
$validator = Join-Path $scriptRoot 'validate_glb.py'

if (-not (Test-Path -LiteralPath $blender -PathType Leaf)) {
  throw "Blender 5.2 executable not found: $blender"
}

$normalizeArgs = @(
  '--background', '--factory-startup', '--python-exit-code', '1', '--python', $normalizer, '--',
  '--input', $InputPath, '--output', $OutputPath, '--asset-id', $AssetId, '--armature', $Armature
)
if ($Force) { $normalizeArgs += '--force' }

& $blender @normalizeArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $blender --background --factory-startup --python-exit-code 1 --python $validator -- `
  --input $OutputPath --asset-id $AssetId --armature $Armature
exit $LASTEXITCODE
