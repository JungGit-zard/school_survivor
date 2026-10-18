Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')

$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$imageCatalog = Get-PostingImageCatalog
$legacyRow = @($imageCatalog.legacyPaths.PSObject.Properties | Where-Object { $_.Value.StartsWith('x/', [StringComparison]::OrdinalIgnoreCase) }) | Select-Object -First 1
if ($null -eq $legacyRow) { throw 'Expected at least one X legacy image mapping' }
$doubleSeparator = [string]([char]92) + [char]92
$legacyPath = 'D:' + $doubleSeparator + 'Jung' + $doubleSeparator + '2.Minigame_project' + $doubleSeparator + 'school_survivor-integration' + $doubleSeparator + 'marketing' + $doubleSeparator + 'x_daily_zombie_school_posting' + $doubleSeparator + 'image_pool' + $doubleSeparator + $legacyRow.Name.Replace('/', $doubleSeparator)
$legacyExpected = Resolve-PostingImagePath ('image_pool/' + [string]$legacyRow.Value)
if ((Resolve-PostingImagePath $legacyPath) -cne $legacyExpected) { throw 'Repeated separators in a legacy Windows image path were not normalized' }
$images = @($config.localized_social_image_pool.ja.images | Select-Object -Last 3)
if ($images.Count -ne 3) { throw 'Expected three Japanese comic candidates' }
$config.localized_social_image_pool.ja.images = $images
$resolved = @($images | ForEach-Object { Resolve-PostingImagePath $_ })
$tempRoot = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('comic-rotation-' + [guid]::NewGuid().ToString('N'))))
$imageRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'image_pool'))
$aliasRelative = 'x/ja/rotation-test-' + [guid]::NewGuid().ToString('N') + '.png'
$aliasPath = Join-Path $imageRoot ($aliasRelative -replace '/', [IO.Path]::DirectorySeparatorChar)
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
try {
  Copy-Item -LiteralPath $resolved[0] -Destination $aliasPath
  $aliasFullPath = Resolve-PostingImagePath ('image_pool/' + $aliasRelative)
  if ((Get-FileHash -LiteralPath $resolved[0] -Algorithm SHA256).Hash -cne (Get-FileHash -LiteralPath $aliasFullPath -Algorithm SHA256).Hash) { throw 'Test alias does not have matching bytes' }
  $config.localized_social_image_pool.ja.images = @($images[0], ("image_pool/$aliasRelative"), $images[1])
  $catalogImages = @((@($images) + @("image_pool/$aliasRelative")) | ForEach-Object {
    $path = Resolve-PostingImagePath ([string]$_)
    $relative = $path.Substring($imageRoot.Length + 1).Replace([string][char]92, '/')
    [pscustomobject]@{platform='X';locale='ja';path=$relative;gameStartText=(Get-PostingGameStartText ja)}
  })
  $catalog = [pscustomobject]@{images=$catalogImages}
  function Write-ClickReceipt([string]$Directory, [string]$CycleId, [string]$ImagePath, [string]$State, [string]$Stamp, [string]$ImageHash = '', [string]$HashProperty = 'imageSha256') {
    $intent = [pscustomobject]@{imagePath=$ImagePath;createdUtc=$Stamp}
    if (-not [string]::IsNullOrWhiteSpace($ImageHash)) { $intent | Add-Member -NotePropertyName $HashProperty -NotePropertyValue $ImageHash }
    $receipt = [pscustomobject]@{cycleId=$CycleId;entries=[pscustomobject]@{ja=[pscustomobject]@{state=$State;intent=$intent}}}
    $receipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Directory ($CycleId + '.json')) -Encoding UTF8
  }

  $historyA = Join-Path $tempRoot 'history-a'
  $historyB = Join-Path $tempRoot 'history-b'
  New-Item -ItemType Directory -Path $historyA,$historyB -Force | Out-Null
  $defaultRoots = @(Get-PostingDefaultReceiptDirectories X)
  if ($defaultRoots.Count -ne 2 -or $defaultRoots[0] -cne (Join-Path $PSScriptRoot 'receipts') -or $defaultRoots[1] -cne (Join-Path $PSScriptRoot '..\..\Developer\agent_room\x_posting_receipts')) { throw 'Default X receipt roots changed unexpectedly' }
  function Get-PostingDefaultReceiptDirectories([string]$Platform) { if ($Platform -eq 'X') { return @($historyA,$historyB) }; return @() }
  $legacyHistory = Join-Path $tempRoot 'legacy-hash-history'
  New-Item -ItemType Directory -Path $legacyHistory -Force | Out-Null
  $legacySuffix = 'x/ja/missing-manifest-image.png'
  $legacyHash = (Get-FileHash -LiteralPath $resolved[0] -Algorithm SHA256).Hash.ToLowerInvariant()
  $legacyCatalog = [pscustomobject]@{images=$catalogImages;legacyImageHashes=[pscustomobject]@{$legacySuffix=$legacyHash}}
  Write-ClickReceipt $legacyHistory '2030-01-02-0000' ('image_pool/' + $legacySuffix) 'verified' '2030-01-02T00:00:00Z'
  function Get-PostingDefaultReceiptDirectories([string]$Platform) { if ($Platform -eq 'X') { return @($legacyHistory) }; return @() }
  $legacyFallbackSelection = Select-PostingLocaleImagePath $config ja '2030-01-02-0600' $tempRoot X $legacyCatalog
  if ($legacyFallbackSelection -cne $resolved[1]) { throw 'Catalog legacy image hash did not exclude the matching candidate for a missing receipt image' }
  function Get-PostingDefaultReceiptDirectories([string]$Platform) { if ($Platform -eq 'X') { return @($historyA,$historyB) }; return @() }
  $aliasHash = (Get-FileHash -LiteralPath $aliasFullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  Write-ClickReceipt $historyA '2030-01-01-0000' $aliasFullPath 'publish_intent' '2030-01-01T00:00:00Z' $aliasHash
  Write-ClickReceipt $historyB '2030-01-01-0000' $aliasFullPath 'publish_intent' '2030-01-01T00:00:00Z' $aliasHash 'sha256'
  $selected = Select-PostingLocaleImagePath $config ja '2030-01-01-0600' $tempRoot X $catalog
  if ($selected -cne $resolved[1]) { throw "Same-SHA renamed image was not excluded or candidates did not follow pool order: $selected" }
  $config.localized_social_image_pool.ja.images = @($images[0], $images[1], $images[2])
  Remove-Item -LiteralPath $aliasPath -Force
  $guardHistory = Join-Path $tempRoot 'publish-guard-history'
  New-Item -ItemType Directory -Path $guardHistory -Force | Out-Null
  Write-ClickReceipt $guardHistory '2030-01-03-0000' $resolved[0] 'publish_intent' '2030-01-03T00:00:00Z'
  $frozenFirst = [pscustomobject]@{imagePath=$resolved[0]}
  $frozenNext = [pscustomobject]@{imagePath=$resolved[1]}
  $changedRejected = $false
  try { Assert-PostingIntentImageSequence $config ja '2030-01-03-0600' $tempRoot $frozenFirst X $catalog @($guardHistory) | Out-Null }
  catch { if ($_.Exception.Message -match 'IMAGE_SEQUENCE_CHANGED') { $changedRejected = $true } else { throw } }
  if (-not $changedRejected) { throw 'Publish guard allowed an image used by another cycle' }
  if ((Assert-PostingIntentImageSequence $config ja '2030-01-03-0600' $tempRoot $frozenNext X $catalog @($guardHistory)) -cne $resolved[1]) { throw 'Publish guard rejected the next unused image' }
  Write-ClickReceipt $guardHistory '2030-01-03-0600' $resolved[1] 'verified' '2030-01-03T06:00:00Z'
  $frozenLast = [pscustomobject]@{imagePath=$resolved[2]}
  if ((Assert-PostingIntentImageSequence $config ja '2030-01-03-1200' $tempRoot $frozenLast X $catalog @($guardHistory)) -cne $resolved[2]) { throw 'Publish guard rejected an unused frozen image' }
  Write-ClickReceipt $historyA '2030-01-01-0600' $resolved[1] 'selected' '2030-01-01T12:00:00Z'
  if ((Select-PostingLocaleImagePath $config ja '2030-01-01-1200' $tempRoot X $catalog) -cne $resolved[1]) { throw 'A selected draft incorrectly consumed its image or changed candidate order' }
  Write-ClickReceipt $historyA '2030-01-01-1200' $resolved[1] 'verified' '2030-01-01T12:00:00Z'
  if ((Select-PostingLocaleImagePath $config ja '2030-01-01-1800' $tempRoot X $catalog) -cne $resolved[2]) { throw 'Pool did not select the next unused image in configured order' }
  Write-ClickReceipt $historyA '2030-01-01-1800' $resolved[2] 'publish_intent' '2030-01-01T18:00:00Z'
  $exhausted = $false
  try { $null = Select-PostingLocaleImagePath $config ja '2030-01-02-0000' $tempRoot X $catalog }
  catch { if ($_.Exception.Message -match 'IMAGE_POOL_EXHAUSTED') { $exhausted = $true } else { throw } }
  if (-not $exhausted) { throw 'Fully used image pool did not report IMAGE_POOL_EXHAUSTED' }
  Write-ClickReceipt $historyB '2030-01-02-0600' $aliasFullPath 'verified' '2030-01-02T06:00:00Z'
  $unknownHistoryRejected = $false
  try { $null = Select-PostingLocaleImagePath $config ja '2030-01-02-1200' $tempRoot X $catalog }
  catch { if ($_.Exception.Message -match 'IMAGE_HISTORY_HASH_UNKNOWN') { $unknownHistoryRejected = $true } else { throw } }
  if (-not $unknownHistoryRejected) { throw 'Missing receipt image without a saved SHA256 did not fail closed' }
  'COMIC_IMAGE_ROTATION_TEST_OK'
} finally {
  $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
  if (-not $tempRoot.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing to remove a test directory outside TEMP' }
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
  if (Test-Path -LiteralPath $aliasPath) {
    if (-not $aliasPath.StartsWith($imageRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing to remove a test image outside image_pool' }
    Remove-Item -LiteralPath $aliasPath -Force
  }
}
