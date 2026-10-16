Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')

$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$images = @($config.localized_social_image_pool.ja.images | Select-Object -Last 2)
if ($images.Count -ne 2) { throw 'Expected two final Japanese comic candidates' }
$config.localized_social_image_pool.ja.images = $images
$first = Resolve-PostingImagePath $images[0]
$second = Resolve-PostingImagePath $images[1]
$tempRoot = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('comic-rotation-' + [guid]::NewGuid().ToString('N'))))
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
try {
  function Write-ClickReceipt([string]$CycleId, [string]$ImagePath, [string]$State, [string]$Stamp) {
    $receipt = [pscustomobject]@{cycleId=$CycleId;entries=[pscustomobject]@{ja=[pscustomobject]@{state=$State;intent=[pscustomobject]@{imagePath=$ImagePath;createdUtc=$Stamp}}}}
    $receipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $tempRoot ($CycleId + '.json')) -Encoding UTF8
  }
  Write-ClickReceipt '2030-01-01-0000' $first 'publish_intent' '2030-01-01T00:00:00Z'
  if ((Select-PostingLocaleImagePath $config ja '2030-01-01-0600' $tempRoot X) -cne $second) { throw 'Clicked comic repeated before the other comic was used' }
  Write-ClickReceipt '2030-01-01-0600' $second 'verified' '2030-01-01T06:00:00Z'
  if ((Select-PostingLocaleImagePath $config ja '2030-01-01-1200' $tempRoot X) -cne $first) { throw 'Pool did not restart after both comics were clicked' }
  Write-ClickReceipt '2030-01-01-1200' $first 'selected' '2030-01-01T12:00:00Z'
  if ((Select-PostingLocaleImagePath $config ja '2030-01-01-1800' $tempRoot X) -cne $second) { throw 'Selected draft caused an adjacent image repeat' }
  'COMIC_IMAGE_ROTATION_TEST_OK'
} finally {
  $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
  if (-not $tempRoot.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing to remove a test directory outside TEMP' }
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}
